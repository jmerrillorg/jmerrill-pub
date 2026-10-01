"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { keyFor } = require("../src/lifecycle/stageRuntimeJournal");
const { processStageEvent } = require("../src/lifecycle/stageRuntimeProcessor");

function event(eventType) {
  const value = {
    schemaVersion: 1, eventType,
    titleId: "daf8180f-85a3-f111-b8de-000d3a14673b",
    stageId: "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c",
    stageCode: "07_DEVELOPMENTAL_EDITING", executionId: "execution-1",
    sourceEventId: "source-1", timestamp: "2026-10-01T00:00:00.000Z",
    actorClass: eventType === "HUMAN_ACTION_COMPLETED" ? "HUMAN" :
      eventType === "EXTERNAL_ACTION_COMPLETED" ? "EXTERNAL_PROVIDER" : "SYSTEM",
    evidenceReference: "dataverse://jm1_executionlogs/source-1"
  };
  return { ...value, idempotencyKey: keyFor(value) };
}

function accepted(input) {
  return {
    accepted: true, idempotencyKey: input.idempotencyKey,
    titleId: input.titleId, stageId: input.stageId,
    executionId: input.executionId
  };
}

test("eligible events fail before journal write when no stage dispatcher exists", async () => {
  let writes = 0;
  await assert.rejects(processStageEvent(event("STAGE_ELIGIBLE"), {
    persistEvent: async () => { writes += 1; return { status: "RECORDED" }; }
  }), /DISPATCHSTAGE_ADAPTER_MISSING/);
  assert.equal(writes, 0);
});

test("replay repeats the same adapter key after the journal already recorded eligibility", async () => {
  const keys = [];
  let attempts = 0;
  const input = event("STAGE_ELIGIBLE");
  const deps = {
    persistEvent: async () => ({ status: ++attempts === 1 ? "RECORDED" : "DUPLICATE" }),
    dispatchStage: async (item) => { keys.push(item.idempotencyKey); return accepted(item); }
  };
  assert.equal((await processStageEvent(input, deps)).action, "ACCEPTED");
  assert.equal((await processStageEvent(input, deps)).action, "ACCEPTED");
  assert.deepEqual(keys, [input.idempotencyKey, input.idempotencyKey]);
});

test("completion cannot be acknowledged without a correlated advancement adapter", async () => {
  const input = event("STAGE_COMPLETED");
  await assert.rejects(processStageEvent(input, {
    persistEvent: async () => ({ status: "RECORDED" }),
    advanceStage: async () => ({ ...accepted(input), stageId: "00000000-0000-0000-0000-000000000000" })
  }), /ACTION_NOT_CORRELATED_OR_ACCEPTED/);
});

test("gate resolution and scheduled retry require their own durable adapters", async () => {
  for (const type of ["HUMAN_ACTION_COMPLETED", "EXTERNAL_ACTION_COMPLETED", "STAGE_RETRY_SCHEDULED"]) {
    await assert.rejects(processStageEvent(event(type), {
      persistEvent: async () => ({ status: "RECORDED" })
    }), /ADAPTER_MISSING/);
  }
});

test("non-action events remain journal-only", async () => {
  const result = await processStageEvent(event("STAGE_STARTED"), {
    persistEvent: async () => ({ status: "RECORDED", phase: "RUNNING" })
  });
  assert.equal(result.action, "JOURNAL_ONLY");
});

test("provider and human actors cannot emit system stage-control events", async () => {
  const input = event("STAGE_ELIGIBLE");
  for (const actorClass of ["HUMAN", "EXTERNAL_PROVIDER"]) {
    const changed = { ...input, actorClass };
    changed.idempotencyKey = keyFor(changed);
    await assert.rejects(processStageEvent(changed, {
      dispatchStage: async () => accepted(changed),
      persistEvent: async () => ({ status: "RECORDED" })
    }), /EVENT_ACTOR_MISMATCH/);
  }
});
