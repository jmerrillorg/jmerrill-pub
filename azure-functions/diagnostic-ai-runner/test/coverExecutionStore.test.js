"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Readable } = require("node:stream");
const { createCoverExecutionStore } = require("../src/production/coverExecutionStore");

function fixture(options = {}) {
  const blobs = new Map();
  let version = 0;
  const service = { getContainerClient: () => ({ getBlockBlobClient: (name) => ({
    upload: async (body, _length, options) => {
      const current = blobs.get(name);
      if (options.conditions.ifNoneMatch === "*" && current) throw Object.assign(new Error("exists"), { statusCode: 412 });
      if (options.conditions.ifMatch && options.conditions.ifMatch !== current?.etag) {
        throw Object.assign(new Error("stale"), { statusCode: 412 });
      }
      blobs.set(name, { body, etag: `"${++version}"` });
    },
    download: async () => {
      const current = blobs.get(name);
      return { etag: current.etag, readableStreamBody: Readable.from([current.body]) };
    }
  }) }) };
  return createCoverExecutionStore({ serviceUrl: "https://stjm1diagrunner.blob.core.windows.net",
    containerName: "cover-audit", service, ...options });
}

const key = "a".repeat(64);
test("atomic reservation prevents a second in-flight execution and returns completed replay", async () => {
  const store = fixture();
  const first = await store.reserveExecution(key);
  assert.equal(first.status, "ACQUIRED");
  assert.equal((await store.reserveExecution(key)).status, "IN_PROGRESS");
  const record = { executionId: first.executionId, concepts: ["A", "B"] };
  await store.completeExecution(key, record);
  assert.deepEqual(await store.reserveExecution(key), { status: "EXISTING", record });
});

test("failed attempt retries under a new execution ID; stale completion is denied", async () => {
  const store = fixture();
  const first = await store.reserveExecution(key);
  await store.failExecution(key, { executionId: first.executionId, code: "COVER_IMAGE_PROVIDER_FAILED" });
  const retry = await store.reserveExecution(key);
  assert.equal(retry.status, "ACQUIRED");
  assert.notEqual(retry.executionId, first.executionId);
  await assert.rejects(store.completeExecution(key, { executionId: first.executionId }), /COVER_EXECUTION_STALE_TRANSITION/);
  await store.completeExecution(key, { executionId: retry.executionId });
});

test("expired in-progress attempt can be atomically superseded", async () => {
  let current = new Date("2026-09-30T12:00:00.000Z");
  const store = fixture({ now: () => current, staleAfterMs: 5 * 60 * 1000 });
  const first = await store.reserveExecution(key);
  current = new Date("2026-09-30T12:05:01.000Z");
  const retry = await store.reserveExecution(key);
  assert.equal(retry.status, "ACQUIRED");
  assert.notEqual(retry.executionId, first.executionId);
  await assert.rejects(store.completeExecution(key, { executionId: first.executionId }), /COVER_EXECUTION_STALE_TRANSITION/);
  await store.completeExecution(key, { executionId: retry.executionId });
});
