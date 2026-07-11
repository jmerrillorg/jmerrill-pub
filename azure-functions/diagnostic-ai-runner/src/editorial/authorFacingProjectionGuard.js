"use strict";

const FORBIDDEN_PATTERNS = Object.freeze([
  { code: "OVERLAY_TERM", pattern: /\boverlay\b/i },
  { code: "DOCTRINE_TERM", pattern: /\bdoctrine\b/i },
  { code: "OVERLAY_ID", pattern: /\bFAITH_INSPIRATIONAL\b|\bURBAN_STREET_LIT_VOICE_PRESERVATION\b|\bCHILDRENS_BOOK_STANDARD\b/i },
  { code: "MODEL_REASONING", pattern: /\bmodel reasoning\b|\bchain of thought\b|\bprompt\b/i },
  { code: "INTERNAL_RULE_CITATION", pattern: /\binternal rule\b|\brule citation\b|\bpolicy reference\b/i }
]);

function scan(value, path = "root", issues = []) {
  if (typeof value === "string") {
    FORBIDDEN_PATTERNS.forEach(({ code, pattern }) => {
      if (pattern.test(value)) {
        issues.push({ code, path, excerpt: value.slice(0, 160) });
      }
    });
    return issues;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => scan(entry, `${path}[${index}]`, issues));
    return issues;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => scan(entry, `${path}.${key}`, issues));
  }

  return issues;
}

function validateAuthorFacingProjection(payload) {
  const issues = scan(payload);
  return {
    ok: issues.length === 0,
    issues
  };
}

module.exports = {
  FORBIDDEN_PATTERNS,
  validateAuthorFacingProjection
};
