"use strict";

/**
 * Anthropic (Claude Sonnet) provider for the Stage 0 Diagnostic AI Runner.
 *
 * Uses direct Anthropic Messages API via fetch (Node 18+).
 * API key read from ANTHROPIC_API_KEY env var — never logged, never returned.
 * Never stores prompt body, raw response, or manuscript text.
 * Returns a normalized result shape shared by all providers.
 *
 * Preferred model for INT-PUB-005 REV / Intake Editorial Review: claude-sonnet-4-6
 * Set ANTHROPIC_MODEL=claude-sonnet-4-6 in Function App settings.
 */

const REQUIRED_VARS = ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"];
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_API_VERSION = "2023-06-01";

function checkConfig() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  return missing.length === 0 ? null : missing;
}

/**
 * Maps missing var names to typed error codes.
 */
function missingVarError(varName) {
  if (varName === "ANTHROPIC_API_KEY") return "ANTHROPIC_API_KEY_MISSING";
  if (varName === "ANTHROPIC_MODEL") return "ANTHROPIC_MODEL_MISSING";
  return `ANTHROPIC_CONFIG_MISSING_${varName}`;
}

async function call({ promptBody, diagnosticId }) {
  const missingVars = checkConfig();
  if (missingVars) {
    const errorCodes = missingVars.map(missingVarError);
    return {
      ok: false,
      provider: "anthropic",
      configMissing: errorCodes,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: errorCodes[0]
    };
  }

  const model = process.env.ANTHROPIC_MODEL;
  const apiVersion = process.env.ANTHROPIC_API_VERSION || DEFAULT_API_VERSION;

  const requestBody = {
    model,
    max_tokens: 1200,
    messages: [{ role: "user", content: promptBody }]
  };

  let httpStatus = null;

  try {
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": apiVersion
      },
      body: JSON.stringify(requestBody)
    });

    httpStatus = response.status;
    const responseBody = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        provider: "anthropic",
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        error: `ANTHROPIC_HTTP_${httpStatus}`
      };
    }

    // Anthropic response: content array, first text block
    const rawText = responseBody?.content?.[0]?.text || "";
    const usage = responseBody?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    let parsedOutput = null;
    try {
      // Strip markdown code fences if the model wraps the JSON
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/m, "").trim();
      parsedOutput = JSON.parse(cleaned);
    } catch {
      return {
        ok: false,
        provider: "anthropic",
        configMissing: null,
        output: null,
        tokenCounts: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        httpStatus,
        error: "MODEL_RESPONSE_NOT_JSON"
      };
    }

    return {
      ok: true,
      provider: "anthropic",
      configMissing: null,
      output: parsedOutput,
      tokenCounts: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      httpStatus,
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      provider: "anthropic",
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus,
      error: `MODEL_CALL_EXCEPTION: ${String(err.message || err).slice(0, 200)}`
    };
  }
}

module.exports = { call, checkConfig, REQUIRED_VARS, ANTHROPIC_ENDPOINT, DEFAULT_API_VERSION };
