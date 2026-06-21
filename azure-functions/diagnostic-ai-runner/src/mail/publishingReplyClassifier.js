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

// Lines matching any of these mark the start of quoted/prior thread content
// (the original outbound email, an earlier reply, or a mail-client quote
// header). Everything from the first matching line onward is discarded
// before classification — only the author's own latest reply text above
// that line is ever classified.
const QUOTE_SEPARATOR_LINE_PATTERNS = [
  /^from:\s/i,
  /^sent:\s/i,
  /^subject:\s/i,
  /^to:\s/i,
  /^on\s.+\s(wrote|said):\s*$/i,
  /^-{2,}\s*original\s*message\s*-{2,}\s*$/i,
  /^_{5,}\s*$/,
  /^-{5,}\s*$/,
  /^>{1,}/ // quoted-line marker (">", ">>", etc.) used by many mail clients
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Isolates the author's latest, unquoted reply text by truncating the
 * body at the first line that looks like a quote header, quoted-message
 * separator, or quoted-line marker. If no such marker is found, returns
 * the full (trimmed) text unchanged.
 *
 * Pure function — never logs or stores the input.
 *
 * @param {string} rawText
 * @returns {string}
 */
function isolateLatestReplySegment(rawText) {
  const text = normalizeString(rawText);
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && QUOTE_SEPARATOR_LINE_PATTERNS.some((p) => p.test(line))) {
      return lines.slice(0, i).join("\n").trim();
    }
  }
  return text;
}

/**
 * Classifies a publishing-mailbox reply into one of the CLASSIFICATION
 * values. Classification is based ONLY on the author's latest, unquoted
 * reply segment — quoted original-message content (including the full
 * payment-option list from the outbound email) is stripped first via
 * isolateLatestReplySegment and never influences the result.
 *
 * If the isolated reply segment matches more than one distinct payment
 * option (genuine ambiguity, not quoting), this returns UNCLASSIFIED
 * rather than guessing.
 *
 * Never logs, stores, or returns the input text.
 *
 * @param {string} replyText
 * @returns {{ classification: string }}
 */
function classifyPublishingReply(replyText) {
  const isolated = isolateLatestReplySegment(replyText);

  if (!isolated) {
    return { classification: CLASSIFICATION.UNCLASSIFIED };
  }

  const matchedOptions = PAYMENT_OPTION_PATTERNS.filter(({ patterns }) =>
    patterns.some((p) => p.test(isolated))
  );

  if (matchedOptions.length === 1) {
    return { classification: matchedOptions[0].classification };
  }
  if (matchedOptions.length > 1) {
    // Genuine ambiguity in the author's own reply text — do not guess.
    return { classification: CLASSIFICATION.UNCLASSIFIED };
  }

  if (CALL_REQUEST_PATTERN.test(isolated)) {
    return { classification: CLASSIFICATION.CALL_REQUESTED };
  }

  if (HOLD_PATTERN.test(isolated)) {
    return { classification: CLASSIFICATION.HOLD };
  }

  if (isolated.includes("?")) {
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
  isolateLatestReplySegment,
  getPaymentOptionDetails,
  CLASSIFICATION,
  PAYMENT_OPTION_DETAILS
};
