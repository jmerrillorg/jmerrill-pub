"use strict";

/**
 * Internal-only mail preparation/delivery adapter for author draft review
 * notifications.
 *
 * This module can send only through an injected internal mail provider and only
 * to publishing@jmerrill.one. It does not send to authors, create author-facing
 * send events, create Opportunities, activate Flow D, run diagnostics, or open
 * production gates.
 */

const {
  NOTIFICATION_TYPE,
  NOTIFICATION_ERROR_CODE
} = require("./authorDraftReviewNotificationBuilder");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS
} = require("./authorDraftReviewNotificationPersister");

const INTERNAL_MAIL_ERROR_CODE = "INTERNAL_AUTHOR_DRAFT_REVIEW_NOTIFICATION_MAIL_FAILED";
const APPROVED_INTERNAL_RECIPIENTS = Object.freeze([INTERNAL_VISIBILITY_MAILBOX]);

const SAFE_MAIL_FIELDS = [
  "notification",
  "to",
  "cc",
  "bcc"
];

const FORBIDDEN_MAIL_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS,
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

function normalizeRecipients(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(normalizeString).filter(Boolean);
  const single = normalizeString(value);
  return single ? [single] : [];
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenFieldDeep(item));

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_MAIL_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_MAIL_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  const notification = input?.notification || input;
  return {
    ok: false,
    code: INTERNAL_MAIL_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(notification?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(notification?.intakeReferenceCode) || null
  };
}

function recipientSetValid({ to, cc, bcc, authorEmail }) {
  const all = [...to, ...cc, ...bcc];
  const lowerAuthor = normalizeString(authorEmail).toLowerCase();
  if (lowerAuthor && all.some((recipient) => recipient.toLowerCase() === lowerAuthor)) {
    return { ok: false, reason: "AUTHOR_RECIPIENT_BLOCKED" };
  }
  if (to.length !== 1 || to[0] !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "TO_RECIPIENT_INVALID" };
  }
  if (cc.length > 0 || bcc.length > 0) {
    return { ok: false, reason: "CC_BCC_NOT_ALLOWED" };
  }
  if (!all.every((recipient) => APPROVED_INTERNAL_RECIPIENTS.includes(recipient))) {
    return { ok: false, reason: "UNAPPROVED_RECIPIENT_PRESENT" };
  }
  return { ok: true };
}

function validateInternalNotificationMailInput(input = {}) {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "MISSING_MAIL_PAYLOAD" };
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
  const to = normalizeRecipients(input.to === undefined ? notificationRecipient : input.to);
  const cc = normalizeRecipients(input.cc);
  const bcc = normalizeRecipients(input.bcc);

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
  const recipientValidation = recipientSetValid({ to, cc, bcc, authorEmail: notification.authorEmail });
  if (!recipientValidation.ok) {
    return recipientValidation;
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

  return { ok: true };
}

function buildInternalAuthorDraftReviewNotificationEmail(input = {}) {
  const validation = validateInternalNotificationMailInput(input);
  if (!validation.ok) return safeFailure(validation.reason, input);

  const notification = input.notification;
  const to = normalizeRecipients(input.to === undefined ? notification.notificationRecipient : input.to);
  const safePreview = normalizeString(notification.draftBodyPreview || notification.safeDraftSummary);
  const subject = `Internal Review Needed - Author Draft Ready - ${notification.intakeReferenceCode}`;
  const body = [
    "Internal notification only.",
    "",
    "An author-response draft is ready for internal review.",
    "",
    `Author: ${normalizeString(notification.authorName)}`,
    `Author Email (reference only): ${normalizeString(notification.authorEmail)}`,
    `Project: ${normalizeString(notification.projectTitle)}`,
    `Intake Reference: ${notification.intakeReferenceCode}`,
    `Diagnostic ID: ${notification.diagnosticId}`,
    `Draft Status: ${DRAFT_STATUS}`,
    `Approval Status: ${DRAFT_APPROVAL_STATUS}`,
    "",
    "Next action: Review the prepared author-response draft before any author-facing send is considered.",
    "",
    "Author-facing send remains blocked until separately approved.",
    "No author email has been sent.",
    "",
    `Safe preview: ${safePreview}`
  ].join("\n");

  return {
    ok: true,
    email: {
      to,
      cc: [],
      bcc: [],
      subject,
      body,
      notificationType: NOTIFICATION_TYPE,
      deliveryIntent: "INTERNAL_REVIEW_NOTIFICATION",
      internalOnly: true,
      authorEmailStatus: AUTHOR_EMAIL_STATUS
    }
  };
}

async function sendInternalAuthorDraftReviewNotification(input = {}, mailProvider = null) {
  const emailResult = buildInternalAuthorDraftReviewNotificationEmail(input);
  if (!emailResult.ok) return emailResult;

  if (!mailProvider || typeof mailProvider.send !== "function") {
    return safeFailure("INTERNAL_MAIL_PROVIDER_MISSING", input);
  }

  try {
    const result = await mailProvider.send(emailResult.email);
    return {
      ok: true,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.SENT,
      providerMessageId: normalizeString(result?.messageId || result?.operationId) || null,
      notificationType: NOTIFICATION_TYPE,
      notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
      authorEmailStatus: AUTHOR_EMAIL_STATUS,
      diagnosticId: normalizeString(input.notification?.diagnosticId),
      intakeReferenceCode: normalizeString(input.notification?.intakeReferenceCode)
    };
  } catch (_err) {
    return safeFailure("INTERNAL_MAIL_PROVIDER_REJECTED", input);
  }
}

module.exports = {
  buildInternalAuthorDraftReviewNotificationEmail,
  sendInternalAuthorDraftReviewNotification,
  validateInternalNotificationMailInput,
  INTERNAL_MAIL_ERROR_CODE,
  APPROVED_INTERNAL_RECIPIENTS,
  SAFE_MAIL_FIELDS,
  FORBIDDEN_MAIL_FIELDS
};
