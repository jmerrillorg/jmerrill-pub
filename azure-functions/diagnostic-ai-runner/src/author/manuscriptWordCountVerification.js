"use strict";

/**
 * Manuscript word-count verification for agreement/onboarding preparation.
 *
 * Rule: the official word count for agreement/package/addendum purposes
 * must come from the actual manuscript file, never from the /join intake
 * form's self-reported estimate. Authors may guess, estimate incorrectly,
 * or intentionally misstate the intake figure — only the manuscript-
 * derived count controls package validation, agreement preparation, and
 * production scope.
 *
 * This module is pure validation/comparison logic. The actual manuscript
 * word count must be obtained separately via the existing, already-
 * governed extraction path (fetchAndExtractManuscript in
 * pilotContentExtractor.js) — this module never downloads, reads, or
 * touches manuscript content itself, and never receives or returns the
 * manuscript text, only the numeric word count already computed
 * elsewhere.
 */

// Word-count ceilings. Premier is intentionally uncapped here: it exists
// for large and/or complex manuscripts requiring extended editorial and
// production scope, with editorial complexity as the primary factor.
// JMP-PKG-CHILD has no stated word ceiling — left null rather than invented.
const PACKAGE_WORD_LIMITS = Object.freeze({
  "JMP-PKG-STARTER": 50000,
  "JMP-PKG-PRO": 75000,
  "JMP-PKG-PREMIER": null,
  "JMP-PKG-CHILD": null
});

const WORD_COUNT_SOURCE = Object.freeze({
  MANUSCRIPT_FILE: "MANUSCRIPT_FILE",
  INTAKE_ESTIMATE: "INTAKE_ESTIMATE"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Compares the official, manuscript-derived word count against the
 * selected package's word-count ceiling, and reports whether the intake
 * estimate (if provided) differs meaningfully from the official count.
 *
 * Never accepts or returns manuscript text — word counts only.
 *
 * @param {{
 *   selectedPackageCode: string,
 *   officialManuscriptWordCount: number,
 *   intakeEstimatedWordCount?: number|null
 * }} input
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   officialManuscriptWordCount: number|null,
 *   intakeEstimatedWordCount: number|null,
 *   wordCountSource: string,
 *   selectedPackageCode: string|null,
 *   packageWordLimit: number|null,
 *   withinPackageScope: boolean|null,
 *   packageMismatch: boolean,
 *   intakeEstimateMismatch: boolean,
 *   intakeEstimateDelta: number|null
 * }}
 */
function verifyManuscriptWordCount(input = {}) {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      officialManuscriptWordCount: null,
      intakeEstimatedWordCount: null,
      wordCountSource: WORD_COUNT_SOURCE.MANUSCRIPT_FILE,
      selectedPackageCode: null,
      packageWordLimit: null,
      withinPackageScope: null,
      packageMismatch: false,
      intakeEstimateMismatch: false,
      intakeEstimateDelta: null
    };
  }

  const selectedPackageCode = normalizeString(input.selectedPackageCode).toUpperCase();
  const officialCount = input.officialManuscriptWordCount;
  const intakeEstimate =
    input.intakeEstimatedWordCount === undefined || input.intakeEstimatedWordCount === null
      ? null
      : input.intakeEstimatedWordCount;

  if (!selectedPackageCode || !(selectedPackageCode in PACKAGE_WORD_LIMITS)) {
    return {
      ok: false,
      reason: "SELECTED_PACKAGE_CODE_INVALID",
      officialManuscriptWordCount: null,
      intakeEstimatedWordCount: null,
      wordCountSource: WORD_COUNT_SOURCE.MANUSCRIPT_FILE,
      selectedPackageCode: selectedPackageCode || null,
      packageWordLimit: null,
      withinPackageScope: null,
      packageMismatch: false,
      intakeEstimateMismatch: false,
      intakeEstimateDelta: null
    };
  }

  if (!isNonNegativeInteger(officialCount)) {
    return {
      ok: false,
      reason: "OFFICIAL_WORD_COUNT_INVALID",
      officialManuscriptWordCount: null,
      intakeEstimatedWordCount: intakeEstimate,
      wordCountSource: WORD_COUNT_SOURCE.MANUSCRIPT_FILE,
      selectedPackageCode,
      packageWordLimit: PACKAGE_WORD_LIMITS[selectedPackageCode],
      withinPackageScope: null,
      packageMismatch: false,
      intakeEstimateMismatch: false,
      intakeEstimateDelta: null
    };
  }

  const packageWordLimit = PACKAGE_WORD_LIMITS[selectedPackageCode];
  const withinPackageScope = packageWordLimit === null ? null : officialCount <= packageWordLimit;
  const packageMismatch = withinPackageScope === false;

  let intakeEstimateMismatch = false;
  let intakeEstimateDelta = null;
  if (isNonNegativeInteger(intakeEstimate)) {
    intakeEstimateDelta = officialCount - intakeEstimate;
    // Flag when the intake estimate differs from the official count by
    // more than 15% of the official count — a heuristic threshold for
    // "the author's self-reported estimate was materially off," not a
    // hard legal threshold.
    intakeEstimateMismatch = Math.abs(intakeEstimateDelta) > officialCount * 0.15;
  }

  return {
    ok: true,
    officialManuscriptWordCount: officialCount,
    intakeEstimatedWordCount: intakeEstimate,
    wordCountSource: WORD_COUNT_SOURCE.MANUSCRIPT_FILE,
    selectedPackageCode,
    packageWordLimit,
    withinPackageScope,
    packageMismatch,
    intakeEstimateMismatch,
    intakeEstimateDelta
  };
}

module.exports = {
  verifyManuscriptWordCount,
  PACKAGE_WORD_LIMITS,
  WORD_COUNT_SOURCE
};
