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
    getBlockBlobClient: () => ({
      uploadData: async () => {
        if (claimed) throw Object.assign(new Error("already claimed"), { statusCode: 412 });
        claimed = true;
      },
    }),
  };
  ledger.mutateMonth = async () => {
    monthlyReservations += 1;
    return { outcome: "RESERVED", event: { recordedAt: args.now } };
  };
  assert.equal((await ledger.reserve(args)).outcome, "RESERVED");
  assert.equal((await ledger.reserve({ ...args, now: "2026-10-01T00:01:00Z" })).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(monthlyReservations, 1);
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
