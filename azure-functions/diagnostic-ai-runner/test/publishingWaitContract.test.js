"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { RESUME_ACTION, validatePublishingWait, resumePublishingWait } = require("../src/lifecycle/publishingWaitContract");
const { createPublishingWaitResumeAdapter } = require("../src/lifecycle/publishingWaitResumeAdapter");
const { blobName, createPublishingWaitStore } = require("../src/lifecycle/publishingWaitStore");
const { processPublishingStageMessage } = require("../src/functions/runPublishingStageRuntimeWorker");
const { signalFor } = require("../src/lifecycle/publishingWaitSignal");

const id = (n) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;

function wait() {
  return {
    schemaVersion: 1, waitId: id(1), titleId: id(2), authorId: id(3),
    engagementId: id(4), lifecycleInstanceId: id(5), stageId: id(6), executionId: "stage-execution-1",
    waitType: "AUTHOR_REVIEW_RESPONSE", waitReason: "Exact delivered artifact requires author review",
    waitOwner: "AUTHOR", sourceSystem: "DATAVERSE", sourceRecordId: id(7), sourceEventId: id(8),
    createdAt: "2026-10-01T12:00:00.000Z", nextCheckAt: "2026-10-01T13:00:00.000Z",
    expiresAt: null, resumeCondition: "exact author decision bound to delivered artifact",
    resumeAction: RESUME_ACTION, idempotencyKey: "review-resume-1", status: "PENDING"
  };
}

function deps(overrides = {}) {
  const value = wait();
  const calls = [];
  return {
    calls,
    loadWait: async () => value,
    loadCanonicalAuthority: async () => ({ titleId: value.titleId, authorId: value.authorId,
      engagementId: value.engagementId, lifecycleInstanceId: value.lifecycleInstanceId,
      stageId: value.stageId, executionId: value.executionId }),
    verifyCondition: async () => ({ satisfied: true, evidenceReference: "decision-record-1" }),
    claimResume: async () => ({ claimed: true, claimId: "claim-1" }),
    dispatchExact: async () => { calls.push("dispatch"); return { accepted: true,
      idempotencyKey: value.idempotencyKey, executionId: value.executionId }; },
    markResumed: async () => { calls.push("resumed"); return { status: "RESUMED", waitId: value.waitId,
      claimId: "claim-1" }; },
    ...overrides
  };
}

test("requires exact scoped wait authority and permits explicit verified legacy bridge", () => {
  assert.equal(validatePublishingWait(wait()).status, "PENDING");
  const legacy = { ...wait(), engagementId: null, lifecycleInstanceId: null,
    authorityMode: "VERIFIED_LEGACY_BRIDGE", legacyEngagementReference: "JMP-INT-202608-JFLY01" };
  assert.equal(validatePublishingWait(legacy).authorityMode, "VERIFIED_LEGACY_BRIDGE");
  assert.throws(() => validatePublishingWait({ ...legacy, legacyEngagementReference: "" }), /ENGAGEMENT_AUTHORITY_MISSING/);
  assert.throws(() => validatePublishingWait({ ...wait(), titleId: "Whole" }), /CONTRACT_INVALID/);
  for (const resumeAction of ["ADVANCE_STAGE", "SEND_AUTHOR_EMAIL", "CHANGE_PAYMENT", "MOVE_FOLDER"]) {
    assert.throws(() => validatePublishingWait({ ...wait(), resumeAction }), /CONTRACT_INVALID/);
  }
});

test("resume rechecks live authority and source condition before dispatch", async () => {
  const adapters = deps();
  assert.deepEqual(await resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, adapters),
    { status: "RESUMED", waitId: id(1), evidenceReference: "decision-record-1" });
  assert.deepEqual(adapters.calls, ["dispatch", "resumed"]);
});

test("stale title or unproven decision cannot dispatch", async () => {
  const stale = deps({ loadCanonicalAuthority: async () => ({ titleId: id(99) }) });
  assert.equal((await resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, stale)).status, "STALE_AUTHORITY");
  assert.deepEqual(stale.calls, []);
  const unproven = deps({ verifyCondition: async () => ({ satisfied: false }) });
  assert.equal((await resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, unproven)).status,
    "CONDITION_NOT_PROVEN");
  assert.deepEqual(unproven.calls, []);
});

test("adapter absence, duplicate claim and uncorrelated dispatch fail closed", async () => {
  await assert.rejects(resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, {}), /ADAPTER_MISSING/);
  const claimed = deps({ claimResume: async () => ({ claimed: false }) });
  assert.equal((await resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, claimed)).status, "ALREADY_CLAIMED");
  assert.deepEqual(claimed.calls, []);
  const mismatch = deps({ dispatchExact: async () => ({ accepted: true, idempotencyKey: "other",
    executionId: "stage-execution-1" }) });
  await assert.rejects(resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, mismatch), /NOT_CORRELATED/);
  assert.deepEqual(mismatch.calls, []);
  const noPersistence = deps({ markResumed: async () => undefined });
  await assert.rejects(resumePublishingWait({ waitId: id(1), sourceEventId: id(9) }, noPersistence),
    /RESUME_NOT_PERSISTED/);
});

test("stage queue rejects legacy unversioned signals without creating clients or bypassing guards", async () => {
  const event = { eventType: "WAIT_RESOLVED", waitId: id(1), sourceEventId: id(9) };
  await assert.rejects(processPublishingStageMessage(event), /WAIT_SIGNAL_INVALID/);
  const adapters = deps();
  await assert.rejects(processPublishingStageMessage(JSON.stringify(event), { waitAdapters: adapters }), /WAIT_SIGNAL_INVALID/);
  assert.deepEqual(adapters.calls, []);
});

function durableDeps(overrides = {}) {
  let value = wait();
  let version = 1;
  const calls = [];
  const store = {
    read: async () => ({ value: structuredClone(value), etag: String(version) }),
    compareAndSwap: async (_id, etag, next) => {
      if (etag !== String(version)) return false;
      value = structuredClone(next);
      version += 1;
      return true;
    }
  };
  const handlers = { AUTHOR_RESPONSE_CONSUMER: {
    idempotent: true,
    dispatch: async ({ wait: item }) => {
      calls.push("author-response");
      return { accepted: true, idempotencyKey: item.idempotencyKey, executionId: item.executionId,
        dispatchResult: "ACCEPTED", businessStateResult: "AUTHOR_DECISION_CAPTURED",
        evidenceId: "author-decision-1" };
    }
  } };
  const config = {
    store,
    readAuthority: async (item) => ({ titleId: item.titleId, authorId: item.authorId,
      stageId: item.stageId, executionId: item.executionId, engagementId: item.engagementId,
      lifecycleInstanceId: item.lifecycleInstanceId }),
    verifyCondition: async () => ({ satisfied: true, evidenceReference: "decision-record-1" }),
    handlers,
    now: () => new Date("2026-10-01T14:00:00.000Z"),
    ...overrides
  };
  const adapters = createPublishingWaitResumeAdapter(config);
  return { adapters, config, calls, current: () => value, store, handlers };
}

test("durable resume records exact owner, result, evidence and idempotent replay", async () => {
  const fixture = durableDeps();
  const signal = signalFor(wait(), "decision-record-1");
  assert.equal((await processPublishingStageMessage(signal, { waitRuntime: fixture.config })).status, "RESUMED");
  assert.equal(fixture.current().resumeResult.owningRuntime, "AUTHOR_RESPONSE_CONSUMER");
  assert.equal(fixture.current().resumeResult.evidenceId, "author-decision-1");
  assert.equal(fixture.current().resumeResult.sourceEventId, signal.sourceEventId);
  assert.equal((await processPublishingStageMessage(signal, { waitRuntime: fixture.config })).status, "IDEMPOTENT");
  assert.deepEqual(fixture.calls, ["author-response"]);
});

test("stage worker wait route denies changed proof and respects dedicated enablement", async () => {
  const fixture = durableDeps();
  const forged = signalFor(wait(), "forged-proof");
  assert.equal((await processPublishingStageMessage(forged, { waitRuntime: fixture.config })).status, "SIGNAL_REJECTED");
  assert.equal(fixture.current().attempts, undefined);
  assert.deepEqual(fixture.calls, []);
  const prior = process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED;
  process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED = "false";
  try { await assert.rejects(processPublishingStageMessage(signalFor(wait(), "decision-record-1")), /RUNTIME_DISABLED/); }
  finally {
    if (prior === undefined) delete process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED;
    else process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED = prior;
  }
});

test("uncommissioned owner, unproven condition and missing durable result cannot resume", async () => {
  const signal = { waitId: id(1), sourceEventId: id(9) };
  const noOwner = durableDeps({ handlers: {} });
  await assert.rejects(resumePublishingWait(signal, noOwner.adapters), /OWNER_NOT_COMMISSIONED/);
  assert.equal(noOwner.current().status, "PENDING");
  const noCondition = durableDeps({ verifyCondition: async () => ({ satisfied: false }) });
  assert.equal((await resumePublishingWait(signal, noCondition.adapters)).status, "CONDITION_NOT_PROVEN");
  assert.equal(noCondition.current().status, "PENDING");
  const noResult = durableDeps({ handlers: { AUTHOR_RESPONSE_CONSUMER: {
    idempotent: true, dispatch: async ({ wait: item }) => ({ accepted: true,
      idempotencyKey: item.idempotencyKey, executionId: item.executionId })
  } } });
  await assert.rejects(resumePublishingWait(signal, noResult.adapters), /RESULT_EVIDENCE_MISSING/);
  assert.equal(noResult.current().status, "READY_TO_RESUME");
});

test("wait blob keys require exact IDs", () => {
  assert.equal(blobName(id(1)), `waits/${id(1)}.json`);
  assert.throws(() => blobName("Whole"), /WAIT_ID_INVALID/);
});

test("wait store reads and writes with blob ETag conditions", async () => {
  let value = null;
  let etag = "1";
  const blob = {
    getProperties: async () => {
      if (!value) throw Object.assign(new Error("missing"), { statusCode: 404 });
      return { etag };
    },
    downloadToBuffer: async () => Buffer.from(JSON.stringify(value)),
    uploadData: async (bytes, options) => {
      if (options.conditions.ifNoneMatch === "*" && value ||
          options.conditions.ifMatch && options.conditions.ifMatch !== etag) {
        throw Object.assign(new Error("conflict"), { statusCode: 412 });
      }
      value = JSON.parse(bytes.toString("utf8"));
      etag = String(Number(etag) + 1);
    }
  };
  const store = createPublishingWaitStore({ containerClient: {
    getBlockBlobClient: () => blob
  } });
  assert.equal((await store.read(id(1))).value, null);
  assert.equal(await store.compareAndSwap(id(1), null, wait()), true);
  const current = await store.read(id(1));
  assert.equal(current.value.status, "PENDING");
  assert.equal(await store.compareAndSwap(id(1), "stale", { ...wait(), status: "READY_TO_RESUME" }), false);
  assert.equal(await store.compareAndSwap(id(1), current.etag,
    { ...wait(), status: "READY_TO_RESUME" }), true);
  assert.equal((await store.read(id(1))).value.status, "READY_TO_RESUME");
});
