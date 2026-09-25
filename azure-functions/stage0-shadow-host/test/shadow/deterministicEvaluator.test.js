"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluate } = require("../../src/shadow/deterministicEvaluator");

const id = "00000000-0000-4000-8000-000000000001";
const input = { sourceEventId: id, sourceReferenceIds: ["SYNTHETIC_1"], approvedExcerpt: "Synthetic" };
const output = { source_event_id: id, source_reference_ids: ["SYNTHETIC_1"],
  jm1_diagnosticoutputsummary: "Synthetic summary", jm1_diagnosticriskflags: "none",
  jm1_confidence: 0.9, jm1_requireshumanreview: true };
const selection = { routeId: "STAGE_0_DIAGNOSTIC_SHADOW_ONLY" };
const event = { sourceEventId: id };

test("independent deterministic evaluator accepts only bounded, source-bound shadow output", () => {
  assert.equal(evaluate({ input, output, selection, event }).pass, true);
});

test("wrong source, identifier, or action field fails closed", () => {
  for (const invalid of [
    { ...output, source_reference_ids: ["UNKNOWN"] },
    { ...output, source_event_id: "other" },
    { ...output, sendAuthorEmail: true },
    { ...output, jm1_requireshumanreview: false },
  ]) {
    assert.equal(evaluate({ input, output: invalid, selection, event }).pass, false);
  }
});

test("wrong route cannot certify output", () => {
  assert.equal(evaluate({ input, output, selection: { routeId: "OTHER" }, event }).pass, false);
});
