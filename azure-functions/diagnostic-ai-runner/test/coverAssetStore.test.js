"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { Readable } = require("node:stream");
const test = require("node:test");
const { createCoverAssetStore } = require("../src/production/coverAssetStore");

const bytes = Buffer.from("fixture-png");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const input = { titleId: "91c5e1ef-2980-f111-ab0f-7c1e525b15c2",
  executionId: "df8f7a54-2c12-45be-ad19-dcf2a123fa24", direction: 1,
  bytes, sha256, contentType: "image/png", width: 1024, height: 1536 };

test("concept bytes are immutable, replayable, and read back by checksum", async () => {
  const blobs = new Map();
  const service = { getContainerClient: () => ({ getBlockBlobClient: (name) => ({
    upload: async (body, _size, options) => {
      assert.equal(options.conditions.ifNoneMatch, "*");
      if (blobs.has(name)) throw Object.assign(new Error("exists"), { statusCode: 412 });
      blobs.set(name, body);
    },
    download: async () => ({ readableStreamBody: Readable.from([blobs.get(name)]) })
  }) }) };
  const store = createCoverAssetStore({ serviceUrl: "https://stjm1diagrunner.blob.core.windows.net",
    containerName: "cover-assets", service });
  const first = await store.uploadAsset(input);
  assert.equal(first.assetId, sha256);
  assert.deepEqual(await store.uploadAsset(input), first);
  assert.equal(blobs.size, 1);
  await assert.rejects(store.uploadAsset({ ...input, sha256: "a".repeat(64) }), /COVER_ASSET_INVALID/);
});
