"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { authorizeRoute, evaluateStructure, processStage0Event } = require("../../src/shadow/stage0ShadowRuntime");

const event = {
  sourceEventId: "00000000-0000-4000-8000-000000000001",
  entity: "J_MERRILL_PUBLISHING",
  workload: "STAGE_0_DIAGNOSTIC_SHADOW",
  manuscriptApprovedForDiagnostic: true,
  currentOutcome: 835500002,
};
const route = {
  status: "ACTIVE",
  id: "STAGE_0_DIAGNOSTIC_SHADOW_ONLY",
  entity: "J_MERRILL_PUBLISHING",
  workload: "STAGE_0_DIAGNOSTIC_SHADOW",
  mode: "SHADOW_ONLY",
  actionAuthority: "READ_ONLY",
  businessWriteAuthority: "NONE",
  authorMessageAuthority: "NONE",
  financialAuthority: "NONE",
  identityClientId: "isolated-identity",
  evaluationRequired: true,
  executionLogRequired: true,
  costGovernanceRequired: true,
  policyVersion: "v1",
  deploymentId: "exact-resource/deployment",
  expiresAt: "2099-01-01T00:00:00Z",
};

test("route denies any business authority and unknown identity", () => {
  assert.equal(authorizeRoute(event, route, "isolated-identity").routeId, route.id);
  assert.throws(() => authorizeRoute(event, { ...route, businessWriteAuthority: "TITLE_UPDATE" }, "isolated-identity"));
  assert.throws(() => authorizeRoute(event, route, "another-identity"));
  assert.throws(() => authorizeRoute(event, { ...route, status: "NOT_COMMISSIONED" }, "isolated-identity"));
  assert.throws(() => authorizeRoute(event, { ...route, expiresAt: "invalid" }, "isolated-identity"));
});

test("evaluation does not mistake structural agreement for groundedness", () => {
  const evaluation = evaluateStructure(835500002, {
    jm1_diagnosticoutputsummary: "Synthetic summary",
    jm1_diagnosticriskflags: "none",
    jm1_confidence: 0.9,
    jm1_requireshumanreview: true,
  });
  assert.equal(evaluation.outcomeAgreement, true);
  assert.equal(evaluation.groundedness, "NOT_PROVEN");
  assert.equal(evaluation.authorityReady, false);
});

test("denied budget never reads material or calls model", async () => {
  let reads = 0;
  let calls = 0;
  const result = await processStage0Event(event, route, {
    identityClientId: "isolated-identity",
    now: () => "2026-09-24T12:00:00Z",
    projectMaximumCost: async () => 11,
    ledger: { reserve: async () => ({ outcome: "BUDGET_DENIED" }) },
    readApprovedInput: async () => { reads++; },
    infer: async () => { calls++; },
    alert: async () => {},
  });
  assert.equal(result.status, "BUDGET_DENIED");
  assert.equal(reads, 0);
  assert.equal(calls, 0);
});

test("invalid output is recorded as evaluation failure, never shadow success", async () => {
  const evidence = [];
  const finalizations = [];
  const metrics = [];
  const alerts = [];
  const result = await processStage0Event(event, route, {
    identityClientId: "isolated-identity",
    now: () => "2026-09-24T12:00:00Z",
    projectMaximumCost: async () => 11,
    ledger: {
      reserve: async () => ({ outcome: "RESERVED", event: { recordedAt: "2026-09-24T12:00:00Z" } }),
      recordEvidence: async (...args) => evidence.push(args),
      finalize: async (args) => finalizations.push(args),
    },
    readApprovedInput: async () => ({ synthetic: true }),
    infer: async () => ({ output: {}, tokenCounts: { input: 10, output: 4 } }),
    actualCostCents: () => 2,
    metric: (name) => metrics.push(name),
    alert: async (name) => alerts.push(name),
  });
  assert.equal(result.status, "EVALUATION_FAILED");
  assert.equal(evidence[0][2].status, "EVALUATION_FAILED");
  assert.equal(finalizations[0].status, "EVALUATION_FAILED");
  assert.deepEqual(metrics, ["stage0_shadow_eval_fail"]);
  assert.deepEqual(alerts, ["stage0_shadow_eval_fail"]);
});

test("independent evaluator failure prevents a valid structure from succeeding", async () => {
  const evidence = [];
  const result = await processStage0Event(event, route, {
    identityClientId: "isolated-identity",
    now: () => "2026-09-24T12:00:00Z",
    projectMaximumCost: async () => 11,
    ledger: {
      reserve: async () => ({ outcome: "RESERVED", event: { recordedAt: "2026-09-24T12:00:00Z" } }),
      recordEvidence: async (...args) => evidence.push(args),
      finalize: async () => {},
    },
    readApprovedInput: async () => ({ synthetic: true }),
    infer: async () => ({
      output: { jm1_diagnosticoutputsummary: "Synthetic summary", jm1_diagnosticriskflags: "none",
        jm1_confidence: 0.9, jm1_requireshumanreview: true },
      tokenCounts: { input: 10, output: 4 },
    }),
    evaluate: async () => ({ pass: false, evaluatorId: "deterministic-v1",
      policyVersion: "v1", method: "RULES", failureClass: "UNSUPPORTED_CLAIM" }),
    actualCostCents: () => 2,
    metric: () => {},
    alert: async () => {},
  });
  assert.equal(result.status, "EVALUATION_FAILED");
  assert.equal(evidence[0][2].evaluation.independent.pass, false);
  assert.equal(evidence[0][2].status, "EVALUATION_FAILED");
});

test("missing independent evaluator keeps the reservation and fails closed", async () => {
  let finalized = false;
  const result = await processStage0Event(event, route, {
    identityClientId: "isolated-identity",
    now: () => "2026-09-24T12:00:00Z",
    projectMaximumCost: async () => 11,
    ledger: {
      reserve: async () => ({ outcome: "RESERVED", event: { recordedAt: "2026-09-24T12:00:00Z" } }),
      recordEvidence: async () => {},
      finalize: async () => { finalized = true; },
    },
    readApprovedInput: async () => ({ synthetic: true }),
    infer: async () => ({
      output: { jm1_diagnosticoutputsummary: "Synthetic summary", jm1_diagnosticriskflags: "none",
        jm1_confidence: 0.9, jm1_requireshumanreview: true },
      tokenCounts: { input: 10, output: 4 },
    }),
    actualCostCents: () => 2,
    metric: () => {},
    alert: async () => {},
  });
  assert.equal(result.status, "FAILED_RESERVED");
  assert.equal(finalized, false);
});
