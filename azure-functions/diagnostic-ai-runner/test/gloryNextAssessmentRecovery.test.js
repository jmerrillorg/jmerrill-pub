"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const c = require("../src/lifecycle/gloryReviewRecoveryCandidate");
const { HELD_ETAG } = require("../src/lifecycle/gloryNextAssessmentProposal");
const { runGloryNextAssessmentRecovery: run, VERSION } = require("../src/lifecycle/gloryNextAssessmentRecovery");
const readers = require("../src/lifecycle/gloryReviewRecoveryReaders");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
function fixture() {
  const state = { schemaVersion: 1, executionId: c.EXECUTION_ID, titleId: c.TITLE_ID, bindingHash: c.BINDING_HASH,
    status: "HELD", attempts: 6, causeCode: "REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH",
    additionalRecovery: { version: "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1", approvalRecordId: "consumed",
      previousState: { attempts: 5, executionId: c.EXECUTION_ID } } };
  const current = { release: "a".repeat(40), sourceSha256: c.SOURCE_HASH, canonSha256: c.CANON_HASH,
    jackieAuthorshipVerified: true, scopeEnabled: true, verifiedAt: "2026-10-09T20:00:00Z",
    requestSha256: readers.sha(JSON.stringify(provider.buildRequestBody("synthetic", readers.route))), tariffSha256: "b".repeat(64) };
  const approval = { status: "APPROVED", recordId: "new-fixture", executionId: c.EXECUTION_ID, proposedAttempt: 7,
    expectedEtag: HELD_ETAG, preimageSha256: c.digest(state), recoveryRelease: current.release,
    requestSha256: current.requestSha256, tariffSha256: current.tariffSha256, limits: c.LIMITS, maxCostUsd: 0.33192,
    expiresAt: "2026-10-09T21:00:00Z", decisionEvidenceReference: "fixture-only", decisionEvidenceSha256: "c".repeat(64) };
  const input = { state, etag: HELD_ETAG, current, approval }, saved = []; let calls = 0;
  const deps = { env: { JM1_GLORY_NEXT_ASSESSMENT_ENABLED: "true", JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false",
    JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    now: () => new Date("2026-10-09T20:00:01Z"), verifyApproval: async () => true,
    verifyCurrentAuthority: async () => true, verifyProviderBudget: async () => true,
    blob: { uploadData: async (bytes, options) => { assert.equal(options.conditions.ifMatch, saved.length ? "claim" : HELD_ETAG);
      saved.push(JSON.parse(bytes)); return { etag: "claim" }; } },
    executeReview: async (_input, owner) => owner.callModel({ promptBody: "synthetic", allowFallback: false,
      diagnosticId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, ""), modelDeploymentAlias: "jm1-editorial-devline-primary",
      promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" }),
    callModel: async () => { calls++; throw Error("synthetic timeout"); } };
  return { input, deps, saved, calls: () => calls };
}
test("next adapter defaults off, rejects stale authority, authorship, source and reused decision without writes", async () => {
  for (const change of [x => delete x.deps.env.JM1_GLORY_NEXT_ASSESSMENT_ENABLED,
    x => x.input.state.attempts = 5, x => x.input.etag = "stale", x => x.input.current.jackieAuthorshipVerified = false,
    x => x.input.current.sourceSha256 = "wrong", x => x.input.current.release = "b".repeat(40),
    x => x.input.approval.recordId = "consumed", x => x.input.approval.maxCostUsd = 1,
    x => x.input.current.verifiedAt = "2026-10-09T19:00:00Z", x => x.input.approval.requestSha256 = "d".repeat(64),
    x => x.deps.verifyApproval = async () => false, x => x.deps.verifyProviderBudget = async () => false]) {
    const x = fixture(); change(x); await assert.rejects(run(x.input, x.deps));
    assert.equal(x.saved.length, 0); assert.equal(x.calls(), 0);
  }
});
test("exact new decision claims attempt7 once, preserves consumed preimage and holds timeout without automatic retry", async () => {
  const x = fixture(), previous = structuredClone(x.input.state), result = await run(x.input, x.deps);
  assert.equal(result.status, "HELD"); assert.equal(result.attempts, 7); assert.equal(result.automaticRetryAuthorized, false);
  assert.equal(x.calls(), 1); assert.equal(x.saved.length, 2); assert.equal(result.additionalRecovery.version, VERSION);
  assert.deepEqual(result.additionalRecovery.previousState, previous);
  await assert.rejects(run({ ...x.input, state: result, etag: "claim" }, x.deps)); assert.equal(x.calls(), 1);
});
test("competing claim cannot execute; revoked decision after claim holds without inference", async () => {
  const x = fixture(); x.deps.blob.uploadData = async () => { throw Object.assign(Error("conflict"), { statusCode: 412 }); };
  assert.equal((await run(x.input, x.deps)).status, "CLAIM_CONFLICT"); assert.equal(x.calls(), 0);
  const y = fixture(); let checks = 0; y.deps.verifyApproval = async () => ++checks === 1;
  assert.equal((await run(y.input, y.deps)).status, "HELD"); assert.equal(y.calls(), 0);
});
test("existing exact owner receipt completes without inference, while a cross-title receipt stays held", async () => {
  const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
  const report = {
    intakeSummary: Object.fromEntries(["title", "sourceVersion", "genre", "audience", "draftStage", "seriesPotential", "comparables", "authorIntent", "submissionCompleteness"].map(k => [k, "SYNTHETIC"]).concat([["wordCount", 4]])),
    imprintAlignment: { imprint: "SYNTHETIC", authority: "SUGGESTED_ONLY", rationale: "Advisory", publisherApprovalRequired: true },
    categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])), categoryNotes: Object.fromEntries(CATEGORIES.map(k => [k, "Synthetic"])),
    strengths: ["One", "Two", "Three"], risks: ["One", "Two", "Three"], integrityFlags: [],
    styleGuideDetermination: { primaryGuide: "Chicago", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
    recommendation: { pathway: "DEVELOPMENTAL", rationale: "Advisory", forwardChecklist: ["Publisher review"], resubmissionEligibility: "UNKNOWN" }
  };
  for (const titleId of [c.TITLE_ID, "wrong-title"]) {
    const x = fixture();
    x.deps.executeReview = async () => ({ reference: `commissioning-editorial-review/${c.TITLE_ID}/${c.BINDING_HASH}/${"d".repeat(64)}.json`,
      receipt: { status: "EDITORIAL_REVIEW_READY_FOR_PUBLISHER", productionStageChanged: false, authorDecisionInferred: false,
        binding: { titleId, stage: "EDITORIAL_REVIEW", source: { sha256: c.SOURCE_HASH },
          parentExecutionId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, "") }, report, reportSha256: c.digest(report) } });
    const result = await run(x.input, x.deps);
    assert.equal(result.status, titleId === c.TITLE_ID ? "COMPLETED" : "HELD");
    assert.equal(x.calls(), 0); assert.equal(result.productionStageChanged, false);
  }
});
