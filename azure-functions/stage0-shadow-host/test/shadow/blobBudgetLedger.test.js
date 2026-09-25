"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { BlobBudgetLedger } = require("../../src/shadow/blobBudgetLedger");

const args = {
  sourceEventId: "00000000-0000-4000-8000-000000000001",
  policyVersion: "v1",
  projectedCents: 5,
  now: "2026-09-30T23:59:00Z",
};

test("global claim denies the same event in a later month", async () => {
  let claimed = false;
  let monthlyReservations = 0;
  const ledger = Object.create(BlobBudgetLedger.prototype);
  ledger.ensureContainer = async () => {};
  ledger.container = {
    getBlockBlobClient: (name) => name.startsWith("claims/") ? ({
      uploadData: async () => {
        if (claimed) throw Object.assign(new Error("already claimed"), { statusCode: 412 });
        claimed = true;
      },
      download: async () => ({ readableStreamBody: (async function* () {
        yield Buffer.from(JSON.stringify({ sourceEventId: args.sourceEventId,
          policyVersion: args.policyVersion, claimedAt: args.now }));
      })() }),
    }) : ({ download: async () => ({ readableStreamBody: (async function* () {
      yield Buffer.from(JSON.stringify({ events: {
        [require("../../src/shadow/stage0BudgetPolicy").eventKey(args.sourceEventId, args.policyVersion)]:
          { status: "SUCCEEDED" },
      } }));
    })() }) }),
  };
  ledger.mutateMonth = async () => {
    monthlyReservations += 1;
    return { outcome: "RESERVED", event: { recordedAt: args.now } };
  };
  assert.equal((await ledger.reserve(args)).outcome, "RESERVED");
  assert.equal((await ledger.reserve({ ...args, now: "2026-10-01T00:01:00Z" })).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(monthlyReservations, 1);
});

test("orphaned claim is not mistaken for a completed replay", async () => {
  const ledger = Object.create(BlobBudgetLedger.prototype);
  ledger.ensureContainer = async () => {};
  ledger.container = {
    getBlockBlobClient: (name) => name.startsWith("claims/") ? ({
      uploadData: async () => { throw Object.assign(new Error("already claimed"), { statusCode: 412 }); },
      download: async () => ({ readableStreamBody: (async function* () {
        yield Buffer.from(JSON.stringify({ sourceEventId: args.sourceEventId,
          policyVersion: args.policyVersion, claimedAt: args.now }));
      })() }),
    }) : ({ download: async () => ({ readableStreamBody: (async function* () {
      yield Buffer.from(JSON.stringify({ events: {} }));
    })() }) }),
  };
  assert.equal((await ledger.reserve(args)).outcome, "INDETERMINATE_CLAIM");
});

test("claim failure does not fall through to model admission", async () => {
  const ledger = Object.create(BlobBudgetLedger.prototype);
  ledger.ensureContainer = async () => {};
  ledger.container = {
    getBlockBlobClient: () => ({ uploadData: async () => { throw new Error("storage unavailable"); } }),
  };
  ledger.mutateMonth = async () => { throw new Error("must not reserve"); };
  await assert.rejects(ledger.reserve(args), /storage unavailable/);
});

test("monthly budget mutation supplies the active lease in blob conditions", async () => {
  const ledger = Object.create(BlobBudgetLedger.prototype);
  let writeOptions;
  const blob = {
    uploadData: async (_data, options) => { writeOptions = options; },
    getBlobLeaseClient: () => ({
      leaseId: "lease-123",
      acquireLease: async () => {},
      releaseLease: async () => {},
    }),
    download: async () => ({
      etag: '"etag-123"',
      readableStreamBody: (async function* () {
        yield Buffer.from(JSON.stringify({ month: "2026-09", spentCents: 0,
          reservedCents: 0, events: {} }));
      })(),
    }),
  };
  ledger.container = { getBlockBlobClient: () => blob };
  await ledger.mutateMonth(args.now, (state) => ({ state: { ...state, reservedCents: 5 } }));
  assert.deepEqual(writeOptions.conditions, { ifMatch: '"etag-123"', leaseId: "lease-123" });
  assert.equal(writeOptions.leaseId, undefined);
});

test("durable execution evidence retains cost components without unapproved fields", async () => {
  const ledger = Object.create(BlobBudgetLedger.prototype);
  let written;
  ledger.container = { getBlockBlobClient: () => ({
    uploadData: async (data) => { written = JSON.parse(data.toString("utf8")); },
  }) };
  await ledger.recordEvidence(args.sourceEventId, args.policyVersion, {
    primaryInferenceCostCents: 7, evaluatorCostCents: 0,
    totalEventCostCents: 7, executionCostCents: 7,
    unapprovedContent: "must not persist",
  });
  assert.equal(written.primaryInferenceCostCents, 7);
  assert.equal(written.evaluatorCostCents, 0);
  assert.equal(written.totalEventCostCents, 7);
  assert.equal(written.unapprovedContent, undefined);
});
