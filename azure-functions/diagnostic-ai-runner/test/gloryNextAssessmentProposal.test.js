"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const c = require("../src/lifecycle/gloryReviewRecoveryCandidate");
const readers = require("../src/lifecycle/gloryReviewRecoveryReaders");
const proposal = require("../src/lifecycle/gloryNextAssessmentProposal");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
function fixture() {
  const state = { status: "HELD", attempts: 6, causeCode: "REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH",
    titleId: c.TITLE_ID, executionId: c.EXECUTION_ID, bindingHash: c.BINDING_HASH,
    additionalRecovery: { version: "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1", approvalRecordId: "consumed-fixture-only",
      previousState: { attempts: 5, executionId: c.EXECUTION_ID } } };
  const tariff = { status: "APPROVED_CURRENT", currency: "USD", model: "claude-sonnet-5", modelVersion: "2",
    sku: "GlobalStandard", caching: "NONE", additionalCharges: "NONE", sourceReference: "SYNTHETIC_ONLY",
    inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10, verifiedAt: "2026-10-09T18:00:00Z", expiresAt: "2026-10-10T18:00:00Z" };
  const prepared = { run: { executionId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, ""), source: { sha256: c.SOURCE_HASH } },
    binding: { authority: [{ role: "EDITORIAL_REVIEW_CANON", sha256: c.CANON_HASH }] }, assembled: { prompt: "synthetic" } };
  let counts = 0;
  const deps = { env: { JM1_RELEASE_SHA: "b".repeat(40), JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false",
    JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    now: () => new Date("2026-10-09T18:01:00Z"), readDeployment: async () => ({ model: "fixture" }), prepareReview: async () => prepared,
    countRequest: async prompt => { counts++; return { inputTokens: 114646, verifiedAt: "2026-10-09T18:01:00Z",
      requestSha256: readers.sha(JSON.stringify(provider.buildRequestBody(prompt, readers.route))) }; },
    containerClient: { getProperties: async () => ({}), getBlockBlobClient: path => ({
      getProperties: async () => ({ etag: path.includes("tariffs") ? "tariff" : proposal.HELD_ETAG, contentLength: 2048 }),
      downloadToBuffer: async () => Buffer.from(JSON.stringify(path.includes("tariffs") ? tariff : state)),
      uploadData: async () => { throw Error("NO_WRITES_PERMITTED"); }
    }) }, callModel: async () => { throw Error("NO_INFERENCE_PERMITTED"); } };
  return { deps, state, tariff, prepared, counts: () => counts };
}
test("prospective proposal binds held6 and fresh exact request/cost without reusing approval or dispatching", async () => {
  const x = fixture(), before = structuredClone(x.state);
  const result = await proposal.prepareGloryNextAssessmentProposal(x.deps);
  assert.equal(result.status, "DECISION_REQUIRED_NOT_EXECUTABLE"); assert.equal(result.proposedAttempt, 7);
  assert.equal(result.modelInvocationAttempts, 0); assert.equal(result.authorityWrites, 0);
  assert.equal(result.planningCeilingUsd, 0.33192); assert.equal(x.counts(), 1); assert.deepEqual(x.state, before);
  assert.deepEqual(await proposal.prepareGloryNextAssessmentProposal(x.deps), result);
});
test("stale held state, source, consumed history or scope rejects before provider count", async () => {
  for (const change of [x => x.state.attempts = 5, x => x.state.titleId = "other", x => x.state.receiptReference = "existing",
    x => delete x.state.additionalRecovery, x => x.prepared.run.source.sha256 = "a".repeat(64),
    x => x.deps.env.JM1_TITLE_COMMISSIONING_REVIEW_ENABLED = "true"]) {
    const x = fixture(); change(x); await assert.rejects(proposal.prepareGloryNextAssessmentProposal(x.deps)); assert.equal(x.counts(), 0);
  }
});
test("stale tariff or changed exact request cannot produce a decision-ready cost claim", async () => {
  const x = fixture(); x.tariff.expiresAt = "2026-10-09T17:00:00Z";
  await assert.rejects(proposal.prepareGloryNextAssessmentProposal(x.deps), /BUDGET_UNVERIFIED/);
  const y = fixture(); y.deps.countRequest = async () => ({ inputTokens: 1, verifiedAt: "2026-10-09T18:01:00Z", requestSha256: "a".repeat(64) });
  await assert.rejects(proposal.prepareGloryNextAssessmentProposal(y.deps), /REQUEST_DRIFT/);
});

test("authenticated proposal needs no execution flags and leaves the consumed claim untouched", async () => {
  const x = fixture(), before = structuredClone(x.state);
  x.deps.env.JM1_DIAGNOSTIC_RUNNER_KEY = "fixture-only";
  const result = await require("../src/lifecycle/gloryReviewRecoveryRuntime").gloryRecoveryHandler({
    headers: new Headers({ "x-jm1-diagnostic-runner-key": "fixture-only" }),
    json: async () => ({ mode: "PREPARE_NEXT_ASSESSMENT" })
  }, x.deps);
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.status, "DECISION_REQUIRED_NOT_EXECUTABLE");
  assert.deepEqual(x.state, before);
});

test("unauthorized caller and caller-supplied approval fail before provider counting", async () => {
  const x = fixture(); x.deps.env.JM1_DIAGNOSTIC_RUNNER_KEY = "fixture-only";
  const handler = require("../src/lifecycle/gloryReviewRecoveryRuntime").gloryRecoveryHandler;
  const request = (key, body) => ({ headers: new Headers({ "x-jm1-diagnostic-runner-key": key }), json: async () => body });
  assert.equal((await handler(request("wrong", { mode: "PREPARE_NEXT_ASSESSMENT" }), x.deps)).status, 401);
  assert.equal((await handler(request("fixture-only", { mode: "PREPARE_NEXT_ASSESSMENT", approval: true }), x.deps)).status, 400);
  assert.equal(x.counts(), 0);
});
