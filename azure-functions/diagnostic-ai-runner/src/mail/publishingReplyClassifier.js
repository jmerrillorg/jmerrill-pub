"use strict";

/**
 * Classifies a publishing-mailbox reply body into a closed set of safe
 * categories. Pure function — no I/O, no logging, no Dataverse access.
 *
 * The raw reply text is the function's input only; this module never
 * stores or returns it. Callers must not log the input text either.
 */

const CLASSIFICATION = Object.freeze({
  SINGLE: "SINGLE",
  TWO_PAYMENTS: "TWO_PAYMENTS",
  FOUR_PAYMENTS: "FOUR_PAYMENTS",
  EIGHT_PAYMENTS: "EIGHT_PAYMENTS",
  TWELVE_PAYMENTS: "TWELVE_PAYMENTS",
  CALL_REQUESTED: "CALL_REQUESTED",
  QUESTION: "QUESTION",
  HOLD: "HOLD",
  UNCLASSIFIED: "UNCLASSIFIED"
});

// Checked in this order — an explicit payment-option selection takes
// precedence over incidental call/question/hold language in the same reply.
const PAYMENT_OPTION_PATTERNS = [
  { classification: CLASSIFICATION.TWELVE_PAYMENTS, patterns: [/\b12\s*payments?\b/i, /\btwelve\s*payments?\b/i] },
  { classification: CLASSIFICATION.EIGHT_PAYMENTS, patterns: [/\b8\s*payments?\b/i, /\beight\s*payments?\b/i] },
  { classification: CLASSIFICATION.FOUR_PAYMENTS, patterns: [/\b4\s*payments?\b/i, /\bfour\s*payments?\b/i] },
  { classification: CLASSIFICATION.TWO_PAYMENTS, patterns: [/\b2\s*payments?\b/i, /\btwo\s*payments?\b/i] },
  {
    classification: CLASSIFICATION.SINGLE,
    patterns: [/\bsingle\s*payment\b/i, /\bone\s*payment\b/i, /\b1\s*payment\b/i, /\bpay(ing)?\s*in\s*full\b/i, /\bfull\s*payment\b/i]
  }
];

const CALL_REQUEST_PATTERN = /\b(call|schedule|talk|phone|meeting|discuss|chat)\b/i;
const HOLD_PATTERN = /\b(hold|pause|not\s*ready|need\s*more\s*time|decline|not\s*at\s*this\s*time|think\s*it\s*over)\b/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Classifies a publishing-mailbox reply into one of the CLASSIFICATION
 * values. Never logs, stores, or returns the input text.
 *
 * @param {string} replyText
 * @returns {{ classification: string }}
 */
function classifyPublishingReply(replyText) {
  const text = normalizeString(replyText);

  if (!text) {
    return { classification: CLASSIFICATION.UNCLASSIFIED };
  }

  for (const { classification, patterns } of PAYMENT_OPTION_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return { classification };
    }
  }

  if (CALL_REQUEST_PATTERN.test(text)) {
    return { classification: CLASSIFICATION.CALL_REQUESTED };
  }

  if (HOLD_PATTERN.test(text)) {
    return { classification: CLASSIFICATION.HOLD };
  }

  if (text.includes("?")) {
    return { classification: CLASSIFICATION.QUESTION };
  }

  return { classification: CLASSIFICATION.UNCLASSIFIED };
}

// Maps a payment-option classification to its governed details for
// JMP-PKG-PRO. Returns null for non-payment-option classifications.
const PAYMENT_OPTION_DETAILS = Object.freeze({
  [CLASSIFICATION.SINGLE]: { installments: 1, perInstallmentUsd: 4500.00, feeApplies: false },
  [CLASSIFICATION.TWO_PAYMENTS]: { installments: 2, perInstallmentUsd: 2340.00, feeApplies: true },
  [CLASSIFICATION.FOUR_PAYMENTS]: { installments: 4, perInstallmentUsd: 1170.00, feeApplies: true },
  [CLASSIFICATION.EIGHT_PAYMENTS]: { installments: 8, perInstallmentUsd: 585.00, feeApplies: true },
  [CLASSIFICATION.TWELVE_PAYMENTS]: { installments: 12, perInstallmentUsd: 390.00, feeApplies: true }
});

function getPaymentOptionDetails(classification) {
  return PAYMENT_OPTION_DETAILS[classification] || null;
}

module.exports = {
  classifyPublishingReply,
  getPaymentOptionDetails,
  CLASSIFICATION,
  PAYMENT_OPTION_DETAILS
};
