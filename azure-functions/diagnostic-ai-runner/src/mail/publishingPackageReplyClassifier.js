"use strict";

/**
 * Classifies an author reply to the Editorial Recommendation Letter.
 *
 * Pure function only. It never logs, stores, or returns the raw reply body.
 * Callers must persist only the closed classification and selected package.
 */

const PACKAGE_REPLY_CLASSIFICATION = Object.freeze({
  PROFESSIONAL: "PROFESSIONAL_PACKAGE_SELECTED",
  PREMIER: "PREMIER_PACKAGE_SELECTED",
  STARTER: "STARTER_PACKAGE_SELECTED",
  CALL_REQUESTED: "CALL_REQUESTED",
  QUESTION: "QUESTION",
  HOLD: "HOLD",
  UNCLASSIFIED: "UNCLASSIFIED"
});

const SELECTED_PACKAGE_BY_CLASSIFICATION = Object.freeze({
  [PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL]: {
    code: "JMP-PKG-PRO",
    name: "Professional Publishing Package",
    price: "$4,500"
  },
  [PACKAGE_REPLY_CLASSIFICATION.PREMIER]: {
    code: "JMP-PKG-PREMIER",
    name: "Premier Publishing Package",
    price: "$7,500"
  },
  [PACKAGE_REPLY_CLASSIFICATION.STARTER]: {
    code: "JMP-PKG-STARTER",
    name: "Starter Publishing Package",
    price: "$1,999"
  }
});

const QUOTE_SEPARATOR_LINE_PATTERNS = [
  /^from:\s/i,
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

function isolateLatestReplySegment(rawText) {
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

function classifyPackageReply(replyText) {
  const isolated = isolateLatestReplySegment(replyText);
  if (!isolated) return { classification: PACKAGE_REPLY_CLASSIFICATION.UNCLASSIFIED, selectedPackage: null };

  const professional = /\b(professional|pro\s+package|professional\s+publishing\s+package)\b/i.test(isolated);
  const premier = /\b(premier|premier\s+publishing\s+package)\b/i.test(isolated);
  const starter = /\b(starter|starter\s+publishing\s+package)\b/i.test(isolated);
  const selectedCount = [professional, premier, starter].filter(Boolean).length;

  if (selectedCount > 1) {
    return { classification: PACKAGE_REPLY_CLASSIFICATION.UNCLASSIFIED, selectedPackage: null };
  }
  if (professional) {
    return {
      classification: PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL,
      selectedPackage: SELECTED_PACKAGE_BY_CLASSIFICATION[PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL]
    };
  }
  if (premier) {
    return {
      classification: PACKAGE_REPLY_CLASSIFICATION.PREMIER,
      selectedPackage: SELECTED_PACKAGE_BY_CLASSIFICATION[PACKAGE_REPLY_CLASSIFICATION.PREMIER]
    };
  }
  if (starter) {
    return {
      classification: PACKAGE_REPLY_CLASSIFICATION.STARTER,
      selectedPackage: SELECTED_PACKAGE_BY_CLASSIFICATION[PACKAGE_REPLY_CLASSIFICATION.STARTER]
    };
  }
  if (/\b(call|schedule|talk|phone|meeting|discuss|chat)\b/i.test(isolated)) {
    return { classification: PACKAGE_REPLY_CLASSIFICATION.CALL_REQUESTED, selectedPackage: null };
  }
  if (/\b(hold|pause|not\s*ready|need\s*more\s*time|decline|not\s*at\s*this\s*time|think\s*it\s*over)\b/i.test(isolated)) {
    return { classification: PACKAGE_REPLY_CLASSIFICATION.HOLD, selectedPackage: null };
  }
  if (isolated.includes("?")) {
    return { classification: PACKAGE_REPLY_CLASSIFICATION.QUESTION, selectedPackage: null };
  }
  return { classification: PACKAGE_REPLY_CLASSIFICATION.UNCLASSIFIED, selectedPackage: null };
}

module.exports = {
  classifyPackageReply,
  isolateLatestReplySegment,
  PACKAGE_REPLY_CLASSIFICATION,
  SELECTED_PACKAGE_BY_CLASSIFICATION
};
