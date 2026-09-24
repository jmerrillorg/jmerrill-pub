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
