"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  keyFor, persistStageEvent, validateEvent
} = require("../src/lifecycle/stageRuntimeJournal");

const TITLE = "daf8180f-85a3-f111-b8de-000d3a14673b";
const STAGE = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";

function event(eventType, sourceEventId, actorClass = "SYSTEM") {
  const value = {
    schemaVersion: 1, eventType, titleId: TITLE, stageId: STAGE,
    stageCode: "07_DEVELOPMENTAL_EDITING", executionId: "test-execution",
    sourceEventId, timestamp: "2026-10-01T00:00:00.000Z", actorClass,
    evidenceReference: `dataverse://jm1_executionlogs/${sourceEventId}`
  };
  return { ...value, idempotencyKey: keyFor(value) };
}

function fakeContainer() {
  const values = new Map();
  return {
    values,
    async createIfNotExists() {},
    getBlockBlobClient(name) {
      return {
        async getProperties() {
          const row = values.get(name);
          if (!row) throw { statusCode: 404 };
          return { etag: String(row.version) };
        },
        async downloadToBuffer(_offset, _count, options) {
          const row = values.get(name);
          if (!row) throw { statusCode: 404 };
          if (options.conditions.ifMatch !== String(row.version)) throw { statusCode: 412 };
          return Buffer.from(row.data);
        },
        async uploadData(bytes, options) {
          const row = values.get(name);
          if (options.conditions.ifNoneMatch === "*" && row) throw { statusCode: 412 };
          if (options.conditions.ifMatch && (!row || options.conditions.ifMatch !== String(row.version))) {
            throw { statusCode: 412 };
          }
          values.set(name, { data: bytes.toString(), version: (row?.version || 0) + 1 });
        }
      };
    }
  };
}

const authorized = async () => ({ titleId: TITLE, stageId: STAGE, stageCode: "07_DEVELOPMENTAL_EDITING", current: true });

test("durably records events and returns the same result on replay", async () => {
  const containerClient = fakeContainer();
  const eligible = event("STAGE_ELIGIBLE", "source-1");
  const deps = { containerClient, authorize: authorized };
  const first = await persistStageEvent(eligible, deps);
  assert.equal(first.phase, "ELIGIBLE");
  assert.equal((await persistStageEvent(eligible, deps)).status, "DUPLICATE");
  const start = await persistStageEvent(event("STAGE_STARTED", "source-2"), deps);
  assert.equal(start.phase, "RUNNING");
  const journal = JSON.parse(containerClient.values.get(first.blobName).data);
  assert.equal(journal.events.length, 2);
});

test("concurrent duplicate messages commit only one journal event", async () => {
  const containerClient = fakeContainer();
  const deps = { containerClient, authorize: authorized };
  const results = await Promise.all([
    persistStageEvent(event("STAGE_ELIGIBLE", "source-1"), deps),
    persistStageEvent(event("STAGE_ELIGIBLE", "source-1"), deps)
  ]);
  assert.deepEqual(results.map((item) => item.status).sort(), ["DUPLICATE", "RECORDED"]);
  assert.equal(JSON.parse([...containerClient.values.values()][0].data).events.length, 1);
});

test("rejects a replay whose evidence or actor changed under the same idempotency key", async () => {
  const containerClient = fakeContainer();
  const deps = { containerClient, authorize: authorized };
  const original = event("STAGE_ELIGIBLE", "source-1");
  await persistStageEvent(original, deps);
  await assert.rejects(persistStageEvent({
    ...original, evidenceReference: "dataverse://jm1_executionlogs/other"
  }, deps), /IDEMPOTENCY_PAYLOAD_MISMATCH/);
  await assert.rejects(persistStageEvent({
    ...original, actorClass: "HUMAN"
  }, deps), /IDEMPOTENCY_PAYLOAD_MISMATCH/);
  assert.equal(JSON.parse([...containerClient.values.values()][0].data).events.length, 1);
});

test("does not record completion, advancement or gate resolution without live verification", async () => {
  const containerClient = fakeContainer();
  const deps = { containerClient, authorize: authorized };
  await persistStageEvent(event("STAGE_ELIGIBLE", "source-1"), deps);
  await persistStageEvent(event("STAGE_STARTED", "source-2"), deps);
  await assert.rejects(persistStageEvent(event("STAGE_COMPLETED", "source-3"), deps), /COMPLETION_NOT_VERIFIED/);
  await persistStageEvent(event("HUMAN_ACTION_REQUIRED", "source-4"), deps);
  await assert.rejects(persistStageEvent(event("HUMAN_ACTION_COMPLETED", "source-5", "HUMAN"), deps), /GATE_NOT_VERIFIED/);
  assert.equal(JSON.parse([...containerClient.values.values()][0].data).events.length, 3);
});

test("rejects changed keys and mismatched live stage", async () => {
  const valid = event("STAGE_ELIGIBLE", "source-1");
  assert.throws(() => validateEvent({ ...valid, schemaVersion: 2 }), /EVENT_INVALID/);
  assert.throws(() => validateEvent({ ...valid, schemaVersion: undefined }), /EVENT_INVALID/);
  assert.throws(() => validateEvent({ ...valid, stageCode: "08_LINE_EDITING" }), /EVENT_INVALID/);
  await assert.rejects(persistStageEvent(valid, {
    containerClient: fakeContainer(),
    authorize: async () => ({ titleId: TITLE, stageId: STAGE, stageCode: "08_LINE_EDITING", current: true })
  }), /LIVE_AUTHORITY_MISMATCH/);
});
