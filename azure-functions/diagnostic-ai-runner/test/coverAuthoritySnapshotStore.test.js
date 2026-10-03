"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Readable } = require("node:stream");
const { createCoverAuthoritySnapshotStore } = require("../src/production/coverAuthoritySnapshotStore");

const bundle = {
  titleId: "91c5e1ef-2980-f111-ab0f-7c1e525b15c2", sha256: "a".repeat(64),
  fields: { title: { sourceId: "title-record", sourceVersion: "v1", sourceChecksum: null, authorityClass: "CANONICAL_RECORD" } }
};
const executionId = "df8f7a54-2c12-45be-ad19-dcf2a123fa24";

function fixture() {
  const blobs = new Map();
  const service = { getContainerClient: () => ({ getBlockBlobClient: (name) => ({
    upload: async (body, _length, options) => {
      assert.equal(options.conditions.ifNoneMatch, "*");
      if (blobs.has(name)) throw Object.assign(new Error("exists"), { statusCode: 412 });
      blobs.set(name, body);
    },
    download: async () => ({ readableStreamBody: Readable.from([blobs.get(name)]) })
  }) }) };
  return { blobs, store: createCoverAuthoritySnapshotStore({
    serviceUrl: "https://stjm1diagrunner.blob.core.windows.net", containerName: "cover-audit", service
  }) };
}

test("snapshot is write-once and read back before concept generation", async () => {
  const { blobs, store } = fixture();
  const first = await store.persistAuthoritySnapshot(bundle, executionId);
  assert.match(first.snapshotId, /^[a-f0-9]{64}$/);
  assert.equal(blobs.size, 1);
  assert.deepEqual(await store.persistAuthoritySnapshot(bundle, executionId), first);
  assert.equal(blobs.size, 1);
});

test("same snapshot identity cannot silently change source evidence", async () => {
  const { store } = fixture();
  await store.persistAuthoritySnapshot(bundle, executionId);
  await assert.rejects(store.persistAuthoritySnapshot({ ...bundle, fields: {
    title: { ...bundle.fields.title, sourceVersion: "v2" }
  } }, executionId), /COVER_AUTHORITY_SNAPSHOT_CONFLICT/);
});
