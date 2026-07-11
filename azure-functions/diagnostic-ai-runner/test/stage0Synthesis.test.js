"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { buildMonthlySyntheses, buildQuarterlySyntheses } = require("../src/editorial/stage0Synthesis");

describe("stage0 synthesis", () => {
  test("preserves monthly and quarterly evidence linkage from the findings ledger", () => {
    const segments = [
      { segmentId: "SEG-1", month: "January", quarter: "Q1" },
      { segmentId: "SEG-2", month: "January", quarter: "Q1" },
      { segmentId: "SEG-3", month: "February", quarter: "Q1" },
    ];

    const ledger = [
      {
        findingId: "FND-1",
        sourceSegmentIds: ["SEG-1"],
        sourceEntryDates: ["January 1"],
        findingCategory: "transition",
        conciseFinding: "January opening needs stronger handoff."
      },
      {
        findingId: "FND-2",
        sourceSegmentIds: ["SEG-3"],
        sourceEntryDates: ["February 14"],
        findingCategory: "pacing_issue",
        conciseFinding: "Late-February deepening runs hot."
      }
    ];

    const monthly = buildMonthlySyntheses(segments, ledger);
    const quarterly = buildQuarterlySyntheses(monthly);

    assert.equal(monthly.length, 2);
    assert.equal(monthly.find((m) => m.month === "January").findingIds[0], "FND-1");
    assert.equal(monthly.find((m) => m.month === "February").findingIds[0], "FND-2");
    assert.equal(quarterly.length, 1);
    assert.ok(quarterly[0].contributingFindingIds.includes("FND-1"));
    assert.ok(quarterly[0].contributingFindingIds.includes("FND-2"));
  });
});
