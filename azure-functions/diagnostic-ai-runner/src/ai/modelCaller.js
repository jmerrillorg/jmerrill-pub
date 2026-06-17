"use strict";

/**
 * Model caller scaffold for the Stage 0 Diagnostic AI Runner.
 *
 * This module is the single authorised point of contact with Azure OpenAI.
 * It enforces the dual execution gate before any HTTP call is attempted.
 *
 * Current state: gate is always closed (CONTRACT_TEST_MODE=true + env var absent).
 * When Jackie Approval 1 is granted:
 *   - CONTRACT_TEST_MODE is set to false in runStage0Diagnostic.js
 *   - JM1_AI_EXECUTION_ENABLED=true is added to the function app settings
 *   - This module will then call the configured endpoint
 *
 * Hard rules (must not be violated):
 *   - Never called with real manuscript text
 *   - Never called unless both gates are open
 *   - Never stores prompt body or model response in Dataverse
 *   - Token counts must always be captured and logged
 *   - Caller is responsible for no-quotation validation of the response
 */

const { checkAiExecutionGate } = require("../activation/aiExecutionGate");

const REQUIRED_ENV_VARS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_DEPLOYMENT_NAME"
];

/**
 * Validates that all required Azure OpenAI env vars are present.
 * Returns null if OK, or an array of missing var names.
 */
function checkModelConfig() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  return missing.length === 0 ? null : missing;
}

/**
 * Calls the Azure OpenAI chat completions endpoint with the supplied prompt.
 *
 * @param {object} params
 * @param {boolean} params.contractTestMode - the hardcoded constant from the handler
 * @param {string} params.promptBody - the full rendered prompt (never logged or stored)
 * @param {string} params.diagnosticId - for structured logging only
 * @param {string} params.promptKey - metadata
 * @param {string} params.promptVersion - metadata
 * @returns {Promise<{
 *   ok: boolean,
 *   gateBlocked: boolean,
 *   gateReason: string|null,
 *   configMissing: string[]|null,
 *   output: object|null,
 *   tokenCounts: {input: number, output: number, total: number},
 *   httpStatus: number|null,
 *   error: string|null
 * }>}
 */
async function callModel({ contractTestMode, promptBody, diagnosticId, promptKey, promptVersion }) {
  const gate = checkAiExecutionGate(contractTestMode);

  if (!gate.permitted) {
    return {
      ok: false,
      gateBlocked: true,
      gateReason: gate.reason,
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: `AI execution gate closed: ${gate.reason}`
    };
  }

  const missingConfig = checkModelConfig();
  if (missingConfig) {
    return {
      ok: false,
      gateBlocked: false,
      gateReason: null,
      configMissing: missingConfig,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: `MODEL_CONFIG_MISSING: ${missingConfig.join(", ")}`
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const requestBody = {
    messages: [{ role: "user", content: promptBody }],
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_object" }
  };

  let httpStatus = null;
  let responseBody = null;

  try {
    const { DefaultAzureCredential } = require("@azure/identity");
    const credential = new DefaultAzureCredential();
    const tokenResult = await credential.getToken("https://cognitiveservices.azure.com/.default");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenResult.token}`
      },
      body: JSON.stringify(requestBody)
    });

    httpStatus = response.status;
    responseBody = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        gateBlocked: false,
        gateReason: null,
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        error: `AZURE_OPENAI_HTTP_${httpStatus}`
      };
    }

    const choice = responseBody?.choices?.[0];
    const content = choice?.message?.content;
    const usage = responseBody?.usage || {};

    let parsedOutput = null;
    try {
      parsedOutput = JSON.parse(content);
    } catch {
      return {
        ok: false,
        gateBlocked: false,
        gateReason: null,
        configMissing: null,
        output: null,
        tokenCounts: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
          total: usage.total_tokens || 0
        },
        httpStatus,
        error: "MODEL_RESPONSE_NOT_JSON"
      };
    }

    return {
      ok: true,
      gateBlocked: false,
      gateReason: null,
      configMissing: null,
      output: parsedOutput,
      tokenCounts: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      httpStatus,
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      gateBlocked: false,
      gateReason: null,
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus,
      error: `MODEL_CALL_EXCEPTION: ${String(err.message || err).slice(0, 200)}`
    };
  }
}

module.exports = { callModel, checkModelConfig, REQUIRED_ENV_VARS };
