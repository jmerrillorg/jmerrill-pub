"use strict";

/**
 * Internal diagnostic review persistence adapter for INT-PUB-005.
 *
 * This module persists only the safe internal review payload prepared by
 * diagnosticReviewBuilder. It does not send email, draft author messages,
 * create Opportunities, activate Flow D, call AI, read manuscripts, or open
 * execution gates.
 *
 * The approved target is the existing jm1pub_editorialdiagnostic record. This
 * module uses an injected Dataverse client so schema-specific field names can
 * be supplied by the governed Dataverse adapter/schema PR before production
 * wiring. Tests use a mock client; no live Dataverse writes happen here.
 */

const {
  REVIEW_STATUS,
  APPROVAL_STATUS,
  FORBIDDEN_PAYLOAD_FIELDS
} = require("./diagnosticReviewBuilder");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const ENTITY_SET = "jm1pub_editorialdiagnostics";
const PERSISTENCE_ERROR_CODE = "INTERNAL_REVIEW_PERSISTENCE_INVALID_PAYLOAD";
const WRITE_ERROR_CODE = "INTERNAL_REVIEW_PERSISTENCE_WRITE_FAILED";

const SAFE_REVIEW_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "diagnosticOutputSummary",
  "diagnosticRiskFlags",
  "confidence",
  "requiresHumanReview",
  "routingDecision",
  "reviewStatus",
  "approvalStatus",
  "reviewedBy",
  "reviewedOn",
  "preparedAt",
  "metadata"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFailure(code, reason, reviewPayload = null) {
  const diagnosticId = normalizeString(reviewPayload?.diagnosticId) || null;
  const intakeReferenceCode = normalizeString(reviewPayload?.intakeReferenceCode) || null;

  return {
    persisted: false,
    code,
    reason,
    diagnosticId,
    intakeReferenceCode
  };
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

function hasOnlySafeTopLevelFields(reviewPayload) {
  return Object.keys(reviewPayload).every((key) => SAFE_REVIEW_FIELDS.includes(key));
}

function normalizeTokenCounts(tokenCounts) {
  if (!isPlainObject(tokenCounts)) return null;

  return {
    input: typeof tokenCounts.input === "number" && Number.isFinite(tokenCounts.input) ? tokenCounts.input : 0,
    output: typeof tokenCounts.output === "number" && Number.isFinite(tokenCounts.output) ? tokenCounts.output : 0,
    total: typeof tokenCounts.total === "number" && Number.isFinite(tokenCounts.total) ? tokenCounts.total : 0
  };
}

function pickSafeMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};

  const safe = {};
  for (const field of ["provider", "model", "modelDeploymentAlias", "promptKey", "promptVersion", "correlationId", "executionId"]) {
    if (typeof metadata[field] === "string" || typeof metadata[field] === "number" || typeof metadata[field] === "boolean") {
      safe[field] = metadata[field];
    }
  }

  const tokenCounts = normalizeTokenCounts(metadata.tokenCounts);
  if (tokenCounts) safe.tokenCounts = tokenCounts;

  return safe;
}

function validateReviewPayload(reviewPayload) {
  if (!isPlainObject(reviewPayload)) {
    return { ok: false, reason: "MISSING_REVIEW_PAYLOAD" };
  }

  const diagnosticId = normalizeString(reviewPayload.diagnosticId);
  const intakeReferenceCode = normalizeString(reviewPayload.intakeReferenceCode);
  const summary = normalizeString(reviewPayload.diagnosticOutputSummary);
  const riskFlags = normalizeString(reviewPayload.diagnosticRiskFlags);
  const confidence = reviewPayload.confidence;

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (!summary) {
    return { ok: false, reason: "DIAGNOSTIC_SUMMARY_MISSING" };
  }
  if (!riskFlags) {
    return { ok: false, reason: "DIAGNOSTIC_RISK_FLAGS_MISSING" };
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, reason: "CONFIDENCE_INVALID" };
  }
  if (reviewPayload.requiresHumanReview !== true) {
    return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_NOT_TRUE" };
  }
  if (reviewPayload.reviewStatus !== REVIEW_STATUS.PENDING_HUMAN_REVIEW) {
    return { ok: false, reason: "REVIEW_STATUS_NOT_PENDING_HUMAN_REVIEW" };
  }
  if (reviewPayload.approvalStatus !== APPROVAL_STATUS.PENDING_HUMAN_REVIEW) {
    return { ok: false, reason: "APPROVAL_STATUS_NOT_PENDING_HUMAN_REVIEW" };
  }
  if (!isPlainObject(reviewPayload.routingDecision) || reviewPayload.routingDecision.requiresHumanReview !== true) {
    return { ok: false, reason: "ROUTING_DECISION_INVALID" };
  }
  if (!hasOnlySafeTopLevelFields(reviewPayload) || hasForbiddenFieldDeep(reviewPayload)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }

  return { ok: true };
}

function buildInternalDiagnosticReviewRecord(reviewPayload) {
  const safeMetadata = pickSafeMetadata(reviewPayload.metadata);

  return {
    diagnosticId: normalizeString(reviewPayload.diagnosticId),
    intakeReferenceCode: normalizeString(reviewPayload.intakeReferenceCode),
    diagnosticOutputSummary: normalizeString(reviewPayload.diagnosticOutputSummary),
    diagnosticRiskFlags: normalizeString(reviewPayload.diagnosticRiskFlags),
    confidence: reviewPayload.confidence,
    requiresHumanReview: true,
    routingDecision: {
      status: reviewPayload.routingDecision.status ?? null,
      statusLabel: normalizeString(reviewPayload.routingDecision.statusLabel),
      routingBasis: normalizeString(reviewPayload.routingDecision.routingBasis),
      requiresHumanReview: true
    },
    reviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW,
    approvalStatus: APPROVAL_STATUS.PENDING_HUMAN_REVIEW,
    reviewedBy: null,
    reviewedOn: null,
    preparedAt: normalizeString(reviewPayload.preparedAt) || null,
    metadata: safeMetadata
  };
}

function validateDataverseClient(dataverseClient) {
  return isPlainObject(dataverseClient) && typeof dataverseClient.updateDiagnosticReview === "function";
}

/**
 * Persists a safe internal diagnostic review payload through an injected
 * Dataverse client.
 *
 * @param {{dataverseClient: {updateDiagnosticReview: Function}, reviewPayload: object}} input
 * @returns {Promise<object>}
 */
async function persistInternalDiagnosticReview(input = {}) {
  const reviewPayload = input.reviewPayload;
  const validation = validateReviewPayload(reviewPayload);
  if (!validation.ok) {
    return safeFailure(PERSISTENCE_ERROR_CODE, validation.reason, reviewPayload);
  }

  if (!validateDataverseClient(input.dataverseClient)) {
    return safeFailure(PERSISTENCE_ERROR_CODE, "DATAVERSE_CLIENT_INVALID", reviewPayload);
  }

  const reviewRecord = buildInternalDiagnosticReviewRecord(reviewPayload);
  const persistedAt = new Date().toISOString();

  try {
    const writeResult = await input.dataverseClient.updateDiagnosticReview({
      entitySet: ENTITY_SET,
      diagnosticId: reviewRecord.diagnosticId,
      intakeReferenceCode: reviewRecord.intakeReferenceCode,
      reviewRecord,
      persistedAt
    });

    return {
      persisted: true,
      diagnosticId: reviewRecord.diagnosticId,
      intakeReferenceCode: reviewRecord.intakeReferenceCode,
      reviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW,
      approvalStatus: APPROVAL_STATUS.PENDING_HUMAN_REVIEW,
      dataverseRecordId: normalizeString(writeResult?.dataverseRecordId) || normalizeString(writeResult?.id) || reviewRecord.diagnosticId,
      persistedAt
    };
  } catch {
    return safeFailure(WRITE_ERROR_CODE, "DATAVERSE_WRITE_FAILED", reviewPayload);
  }
}

module.exports = {
  persistInternalDiagnosticReview,
  buildInternalDiagnosticReviewRecord,
  validateReviewPayload,
  ENTITY_SET,
  SAFE_REVIEW_FIELDS,
  PERSISTENCE_ERROR_CODE,
  WRITE_ERROR_CODE
};
