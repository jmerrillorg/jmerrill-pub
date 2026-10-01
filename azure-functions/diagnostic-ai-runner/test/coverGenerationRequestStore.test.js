"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Readable } = require("node:stream");
const { createCoverGenerationRequestStore } = require("../src/production/coverGenerationRequestStore");

const request = {
  titleId: "91c5e1ef-2980-f111-ab0f-7c1e525b15c2",
  authorId: "d60b4f5c-f823-4a84-ae3e-115428cff204",
  executionId: "df8f7a54-2c12-45be-ad19-dcf2a123fa24",
  idempotencyKey: "a".repeat(64),
  creativeBriefId: "c".repeat(64),
  creativeBriefVersion: "b".repeat(64),
  authoritySnapshotId: "d".repeat(64),
  authoritySnapshotSha256: "e".repeat(64),
  promptContractVersion: "OP-006-ART-1.0",
  modelDeployment: "jm1-pub-cover-image-primary",
  requestedVariantCount: 2,
  requestedAt: "2026-09-30T12:00:00.000Z",
  revisionOf: null
};

function fixtureStore() {
  const blobs = new Map();
  const uploads = [];
  const service = {
    getContainerClient: () => ({
      getBlockBlobClient: (name) => ({
        upload: async (body, _length, options) => {
          uploads.push({ name, options });
          if (blobs.has(name)) throw Object.assign(new Error("exists"), { statusCode: 412 });
          blobs.set(name, body);
        },
        download: async () => ({ readableStreamBody: Readable.from([blobs.get(name)]) })
      })
    })
  };
  return {
    blobs,
    uploads,
    store: createCoverGenerationRequestStore({
      serviceUrl: "https://stjm1diagrunner.blob.core.windows.net",
      containerName: "cover-audit",
      service
    })
  };
}

test("generation request is written once before an image call", async () => {
  const { blobs, uploads, store } = fixtureStore();
  assert.deepEqual(await store.persistGenerationRequest(request), request);
  assert.equal(blobs.size, 1);
  assert.equal(uploads[0].options.conditions.ifNoneMatch, "*");
  assert.ok(uploads[0].name.includes(request.titleId));
  assert.deepEqual(await store.persistGenerationRequest(request), request);
  assert.equal(blobs.size, 1);
});

test("a retry has its own immutable request while replay of one attempt stays guarded", async () => {
  const { store, blobs } = fixtureStore();
  await store.persistGenerationRequest(request);
  const retry = { ...request, executionId: "adcdb772-8d4b-45bd-b021-d428a0827205", requestedAt: "2026-09-30T13:00:00.000Z" };
  assert.deepEqual(await store.persistGenerationRequest(retry), retry);
  assert.equal(blobs.size, 2);
  await assert.rejects(
    store.persistGenerationRequest({ ...request, modelDeployment: "other-model" }),
    /COVER_GENERATION_REQUEST_CONFLICT/
  );
});

test("request store fails closed on malformed identity and storage authority", async () => {
  assert.throws(() => createCoverGenerationRequestStore({ serviceUrl: "http://localhost", containerName: "x", service: {} }), /COVER_REQUEST_STORE_URL_INVALID/);
  const { store } = fixtureStore();
  await assert.rejects(store.persistGenerationRequest({ ...request, titleId: "not-a-title" }), /COVER_GENERATION_REQUEST_INVALID/);
});
