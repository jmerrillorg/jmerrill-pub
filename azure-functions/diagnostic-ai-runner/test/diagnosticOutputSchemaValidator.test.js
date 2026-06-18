"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateDiagnosticOutputSchema, REQUIRED_FIELDS } = require("../src/validation/diagnosticOutputSchemaValidator");

// ---------------------------------------------------------------------------
// REQUIRED_FIELDS constant
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — REQUIRED_FIELDS", () => {
  it("contains all four required field names", () => {
    assert.ok(REQUIRED_FIELDS.includes("jm1_diagnosticoutputsummary"));
    assert.ok(REQUIRED_FIELDS.includes("jm1_diagnosticriskflags"));
    assert.ok(REQUIRED_FIELDS.includes("jm1_confidence"));
    assert.ok(REQUIRED_FIELDS.includes("jm1_requireshumanreview"));
  });

  it("has exactly four entries", () => {
    assert.equal(REQUIRED_FIELDS.length, 4);
  });
});

// ---------------------------------------------------------------------------
// Valid input
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — valid output", () => {
  it("accepts a fully valid output object", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "The manuscript demonstrates commercial fiction conventions.",
      jm1_diagnosticriskflags: "No significant structural risk flags identified.",
      jm1_confidence: 0.82,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("accepts confidence of exactly 0.0", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.0,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, true);
  });

  it("accepts confidence of exactly 1.0", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 1.0,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, true);
  });

  it("ignores extra unknown fields without failing", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true,
      unexpected_field: "extra content"
    });
    assert.equal(result.valid, true);
  });
});

// ---------------------------------------------------------------------------
// Invalid input — wrong outer type
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — wrong outer type fails", () => {
  it("returns invalid for null", () => {
    const result = validateDiagnosticOutputSchema(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("returns invalid for undefined", () => {
    const result = validateDiagnosticOutputSchema(undefined);
    assert.equal(result.valid, false);
  });

  it("returns invalid for a string", () => {
    const result = validateDiagnosticOutputSchema("not an object");
    assert.equal(result.valid, false);
  });

  it("returns invalid for an array", () => {
    const result = validateDiagnosticOutputSchema([]);
    assert.equal(result.valid, false);
  });

  it("returns invalid for a number", () => {
    const result = validateDiagnosticOutputSchema(42);
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// jm1_diagnosticoutputsummary
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — jm1_diagnosticoutputsummary", () => {
  it("rejects missing field", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("jm1_diagnosticoutputsummary")));
  });

  it("rejects empty string", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("jm1_diagnosticoutputsummary")));
  });

  it("rejects whitespace-only string", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "   ",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects a number", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: 42,
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects null", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: null,
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// jm1_diagnosticriskflags
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — jm1_diagnosticriskflags", () => {
  it("rejects missing field", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("jm1_diagnosticriskflags")));
  });

  it("rejects empty string", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects null", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: null,
      jm1_confidence: 0.5,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// jm1_confidence
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — jm1_confidence", () => {
  it("rejects missing field", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("jm1_confidence")));
  });

  it("rejects a string representation of a number", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: "0.8",
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects null", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: null,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects value below 0.0", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: -0.01,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects value above 1.0", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 1.001,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects NaN", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: NaN,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });

  it("rejects Infinity", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: Infinity,
      jm1_requireshumanreview: true
    });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// jm1_requireshumanreview
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — jm1_requireshumanreview", () => {
  it("rejects missing field", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("jm1_requireshumanreview")));
  });

  it("rejects false", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: false
    });
    assert.equal(result.valid, false);
  });

  it("rejects the string 'true'", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: "true"
    });
    assert.equal(result.valid, false);
  });

  it("rejects 1 (truthy number)", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: 1
    });
    assert.equal(result.valid, false);
  });

  it("rejects null", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "Flags.",
      jm1_confidence: 0.5,
      jm1_requireshumanreview: null
    });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// Multiple field failures — all errors reported
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — multiple field failures", () => {
  it("reports all four field errors when output is an empty object", () => {
    const result = validateDiagnosticOutputSchema({});
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 4);
  });

  it("reports exactly the fields that are wrong", () => {
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: "Summary.",
      jm1_diagnosticriskflags: "",
      jm1_confidence: 2.0,
      jm1_requireshumanreview: false
    });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 3);
    assert.ok(result.errors.some(e => e.includes("jm1_diagnosticriskflags")));
    assert.ok(result.errors.some(e => e.includes("jm1_confidence")));
    assert.ok(result.errors.some(e => e.includes("jm1_requireshumanreview")));
    assert.ok(!result.errors.some(e => e.includes("jm1_diagnosticoutputsummary")));
  });
});

// ---------------------------------------------------------------------------
// Safety invariants
// ---------------------------------------------------------------------------

describe("diagnosticOutputSchemaValidator — safety invariants", () => {
  it("error messages never include output field values", () => {
    const sensitiveValue = "SENSITIVE MANUSCRIPT CONTENT DO NOT LOG";
    const result = validateDiagnosticOutputSchema({
      jm1_diagnosticoutputsummary: sensitiveValue,
      jm1_diagnosticriskflags: sensitiveValue,
      jm1_confidence: "not-a-number",
      jm1_requireshumanreview: false
    });
    const allErrors = result.errors.join(" ");
    assert.ok(!allErrors.includes(sensitiveValue),
      "error messages must not contain field values (which may derive from manuscript content)");
  });

  it("module exports validateDiagnosticOutputSchema and REQUIRED_FIELDS only", () => {
    const mod = require("../src/validation/diagnosticOutputSchemaValidator");
    const keys = Object.keys(mod).sort();
    assert.deepEqual(keys, ["REQUIRED_FIELDS", "validateDiagnosticOutputSchema"]);
  });

  it("fails closed on every invalid path — never returns valid=true for incomplete output", () => {
    const incompleteOutputs = [
      {},
      { jm1_diagnosticoutputsummary: "x" },
      { jm1_confidence: 0.5, jm1_requireshumanreview: true },
      null,
      "string",
      []
    ];
    for (const o of incompleteOutputs) {
      const result = validateDiagnosticOutputSchema(o);
      assert.equal(result.valid, false, `Expected invalid for: ${JSON.stringify(o)}`);
    }
  });
});
