"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { authorizeCapability, IDENTITY, OBJECTIVE } = require("../src/agent/publishingAgentPolicy");
const { createPublishingReadOnlyOrchestrator } = require("../src/agent/publishingReadOnlyOrchestrator");

function candidate(overrides = {}) {
  return {
    WORK_ID: "WORK-FIXTURE-001",
    TITLE: "TITLE-FIXTURE-001",
    CURRENT_STATE: "EDITORIAL_ACTIVE",
    CURRENT_WAIT_STATE: null,
    NEXT_CERTIFIED_WORK_CLASS: "EDITORIAL_QA_REVIEW",
    BLOCKER: null,
    HUMAN_AUTHORITY_REQUIRED: null,
    WHY_SELECTED: "Oldest due certified internal work candidate.",
    ...overrides
  };
}

function harness({ observation = {}, discovery = {}, inspectError, discoveryError } = {}) {
  const traces = [];
  let tick = 0;
  const clock = () => `2026-09-18T12:00:${String(tick++).padStart(2, "0")}.000Z`;
  const orchestrator = createPublishingReadOnlyOrchestrator({
    inspectTitleState: async () => {
      if (inspectError) throw Object.assign(new Error("inspection unavailable"), { code: inspectError });
      return { AUTHORITATIVE_STATE_VERSION: "state-v1", RESULT_CLASS: "OBSERVATION", ...observation };
    },
    discoverNextWork: async () => {
      if (discoveryError) throw Object.assign(new Error("discovery unavailable"), { code: discoveryError });
      return {
        AUTHORITATIVE_STATE_VERSION: "state-v1",
        STATUS: "RECOMMENDATION_READY",
        WORK_CANDIDATES: [candidate()],
        RECOMMENDATION: candidate(),
        RESULT_CLASS: "DISCOVERY",
        ...discovery
      };
    },
    auditSink: async (trace) => traces.push(trace),
    clock,
    runIdFactory: () => "agent-run-fixture-001"
  });
  return { orchestrator, traces };
}

const request = { objective: OBJECTIVE, identity: IDENTITY, inputReference: "PORTFOLIO-FIXTURE" };

describe("Publishing read-only orchestrator", () => {
  test("selects only the two allowlisted tools and returns a candidate", async () => {
    const { orchestrator, traces } = harness();
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "RECOMMENDATION_READY");
    assert.equal(result.RECOMMENDATION.WORK_ID, "WORK-FIXTURE-001");
    assert.deepEqual(result.TRACE.CAPABILITY_IDS, ["PUBLISHING.INSPECT_TITLE_STATE", "PUBLISHING.DISCOVER_NEXT_WORK"]);
    assert.equal(result.TRACE.BUSINESS_EFFECTS, 0);
    assert.equal(traces.length, 1);
  });

  test("returns WAIT without manufacturing work", async () => {
    const wait = candidate({ CURRENT_WAIT_STATE: "WAITING_ON_AUTHOR", NEXT_CERTIFIED_WORK_CLASS: null, BLOCKER: "AUTHOR_ACTION_REQUIRED" });
    const { orchestrator } = harness({ discovery: { STATUS: "WAIT", WORK_CANDIDATES: [wait], RECOMMENDATION: wait, ESCALATION: "AUTHOR_ACTION_REQUIRED" } });
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "WAIT");
    assert.equal(result.ESCALATION, "AUTHOR_ACTION_REQUIRED");
  });

  test("preserves Founder decision authority", async () => {
    const item = candidate({ NEXT_CERTIFIED_WORK_CLASS: null, BLOCKER: "HUMAN_DECISION_REQUIRED", HUMAN_AUTHORITY_REQUIRED: "FOUNDER" });
    const { orchestrator } = harness({ discovery: { STATUS: "FOUNDER_DECISION_REQUIRED", WORK_CANDIDATES: [item], RECOMMENDATION: null, ESCALATION: "FOUNDER_DECISION_REQUIRED" } });
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "FOUNDER_DECISION_REQUIRED");
    assert.equal(result.RECOMMENDATION, null);
  });

  test("preserves external provider blocks", async () => {
    const item = candidate({ CURRENT_WAIT_STATE: "WAITING_ON_PROVIDER", NEXT_CERTIFIED_WORK_CLASS: null, BLOCKER: "EXTERNAL_PROVIDER_BLOCKED" });
    const { orchestrator } = harness({ discovery: { STATUS: "WAIT", WORK_CANDIDATES: [item], RECOMMENDATION: item, ESCALATION: "EXTERNAL_PROVIDER_BLOCKED" } });
    const result = await orchestrator.run(request);
    assert.equal(result.ESCALATION, "EXTERNAL_PROVIDER_BLOCKED");
  });

  test("returns no eligible work as a successful no-action result", async () => {
    const { orchestrator } = harness({ discovery: { STATUS: "NO_ELIGIBLE_WORK", WORK_CANDIDATES: [], RECOMMENDATION: null } });
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "NO_ELIGIBLE_WORK");
    assert.equal(result.RECOMMENDATION, null);
  });

  test("fails closed on stale state", async () => {
    const { orchestrator } = harness({ discovery: { AUTHORITATIVE_STATE_VERSION: "state-v2" } });
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "STALE_STATE");
    assert.equal(result.ESCALATION, "RE_READ_AUTHORITATIVE_STATE");
  });

  test("returns ambiguous input rather than guessing", async () => {
    const { orchestrator } = harness();
    const result = await orchestrator.run({ ...request, inputReference: "" });
    assert.equal(result.STATUS, "AMBIGUOUS_INPUT");
    assert.equal(result.RECOMMENDATION, null);
  });

  test("classifies tool failure and preserves no-effect behavior", async () => {
    const { orchestrator } = harness({ discoveryError: "TOOL_FAILURE" });
    const result = await orchestrator.run(request);
    assert.equal(result.STATUS, "TOOL_FAILURE");
    assert.equal(result.TRACE.BUSINESS_EFFECTS, 0);
  });

  test("returns a stable recommendation for duplicate unchanged runs", async () => {
    const { orchestrator } = harness();
    const first = await orchestrator.run(request);
    const second = await orchestrator.run(request);
    assert.deepEqual(first.RECOMMENDATION, second.RECOMMENDATION);
    assert.equal(first.TRACE.BUSINESS_EFFECTS + second.TRACE.BUSINESS_EFFECTS, 0);
  });

  test("denies effect, unknown, raw-system, and wrong-identity requests", () => {
    assert.throws(() => authorizeCapability({ capabilityId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED", identity: IDENTITY, objective: OBJECTIVE }), { code: "EFFECT_CAPABILITY_NOT_AUTHORIZED" });
    assert.throws(() => authorizeCapability({ capabilityId: "UNKNOWN.TOOL", identity: IDENTITY, objective: OBJECTIVE }), { code: "DENIED_UNREGISTERED_CAPABILITY" });
    assert.throws(() => authorizeCapability({ capabilityId: "PUBLISHING.UNKNOWN_TOOL", identity: IDENTITY, objective: OBJECTIVE }), { code: "DENIED_UNREGISTERED_CAPABILITY" });
    assert.throws(() => authorizeCapability({ capabilityId: "DATAVERSE.RAW_QUERY", identity: IDENTITY, objective: OBJECTIVE }), { code: "POLICY_DENIED" });
    assert.throws(() => authorizeCapability({ capabilityId: "PUBLISHING.INSPECT_TITLE_STATE", identity: "jm1-admin", objective: OBJECTIVE }), { code: "AUTHORITY_MISMATCH" });
  });
});
