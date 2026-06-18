"use strict";

/**
 * Internal human-review decision model for INT-PUB-005 Stage 0 diagnostics.
 *
 * This module is pure decision/update preparation logic. It does not send
 * email, draft author-facing messages, create Opportunities, activate Flow D,
 * call AI, read manuscripts, write Dataverse, or open execution gates.
 */

const {
  REVIEW_STATUS,
  FORBIDDEN_PAYLOAD_FIELDS
} = require("./diagnosticReviewBuilder");
const {
  DATAVERSE_FIELD_MAP,
  HUMAN_REVIEW_STATUS
} = require("./diagnosticReviewPersister");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const REVIEW_DECISION = Object.freeze({
  APPROVE_FOR_AUTHOR_DRAFT: "APPROVE_FOR_AUTHOR_DRAFT",
  NEEDS_REVISION: "NEEDS_REVISION",
  REJECT_BLOCK: "REJECT_BLOCK",
  HOLD_FOR_REVIEW: "HOLD_FOR_REVIEW"
});

const DECISION_STATUS_MAP = Object.freeze({
  [REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT]: REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT,
  [REVIEW_DECISION.NEEDS_REVISION]: REVIEW_STATUS.NEEDS_REVISION,
  [REVIEW_DECISION.REJECT_BLOCK]: REVIEW_STATUS.BLOCKED,
  [REVIEW_DECISION.HOLD_FOR_REVIEW]: REVIEW_STATUS.PENDING_HUMAN_REVIEW
});

const DECISION_HUMAN_REVIEW_STATUS_MAP = Object.freeze({
  [REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT]: 835510001,
  [REVIEW_DECISION.NEEDS_REVISION]: 835510003,
  [REVIEW_DECISION.REJECT_BLOCK]: 835510004,
  [REVIEW_DECISION.HOLD_FOR_REVIEW]: HUMAN_REVIEW_STATUS.PENDING_REVIEW
});

const DECISIONS_REQUIRING_NOTES = new Set([
  REVIEW_DECISION.NEEDS_REVISION,
  REVIEW_DECISION.REJECT_BLOCK
]);

const SAFE_DECISION_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "currentReviewStatus",
  "decision",
  "reviewerId",
  "reviewerNotes",
  "decisionTimestamp",
  "metadata"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenFieldDeep(item));
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PAYLOAD_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }

  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_DECISION_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: "HUMAN_REVIEW_DECISION_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function pickSafeDecisionMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};

  const safe = {};
  for (const field of ["correlationId", "executionId"]) {
    if (typeof metadata[field] === "string" || typeof metadata[field] === "number" || typeof metadata[field] === "boolean") {
      safe[field] = metadata[field];
    }
  }

  return safe;
}

function validateHumanReviewDecision(input) {
  if (!isPlainObject(input)) {
    return safeFailure("INVALID_DECISION_INPUT");
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const currentReviewStatus = normalizeString(input.currentReviewStatus);
  const decision = normalizeString(input.decision);
  const reviewerId = normalizeString(input.reviewerId);
  const reviewerNotes = normalizeString(input.reviewerNotes);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  }
  if (currentReviewStatus !== REVIEW_STATUS.PENDING_HUMAN_REVIEW) {
    return safeFailure("CURRENT_REVIEW_STATUS_NOT_PENDING", input);
  }
  if (!decision || !Object.values(REVIEW_DECISION).includes(decision)) {
    return safeFailure("DECISION_UNSUPPORTED", input);
  }
  if (!reviewerId) {
    return safeFailure("REVIEWER_ID_MISSING", input);
  }
  if (DECISIONS_REQUIRING_NOTES.has(decision) && !reviewerNotes) {
    return safeFailure("REVIEWER_NOTES_REQUIRED", input);
  }
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return safeFailure("UNSAFE_FIELD_PRESENT", input);
  }

  return {
    ok: true,
    diagnosticId,
    intakeReferenceCode,
    currentReviewStatus,
    decision,
    reviewerId,
    reviewerNotes
  };
}

function buildHumanReviewDecisionUpdate(input) {
  const validation = validateHumanReviewDecision(input);
  if (!validation.ok) return validation;

  const decisionTimestamp = normalizeString(input.decisionTimestamp) || new Date().toISOString();
  const reviewStatus = DECISION_STATUS_MAP[validation.decision];
  const approvalStatus = reviewStatus;
  const safeMetadata = pickSafeDecisionMetadata(input.metadata);

  const update = {
    diagnosticId: validation.diagnosticId,
    intakeReferenceCode: validation.intakeReferenceCode,
    previousReviewStatus: validation.currentReviewStatus,
    reviewDecision: validation.decision,
    reviewStatus,
    approvalStatus,
    reviewedBy: validation.reviewerId,
    reviewedOn: decisionTimestamp,
    reviewerNotes: validation.reviewerNotes || null,
    decisionTimestamp,
    metadata: safeMetadata
  };

  return {
    ok: true,
    update,
    dataverseUpdatePayload: buildDataverseDecisionUpdatePayload(update)
  };
}

function buildDataverseDecisionUpdatePayload(update) {
  const structuredDecisionPacket = {
    intakeReferenceCode: update.intakeReferenceCode,
    previousReviewStatus: update.previousReviewStatus,
    reviewDecision: update.reviewDecision,
    reviewStatus: update.reviewStatus,
    approvalStatus: update.approvalStatus,
    decisionTimestamp: update.decisionTimestamp,
    metadata: update.metadata
  };

  const payload = {
    [DATAVERSE_FIELD_MAP.humanReviewStatus]: DECISION_HUMAN_REVIEW_STATUS_MAP[update.reviewDecision],
    [DATAVERSE_FIELD_MAP.humanReviewedBy]: update.reviewedBy,
    [DATAVERSE_FIELD_MAP.humanReviewedOn]: update.reviewedOn,
    [DATAVERSE_FIELD_MAP.humanReviewNotes]: update.reviewerNotes,
    [DATAVERSE_FIELD_MAP.structuredOutputJson]: JSON.stringify(structuredDecisionPacket)
  };

  if (update.metadata.correlationId || update.metadata.executionId) {
    payload[DATAVERSE_FIELD_MAP.correlationId] = update.metadata.correlationId || update.metadata.executionId;
  }

  return payload;
}

module.exports = {
  validateHumanReviewDecision,
  buildHumanReviewDecisionUpdate,
  buildDataverseDecisionUpdatePayload,
  REVIEW_DECISION,
  DECISION_STATUS_MAP,
  DECISION_HUMAN_REVIEW_STATUS_MAP,
  DECISIONS_REQUIRING_NOTES,
  SAFE_DECISION_FIELDS
};
