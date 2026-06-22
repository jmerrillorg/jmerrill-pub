"use strict";

/**
 * No-quotation output validator for the INT-PUB-005 Stage 0 Diagnostic Runner.
 *
 * RULE (from ADR Section 12 — permanent, not relaxed by confidence or status):
 *   All diagnostic output fields must contain characterization only.
 *   No field may contain:
 *     - Manuscript excerpts or verbatim passages
 *     - Quoted author-submitted prose
 *     - Any raw text extracted from the manuscript
 *     - Prompt template text
 *
 * This validator is a structural heuristic guard. It catches detectable signals
 * (quotation marks containing substantial text, known prompt-instruction phrases)
 * but is not a guarantee of zero manuscript content — it is a required gate, not
 * a sufficient one. Human review is always required before any author-facing action.
 *
 * VIOLATION OBJECTS never include the offending text — they contain only field
 * name, rule code, and a rule description. This prevents the validator itself
 * from re-logging content that should not be stored.
 */

// The complete set of output fields subject to no-quotation validation.
// Any field not listed here will trigger an UNKNOWN_FIELD violation.
const VALIDATED_FIELDS = new Set([
  "jm1_diagnosticoutputsummary",
  "jm1_diagnosticstructuredoutputjson",
  "jm1_diagnosticriskflags",
  "jm1_diagnosticexecutionerror",
  "jm1_humanreviewnotes",
  "jm1pub_editorialfitsummary",
  "jm1pub_editorialriskflags"
]);

// ASCII and Unicode quotation mark patterns that bracket quoted content.
// Matches: "...", "...", or "..." where content is 4+ word tokens.
// A "word token" is any non-whitespace sequence.
const QUOTED_CONTENT_PATTERNS = [
  // ASCII double quotes
  /"([^"]{20,})"/g,
  // Unicode left/right double quotes
  /“([^”]{20,})”/g,
  // Unicode left/right single quotes (used in some AI outputs for quotation)
  /‘([^’]{20,})’/g
];

// Minimum word count inside a quoted span before it's flagged.
const QUOTED_MIN_WORD_COUNT = 4;

// Prompt-instruction phrases that must not appear in output fields.
// These indicate the AI has echoed prompt content back into the response.
const PROMPT_LEAKAGE_PHRASES = [
  "you are a",
  "you are an",
  "given the manuscript",
  "given the following manuscript",
  "based on the manuscript",
  "based on the submission",
  "the author has submitted",
  "please evaluate",
  "please analyze",
  "analyze the following",
  "you will be provided",
  "using the knowledge base",
  "using the grounding document",
  "[knowledge base content]",
  "[manuscript text]"
];

// Minimum character length of a single continuous prose block (no sentence
// boundaries) before it is flagged as possible verbatim prose.
// Applies to non-JSON string fields only.
const PROSE_BLOCK_MAX_CHARS = 300;

/**
 * @typedef {{
 *   field: string,
 *   rule: string,
 *   ruleDescription: string
 * }} Violation
 *
 * @typedef {{
 *   valid: boolean,
 *   violations: Violation[],
 *   fieldsChecked: string[]
 * }} ValidationResult
 */

/**
 * Validate a set of diagnostic output fields against the no-quotation rule.
 *
 * @param {Record<string, string|null|undefined>} outputFields
 *   Key/value pairs where keys are Dataverse field logical names and values
 *   are the string content to validate. Null and undefined values are skipped.
 * @returns {ValidationResult}
 */
function validateNoQuotation(outputFields) {
  if (outputFields == null || typeof outputFields !== "object") {
    return {
      valid: false,
      violations: [{ field: "(input)", rule: "INVALID_INPUT", ruleDescription: "outputFields must be a non-null object" }],
      fieldsChecked: []
    };
  }

  const violations = [];
  const fieldsChecked = [];

  for (const [field, value] of Object.entries(outputFields)) {
    // Reject fields not in the validated set — prevents new fields bypassing the gate
    if (!VALIDATED_FIELDS.has(field)) {
      violations.push({
        field,
        rule: "UNKNOWN_FIELD",
        ruleDescription: `Field '${field}' is not in the validated output field set and cannot be passed for validation`
      });
      continue;
    }

    // Skip null/undefined/empty values
    if (value == null || value === "") {
      fieldsChecked.push(field);
      continue;
    }

    if (typeof value !== "string") {
      violations.push({
        field,
        rule: "INVALID_FIELD_TYPE",
        ruleDescription: `Field '${field}' must be a string`
      });
      continue;
    }

    fieldsChecked.push(field);

    // Rule 1: QUOTED_CONTENT — quoted spans with substantial word count
    for (const pattern of QUOTED_CONTENT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        const inner = match[1];
        const wordCount = inner.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount >= QUOTED_MIN_WORD_COUNT) {
          violations.push({
            field,
            rule: "QUOTED_CONTENT",
            ruleDescription: `Field '${field}' contains quoted text with ${wordCount} words. Output must be characterization only — no quoted manuscript prose`
          });
          break; // One violation per field per rule is sufficient
        }
      }
    }

    // Rule 2: PROMPT_LEAKAGE — prompt instruction phrases in output
    const lowerValue = value.toLowerCase();
    for (const phrase of PROMPT_LEAKAGE_PHRASES) {
      if (lowerValue.includes(phrase)) {
        violations.push({
          field,
          rule: "PROMPT_LEAKAGE",
          ruleDescription: `Field '${field}' contains a prompt-instruction phrase. Prompt text must not appear in output fields`
        });
        break; // One violation per field per rule
      }
    }

    // Rule 3: PROSE_BLOCK — long unbroken prose spans in non-JSON fields
    if (field !== "jm1_diagnosticstructuredoutputjson") {
      const sentences = value.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > PROSE_BLOCK_MAX_CHARS) {
          violations.push({
            field,
            rule: "PROSE_BLOCK",
            ruleDescription: `Field '${field}' contains a prose block of ${trimmed.length} chars (limit ${PROSE_BLOCK_MAX_CHARS}). Output must be concise characterization, not verbatim prose`
          });
          break; // One violation per field per rule
        }
      }
    }

    // Rule 4: JSON_PROSE_VALUE — long prose strings inside structured JSON output
    if (field === "jm1_diagnosticstructuredoutputjson" && value.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        checkJsonForProse(field, parsed, violations);
      } catch {
        violations.push({
          field,
          rule: "INVALID_JSON",
          ruleDescription: `Field '${field}' must be valid JSON`
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    fieldsChecked
  };
}

/**
 * Recursively check a parsed JSON object for long prose string values.
 * Violations are appended to the violations array.
 */
function checkJsonForProse(field, node, violations, depth = 0) {
  if (depth > 10 || violations.some(v => v.field === field && v.rule === "JSON_PROSE_VALUE")) {
    return; // Stop after first JSON_PROSE_VALUE violation for this field
  }
  if (typeof node === "string") {
    if (node.length > PROSE_BLOCK_MAX_CHARS) {
      violations.push({
        field,
        rule: "JSON_PROSE_VALUE",
        ruleDescription: `Field '${field}' contains a JSON string value of ${node.length} chars (limit ${PROSE_BLOCK_MAX_CHARS}). JSON output fields must contain structured data, not prose excerpts`
      });
    }
  } else if (Array.isArray(node)) {
    for (const item of node) {
      checkJsonForProse(field, item, violations, depth + 1);
    }
  } else if (node !== null && typeof node === "object") {
    for (const val of Object.values(node)) {
      checkJsonForProse(field, val, violations, depth + 1);
    }
  }
}

module.exports = { validateNoQuotation, VALIDATED_FIELDS };
