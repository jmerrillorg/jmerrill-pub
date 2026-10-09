"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { processTitleCommissioningIntake: process, LEASE_MS } = require("../src/lifecycle/titleCommissioningIntakeWorker");
const { planTitleCommissioningRun } = require("../src/lifecycle/titleCommissioningRun");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: author } = require("../src/author/jackieTitleSystemCommissioningPolicy");

function fixture() {
  const input = { title: { jm1pub_titleid: "00000000-0000-4000-8000-000000000001", _jm1_primaryauthor_value: author },
    source: { reference: "dataverse:jm1pub_editorialartifact:00000000-0000-4000-8000-000000000002", version: "1", sha256: "a".repeat(64) },
    historyReference: "dataverse:existing-history", revision: 1 };
  const plan = planTitleCommissioningRun(input);
  let time = Date.parse("2026-10-09T12:00:00Z"); let row; let version = 0; let calls = 0;
  const missing = () => Object.assign(new Error("missing"), { statusCode: 404 });
  const conflict = () => Object.assign(new Error("conflict"), { statusCode: 412 });
  const deps = { now: () => new Date(time),
    readScope: async () => ({ enabled: true, titleId: plan.titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }),
    executeIntake: async () => { calls++; return { receipt: { executionId: plan.executionId, bindingHash: plan.bindingHash,
      status: "INTAKE_MATERIALS_VERIFIED", productionStageChanged: false } }; },
    containerClient: { getBlockBlobClient: () => ({
      getProperties: async () => { if (!row) throw missing(); return { etag: String(version) }; },
      downloadToBuffer: async (_a, _b, options) => { if (!row) throw missing(); if (options.conditions.ifMatch !== String(version)) throw conflict(); return Buffer.from(JSON.stringify(row)); },
      uploadData: async (bytes, options) => {
        if ((options.conditions.ifNoneMatch && row) || (options.conditions.ifMatch && options.conditions.ifMatch !== String(version))) throw conflict();
        row = JSON.parse(bytes.toString()); version++; return { etag: String(version) };
      }
    }) } };
  return { input, plan, deps, calls: () => calls, row: () => row, advance: ms => { time += ms; } };
}

test("durable completion survives restart and exact replay without another intake", async () => {
  const x = fixture(); const first = await process(x.input, x.deps);
  assert.equal(first.status, "COMPLETED"); assert.equal(first.productionStageChanged, false);
  assert.deepEqual(await process(x.input, { ...x.deps }), first); assert.equal(x.calls(), 1);
});
test("dependency failure is sanitized and retries only after backoff", async () => {
  const x = fixture(); const execute = x.deps.executeIntake;
  x.deps.executeIntake = async () => { throw Object.assign(new Error("private manuscript text"), { statusCode: 503 }); };
  const first = await process(x.input, x.deps); assert.equal(first.status, "RETRY_PENDING");
  assert.equal(JSON.stringify(first).includes("private manuscript"), false);
  x.deps.executeIntake = execute; assert.equal((await process(x.input, x.deps)).status, "RETRY_PENDING"); assert.equal(x.calls(), 0);
  x.advance(60000); assert.equal((await process(x.input, x.deps)).status, "COMPLETED"); assert.equal(x.calls(), 1);
});
test("concurrent claimant cannot dispatch; expired claim recovers with same execution", async () => {
  const x = fixture(); const execute = x.deps.executeIntake; let unblock;
  x.deps.executeIntake = () => new Promise(resolve => { unblock = resolve; });
  const pending = process(x.input, x.deps);
  while (!unblock) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await process(x.input, x.deps)).status, "IN_FLIGHT");
  x.advance(LEASE_MS); x.deps.executeIntake = execute;
  assert.equal((await process(x.input, x.deps)).status, "COMPLETED");
  unblock(await execute()); assert.equal((await pending).status, "CLAIM_LOST");
  assert.equal(x.row().status, "COMPLETED"); assert.equal(x.row().executionId, x.plan.executionId);
});
test("authority denial is held, not retried; revoked scope never invokes intake", async () => {
  const x = fixture(); x.deps.executeIntake = async () => { throw new Error("COMMISSIONING_AUTHOR_AUTHORITY_CHANGED"); };
  assert.equal((await process(x.input, x.deps)).status, "HELD");
  assert.equal((await process(x.input, x.deps)).status, "HELD");
  const y = fixture(); y.deps.readScope = async () => ({ enabled: false });
  await assert.rejects(process(y.input, y.deps), /SCOPE_NOT_CURRENT/); assert.equal(y.calls(), 0); assert.equal(y.row(), undefined);
});
test("retry exhaustion leaves a durable held result", async () => {
  const x = fixture(); x.deps.executeIntake = async () => { throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }); };
  for (let i = 0; i < 5; i++) { await process(x.input, x.deps); x.advance(3600000); }
  assert.equal(x.row().status, "HELD"); assert.equal(x.row().attempts, 5);
});
test("native Dataverse transient status retries without retaining response bodies", async () => {
  const x = fixture(); x.deps.executeIntake = async () => { throw Object.assign(new Error("private response"), { status: 429, body: { secret: "omitted" } }); };
  const result = await process(x.input, x.deps);
  assert.equal(result.status, "RETRY_PENDING"); assert.equal(JSON.stringify(result).includes("omitted"), false);
});
test("mismatched owner result never counts as completed", async () => {
  const x = fixture(); x.deps.executeIntake = async () => ({ receipt: { executionId: "other" } });
  assert.equal((await process(x.input, x.deps)).status, "HELD");
});
test("ordinary worker cannot reclaim an expired additional-budget recovery", async () => {
  const x = fixture();
  const state = { schemaVersion: 1, executionId: x.plan.executionId, titleId: x.plan.titleId,
    bindingHash: x.plan.bindingHash, status: "CLAIMED", attempts: 6,
    leaseUntil: "2026-01-01T00:00:00Z", additionalRecovery: { version: "bounded-owner" } };
  x.deps.containerClient = { getBlockBlobClient: () => ({ getProperties: async () => ({ etag: "one" }),
    downloadToBuffer: async () => Buffer.from(JSON.stringify(state)),
    uploadData: async () => assert.fail("ordinary worker must not mutate recovery") }) };
  assert.deepEqual(await process(x.input, x.deps), state); assert.equal(x.calls(), 0);
});
