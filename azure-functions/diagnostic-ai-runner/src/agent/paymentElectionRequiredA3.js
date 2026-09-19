"use strict";

const { createHash } = require("node:crypto");
const {
  TEMPLATE_ID,
  TEMPLATE_VERSION
} = require("../orchestration/paymentElectionCommunicationConsumer");

const CAPABILITY_ID = "PUBLISHING.PAYMENT_ELECTION_REQUIRED";
const CONTRACT_VERSION = "JM1-PUBLISHING-PAYMENT-ELECTION-A3-v0.1.0";
const REQUIRED_CLASSIFICATION = "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED";
const CERTIFIED_EFFECT_TOOL = "PUBLISHING.PAYMENT_ELECTION_COMMUNICATION";
const CERTIFIED_EFFECT_ADAPTER = "paymentElectionCommunicationConsumer.processPaymentElectionCommunication";
const REQUIRED_IDENTITY = "id-jm1-pub-commercial-eligibility-a2/user-assigned";
const FIXTURE_MODE = "FIXTURE_NON_EFFECT";
const RAW_SYSTEM_PREFIXES = Object.freeze([
  "ACS.",
  "BROWSER.",
  "DATAVERSE.",
  "FILESYSTEM.",
  "GRAPH.",
  "POWER_AUTOMATE.",
  "PROVIDER.",
  "SQL.",
  "STRIPE."
]);

const TOOL_CONTRACT = Object.freeze({
  CONTRACT_VERSION,
  CAPABILITY_ID,
  AUTONOMY_LEVEL: "A3_SUPERVISED",
  MODE: FIXTURE_MODE,
  INPUT_AUTHORITY: "A2_REVIEW_AUDIT_PLUS_AUTHORITATIVE_STATE_REREAD",
  REQUIRED_A2_CLASSIFICATION: REQUIRED_CLASSIFICATION,
  HUMAN_GATES: ["A2_CLASSIFICATION_DISPOSITION", "A3_INVOCATION_APPROVAL"],
  EFFECT_TOOL_ALLOWLIST: [CERTIFIED_EFFECT_TOOL],
  EFFECT_ADAPTER: CERTIFIED_EFFECT_ADAPTER,
  TEMPLATE_ID,
  TEMPLATE_VERSION,
  PROVIDER_AUTHORITY: "ACS_RELAY",
  IDEMPOTENCY: "DURABLE_PLAN_KEY_PLUS_EXISTING_COMMUNICATION_OUTBOX",
  PRODUCTION_EFFECT_AUTHORIZED: false,
  DOWNSTREAM_CHAINING: false,
  FINANCIAL_MUTATIONS: false,
  RAW_SYSTEM_ACCESS: false
});

class PaymentElectionA3Error extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PaymentElectionA3Error";
    this.code = code;
    this.details = details;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
}

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function deny(code, message, details) {
  throw new PaymentElectionA3Error(code, message, details);
}

function requireExactBinding(binding = {}) {
  for (const field of ["opportunityId", "titleId", "authorId"]) {
    if (!uuid(binding[field])) deny("INVALID_WORK_BINDING", `A valid ${field} is required.`);
  }
  return {
    opportunityId: clean(binding.opportunityId).toLowerCase(),
    titleId: clean(binding.titleId).toLowerCase(),
    authorId: clean(binding.authorId).toLowerCase()
  };
}

function requireAllowedTool(requestedTool) {
  const tool = clean(requestedTool).toUpperCase();
  if (tool === CERTIFIED_EFFECT_TOOL) return tool;
  if (tool.includes("FINANCIAL") || tool.includes("INVOICE") || tool.includes("PAYMENT_REQUEST")) {
    deny("FINANCIAL_MUTATION_DENIED", "Financial mutations are outside this A3 capability.", { requestedTool: tool });
  }
  if (RAW_SYSTEM_PREFIXES.some((prefix) => tool.startsWith(prefix))) {
    deny("RAW_SYSTEM_ACCESS_DENIED", "Raw system tools are not exposed to the A3 capability.", { requestedTool: tool });
  }
  deny("EFFECT_TOOL_NOT_ALLOWLISTED", "The requested effect tool is not allowlisted.", { requestedTool: tool });
}

function requireCompletedA2Review(reviewAudit = {}) {
  const review = reviewAudit.review || {};
  if (
    review.REVIEW_STATUS !== "COMPLETED" ||
    !["ACCEPT", "CORRECT"].includes(review.REVIEW_ACTION) ||
    !clean(review.REVIEWER) ||
    !clean(review.REVIEWED_AT)
  ) {
    deny("A2_HUMAN_GATE_MISSING", "A completed attributable A2 disposition is required.");
  }
  if (review.STALE_STATUS !== "CURRENT") {
    deny("A2_REVIEW_STALE", "The A2 review is not current.");
  }
  if (review.FINAL_REVIEWED_CLASSIFICATION !== REQUIRED_CLASSIFICATION) {
    deny("A2_CLASSIFICATION_NOT_ELIGIBLE", "The reviewed A2 classification is not eligible for this A3 capability.", {
      classification: review.FINAL_REVIEWED_CLASSIFICATION || null
    });
  }
  if (!clean(reviewAudit.classificationId) || !clean(reviewAudit.currentStateVersion)) {
    deny("A2_REVIEW_AUDIT_INCOMPLETE", "The A2 review audit reference is incomplete.");
  }
  return review;
}

function requireCurrentState(state = {}, binding, expectedVersion) {
  const comparisons = [
    ["WORK_ID", binding.opportunityId, "WRONG_ENGAGEMENT_DENIED"],
    ["TITLE_ID", binding.titleId, "WRONG_TITLE_DENIED"],
    ["AUTHOR_ID", binding.authorId, "WRONG_AUTHOR_DENIED"]
  ];
  for (const [field, expected, code] of comparisons) {
    if (clean(state[field]).toLowerCase() !== expected) {
      deny(code, `Authoritative ${field} does not match the approved work binding.`);
    }
  }
  if (clean(state.AUTHORITATIVE_STATE_VERSION) !== clean(expectedVersion)) {
    deny("STALE_STATE_DENIED", "Authoritative state changed after human review.", {
      reviewedStateVersion: clean(expectedVersion),
      currentStateVersion: clean(state.AUTHORITATIVE_STATE_VERSION)
    });
  }
  if (state.AGREEMENT_STATE !== "COMPLETE" || state.EXECUTED_AGREEMENT_EVIDENCE !== true) {
    deny("AGREEMENT_AUTHORITY_DENIED", "Executed agreement authority is not current.");
  }
  if (state.PAYMENT_ELECTION_STATE !== "MISSING") {
    deny("PAYMENT_ELECTION_NO_LONGER_REQUIRED", "A payment election is no longer required.");
  }
  if (state.PAYMENT_REQUEST_STATE !== "NONE" || state.PAYMENT_STATE !== "NONE") {
    deny("FINANCIAL_STATE_ALREADY_ACTIVE", "Payment activity already exists for this obligation.");
  }
  if (state.COMMUNICATION_STATE !== "NOT_SENT") {
    deny("COMMUNICATION_ALREADY_SENT", "The governed communication has already been sent or reserved.");
  }
  const providers = Array.isArray(state.PROVIDER_CANDIDATES) ? state.PROVIDER_CANDIDATES : [];
  if (providers.length !== 1 || providers[0] !== "ACS_RELAY") {
    deny("PROVIDER_AUTHORITY_AMBIGUOUS", "Exactly one certified ACS relay authority is required.", { providers });
  }
}

function requireInvocationApproval(approval = {}, plan) {
  if (
    approval.decision !== "APPROVE" ||
    !clean(approval.reviewer) ||
    !clean(approval.approvedAt) ||
    clean(approval.planId) !== plan.planId ||
    clean(approval.stateReference) !== plan.stateReference
  ) {
    deny("A3_HUMAN_GATE_MISSING", "A current attributable approval bound to this exact invocation plan is required.");
  }
}

function createPaymentElectionRequiredA3(options = {}) {
  const mode = clean(options.mode) || FIXTURE_MODE;
  const readCurrentState = options.readCurrentState;
  const audit = options.audit;
  const idempotency = options.idempotency;
  const fixtureInvoke = options.fixtureInvoke;
  const clock = options.clock || (() => new Date().toISOString());

  if (mode !== FIXTURE_MODE) deny("A3_PRODUCTION_EFFECT_NOT_AUTHORIZED", "Only fixture/non-effect mode is commissioned.");
  if (typeof readCurrentState !== "function") throw new TypeError("An authoritative state reader is required.");
  if (typeof audit !== "function") throw new TypeError("A durable audit sink is required.");
  if (!idempotency || typeof idempotency.reserve !== "function") throw new TypeError("A durable idempotency store is required.");
  if (typeof fixtureInvoke !== "function") throw new TypeError("A fixture effect adapter is required.");

  async function prepare(input = {}) {
    if (clean(input.identity) !== REQUIRED_IDENTITY) deny("A3_IDENTITY_DENIED", "The caller identity is not authorized.");
    const requestedTool = requireAllowedTool(input.requestedTool);
    const binding = requireExactBinding(input.workBinding);
    const review = requireCompletedA2Review(input.reviewAudit);
    const state = await readCurrentState(binding);
    requireCurrentState(state, binding, input.reviewAudit.currentStateVersion);
    const actionRequestId = clean(input.actionRequest?.actionRequestId);
    if (!uuid(actionRequestId) || clean(input.actionRequest?.opportunityId).toLowerCase() !== binding.opportunityId) {
      deny("ACTION_REQUEST_BINDING_DENIED", "The governed action request does not match the approved engagement.");
    }
    const idempotencyKey = `payment-election-a3:${input.reviewAudit.classificationId}:${state.AUTHORITATIVE_STATE_VERSION}:${TEMPLATE_ID}:${TEMPLATE_VERSION}`;
    const planId = `a3-plan-${stableHash({ binding, idempotencyKey, requestedTool }).slice(0, 24)}`;
    const plan = {
      contractVersion: CONTRACT_VERSION,
      capabilityId: CAPABILITY_ID,
      autonomyLevel: "A3_SUPERVISED",
      mode,
      planId,
      identity: REQUIRED_IDENTITY,
      classificationId: input.reviewAudit.classificationId,
      classification: review.FINAL_REVIEWED_CLASSIFICATION,
      workBinding: binding,
      stateReference: state.AUTHORITATIVE_STATE_VERSION,
      requestedTool,
      certifiedEffectAdapter: CERTIFIED_EFFECT_ADAPTER,
      actionRequest: input.actionRequest,
      templateId: TEMPLATE_ID,
      templateVersion: TEMPLATE_VERSION,
      providerAuthority: "ACS_RELAY",
      idempotencyKey,
      invocationStatus: "AWAITING_SUPERVISED_APPROVAL",
      preparedAt: clock(),
      productionEffectAuthorized: false,
      downstreamChaining: false
    };
    await audit({ event: "PAYMENT_ELECTION_A3_INVOCATION_PREPARED", plan, businessEffects: 0 });
    return plan;
  }

  async function executeFixture(input = {}) {
    const plan = input.plan || {};
    if (plan.mode !== FIXTURE_MODE || plan.productionEffectAuthorized !== false) {
      deny("A3_PRODUCTION_EFFECT_NOT_AUTHORIZED", "The invocation is not a fixture/non-effect plan.");
    }
    requireInvocationApproval(input.approval, plan);
    const state = await readCurrentState(plan.workBinding);
    requireCurrentState(state, plan.workBinding, plan.stateReference);
    const reservation = await idempotency.reserve(plan.idempotencyKey, {
      planId: plan.planId,
      classificationId: plan.classificationId,
      approvedBy: input.approval.reviewer,
      approvedAt: input.approval.approvedAt
    });
    if (!reservation?.created) {
      await audit({ event: "PAYMENT_ELECTION_A3_DUPLICATE_DENIED", planId: plan.planId, idempotencyKey: plan.idempotencyKey, businessEffects: 0 });
      return { outcome: "IDEMPOTENT_REPLAY", invoked: false, businessEffects: 0, idempotencyKey: plan.idempotencyKey };
    }
    const fixtureResult = await fixtureInvoke({
      adapter: CERTIFIED_EFFECT_ADAPTER,
      actionRequest: plan.actionRequest,
      idempotencyKey: plan.idempotencyKey,
      templateId: TEMPLATE_ID,
      templateVersion: TEMPLATE_VERSION,
      providerAuthority: "ACS_RELAY",
      productionEffectAuthorized: false
    });
    if (!fixtureResult || fixtureResult.fixtureOnly !== true || Number(fixtureResult.businessEffects) !== 0) {
      deny("FIXTURE_EFFECT_CONTAINMENT_FAILED", "The fixture adapter did not prove zero-effect containment.");
    }
    const result = {
      outcome: "FIXTURE_INVOCATION_PROVED",
      invoked: true,
      adapter: CERTIFIED_EFFECT_ADAPTER,
      idempotencyKey: plan.idempotencyKey,
      providerEffects: 0,
      financialEffects: 0,
      businessEffects: 0,
      downstreamChaining: false,
      completedAt: clock()
    };
    await audit({ event: "PAYMENT_ELECTION_A3_FIXTURE_PROVED", planId: plan.planId, approval: input.approval, result });
    return result;
  }

  return { executeFixture, prepare, toolContract: TOOL_CONTRACT };
}

module.exports = {
  CAPABILITY_ID,
  CERTIFIED_EFFECT_ADAPTER,
  CERTIFIED_EFFECT_TOOL,
  CONTRACT_VERSION,
  FIXTURE_MODE,
  PaymentElectionA3Error,
  REQUIRED_CLASSIFICATION,
  REQUIRED_IDENTITY,
  TOOL_CONTRACT,
  createPaymentElectionRequiredA3
};
