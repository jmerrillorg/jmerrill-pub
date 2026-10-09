"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const c = require("../src/lifecycle/gloryReviewRecoveryCandidate");
function fixture() {
  const state = { status: "HELD", attempts: 5, causeCode: "REVIEW_CATEGORY_NOTES_INVALID",
    executionId: c.EXECUTION_ID, titleId: c.TITLE_ID, bindingHash: c.BINDING_HASH,
    quarantineReference: `commissioning-review-quarantine/${c.TITLE_ID}/${c.BINDING_HASH}/${c.CANDIDATE_HASH}.json` };
  const current = { release: c.RELEASE, strictProducerRelease: c.RELEASE, sourceSha256: c.SOURCE_HASH, canonSha256: c.CANON_HASH,
    strictTool: true, jackieAuthorshipVerified: true, scopeEnabled: true };
  const approval = { recordId: "synthetic-only", executionId: c.EXECUTION_ID, preimageSha256: c.digest(state),
    expectedEtag: c.HELD_ETAG, release: c.RELEASE, recoveryRelease: c.RELEASE, limits: c.LIMITS, maxCostUsd: 1,
    expiresAt: "2026-10-10T00:00:00Z" };
  return { state, current, approval, etag: c.HELD_ETAG };
}
const now = () => new Date("2026-10-09T14:00:00Z");
test("candidate makes one CAS claim preserving the exact attempt-five preimage", async () => {
  const input = fixture(); let writes = 0;
  const result = await c.claimGloryRecovery(input, { now, verifyApproval: async () => true,
    blob: { uploadData: async (bytes, options) => { writes++; assert.equal(options.conditions.ifMatch, c.HELD_ETAG);
      const claimed = JSON.parse(bytes); assert.equal(claimed.attempts, 6);
      assert.deepEqual(claimed.additionalRecovery.previousState, input.state); return { etag: "new" }; } } });
  assert.equal(writes, 1); assert.equal(result.status, "CLAIMED");
  await assert.rejects(c.claimGloryRecovery({ ...input, state: result.state }, {
    now, verifyApproval: async () => true, blob: { uploadData: async () => assert.fail("duplicate write") }
  }), /AUTHORITY_NOT_CURRENT/);
  assert.equal(c.holdAmbiguousRecovery(result.state).modelCallAuthorized, false);
});
test("missing approval, drift, stale preimage, expiry and increased budget cannot claim", async () => {
  for (const mutate of [x => { x.approval = null; }, x => { x.etag = "stale"; },
    x => { x.current.release = "other"; }, x => { x.current.sourceSha256 = "other"; },
    x => { x.current.canonSha256 = "other"; }, x => { x.current.jackieAuthorshipVerified = false; },
    x => { x.approval.preimageSha256 = "other"; }, x => { x.approval.expiresAt = "2026-01-01"; },
    x => { x.approval.limits = { ...c.LIMITS, additionalAttempts: 2 }; }]) {
    const input = fixture(); mutate(input);
    await assert.rejects(c.claimGloryRecovery(input, { now, verifyApproval: async () => true,
      blob: { uploadData: async () => assert.fail("unauthorized write") } }), /AUTHORITY_NOT_CURRENT/);
  }
});
test("independent approval denial and competing claim cannot authorize a model call", async () => {
  await assert.rejects(c.claimGloryRecovery(fixture(), { now, verifyApproval: async () => false,
    blob: { uploadData: async () => assert.fail("denied write") } }), /AUTHORITY_NOT_CURRENT/);
  const result = await c.claimGloryRecovery(fixture(), { now, verifyApproval: async () => true,
    blob: { uploadData: async () => { throw Object.assign(new Error("CAS"), { statusCode: 412 }); } } });
  assert.equal(result.status, "CLAIM_CONFLICT"); assert.equal(result.modelCallAuthorized, false);
});
test("one model invocation then timeout is held; the same claimed run cannot invoke again", async () => {
  let version = c.HELD_ETAG; let calls = 0; let saved;
  const deps = { now, verifyApproval: async () => true, verifyCurrentAuthority: async () => true,
    verifyProviderBudget: async () => true,
    blob: { uploadData: async (bytes, options) => {
      if (options.conditions.ifMatch !== version) throw Object.assign(new Error("CAS"), { statusCode: 412 });
      saved = JSON.parse(bytes); version = "new"; return { etag: version };
    } }, callModel: async () => { calls++; throw new Error("private response and timeout"); },
    executeReview: async (_input, owner) => owner.callModel({ allowFallback: false,
      diagnosticId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, ""),
      modelDeploymentAlias: "jm1-editorial-devline-primary", promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" }) };
  const result = await c.runGloryRecovery(fixture(), deps);
  assert.equal(result.status, "HELD"); assert.equal(result.attempts, 6); assert.equal(calls, 1);
  assert.equal(JSON.stringify(saved).includes("private response"), false);
  await assert.rejects(c.runGloryRecovery({ ...fixture(), state: saved, etag: version }, deps), /AUTHORITY_NOT_CURRENT/);
  assert.equal(calls, 1);
});
test("unverified provider budget prevents even a claim", async () => {
  await assert.rejects(c.runGloryRecovery(fixture(), { now, verifyCurrentAuthority: async () => true,
    verifyProviderBudget: async () => false, callModel: async () => assert.fail("call"),
    executeReview: async () => assert.fail("owner"), blob: { uploadData: async () => assert.fail("claim") }
  }), /AUTHORITY_NOT_CURRENT/);
});
test("validated owner receipt completes internally without approving or advancing the title", async () => {
  const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
  const report = {
    intakeSummary: Object.fromEntries(["title", "sourceVersion", "genre", "audience", "draftStage", "seriesPotential", "comparables", "authorIntent", "submissionCompleteness"].map(k => [k, "SYNTHETIC"]).concat([["wordCount", 1200]])),
    imprintAlignment: { imprint: "SYNTHETIC", authority: "SUGGESTED_ONLY", rationale: "Advisory", publisherApprovalRequired: true },
    categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])), categoryNotes: Object.fromEntries(CATEGORIES.map(k => [k, "Synthetic observation"])),
    strengths: ["One", "Two", "Three"], risks: ["One", "Two", "Three"], integrityFlags: [],
    styleGuideDetermination: { primaryGuide: "Chicago", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
    recommendation: { pathway: "DEVELOPMENTAL", rationale: "Advisory", forwardChecklist: ["Publisher review"], resubmissionEligibility: "UNKNOWN" }
  };
  let writes = 0;
  const result = await c.runGloryRecovery(fixture(), { now, verifyApproval: async () => true,
    verifyCurrentAuthority: async () => true, verifyProviderBudget: async () => true,
    callModel: async () => assert.fail("existing receipt needs no model call"),
    blob: { uploadData: async () => { writes++; return { etag: "next" }; } },
    executeReview: async () => ({ reference: `commissioning-editorial-review/${c.TITLE_ID}/${c.BINDING_HASH}/fixture.json`,
      receipt: { status: "EDITORIAL_REVIEW_READY_FOR_PUBLISHER", productionStageChanged: false,
        binding: { titleId: c.TITLE_ID, stage: "EDITORIAL_REVIEW", parentExecutionId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, "") },
        report, reportSha256: c.digest(report) } }) });
  assert.equal(result.status, "COMPLETED"); assert.equal(result.productionStageChanged, false);
  assert.equal(result.attempts, 6); assert.equal(writes, 2);
});
