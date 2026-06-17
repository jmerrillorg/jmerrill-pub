"use strict";

/**
 * Dual-gate guard for AI execution.
 *
 * Both gates must be explicitly open before any model call is permitted:
 *   1. CONTRACT_TEST_MODE must be false  (hardcoded true until Jackie Approval 1)
 *   2. JM1_AI_EXECUTION_ENABLED env var must be exactly "true"
 *
 * Neither gate alone is sufficient. This prevents CONTRACT_TEST_MODE from
 * being the only safety switch — the env var gate remains even if test mode
 * is later disabled.
 *
 * Callers receive a structured result so they can include gate state in logs
 * without throwing or returning ambiguous booleans.
 */

const GATE_REASON = Object.freeze({
  CONTRACT_TEST_MODE_ACTIVE: "CONTRACT_TEST_MODE_ACTIVE",
  AI_EXECUTION_NOT_ENABLED: "AI_EXECUTION_NOT_ENABLED",
  OPEN: "OPEN"
});

/**
 * @param {boolean} contractTestMode - the hardcoded CONTRACT_TEST_MODE constant
 * @returns {{ permitted: boolean, reason: string }}
 */
function checkAiExecutionGate(contractTestMode) {
  if (contractTestMode) {
    return { permitted: false, reason: GATE_REASON.CONTRACT_TEST_MODE_ACTIVE };
  }

  const envFlag = process.env.JM1_AI_EXECUTION_ENABLED;
  if (envFlag !== "true") {
    return { permitted: false, reason: GATE_REASON.AI_EXECUTION_NOT_ENABLED };
  }

  return { permitted: true, reason: GATE_REASON.OPEN };
}

/**
 * Returns the current state of both gates without throwing.
 * Safe to call for diagnostic/logging purposes.
 */
function getGateState(contractTestMode) {
  return {
    contractTestModeActive: contractTestMode === true,
    aiExecutionEnabled: process.env.JM1_AI_EXECUTION_ENABLED === "true",
    permitted: !contractTestMode && process.env.JM1_AI_EXECUTION_ENABLED === "true"
  };
}

module.exports = { checkAiExecutionGate, getGateState, GATE_REASON };
