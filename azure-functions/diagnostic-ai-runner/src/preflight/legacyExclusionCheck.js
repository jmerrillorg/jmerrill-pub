"use strict";

/**
 * Legacy-exclusion pre-flight gate for the INT-PUB-005 Stage 0 Diagnostic Runner.
 *
 * CONTRACT-TEST MODE BEHAVIOR:
 *   The Legacy flag is read from the request body field `legacyFlag` (boolean).
 *   This simulates the Dataverse-read that will occur in production. In the future
 *   production path, the runner will read `jm1_legacyroute` (or equivalent) from
 *   the Publishing Intake or Editorial Diagnostic record in Dataverse and call this
 *   function with the resolved value.
 *
 * EXCLUSION RULE (permanent — see ADR Section 13):
 *   Legacy-flagged intakes cannot enter the Stage 0 Diagnostic Runner path.
 *   The check must occur before manuscript resolution. It is a pre-flight gate,
 *   not a post-AI cleanup step.
 *
 * If excluded:
 *   - The runner returns a safe error without calling any AI endpoint.
 *   - No manuscript file is read or extracted.
 *   - No Dataverse diagnostic fields are written.
 *   - The caller must set jm1_diagnosticexecutionstatus to Deferred or Exception
 *     with a safe internal note (handled by the invoking orchestrator — not this runner).
 *
 * @param {boolean} legacyFlag — true if the intake is flagged as Legacy
 * @returns {{ excluded: boolean, reason: string|null }}
 */
function checkLegacyExclusion(legacyFlag) {
  if (legacyFlag === true) {
    return {
      excluded: true,
      reason: "Legacy-flagged intake. Stage 0 Diagnostic Runner cannot process Legacy intakes. A separate governed Legacy diagnostic path is required."
    };
  }
  return { excluded: false, reason: null };
}

/**
 * Parse the legacyFlag from a raw request body object.
 * Only boolean true triggers exclusion. Absent, false, or non-boolean values do not.
 *
 * @param {object} body
 * @returns {boolean}
 */
function parseLegacyFlag(body) {
  return body != null && body.legacyFlag === true;
}

module.exports = { checkLegacyExclusion, parseLegacyFlag };
