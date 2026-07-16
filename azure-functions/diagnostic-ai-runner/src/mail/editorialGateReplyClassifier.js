"use strict";

/**
 * Classifies author replies to editorial approval gates such as A3/A4/A5.
 * Pure function only: no I/O, no logging, and no raw body returned.
 */

const EDITORIAL_GATE_REPLY_CLASSIFICATION = Object.freeze({
  APPROVED_WITHOUT_CHANGES: "APPROVED_WITHOUT_CHANGES",
  APPROVED_WITH_CHANGES: "APPROVED_WITH_CHANGES",
  DISCUSSION_REQUESTED: "DISCUSSION_REQUESTED",
  DECISION_DEFERRED: "DECISION_DEFERRED",
  QUESTION: "QUESTION",
  UNCLASSIFIED: "UNCLASSIFIED"
});

const QUOTE_SEPARATOR_LINE_PATTERNS = [
  /^from:\s/i,
  /^date:\s/i,
  /^sent:\s/i,
  /^subject:\s/i,
  /^to:\s/i,
  /^on\s.+\s(wrote|said):\s*$/i,
  /^-{2,}\s*original\s*message\s*-{2,}\s*$/i,
  /^_{5,}\s*$/,
  /^-{5,}\s*$/,
  /^>{1,}/
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isolateLatestEditorialReplySegment(rawText) {
  const text = normalizeString(rawText);
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && QUOTE_SEPARATOR_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      return lines.slice(0, i).join("\n").trim();
    }
  }
  return text;
}

function classifyEditorialGateReply(replyText) {
  const isolated = isolateLatestEditorialReplySegment(replyText);
  if (!isolated) return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.UNCLASSIFIED };

  const normalized = isolated.replace(/\s+/g, " ").trim();

  if (/\b(approve|approved|approval|i approve|looks good|good to go|proceed)\b/i.test(normalized)) {
    if (/\b(change|changes|correction|corrections|except|but|with edits|revision|revise)\b/i.test(normalized)) {
      return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.APPROVED_WITH_CHANGES };
    }
    return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.APPROVED_WITHOUT_CHANGES };
  }

  if (/\b(call|schedule|talk|phone|meeting|discuss|discussion|chat)\b/i.test(normalized)) {
    return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.DISCUSSION_REQUESTED };
  }

  if (/\b(hold|pause|not ready|need more time|more time|later|defer|wait)\b/i.test(normalized)) {
    return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.DECISION_DEFERRED };
  }

  if (normalized.includes("?")) {
    return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.QUESTION };
  }

  return { classification: EDITORIAL_GATE_REPLY_CLASSIFICATION.UNCLASSIFIED };
}

module.exports = {
  classifyEditorialGateReply,
  isolateLatestEditorialReplySegment,
  EDITORIAL_GATE_REPLY_CLASSIFICATION
};
