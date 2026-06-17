"use strict";

/**
 * Confidence-based routing for INT-PUB-005 Stage 0 Diagnostic results.
 *
 * Routing rules (from ADR Section 8 — permanent):
 *
 *   manuscriptGateFailure: true  →  Deferred     (835500005)
 *   technicalFailure: true       →  Exception    (835500003)
 *   confidence >= 0.85           →  Completed    (835500002)
 *   0.70 <= confidence < 0.85    →  Needs Human Review (835500004)
 *   confidence < 0.70            →  Needs Human Review (835500004) + low-confidence note
 *   confidence missing/invalid   →  Exception    (835500003)
 *
 * INVARIANT: requiresHumanReview is always true on every result path.
 * A Completed status does not authorize any author-facing action.
 *
 * This module is pure routing logic — no Dataverse writes, no AI calls,
 * no manuscript reads, no side effects of any kind.
 */

const STATUS = {
  COMPLETED: 835500002,
  EXCEPTION: 835500003,
  NEEDS_HUMAN_REVIEW: 835500004,
  DEFERRED: 835500005
};

const STATUS_LABEL = {
  [STATUS.COMPLETED]: "Completed",
  [STATUS.EXCEPTION]: "Exception",
  [STATUS.NEEDS_HUMAN_REVIEW]: "Needs Human Review",
  [STATUS.DEFERRED]: "Deferred"
};

const CONFIDENCE_THRESHOLD_COMPLETED = 0.85;
const CONFIDENCE_THRESHOLD_REVIEW = 0.70;

/**
 * @typedef {{
 *   confidence?: number,
 *   technicalFailure?: boolean,
 *   manuscriptGateFailure?: boolean
 * }} DiagnosticResultInput
 *
 * @typedef {{
 *   status: number,
 *   statusLabel: string,
 *   requiresHumanReview: true,
 *   lowConfidenceNote: string|null,
 *   routingBasis: string,
 *   error: string|null
 * }} RoutingDecision
 */

/**
 * Route a diagnostic result to the appropriate Dataverse status.
 *
 * @param {DiagnosticResultInput} input
 * @returns {RoutingDecision}
 */
function routeDiagnosticResult(input) {
  if (input == null || typeof input !== "object") {
    return {
      status: STATUS.EXCEPTION,
      statusLabel: STATUS_LABEL[STATUS.EXCEPTION],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "INVALID_INPUT",
      error: "routeDiagnosticResult requires a non-null object input"
    };
  }

  // Priority 1: Manuscript gate failure — Deferred (check before technical failure)
  if (input.manuscriptGateFailure === true) {
    return {
      status: STATUS.DEFERRED,
      statusLabel: STATUS_LABEL[STATUS.DEFERRED],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "MANUSCRIPT_GATE_FAILURE",
      error: null
    };
  }

  // Priority 2: Technical failure — Exception
  if (input.technicalFailure === true) {
    return {
      status: STATUS.EXCEPTION,
      statusLabel: STATUS_LABEL[STATUS.EXCEPTION],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "TECHNICAL_FAILURE",
      error: null
    };
  }

  // Priority 3: Validate confidence — must be a finite number in [0, 1]
  const confidence = input.confidence;

  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return {
      status: STATUS.EXCEPTION,
      statusLabel: STATUS_LABEL[STATUS.EXCEPTION],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "INVALID_CONFIDENCE",
      error: `confidence must be a finite number between 0 and 1; received ${JSON.stringify(confidence)}`
    };
  }

  // Priority 4: Confidence-based routing
  if (confidence >= CONFIDENCE_THRESHOLD_COMPLETED) {
    return {
      status: STATUS.COMPLETED,
      statusLabel: STATUS_LABEL[STATUS.COMPLETED],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "CONFIDENCE_HIGH",
      error: null
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLD_REVIEW) {
    return {
      status: STATUS.NEEDS_HUMAN_REVIEW,
      statusLabel: STATUS_LABEL[STATUS.NEEDS_HUMAN_REVIEW],
      requiresHumanReview: true,
      lowConfidenceNote: null,
      routingBasis: "CONFIDENCE_MID",
      error: null
    };
  }

  // confidence < 0.70 — Needs Human Review with low-confidence note
  return {
    status: STATUS.NEEDS_HUMAN_REVIEW,
    statusLabel: STATUS_LABEL[STATUS.NEEDS_HUMAN_REVIEW],
    requiresHumanReview: true,
    lowConfidenceNote: `Low-confidence result (${confidence.toFixed(4)}). Manual editorial review required before any action.`,
    routingBasis: "CONFIDENCE_LOW",
    error: null
  };
}

module.exports = { routeDiagnosticResult, STATUS };
