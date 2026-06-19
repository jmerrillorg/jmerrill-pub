"use strict";

/**
 * Human approval model for author-facing response sends.
 *
 * Approval records permission only. This module does not send email, call
 * providers, create Opportunities, activate Flow D, run diagnostics, or open
 * production gates.
 */

const {
  SEND_PREPARATION_STATUS,
  DELIVERY_STATUS
} = require("./authorDraftSendPreparationBuilder");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  TEMPLATE_NAME
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const AUTHOR_RESPONSE_SEND_DECISION = Object.freeze({
  APPROVE_AUTHOR_SEND: "APPROVE_AUTHOR_SEND",
  NEEDS_AUTHOR_RESPONSE_REVISION: "NEEDS_AUTHOR_RESPONSE_REVISION",
  REJECT_AUTHOR_SEND: "REJECT_AUTHOR_SEND",
  HOLD_AUTHOR_SEND: "HOLD_AUTHOR_SEND"
});

const AUTHOR_RESPONSE_SEND_STATUS = Object.freeze({
  DISABLED: "AUTHOR_RESPONSE_SEND_DISABLED",
  PREPARED: "AUTHOR_RESPONSE_SEND_PREPARED",
  APPROVED: "AUTHOR_RESPONSE_SEND_APPROVED",
  SENT: "AUTHOR_RESPONSE_SENT",
  FAILED: "AUTHOR_RESPONSE_SEND_FAILED",
  NOT_SENT: "AUTHOR_EMAIL_NOT_SENT",
  INTERNAL_VISIBILITY_SATISFIED: "INTERNAL_VISIBILITY_SATISFIED",
  DATAVERSE_SEND_LOG_CREATED: "DATAVERSE_SEND_LOG_CREATED"
});

const DECISIONS_REQUIRING_NOTES = new Set([
  AUTHOR_RESPONSE_SEND_DECISION.NEEDS_AUTHOR_RESPONSE_REVISION,
  AUTHOR_RESPONSE_SEND_DECISION.REJECT_AUTHOR_SEND
]);

const SAFE_AUTHOR_SEND_APPROVAL_FIELDS = [
  "sendPreparationRecord",
  "decision",
  "reviewerId",
  "reviewerNotes",
  "approvedOn",
  "metadata"
];

const FORBIDDEN_AUTHOR_SEND_APPROVAL_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS.filter((field) => field !== "deliveryStatus"),
  "opportunityReady",
  "flowDReady",
  "productionReady",
  "autoSendReady",
  "runDiagnostic",
  "mailProviderResponse",
  "providerHeaders",
  "authorization"
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
    if (FORBIDDEN_AUTHOR_SEND_APPROVAL_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_AUTHOR_SEND_APPROVAL_FIELDS.includes(key));
}

function emailLooksValid(value) {
  const email = normalizeString(value);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
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

function safeFailure(reason, input = null) {
  const record = input?.sendPreparationRecord || input;
  return {
    ok: false,
    code: "AUTHOR_RESPONSE_SEND_APPROVAL_FAILED",
    reason,
    diagnosticId: normalizeString(record?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(record?.intakeReferenceCode) || null
  };
}

function validateAuthorResponseSendApproval(input = {}) {
  if (!isPlainObject(input)) return { ok: false, reason: "MISSING_AUTHOR_SEND_APPROVAL_PAYLOAD" };
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }
  if (!isPlainObject(input.sendPreparationRecord)) {
    return { ok: false, reason: "MISSING_SEND_PREPARATION_RECORD" };
  }

  const record = input.sendPreparationRecord;
  const decision = normalizeString(input.decision);
  const reviewerId = normalizeString(input.reviewerId);
  const reviewerNotes = normalizeString(input.reviewerNotes);

  if (!Object.values(AUTHOR_RESPONSE_SEND_DECISION).includes(decision)) {
    return { ok: false, reason: "AUTHOR_SEND_DECISION_UNSUPPORTED" };
  }
  if (!reviewerId) {
    return { ok: false, reason: "REVIEWER_ID_MISSING" };
  }
  if (DECISIONS_REQUIRING_NOTES.has(decision) && !reviewerNotes) {
    return { ok: false, reason: "REVIEWER_NOTES_REQUIRED" };
  }
  if (decision !== AUTHOR_RESPONSE_SEND_DECISION.APPROVE_AUTHOR_SEND) {
    return { ok: true, sendAllowed: false };
  }
  if (!normalizeString(record.diagnosticId) || !DIAGNOSTIC_ID_PATTERN.test(normalizeString(record.diagnosticId))) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!normalizeString(record.intakeReferenceCode) || !INTAKE_REFERENCE_PATTERN.test(normalizeString(record.intakeReferenceCode))) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (normalizeString(record.sendPreparationStatus) !== SEND_PREPARATION_STATUS) {
    return { ok: false, reason: "SEND_PREPARATION_STATUS_INVALID" };
  }
  if (normalizeString(record.deliveryStatus) !== DELIVERY_STATUS) {
    return { ok: false, reason: "DELIVERY_STATUS_NOT_UNSENT" };
  }
  if (!emailLooksValid(record.authorEmail)) {
    return { ok: false, reason: "AUTHOR_EMAIL_INVALID" };
  }
  if (!normalizeString(record.draftSubject)) {
    return { ok: false, reason: "AUTHOR_RESPONSE_SUBJECT_MISSING" };
  }
  if (!normalizeString(record.draftBody)) {
    return { ok: false, reason: "AUTHOR_RESPONSE_BODY_MISSING" };
  }
  if (normalizeString(record.internalVisibilityMailbox) !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  }
  if (record.futureSendRequiresInternalCopy !== true) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (record.futureSendRequiresDataverseLog !== true) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return { ok: true, sendAllowed: true };
}

function buildAuthorResponseSendApproval(input = {}) {
  const validation = validateAuthorResponseSendApproval(input);
  if (!validation.ok) return safeFailure(validation.reason, input);

  const record = input.sendPreparationRecord;
  const decision = normalizeString(input.decision);
  const approvedOn = normalizeString(input.approvedOn) || new Date().toISOString();
  const sendApproved = decision === AUTHOR_RESPONSE_SEND_DECISION.APPROVE_AUTHOR_SEND;

  return {
    ok: true,
    sendApproval: {
      diagnosticId: normalizeString(record.diagnosticId),
      intakeReferenceCode: normalizeString(record.intakeReferenceCode),
      authorEmail: normalizeString(record.authorEmail),
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      draftSubject: normalizeString(record.draftSubject),
      draftBody: normalizeString(record.draftBody),
      templateName: normalizeString(record.templateName) || TEMPLATE_NAME,
      decision,
      sendApproved,
      sendStatus: sendApproved ? AUTHOR_RESPONSE_SEND_STATUS.APPROVED : AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT,
      approvedBy: normalizeString(input.reviewerId),
      approvedOn,
      reviewerNotes: normalizeString(input.reviewerNotes),
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      metadata: pickSafeMetadata(input.metadata)
    }
  };
}

module.exports = {
  validateAuthorResponseSendApproval,
  buildAuthorResponseSendApproval,
  AUTHOR_RESPONSE_SEND_DECISION,
  AUTHOR_RESPONSE_SEND_STATUS,
  SAFE_AUTHOR_SEND_APPROVAL_FIELDS,
  FORBIDDEN_AUTHOR_SEND_APPROVAL_FIELDS
};
