"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { buildState } = require("../src/agent/commercialEligibilityDataverseReader");
const { createCommercialEligibilityProductionBinding } = require("../src/agent/commercialEligibilityProductionBinding");

const originalGate = process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_A2_ENABLED;

function liveState(version = "dv-state-v1") {
  return {
    WORK_ID: "11111111-1111-4111-8111-111111111111",
    TITLE_ID: "22222222-2222-4222-8222-222222222222",
    AUTHORITATIVE_STATE_VERSION: version,
    OBSERVED_AT: "2026-09-18T14:00:00.000Z",
    STATE_EXPIRES_AT: "2026-09-18T14:15:00.000Z",
    LIFECYCLE_COMMERCIAL_STATUS: "ACTIVE",
    AGREEMENT_STATE: "COMPLETE",
    EXECUTED_AGREEMENT_EVIDENCE: true,
    PAYMENT_ELECTION_STATE: "MISSING",
    PAYMENT_ELECTION_REVIEW_STATE: "PENDING",
    PAYMENT_REQUEST_STATE: "NONE",
    PAYMENT_STATE: "NONE",
    ACTION_REQUESTS: [], EXCEPTIONS: [], CONFLICTS: [], MISSING_EVIDENCE: [],
    EVIDENCE_REFERENCES: ["dataverse://opportunities/11111111-1111-4111-8111-111111111111"]
  };
}

function memoryAudit() {
  let preparation;
  const reviews = new Map();
  const denials = new Map();
  return {
    async savePreparation(value) {
      if (preparation) return { value: preparation, created: false, blobName: "preparation.json" };
      preparation = value;
      return { value, created: true, blobName: "preparation.json" };
    },
    async readPreparation() { return preparation; },
    async saveReview(value) {
      const key = JSON.stringify([value.review.REVIEWER, value.review.REVIEW_ACTION, value.currentStateVersion]);
      if (reviews.has(key)) return { value: reviews.get(key), created: false, blobName: "review.json" };
      reviews.set(key, value);
      return { value, created: true, blobName: "review.json" };
    },
    async savePolicyDenial(value) {
      const key = value.effectDecision.REQUESTED_EFFECT;
      if (denials.has(key)) return { value: denials.get(key), created: false, blobName: `denial-${key}.json` };
      denials.set(key, value);
      return { value, created: true, blobName: `denial-${key}.json` };
    },
    async list() {
      return [
        ...(preparation ? [{ name: "preparation.json", record: preparation }] : []),
        ...[...reviews.values()].map((record, index) => ({ name: `review-${index}.json`, record })),
        ...[...denials.values()].map((record, index) => ({ name: `denial-${index}.json`, record }))
      ];
    }
  };
}

describe("commercial eligibility production binding", () => {
  beforeEach(() => { process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_A2_ENABLED = "true"; });
  afterEach(() => { process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_A2_ENABLED = originalGate; });

  test("production prepare is durable and idempotent with zero effects", async () => {
    const binding = createCommercialEligibilityProductionBinding({ readState: async () => liveState(), audit: memoryAudit(), clock: () => "2026-09-18T14:05:00.000Z" });
    const first = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    const replay = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    assert.equal(first.idempotentReplay, false);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(first.prepared.CLASSIFICATION, "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED");
    assert.equal(first.businessEffects, 0);
  });

  test("fresh observation timestamp does not defeat authoritative-state idempotency", async () => {
    let observedAt = "2026-09-18T14:00:00.000Z";
    const audit = memoryAudit();
    const binding = createCommercialEligibilityProductionBinding({
      readState: async () => ({ ...liveState(), OBSERVED_AT: observedAt, STATE_EXPIRES_AT: "2026-09-18T15:00:00.000Z" }),
      audit,
      clock: () => "2026-09-18T14:05:00.000Z"
    });
    const first = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    observedAt = "2026-09-18T14:04:00.000Z";
    const replay = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    assert.equal(first.prepared.CLASSIFICATION_ID, replay.prepared.CLASSIFICATION_ID);
    assert.equal(replay.idempotentReplay, true);
  });

  test("review re-reads state and invalidates stale preparation", async () => {
    let version = "dv-state-v1";
    const audit = memoryAudit();
    const binding = createCommercialEligibilityProductionBinding({ readState: async () => liveState(version), audit, clock: () => "2026-09-18T14:05:00.000Z" });
    const prepared = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    version = "dv-state-v2";
    const reviewed = await binding.review({ classificationId: prepared.prepared.CLASSIFICATION_ID, reviewer: "publisher@example.test", decision: "ACCEPT" });
    assert.equal(reviewed.review.REVIEW_STATUS, "STALE");
    assert.equal(reviewed.review.FINAL_REVIEWED_CLASSIFICATION, null);
    assert.equal(reviewed.businessEffects, 0);
  });

  test("review denies a time-expired preparation even when Dataverse version is unchanged", async () => {
    const audit = memoryAudit();
    let now = "2026-09-18T14:05:00.000Z";
    const binding = createCommercialEligibilityProductionBinding({
      readState: async () => liveState(),
      audit,
      clock: () => now
    });
    const prepared = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    now = "2026-09-18T14:16:00.000Z";
    const reviewed = await binding.review({ classificationId: prepared.prepared.CLASSIFICATION_ID, reviewer: "publisher@example.test", decision: "ACCEPT" });
    assert.equal(reviewed.preparedExpired, true);
    assert.equal(reviewed.review.REVIEW_STATUS, "STALE");
    assert.equal(reviewed.review.FINAL_REVIEWED_CLASSIFICATION, null);
  });

  test("human correction preserves machine result and remains no-effect", async () => {
    const audit = memoryAudit();
    const binding = createCommercialEligibilityProductionBinding({ readState: async () => liveState(), audit, clock: () => "2026-09-18T14:05:00.000Z" });
    const prepared = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID });
    const reviewed = await binding.review({ classificationId: prepared.prepared.CLASSIFICATION_ID, reviewer: "publisher@example.test", decision: "CORRECT", correction: "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED", reason: "governed correction" });
    assert.equal(reviewed.review.AGENT_PREPARED, "AGREEMENT_COMPLETE_PAYMENT_ELECTION_REQUIRED");
    assert.equal(reviewed.review.HUMAN_CORRECTION, "COMMERCIAL_EXCEPTION_REVIEW_REQUIRED");
    assert.equal(reviewed.downstreamEffectAuthority, "NONE");
  });

  test("Dataverse projection is conservative and detects title conflicts", () => {
    const state = buildState({
      opportunity: { opportunityid: liveState().WORK_ID, jm1pub_projecttitle: "Expected Title", "@odata.etag": "W/1", jm1pub_contractstatus: "Signed", jm1_m6paymentoptionselectionstatus: "", jm1_m6selectedpaymentoption: "" },
      title: { jm1pub_titleid: liveState().TITLE_ID, jm1pub_titlename: "Different Title", "@odata.etag": "W/2" },
      logs: [{ jm1_executionlogid: "33333333-3333-4333-8333-333333333333", jm1_actiontype: "AGREEMENT_EXECUTED", createdon: "2026-09-18T13:00:00Z" }],
      observedAt: "2026-09-18T14:00:00Z"
    });
    assert.equal(state.AGREEMENT_STATE, "COMPLETE");
    assert.deepEqual(state.CONFLICTS, ["TITLE_OPPORTUNITY_NAME_MISMATCH"]);
  });

  test("gate fails closed", async () => {
    process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_A2_ENABLED = "false";
    const binding = createCommercialEligibilityProductionBinding({ readState: async () => liveState(), audit: memoryAudit() });
    await assert.rejects(binding.prepare({}), (error) => error.safeCode === "A2_BINDING_DISABLED");
  });

  test("effect denial is durably audited and idempotent", async () => {
    const audit = memoryAudit();
    const binding = createCommercialEligibilityProductionBinding({ readState: async () => liveState(), audit, clock: () => "2026-09-18T14:05:00.000Z" });
    const first = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID, requestedEffect: "STRIPE.INVOICE_CREATE" });
    const replay = await binding.prepare({ opportunityId: liveState().WORK_ID, titleId: liveState().TITLE_ID, requestedEffect: "STRIPE.INVOICE_CREATE" });
    assert.equal(first.effectDecision.DECISION, "DENIED_FINANCIAL_EFFECT_NOT_AUTHORIZED");
    assert.equal(replay.effectDecision.DECISION, "DENIED_FINANCIAL_EFFECT_NOT_AUTHORIZED");
    assert.equal(first.effectAuditReference, replay.effectAuditReference);
    const supervision = await binding.supervision();
    assert.equal(supervision.telemetry.POLICY_DENIALS, 1);
    assert.equal(supervision.telemetry.EFFECT_DENIALS, 1);
    assert.equal(supervision.classifications[0].UNAUTHORIZED_EFFECTS[0].REQUESTED_EFFECT, "STRIPE.INVOICE_CREATE");
  });
});
