"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { computeAgreementFields, MANUSCRIPT_DEADLINE_TEXT } = require("../src/agreement/agreementFieldComputer");

function baseInput(overrides = {}) {
  return {
    title: "Establishing Glory: The Library",
    authorLegalName: "Jackie Smith Jr.",
    imprintLabel: "J Merrill Publishing",
    officialManuscriptWordCount: 48232,
    selectedPackageCode: "JMP-PKG-PRO",
    paymentOption: "EIGHT_PAYMENTS",
    contractDate: "2026-06-22",
    ...overrides
  };
}

describe("computeAgreementFields — the controlled record's real values", () => {
  test("produces the exact expected field set for the controlled record", () => {
    const r = computeAgreementFields(baseInput());
    assert.equal(r.ok, true);
    assert.equal(r.title, "Establishing Glory: The Library");
    assert.equal(r.authorLegalName, "Jackie Smith Jr.");
    assert.equal(r.imprintLabel, "J Merrill Publishing");
    assert.equal(r.contractDate, "2026-06-22");
    assert.equal(r.officialManuscriptWordCount, 48232);
    assert.equal(r.wordCountSource, "MANUSCRIPT_FILE");
    assert.equal(r.manuscriptDeadlineText, MANUSCRIPT_DEADLINE_TEXT);
    assert.equal(r.packageLabel, "Professional Publishing Package (JMP-PKG-PRO)");
    assert.equal(r.packageFeeUsd, 4500.00);
    assert.equal(r.packageFeeFormatted, "$4,500.00");
    assert.deepEqual(r.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
    assert.equal(r.audiobookIncluded, true);
  });

  test("computes the exact 8-payment schedule: $585.00 x 8 = $4,680.00", () => {
    const r = computeAgreementFields(baseInput());
    assert.equal(r.paymentSchedule.installments, 8);
    assert.equal(r.paymentSchedule.perInstallmentFormatted, "$585.00");
    assert.equal(r.paymentSchedule.totalUsd, 4680.00);
    assert.equal(r.paymentSchedule.totalFormatted, "$4,680.00");
    assert.equal(r.paymentSchedule.feeApplies, true);
    assert.equal(r.paymentSchedule.rows.length, 8);
  });

  test("flags that a Schedule A attachment is required for 8 payments (the 3-row table cannot represent this)", () => {
    const r = computeAgreementFields(baseInput());
    assert.equal(r.paymentSchedule.requiresScheduleAAttachment, true);
  });

  test("the first payment row notes Author-determined start date and production-begins trigger; later rows note same-day recurrence", () => {
    const r = computeAgreementFields(baseInput());
    assert.ok(r.paymentSchedule.rows[0].dueDateNote.includes("Author determines the start date"));
    assert.ok(r.paymentSchedule.rows[0].dueDateNote.includes("Production begins upon receipt"));
    assert.ok(r.paymentSchedule.rows[1].dueDateNote.includes("same calendar day"));
  });
});

describe("computeAgreementFields — audiobook inclusion", () => {
  test("Professional Package includes AI audiobook production with no additional fee implied", () => {
    const r = computeAgreementFields(baseInput());
    assert.equal(r.audiobookIncluded, true);
  });

  test("Premier Package supports the commissioning title's large manuscript scope", () => {
    const r = computeAgreementFields(baseInput({
      title: "The Intentional Leader",
      officialManuscriptWordCount: 165482,
      selectedPackageCode: "JMP-PKG-PREMIER",
      paymentOption: "SINGLE"
    }));
    assert.equal(r.ok, true);
    assert.equal(r.packageLabel, "Premier Publishing Package (JMP-PKG-PREMIER)");
    assert.equal(r.packageFeeUsd, 7500.00);
    assert.equal(r.packageFeeFormatted, "$7,500.00");
    assert.deepEqual(r.complimentaryCopies, { paperback: 15, hardcover: 4, ebook: 1 });
    assert.equal(r.paymentSchedule.totalFormatted, "$7,500.00");
  });

  test("a package without audiobookIncluded defined is rejected rather than silently assumed", () => {
    const r = computeAgreementFields(baseInput({ selectedPackageCode: "JMP-PKG-STARTER" }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("COMPLIMENTARY_COPIES_NOT_DEFINED_FOR_PACKAGE"));
  });
});

describe("computeAgreementFields — does not invent values, validates instead", () => {
  test("rejects when title is missing", () => {
    const r = computeAgreementFields(baseInput({ title: "" }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("TITLE_REQUIRED"));
  });

  test("rejects when official word count is missing or non-positive", () => {
    assert.ok(computeAgreementFields(baseInput({ officialManuscriptWordCount: null })).errors.includes("OFFICIAL_MANUSCRIPT_WORD_COUNT_REQUIRED"));
    assert.ok(computeAgreementFields(baseInput({ officialManuscriptWordCount: 0 })).errors.includes("OFFICIAL_MANUSCRIPT_WORD_COUNT_REQUIRED"));
  });

  test("rejects an unrecognized package code rather than guessing fee/complimentary copies", () => {
    const r = computeAgreementFields(baseInput({ selectedPackageCode: "JMP-PKG-NOT-REAL" }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("SELECTED_PACKAGE_CODE_UNRECOGNIZED"));
  });

  test("rejects an unrecognized payment option rather than guessing an amount", () => {
    const r = computeAgreementFields(baseInput({ paymentOption: "NOT_REAL" }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("PAYMENT_OPTION_UNRECOGNIZED"));
  });

  test("rejects when the official word count exceeds the selected package's word limit", () => {
    const r = computeAgreementFields(baseInput({ officialManuscriptWordCount: 90000, selectedPackageCode: "JMP-PKG-PRO" }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("OFFICIAL_WORD_COUNT_EXCEEDS_PACKAGE_LIMIT"));
  });

  test("defaults contractDate to today's date (the date the package is drafted) when not supplied", () => {
    const r = computeAgreementFields(baseInput({ contractDate: undefined }));
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(r.contractDate, today);
  });

  test("never returns a manuscript deadline as an invented future date — uses the fixed received-prior-to-preparation language", () => {
    const r = computeAgreementFields(baseInput());
    assert.equal(r.manuscriptDeadlineText, "Manuscript received prior to agreement preparation");
  });
});

describe("computeAgreementFields — single payment has no fee, multi-payment options do", () => {
  test("SINGLE payment option totals exactly the package fee with no fee applied", () => {
    const r = computeAgreementFields(baseInput({ paymentOption: "SINGLE" }));
    assert.equal(r.paymentSchedule.feeApplies, false);
    assert.equal(r.paymentSchedule.totalUsd, 4500.00);
    assert.equal(r.paymentSchedule.requiresScheduleAAttachment, false);
  });

  test("TWO_PAYMENTS requires a Schedule A is false (fits the 3-row table) but FOUR/EIGHT/TWELVE do require it", () => {
    assert.equal(computeAgreementFields(baseInput({ paymentOption: "TWO_PAYMENTS" })).paymentSchedule.requiresScheduleAAttachment, false);
    assert.equal(computeAgreementFields(baseInput({ paymentOption: "FOUR_PAYMENTS" })).paymentSchedule.requiresScheduleAAttachment, true);
    assert.equal(computeAgreementFields(baseInput({ paymentOption: "TWELVE_PAYMENTS" })).paymentSchedule.requiresScheduleAAttachment, true);
  });
});
