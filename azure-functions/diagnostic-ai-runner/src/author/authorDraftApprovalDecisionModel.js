"use strict";

/**
 * Internal human approval decision model for persisted author-response drafts.
 *
 * This module builds safe internal approval updates only. It does not send
 * email, create send events, create Opportunities, activate Flow D, run
 * diagnostics, or open production gates.
 */

const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_FIELD_MAP, AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const AUTHOR_DRAFT_APPROVAL_DECISION = Object.freeze({
  APPROVE_FOR_SEND_PREPARATION: "APPROVE_FOR_SEND_PREPARATION",
  NEEDS_DRAFT_REVISION: "NEEDS_DRAFT_REVISION",
  REJECT_DRAFT: "REJECT_DRAFT",
  HOLD_DRAFT_REVIEW: "HOLD_DRAFT_REVIEW"
});

const AUTHOR_DRAFT_APPROVAL_STATUS = Object.freeze({
  PENDING_HUMAN_APPROVAL: DRAFT_APPROVAL_STATUS,
  APPROVED_FOR_SEND_PREPARATION: "APPROVED_FOR_SEND_PREPARATION",
  NEEDS_DRAFT_REVISION: "NEEDS_DRAFT_REVISION",
  DRAFT_REJECTED: "DRAFT_REJECTED"
});

const DECISION_STATUS_MAP = Object.freeze({
  [AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION]: AUTHOR_DRAFT_APPROVAL_STATUS.APPROVED_FOR_SEND_PREPARATION,
  [AUTHOR_DRAFT_APPROVAL_DECISION.NEEDS_DRAFT_REVISION]: AUTHOR_DRAFT_APPROVAL_STATUS.NEEDS_DRAFT_REVISION,
  [AUTHOR_DRAFT_APPROVAL_DECISION.REJECT_DRAFT]: AUTHOR_DRAFT_APPROVAL_STATUS.DRAFT_REJECTED,
  [AUTHOR_DRAFT_APPROVAL_DECISION.HOLD_DRAFT_REVIEW]: AUTHOR_DRAFT_APPROVAL_STATUS.PENDING_HUMAN_APPROVAL
});

const DECISIONS_REQUIRING_NOTES = new Set([
  AUTHOR_DRAFT_APPROVAL_DECISION.NEEDS_DRAFT_REVISION,
  AUTHOR_DRAFT_APPROVAL_DECISION.REJECT_DRAFT
]);

const SAFE_DECISION_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "currentApprovalStatus",
  "currentSendStatus",
  "decision",
  "reviewerId",
  "reviewerNotes",
  "internalVisibilityMailbox",
  "futureSendRequiresInternalCopy",
  "futureSendRequiresDataverseLog",
  "metadata"
];

const FORBIDDEN_DECISION_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS,
  "authorEmailSend",
  "sendExecution",
  "sendEvent",
  "sendEventCreated",
  "sentTimestamp",
  "mailProvider",
  "mailProviderResponse"
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
    if (FORBIDDEN_DECISION_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_DECISION_FIELDS.includes(key));
}

function futureCopyValid(input) {
  return input.futureSendRequiresInternalCopy === undefined || input.futureSendRequiresInternalCopy === true;
}

function futureLogValid(input) {
  return input.futureSendRequiresDataverseLog === undefined || input.futureSendRequiresDataverseLog === true;
}

function validateAuthorDraftApprovalDecision(input = {}) {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "MISSING_DECISION_PAYLOAD" };
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const currentApprovalStatus = normalizeString(input.currentApprovalStatus);
  const currentSendStatus = normalizeString(input.currentSendStatus);
  const decision = normalizeString(input.decision);
  const reviewerId = normalizeString(input.reviewerId);
  const reviewerNotes = normalizeString(input.reviewerNotes);
  const internalVisibilityMailbox = normalizeString(input.internalVisibilityMailbox);

  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (!currentApprovalStatus) {
    return { ok: false, reason: "CURRENT_APPROVAL_STATUS_MISSING" };
  }
  if (currentApprovalStatus !== DRAFT_APPROVAL_STATUS) {
    return { ok: false, reason: "CURRENT_APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL" };
  }
  if (!currentSendStatus) {
    return { ok: false, reason: "CURRENT_SEND_STATUS_MISSING" };
  }
  if (currentSendStatus !== DRAFT_STATUS) {
    return { ok: false, reason: "CURRENT_SEND_STATUS_NOT_DRAFT_ONLY" };
  }
  if (!decision) {
    return { ok: false, reason: "DECISION_MISSING" };
  }
  if (!Object.prototype.hasOwnProperty.call(DECISION_STATUS_MAP, decision)) {
    return { ok: false, reason: "DECISION_UNSUPPORTED" };
  }
  if (!reviewerId) {
    return { ok: false, reason: "REVIEWER_ID_MISSING" };
  }
  if (DECISIONS_REQUIRING_NOTES.has(decision) && !reviewerNotes) {
    return { ok: false, reason: "REVIEWER_NOTES_REQUIRED" };
  }
  if (internalVisibilityMailbox && internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  }
  if (!futureCopyValid(input)) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (!futureLogValid(input)) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return { ok: true };
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
  return {
    ok: false,
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function buildAuthorDraftApprovalUpdate(input = {}) {
  const validation = validateAuthorDraftApprovalDecision(input);
  if (!validation.ok) {
    return safeFailure(validation.reason, input);
  }

  const decision = normalizeString(input.decision);
  const approvalStatus = DECISION_STATUS_MAP[decision];
  const decisionTimestamp = new Date().toISOString();
  const reviewerNotes = normalizeString(input.reviewerNotes);
  const safeMetadata = pickSafeMetadata(input.metadata);

  const decisionUpdate = {
    diagnosticId: normalizeString(input.diagnosticId),
    intakeReferenceCode: normalizeString(input.intakeReferenceCode),
    previousApprovalStatus: DRAFT_APPROVAL_STATUS,
    currentSendStatus: DRAFT_STATUS,
    draftApprovalDecision: decision,
    approvalStatus,
    sendStatus: DRAFT_STATUS,
    approvedBy: normalizeString(input.reviewerId),
    approvedOn: decisionTimestamp,
    reviewerNotes,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    metadata: safeMetadata
  };

  const dataverseUpdatePayload = {
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus]: approvalStatus,
    [AUTHOR_DRAFT_FIELD_MAP.draftSendStatus]: DRAFT_STATUS,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy]: decisionUpdate.approvedBy,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn]: decisionTimestamp,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovalNotes]: reviewerNotes || `Decision recorded: ${decision}`,
    [AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox]: INTERNAL_VISIBILITY_MAILBOX,
    [AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy]: true,
    [AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog]: true
  };

  return {
    ok: true,
    decisionUpdate,
    dataverseUpdatePayload
  };
}

module.exports = {
  validateAuthorDraftApprovalDecision,
  buildAuthorDraftApprovalUpdate,
  AUTHOR_DRAFT_APPROVAL_DECISION,
  AUTHOR_DRAFT_APPROVAL_STATUS,
  DECISION_STATUS_MAP,
  SAFE_DECISION_FIELDS,
  FORBIDDEN_DECISION_FIELDS
};
