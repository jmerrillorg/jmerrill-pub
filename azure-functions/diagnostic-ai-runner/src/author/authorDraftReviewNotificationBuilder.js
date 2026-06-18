"use strict";

/**
 * Internal review notification builder for prepared author-response drafts.
 *
 * This module prepares a safe internal notification payload only. It does not
 * send email, call mail APIs, create send events, create Opportunities,
 * activate Flow D, run diagnostics, persist Dataverse records, or open
 * production gates.
 */

const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const NOTIFICATION_TYPE = "AUTHOR_DRAFT_READY_FOR_REVIEW";
const NEXT_ACTION = "Review author-response draft";
const NOTIFICATION_ERROR_CODE = "AUTHOR_DRAFT_REVIEW_NOTIFICATION_FAILED";
const MAX_DRAFT_PREVIEW_LENGTH = 240;

const SAFE_NOTIFICATION_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "notificationRecipient",
  "draftPayload",
  "reviewPayload",
  "metadata",
  "dataverseRecordReference"
];

const FORBIDDEN_NOTIFICATION_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS,
  "providerMessageId",
  "mailApiRequestBody",
  "mailProviderResponse",
  "sendEvent",
  "sendEventCreated",
  "queueForSend",
  "queuedToSend",
  "smtpPayload",
  "gmailPayload",
  "outlookPayload",
  "graphMailPayload",
  "acsPayload",
  "sendExecution",
  "authorEmailSend"
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
    if (FORBIDDEN_NOTIFICATION_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_NOTIFICATION_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: NOTIFICATION_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || normalizeString(input?.draftPayload?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || normalizeString(input?.draftPayload?.intakeReferenceCode) || null
  };
}

function pickSafeMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};
  const safe = {};
  for (const field of ["correlationId", "executionId"]) {
    if (typeof metadata[field] === "string" || typeof metadata[field] === "number" || typeof metadata[field] === "boolean") {
      safe[field] = metadata[field];
    }
  }
  return safe;
}

function pickSafeReviewData(reviewPayload) {
  if (!isPlainObject(reviewPayload)) return {};

  const safe = {};
  if (typeof reviewPayload.confidence === "number" && Number.isFinite(reviewPayload.confidence) && reviewPayload.confidence >= 0 && reviewPayload.confidence <= 1) {
    safe.diagnosticConfidence = reviewPayload.confidence;
  }

  const riskFlags = normalizeString(reviewPayload.diagnosticRiskFlags);
  if (riskFlags) {
    safe.diagnosticRiskFlags = riskFlags;
  }

  return safe;
}

function buildDraftBodyPreview(draftBody) {
  const normalized = normalizeString(draftBody).replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= MAX_DRAFT_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_DRAFT_PREVIEW_LENGTH - 3).trimEnd()}...`;
}

function buildNotificationBody({ authorName, projectTitle, intakeReferenceCode }) {
  return [
    "An author-response draft is ready for internal review.",
    "",
    `Author: ${authorName}`,
    `Project: ${projectTitle}`,
    `Intake Reference: ${intakeReferenceCode}`,
    `Draft Status: ${DRAFT_STATUS}`,
    `Approval Status: ${DRAFT_APPROVAL_STATUS}`,
    "",
    "Next action: Review the prepared author-response draft before any author-facing send is considered.",
    "",
    "No author email has been sent."
  ].join("\n");
}

function validateReviewNotificationInput(input = {}) {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "MISSING_NOTIFICATION_PAYLOAD" };
  }
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }
  if (!isPlainObject(input.draftPayload)) {
    return { ok: false, reason: "MISSING_DRAFT_PAYLOAD" };
  }

  const draft = input.draftPayload;
  const diagnosticId = normalizeString(input.diagnosticId || draft.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode || draft.intakeReferenceCode);
  const notificationRecipient = normalizeString(input.notificationRecipient || draft.internalVisibilityMailbox);
  const authorName = normalizeString(draft.authorName);
  const authorEmail = normalizeString(draft.authorEmail);
  const projectTitle = normalizeString(draft.projectTitle);
  const draftSubject = normalizeString(draft.draftSubject);
  const draftBody = normalizeString(draft.draftBody);
  const safePreview = normalizeString(draft.draftBodyPreview || draft.safeDraftSummary);
  const sendStatus = normalizeString(draft.sendStatus);
  const approvalStatus = normalizeString(draft.approvalStatus);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (notificationRecipient !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "NOTIFICATION_RECIPIENT_INVALID" };
  }
  if (!authorName) {
    return { ok: false, reason: "AUTHOR_NAME_MISSING" };
  }
  if (!authorEmail) {
    return { ok: false, reason: "AUTHOR_EMAIL_MISSING" };
  }
  if (!projectTitle) {
    return { ok: false, reason: "PROJECT_TITLE_MISSING" };
  }
  if (!draftSubject) {
    return { ok: false, reason: "DRAFT_SUBJECT_MISSING" };
  }
  if (!draftBody && !safePreview) {
    return { ok: false, reason: "DRAFT_BODY_OR_PREVIEW_MISSING" };
  }
  if (sendStatus !== DRAFT_STATUS) {
    return { ok: false, reason: "SEND_STATUS_NOT_DRAFT_ONLY" };
  }
  if (approvalStatus !== DRAFT_APPROVAL_STATUS) {
    return { ok: false, reason: "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL" };
  }
  if (draft.futureSendRequiresInternalCopy !== true) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (draft.futureSendRequiresDataverseLog !== true) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return { ok: true };
}

function buildAuthorDraftReviewNotification(input = {}) {
  const validation = validateReviewNotificationInput(input);
  if (!validation.ok) {
    return safeFailure(validation.reason, input);
  }

  const draft = input.draftPayload;
  const diagnosticId = normalizeString(input.diagnosticId || draft.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode || draft.intakeReferenceCode);
  const authorName = normalizeString(draft.authorName);
  const projectTitle = normalizeString(draft.projectTitle);
  const preparedAt = new Date().toISOString();
  const reviewData = pickSafeReviewData(input.reviewPayload);

  return {
    ok: true,
    notification: {
      diagnosticId,
      intakeReferenceCode,
      notificationType: NOTIFICATION_TYPE,
      notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
      authorName,
      authorEmail: normalizeString(draft.authorEmail),
      projectTitle,
      draftSubject: normalizeString(draft.draftSubject),
      draftBodyPreview: buildDraftBodyPreview(draft.draftBody || draft.draftBodyPreview || draft.safeDraftSummary),
      draftStatus: DRAFT_STATUS,
      approvalStatus: DRAFT_APPROVAL_STATUS,
      nextAction: NEXT_ACTION,
      internalReviewInstruction: "Review the prepared author-response draft before any author-facing send is considered.",
      notificationBody: buildNotificationBody({ authorName, projectTitle, intakeReferenceCode }),
      diagnosticConfidence: reviewData.diagnosticConfidence,
      diagnosticRiskFlags: reviewData.diagnosticRiskFlags || "",
      preparedAt,
      metadata: pickSafeMetadata(input.metadata),
      dataverseRecordReference: normalizeString(input.dataverseRecordReference) || null
    }
  };
}

module.exports = {
  buildAuthorDraftReviewNotification,
  validateReviewNotificationInput,
  buildDraftBodyPreview,
  NOTIFICATION_TYPE,
  NEXT_ACTION,
  NOTIFICATION_ERROR_CODE,
  MAX_DRAFT_PREVIEW_LENGTH,
  SAFE_NOTIFICATION_FIELDS,
  FORBIDDEN_NOTIFICATION_FIELDS
};
