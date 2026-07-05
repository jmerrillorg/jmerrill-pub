"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  verifyManuscriptWordCount,
  PACKAGE_WORD_LIMITS,
  WORD_COUNT_SOURCE
} = require("../src/author/manuscriptWordCountVerification");

describe("verifyManuscriptWordCount — the controlled record", () => {
  test("48,246 official words for JMP-PKG-PRO is within scope (75,000 limit)", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000
    });
    assert.equal(result.ok, true);
    assert.equal(result.withinPackageScope, true);
    assert.equal(result.packageMismatch, false);
    assert.equal(result.packageWordLimit, 75000);
  });

  test("wordCountSource is always MANUSCRIPT_FILE, never the intake estimate", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000
    });
    assert.equal(result.wordCountSource, WORD_COUNT_SOURCE.MANUSCRIPT_FILE);
  });

  test("flags the intake estimate as mismatched when it differs materially from the official count", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000
    });
    assert.equal(result.intakeEstimateMismatch, true);
    assert.equal(result.intakeEstimateDelta, 38246);
  });

  test("officialManuscriptWordCount in the result is exactly the manuscript-derived figure, never the intake estimate", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000
    });
    assert.equal(result.officialManuscriptWordCount, 48246);
    assert.notEqual(result.officialManuscriptWordCount, 10000);
  });
});

describe("verifyManuscriptWordCount — package scope validation", () => {
  test("flags packageMismatch when official count exceeds the package limit", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-STARTER",
      officialManuscriptWordCount: 60000
    });
    assert.equal(result.withinPackageScope, false);
    assert.equal(result.packageMismatch, true);
  });

  test("a count exactly at the package limit is within scope (inclusive boundary)", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-STARTER",
      officialManuscriptWordCount: 50000
    });
    assert.equal(result.withinPackageScope, true);
    assert.equal(result.packageMismatch, false);
  });

  test("a count one word over the limit is flagged as a mismatch", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-STARTER",
      officialManuscriptWordCount: 50001
    });
    assert.equal(result.withinPackageScope, false);
    assert.equal(result.packageMismatch, true);
  });

  test("JMP-PKG-PREMIER is uncapped for large/complex manuscript validation", () => {
    assert.equal(PACKAGE_WORD_LIMITS["JMP-PKG-PREMIER"], null);
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PREMIER",
      officialManuscriptWordCount: 165482
    });
    assert.equal(result.withinPackageScope, null);
    assert.equal(result.packageMismatch, false);
  });

  test("JMP-PKG-CHILD has no stated word limit in the canon documents — not invented", () => {
    assert.equal(PACKAGE_WORD_LIMITS["JMP-PKG-CHILD"], null);
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-CHILD",
      officialManuscriptWordCount: 999999
    });
    assert.equal(result.withinPackageScope, null, "no limit means scope cannot be evaluated, not silently passed");
    assert.equal(result.packageMismatch, false);
  });
});

describe("verifyManuscriptWordCount — intake estimate is informational only", () => {
  test("intake estimate close to the official count is not flagged as a mismatch", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 47000
    });
    assert.equal(result.intakeEstimateMismatch, false);
  });

  test("missing intake estimate does not block validation", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246
    });
    assert.equal(result.ok, true);
    assert.equal(result.intakeEstimatedWordCount, null);
    assert.equal(result.intakeEstimateMismatch, false);
    assert.equal(result.intakeEstimateDelta, null);
  });

  test("the intake estimate never controls withinPackageScope, even if it would have passed and the official count fails", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-STARTER",
      officialManuscriptWordCount: 60000,
      intakeEstimatedWordCount: 20000
    });
    assert.equal(result.withinPackageScope, false);
    assert.equal(result.packageMismatch, true);
  });
});

describe("verifyManuscriptWordCount — input validation", () => {
  test("rejects a non-object input", () => {
    assert.equal(verifyManuscriptWordCount("not an object").ok, false);
    assert.equal(verifyManuscriptWordCount(null).ok, false);
  });

  test("rejects an unknown package code", () => {
    const result = verifyManuscriptWordCount({ selectedPackageCode: "JMP-PKG-NOPE", officialManuscriptWordCount: 10000 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SELECTED_PACKAGE_CODE_INVALID");
  });

  test("rejects a missing official word count", () => {
    const result = verifyManuscriptWordCount({ selectedPackageCode: "JMP-PKG-PRO" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OFFICIAL_WORD_COUNT_INVALID");
  });

  test("rejects a negative official word count", () => {
    const result = verifyManuscriptWordCount({ selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: -5 });
    assert.equal(result.ok, false);
  });

  test("rejects a non-integer official word count", () => {
    const result = verifyManuscriptWordCount({ selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246.5 });
    assert.equal(result.ok, false);
  });

  test("rejects a string where a number is required for official word count", () => {
    const result = verifyManuscriptWordCount({ selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: "48246" });
    assert.equal(result.ok, false);
  });
});

describe("verifyManuscriptWordCount — never touches manuscript content", () => {
  test("the only string fields in the result are short enum/code values, never manuscript-length text", () => {
    const result = verifyManuscriptWordCount({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000
    });
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string") {
        assert.ok(value.length <= 50, `${key} must be a short enum/code value, not manuscript text`);
      }
    }
  });

  test("module source never references manuscript content, file download, or Graph", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "../src/author/manuscriptWordCountVerification.js"),
      "utf8"
    );
    assert.ok(!source.includes("fetch("));
    assert.ok(!source.toLowerCase().includes("graph.microsoft"));
  });
});
