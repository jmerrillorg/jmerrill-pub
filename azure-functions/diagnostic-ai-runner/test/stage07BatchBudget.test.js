"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const b = require("../src/editorial/stage07BatchBudget");
const hash = "a".repeat(64);
test("concurrent initialization cannot reset a live ledger and readback uses one snapshot", async () => {
  const initial = b.createState({ approvalReference: "approval", planSha256: hash, taskIds: ["one"] });
  let value, version = 0, downloads = 0;
  const blob = {
    async exists() { return false; },
    async getProperties() { throw Error("split metadata/body read is forbidden"); },
    async uploadData(bytes, options) {
      assert.equal(options.conditions.ifNoneMatch, "*");
      if (value) throw Object.assign(Error("already created"), { statusCode: 412 });
      value = JSON.parse(bytes); version++;
      value.attempts.push({ id: "one", taskId: "one", requestSha256: hash, reservedMicroUsd: 100, status: "UNKNOWN" });
    },
    async download() {
      downloads++;
      const snapshot = JSON.stringify(value), etag = String(version);
      return { etag, readableStreamBody: require("node:stream").Readable.from([snapshot]) };
    }
  };
  await Promise.all(Array.from({ length: 6 }, () => b.initialize(blob, initial)));
  const result = await b.readIfPresent(blob);
  assert.equal(result.attempts.length, 1);
  assert.equal(b.exposure(result), 100);
  assert.equal(downloads, 1);
  assert.equal(version, 1);
  assert.equal(await b.readIfPresent({ download: async () => { throw Object.assign(Error("missing"), { statusCode: 404 }); } }), null);
  await assert.rejects(b.readIfPresent({ download: async () => { throw Object.assign(Error("denied"), { statusCode: 403 }); } }), /denied/);
});
function store() {
  let value = b.createState({ approvalReference: "founder-stage07-50", planSha256: hash,
    taskIds: ["one", "two", "task", ...Array.from({ length: 10 }, (_, i) => String(i))] }), version = 0;
  return { async read() { return { value: structuredClone(value), etag: String(version) }; },
    async compareAndSwap(etag, next) { if (etag !== String(version)) return false; value = structuredClone(next); version++; return true; } };
}
const request = (id, taskId = id, maxMicroUsd = 10_000_000) => ({ id, taskId, maxMicroUsd, planSha256: hash, requestSha256: hash });
test("sixty-dollar amendment preserves prior authority and unresolved attempts with concurrent hard stop", async () => {
  const s = store(), start = await s.read();
  start.value.planSha256 = b.AMENDMENT.planSha256;
  await s.compareAndSwap(start.etag, start.value);
  await assert.rejects(b.applyApproved60Amendment(s, b.AMENDMENT_60.reference), /AMENDMENT_INVALID/);
  await b.applyApprovedAmendment(s, b.AMENDMENT.reference);
  const req = id => ({...request(id, id, 10_000_000), planSha256:b.AMENDMENT.planSha256});
  await b.reserve(s, req("one"));
  const before = await s.read();
  await assert.rejects(b.applyApproved60Amendment(s, "unapproved"), /AMENDMENT_INVALID/);
  const results = await Promise.all(Array.from({length:4}, () => b.applyApproved60Amendment(s,b.AMENDMENT_60.reference)));
  assert.equal(results.filter(r=>r.amended).length,1);
  const after = await s.read();
  assert.deepEqual(after.value.attempts,before.value.attempts);
  assert.deepEqual(after.value.budgetAmendment,before.value.budgetAmendment);
  assert.equal(after.value.maxAdditionalAttempts,12);
  assert.equal(after.value.version,4);
  assert.equal(after.value.limitMicroUsd,60_000_000);
  await b.applyApprovedAmendment(s,b.AMENDMENT.reference);
  await b.applyApproved60Amendment(s,b.AMENDMENT_60.reference);
  assert.equal((await s.read()).etag,after.etag);
  const reservations=await Promise.allSettled(Array.from({length:10},(_,i)=>b.reserve(s,req(String(i)))));
  assert.equal(reservations.filter(r=>r.status==="fulfilled").length,5);
  assert.equal(b.exposure((await s.read()).value),60_000_000);
  await assert.rejects(b.reserve(s,req("two")),/SPEND_LIMIT/);
  await assert.rejects(b.reserve(s,{...req("task"),taskId:"one"}),/UNRESOLVED/);
  assert.throws(()=>b.exposure({...after.value,limitMicroUsd:65_000_000}),/STATE_INVALID/);
  assert.throws(()=>b.exposure({...after.value,budgetAmendment60:undefined}),/AMENDMENT_INVALID/);
  assert.throws(()=>b.exposure({...after.value,maxAdditionalAttempts:13}),/STATE_INVALID/);
});
test("exact founder amendment preserves history, is replay-safe and caps concurrent exposure at 55", async () => {
  const s = store(), before = await s.read();
  before.value.planSha256 = b.AMENDMENT.planSha256;
  await s.compareAndSwap(before.etag, before.value);
  const req = id => ({ ...request(id, id, 5_000_000), planSha256: b.AMENDMENT.planSha256 });
  await b.reserve(s, req("one"));
  const pre = await s.read();
  const results = await Promise.all(Array.from({length: 4}, () => b.applyApprovedAmendment(s, b.AMENDMENT.reference)));
  assert.equal(results.filter(r => r.amended).length, 1);
  const amended = await s.read();
  assert.deepEqual(amended.value.attempts, pre.value.attempts);
  assert.equal(amended.value.maxAdditionalAttempts, 12);
  assert.equal(amended.value.limitMicroUsd, 55_000_000);
  const reserves = await Promise.allSettled(Array.from({length: 10}, (_, i) => b.reserve(s, req(String(i)))));
  assert.equal(reserves.filter(r => r.status === "fulfilled").length, 10);
  assert.equal(b.exposure((await s.read()).value), 55_000_000);
  await assert.rejects(b.reserve(s, req("two")), /SPEND_LIMIT/);
  await assert.rejects(b.reserve(s, {...req("task"), taskId:"one"}), /UNRESOLVED/);
});
test("amendment rejects another plan, arbitrary authority, tampered limits and missing provenance", async () => {
  const s = store();
  await assert.rejects(b.applyApprovedAmendment(s, b.AMENDMENT.reference), /AMENDMENT_INVALID/);
  await assert.rejects(b.applyApprovedAmendment(s, "invented"), /AMENDMENT_INVALID/);
  const snapshot = await s.read();
  snapshot.value.planSha256 = b.AMENDMENT.planSha256;
  await s.compareAndSwap(snapshot.etag, snapshot.value);
  await b.applyApprovedAmendment(s, b.AMENDMENT.reference);
  const state = (await s.read()).value;
  assert.throws(() => b.exposure({...state, limitMicroUsd:56_000_000}), /STATE_INVALID/);
  assert.throws(() => b.exposure({...state, budgetAmendment:undefined}), /AMENDMENT_INVALID/);
  assert.throws(() => b.exposure({...state, maxAdditionalAttempts:13}), /STATE_INVALID/);
});
test("capacity reservations serialize concurrent dispatch without spending on rate-limit retries", async () => {
  const s = store();
  const attempts = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => b.reserve(s,
    { ...request(String(i), String(i), 100), capacityTokens: 40000 })));
  assert.equal(attempts.filter(r => r.status === "fulfilled").length, 2);
  assert.equal((await s.read()).value.attempts.length, 2);
  assert.equal(b.exposure((await s.read()).value), 200);
});
test("concurrent reservations cannot exceed shared fifty dollar cap", async () => {
  const s = store(); const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => b.reserve(s, request(String(i)))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 5);
  assert.equal(b.exposure((await s.read()).value), b.LIMIT);
});
test("restart and duplicate reserve never authorize a second dispatch", async () => {
  const s = store(); assert.equal((await b.reserve(s, request("one"))).dispatch, true);
  assert.equal((await b.reserve(s, request("one"))).dispatch, false);
  await assert.rejects(b.reserve(s, request("two", "one")), /UNRESOLVED/);
  assert.equal(b.exposure((await s.read()).value), 10_000_000);
});
test("billable failures count and only twelve additional attempts are allowed", async () => {
  const s = store();
  for (let i = 0; i < 13; i++) {
    await b.reserve(s, request(String(i), "task", 100));
    await b.settle(s, { id: String(i), actualMicroUsd: 50, receiptReference: "provider/" + i, outcome: "FAILED" });
  }
  assert.equal(b.exposure((await s.read()).value), 650);
  await assert.rejects(b.reserve(s, request("13", "task", 100)), /RETRY_LIMIT/);
});
test("successful task replay and conflicting usage are rejected", async () => {
  const s = store(); await b.reserve(s, request("one"));
  const settlement = { id: "one", actualMicroUsd: 5, receiptReference: "provider/one", outcome: "SUCCESS" };
  await b.settle(s, settlement); assert.equal((await b.settle(s, settlement)).replay, true);
  await assert.rejects(b.reserve(s, request("two", "one")), /COMPLETED_TASK/);
  await assert.rejects(b.settle(s, { ...settlement, actualMicroUsd: 0 }), /CONFLICT/);
});
test("overage is retained and freezes the batch", async () => {
  const s = store(); await b.reserve(s, request("one", "one", 10));
  assert.equal((await b.settle(s, { id: "one", actualMicroUsd: 11, receiptReference: "provider/one", outcome: "FAILED" })).hold, true);
  await assert.rejects(b.reserve(s, request("two")), /TARIFF_OR_USAGE_HOLD/);
});
test("plan and request mismatches fail closed", async () => {
  const s = store(); await assert.rejects(b.reserve(s, { ...request("one"), planSha256: "b".repeat(64) }), /INVALID/);
  await b.reserve(s, request("one"));
  await assert.rejects(b.reserve(s, { ...request("one"), requestSha256: "b".repeat(64) }), /CONFLICT/);
  await assert.rejects(b.reserve(s, request("unlisted")), /INVALID/);
});
test("a persistence failure does not authorize dispatch", async () => {
  const s = store(); s.compareAndSwap = async () => { throw Error("STORAGE_UNAVAILABLE"); };
  await assert.rejects(b.reserve(s, request("one")), /STORAGE_UNAVAILABLE/);
});
test("malformed state cannot reset spend authority", async () => {
  const s = store(); const original = s.read;
  s.read = async () => { const result = await original(); result.value.limitMicroUsd = 100_000_000; return result; };
  await assert.rejects(b.reserve(s, request("one")), /STATE_INVALID/);
});
