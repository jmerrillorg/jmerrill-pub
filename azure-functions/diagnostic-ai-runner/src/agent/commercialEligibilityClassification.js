"use strict";

const { createHash } = require("node:crypto");

const CAPABILITY_ID = "PUBLISHING.COMMERCIAL_ELIGIBILITY_CLASSIFICATION";
const CAPABILITY_VERSION = "JM1-PUBLISHING-COMMERCIAL-ELIGIBILITY-v1.1.0";
const REGISTRY_VERSION = "JM1-AGENT-CAPABILITY-REGISTRY-v1.4.0";
const IDENTITY = "id-jm1-pub-commercial-eligibility-a2/user-assigned";

const CLASSIFICATIONS = Object.freeze([
  "NOT_COMMERCIALLY_ELIGIBLE",
  "AGREEMENT_REQUIRED",
  "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED",
  "WAITING_ON_AUTHOR_PAYMENT_ELECTION",
  "PAYMENT_ELECTION_RECEIVED_REVIEW_REQUIRED",
  "PAYMENT_REQUEST_PREPARATION_ELIGIBLE",
  "PAYMENT_REQUEST_ALREADY_EXISTS",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED",
  "STALE_OR_CONFLICTING_STATE",
  "INSUFFICIENT_EVIDENCE"
]);

const REVIEW_ACTIONS = Object.freeze(["ACCEPT", "REJECT", "CORRECT", "DEFER"]);
const PROHIBITED_EFFECTS = Object.freeze([
  "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
  "PUBLISHING.PAYMENT_REQUEST_CREATE",
  "STRIPE.INVOICE_CREATE",
  "ACS.SEND",
  "PUBLISHING.TITLE_ADVANCE",
  "PUBLISHING.AUTHOR_MUTATE",
  "PUBLISHING.ROYALTY_EFFECT",
  "PROVIDER.MUTATE"
]);

class CommercialEligibilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CommercialEligibilityError";
    this.code = code;
    this.details = details;
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter(Boolean))].sort();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function classificationId(state) {
  const stableJson = JSON.stringify(stableValue({
    WORK_ID: text(state?.WORK_ID),
    TITLE_ID: text(state?.TITLE_ID),
    AUTHORITATIVE_STATE_VERSION: text(state?.AUTHORITATIVE_STATE_VERSION),
    CAPABILITY_ID,
    CAPABILITY_VERSION
  }));
  return `commercial-eligibility-${createHash("sha256")
    .update(`${CAPABILITY_VERSION}:${stableJson}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function proposedCapability(classification) {
  switch (classification) {
    case "AGREEMENT_REQUIRED":
      return "PUBLISHING.AGREEMENT_PREPARATION";
    case "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED":
      return "PUBLISHING.PAYMENT_ELECTION_REQUIRED";
    case "PAYMENT_ELECTION_RECEIVED_REVIEW_REQUIRED":
    case "PAYMENT_REQUEST_PREPARATION_ELIGIBLE":
      return "PUBLISHING.PAYMENT_REQUEST_PREPARATION";
    default:
      return null;
  }
}

function classifyState(rawState, { currentStateVersion, now } = {}) {
  const state = rawState && typeof rawState === "object" && !Array.isArray(rawState) ? rawState : {};
  const workId = text(state.WORK_ID);
  const titleId = text(state.TITLE_ID);
  const stateVersion = text(state.AUTHORITATIVE_STATE_VERSION);
  const observedAt = text(state.OBSERVED_AT);
  const evidence = normalizedList(state.EVIDENCE_REFERENCES);
  const missingEvidence = normalizedList(state.MISSING_EVIDENCE);
  const exceptions = normalizedList(state.EXCEPTIONS);
  const conflicts = normalizedList(state.CONFLICTS);
  const agreement = text(state.AGREEMENT_STATE).toUpperCase();
  const election = text(state.PAYMENT_ELECTION_STATE).toUpperCase();
  const electionReview = text(state.PAYMENT_ELECTION_REVIEW_STATE).toUpperCase();
  const paymentRequest = text(state.PAYMENT_REQUEST_STATE).toUpperCase();
  const payment = text(state.PAYMENT_STATE).toUpperCase();
  const lifecycle = text(state.LIFECYCLE_COMMERCIAL_STATUS).toUpperCase();
  const actionRequests = normalizedList(state.ACTION_REQUESTS);

  let classification;
  let confidence = "DETERMINISTIC";
  let exceptionClass = null;
  let reviewReason = "A human must confirm the prepared commercial classification before any downstream capability is considered.";
  const effectiveMissing = [...missingEvidence];

  if (!workId) effectiveMissing.push("WORK_ID");
  if (!titleId) effectiveMissing.push("TITLE_ID");
  if (!stateVersion) effectiveMissing.push("AUTHORITATIVE_STATE_VERSION");
  if (!observedAt) effectiveMissing.push("OBSERVED_AT");
  if (!agreement) effectiveMissing.push("AGREEMENT_STATE");
  if (!evidence.length) effectiveMissing.push("EVIDENCE_REFERENCES");

  const observedTime = Date.parse(observedAt);
  const staleByExpiry = text(state.STATE_EXPIRES_AT) && Date.parse(text(state.STATE_EXPIRES_AT)) <= Date.parse(now || observedAt);
  const staleByVersion = text(currentStateVersion) && stateVersion && text(currentStateVersion) !== stateVersion;
  const invalidObservedTime = observedAt && Number.isNaN(observedTime);

  if (conflicts.length || staleByExpiry || staleByVersion) {
    classification = "STALE_OR_CONFLICTING_STATE";
    confidence = "INSUFFICIENT";
    exceptionClass = staleByExpiry || staleByVersion ? "STALE_STATE" : "AUTHORITATIVE_STATE_CONFLICT";
    reviewReason = "Authoritative state must be reconciled and the classification recomputed.";
  } else if (effectiveMissing.length || invalidObservedTime) {
    classification = "INSUFFICIENT_EVIDENCE";
    confidence = "INSUFFICIENT";
    exceptionClass = "REQUIRED_EVIDENCE_MISSING";
    if (invalidObservedTime) effectiveMissing.push("OBSERVED_AT_VALID_TIMESTAMP");
    reviewReason = "Required authoritative evidence is missing or invalid.";
  } else if (exceptions.length) {
    classification = "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED";
    confidence = "HIGH";
    exceptionClass = exceptions.includes("FOUNDER_DECISION_REQUIRED")
      ? "FOUNDER_DECISION_REQUIRED"
      : "COMMERCIAL_EXCEPTION";
    reviewReason = "A governed commercial exception requires human authority.";
  } else if (["NOT_ELIGIBLE", "CANCELLED", "CLOSED", "HOLD"].includes(lifecycle)) {
    classification = "NOT_COMMERCIALLY_ELIGIBLE";
  } else if (agreement !== "COMPLETE" || state.EXECUTED_AGREEMENT_EVIDENCE !== true) {
    classification = "AGREEMENT_REQUIRED";
  } else if (payment === "CONFIRMED") {
    classification = "PAYMENT_CONFIRMED";
  } else if (payment === "PENDING") {
    classification = "PAYMENT_PENDING";
  } else if (["EXISTS", "CREATED", "OPEN"].includes(paymentRequest)) {
    classification = "PAYMENT_REQUEST_ALREADY_EXISTS";
  } else if (election === "RECEIVED_VALID" && electionReview === "ACCEPTED") {
    classification = "PAYMENT_REQUEST_PREPARATION_ELIGIBLE";
  } else if (election === "RECEIVED_VALID") {
    classification = "PAYMENT_ELECTION_RECEIVED_REVIEW_REQUIRED";
  } else if (election === "REQUESTED" || election === "WAITING_ON_AUTHOR" || actionRequests.includes("PAYMENT_ELECTION_REQUIRED")) {
    classification = "WAITING_ON_AUTHOR_PAYMENT_ELECTION";
  } else if (["MISSING", "NOT_SELECTED", ""].includes(election)) {
    classification = "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED";
  } else {
    classification = "INSUFFICIENT_EVIDENCE";
    confidence = "INSUFFICIENT";
    exceptionClass = "UNRECOGNIZED_AUTHORITATIVE_STATE";
    effectiveMissing.push("RECOGNIZED_PAYMENT_ELECTION_STATE");
    reviewReason = "The authoritative state uses an unrecognized commercial value.";
  }

  return {
    CLASSIFICATION_ID: classificationId(state),
    WORK_ID: workId || null,
    TITLE_ID: titleId || null,
    CURRENT_COMMERCIAL_STATE: {
      LIFECYCLE_COMMERCIAL_STATUS: lifecycle || null,
      AGREEMENT_STATE: agreement || null,
      PAYMENT_ELECTION_STATE: election || null,
      PAYMENT_ELECTION_REVIEW_STATE: electionReview || null,
      PAYMENT_REQUEST_STATE: paymentRequest || null,
      PAYMENT_STATE: payment || null
    },
    CLASSIFICATION: classification,
    CLASSIFICATION_CONFIDENCE: confidence,
    EVIDENCE_REFERENCES: evidence,
    MISSING_EVIDENCE: [...new Set(effectiveMissing)].sort(),
    PROPOSED_NEXT_CAPABILITY: proposedCapability(classification),
    PROPOSED_NEXT_CAPABILITY_AUTHORIZED: "NO",
    HUMAN_REVIEW_REQUIRED: "YES",
    HUMAN_REVIEW_REASON: reviewReason,
    EXCEPTION_CLASS: exceptionClass,
    OBSERVED_AT: observedAt || null,
    INPUT_STATE_REFERENCE: stateVersion || null,
    CAPABILITY_ID,
    CAPABILITY_VERSION,
    REGISTRY_VERSION,
    IDENTITY,
    BUSINESS_EFFECTS: 0
  };
}

function denyRequestedEffect(requestedEffect) {
  const effect = text(requestedEffect).toUpperCase();
  if (!effect) return null;
  let code = "DENIED_EFFECT_NOT_AUTHORIZED";
  if (effect.includes("STRIPE") || effect.includes("PAYMENT_REQUEST") || effect.includes("INVOICE")) {
    code = "DENIED_FINANCIAL_EFFECT_NOT_AUTHORIZED";
  } else if (effect.includes("ADVANCE") || effect.includes("MUTATE") || effect.includes("TITLE")) {
    code = "DENIED_STATE_MUTATION_NOT_AUTHORIZED";
  }
  return { REQUESTED_EFFECT: effect, DECISION: code, AUTHORIZED: false };
}

function reviewPreparedClassification({ prepared, currentStateVersion, decision, reviewer, reviewedAt, correction, reason }) {
  if (!prepared || prepared.CAPABILITY_ID !== CAPABILITY_ID) {
    throw new CommercialEligibilityError("INVALID_PREPARED_CLASSIFICATION", "A valid prepared classification is required.");
  }
  const normalizedDecision = text(decision).toUpperCase();
  if (!REVIEW_ACTIONS.includes(normalizedDecision)) {
    throw new CommercialEligibilityError("INVALID_REVIEW_ACTION", "Review action must be ACCEPT, REJECT, CORRECT, or DEFER.");
  }
  const normalizedReviewer = text(reviewer);
  if (!normalizedReviewer) {
    throw new CommercialEligibilityError("REVIEWER_REQUIRED", "An attributable reviewer is required.");
  }
  if (text(currentStateVersion) !== prepared.INPUT_STATE_REFERENCE) {
    return {
      REVIEW_STATUS: "STALE",
      REVIEW_ACTION: "DEFER",
      REVIEWER: normalizedReviewer,
      REVIEWED_AT: text(reviewedAt) || null,
      AGENT_PREPARED: prepared.CLASSIFICATION,
      HUMAN_CORRECTION: null,
      FINAL_REVIEWED_CLASSIFICATION: null,
      STALE_STATUS: "RECOMPUTE_REQUIRED",
      PROPOSED_NEXT_CAPABILITY_AUTHORIZED: "NO",
      BUSINESS_EFFECTS: 0
    };
  }
  const normalizedCorrection = text(correction).toUpperCase();
  if (normalizedDecision === "CORRECT" && !CLASSIFICATIONS.includes(normalizedCorrection)) {
    throw new CommercialEligibilityError("INVALID_HUMAN_CORRECTION", "A correction must use the canonical classification taxonomy.");
  }
  const finalClassification = normalizedDecision === "ACCEPT"
    ? prepared.CLASSIFICATION
    : normalizedDecision === "CORRECT"
      ? normalizedCorrection
      : null;
  return {
    REVIEW_STATUS: normalizedDecision === "DEFER" ? "DEFERRED" : "COMPLETED",
    REVIEW_ACTION: normalizedDecision,
    REVIEWER: normalizedReviewer,
    REVIEWED_AT: text(reviewedAt) || null,
    REVIEW_REASON: text(reason) || null,
    AGENT_PREPARED: prepared.CLASSIFICATION,
    HUMAN_CORRECTION: normalizedDecision === "CORRECT" ? normalizedCorrection : null,
    FINAL_REVIEWED_CLASSIFICATION: finalClassification,
    STALE_STATUS: "CURRENT",
    PROPOSED_NEXT_CAPABILITY_AUTHORIZED: "NO",
    BUSINESS_EFFECTS: 0
  };
}

function createCommercialEligibilityCapability({ auditSink, clock = () => new Date().toISOString() }) {
  if (typeof auditSink !== "function") throw new TypeError("A durable audit sink is required.");

  async function prepare({ state, currentStateVersion, requestedEffect } = {}) {
    const prepared = classifyState(state, { currentStateVersion, now: clock() });
    const effectDecision = denyRequestedEffect(requestedEffect);
    await auditSink({
      EVENT: "COMMERCIAL_ELIGIBILITY_PREPARED",
      CLASSIFICATION_ID: prepared.CLASSIFICATION_ID,
      CAPABILITY_ID,
      CAPABILITY_VERSION,
      REGISTRY_VERSION,
      IDENTITY,
      INPUT_STATE_REFERENCE: prepared.INPUT_STATE_REFERENCE,
      OUTPUT_CLASSIFICATION: prepared.CLASSIFICATION,
      EVIDENCE_REFERENCES: prepared.EVIDENCE_REFERENCES,
      OBSERVED_AT: prepared.OBSERVED_AT,
      REVIEW_STATUS: "PENDING",
      EFFECT_DECISION: effectDecision,
      BUSINESS_EFFECTS: 0
    });
    return { PREPARED_CLASSIFICATION: prepared, EFFECT_DECISION: effectDecision };
  }

  async function review(input) {
    const review = reviewPreparedClassification(input);
    await auditSink({
      EVENT: "COMMERCIAL_ELIGIBILITY_REVIEWED",
      CLASSIFICATION_ID: input.prepared.CLASSIFICATION_ID,
      CAPABILITY_ID,
      CAPABILITY_VERSION,
      REGISTRY_VERSION,
      IDENTITY,
      INPUT_STATE_REFERENCE: input.prepared.INPUT_STATE_REFERENCE,
      OUTPUT_CLASSIFICATION: input.prepared.CLASSIFICATION,
      REVIEW_STATUS: review.REVIEW_STATUS,
      REVIEWER: review.REVIEWER,
      REVIEWED_AT: review.REVIEWED_AT,
      HUMAN_CORRECTION: review.HUMAN_CORRECTION,
      FINAL_REVIEWED_CLASSIFICATION: review.FINAL_REVIEWED_CLASSIFICATION,
      BUSINESS_EFFECTS: 0
    });
    return review;
  }

  return { prepare, review };
}

module.exports = {
  CAPABILITY_ID,
  CAPABILITY_VERSION,
  CLASSIFICATIONS,
  CommercialEligibilityError,
  IDENTITY,
  PROHIBITED_EFFECTS,
  REGISTRY_VERSION,
  REVIEW_ACTIONS,
  classifyState,
  createCommercialEligibilityCapability,
  denyRequestedEffect,
  reviewPreparedClassification
};
