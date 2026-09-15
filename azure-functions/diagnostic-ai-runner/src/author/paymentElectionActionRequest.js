"use strict";

const { createHash } = require("node:crypto");
const {
  CLASSIFICATION,
  classifyPublishingReply
} = require("../mail/publishingReplyClassifier");
const {
  buildPaymentPlans,
  NEW_FINANCING_POLICY_VERSION,
  formatUsd
} = require("./paymentPolicyEngine");

const PAYMENT_ELECTION_ACTION_TYPE = "PAYMENT_ELECTION_ACTION_REQUEST_OPEN";
const PAYMENT_ELECTION_CLOSED_ACTION_TYPE = "PAYMENT_ELECTION_ACTION_REQUEST_CLOSED";
const PAYMENT_ELECTION_CLARIFICATION_ACTION_TYPE = "PAYMENT_ELECTION_CLARIFICATION_REQUIRED";
const PAYMENT_ELECTION_EXCEPTION_ACTION_TYPE = "AUTHOR_PAYMENT_ELECTION_INGESTION_FAILED";
const PAYMENT_ELECTION_SCHEDULE_ACTION_TYPE = "PAYMENT_SCHEDULE_GENERATED";
const PAYMENT_ELECTION_REQUEST_ACTION_TYPE = "PAYMENT_REQUEST_ORCHESTRATION_READY";
const WHOLE_MANUAL_CONTINUITY_SENT_AT = "2026-09-15T18:11:35Z";

const CLASSIFICATION_TO_PLAN_CODE = Object.freeze({
  [CLASSIFICATION.SINGLE]: "FULL_PAY",
  [CLASSIFICATION.TWO_PAYMENTS]: "2_PAY",
  [CLASSIFICATION.FOUR_PAYMENTS]: "4_PAY",
  [CLASSIFICATION.EIGHT_PAYMENTS]: "8_PAY",
  [CLASSIFICATION.TWELVE_PAYMENTS]: "12_PAY",
  [CLASSIFICATION.EIGHTEEN_PAYMENTS]: "18_PAY",
  [CLASSIFICATION.TWENTY_FOUR_PAYMENTS]: "24_PAY"
});

const PLAN_LABELS = Object.freeze({
  FULL_PAY: "Full Pay",
  "2_PAY": "2-Pay",
  "4_PAY": "4-Pay",
  "8_PAY": "8-Pay",
  "12_PAY": "12-Pay",
  "18_PAY": "18-Pay",
  "24_PAY": "24-Pay"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function centsFromUsd(value) {
  return Math.round(Number(value) * 100);
}

function usdFromCents(value) {
  return Math.round(Number(value)) / 100;
}

function stableHash(parts) {
  return createHash("sha256").update(parts.map((part) => normalizeString(part)).join(":")).digest("hex").slice(0, 24);
}

function stablePaymentElectionActionRequestKey(input = {}) {
  return `payment-election-required:${stableHash([
    input.opportunityId,
    input.engagementId,
    input.agreementId,
    input.agreementVersion,
    input.currentAgreementChecksum || input.agreementChecksum
  ])}`;
}

function stablePaymentElectionReplyKey(request = {}, inboundMessageId = "") {
  return `payment-election-response:${stableHash([
    request.actionRequestId || request.id || request.opportunityId || request.engagementId,
    inboundMessageId
  ])}`;
}

function validateAgreementCompletionEvent(event = {}) {
  const missing = [
    ["workId", event.workId || event.WorkId],
    ["engagementId", event.engagementId || event.EngagementId],
    ["agreementId", event.agreementId || event.AgreementId],
    ["agreementVersion", event.agreementVersion || event.AgreementVersion],
    ["executionState", event.executionState || event.ExecutionState],
    ["currentAgreement", event.currentAgreement ?? event.CurrentAgreement]
  ].filter(([, value]) => value === undefined || value === null || (typeof value === "string" && normalizeString(value) === "")).map(([name]) => name);

  if (missing.length > 0) return { ok: false, reason: "AGREEMENT_EVENT_AUTHORITY_INCOMPLETE", missing };
  const state = normalizeString(event.executionState || event.ExecutionState).toUpperCase();
  if (!["COMPLETED", "EXECUTED", "SIGNED"].includes(state)) {
    return { ok: false, reason: "AGREEMENT_NOT_EXECUTED", executionState: state };
  }
  if ((event.currentAgreement ?? event.CurrentAgreement) !== true) {
    return { ok: false, reason: "STALE_OR_SUPERSEDED_AGREEMENT" };
  }
  return { ok: true };
}

function classifyPaymentElectionIntent(replyText) {
  const { classification } = classifyPublishingReply(replyText);
  const planCode = CLASSIFICATION_TO_PLAN_CODE[classification] || null;
  if (!planCode) {
    return {
      ok: false,
      classification: "CLARIFICATION_REQUIRED",
      selectedPaymentOption: null,
      reason: classification || CLASSIFICATION.UNCLASSIFIED
    };
  }
  return {
    ok: true,
    classification,
    selectedPaymentOption: planCode,
    selectedPaymentOptionLabel: PLAN_LABELS[planCode]
  };
}

function buildPaymentSchedule(input = {}) {
  const contractedTotalUsd = Number(input.contractedTotalUsd);
  const paymentOptionCode = normalizeString(input.paymentOptionCode);
  const policyVersion = normalizeString(input.paymentPolicyVersion) || NEW_FINANCING_POLICY_VERSION;
  if (!Number.isFinite(contractedTotalUsd) || contractedTotalUsd <= 0) {
    return { ok: false, reason: "CONTRACTED_TOTAL_INVALID" };
  }
  const contractedTotalCents = centsFromUsd(contractedTotalUsd);
  const plan = buildPaymentPlans(contractedTotalCents, policyVersion).find((item) => item.planCode === paymentOptionCode);
  if (!plan) return { ok: false, reason: "PAYMENT_OPTION_UNSUPPORTED" };
  const installmentTotalCents = plan.installments.reduce((sum, row) => sum + row.totalDueCents, 0);
  if (installmentTotalCents !== plan.totalDueCents) return { ok: false, reason: "PAYMENT_SCHEDULE_ROUNDING_DRIFT" };
  return {
    ok: true,
    paymentOptionCode,
    paymentOptionLabel: PLAN_LABELS[paymentOptionCode],
    paymentPolicyVersion: plan.paymentPolicyVersion,
    contractedTotalUsd: usdFromCents(contractedTotalCents),
    contractedTotalFormatted: formatUsd(usdFromCents(contractedTotalCents)),
    paymentCount: plan.paymentCount,
    firstPaymentAmountUsd: plan.installments[0].totalDue,
    finalPaymentAmountUsd: plan.installments[plan.installments.length - 1].totalDue,
    totalDueUsd: plan.totalDue,
    totalDueFormatted: plan.totalDueFormatted,
    planChargeTotalUsd: plan.planChargeTotal,
    planChargeTotalFormatted: plan.planChargeTotalFormatted,
    installments: plan.installments.map((row) => ({
      installmentNumber: row.installmentNumber,
      totalDueUsd: row.totalDue,
      totalDueFormatted: row.totalDueFormatted
    }))
  };
}

function hasValidPaymentElection(state = {}) {
  return Boolean(
    state.paymentElectionCompleted === true ||
    normalizeString(state.paymentOptionSelected || state.selectedPaymentOption || state.jm1_m6selectedpaymentoption)
  );
}

function wholePaymentElectionManualContinuityActionRequest() {
  return {
    actionRequestId: "WHOLE-PAYMENT-ELECTION-2026-09-15",
    sourceEntity: "jm1_executionlog",
    sourceRecordId: "WHOLE-PAYMENT-ELECTION-2026-09-15",
    workId: "Whole",
    engagementId: "Whole",
    opportunityId: "",
    diagnosticId: "",
    intakeReferenceCode: "",
    title: "Whole",
    authorName: "Jacqueline Fly",
    authorEmailCandidates: [],
    subjectContains: "Whole — Choose Your Payment Option",
    afterIso: WHOLE_MANUAL_CONTINUITY_SENT_AT,
    contractedTotalUsd: 1999.00,
    paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
    communicationEvidence: "BOUND_TO_ACTION_REQUEST",
    communicationSentAt: WHOLE_MANUAL_CONTINUITY_SENT_AT,
    paymentRequestCreated: false,
    status: "OPEN"
  };
}

async function requirePaymentElectionActionRequest(event = {}, deps = {}) {
  const authority = validateAgreementCompletionEvent(event);
  if (!authority.ok) return { ok: false, action: "BLOCKED", ...authority };
  const existingElection = await (deps.findExistingPaymentElection || (async () => null))(event);
  if (hasValidPaymentElection(existingElection || {})) {
    return { ok: true, action: "PAYMENT_ELECTION_ALREADY_EXISTS", actionRequest: null, communicationRequired: false };
  }
  const idempotencyKey = stablePaymentElectionActionRequestKey(event);
  const existingRequest = await (deps.findOpenActionRequest || (async () => null))(idempotencyKey, event);
  if (existingRequest) {
    return { ok: true, action: "REUSED_OPEN_ACTION_REQUEST", idempotencyKey, actionRequest: existingRequest, communicationRequired: false };
  }
  const request = {
    actionRequestId: idempotencyKey,
    idempotencyKey,
    workId: event.workId || event.WorkId,
    engagementId: event.engagementId || event.EngagementId,
    opportunityId: event.opportunityId || event.OpportunityId || "",
    agreementId: event.agreementId || event.AgreementId,
    agreementVersion: event.agreementVersion || event.AgreementVersion,
    contractedTotalUsd: Number(event.contractedTotalUsd),
    paymentPolicyVersion: normalizeString(event.paymentPolicyVersion) || NEW_FINANCING_POLICY_VERSION,
    status: "OPEN",
    communicationEvidence: event.communicationEvidence || null,
    communicationSentAt: event.communicationSentAt || null
  };
  await (deps.createActionRequest || (async () => null))(request);
  return { ok: true, action: "CREATED_OPEN_ACTION_REQUEST", idempotencyKey, actionRequest: request, communicationRequired: !request.communicationEvidence };
}

function validatePaymentElectionRequestIdentity(request = {}, reply = {}) {
  const sender = normalizeString(reply.senderAddress).toLowerCase();
  const candidates = (request.authorEmailCandidates || [request.authorEmail]).map((value) => normalizeString(value).toLowerCase()).filter(Boolean);
  if (!sender) return { ok: false, reason: "UNKNOWN_SENDER_EMAIL" };
  if (candidates.length === 0) return { ok: true, reason: "AUTHOR_EMAIL_NOT_AVAILABLE_SUBJECT_CORRELATION_ONLY" };
  if (!candidates.includes(sender)) return { ok: false, reason: "AUTHOR_SENDER_MISMATCH" };
  return { ok: true };
}

module.exports = {
  PAYMENT_ELECTION_ACTION_TYPE,
  PAYMENT_ELECTION_CLOSED_ACTION_TYPE,
  PAYMENT_ELECTION_CLARIFICATION_ACTION_TYPE,
  PAYMENT_ELECTION_EXCEPTION_ACTION_TYPE,
  PAYMENT_ELECTION_SCHEDULE_ACTION_TYPE,
  PAYMENT_ELECTION_REQUEST_ACTION_TYPE,
  WHOLE_MANUAL_CONTINUITY_SENT_AT,
  CLASSIFICATION_TO_PLAN_CODE,
  PLAN_LABELS,
  stablePaymentElectionActionRequestKey,
  stablePaymentElectionReplyKey,
  validateAgreementCompletionEvent,
  classifyPaymentElectionIntent,
  buildPaymentSchedule,
  hasValidPaymentElection,
  requirePaymentElectionActionRequest,
  validatePaymentElectionRequestIdentity,
  wholePaymentElectionManualContinuityActionRequest
};
