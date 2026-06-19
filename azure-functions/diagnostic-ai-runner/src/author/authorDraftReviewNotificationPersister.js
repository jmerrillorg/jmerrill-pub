"use strict";

/**
 * Safe persistence adapter for internal author-draft review notifications.
 *
 * This module prepares and optionally writes a metadata-only jm1_executionlogs
 * record through an injected Dataverse client. It does not send mail, create
 * author-facing send events, create Opportunities, activate Flow D, run
 * diagnostics, or open production gates.
 */

const {
  NOTIFICATION_TYPE,
  NOTIFICATION_ERROR_CODE,
  validateReviewNotificationInput
} = require("./authorDraftReviewNotificationBuilder");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const DELIVERY_INTENT = "INTERNAL_REVIEW_NOTIFICATION";
const INTERNAL_NOTIFICATION_STATUS = Object.freeze({
  DISABLED: "INTERNAL_NOTIFICATION_DISABLED",
  PREPARED: "INTERNAL_NOTIFICATION_PREPARED",
  SENT: "INTERNAL_NOTIFICATION_SENT",
  FAILED: "INTERNAL_NOTIFICATION_FAILED"
});
const AUTHOR_EMAIL_STATUS = "AUTHOR_EMAIL_NOT_SENT";

const SAFE_PERSISTENCE_FIELDS = [
  "notification",
  "deliveryStatus",
  "persistedAt",
  "messageSubject",
  "providerName",
  "internalProviderMessageId"
];

const FORBIDDEN_PERSISTENCE_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS.filter((field) => field !== "deliveryStatus"),
  "authorEmailSent",
  "authorFacingSendEvent",
  "sendEvent",
  "sendEventCreated",
  "sentTimestamp",
  "sentToAuthor",
  "queuedToAuthor",
  "authorEmailProviderMessageId",
  "providerMessageId",
  "mailApiRequestBody",
  "mailProviderResponse",
  "sendNow",
  "autoSendReady",
  "flowDReady",
  "opportunityReady"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenFieldDeep(item));

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_PERSISTENCE_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  const notification = input?.notification || input;
  return {
    ok: false,
    code: NOTIFICATION_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(notification?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(notification?.intakeReferenceCode) || null
  };
}

function buildValidationInputFromNotification(notification) {
  return {
    diagnosticId: notification.diagnosticId,
    intakeReferenceCode: notification.intakeReferenceCode,
    notificationRecipient: notification.notificationRecipient,
    draftPayload: {
      diagnosticId: notification.diagnosticId,
      intakeReferenceCode: notification.intakeReferenceCode,
      authorName: notification.authorName,
      authorEmail: notification.authorEmail,
      projectTitle: notification.projectTitle,
      draftSubject: notification.draftSubject,
      draftBodyPreview: notification.draftBodyPreview,
      sendStatus: notification.draftStatus,
      approvalStatus: notification.approvalStatus,
      internalVisibilityMailbox: notification.notificationRecipient,
      futureSendRequiresInternalCopy: notification.futureSendRequiresInternalCopy,
      futureSendRequiresDataverseLog: notification.futureSendRequiresDataverseLog
    },
    reviewPayload: {
      confidence: notification.diagnosticConfidence,
      diagnosticRiskFlags: notification.diagnosticRiskFlags
    },
    metadata: notification.metadata || {},
    dataverseRecordReference: notification.dataverseRecordReference || null
  };
}

function validateNotificationForPersistence(input = {}) {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "MISSING_PERSISTENCE_PAYLOAD" };
  }
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }
  if (!isPlainObject(input.notification)) {
    return { ok: false, reason: "MISSING_NOTIFICATION" };
  }

  const notification = input.notification;
  const diagnosticId = normalizeString(notification.diagnosticId);
  const intakeReferenceCode = normalizeString(notification.intakeReferenceCode);
  const notificationType = normalizeString(notification.notificationType);
  const notificationRecipient = normalizeString(notification.notificationRecipient);
  const draftStatus = normalizeString(notification.draftStatus);
  const approvalStatus = normalizeString(notification.approvalStatus);
  const draftSubject = normalizeString(notification.draftSubject);
  const draftBodyPreview = normalizeString(notification.draftBodyPreview || notification.safeDraftSummary);
  const deliveryStatus = normalizeString(input.deliveryStatus || INTERNAL_NOTIFICATION_STATUS.PREPARED);

  if (notificationType !== NOTIFICATION_TYPE) {
    return { ok: false, reason: "NOTIFICATION_TYPE_INVALID" };
  }
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (notificationRecipient !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "NOTIFICATION_RECIPIENT_INVALID" };
  }
  if (draftStatus !== DRAFT_STATUS) {
    return { ok: false, reason: "SEND_STATUS_NOT_DRAFT_ONLY" };
  }
  if (approvalStatus !== DRAFT_APPROVAL_STATUS) {
    return { ok: false, reason: "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL" };
  }
  if (!draftSubject) {
    return { ok: false, reason: "DRAFT_SUBJECT_MISSING" };
  }
  if (!draftBodyPreview) {
    return { ok: false, reason: "DRAFT_PREVIEW_MISSING" };
  }
  if (notification.futureSendRequiresInternalCopy !== true) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (notification.futureSendRequiresDataverseLog !== true) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }
  if (!Object.values(INTERNAL_NOTIFICATION_STATUS).includes(deliveryStatus)) {
    return { ok: false, reason: "INTERNAL_NOTIFICATION_STATUS_INVALID" };
  }

  const builderValidation = validateReviewNotificationInput(buildValidationInputFromNotification(notification));
  if (!builderValidation.ok) {
    return builderValidation;
  }

  return { ok: true };
}

function buildAuthorDraftReviewNotificationPersistenceRecord(input = {}) {
  const validation = validateNotificationForPersistence(input);
  if (!validation.ok) return safeFailure(validation.reason, input);

  const notification = input.notification;
  const persistedAt = normalizeString(input.persistedAt) || new Date().toISOString();
  const deliveryStatus = normalizeString(input.deliveryStatus || INTERNAL_NOTIFICATION_STATUS.PREPARED);
  const messageSubject = normalizeString(input.messageSubject);
  const providerName = normalizeString(input.providerName);
  const internalProviderMessageId = normalizeString(input.internalProviderMessageId);
  const actionDescription = [
    `${NOTIFICATION_TYPE} for intake ${notification.intakeReferenceCode}.`,
    `Recipient ${INTERNAL_VISIBILITY_MAILBOX}.`,
    `Delivery intent ${DELIVERY_INTENT}.`,
    `Delivery status ${deliveryStatus}.`,
    `Author email status ${AUTHOR_EMAIL_STATUS}.`,
    `Draft status ${DRAFT_STATUS}.`,
    `Approval status ${DRAFT_APPROVAL_STATUS}.`,
    messageSubject ? `Subject ${messageSubject}.` : "",
    providerName ? `Provider ${providerName}.` : "",
    internalProviderMessageId ? `Internal provider message ID ${internalProviderMessageId}.` : "",
    `Project ${normalizeString(notification.projectTitle) || "not provided"}.`,
    `Author ${normalizeString(notification.authorName) || "not provided"}.`,
    `Preview ${normalizeString(notification.draftBodyPreview)}.`,
    "No author email sent. No manuscript text stored. No prompt body stored. No raw model output stored."
  ].join(" ");

  const executionLogPayload = {
    jm1_name: `AUTHOR-DRAFT-REVIEW-NOTIFICATION-${notification.diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: NOTIFICATION_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: "internal-notification",
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: deliveryStatus === INTERNAL_NOTIFICATION_STATUS.FAILED ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: persistedAt,
    jm1_completedon: persistedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: notification.diagnosticId
  };

  return {
    ok: true,
    entitySet: EXECUTION_LOG_ENTITY_SET,
    persistenceRecord: {
      eventType: NOTIFICATION_TYPE,
      diagnosticId: notification.diagnosticId,
      intakeReferenceCode: notification.intakeReferenceCode,
      notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
      deliveryIntent: DELIVERY_INTENT,
      deliveryStatus,
      authorEmailStatus: AUTHOR_EMAIL_STATUS,
      sendStatus: DRAFT_STATUS,
      approvalStatus: DRAFT_APPROVAL_STATUS,
      projectTitle: normalizeString(notification.projectTitle),
      authorName: normalizeString(notification.authorName),
      draftBodyPreview: normalizeString(notification.draftBodyPreview),
      persistedAt,
      correlationId: normalizeString(notification.metadata?.correlationId) || null,
      messageSubject: messageSubject || null,
      providerName: providerName || null,
      internalProviderMessageId: internalProviderMessageId || null,
      executionLogPayload
    }
  };
}

async function persistAuthorDraftReviewNotification(input = {}, dataverseClient = null) {
  const recordResult = buildAuthorDraftReviewNotificationPersistenceRecord(input);
  if (!recordResult.ok) return recordResult;

  if (!dataverseClient || typeof dataverseClient.createRecord !== "function") {
    return safeFailure("DATAVERSE_CLIENT_MISSING", input);
  }

  try {
    const result = await dataverseClient.createRecord(recordResult.entitySet, recordResult.persistenceRecord.executionLogPayload);
    return {
      ok: true,
      entitySet: recordResult.entitySet,
      id: normalizeString(result?.id) || null,
      deliveryStatus: recordResult.persistenceRecord.deliveryStatus,
      diagnosticId: recordResult.persistenceRecord.diagnosticId,
      intakeReferenceCode: recordResult.persistenceRecord.intakeReferenceCode
    };
  } catch (_err) {
    return safeFailure("DATAVERSE_WRITE_FAILED", input);
  }
}

module.exports = {
  buildAuthorDraftReviewNotificationPersistenceRecord,
  persistAuthorDraftReviewNotification,
  validateNotificationForPersistence,
  EXECUTION_LOG_ENTITY_SET,
  DELIVERY_INTENT,
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS,
  SAFE_PERSISTENCE_FIELDS,
  FORBIDDEN_PERSISTENCE_FIELDS
};
