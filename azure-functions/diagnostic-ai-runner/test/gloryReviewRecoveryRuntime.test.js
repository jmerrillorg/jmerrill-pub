"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const c = require("../src/lifecycle/gloryReviewRecoveryCandidate");
const r = require("../src/lifecycle/gloryReviewRecoveryReaders");
const { gloryRecovery, gloryRecoveryHandler } = require("../src/lifecycle/gloryReviewRecoveryRuntime");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
const founder = require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
const now = () => new Date("2026-10-09T15:00:00Z");

function fixture() {
  const rows = new Map(); let writes = 0; let calls = 0; let countCalls = 0;
  const id = "00000000-0000-4000-8000-000000000001";
  const state = { schemaVersion: 1, titleId: c.TITLE_ID, bindingHash: c.BINDING_HASH,
    executionId: c.EXECUTION_ID, status: "HELD", attempts: 5, causeCode: "REVIEW_CATEGORY_NOTES_INVALID",
    quarantineReference: `commissioning-review-quarantine/${c.TITLE_ID}/${c.BINDING_HASH}/${c.CANDIDATE_HASH}.json` };
  const approval = { recordId: id, approvedByContactId: founder, status: "APPROVED",
    purpose: "ONE_ADDITIONAL_GLORY_INTERNAL_ASSESSMENT", decisionEvidenceReference: `commissioning-recovery-decisions/${c.TITLE_ID}/${id}.json`,
    decisionEvidenceSha256: "a".repeat(64), approvedAt: "2026-10-09T14:59:00Z", expiresAt: "2026-10-09T16:00:00Z",
    executionId: c.EXECUTION_ID, release: c.RELEASE, recoveryRelease: "b".repeat(40), expectedEtag: c.HELD_ETAG,
    preimageSha256: c.digest(state), limits: c.LIMITS, maxCostUsd: 1 };
  const tariff = { status: "APPROVED_CURRENT", currency: "USD", model: "claude-sonnet-5", modelVersion: "2",
    sku: "GlobalStandard", caching: "NONE", additionalCharges: "NONE", sourceReference: "SYNTHETIC_ONLY",
    inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10,
    verifiedAt: "2026-10-09T14:59:00Z", expiresAt: "2026-10-09T16:00:00Z" };
  const decision = { status: "APPROVED", decisionType: "APPROVE_ONE_ADDITIONAL_INTERNAL_ASSESSMENT",
    actorContactId: founder, decidedAt: approval.approvedAt, executionId: c.EXECUTION_ID,
    recoveryRelease: approval.recoveryRelease, maxCostUsd: approval.maxCostUsd, limits: c.LIMITS,
    originalHumanEvidenceReference: "SYNTHETIC_ONLY_NOT_REAL_APPROVAL" };
  approval.decisionEvidenceSha256 = r.sha(JSON.stringify(decision));
  const env = { JM1_RELEASE_SHA: "b".repeat(40), JM1_GLORY_RECOVERY_APPROVAL_ID: id,
    JM1_GLORY_RECOVERY_APPROVAL_SHA256: r.sha(JSON.stringify(approval)),
    JM1_GLORY_RECOVERY_TARIFF_SHA256: r.sha(JSON.stringify(tariff)),
    JM1_GLORY_RECOVERY_PREFLIGHT_ENABLED: "true", JM1_GLORY_RECOVERY_DISPATCH_ENABLED: "true" };
  Object.assign(env, { JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false",
    JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" });
  const approvalPath = `commissioning-recovery-approvals/${c.TITLE_ID}/${id}.json`;
  const executionPath = `commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`;
  const tariffPath = `commissioning-recovery-tariffs/${c.TITLE_ID}.json`;
  for (const [path, value, etag] of [[approvalPath, approval, "approval1"], [executionPath, state, c.HELD_ETAG], [tariffPath, tariff, "tariff1"]]) {
    rows.set(path, { bytes: Buffer.from(JSON.stringify(value)), etag });
  }
  rows.set(approval.decisionEvidenceReference, { bytes: Buffer.from(JSON.stringify(decision)), etag: "decision1" });
  const containerClient = { getProperties: async () => ({}), getBlockBlobClient: path => ({
    getProperties: async () => { const row = rows.get(path); if (!row) throw Object.assign(new Error("missing"), { statusCode: 404 });
      return { etag: row.etag, contentLength: row.bytes.length }; },
    downloadToBuffer: async (_start, _length, options) => {
      const row = rows.get(path); if (row.etag !== options.conditions.ifMatch) throw Object.assign(new Error("CAS"), { statusCode: 412 });
      return row.bytes;
    },
    uploadData: async (bytes, options) => {
      if (rows.get(path).etag !== options.conditions.ifMatch) throw Object.assign(new Error("CAS"), { statusCode: 412 });
      writes++; const etag = `written${writes}`; rows.set(path, { bytes, etag }); return { etag };
    }
  }) };
  const prepared = { run: { executionId: c.EXECUTION_ID.replace(/:editorial-review:v1$/, ""), source: { sha256: c.SOURCE_HASH } },
    binding: { authority: [{ role: "EDITORIAL_REVIEW_CANON", sha256: c.CANON_HASH }] }, assembled: { prompt: "synthetic fixture" } };
  const deps = { env, now, containerClient, readDeployment: async () => ({}), prepareReview: async () => prepared,
    countRequest: async prompt => { countCalls++; return { inputTokens: 114646,
      verifiedAt: now().toISOString(), requestSha256: r.sha(JSON.stringify(provider.buildRequestBody(prompt, r.route))) }; },
    callModel: async () => { calls++; throw Object.assign(new Error("synthetic timeout, private content"), { code: "ETIMEDOUT" }); },
    executeReview: async (_input, owner) => owner.callModel({ diagnosticId: prepared.run.executionId, promptBody: prepared.assembled.prompt,
      allowFallback: false, modelDeploymentAlias: "jm1-editorial-devline-primary", promptVersion: r.route.promptVersion }) };
  return { deps, env, rows, prepared, approval, tariff, state, approvalPath, executionPath, tariffPath,
    writes: () => writes, calls: () => calls, countCalls: () => countCalls,
    replace: (path, value) => { rows.set(path, { bytes: Buffer.from(JSON.stringify(value)), etag: "changed" }); } };
}

test("default disabled route performs no reads, writes or model requests", async () => {
  const x = fixture(); delete x.env.JM1_GLORY_RECOVERY_DISPATCH_ENABLED;
  const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
  assert.equal(result.status, 403); assert.equal(x.writes(), 0); assert.equal(x.countCalls(), 0); assert.equal(x.calls(), 0);
});
test("ordinary review or broad workers on cannot dispatch even with approval pins", async () => {
  for (const name of ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"]) {
    const x = fixture(); x.env[name] = "true";
    const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
    assert.equal(result.jsonBody.code, "REVIEW_RECOVERY_WORKER_ISOLATION_REQUIRED");
    assert.equal(x.countCalls(), 0); assert.equal(x.writes(), 0); assert.equal(x.calls(), 0);
  }
});
test("versioned preflight reads independent records and exact counted request, never claims", async () => {
  const x = fixture(); const result = await gloryRecovery({ mode: "PREFLIGHT" }, x.deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.budget.inputTokens, 114646);
  assert.equal(result.jsonBody.budget.inputTokenCeiling, 120379);
  assert.equal(x.countCalls(), 1); assert.equal(x.writes(), 0); assert.equal(x.calls(), 0);
});
test("a count completed after preparation starts is validated against the current clock", async () => {
  const x = fixture(); let elapsed = 0;
  x.deps.now = () => new Date(now().getTime() + elapsed);
  const original = x.deps.countRequest;
  x.deps.countRequest = async prompt => {
    const count = await original(prompt); elapsed = 2000;
    return { ...count, verifiedAt: x.deps.now().toISOString() };
  };
  const result = await gloryRecovery({ mode: "PREFLIGHT" }, x.deps);
  assert.equal(result.status, 200);
  assert.equal(x.writes(), 0); assert.equal(x.calls(), 0);
});
test("expired/wrong-execution/unpinned approval cannot claim", async () => {
  for (const mutate of [a => { a.expiresAt = "2026-10-09T14:00:00Z"; }, a => { a.executionId = "other"; }, a => { a.maxCostUsd = 2; }]) {
    const x = fixture(); mutate(x.approval); x.replace(x.approvalPath, x.approval);
    x.env.JM1_GLORY_RECOVERY_APPROVAL_SHA256 = r.sha(JSON.stringify(x.approval));
    await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps), /APPROVAL_DENIED/);
    assert.equal(x.writes(), 0); assert.equal(x.calls(), 0);
  }
  const x = fixture(); x.replace(x.approvalPath, { ...x.approval, maxCostUsd: 0.9 });
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps), /RECORD_INVALID/);
});
test("stale authority, changed preimage, unavailable tariff and token overflow fail before claim", async () => {
  const x = fixture(); x.prepared.run.source.sha256 = "c".repeat(64);
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps), /AUTHORITY_DRIFT/);
  const y = fixture(); y.replace(y.executionPath, { ...y.state, attempts: 6 });
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, y.deps), /PREIMAGE_CHANGED/);
  const z = fixture(); z.rows.delete(z.tariffPath);
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, z.deps));
  const w = fixture(); w.deps.countRequest = async prompt => ({ inputTokens: 125000, verifiedAt: now().toISOString(),
    requestSha256: r.sha(JSON.stringify(provider.buildRequestBody(prompt, r.route))) });
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, w.deps), /BUDGET_EXCEEDED/);
  for (const f of [x, y, z, w]) { assert.equal(f.writes(), 0); assert.equal(f.calls(), 0); }
});
test("one approved fixture dispatch preserves preimage; ambiguous model result holds and replay denies", async () => {
  const x = fixture(); const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
  assert.equal(result.jsonBody.status, "HELD"); assert.equal(result.jsonBody.attempts, 6);
  assert.equal(result.jsonBody.modelInvocationAttempts, 1); assert.equal(x.calls(), 1);
  const saved = JSON.parse(x.rows.get(x.executionPath).bytes);
  assert.deepEqual(saved.additionalRecovery.previousState, x.state);
  assert.equal(JSON.stringify(saved).includes("private content"), false);
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps), /PREIMAGE_CHANGED/);
  assert.equal(x.calls(), 1); assert.equal(x.writes(), 2);
});
test("changed request after preflight cannot call model; claim remains held", async () => {
  const x = fixture(); const original = x.deps.executeReview;
  x.deps.executeReview = async (...args) => { x.prepared.assembled.prompt = "changed"; return original(...args); };
  const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
  assert.equal(result.jsonBody.status, "HELD"); assert.equal(x.calls(), 0);
});
test("handler rejects invocation-supplied approval and conceals private errors", async () => {
  const x = fixture(); x.env.JM1_DIAGNOSTIC_RUNNER_KEY = "synthetic-key";
  const request = body => ({ headers: { get: () => "synthetic-key" }, json: async () => body });
  assert.equal((await gloryRecoveryHandler(request({ mode: "EXECUTE", approval: x.approval }), x.deps)).status, 400);
  x.deps.prepareReview = async () => { throw new Error("private manuscript content"); };
  const result = await gloryRecoveryHandler(request({ mode: "PREFLIGHT" }), x.deps);
  assert.equal(result.status, 409); assert.equal(JSON.stringify(result).includes("private manuscript"), false);
});
test("native count uses only count_tokens with exact strict tool and no inference body logging", async () => {
  let url;
  const result = await r.countRequest("synthetic fixture", { env: { AZURE_FOUNDRY_ENDPOINT: "https://ais-jm1-foundry.services.ai.azure.com/" },
    now, credential: { getToken: async () => ({ token: "synthetic" }) }, fetch: async (target, options) => {
      url = target; const body = JSON.parse(options.body); assert.equal(body.tools[0].strict, true);
      assert.equal(Object.hasOwn(body, "max_tokens"), false);
      return { ok: true, json: async () => ({ input_tokens: 100 }) };
    } });
  assert.ok(url.endsWith("/messages/count_tokens")); assert.equal(result.inputTokens, 100);
  assert.equal(Object.hasOwn(result, "prompt"), false);
});
test("native deployment unavailable or unexpected model version fails closed", async () => {
  const base = { credential: { getToken: async () => ({ token: "synthetic" }) } };
  await assert.rejects(r.readDeployment({ ...base, fetch: async () => ({ ok: false }) }), /READ_UNAVAILABLE/);
  await assert.rejects(r.readDeployment({ ...base, fetch: async () => ({ ok: true, json: async () => ({ name: "jm1-editorial-devline-primary",
    sku: { name: "GlobalStandard" }, properties: { provisioningState: "Succeeded", model: { name: "claude-sonnet-5", version: "other" } } }) }) }), /DEPLOYMENT_DRIFT/);
});
test("missing decision evidence and public evidence storage cannot authorize dispatch", async () => {
  const x = fixture(); x.rows.delete(x.approval.decisionEvidenceReference);
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps)); assert.equal(x.writes(), 0);
  const y = fixture(); y.deps.containerClient.getProperties = async () => ({ blobPublicAccess: "container" });
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, y.deps), /STORAGE_NOT_PRIVATE/);
  assert.equal(y.countCalls(), 0); assert.equal(y.calls(), 0);
});
test("budget rejects stale count, malformed timestamp, expired tariff and unsupported charges", () => {
  const x = fixture(); const count = { inputTokens: 100, verifiedAt: now().toISOString() };
  for (const change of [{ verifiedAt: "invalid" }, { verifiedAt: "2026-10-09T14:00:00Z" }]) {
    assert.throws(() => r.validateBudget(x.tariff, { ...count, ...change }, x.approval, now()), /BUDGET_UNVERIFIED/);
  }
  for (const change of [{ expiresAt: "2026-10-09T14:00:00Z" }, { additionalCharges: "UNKNOWN" }, { inputMicroUsdPerToken: 1000 }]) {
    assert.throws(() => r.validateBudget({ ...x.tariff, ...change }, { ...count, inputTokens: 114646 }, x.approval, now()), /BUDGET_/);
  }
});
test("decision revocation between claim and inference holds without calling provider", async () => {
  const x = fixture(); const original = x.deps.executeReview;
  x.deps.executeReview = async (...args) => { x.rows.delete(x.approval.decisionEvidenceReference); return original(...args); };
  const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
  assert.equal(result.jsonBody.status, "HELD"); assert.equal(x.calls(), 0);
});
test("accepted owner receipt completes the one-off fixture; replay cannot call or advance", async () => {
  const x = fixture(); const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
  const report = {
    intakeSummary: Object.fromEntries(["title", "sourceVersion", "genre", "audience", "draftStage", "seriesPotential", "comparables", "authorIntent", "submissionCompleteness"].map(k => [k, "SYNTHETIC"]).concat([["wordCount", 1200]])),
    imprintAlignment: { imprint: "SYNTHETIC", authority: "SUGGESTED_ONLY", rationale: "Advisory", publisherApprovalRequired: true },
    categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])), categoryNotes: Object.fromEntries(CATEGORIES.map(k => [k, "Synthetic observation"])),
    strengths: ["One", "Two", "Three"], risks: ["One", "Two", "Three"], integrityFlags: [],
    styleGuideDetermination: { primaryGuide: "Chicago", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
    recommendation: { pathway: "DEVELOPMENTAL", rationale: "Advisory", forwardChecklist: ["Publisher review"], resubmissionEligibility: "UNKNOWN" }
  };
  x.deps.callModel = async () => ({ ok: true, tokenCounts: { input: 100, output: 100 } });
  x.deps.executeReview = async (_input, owner) => {
    await owner.callModel({ diagnosticId: x.prepared.run.executionId, promptBody: x.prepared.assembled.prompt,
      allowFallback: false, modelDeploymentAlias: "jm1-editorial-devline-primary", promptVersion: r.route.promptVersion });
    return { reference: `commissioning-editorial-review/${c.TITLE_ID}/${c.BINDING_HASH}/${"d".repeat(64)}.json`,
      receipt: { status: "EDITORIAL_REVIEW_READY_FOR_PUBLISHER", productionStageChanged: false,
        binding: { titleId: c.TITLE_ID, stage: "EDITORIAL_REVIEW", parentExecutionId: x.prepared.run.executionId },
        report, reportSha256: c.digest(report) } };
  };
  const result = await gloryRecovery({ mode: "EXECUTE" }, x.deps);
  assert.equal(result.jsonBody.status, "COMPLETED"); assert.equal(result.jsonBody.modelInvocationAttempts, 1);
  assert.equal(result.jsonBody.businessEffects, 0);
  await assert.rejects(gloryRecovery({ mode: "EXECUTE" }, x.deps), /PREIMAGE_CHANGED/);
});
