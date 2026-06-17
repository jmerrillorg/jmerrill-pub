"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { validateNoQuotation, VALIDATED_FIELDS } = require("../src/validation/noQuotationValidator");

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertValid(result) {
  assert.equal(result.valid, true, `Expected valid but got violations: ${JSON.stringify(result.violations)}`);
  assert.deepEqual(result.violations, []);
}

function assertViolation(result, rule, field) {
  assert.equal(result.valid, false, "Expected invalid but got valid");
  const v = result.violations.find(v => v.rule === rule && (field == null || v.field === field));
  assert.ok(v != null, `Expected violation {rule:${rule}, field:${field}} but got: ${JSON.stringify(result.violations)}`);
}

function assertNoTextLeakInViolations(result) {
  for (const v of result.violations) {
    // The violation description may reference the rule but must not include
    // the offending content itself (no reconstructed prose, no extracted text)
    assert.ok(!("offendingText" in v), "Violation must not include offendingText");
    assert.ok(!("excerpt" in v), "Violation must not include excerpt");
    assert.ok(!("content" in v), "Violation must not include content");
  }
}

// ── Valid characterization outputs ───────────────────────────────────────────

describe("validateNoQuotation — valid characterization", () => {
  test("clean summary field passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Manuscript demonstrates strong commercial fiction instincts with clear genre alignment and accessible voice. Recommended path: JM Works. Confidence: high."
    });
    assertValid(result);
    assert.ok(result.fieldsChecked.includes("jm1_diagnosticoutputsummary"));
  });

  test("clean risk flags field passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticriskflags: "No hard-stop triggers detected. Ethics review: not indicated. Legal/defamation: not indicated. Brand misalignment: not indicated."
    });
    assertValid(result);
  });

  test("clean execution error field passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticexecutionerror: "Extraction succeeded. No runtime errors."
    });
    assertValid(result);
  });

  test("clean human review notes pass", () => {
    const result = validateNoQuotation({
      jm1_humanreviewnotes: "Output reviewed. Characterization appears appropriate for Stage 0. No excerpts detected."
    });
    assertValid(result);
  });

  test("clean structured JSON output passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({
        imprintRecommendation: "JM Works",
        packageCategory: "Standard",
        authorReadinessScore: 4,
        timelineFit: true,
        humanReviewTriggers: [],
        riskFlags: { ethicsHardStop: false, legalDefamation: false, brandMisalignment: false }
      })
    });
    assertValid(result);
  });

  test("null field values are skipped without violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: null,
      jm1_diagnosticriskflags: null
    });
    assertValid(result);
  });

  test("empty string field is skipped without violation", () => {
    const result = validateNoQuotation({ jm1_diagnosticoutputsummary: "" });
    assertValid(result);
  });

  test("all five validated fields with clean content passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Genre-aligned manuscript with strong commercial potential. JM Works pathway recommended.",
      jm1_diagnosticstructuredoutputjson: JSON.stringify({ imprintRecommendation: "JM Works", score: 4 }),
      jm1_diagnosticriskflags: "No risk flags triggered.",
      jm1_diagnosticexecutionerror: null,
      jm1_humanreviewnotes: null
    });
    assertValid(result);
    assert.ok(result.fieldsChecked.length >= 3);
  });

  test("violation object never contains offending text", () => {
    // Even when violations exist, no text must leak
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: '"The fox jumped over the lazy dog in the meadow" — this is a direct quotation.'
    });
    assert.equal(result.valid, false);
    assertNoTextLeakInViolations(result);
  });
});

// ── QUOTED_CONTENT rule ───────────────────────────────────────────────────────

describe("validateNoQuotation — QUOTED_CONTENT rule", () => {
  test("ASCII double-quoted span with 4+ words triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: 'The manuscript opens with "the dark and stormy night that changed everything forever" as its first line.'
    });
    assertViolation(result, "QUOTED_CONTENT", "jm1_diagnosticoutputsummary");
  });

  test("Unicode curly-quoted span with 4+ words triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "The author writes “the protagonist walked slowly through the ancient forest of her ancestors” early in chapter one."
    });
    assertViolation(result, "QUOTED_CONTENT", "jm1_diagnosticoutputsummary");
  });

  test("quoted span in risk flags triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticriskflags: 'Potential defamation flag: passage states "the defendant was known to falsify documents routinely in the office".'
    });
    assertViolation(result, "QUOTED_CONTENT", "jm1_diagnosticriskflags");
  });

  test("short quoted word (< 4 words, short span) does not trigger violation", () => {
    // A short title-like quote is acceptable
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: 'Genre: "dark fantasy". Imprint: JM Works.'
    });
    // 2-word span inside quotes — below threshold
    assertValid(result);
  });
});

// ── PROMPT_LEAKAGE rule ───────────────────────────────────────────────────────

describe("validateNoQuotation — PROMPT_LEAKAGE rule", () => {
  test("'you are a' phrase triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "You are a publishing diagnostic assistant evaluating the following submission."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });

  test("'given the manuscript' phrase triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Given the manuscript provided, the following assessment applies."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });

  test("'[knowledge base content]' placeholder triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "[knowledge base content] See imprint definitions above."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });

  test("'[manuscript text]' placeholder triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Analysis based on [manuscript text] as provided in the system prompt."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });

  test("'please analyze' phrase triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Please analyze the following manuscript submission for editorial fit."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });

  test("prompt leakage check is case-insensitive", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "YOU ARE AN AI ASSISTANT evaluating submissions."
    });
    assertViolation(result, "PROMPT_LEAKAGE", "jm1_diagnosticoutputsummary");
  });
});

// ── PROSE_BLOCK rule ──────────────────────────────────────────────────────────

describe("validateNoQuotation — PROSE_BLOCK rule", () => {
  test("field with a prose block over 300 chars triggers violation", () => {
    const longProse = "a".repeat(301);
    const result = validateNoQuotation({ jm1_diagnosticoutputsummary: longProse });
    assertViolation(result, "PROSE_BLOCK", "jm1_diagnosticoutputsummary");
  });

  test("prose block rule does not apply to JSON field", () => {
    // JSON field has its own JSON_PROSE_VALUE rule, not PROSE_BLOCK
    const longValue = "a".repeat(301);
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({ summary: longValue })
    });
    // Should get JSON_PROSE_VALUE, not PROSE_BLOCK
    const hasProse = result.violations.some(v => v.rule === "PROSE_BLOCK");
    assert.equal(hasProse, false, "PROSE_BLOCK should not apply to jm1_diagnosticstructuredoutputjson");
    assertViolation(result, "JSON_PROSE_VALUE", "jm1_diagnosticstructuredoutputjson");
  });

  test("multiple short sentences do not trigger prose block", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Genre: commercial fiction. Imprint: JM Works. Score: 4/5. Pathway: Standard. Risk: none."
    });
    assertValid(result);
  });
});

// ── JSON_PROSE_VALUE rule ─────────────────────────────────────────────────────

describe("validateNoQuotation — JSON_PROSE_VALUE rule", () => {
  test("long string value in JSON output triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({
        imprintRecommendation: "JM Works",
        summaryNote: "x".repeat(301)
      })
    });
    assertViolation(result, "JSON_PROSE_VALUE", "jm1_diagnosticstructuredoutputjson");
  });

  test("nested long string value in JSON triggers violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({
        output: { details: { note: "y".repeat(301) } }
      })
    });
    assertViolation(result, "JSON_PROSE_VALUE", "jm1_diagnosticstructuredoutputjson");
  });

  test("invalid JSON triggers INVALID_JSON violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: '{"broken": json}'
    });
    assertViolation(result, "INVALID_JSON", "jm1_diagnosticstructuredoutputjson");
  });

  test("valid JSON with all short values passes", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({
        imprint: "JM Works",
        score: 4,
        flags: [],
        path: "Standard"
      })
    });
    assertValid(result);
  });
});

// ── UNKNOWN_FIELD rule ────────────────────────────────────────────────────────

describe("validateNoQuotation — UNKNOWN_FIELD rule", () => {
  test("unknown field triggers UNKNOWN_FIELD violation", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "Clean characterization.",
      jm1_unregistered_field: "This field is not in the validated set."
    });
    assertViolation(result, "UNKNOWN_FIELD", "jm1_unregistered_field");
  });

  test("VALIDATED_FIELDS set contains exactly the expected fields", () => {
    const expected = [
      "jm1_diagnosticoutputsummary",
      "jm1_diagnosticstructuredoutputjson",
      "jm1_diagnosticriskflags",
      "jm1_diagnosticexecutionerror",
      "jm1_humanreviewnotes"
    ];
    assert.equal(VALIDATED_FIELDS.size, expected.length);
    for (const f of expected) {
      assert.ok(VALIDATED_FIELDS.has(f), `Missing field: ${f}`);
    }
  });

  test("null input returns INVALID_INPUT violation", () => {
    const result = validateNoQuotation(null);
    assert.equal(result.valid, false);
    assertViolation(result, "INVALID_INPUT");
  });

  test("non-object input returns INVALID_INPUT violation", () => {
    const result = validateNoQuotation("string");
    assert.equal(result.valid, false);
    assertViolation(result, "INVALID_INPUT");
  });
});

// ── Safety: violation objects never contain offending content ─────────────────

describe("validateNoQuotation — safety: no content in violations", () => {
  test("QUOTED_CONTENT violation contains no offending text", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: '"the author wrote this sentence which is very long and contains many words"'
    });
    assertNoTextLeakInViolations(result);
  });

  test("PROMPT_LEAKAGE violation contains no offending text", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: "You are an AI evaluating this submission for editorial fit."
    });
    assertNoTextLeakInViolations(result);
  });

  test("JSON_PROSE_VALUE violation contains no offending text", () => {
    const result = validateNoQuotation({
      jm1_diagnosticstructuredoutputjson: JSON.stringify({ prose: "z".repeat(301) })
    });
    assertNoTextLeakInViolations(result);
  });

  test("all violation objects have exactly field, rule, ruleDescription", () => {
    const result = validateNoQuotation({
      jm1_diagnosticoutputsummary: '"this is a quoted prose passage with many words"'
    });
    for (const v of result.violations) {
      const keys = Object.keys(v).sort();
      assert.deepEqual(keys, ["field", "rule", "ruleDescription"]);
    }
  });
});
