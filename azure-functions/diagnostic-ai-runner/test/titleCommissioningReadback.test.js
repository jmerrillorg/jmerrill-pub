"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { titleCommissioningReadback: read } = require("../src/lifecycle/titleCommissioningReadback");
const { ownerBinding } = require("../src/lifecycle/titleCommissioningOwnerBindings");
const { planTitleCommissioningRun } = require("../src/lifecycle/titleCommissioningRun");
const titleId = "f1908dc9-5775-f111-ab0f-6045bdd69435";
function fixture() {
  const binding = ownerBinding(titleId); const plan = planTitleCommissioningRun(binding.request);
  const artifacts = [{ artifactId: binding.scope.controllingSourceArtifactId, ...binding.request.source }, ...binding.request.retainedArtifacts]
    .map(a => ({ jm1pub_editorialartifactid: a.artifactId, _jm1pub_titleid_value: titleId, statecode: 0,
      versionnumber: Number(a.version), jm1pub_sha256: a.sha256, jm1pub_iscurrentapproved: true }));
  const records = new Map();
  const deps = {
    client: { first: async (entity, query) => entity === "jm1pub_titles" ? binding.request.title : artifacts.find(a => query.$filter.includes(a.jm1pub_editorialartifactid)) },
    readers: { readScope: async () => binding.scope, verifyArtifactBytes: async () => true },
    containerClient: { getBlockBlobClient: path => ({
      getProperties: async () => { if (!records.has(path)) throw Object.assign(new Error("absent"), { statusCode: 404 }); return { etag: "fixture-etag" }; },
      downloadToBuffer: async (_a, _b, options) => { assert.equal(options.conditions.ifMatch, "fixture-etag"); return Buffer.from(JSON.stringify(records.get(path))); },
      uploadData: async () => { assert.fail("readback cannot write"); }
    }) }
  };
  return { deps, records, plan };
}
test("scope-denied readback never accesses storage or author data", async () => {
  for (const body of [{ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId: "other" }, { mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId, execute: true }]) {
    assert.equal((await read(body)).status, 400);
  }
});
test("native readback returns exact metadata and zero effects", async () => {
  const x = fixture(); const identity = { titleId, executionId: x.plan.executionId, bindingHash: x.plan.bindingHash };
  x.records.set(`commissioning-executions/${titleId}/${x.plan.bindingHash}.json`, { ...identity, status: "COMPLETED", attempts: 1,
    receiptReference: `commissioning-intake/${titleId}/${x.plan.bindingHash}.json` });
  x.records.set(`commissioning-intake/${titleId}/${x.plan.bindingHash}.json`, { ...identity, status: "INTAKE_MATERIALS_VERIFIED", productionStageChanged: false, source: ownerBinding(titleId).request.source });
  const result = await read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.effects, 0); assert.equal(result.jsonBody.nativeAuthorityAndBytes, "PASS");
  assert.equal(result.jsonBody.execution.status, "COMPLETED"); assert.equal(result.jsonBody.receipt.productionStageChanged, false);
});
test("cross-title stored receipt is denied, never projected as complete", async () => {
  const x = fixture(); x.records.set(`commissioning-intake/${titleId}/${x.plan.bindingHash}.json`, { titleId: "other", executionId: x.plan.executionId, bindingHash: x.plan.bindingHash });
  await assert.rejects(read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps), /IDENTITY_CONFLICT/);
});
test("completed intake rejects missing, altered or misplaced receipt without writes", async () => {
  for (const variant of ["missing", "source", "status", "path", "stage"]) {
    const x = fixture(), identity = { titleId, executionId: x.plan.executionId, bindingHash: x.plan.bindingHash };
    x.records.set(`commissioning-executions/${titleId}/${x.plan.bindingHash}.json`, {
      ...identity, status: "COMPLETED", attempts: 1,
      receiptReference: variant === "path" ? "other/receipt.json" : `commissioning-intake/${titleId}/${x.plan.bindingHash}.json`
    });
    if (variant !== "missing") x.records.set(`commissioning-intake/${titleId}/${x.plan.bindingHash}.json`, {
      ...identity, status: variant === "status" ? "PENDING" : "INTAKE_MATERIALS_VERIFIED",
      productionStageChanged: variant === "stage", source: variant === "source" ? { ...x.plan.source, version: "changed" } : x.plan.source
    });
    await assert.rejects(read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps), /COMPLETED_INTAKE_RECEIPT_INVALID/);
  }
});
test("rejected candidate readback verifies exact custody and returns shapes, never private content", async () => {
  const x = fixture();
  const candidate = { status: "QUARANTINED_INVALID_ASSESSMENT", safeCode: "REVIEW_CATEGORY_NOTES_INVALID",
    binding: { titleId, parentExecutionId: x.plan.executionId, source: x.plan.source },
    output: { categoryNotes: { STRUCTURE_FLOW: ["private manuscript-derived text"] } },
    tokenCounts: { input: 10, output: 20, total: 30 } };
  const sha256 = require("node:crypto").createHash("sha256").update(JSON.stringify(candidate)).digest("hex");
  const reference = `commissioning-review-quarantine/${titleId}/${x.plan.bindingHash}/${sha256}.json`;
  x.records.set(reference, candidate);
  x.records.set(`commissioning-review-executions/${titleId}/${x.plan.bindingHash}.json`, {
    titleId, executionId: `${x.plan.executionId}:editorial-review:v1`, bindingHash: x.plan.bindingHash,
    status: "HELD", quarantineReference: reference
  });
  const result = await read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps);
  assert.equal(result.jsonBody.reviewRejection.sha256, sha256);
  assert.equal(result.jsonBody.reviewRejection.categoryNoteShapes.STRUCTURE_FLOW.type, "array");
  assert.equal(result.jsonBody.reviewRejection.contentReturned, false);
  assert.equal(JSON.stringify(result).includes("private manuscript-derived"), false);
  candidate.binding.titleId = "other";
  await assert.rejects(read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps), /CUSTODY_INVALID/);
});
test("fixed-title identity preflight reads exact links without touching storage or dispatch", async () => {
  const id = "f79006b7-f595-f111-8076-00224820105b";
  const contact = require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const profile = "1f0188ca-71a5-f111-b8de-7c1e525b15c2";
  const deps = { client: { first: async entity => entity === "jm1pub_titles"
    ? { jm1pub_titleid: id, versionnumber: 1, jm1_canonicalauthorcontactreference: `contact:${contact}; authorProfile:${profile}` }
    : entity === "jm1_authorprofiles" ? { jm1_authorprofileid: profile, _jm1_contact_value: contact, statecode: 0, versionnumber: 2 }
      : { contactid: contact, statecode: 0, versionnumber: 3 } } };
  Object.defineProperty(deps, "containerClient", { get() { assert.fail("identity read cannot touch storage"); } });
  const result = await read({ mode: "COMMISSIONING_IDENTITY_READ_ONLY", titleId: id }, deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.identityBinding, "PASS");
  assert.equal(result.jsonBody.scopeStatus, "READ_ONLY_IDENTITY_PREFLIGHT_NOT_EXECUTION_AUTHORITY");
  assert.equal(result.jsonBody.effects, 0); assert.equal(result.jsonBody.commissioningIdentity.profileId, profile);
  assert.equal((await read({ mode: "COMMISSIONING_IDENTITY_READ_ONLY", titleId: "other" })).status, 400);
});
test("encoded category-note diagnosis is metadata-only and never accepts a rejected report", async () => {
  const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
  for (const notes of ["private narrative", JSON.stringify(Object.fromEntries(CATEGORIES.map(k => [k, "private observation"]))),
    JSON.stringify({ STRUCTURE_FLOW: "private observation" }), "null", "[]"]) {
    const x = fixture();
    const candidate = { status: "QUARANTINED_INVALID_ASSESSMENT", safeCode: "REVIEW_CATEGORY_NOTES_INVALID",
      binding: { titleId, parentExecutionId: x.plan.executionId, source: x.plan.source }, output: {
        intakeSummary: { title: "UNKNOWN", sourceVersion: "1", genre: "UNKNOWN", audience: "UNKNOWN", wordCount: 1,
          draftStage: "UNKNOWN", seriesPotential: "UNKNOWN", comparables: "UNKNOWN", authorIntent: "UNKNOWN", submissionCompleteness: "UNKNOWN" },
        imprintAlignment: { imprint: "UNKNOWN", authority: "SUGGESTED_ONLY", rationale: "UNKNOWN", publisherApprovalRequired: true },
        categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])), categoryNotes: notes,
        strengths: ["one", "two", "three"], risks: ["one", "two", "three"], integrityFlags: [],
        styleGuideDetermination: { primaryGuide: "UNKNOWN", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
        recommendation: { pathway: "DEVELOPMENTAL", rationale: "UNKNOWN", forwardChecklist: ["Human review"], resubmissionEligibility: "UNKNOWN" }
      } };
    const hash = require("node:crypto").createHash("sha256").update(JSON.stringify(candidate)).digest("hex");
    const reference = `commissioning-review-quarantine/${titleId}/${x.plan.bindingHash}/${hash}.json`;
    x.records.set(reference, candidate);
    x.records.set(`commissioning-review-executions/${titleId}/${x.plan.bindingHash}.json`, {
      titleId, executionId: `${x.plan.executionId}:editorial-review:v1`, bindingHash: x.plan.bindingHash,
      status: "HELD", quarantineReference: reference
    });
    const result = await read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps);
    assert.equal(result.jsonBody.reviewRejection.categoryNotesJson.decodable, notes !== "private narrative");
    assert.equal(result.jsonBody.reviewRejection.categoryNotesJson.fullContractValid,
      notes.startsWith("{\"STRUCTURE_FLOW\"") && Object.keys(JSON.parse(notes)).length === CATEGORIES.length);
    assert.equal(result.jsonBody.reviewExecution.status, "HELD");
    assert.equal(result.jsonBody.effects, 0);
    assert.equal(JSON.stringify(result).includes("private observation"), false);
    assert.equal(JSON.stringify(result).includes("private narrative"), false);
    assert.equal(candidate.output.categoryNotes, notes);
  }
});
