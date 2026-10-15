"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), { createHash } = require("node:crypto");
const { executeAttempt } = require("../src/editorial/stage07BudgetedAttempt");
const budget = require("../src/editorial/stage07BatchBudget");
function fixture() {
  const input = { attemptId: "one", taskId: "edit-one", planSha256: "a".repeat(64), request: { source: "synthetic" } };
  let state = budget.createState({ approvalReference: "synthetic-test", planSha256: input.planSha256, taskIds: [input.taskId] });
  let version = 0, calls = 0;
  const receipts = new Map();
  const authority = { planSha256: input.planSha256, requestSha256: createHash("sha256").update(JSON.stringify(input.request)).digest("hex"),
    model: "claude-sonnet-5", modelVersion: "2", deploymentName: "jm1-editorial-devline-primary",
    maxProviderRetries: 0, allowFallback: false, sourceAndStageVerified: true, tariffVerified: true, current: true,
    inputTokenBound: 1000, maxOutputTokens: 8192, inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10 };
  const result = { ok: true, model: authority.model, modelVersion: authority.modelVersion,
    providerRequestId: "synthetic-request", usageVerified: true, inputTokens: 100, outputTokens: 200, output: { complete: true } };
  const deps = { verifyAuthority: async () => authority, readReceipt: async id => receipts.get(id),
    writeReceipt: async (id, value) => { assert.equal(receipts.has(id), false); receipts.set(id, value); },
    callOnce: async () => { calls++; return result; }, validateOutput: async () => true,
    store: { read: async () => ({ etag: version, value: structuredClone(state) }),
      compareAndSwap: async (etag, next) => { if (etag !== version) return false; state = next; version++; return true; } } };
  return { input, deps, authority, result, receipts, calls: () => calls, state: () => state };
}
test("durable result replay settles once and never dispatches twice", async () => {
  const f = fixture();
  assert.equal((await executeAttempt(f.input, f.deps)).status, "OUTPUT_VALIDATED");
  assert.equal((await executeAttempt(f.input, f.deps)).replay, true);
  assert.equal(f.calls(), 1); assert.equal(budget.exposure(f.state()), 2200);
});
test("source restoration preserves raw response and is replayed without another billable attempt", async () => {
  const f = fixture();
  f.deps.restoreSource = () => ({ method: "EXACT_SOURCE_WHITESPACE_RESTORATION_V1", output: { restored: true }, restored: [{ index: 0 }] });
  f.deps.validateOutput = output => output.restored === true;
  assert.equal((await executeAttempt(f.input, f.deps)).status, "OUTPUT_VALIDATED");
  assert.deepEqual(f.receipts.get("one").result.output, { complete: true });
  assert.equal(f.receipts.get("one").sourceRestoration.output.restored, true);
  assert.equal((await executeAttempt(f.input, f.deps)).replay, true);
  assert.equal(f.calls(), 1);
});
test("unknown timeout and restart retain reservation without retry", async () => {
  const f = fixture(); f.deps.callOnce = async () => { throw Error("timeout"); };
  assert.equal((await executeAttempt(f.input, f.deps)).reservationRetained, true);
  assert.equal((await executeAttempt(f.input, f.deps)).dispatch, false);
  assert.equal(budget.exposure(f.state()), 83920);
});
test("failed receipt persistence cannot authorize another provider call", async () => {
  const f = fixture(); f.deps.writeReceipt = async () => { throw Error("storage unavailable"); };
  await assert.rejects(executeAttempt(f.input, f.deps), /storage unavailable/);
  assert.equal((await executeAttempt(f.input, f.deps)).status, "UNRESOLVED_PROVIDER_ATTEMPT");
  assert.equal(f.calls(), 1);
});
test("billable rejected output settles spending but not editorial success", async () => {
  const f = fixture(); f.result.stopReason = "max_tokens";
  assert.equal((await executeAttempt(f.input, f.deps)).status, "OUTPUT_REJECTED");
  assert.equal(budget.exposure(f.state()), 2200); assert.equal(f.state().attempts[0].outcome, "FAILED");
});
test("missing usage keeps the full reservation", async () => {
  const f = fixture(); f.result.usageVerified = false;
  assert.equal((await executeAttempt(f.input, f.deps)).status, "USAGE_RECONCILIATION_REQUIRED");
  assert.equal(budget.exposure(f.state()), 83920);
});
test("model or tariff uncertainty prevents any reservation or inference", async () => {
  const f = fixture(); f.authority.modelVersion = "3";
  await assert.rejects(executeAttempt(f.input, f.deps), /STAGE07_PREFLIGHT_HOLD/);
  assert.equal(f.calls(), 0); assert.equal(f.state().attempts.length, 0);
});
