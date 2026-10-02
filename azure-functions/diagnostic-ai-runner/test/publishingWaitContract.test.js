"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { RESUME_ACTION, validatePublishingWait, resumePublishingWait } = require("../src/lifecycle/publishingWaitContract");
const { processPublishingStageMessage } = require("../src/functions/runPublishingStageRuntimeWorker");

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

test("queue WAIT_RESOLVED route does not create Dataverse client or bypass Publishing adapters", async () => {
  const event = { eventType: "WAIT_RESOLVED", waitId: id(1), sourceEventId: id(9) };
  await assert.rejects(processPublishingStageMessage(event), /ADAPTER_MISSING/);
  const adapters = deps();
  const result = await processPublishingStageMessage(JSON.stringify(event), { waitAdapters: adapters });
  assert.equal(result.status, "RESUMED");
  assert.deepEqual(adapters.calls, ["dispatch", "resumed"]);
});
