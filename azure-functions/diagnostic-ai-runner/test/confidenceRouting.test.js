"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { routeDiagnosticResult, STATUS } = require("../src/routing/confidenceRouter");

// ── STATUS constants ──────────────────────────────────────────────────────────

describe("STATUS constants", () => {
  test("STATUS values match ADR Section 8 Dataverse choice values", () => {
    assert.equal(STATUS.COMPLETED, 835500002);
    assert.equal(STATUS.EXCEPTION, 835500003);
    assert.equal(STATUS.NEEDS_HUMAN_REVIEW, 835500004);
    assert.equal(STATUS.DEFERRED, 835500005);
  });
});

// ── Completed path (confidence >= 0.85) ──────────────────────────────────────

describe("routeDiagnosticResult — Completed (confidence >= 0.85)", () => {
  test("confidence 0.85 → Completed", () => {
    const d = routeDiagnosticResult({ confidence: 0.85 });
    assert.equal(d.status, STATUS.COMPLETED);
    assert.equal(d.statusLabel, "Completed");
    assert.equal(d.routingBasis, "CONFIDENCE_HIGH");
    assert.equal(d.lowConfidenceNote, null);
    assert.equal(d.error, null);
  });

  test("confidence 0.90 → Completed", () => {
    const d = routeDiagnosticResult({ confidence: 0.90 });
    assert.equal(d.status, STATUS.COMPLETED);
    assert.equal(d.routingBasis, "CONFIDENCE_HIGH");
  });

  test("confidence 1.0 → Completed", () => {
    const d = routeDiagnosticResult({ confidence: 1.0 });
    assert.equal(d.status, STATUS.COMPLETED);
    assert.equal(d.routingBasis, "CONFIDENCE_HIGH");
  });

  test("confidence exactly at threshold 0.85 → Completed (not Needs Human Review)", () => {
    const d = routeDiagnosticResult({ confidence: 0.85 });
    assert.notEqual(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.status, STATUS.COMPLETED);
  });
});

// ── Needs Human Review — mid confidence (0.70 <= confidence < 0.85) ───────────

describe("routeDiagnosticResult — Needs Human Review mid (0.70 ≤ confidence < 0.85)", () => {
  test("confidence 0.70 → Needs Human Review", () => {
    const d = routeDiagnosticResult({ confidence: 0.70 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.statusLabel, "Needs Human Review");
    assert.equal(d.routingBasis, "CONFIDENCE_MID");
    assert.equal(d.lowConfidenceNote, null);
    assert.equal(d.error, null);
  });

  test("confidence 0.80 → Needs Human Review", () => {
    const d = routeDiagnosticResult({ confidence: 0.80 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_MID");
    assert.equal(d.lowConfidenceNote, null);
  });

  test("confidence 0.849 → Needs Human Review (just below Completed threshold)", () => {
    const d = routeDiagnosticResult({ confidence: 0.849 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.notEqual(d.status, STATUS.COMPLETED);
    assert.equal(d.routingBasis, "CONFIDENCE_MID");
  });

  test("confidence exactly at lower threshold 0.70 → Needs Human Review mid (not low)", () => {
    const d = routeDiagnosticResult({ confidence: 0.70 });
    assert.equal(d.routingBasis, "CONFIDENCE_MID");
    assert.equal(d.lowConfidenceNote, null);
  });
});

// ── Needs Human Review — low confidence (confidence < 0.70) ──────────────────

describe("routeDiagnosticResult — Needs Human Review low (confidence < 0.70)", () => {
  test("confidence 0.50 → Needs Human Review with low-confidence note", () => {
    const d = routeDiagnosticResult({ confidence: 0.50 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_LOW");
    assert.ok(typeof d.lowConfidenceNote === "string" && d.lowConfidenceNote.length > 0);
    assert.equal(d.error, null);
  });

  test("confidence 0.0 → Needs Human Review with low-confidence note", () => {
    const d = routeDiagnosticResult({ confidence: 0.0 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_LOW");
    assert.ok(d.lowConfidenceNote != null);
  });

  test("confidence 0.699 → Needs Human Review low (just below mid threshold)", () => {
    const d = routeDiagnosticResult({ confidence: 0.699 });
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_LOW");
    assert.ok(d.lowConfidenceNote != null);
  });

  test("low-confidence note contains the numeric confidence value", () => {
    const d = routeDiagnosticResult({ confidence: 0.55 });
    assert.ok(d.lowConfidenceNote.includes("0.5500"), `Note: ${d.lowConfidenceNote}`);
  });

  test("low-confidence note does not contain manuscript text", () => {
    const d = routeDiagnosticResult({ confidence: 0.30 });
    assert.ok(!d.lowConfidenceNote.includes("manuscript content"));
    assert.ok(typeof d.lowConfidenceNote === "string");
  });
});

// ── Exception path (technicalFailure or invalid confidence) ──────────────────

describe("routeDiagnosticResult — Exception", () => {
  test("technicalFailure:true → Exception", () => {
    const d = routeDiagnosticResult({ technicalFailure: true, confidence: 0.9 });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.statusLabel, "Exception");
    assert.equal(d.routingBasis, "TECHNICAL_FAILURE");
    assert.equal(d.lowConfidenceNote, null);
    assert.equal(d.error, null);
  });

  test("confidence missing → Exception", () => {
    const d = routeDiagnosticResult({});
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
    assert.ok(typeof d.error === "string" && d.error.length > 0);
  });

  test("confidence null → Exception", () => {
    const d = routeDiagnosticResult({ confidence: null });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
  });

  test("confidence NaN → Exception", () => {
    const d = routeDiagnosticResult({ confidence: NaN });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
  });

  test("confidence string → Exception", () => {
    const d = routeDiagnosticResult({ confidence: "0.9" });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
  });

  test("confidence > 1 → Exception (out of range)", () => {
    const d = routeDiagnosticResult({ confidence: 1.01 });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
  });

  test("confidence < 0 → Exception (out of range)", () => {
    const d = routeDiagnosticResult({ confidence: -0.1 });
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_CONFIDENCE");
  });

  test("null input → Exception", () => {
    const d = routeDiagnosticResult(null);
    assert.equal(d.status, STATUS.EXCEPTION);
    assert.equal(d.routingBasis, "INVALID_INPUT");
  });
});

// ── Deferred path (manuscriptGateFailure) ────────────────────────────────────

describe("routeDiagnosticResult — Deferred (manuscriptGateFailure)", () => {
  test("manuscriptGateFailure:true → Deferred", () => {
    const d = routeDiagnosticResult({ manuscriptGateFailure: true });
    assert.equal(d.status, STATUS.DEFERRED);
    assert.equal(d.statusLabel, "Deferred");
    assert.equal(d.routingBasis, "MANUSCRIPT_GATE_FAILURE");
    assert.equal(d.lowConfidenceNote, null);
    assert.equal(d.error, null);
  });

  test("manuscriptGateFailure:true with confidence present → still Deferred (gate takes priority)", () => {
    const d = routeDiagnosticResult({ manuscriptGateFailure: true, confidence: 0.95 });
    assert.equal(d.status, STATUS.DEFERRED);
    assert.equal(d.routingBasis, "MANUSCRIPT_GATE_FAILURE");
  });

  test("manuscriptGateFailure:true with technicalFailure:true → Deferred (gate takes priority over exception)", () => {
    const d = routeDiagnosticResult({ manuscriptGateFailure: true, technicalFailure: true });
    assert.equal(d.status, STATUS.DEFERRED);
    assert.equal(d.routingBasis, "MANUSCRIPT_GATE_FAILURE");
  });
});

// ── Priority ordering ─────────────────────────────────────────────────────────

describe("routeDiagnosticResult — priority ordering", () => {
  test("manuscriptGateFailure fires before technicalFailure", () => {
    const d = routeDiagnosticResult({ manuscriptGateFailure: true, technicalFailure: true, confidence: 0.95 });
    assert.equal(d.routingBasis, "MANUSCRIPT_GATE_FAILURE");
  });

  test("technicalFailure fires before confidence-based routing", () => {
    const d = routeDiagnosticResult({ technicalFailure: true, confidence: 0.95 });
    assert.equal(d.routingBasis, "TECHNICAL_FAILURE");
    assert.equal(d.status, STATUS.EXCEPTION);
  });
});

// ── requiresHumanReview invariant ────────────────────────────────────────────

describe("routeDiagnosticResult — requiresHumanReview is always true", () => {
  const cases = [
    { label: "Completed (0.90)", input: { confidence: 0.90 } },
    { label: "Needs Human Review mid (0.75)", input: { confidence: 0.75 } },
    { label: "Needs Human Review low (0.50)", input: { confidence: 0.50 } },
    { label: "Exception (technicalFailure)", input: { technicalFailure: true } },
    { label: "Deferred (manuscriptGateFailure)", input: { manuscriptGateFailure: true } },
    { label: "Exception (missing confidence)", input: {} },
    { label: "Exception (invalid confidence)", input: { confidence: NaN } }
  ];

  for (const { label, input } of cases) {
    test(`requiresHumanReview=true for ${label}`, () => {
      const d = routeDiagnosticResult(input);
      assert.equal(d.requiresHumanReview, true, `${label}: requiresHumanReview must always be true`);
    });
  }
});
