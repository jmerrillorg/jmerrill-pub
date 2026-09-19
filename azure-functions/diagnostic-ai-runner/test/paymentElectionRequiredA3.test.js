"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CERTIFIED_EFFECT_ADAPTER,
  CERTIFIED_EFFECT_TOOL,
  FIXTURE_MODE,
  REQUIRED_CLASSIFICATION,
  REQUIRED_IDENTITY,
  TOOL_CONTRACT,
  createPaymentElectionRequiredA3
} = require("../src/agent/paymentElectionRequiredA3");

const IDS = Object.freeze({
  opportunityId: "11111111-1111-4111-8111-111111111111",
  titleId: "22222222-2222-4222-8222-222222222222",
  authorId: "33333333-3333-4333-8333-333333333333",
  actionRequestId: "44444444-4444-4444-8444-444444444444"
});

function state(overrides = {}) {
  return {
    WORK_ID: IDS.opportunityId,
    TITLE_ID: IDS.titleId,
    AUTHOR_ID: IDS.authorId,
    AUTHORITATIVE_STATE_VERSION: "dv-state-current",
    AGREEMENT_STATE: "COMPLETE",
    EXECUTED_AGREEMENT_EVIDENCE: true,
    PAYMENT_ELECTION_STATE: "MISSING",
    PAYMENT_REQUEST_STATE: "NONE",
    PAYMENT_STATE: "NONE",
    COMMUNICATION_STATE: "NOT_SENT",
    PROVIDER_CANDIDATES: ["ACS_RELAY"],
    ...overrides
  };
}

function request(overrides = {}) {
  return {
    identity: REQUIRED_IDENTITY,
    requestedTool: CERTIFIED_EFFECT_TOOL,
    workBinding: { opportunityId: IDS.opportunityId, titleId: IDS.titleId, authorId: IDS.authorId },
    reviewAudit: {
      classificationId: "commercial-eligibility-fixture",
      currentStateVersion: "dv-state-current",
      review: {
        REVIEW_STATUS: "COMPLETED",
        REVIEW_ACTION: "ACCEPT",
        REVIEWER: "publisher@example.test",
        REVIEWED_AT: "2026-09-19T12:00:00.000Z",
        STALE_STATUS: "CURRENT",
        FINAL_REVIEWED_CLASSIFICATION: REQUIRED_CLASSIFICATION
      }
    },
    actionRequest: {
      actionRequestId: IDS.actionRequestId,
      opportunityId: IDS.opportunityId,
      communicationAuthority: "JM1_COMMS_002A"
    },
    ...overrides
  };
}

function harness(stateReader = async () => state()) {
  const audit = [];
  const reservations = new Set();
  const invocations = [];
  const capability = createPaymentElectionRequiredA3({
    mode: FIXTURE_MODE,
    readCurrentState: stateReader,
    audit: async (record) => audit.push(record),
    idempotency: {
      reserve: async (key) => {
        if (reservations.has(key)) return { created: false };
        reservations.add(key);
        return { created: true };
      }
    },
    fixtureInvoke: async (payload) => {
      invocations.push(payload);
      return { fixtureOnly: true, businessEffects: 0 };
    },
    clock: () => "2026-09-19T12:05:00.000Z"
  });
  return { audit, capability, invocations };
}

function approval(plan, overrides = {}) {
  return {
    decision: "APPROVE",
    reviewer: "publisher@example.test",
    approvedAt: "2026-09-19T12:04:00.000Z",
    planId: plan.planId,
    stateReference: plan.stateReference,
    ...overrides
  };
}

async function expectDenied(promise, code) {
  await assert.rejects(promise, (error) => error.code === code);
}

describe("supervised payment-election A3 fixture capability", () => {
  test("contract reuses the certified consumer and exposes no production effect", () => {
    assert.equal(TOOL_CONTRACT.EFFECT_ADAPTER, CERTIFIED_EFFECT_ADAPTER);
    assert.deepEqual(TOOL_CONTRACT.EFFECT_TOOL_ALLOWLIST, [CERTIFIED_EFFECT_TOOL]);
    assert.equal(TOOL_CONTRACT.PRODUCTION_EFFECT_AUTHORIZED, false);
    assert.equal(TOOL_CONTRACT.FINANCIAL_MUTATIONS, false);
    assert.equal(TOOL_CONTRACT.RAW_SYSTEM_ACCESS, false);
  });

  test("approved fixture invokes the certified adapter exactly once with zero effects", async () => {
    const { audit, capability, invocations } = harness();
    const plan = await capability.prepare(request());
    const result = await capability.executeFixture({ plan, approval: approval(plan) });
    assert.equal(result.outcome, "FIXTURE_INVOCATION_PROVED");
    assert.equal(result.businessEffects, 0);
    assert.equal(invocations.length, 1);
    assert.equal(invocations[0].adapter, CERTIFIED_EFFECT_ADAPTER);
    assert.equal(invocations[0].productionEffectAuthorized, false);
    assert.deepEqual(audit.map((entry) => entry.event), [
      "PAYMENT_ELECTION_A3_INVOCATION_PREPARED",
      "PAYMENT_ELECTION_A3_FIXTURE_PROVED"
    ]);
  });

  test("duplicate invocation is denied by durable semantic idempotency", async () => {
    const { capability, invocations } = harness();
    const plan = await capability.prepare(request());
    await capability.executeFixture({ plan, approval: approval(plan) });
    const replay = await capability.executeFixture({ plan, approval: approval(plan) });
    assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
    assert.equal(replay.invoked, false);
    assert.equal(invocations.length, 1);
  });

  test("stale state is denied after preparation", async () => {
    let reads = 0;
    const { capability } = harness(async () => state({ AUTHORITATIVE_STATE_VERSION: reads++ === 0 ? "dv-state-current" : "dv-state-new" }));
    const plan = await capability.prepare(request());
    await expectDenied(capability.executeFixture({ plan, approval: approval(plan) }), "STALE_STATE_DENIED");
  });

  test("wrong engagement is denied", async () => {
    const { capability } = harness(async () => state({ WORK_ID: "55555555-5555-4555-8555-555555555555" }));
    await expectDenied(capability.prepare(request()), "WRONG_ENGAGEMENT_DENIED");
  });

  test("wrong title is denied", async () => {
    const { capability } = harness(async () => state({ TITLE_ID: "55555555-5555-4555-8555-555555555555" }));
    await expectDenied(capability.prepare(request()), "WRONG_TITLE_DENIED");
  });

  test("wrong author is denied", async () => {
    const { capability } = harness(async () => state({ AUTHOR_ID: "55555555-5555-4555-8555-555555555555" }));
    await expectDenied(capability.prepare(request()), "WRONG_AUTHOR_DENIED");
  });

  test("missing genuine A2 human disposition is denied", async () => {
    const input = request();
    input.reviewAudit.review.REVIEW_STATUS = "PENDING";
    const { capability } = harness();
    await expectDenied(capability.prepare(input), "A2_HUMAN_GATE_MISSING");
  });

  test("missing supervised A3 invocation approval is denied", async () => {
    const { capability } = harness();
    const plan = await capability.prepare(request());
    await expectDenied(capability.executeFixture({ plan, approval: {} }), "A3_HUMAN_GATE_MISSING");
  });

  test("an already-sent communication is denied", async () => {
    const { capability } = harness(async () => state({ COMMUNICATION_STATE: "SENT" }));
    await expectDenied(capability.prepare(request()), "COMMUNICATION_ALREADY_SENT");
  });

  test("a non-allowlisted effect tool is denied", async () => {
    const { capability } = harness();
    await expectDenied(capability.prepare(request({ requestedTool: "PUBLISHING.UNRELATED_EFFECT" })), "EFFECT_TOOL_NOT_ALLOWLISTED");
  });

  test("provider ambiguity is denied", async () => {
    const { capability } = harness(async () => state({ PROVIDER_CANDIDATES: ["ACS_RELAY", "GRAPH_SENDMAIL"] }));
    await expectDenied(capability.prepare(request()), "PROVIDER_AUTHORITY_AMBIGUOUS");
  });

  test("financial mutation attempts are denied", async () => {
    const { capability } = harness();
    await expectDenied(capability.prepare(request({ requestedTool: "STRIPE.INVOICE_CREATE" })), "FINANCIAL_MUTATION_DENIED");
  });

  test("raw system access is denied", async () => {
    const { capability } = harness();
    await expectDenied(capability.prepare(request({ requestedTool: "DATAVERSE.PATCH" })), "RAW_SYSTEM_ACCESS_DENIED");
  });

  test("an unauthorized identity is denied", async () => {
    const { capability } = harness();
    await expectDenied(capability.prepare(request({ identity: "func-jm1-diagnostic-ai-runner/system-assigned" })), "A3_IDENTITY_DENIED");
  });

  test("production mode is not constructible", () => {
    assert.throws(
      () => createPaymentElectionRequiredA3({ mode: "PRODUCTION", readCurrentState: async () => state(), audit: async () => {}, idempotency: { reserve: async () => ({ created: true }) }, fixtureInvoke: async () => ({ fixtureOnly: true, businessEffects: 0 }) }),
      (error) => error.code === "A3_PRODUCTION_EFFECT_NOT_AUTHORIZED"
    );
  });
});
