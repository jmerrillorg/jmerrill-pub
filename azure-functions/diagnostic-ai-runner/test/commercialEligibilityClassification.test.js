"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CAPABILITY_ID,
  CLASSIFICATIONS,
  createCommercialEligibilityCapability
} = require("../src/agent/commercialEligibilityClassification");

function state(overrides = {}) {
  return {
    WORK_ID: "WORK-FIXTURE-001",
    TITLE_ID: "TITLE-FIXTURE-001",
    AUTHORITATIVE_STATE_VERSION: "state-v1",
    OBSERVED_AT: "2026-09-18T12:00:00.000Z",
    LIFECYCLE_COMMERCIAL_STATUS: "ACTIVE",
    AGREEMENT_STATE: "COMPLETE",
    EXECUTED_AGREEMENT_EVIDENCE: true,
    PAYMENT_ELECTION_STATE: "MISSING",
    PAYMENT_ELECTION_REVIEW_STATE: "PENDING",
    PAYMENT_REQUEST_STATE: "NONE",
    PAYMENT_STATE: "NONE",
    ACTION_REQUESTS: [],
    EXCEPTIONS: [],
    CONFLICTS: [],
    EVIDENCE_REFERENCES: ["fixture://commercial/state-v1"],
    MISSING_EVIDENCE: [],
    ...overrides
  };
}

function harness() {
  const traces = [];
  const capability = createCommercialEligibilityCapability({
    auditSink: async (trace) => traces.push(trace),
    clock: () => "2026-09-18T12:05:00.000Z"
  });
  return { capability, traces };
}

async function classification(overrides = {}, request = {}) {
  const { capability, traces } = harness();
  const result = await capability.prepare({ state: state(overrides), ...request });
  return { result, traces, capability };
}

describe("Publishing commercial eligibility A2 capability", () => {
  test("taxonomy is unique and bounded", () => {
    assert.equal(CLASSIFICATIONS.length, 12);
    assert.equal(new Set(CLASSIFICATIONS).size, 12);
  });

  test("agreement incomplete", async () => {
    const { result } = await classification({ AGREEMENT_STATE: "INCOMPLETE", EXECUTED_AGREEMENT_EVIDENCE: false });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "AGREEMENT_REQUIRED");
  });

  test("agreement complete and election missing", async () => {
    const { result } = await classification();
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED");
    assert.equal(result.PREPARED_CLASSIFICATION.PROPOSED_NEXT_CAPABILITY_AUTHORIZED, "NO");
  });

  test("waiting on author", async () => {
    const { result } = await classification({ PAYMENT_ELECTION_STATE: "WAITING_ON_AUTHOR", ACTION_REQUESTS: ["PAYMENT_ELECTION_REQUIRED"] });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "WAITING_ON_AUTHOR_PAYMENT_ELECTION");
  });

  test("valid election requires review", async () => {
    const { result } = await classification({ PAYMENT_ELECTION_STATE: "RECEIVED_VALID" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "PAYMENT_ELECTION_RECEIVED_REVIEW_REQUIRED");
  });

  test("accepted election is preparation eligible without effect authority", async () => {
    const { result } = await classification({ PAYMENT_ELECTION_STATE: "RECEIVED_VALID", PAYMENT_ELECTION_REVIEW_STATE: "ACCEPTED" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "PAYMENT_REQUEST_PREPARATION_ELIGIBLE");
    assert.equal(result.PREPARED_CLASSIFICATION.BUSINESS_EFFECTS, 0);
  });

  test("existing payment request", async () => {
    const { result } = await classification({ PAYMENT_REQUEST_STATE: "EXISTS" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "PAYMENT_REQUEST_ALREADY_EXISTS");
  });

  test("payment pending", async () => {
    const { result } = await classification({ PAYMENT_REQUEST_STATE: "EXISTS", PAYMENT_STATE: "PENDING" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "PAYMENT_PENDING");
  });

  test("payment confirmed", async () => {
    const { result } = await classification({ PAYMENT_REQUEST_STATE: "EXISTS", PAYMENT_STATE: "CONFIRMED" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "PAYMENT_CONFIRMED");
  });

  test("commercial exception and Founder decision fail closed", async () => {
    const { result } = await classification({ EXCEPTIONS: ["FOUNDER_DECISION_REQUIRED"] });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED");
    assert.equal(result.PREPARED_CLASSIFICATION.EXCEPTION_CLASS, "FOUNDER_DECISION_REQUIRED");
  });

  test("conflicting state is never guessed", async () => {
    const { result } = await classification({ CONFLICTS: ["AGREEMENT_STATE_CONFLICT"] });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "STALE_OR_CONFLICTING_STATE");
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION_CONFIDENCE, "INSUFFICIENT");
  });

  test("missing evidence is never guessed", async () => {
    const { result } = await classification({ EVIDENCE_REFERENCES: [] });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "INSUFFICIENT_EVIDENCE");
  });

  test("stale observation is invalidated", async () => {
    const { result } = await classification({}, { currentStateVersion: "state-v2" });
    assert.equal(result.PREPARED_CLASSIFICATION.CLASSIFICATION, "STALE_OR_CONFLICTING_STATE");
  });

  test("duplicate unchanged evaluation is deterministic", async () => {
    const first = await classification();
    const second = await classification();
    assert.deepEqual(first.result.PREPARED_CLASSIFICATION, second.result.PREPARED_CLASSIFICATION);
  });

  test("human accept remains no-effect", async () => {
    const { result, capability, traces } = await classification();
    const review = await capability.review({
      prepared: result.PREPARED_CLASSIFICATION,
      currentStateVersion: "state-v1",
      decision: "ACCEPT",
      reviewer: "reviewer-fixture",
      reviewedAt: "2026-09-18T12:10:00.000Z"
    });
    assert.equal(review.FINAL_REVIEWED_CLASSIFICATION, "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED");
    assert.equal(review.PROPOSED_NEXT_CAPABILITY_AUTHORIZED, "NO");
    assert.equal(review.BUSINESS_EFFECTS, 0);
    assert.equal(traces.length, 2);
  });

  test("human correction preserves prepared result", async () => {
    const { result, capability } = await classification({ PAYMENT_ELECTION_STATE: "RECEIVED_VALID" });
    const review = await capability.review({
      prepared: result.PREPARED_CLASSIFICATION,
      currentStateVersion: "state-v1",
      decision: "CORRECT",
      correction: "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED",
      reviewer: "reviewer-fixture",
      reviewedAt: "2026-09-18T12:10:00.000Z",
      reason: "Fixture correction"
    });
    assert.equal(review.AGENT_PREPARED, "PAYMENT_ELECTION_RECEIVED_REVIEW_REQUIRED");
    assert.equal(review.HUMAN_CORRECTION, "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED");
    assert.equal(review.FINAL_REVIEWED_CLASSIFICATION, "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED");
  });

  test("review fails stale when state changes", async () => {
    const { result, capability } = await classification();
    const review = await capability.review({
      prepared: result.PREPARED_CLASSIFICATION,
      currentStateVersion: "state-v2",
      decision: "ACCEPT",
      reviewer: "reviewer-fixture",
      reviewedAt: "2026-09-18T12:10:00.000Z"
    });
    assert.equal(review.REVIEW_STATUS, "STALE");
    assert.equal(review.FINAL_REVIEWED_CLASSIFICATION, null);
  });

  test("email request is denied after classification", async () => {
    const { result } = await classification({}, { requestedEffect: "ACS.SEND_PAYMENT_ELECTION_EMAIL" });
    assert.equal(result.EFFECT_DECISION.DECISION, "DENIED_EFFECT_NOT_AUTHORIZED");
  });

  test("Stripe invoice request is denied", async () => {
    const { result } = await classification({}, { requestedEffect: "STRIPE.INVOICE_CREATE" });
    assert.equal(result.EFFECT_DECISION.DECISION, "DENIED_FINANCIAL_EFFECT_NOT_AUTHORIZED");
  });

  test("title advancement is denied", async () => {
    const { result } = await classification({}, { requestedEffect: "PUBLISHING.TITLE_ADVANCE" });
    assert.equal(result.EFFECT_DECISION.DECISION, "DENIED_STATE_MUTATION_NOT_AUTHORIZED");
  });

  test("audit trace is complete and contains no hidden reasoning", async () => {
    const { result, traces } = await classification();
    assert.equal(result.PREPARED_CLASSIFICATION.CAPABILITY_ID, CAPABILITY_ID);
    assert.equal(traces.length, 1);
    for (const field of ["CLASSIFICATION_ID", "CAPABILITY_ID", "CAPABILITY_VERSION", "REGISTRY_VERSION", "IDENTITY", "INPUT_STATE_REFERENCE", "OUTPUT_CLASSIFICATION", "EVIDENCE_REFERENCES", "OBSERVED_AT", "REVIEW_STATUS", "BUSINESS_EFFECTS"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(traces[0], field), field);
    }
    assert.equal("CHAIN_OF_THOUGHT" in traces[0], false);
  });
});
