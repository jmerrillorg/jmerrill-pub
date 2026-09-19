"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { createPaymentElectionA3ControlStore } = require("../src/agent/paymentElectionA3ControlStore");

function memoryBlobService() {
  const blobs = new Map();
  const blob = (name) => ({
    name,
    async upload(payload, _length, options) {
      assert.equal(options.conditions.ifNoneMatch, "*");
      if (blobs.has(name)) throw Object.assign(new Error("exists"), { statusCode: 412 });
      blobs.set(name, payload);
    },
    async download() {
      return { readableStreamBody: Readable.from([blobs.get(name)]) };
    }
  });
  return {
    service: {
      getContainerClient() {
        return { getBlockBlobClient: blob };
      }
    },
    blobs
  };
}

test("A3 idempotency reservation is atomic and immutable", async () => {
  const memory = memoryBlobService();
  const store = createPaymentElectionA3ControlStore({ service: memory.service, clock: () => "2026-09-19T12:00:00.000Z" });
  const first = await store.reserve("semantic-key", { planId: "plan-1" });
  const replay = await store.reserve("semantic-key", { planId: "plan-1" });
  assert.equal(first.created, true);
  assert.equal(replay.created, false);
  assert.equal(first.blobName, replay.blobName);
  assert.equal(memory.blobs.size, 1);
});

test("A3 audit records use immutable governed-agent retention metadata", async () => {
  const memory = memoryBlobService();
  const store = createPaymentElectionA3ControlStore({ service: memory.service, clock: () => "2026-09-19T12:00:00.000Z" });
  const saved = await store.audit({ event: "PAYMENT_ELECTION_A3_INVOCATION_PREPARED", planId: "plan-1", businessEffects: 0 });
  assert.equal(saved.created, true);
  assert.match(saved.blobName, /publishing\/payment-election-a3\/v1\/audit\/plan-1/);
  assert.equal(memory.blobs.size, 1);
});
