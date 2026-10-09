"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { runTitleCommissioningIntakeRuntime: run } = require("../src/lifecycle/titleCommissioningIntakeRuntime");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: author } = require("../src/author/jackieTitleSystemCommissioningPolicy");
function fixture() {
  const titleId = "00000000-0000-4000-8000-000000000001";
  const artifactId = "00000000-0000-4000-8000-000000000002";
  const bytes = Buffer.from("harmless fixture"); const sha = createHash("sha256").update(bytes).digest("hex");
  const title = { jm1pub_titleid: titleId, _jm1_primaryauthor_value: author };
  const artifact = { jm1pub_editorialartifactid: artifactId, _jm1pub_titleid_value: titleId, statecode: 0,
    versionnumber: 1, jm1pub_sha256: sha, jm1pub_iscurrentapproved: true };
  const request = { schemaVersion: 1, authorityReference: "approved:test-fixture", title,
    source: { reference: `dataverse:jm1pub_editorialartifact:${artifactId}`, version: "1", sha256: sha },
    historyReference: "dataverse:preserved-history", revision: 1 };
  const scope = { schemaVersion: 1, authorityReference: request.authorityReference, titleId, version: "1", enabled: true,
    mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", controllingSourceArtifactId: artifactId, retainedArtifactIds: [] };
  const saved = new Map(); let seq = 0;
  function put(path, value) { saved.set(path, { bytes: Buffer.from(JSON.stringify(value)), etag: String(++seq) }); }
  put(`commissioning-requests/${titleId}.json`, request); put(`commissioning-scopes/${titleId}.json`, scope);
  const deps = { env: { JM1_TITLE_COMMISSIONING_INTAKE_ENABLED: "true", JM1_TITLE_COMMISSIONING_INTAKE_TITLE_IDS: titleId },
    client: { first: async entity => entity === "jm1pub_titles" ? title : artifact }, downloadArtifact: async () => bytes,
    containerClient: { getBlockBlobClient: path => ({
      getProperties: async () => { if (!saved.has(path)) throw Object.assign(new Error("missing"), { statusCode: 404 }); return { etag: saved.get(path).etag }; },
      downloadToBuffer: async (_a, _b, options) => { const row = saved.get(path); if (options?.conditions?.ifMatch && row.etag !== options.conditions.ifMatch) throw Object.assign(new Error("conflict"), { statusCode: 412 }); return row.bytes; },
      uploadData: async (body, options) => { const row = saved.get(path); if ((options.conditions.ifNoneMatch && row) || (options.conditions.ifMatch && row?.etag !== options.conditions.ifMatch)) throw Object.assign(new Error("conflict"), { statusCode: 412 }); const etag = String(++seq); saved.set(path, { bytes: body, etag }); return { etag }; }
    }) } };
  return { deps, saved, title, scope, request, put, titleId };
}
test("disabled timer branch performs no reads or writes", async () => {
  assert.deepEqual(await run({ env: {} }), { enabled: false, results: [], failures: [] });
});
test("existing timer dispatches bound intake with restart-safe completion only", async () => {
  const x = fixture(); const before = structuredClone(x.title);
  const first = await run(x.deps); assert.equal(first.results[0].status, "COMPLETED"); assert.deepEqual(first.failures, []);
  const count = x.saved.size; const replay = await run({ ...x.deps }); assert.deepEqual(replay, first);
  assert.equal(x.saved.size, count); assert.deepEqual(x.title, before);
  assert.equal([...x.saved.keys()].some(key => key.startsWith("events/") || key.startsWith("waits/")), false);
});
test("missing owner request and mismatched provenance fail closed without a run", async () => {
  const x = fixture(); x.saved.delete(`commissioning-requests/${x.titleId}.json`);
  assert.equal((await run(x.deps)).failures[0].code, "COMMISSIONING_OWNER_BINDING_MISSING");
  const y = fixture(); y.request.authorityReference = "unapproved"; y.put(`commissioning-requests/${y.titleId}.json`, y.request);
  assert.equal((await run(y.deps)).results.length, 0); assert.equal(y.saved.size, 2);
});
test("non-Jackie author cannot execute even with a scope record", async () => {
  const x = fixture(); x.title._jm1_primaryauthor_value = "00000000-0000-4000-8000-000000000099";
  x.put(`commissioning-requests/${x.titleId}.json`, x.request);
  assert.equal((await run(x.deps)).results.length, 0); assert.equal(x.saved.size, 2);
});
test("allowlist rejects broad, malformed, and duplicate discovery", async () => {
  for (const ids of ["*", "", "00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000001"]) {
    await assert.rejects(run({ env: { JM1_TITLE_COMMISSIONING_INTAKE_ENABLED: "true", JM1_TITLE_COMMISSIONING_INTAKE_TITLE_IDS: ids } }), /ALLOWLIST_INVALID/);
  }
});
