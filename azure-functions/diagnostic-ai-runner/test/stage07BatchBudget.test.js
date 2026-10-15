"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const b = require("../src/editorial/stage07BatchBudget");
const hash = "a".repeat(64);
function store() {
  let value = b.createState({ approvalReference: "founder-stage07-50", planSha256: hash,
    taskIds: ["one", "two", "task", ...Array.from({ length: 10 }, (_, i) => String(i))] }), version = 0;
  return { async read() { return { value: structuredClone(value), etag: String(version) }; },
    async compareAndSwap(etag, next) { if (etag !== String(version)) return false; value = structuredClone(next); version++; return true; } };
}
const request = (id, taskId = id, maxMicroUsd = 10_000_000) => ({ id, taskId, maxMicroUsd, planSha256: hash, requestSha256: hash });
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
