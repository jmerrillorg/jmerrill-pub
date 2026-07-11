"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { buildAnalysisPlan } = require("../src/editorial/stage0HierarchicalBatchPlanner");

describe("stage0 hierarchical batch planner", () => {
  test("splits oversized month batches without losing or duplicating entries", () => {
    const segments = [
      { segmentId: "SEG-1", month: "January", quarter: "Q1", entryOrdinal: 1, estimatedTokenCount: 10000, entryDate: "January 1" },
      { segmentId: "SEG-2", month: "January", quarter: "Q1", entryOrdinal: 2, estimatedTokenCount: 10000, entryDate: "January 2" },
      { segmentId: "SEG-3", month: "January", quarter: "Q1", entryOrdinal: 3, estimatedTokenCount: 10000, entryDate: "January 3" }
    ];

    const plan = buildAnalysisPlan(segments, {
      inputTokenCeiling: 24000,
      outputTokenReserve: 2000,
      maxRetries: 2
    });

    assert.equal(plan.batchCount, 2);
    assert.deepEqual(plan.batches[0].segmentIds, ["SEG-1", "SEG-2"]);
    assert.deepEqual(plan.batches[1].segmentIds, ["SEG-3"]);
  });
});
