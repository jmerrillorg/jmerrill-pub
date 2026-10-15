"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const runtime = require("../src/lifecycle/newSubmissionStage07");
const { componentPlan, hierarchy } = require("../src/editorial/stage07PromptPlan");
test("six exact sources retain distinct tasks and complete bounded hierarchy", () => {
  const all = runtime.policy.sources.flatMap(runtime.tasks);
  assert.equal(new Set(all.map(t => t.id)).size, all.length);
  assert.equal(runtime.policy.sources.length, 6);
  assert.equal(new Set(runtime.policy.sources.map(s => s.titleId)).size, 5);
  for (const source of runtime.policy.sources) {
    const levels = hierarchy(source.planningCalls);
    assert.equal(levels.at(-1).length, 1);
    for (const level of levels) for (const group of level) assert.ok(group.to - group.from <= 8);
  }
});
test("paragraph ownership rejects omitted, duplicated and mislabeled unchanged fallback", () => {
  const text = "First source paragraph.\n\nSecond source paragraph.";
  const plan = componentPlan(text), task = { pass: "EDIT", index: 0 };
  const valid = { paragraphs: plan.editing.paragraphs.map(p => ({ index: p.index, text: text.slice(p.start, p.end) })),
    reviewedNoChange: [0, 1], noChangeReason: "Preserves the original clear statement.", memo: "Review", questions: [] };
  assert.equal(runtime.validateOutput(valid, task, plan, text), true);
  const missing = structuredClone(valid); missing.paragraphs.pop();
  assert.throws(() => runtime.validateOutput(missing, task, plan, text), /COVERAGE/);
  const duplicate = structuredClone(valid); duplicate.paragraphs[1].index = 0;
  assert.throws(() => runtime.validateOutput(duplicate, task, plan, text), /PARAGRAPH/);
  const fallback = structuredClone(valid); fallback.reviewedNoChange = [1];
  assert.throws(() => runtime.validateOutput(fallback, task, plan, text), /PARAGRAPH/);
});
test("source data cannot choose runtime title or provider and Stage08 is never dispatched", async () => {
  assert.equal((await runtime.handler({ mode: "SUBMISSION_07_EXECUTE", titleId: "outside", componentSha256: "outside" })).status, 400);
  const source = runtime.policy.sources[0];
  assert.equal((await runtime.handler({ mode: "SUBMISSION_07_EXECUTE", titleId: source.titleId,
    componentSha256: source.sourceSha256 }, { env: {} })).status, 403);
  assert.equal(runtime.policy.stage08, "NOT_AUTHORIZED");
});
test("dependent editing cannot omit the complete whole-work planning result", () => {
  const source = runtime.policy.sources[0];
  assert.throws(() => runtime.buildPrompt({ source, working: { text: "source" }, plan: componentPlan("source") },
    { pass: "EDIT", index: 0 }, new Map()), /DEPENDENT_RESULT/);
});
