"use strict";

/**
 * Schema validator for Stage 0 Diagnostic model output.
 *
 * Validates required fields, types, and value constraints before any
 * downstream use (no-quotation check, Dataverse write).
 *
 * Fails closed — invalid output is rejected, not repaired.
 * Error messages contain only field names and type constraints,
 * never the output values themselves (which may derive from manuscript content).
 */

const REQUIRED_FIELDS = [
  "jm1_diagnosticoutputsummary",
  "jm1_diagnosticriskflags",
  "jm1_confidence",
  "jm1_requireshumanreview"
];

/**
 * Validate parsed model output against the Stage 0 Diagnostic schema.
 *
 * @param {unknown} output — parsed object from the model provider
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDiagnosticOutputSchema(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    return { valid: false, errors: ["output must be a non-null object"] };
  }

  const errors = [];

  if (typeof output.jm1_diagnosticoutputsummary !== "string" ||
      output.jm1_diagnosticoutputsummary.trim().length === 0) {
    errors.push("jm1_diagnosticoutputsummary: required non-empty string");
  }

  if (typeof output.jm1_diagnosticriskflags !== "string" ||
      output.jm1_diagnosticriskflags.trim().length === 0) {
    errors.push("jm1_diagnosticriskflags: required non-empty string");
  }

  if (typeof output.jm1_confidence !== "number" ||
      output.jm1_confidence < 0 ||
      output.jm1_confidence > 1 ||
      !isFinite(output.jm1_confidence)) {
    errors.push("jm1_confidence: required finite number between 0.0 and 1.0");
  }

  if (output.jm1_requireshumanreview !== true) {
    errors.push("jm1_requireshumanreview: must be boolean true");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateDiagnosticOutputSchema, REQUIRED_FIELDS };
