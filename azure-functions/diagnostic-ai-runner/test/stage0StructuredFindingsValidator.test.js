"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { validateSectionAnalysisOutput } = require("../src/editorial/stage0StructuredFindingsValidator");

describe("stage0 structured findings validator", () => {
  test("rejects findings that cite unsupported segment ids", () => {
    const result = validateSectionAnalysisOutput(
      {
        segmentIdsReviewed: ["SEG-1"],
        findings: [
          {
            findingCategory: "repeated_theme",
            conciseFinding: "Same motif repeats too often.",
            sourceSegmentIds: ["SEG-9"],
            sourceEntryDates: ["January 1"],
            severity: "medium",
            confidence: 0.7,
            recommendedTreatment: "Consolidate"
          }
        ]
      },
      new Set(["SEG-1"])
    );

    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /unsupported reference SEG-9/);
  });
});
