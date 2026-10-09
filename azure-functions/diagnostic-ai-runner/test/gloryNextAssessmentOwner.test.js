"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const c = require("../src/lifecycle/gloryReviewRecoveryCandidate"), r = require("../src/lifecycle/gloryReviewRecoveryReaders");
const { HELD_ETAG } = require("../src/lifecycle/gloryNextAssessmentProposal");
const { executeGloryNextAssessment: execute } = require("../src/lifecycle/gloryNextAssessmentOwner");
function fixture() {
  const state = { schemaVersion: 1, status: "HELD", attempts: 6, titleId: c.TITLE_ID, executionId: c.EXECUTION_ID,
    bindingHash: c.BINDING_HASH, causeCode: "REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH", additionalRecovery: {
      version: "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1", approvalRecordId: "consumed",
      previousState: { attempts: 5, executionId: c.EXECUTION_ID } } };
  const prepared = { run: { executionId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, ""), source: { sha256: c.SOURCE_HASH } },
    binding: { authority: [{ role: "EDITORIAL_REVIEW_CANON", sha256: c.CANON_HASH }] }, assembled: { prompt: "fixture" } };
  const tariff = { status: "APPROVED_CURRENT", currency: "USD", model: "claude-sonnet-5", modelVersion: "2", sku: "GlobalStandard",
    caching: "NONE", additionalCharges: "NONE", inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10,
    sourceReference: "SYNTHETIC", verifiedAt: "2026-10-09T20:00:00Z", expiresAt: "2026-10-10T20:00:00Z" };
  const requestSha256 = r.sha(JSON.stringify(require("../src/model/providers/microsoftFoundryClaudeProvider").buildRequestBody("fixture", r.route)));
  const id = "00000000-0000-4000-8000-000000000001", decisionId = "00000000-0000-4000-8000-000000000002";
  const approval = { recordId: id, status: "APPROVED", purpose: "ONE_ADDITIONAL_GLORY_INTERNAL_ASSESSMENT",
    approvedByContactId: require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
    approvedAt: "2026-10-09T20:00:00Z", expiresAt: "2026-10-09T21:00:00Z", recoveryRelease: "a".repeat(40),
    executionId: c.EXECUTION_ID, proposedAttempt: 7, expectedEtag: HELD_ETAG, preimageSha256: c.digest(state),
    sourceSha256: c.SOURCE_HASH, canonSha256: c.CANON_HASH, requestSha256, tariffSha256: r.sha(JSON.stringify(tariff)),
    limits: c.LIMITS, maxCostUsd: 0.33192, decisionEvidenceReference: `commissioning-recovery-decisions/${c.TITLE_ID}/${decisionId}.json` };
  const decision = { ...approval, decisionType: "APPROVE_ONE_ADDITIONAL_INTERNAL_ASSESSMENT",
    actorContactId: approval.approvedByContactId, decidedAt: approval.approvedAt, originalHumanEvidenceReference: "SYNTHETIC_ONLY" };
  approval.decisionEvidenceSha256 = r.sha(JSON.stringify(decision));
  const records = new Map([
    [`commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`, { value: state, etag: HELD_ETAG }],
    [`commissioning-recovery-tariffs/${c.TITLE_ID}.json`, { value: tariff, etag: "tariff" }],
    [`commissioning-recovery-approvals/${c.TITLE_ID}/${id}.json`, { value: approval, etag: "approval" }],
    [approval.decisionEvidenceReference, { value: decision, etag: "decision" }]
  ]); let writes = 0, calls = 0;
  const deps = { env: { JM1_RELEASE_SHA: approval.recoveryRelease, JM1_GLORY_NEXT_ASSESSMENT_ENABLED: "true",
    JM1_GLORY_NEXT_APPROVAL_ID: id, JM1_GLORY_NEXT_APPROVAL_SHA256: r.sha(JSON.stringify(approval)),
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false" },
    now: () => new Date("2026-10-09T20:00:01Z"), prepareReview: async () => prepared, readDeployment: async () => ({}),
    countRequest: async () => ({ inputTokens: 100, requestSha256, verifiedAt: "2026-10-09T20:00:01Z" }),
    executeReview: async (_input, owner) => owner.callModel({ promptBody: "fixture", allowFallback: false,
      diagnosticId: prepared.run.executionId, modelDeploymentAlias: "jm1-editorial-devline-primary", promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" }),
    callModel: async () => { calls++; throw Error("fixture timeout"); }, containerClient: {
      getProperties: async () => ({}), getBlockBlobClient: path => ({
        getProperties: async () => ({ etag: records.get(path).etag, contentLength: 2048 }),
        downloadToBuffer: async () => Buffer.from(JSON.stringify(records.get(path).value)),
        uploadData: async (bytes, options) => { const record = records.get(path);
          if (record.etag !== options.conditions.ifMatch) throw Object.assign(Error("CAS"), { statusCode: 412 });
          record.value = JSON.parse(bytes); record.etag = `write-${++writes}`; return { etag: record.etag }; }
      }) } };
  return { deps, approval, decision, state, calls: () => calls, writes: () => writes };
}
test("native owner binds exact new decision, tariff, held state and one attempt; timeout stays held", async () => {
  const x = fixture(), result = await execute(x.deps);
  assert.equal(result.status, "HELD"); assert.equal(result.attempts, 7); assert.equal(x.calls(), 1); assert.equal(x.writes(), 2);
  await assert.rejects(execute(x.deps)); assert.equal(x.calls(), 1);
});
test("default off, missing pins and unbound decision evidence cannot claim or infer", async () => {
  for (const mutate of [x => delete x.deps.env.JM1_GLORY_NEXT_ASSESSMENT_ENABLED,
    x => delete x.deps.env.JM1_GLORY_NEXT_APPROVAL_SHA256, x => x.decision.proposedAttempt = 6,
    x => x.approval.approvedByContactId = "unknown", x => x.approval.sourceSha256 = "wrong"]) {
    const x = fixture(); mutate(x); await assert.rejects(execute(x.deps)); assert.equal(x.calls(), 0); assert.equal(x.writes(), 0);
  }
});
