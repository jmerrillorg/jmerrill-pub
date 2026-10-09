"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { executeCommissioningEditorialReview: execute } = require("../src/editorial/commissioningEditorialReviewAdapter");
const { processTitleCommissioningEditorialReview: worker } = require("../src/lifecycle/titleCommissioningEditorialReviewWorker");
const { planTitleCommissioningRun } = require("../src/lifecycle/titleCommissioningRun");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: author } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function fixture() {
  const id = "00000000-0000-4000-8000-000000000001", sourceId = "00000000-0000-4000-8000-000000000002";
  const bytes = Buffer.from("Exact original manuscript bytes");
  const title = { jm1pub_titleid: id, _jm1_primaryauthor_value: author };
  const input = { title, source: { reference: `dataverse:jm1pub_editorialartifact:${sourceId}`, version: "1", sha256: hash(bytes) }, historyReference: "dataverse:existing", revision: 1 };
  const plan = planTitleCommissioningRun(input), saved = new Map(); let version = 0, calls = 0, clock = Date.parse("2026-10-09T12:00:00Z");
  const artifact = { jm1pub_editorialartifactid: sourceId, _jm1pub_titleid_value: id, versionnumber: 1, statecode: 0, jm1pub_iscurrentapproved: true, jm1pub_sha256: hash(bytes) };
  const report = {
    intakeSummary: { title: "Fixture", sourceVersion: "1", genre: "UNKNOWN", audience: "UNKNOWN", wordCount: 4,
      draftStage: "UNKNOWN", seriesPotential: "UNKNOWN", comparables: "UNKNOWN", authorIntent: "UNKNOWN", submissionCompleteness: "UNKNOWN" },
    imprintAlignment: { imprint: "JM Works", authority: "SUGGESTED_ONLY", rationale: "Advisory", publisherApprovalRequired: false },
    categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])), categoryNotes: Object.fromEntries(CATEGORIES.map(k => [k, "Advisory"])),
    strengths: ["One", "Two", "Three"], risks: ["One", "Two", "Three"], integrityFlags: [],
    styleGuideDetermination: { primaryGuide: "Chicago", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
    recommendation: { pathway: "DEVELOPMENTAL", rationale: "Advisory", forwardChecklist: ["Publisher review"], resubmissionEligibility: "UNKNOWN" }
  };
  const authority = { titleId: id, sourceSha256: hash(bytes), sources: ["EDITORIAL_REVIEW_CANON", "GLOBAL_EDITORIAL_KNOWLEDGE"].map(role => ({
    role, id: role, version: "1", sha256: hash("Canon"), content: "Canon", current: true, approved: true, scope: "GLOBAL", verifiedAt: "2026-10-09T12:00:00Z" })) };
  const deps = { now: () => new Date(clock), client: { first: async entity => entity === "jm1pub_titles" ? title : artifact },
    verifyArtifactBytes: async () => true, downloadSource: async () => bytes, extractText: async () => "One two three four",
    readScope: async () => ({ enabled: true, titleId: id, version: "1", mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", controllingSourceArtifactId: sourceId, retainedArtifactIds: [] }),
    readReviewAuthority: async () => authority,
    callModel: async () => { calls++; return { ok: true, provider: "microsoft-foundry-claude", route: { deploymentAlias: "jm1-editorial-devline-primary" }, output: report }; },
    containerClient: { getBlockBlobClient(name) { return {
      async getProperties() { if (!saved.has(name)) throw Object.assign(new Error("missing"), { statusCode: 404 }); return { etag: saved.get(name).etag }; },
      async downloadToBuffer(_a, _b, options) {
        if (!saved.has(name)) throw Object.assign(new Error("missing"), { statusCode: 404 });
        if (options?.conditions?.ifMatch && options.conditions.ifMatch !== saved.get(name).etag) throw Object.assign(new Error("conflict"), { statusCode: 412 });
        return saved.get(name).bytes;
      },
      async uploadData(value, options) {
        if ((options.conditions.ifNoneMatch && saved.has(name)) || (options.conditions.ifMatch && options.conditions.ifMatch !== saved.get(name)?.etag)) throw Object.assign(new Error("conflict"), { statusCode: 412 });
        const etag = String(++version); saved.set(name, { etag, bytes: value }); return { etag };
      }
    }; } } };
  saved.set(`commissioning-intake/${id}/${plan.bindingHash}.json`, { etag: "initial", bytes: Buffer.from(JSON.stringify({ executionId: plan.executionId, bindingHash: plan.bindingHash, titleId: id, status: "INTAKE_MATERIALS_VERIFIED", productionStageChanged: false })) });
  return { input, deps, saved, report, authority, title, calls: () => calls, advance: ms => { clock += ms; } };
}
test("review produces durable assessment and replay never calls model twice", async () => {
  const x = fixture(), before = structuredClone(x.title);
  const first = await execute(x.input, x.deps), again = await execute(x.input, { ...x.deps });
  assert.equal(first.receipt.status, "EDITORIAL_REVIEW_READY_FOR_PUBLISHER"); assert.equal(again.duplicate, true);
  assert.equal(x.calls(), 1); assert.deepEqual(x.title, before); assert.equal(first.receipt.authorDecisionInferred, false);
  assert.equal(JSON.stringify(first.receipt).includes("One two three four"), false);
});
test("missing intake and changed source deny before inference", async () => {
  const x = fixture(); x.saved.clear(); await assert.rejects(execute(x.input, x.deps)); assert.equal(x.calls(), 0);
  const y = fixture(); y.deps.downloadSource = async () => Buffer.from("different");
  await assert.rejects(execute(y.input, y.deps), /SOURCE_BYTES_CHANGED/); assert.equal(y.calls(), 0);
});
test("model fallback and edited output never persist assessment", async () => {
  const x = fixture(); x.deps.callModel = async () => ({ ok: true, provider: "anthropic-direct" });
  await assert.rejects(execute(x.input, x.deps), /AUTHORITY_OR_CONFIGURATION_REQUIRED/); assert.equal(x.saved.size, 1);
  const y = fixture(); y.report.edits = []; await assert.rejects(execute(y.input, y.deps), /SECTIONS_INVALID/); assert.equal(y.saved.size, 1);
});
test("authority revocation after model call prevents publication", async () => {
  const x = fixture(), original = x.deps.callModel;
  x.deps.callModel = async () => { const result = await original(); x.deps.readScope = async () => ({ enabled: false }); return result; };
  await assert.rejects(execute(x.input, x.deps), /SCOPE_NOT_CURRENT/); assert.equal(x.saved.size, 1);
});
test("stage worker retries same parent and completed replay preserves model result", async () => {
  const x = fixture(), original = x.deps.callModel;
  x.deps.callModel = async () => { throw Object.assign(new Error("private source omitted"), { statusCode: 503 }); };
  const failed = await worker(x.input, x.deps); assert.equal(failed.status, "RETRY_PENDING");
  assert.equal(JSON.stringify(failed).includes("private source"), false);
  x.deps.callModel = original; assert.equal((await worker(x.input, x.deps)).status, "RETRY_PENDING");
  x.advance(60000); const completed = await worker(x.input, x.deps);
  assert.equal(completed.status, "COMPLETED"); assert.match(completed.executionId, /editorial-review:v1$/);
  assert.deepEqual(await worker(x.input, { ...x.deps }), completed); assert.equal(x.calls(), 1);
});
test("report-byte persistence failure recovers saved inference without a second model call", async () => {
  const x = fixture(), original = x.deps.containerClient.getBlockBlobClient;
  x.deps.containerClient.getBlockBlobClient = name => {
    const blob = original(name);
    return name.endsWith(".md") ? { ...blob, uploadData: async () => { throw Object.assign(new Error("unavailable"), { statusCode: 503 }); } } : blob;
  };
  assert.equal((await worker(x.input, x.deps)).status, "RETRY_PENDING"); assert.equal(x.calls(), 1);
  x.deps.containerClient.getBlockBlobClient = original; x.advance(60000);
  assert.equal((await worker(x.input, { ...x.deps })).status, "COMPLETED"); assert.equal(x.calls(), 1);
  const docs = [...x.saved.keys()].filter(name => name.endsWith(".md")); assert.equal(docs.length, 1);
  assert.match(x.saved.get(docs[0]).bytes.toString(), /9\. Editorial Recommendation/);
});
test("permission denial is held rather than retried through another provider", async () => {
  const x = fixture(); x.deps.callModel = async () => ({ ok: false, httpStatus: 403 });
  const result = await worker(x.input, x.deps); assert.equal(result.status, "HELD");
  assert.equal([...x.saved.keys()].some(name => name.endsWith(".md")), false);
  assert.deepEqual(await worker(x.input, x.deps), result);
});
test("exact-schema repair recovers one structural hold and preserves its preimage", async () => {
  const x = fixture(), original = x.deps.callModel;
  x.deps.callModel = async () => ({ ok: true, provider: "microsoft-foundry-claude",
    route: { deploymentAlias: "jm1-editorial-devline-primary" }, output: { invalid: true } });
  const held = await worker(x.input, x.deps);
  assert.equal(held.causeCode, "REVIEW_SECTIONS_INVALID");
  x.deps.callModel = original;
  const recovered = await worker(x.input, x.deps);
  assert.equal(recovered.status, "COMPLETED");
  assert.equal(recovered.executionId, held.executionId);
  assert.deepEqual(recovered.repairRecovery.previousState, held);
  assert.equal(recovered.attempts, 2);
  assert.deepEqual(await worker(x.input, x.deps), recovered);
  assert.equal(x.calls(), 1);
});
test("schema repair does not loop when the repaired producer still returns invalid sections", async () => {
  const x = fixture(); let calls = 0;
  x.deps.callModel = async () => { calls++; return { ok: true, provider: "microsoft-foundry-claude",
    route: { deploymentAlias: "jm1-editorial-devline-primary" }, output: {} }; };
  await worker(x.input, x.deps);
  const heldAgain = await worker(x.input, x.deps);
  assert.equal(heldAgain.status, "HELD");
  assert.equal(heldAgain.attempts, 2);
  assert.deepEqual(await worker(x.input, x.deps), heldAgain);
  assert.equal(calls, 2);
});
test("provider timeout preserves a safe cause and resumes the same review", async () => {
  const x = fixture(), original = x.deps.callModel;
  x.deps.callModel = async () => ({ ok: false, failureCode: "MODEL_REQUEST_TIMEOUT",
    error: "private provider response must not be stored" });
  const failed = await worker(x.input, x.deps);
  assert.equal(failed.status, "RETRY_PENDING");
  assert.equal(failed.causeCode, "REVIEW_MODEL_REQUEST_TIMEOUT");
  assert.equal(JSON.stringify(failed).includes("private provider"), false);
  x.advance(60000); x.deps.callModel = original;
  const recovered = await worker(x.input, x.deps);
  assert.equal(recovered.status, "COMPLETED");
  assert.equal(recovered.executionId, failed.executionId);
  assert.equal(recovered.attempts, 2);
});
test("verified profile identity is pinned and a mid-assessment version change holds output", async () => {
  const x = fixture(), profileId = "00000000-0000-4000-8000-000000000003";
  x.input.title = { jm1pub_titleid: x.title.jm1pub_titleid, _jm1_primaryauthor_value: author };
  x.title.jm1_canonicalauthorcontactreference = `contact:${author}; authorProfile:${profileId}`;
  const originalRead = x.deps.client.first;
  const profile = { jm1_authorprofileid: profileId, _jm1_contact_value: author, statecode: 0, versionnumber: 1 };
  x.deps.client.first = async entity => entity === "jm1_authorprofiles" ? profile : entity === "contacts"
    ? { contactid: author, statecode: 0, versionnumber: 1 } : originalRead(entity);
  const originalModel = x.deps.callModel;
  x.deps.callModel = async () => { const result = await originalModel(); profile.versionnumber++; return result; };
  const result = await worker(x.input, x.deps);
  assert.equal(result.status, "HELD");
  assert.equal(result.causeCode, "REVIEW_AUTHOR_IDENTITY_CHANGED_DURING_EXECUTION");
  assert.equal(x.saved.size, 2);
  assert.equal([...x.saved.keys()].some(name => name.endsWith(".md")), false);
});
