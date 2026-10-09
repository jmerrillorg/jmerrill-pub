"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { executeTitleCommissioningIntake: execute } = require("../src/lifecycle/titleCommissioningIntake");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: author } = require("../src/author/jackieTitleSystemCommissioningPolicy");
function fixture() {
  const id = "00000000-0000-4000-8000-000000000001";
  const sourceId = "00000000-0000-4000-8000-000000000002";
  const title = { jm1pub_titleid: id, _jm1_primaryauthor_value: author };
  const artifact = { jm1pub_editorialartifactid: sourceId, _jm1pub_titleid_value: id, statecode: 0, versionnumber: 1, jm1pub_sha256: "a".repeat(64), jm1pub_iscurrentapproved: true };
  const saved = new Map(); let failReceipt = false;
  const deps = { client: { first: async entity => entity === "jm1pub_titles" ? title : artifact },
    verifyArtifactBytes: async () => true,
    readScope: async () => ({ enabled: true, titleId: id, version: "1", mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", controllingSourceArtifactId: sourceId, retainedArtifactIds: [] }),
    containerClient: { getBlockBlobClient(name) { return {
      async uploadData(bytes) {
        if (failReceipt && name.startsWith("commissioning-intake/")) throw new Error("DEPENDENCY_FAILED");
        if (saved.has(name)) throw Object.assign(new Error("exists"), { statusCode: 412 });
        saved.set(name, bytes);
      }, async downloadToBuffer() { return saved.get(name); }
    }; } } };
  return { deps, saved, title, fail() { failReceipt = true; }, recover() { failReceipt = false; },
    input: { title, source: { reference: `dataverse:jm1pub_editorialartifact:${sourceId}`, version: "1", sha256: artifact.jm1pub_sha256 }, historyReference: "dataverse:existing-history", revision: 1 } };
}
test("intake retains exact source and replay receipt without live-stage mutation", async () => {
  const x = fixture(); const before = structuredClone(x.title);
  const first = await execute(x.input, x.deps); const replay = await execute(x.input, x.deps);
  assert.equal(first.receipt.status, "INTAKE_MATERIALS_VERIFIED"); assert.equal(replay.duplicate, true);
  assert.deepEqual(first.receipt, replay.receipt); assert.deepEqual(x.title, before); assert.equal(x.saved.size, 2);
});
test("partial persistence recovers the same plan and receipt after restart", async () => {
  const x = fixture(); x.fail(); await assert.rejects(execute(x.input, x.deps), /DEPENDENCY_FAILED/);
  assert.equal(x.saved.size, 1); x.recover(); const result = await execute(x.input, { ...x.deps });
  assert.equal(result.duplicate, false); assert.equal(x.saved.size, 2);
  assert.equal((await execute(x.input, x.deps)).duplicate, true);
});
test("source byte failure never persists a plan or receipt", async () => {
  const x = fixture(); x.deps.verifyArtifactBytes = async () => false;
  await assert.rejects(execute(x.input, x.deps), /BYTES_UNVERIFIED/); assert.equal(x.saved.size, 0);
});
