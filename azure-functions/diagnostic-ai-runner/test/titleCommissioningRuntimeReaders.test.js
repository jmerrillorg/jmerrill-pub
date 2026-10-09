"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createTitleCommissioningRuntimeReaders } = require("../src/lifecycle/titleCommissioningRuntimeReaders");
const titleId = "f1908dc9-5775-f111-ab0f-6045bdd69435";
function fixture(overrides = {}) {
  const calls = [];
  const scope = { schemaVersion: 1, titleId, version: "owner-v1", authorityReference: "governed:owner-scope", ...overrides };
  const deps = { containerClient: { getBlockBlobClient(path) {
    calls.push(path);
    return { async getProperties() { return { etag: '"v1"' }; },
      async downloadToBuffer(start, end, options) {
        calls.push(options); return Buffer.from(JSON.stringify(scope));
      } };
  } }, downloadArtifact: async () => Buffer.from("synthetic manuscript") };
  return { readers: createTitleCommissioningRuntimeReaders(deps), calls };
}
test("scope reads are fresh and conditionally bound to owner-store ETag", async () => {
  const { readers, calls } = fixture();
  assert.equal((await readers.readScope(titleId)).version, 'owner-v1:"v1"');
  await readers.readScope(titleId);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[1], { conditions: { ifMatch: '"v1"' } });
});
test("scope provenance and exact title cannot be supplied by caller", async () => {
  for (const overrides of [{ titleId: "other" }, { authorityReference: "" }, { schemaVersion: 2 }]) {
    await assert.rejects(fixture(overrides).readers.readScope(titleId), { safeCode: "COMMISSIONING_SCOPE_PROVENANCE_INVALID" });
  }
  await assert.rejects(fixture().readers.readScope("../other"), { safeCode: "COMMISSIONING_SCOPE_TITLE_INVALID" });
});
test("native byte verification rejects changed bytes and invalid checksums", async () => {
  const { readers } = fixture();
  const hash = createHash("sha256").update("synthetic manuscript").digest("hex");
  assert.equal(await readers.verifyArtifactBytes({}, hash), true);
  assert.equal(await readers.verifyArtifactBytes({}, "0".repeat(64)), false);
  assert.equal(await readers.verifyArtifactBytes({}, "invalid"), false);
});
