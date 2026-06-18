"use strict";

/**
 * Internal send-preparation record builder for approved author-response drafts.
 *
 * This module prepares a safe internal record only. It does not send email,
 * call mail APIs, create send events, create Opportunities, activate Flow D,
 * run diagnostics, queue mail, or open production gates.
 */

const {
  AUTHOR_DRAFT_APPROVAL_DECISION,
  AUTHOR_DRAFT_APPROVAL_STATUS
} = require("./authorDraftApprovalDecisionModel");
const {
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const SEND_PREPARATION_STATUS = "READY_FOR_HUMAN_SEND_APPROVAL";
const DELIVERY_STATUS = "NOT_SENT";
const SEND_PREPARATION_ERROR_CODE = "AUTHOR_DRAFT_SEND_PREPARATION_FAILED";

const SAFE_SEND_PREPARATION_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "draftPayload",
  "approvalDecision",
  "approvalStatus",
  "currentSendStatus",
  "approvedForSendPreparationBy",
  "approvedForSendPreparationOn",
  "preparedBy",
  "metadata"
];

const FORBIDDEN_SEND_PREPARATION_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS,
  "providerMessageId",
  "mailApiRequestBody",
  "mailProviderResponse",
  "sendEvent",
  "sendEventCreated",
  "queueForSend",
  "queuedToSend",
  "smtpPayload"
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
    if (FORBIDDEN_SEND_PREPARATION_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_SEND_PREPARATION_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: SEND_PREPARATION_ERROR_CODE,
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

function validateSendPreparationInput(input) {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "MISSING_SEND_PREPARATION_PAYLOAD" };
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
  const authorEmail = normalizeString(draft.authorEmail);
  const draftSubject = normalizeString(draft.draftSubject);
  const draftBody = normalizeString(draft.draftBody);
  const internalVisibilityMailbox = normalizeString(draft.internalVisibilityMailbox);
  const approvalDecision = normalizeString(input.approvalDecision);
  const approvalStatus = normalizeString(input.approvalStatus);
  const currentSendStatus = normalizeString(input.currentSendStatus || draft.sendStatus);

  if (approvalDecision !== AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION) {
    return { ok: false, reason: "APPROVAL_DECISION_NOT_APPROVED_FOR_SEND_PREPARATION" };
  }
  if (approvalStatus !== AUTHOR_DRAFT_APPROVAL_STATUS.APPROVED_FOR_SEND_PREPARATION) {
    return { ok: false, reason: "APPROVAL_STATUS_NOT_APPROVED_FOR_SEND_PREPARATION" };
  }
  if (currentSendStatus !== DRAFT_STATUS) {
    return { ok: false, reason: "CURRENT_SEND_STATUS_NOT_DRAFT_ONLY" };
  }
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (!authorEmail) {
    return { ok: false, reason: "AUTHOR_EMAIL_MISSING" };
  }
  if (!draftSubject) {
    return { ok: false, reason: "DRAFT_SUBJECT_MISSING" };
  }
  if (!draftBody) {
    return { ok: false, reason: "DRAFT_BODY_MISSING" };
  }
  if (internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  }
  if (draft.futureSendRequiresInternalCopy !== true) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (draft.futureSendRequiresDataverseLog !== true) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return { ok: true };
}

function buildAuthorDraftSendPreparationRecord(input = {}) {
  const validation = validateSendPreparationInput(input);
  if (!validation.ok) {
    return safeFailure(validation.reason, input);
  }

  const draft = input.draftPayload;
  const preparedAt = new Date().toISOString();

  return {
    ok: true,
    sendPreparationRecord: {
      diagnosticId: normalizeString(input.diagnosticId || draft.diagnosticId),
      intakeReferenceCode: normalizeString(input.intakeReferenceCode || draft.intakeReferenceCode),
      authorEmail: normalizeString(draft.authorEmail),
      authorName: normalizeString(draft.authorName),
      projectTitle: normalizeString(draft.projectTitle),
      draftSubject: normalizeString(draft.draftSubject),
      draftBody: normalizeString(draft.draftBody),
      templateName: normalizeString(draft.templateName || draft.draftTemplate) || TEMPLATE_NAME,
      sendPreparationStatus: SEND_PREPARATION_STATUS,
      sendStatus: DRAFT_STATUS,
      deliveryStatus: DELIVERY_STATUS,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      approvedForSendPreparationBy: normalizeString(input.approvedForSendPreparationBy),
      approvedForSendPreparationOn: normalizeString(input.approvedForSendPreparationOn) || null,
      preparedAt,
      preparedBy: normalizeString(input.preparedBy) || "system/internal",
      metadata: pickSafeMetadata(input.metadata)
    }
  };
}

module.exports = {
  buildAuthorDraftSendPreparationRecord,
  validateSendPreparationInput,
  SEND_PREPARATION_STATUS,
  DELIVERY_STATUS,
  SEND_PREPARATION_ERROR_CODE,
  SAFE_SEND_PREPARATION_FIELDS,
  FORBIDDEN_SEND_PREPARATION_FIELDS
};
