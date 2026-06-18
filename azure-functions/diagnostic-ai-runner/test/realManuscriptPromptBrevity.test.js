"use strict";

/**
 * Real-manuscript prompt tests.
 *
 * CONTRACT: No AI calls. No Dataverse writes. No SharePoint download.
 * These tests inspect prompt instructions only.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRealManuscriptPilotPrompt,
  REAL_MANUSCRIPT_BREVITY_INSTRUCTIONS,
  TEXT_FIELD_MAX_CHARS
} = require("../src/functions/runStage0Diagnostic");

describe("real-manuscript pilot prompt brevity constraints", () => {
  test("exports the 240-character text-field limit", () => {
    assert.equal(TEXT_FIELD_MAX_CHARS, 240);
  });

  test("brevity instruction block contains no-quotation validator guidance", () => {
    const block = REAL_MANUSCRIPT_BREVITY_INSTRUCTIONS.join("\n").toLowerCase();
    assert.ok(block.includes("no-quotation validator"));
    assert.ok(block.includes("do not write paragraph-style prose"));
    assert.ok(block.includes("do not write long explanatory sentences"));
    assert.ok(block.includes("under 240 characters"));
    assert.ok(block.includes("do not include manuscript quotations, excerpts, or close paraphrase"));
    assert.ok(block.includes("do not include prompt text or implementation details"));
  });

  test("real-manuscript prompt contains per-field brevity instructions", () => {
    const prompt = buildRealManuscriptPilotPrompt({
      knowledgeContent: "[knowledge omitted in test]",
      manuscriptContent: "[manuscript omitted in test]"
    });
    const lower = prompt.toLowerCase();

    assert.ok(lower.includes("keep each text field under 240 characters"));
    assert.ok(lower.includes("jm1_diagnosticoutputsummary: one short characterization sentence only"));
    assert.ok(lower.includes("jm1_diagnosticriskflags: short labels only, separated by semicolons"));
    assert.ok(lower.includes("riskflags (string, required)"));
    assert.ok(lower.includes("not prose paragraphs"));
    assert.ok(lower.includes("no manuscript excerpts"));
    assert.ok(lower.includes("no quoted prose"));
  });

  test("real-manuscript prompt keeps confidence and human-review requirements strict", () => {
    const prompt = buildRealManuscriptPilotPrompt({
      knowledgeContent: "",
      manuscriptContent: ""
    });
    const lower = prompt.toLowerCase();

    assert.ok(lower.includes("jm1_confidence (number, required)"));
    assert.ok(lower.includes("between 0.0 and 1.0"));
    assert.ok(lower.includes("must be a number, not a string"));
    assert.ok(lower.includes("jm1_requireshumanreview (boolean, required)"));
    assert.ok(lower.includes("must be true"));
  });
});
