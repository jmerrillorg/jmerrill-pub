"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), { createHash } = require("node:crypto");
const { restore } = require("../src/editorial/stage07SourceRestoration"), runtime = require("../src/lifecycle/newSubmissionStage07");
const { componentPlan } = require("../src/editorial/stage07PromptPlan");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function fixture() {
  const text = "Original\u00a0source  words.\n\nPreserved second paragraph.", plan = componentPlan(text), task = { id: "component/EDIT/0", pass: "EDIT", index: 0 };
  const output = { paragraphs: [{ index: 0, text: "Original source words." }, { index: 1, text: "Preserved second paragraph." }],
    reviewedNoChange: [0, 1], noChangeReason: "Source wording is deliberately retained after review.", memo: "Retain these source paragraphs.", questions: [] };
  return { text, plan, task, output };
}
test("only explicitly unchanged whitespace equivalents restore exact source bytes", () => {
  const f = fixture(), raw = structuredClone(f.output), result = restore(f.output, f.task, f.plan, f.text);
  assert.deepEqual(f.output, raw);
  assert.deepEqual(result.restored.map(p => p.index), [0]);
  assert.equal(runtime.validateOutput(result.output, f.task, f.plan, f.text), true);
  assert.equal(result.output.paragraphs[0].text, "Original\u00a0source  words.");
  f.output.paragraphs[0].text = "Invented source words.";
  assert.equal(restore(f.output, f.task, f.plan, f.text), null);
  assert.throws(() => runtime.validateOutput(f.output, f.task, f.plan, f.text), /PARAGRAPH_INVALID/);
  f.output = raw; f.output.reviewedNoChange = [1];
  assert.equal(restore(f.output, f.task, f.plan, f.text), null);
});
test("historical recovery binds paid receipt and is deterministic without rewriting its failed outcome", () => {
  const f = fixture(), prepared = { source: { sourceSha256: "component" }, working: { text: f.text }, plan: f.plan };
  const receipt = { accepted: false, attemptId: "attempt", taskId: f.task.id, planSha256: runtime.planSha, requestSha256: "request",
    result: { ok: true, stopReason: "tool_use", usageVerified: true, providerRequestId: "provider", model: runtime.policy.model,
      modelVersion: runtime.policy.modelVersion, inputTokens: 100, outputTokens: 100, output: f.output } };
  const prior = { id: "attempt", taskId: f.task.id, status: "SETTLED", outcome: "FAILED", requestSha256: "request",
    actualMicroUsd: 1200, receiptReference: `stage07-attempt:attempt:${hash(receipt)}` };
  const before = structuredClone({ prior, receipt });
  const result = runtime.recoverSourceWhitespace(prior, receipt, prepared, f.task);
  assert.equal(result.newPaidAttempts, 0); assert.equal(result.originalPaidMicroUsd, 1200);
  assert.deepEqual(result, runtime.recoverSourceWhitespace(prior, receipt, prepared, f.task));
  assert.deepEqual({ prior, receipt }, before);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, receiptReference: "wrong" }, receipt, prepared, f.task), null);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, status: "UNKNOWN" }, receipt, prepared, f.task), null);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, actualMicroUsd: 0 }, receipt, prepared, f.task), null);
});
