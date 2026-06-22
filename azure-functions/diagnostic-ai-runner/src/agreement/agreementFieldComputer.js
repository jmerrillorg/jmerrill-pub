"use strict";

/**
 * Computes the safe, validated field values needed to fill the
 * canonical J Merrill Publishing agreement stack for a controlled
 * record. Pure — no I/O, no manuscript content, no AI call.
 *
 * Every value here is either:
 *   (a) confirmed, already-known commercial/legal data for the package
 *       (fee, complimentary copies, audiobook inclusion), or
 *   (b) directly supplied by the caller (title, author, imprint,
 *       official word count, payment option), or
 *   (c) computed deterministically from (a)+(b) (payment schedule,
 *       contract date).
 * This module never invents a value it wasn't given or doesn't already
 * know to be true of the package. Manuscript deadline, address, and
 * city/state/zip are left as explicit gaps the caller must mark
 * deferred (see manuscript-already-received language convention).
 */

const PACKAGE_INFO = Object.freeze({
  "JMP-PKG-STARTER": { label: "Starter Publishing Package (JMP-PKG-STARTER)", fee: 1999.00, wordLimit: 50000 },
  "JMP-PKG-PRO": {
    label: "Professional Publishing Package (JMP-PKG-PRO)",
    fee: 4500.00,
    wordLimit: 75000,
    complimentaryCopies: { paperback: 10, hardcover: 2, ebook: 1 },
    audiobookIncluded: true
  },
  "JMP-PKG-SIGNATURE": { label: "Signature Publishing Partnership (JMP-PKG-SIGNATURE)", fee: 7500.00, wordLimit: 100000 },
  "JMP-PKG-CHILD": { label: "Children's Book Publishing Package (JMP-PKG-CHILD)", fee: 2495.00, wordLimit: null }
});

// Per-installment amount and total fee-inclusive amount for each
// payment option, confirmed against the controlled record's already
// established Milestone 6 payment-option capture logic (4% processing
// fee applies to every multi-payment option; single payment has none).
const PAYMENT_OPTION_INFO = Object.freeze({
  SINGLE: { installments: 1, perInstallmentUsd: 4500.00, feeApplies: false },
  TWO_PAYMENTS: { installments: 2, perInstallmentUsd: 2340.00, feeApplies: true },
  FOUR_PAYMENTS: { installments: 4, perInstallmentUsd: 1170.00, feeApplies: true },
  EIGHT_PAYMENTS: { installments: 8, perInstallmentUsd: 585.00, feeApplies: true },
  TWELVE_PAYMENTS: { installments: 12, perInstallmentUsd: 390.00, feeApplies: true }
});

const MANUSCRIPT_DEADLINE_TEXT = "Manuscript received prior to agreement preparation";

function formatUsd(amount) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * @param {{
 *   title: string, authorLegalName: string, imprintLabel: string,
 *   officialManuscriptWordCount: number, selectedPackageCode: string,
 *   paymentOption: string, contractDate?: string
 * }} input
 * @returns {{
 *   ok: boolean, errors: string[],
 *   title: string, authorLegalName: string, imprintLabel: string,
 *   contractDate: string, officialManuscriptWordCount: number,
 *   wordCountSource: string, manuscriptDeadlineText: string,
 *   packageLabel: string, packageFeeUsd: number, packageFeeFormatted: string,
 *   complimentaryCopies: { paperback: number, hardcover: number, ebook: number },
 *   audiobookIncluded: boolean,
 *   paymentSchedule: { installments: number, perInstallmentUsd: number,
 *     perInstallmentFormatted: string, totalUsd: number, totalFormatted: string,
 *     feeApplies: boolean, requiresScheduleAAttachment: boolean,
 *     rows: { paymentNumber: number, amountFormatted: string, dueDateNote: string }[] }
 * }}
 */
function computeAgreementFields(input = {}) {
  const errors = [];

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const authorLegalName = typeof input.authorLegalName === "string" ? input.authorLegalName.trim() : "";
  const imprintLabel = typeof input.imprintLabel === "string" ? input.imprintLabel.trim() : "";
  const officialManuscriptWordCount = input.officialManuscriptWordCount;
  const selectedPackageCode = typeof input.selectedPackageCode === "string" ? input.selectedPackageCode.trim().toUpperCase() : "";
  const paymentOption = typeof input.paymentOption === "string" ? input.paymentOption.trim().toUpperCase() : "";
  const contractDate = input.contractDate || todayIsoDate();

  if (!title) errors.push("TITLE_REQUIRED");
  if (!authorLegalName) errors.push("AUTHOR_LEGAL_NAME_REQUIRED");
  if (!imprintLabel) errors.push("IMPRINT_LABEL_REQUIRED");
  if (typeof officialManuscriptWordCount !== "number" || officialManuscriptWordCount <= 0) {
    errors.push("OFFICIAL_MANUSCRIPT_WORD_COUNT_REQUIRED");
  }

  const packageInfo = PACKAGE_INFO[selectedPackageCode];
  if (!packageInfo) {
    errors.push("SELECTED_PACKAGE_CODE_UNRECOGNIZED");
  } else if (typeof officialManuscriptWordCount === "number" && packageInfo.wordLimit != null && officialManuscriptWordCount > packageInfo.wordLimit) {
    errors.push("OFFICIAL_WORD_COUNT_EXCEEDS_PACKAGE_LIMIT");
  }
  if (packageInfo && !packageInfo.complimentaryCopies) {
    errors.push("COMPLIMENTARY_COPIES_NOT_DEFINED_FOR_PACKAGE");
  }

  const paymentInfo = PAYMENT_OPTION_INFO[paymentOption];
  if (!paymentInfo) {
    errors.push("PAYMENT_OPTION_UNRECOGNIZED");
  }

  if (errors.length > 0) {
    return { ok: false, errors, title: null, authorLegalName: null, imprintLabel: null, contractDate: null,
      officialManuscriptWordCount: null, wordCountSource: null, manuscriptDeadlineText: null,
      packageLabel: null, packageFeeUsd: null, packageFeeFormatted: null, complimentaryCopies: null,
      audiobookIncluded: null, paymentSchedule: null };
  }

  const totalUsd = Math.round(paymentInfo.installments * paymentInfo.perInstallmentUsd * 100) / 100;
  const requiresScheduleAAttachment = paymentInfo.installments > 3;

  const rows = Array.from({ length: paymentInfo.installments }, (_, i) => ({
    paymentNumber: i + 1,
    amountFormatted: formatUsd(paymentInfo.perInstallmentUsd),
    dueDateNote: i === 0
      ? "Due at signing / upon first payment — Author determines the start date by making this payment. Production begins upon receipt."
      : "Due on the same calendar day each period following the first payment."
  }));

  return {
    ok: true,
    errors: [],
    title,
    authorLegalName,
    imprintLabel,
    contractDate,
    officialManuscriptWordCount,
    wordCountSource: "MANUSCRIPT_FILE",
    manuscriptDeadlineText: MANUSCRIPT_DEADLINE_TEXT,
    packageLabel: packageInfo.label,
    packageFeeUsd: packageInfo.fee,
    packageFeeFormatted: formatUsd(packageInfo.fee),
    complimentaryCopies: packageInfo.complimentaryCopies,
    audiobookIncluded: packageInfo.audiobookIncluded === true,
    paymentSchedule: {
      installments: paymentInfo.installments,
      perInstallmentUsd: paymentInfo.perInstallmentUsd,
      perInstallmentFormatted: formatUsd(paymentInfo.perInstallmentUsd),
      totalUsd,
      totalFormatted: formatUsd(totalUsd),
      feeApplies: paymentInfo.feeApplies,
      requiresScheduleAAttachment,
      rows
    }
  };
}

module.exports = {
  computeAgreementFields,
  formatUsd,
  todayIsoDate,
  PACKAGE_INFO,
  PAYMENT_OPTION_INFO,
  MANUSCRIPT_DEADLINE_TEXT
};
