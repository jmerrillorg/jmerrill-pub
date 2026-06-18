"use strict";

/**
 * Anthropic (Claude Sonnet) provider for the Stage 0 Diagnostic AI Runner.
 *
 * Uses Anthropic Messages API with tool_use forced via tool_choice.
 * The model must call submit_stage0_diagnostic — it cannot return freeform text.
 * Structured output arrives in content[0].input; no JSON.parse is needed.
 *
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

// Tool schema enforces the exact output contract.
// tool_choice forces the model to call this tool — freeform text responses are rejected.
// String fields must contain characterization only (enforced downstream by noQuotationValidator).
// All four fields are required; minLength on strings prevents empty-string compliance.
const DIAGNOSTIC_TOOL = {
  name: "submit_stage0_diagnostic",
  description:
    "Submit the complete structured Stage 0 Diagnostic result. " +
    "You MUST populate ALL FOUR fields: jm1_diagnosticoutputsummary, jm1_diagnosticriskflags, " +
    "jm1_confidence, and jm1_requireshumanreview. " +
    "Do not call this tool until all four fields are ready. " +
    "ALL string fields must contain characterization only — " +
    "no manuscript excerpts, no quoted prose, no verbatim author text.",
  input_schema: {
    type: "object",
    properties: {
      jm1_diagnosticoutputsummary: {
        type: "string",
        minLength: 1,
        description:
          "Characterization-only diagnostic summary of the manuscript (2–4 sentences). " +
          "Describe the work's nature, category, and overall diagnostic impression. " +
          "No manuscript excerpts, no quoted prose, no verbatim author text."
      },
      jm1_diagnosticriskflags: {
        type: "string",
        minLength: 1,
        description:
          "Characterization-only summary of editorial risk flags (1–3 sentences). " +
          "Describe structural, commercial, or editorial concerns at a categorical level. " +
          "If no significant risk flags are identified, state that explicitly. " +
          "No manuscript excerpts, no quoted prose, no verbatim author text."
      },
      jm1_confidence: {
        type: "number",
        minimum: 0.0,
        maximum: 1.0,
        description:
          "Your confidence in this diagnostic assessment as a decimal between 0.0 and 1.0. " +
          "Example: 0.75 means moderately confident. Must be a number, not a string."
      },
      jm1_requireshumanreview: {
        type: "boolean",
        description:
          "Whether this diagnostic requires human editorial review. " +
          "This field must always be true for Stage 0 Diagnostic — never false."
      }
    },
    required: [
      "jm1_diagnosticoutputsummary",
      "jm1_diagnosticriskflags",
      "jm1_confidence",
      "jm1_requireshumanreview"
    ]
  }
};

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
    max_tokens: 4096,
    tools: [DIAGNOSTIC_TOOL],
    tool_choice: { type: "tool", name: "submit_stage0_diagnostic" },
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

    const usage = responseBody?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    // With tool_choice forced, the model must return a tool_use block.
    // Freeform text blocks are not accepted.
    const toolBlock = Array.isArray(responseBody?.content)
      ? responseBody.content.find(
          b => b.type === "tool_use" && b.name === "submit_stage0_diagnostic"
        )
      : null;

    if (!toolBlock || !toolBlock.input) {
      return {
        ok: false,
        provider: "anthropic",
        configMissing: null,
        output: null,
        tokenCounts: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        httpStatus,
        error: "MODEL_RESPONSE_TOOL_NOT_CALLED"
      };
    }

    // toolBlock.input is already a parsed object — no JSON.parse needed.
    // Raw response body is not stored. Only the structured input is returned.
    return {
      ok: true,
      provider: "anthropic",
      configMissing: null,
      output: toolBlock.input,
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

module.exports = {
  call,
  checkConfig,
  REQUIRED_VARS,
  ANTHROPIC_ENDPOINT,
  DEFAULT_API_VERSION,
  DIAGNOSTIC_TOOL
};
