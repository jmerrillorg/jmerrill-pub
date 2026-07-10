"use strict";

/**
 * Model caller — entry point for all AI execution in the Stage 0 Diagnostic Runner.
 *
 * Enforces the dual execution gate before any provider call:
 *   1. CONTRACT_TEST_MODE must be false  (hardcoded; requires Jackie Approval 1)
 *   2. JM1_AI_EXECUTION_ENABLED must be "true"  (env var; requires explicit setting)
 *
 * Provider is selected from JM1_AI_PROVIDER env var:
 *   anthropic     — Claude Sonnet (preferred for INT-PUB-005 REV)
 *   azure-openai  — Azure OpenAI (infrastructure-validated; not preferred for REV)
 *
 * Never stores prompt body, raw response, or manuscript text.
 * Never logs or returns the API key or any secret.
 */

const { checkAiExecutionGate } = require("../activation/aiExecutionGate");
const { routeToProvider } = require("./providerRouter");

/**
 * @param {object} params
 * @param {boolean} params.contractTestMode - hardcoded constant from the handler
 * @param {string}  params.promptBody       - assembled prompt (never logged/stored)
 * @param {string}  params.diagnosticId     - for structured logging only
 * @param {string}  params.promptKey        - metadata
 * @param {string}  params.promptVersion    - metadata
 * @returns {Promise<{
 *   ok: boolean,
 *   gateBlocked: boolean,
 *   gateReason: string|null,
 *   provider: string|null,
 *   configMissing: string[]|null,
 *   output: object|null,
 *   tokenCounts: {input:number, output:number, total:number},
 *   httpStatus: number|null,
 *   error: string|null
 * }>}
 */
async function callModel({ contractTestMode, promptBody, diagnosticId, promptKey, promptVersion, executionType = null }) {
  const gate = checkAiExecutionGate(contractTestMode);

  if (!gate.permitted) {
    return {
      ok: false,
      gateBlocked: true,
      gateReason: gate.reason,
      provider: null,
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: `AI_EXECUTION_GATE_CLOSED: ${gate.reason}`
    };
  }

  const result = await routeToProvider({ promptBody, diagnosticId, executionType });

  return {
    ok: result.ok,
    gateBlocked: false,
    gateReason: null,
    provider: result.provider,
    configMissing: result.configMissing || null,
    output: result.output,
    tokenCounts: result.tokenCounts || { input: 0, output: 0, total: 0 },
    httpStatus: result.httpStatus,
    error: result.error
  };
}

module.exports = { callModel };
