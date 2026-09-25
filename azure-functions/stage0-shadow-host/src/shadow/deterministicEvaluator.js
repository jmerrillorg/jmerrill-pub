"use strict";

const POLICY_VERSION = "STAGE0-SHADOW-EVAL-v1";
const ALLOWED_KEYS = new Set([
  "source_event_id", "source_reference_ids", "jm1_diagnosticoutputsummary",
  "jm1_diagnosticriskflags", "jm1_confidence", "jm1_requireshumanreview",
]);

function evaluate({ input, output, selection, event }) {
  const failures = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    failures.push("SCHEMA_INVALID");
  } else {
    if (Object.keys(output).some((key) => !ALLOWED_KEYS.has(key))) failures.push("PROHIBITED_FIELD");
    if (output.source_event_id !== input.sourceEventId || event.sourceEventId !== input.sourceEventId) {
      failures.push("BUSINESS_IDENTIFIER_MISMATCH");
    }
    if (!Array.isArray(output.source_reference_ids) || output.source_reference_ids.length < 1 ||
        output.source_reference_ids.some((id) => !input.sourceReferenceIds.includes(id))) {
      failures.push("SOURCE_BINDING_INVALID");
    }
    if (typeof output.jm1_diagnosticoutputsummary !== "string" ||
        output.jm1_diagnosticoutputsummary.length < 1 || output.jm1_diagnosticoutputsummary.length > 240 ||
        typeof output.jm1_diagnosticriskflags !== "string" || output.jm1_diagnosticriskflags.length > 240 ||
        !Number.isFinite(output.jm1_confidence) || output.jm1_confidence < 0 ||
        output.jm1_confidence > 1 || output.jm1_requireshumanreview !== true) {
      failures.push("REQUIRED_FIELDS_INVALID");
    }
  }
  if (selection?.routeId !== "STAGE_0_DIAGNOSTIC_SHADOW_ONLY") failures.push("POLICY_ROUTE_INVALID");
  return {
    pass: failures.length === 0,
    evaluatorId: "STAGE0_DETERMINISTIC_EVALUATOR",
    policyVersion: POLICY_VERSION,
    method: "INDEPENDENT_DETERMINISTIC_RULES",
    failureClass: failures[0] || null,
  };
}

module.exports = { POLICY_VERSION, evaluate };
