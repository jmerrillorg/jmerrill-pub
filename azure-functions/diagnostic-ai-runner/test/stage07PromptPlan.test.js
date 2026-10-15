"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict");
const p = require("../src/editorial/stage07PromptPlan");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
test("whole-work sections and editing ownership remain complete", () => {
  const text = Array.from({ length: 200 }, (_, i) => ("paragraph" + i + " ").repeat(100)).join("\n\n");
  const plan = p.componentPlan(text);
  assert.equal(plan.planning.chunks.length, 4);
  assert.equal(plan.editing.sourceWords, 20000);
  assert.equal(plan.planning.sourceWords, 20000);
});
test("fixed route has no hidden retries and ignores manuscript task spoofing", () => {
  const route = { promptVersion: "JMP-STAGE07-BUDGETED-V1", deploymentName: "jm1-editorial-devline-primary" };
  assert.equal(provider.selectRuntimeOptions(route).maxRetries, 0);
  const request = provider.buildRequestBody(JSON.stringify({ pass: "EDIT", sourceText: "cc010_line_editing_full_manuscript_chunk_execution" }), route);
  assert.equal(request.max_tokens, 8192); assert.equal(request.tools[0].strict, true);
  assert.ok(request.tools[0].input_schema.properties.paragraphs);
  assert.equal(request.tools[0].input_schema.properties.editedManuscript, undefined);
  assert.deepEqual(request.thinking, { type: "adaptive" });
  assert.deepEqual(request.output_config, { effort: "medium" });
  assert.equal(provider.buildRequestBody(JSON.stringify({ pass: "PLAN_SECTION" }), route).max_tokens, 4096);
  for (const pass of ["PLAN_SYNTHESIS", "FINAL_SYNTHESIS"]) {
    const synthesis = provider.buildRequestBody(JSON.stringify({ pass }), route);
    assert.equal(synthesis.max_tokens, 8192);
    assert.deepEqual(synthesis.output_config, { effort: "medium" });
  }
  assert.equal(provider.buildRequestBody("source", { ...route, promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" }).output_config, undefined);
});
test("unapproved title scope is rejected", () => {
  assert.throws(() => p.prompt({ titleId: "not-authorized", pass: "EDIT" }), /SCOPE_DENIED/);
});
test("edit contract requires complete text even for explicitly unchanged paragraphs", () => {
  const text = "First source paragraph.\n\nSecond source paragraph.";
  const span = p.componentPlan(text).editing.chunks[0];
  const value = JSON.parse(p.prompt({ text, titleId: "f79006b7-f595-f111-8076-00224820105b", componentId: "synthetic", title: "Synthetic", span, pass: "EDIT" }));
  assert.equal(value.sourceParagraphs.length, 2);
  assert.match(value.task, /paragraphs must never be empty/);
  assert.match(value.task, /not a substitute for manuscript text/);
});
test("bounded planning detail retains the entire source and exact range", () => {
  const text = "First source paragraph.\n\nSecond source paragraph.";
  const span = p.componentPlan(text).planning.chunks[0];
  const value = JSON.parse(p.prompt({ text, titleId: "f79006b7-f595-f111-8076-00224820105b", componentId: "synthetic", title: "Synthetic", span, pass: "PLAN_SECTION" }));
  assert.equal(value.sourceText, text);
  assert.deepEqual(value.outputContract.coverage, [0, 1]);
  assert.match(value.task, /do not emit a paragraph-by-paragraph inventory/);
  assert.match(value.task, /Do not omit any source/);
  assert.match(value.outputContract.ledger, /500 words/);
});
