"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { ownerBinding, ensureTitleCommissioningOwnerBindings: ensure } = require("../src/lifecycle/titleCommissioningOwnerBindings");
const id = "f1908dc9-5775-f111-ab0f-6045bdd69435";
function fixture() {
  const binding = ownerBinding(id); const saved = new Map(); let seq = 0; let byteChecks = 0;
  const artifacts = [
    { artifactId: binding.scope.controllingSourceArtifactId, ...binding.request.source },
    ...binding.request.retainedArtifacts
  ].map(a => ({ jm1pub_editorialartifactid: a.artifactId, _jm1pub_titleid_value: id, statecode: 0,
    versionnumber: Number(a.version), jm1pub_sha256: a.sha256, jm1pub_iscurrentapproved: true }));
  const deps = { client: { first: async (entity, query) => entity === "jm1pub_titles" ? binding.request.title
    : artifacts.find(a => query.$filter.includes(a.jm1pub_editorialartifactid)) },
    verifyArtifactBytes: async () => { byteChecks++; return true; },
    containerClient: { getBlockBlobClient: path => ({
      getProperties: async () => { if (!saved.has(path)) throw Object.assign(new Error("absent"), { statusCode: 404 }); return { etag: saved.get(path).etag }; },
      downloadToBuffer: async () => saved.get(path).bytes,
      uploadData: async (bytes, options) => { assert.equal(options.conditions.ifNoneMatch, "*"); if (saved.has(path)) throw Object.assign(new Error("exists"), { statusCode: 412 }); saved.set(path, { bytes, etag: String(++seq) }); }
    }) } };
  return { binding, deps, saved, checks: () => byteChecks };
}
test("reviewed exact binding provisions only after all native source checks, then replays without writes", async () => {
  const x = fixture(); assert.equal((await ensure(id, x.deps)).provisioned, true);
  assert.equal(x.checks(), 5); assert.equal(x.saved.size, 2);
  assert.equal((await ensure(id, x.deps)).provisioned, false); assert.equal(x.checks(), 5);
  assert.equal(ownerBinding("other"), null); assert.equal((await ensure("other", x.deps)).provisioned, false);
});
test("source-byte failure creates no scope or request", async () => {
  const x = fixture(); x.deps.verifyArtifactBytes = async () => false;
  await assert.rejects(ensure(id, x.deps), /BYTES_UNVERIFIED/); assert.equal(x.saved.size, 0);
});
test("existing revoked scope is preserved and never bootstrapped over", async () => {
  const x = fixture(); const path = `commissioning-scopes/${id}.json`;
  const bytes = Buffer.from(JSON.stringify({ ...x.binding.scope, revoked: true }));
  x.saved.set(path, { bytes, etag: "revoked" });
  await assert.rejects(ensure(id, x.deps), /BINDING_CONFLICT/);
  assert.deepEqual(x.saved.get(path).bytes, bytes); assert.equal(x.saved.size, 1); assert.equal(x.checks(), 0);
});
test("partial owner provisioning recovers create-only without changing preserved scope", async () => {
  const x = fixture(); const path = `commissioning-scopes/${id}.json`;
  x.saved.set(path, { bytes: Buffer.from(JSON.stringify(x.binding.scope)), etag: "preserved" });
  assert.equal((await ensure(id, x.deps)).provisioned, true); assert.equal(x.saved.get(path).etag, "preserved"); assert.equal(x.saved.size, 2);
});
