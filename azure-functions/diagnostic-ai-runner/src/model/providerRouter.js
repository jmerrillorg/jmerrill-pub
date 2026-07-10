"use strict";

/**
 * Provider router for the Stage 0 Diagnostic AI Runner.
 *
 * Resolves provider from JM1_AI_PROVIDER env var and delegates to the
 * appropriate provider module. Never falls through silently — unknown or
 * missing provider values return typed errors.
 *
 * Supported providers:
 *   azure-openai  — Azure OpenAI via MSI (DefaultAzureCredential)
 *   anthropic     — Anthropic Messages API via ANTHROPIC_API_KEY
 *
 * Preferred for INT-PUB-005 REV / Intake Editorial Review: anthropic (Claude Sonnet)
 */

const SUPPORTED_PROVIDERS = Object.freeze(["azure-openai", "anthropic"]);
const CONTROLLED_ALLOWED_PROVIDER = "azure-openai";

/**
 * Resolves the provider from the JM1_AI_PROVIDER env var.
 * @returns {{ ok: boolean, provider: string|null, error: string|null }}
 */
function resolveProvider({ executionType } = {}) {
  if (executionType === "CONTROLLED_SYNTHETIC_DIAGNOSTIC") {
    return {
      ok: true,
      provider: CONTROLLED_ALLOWED_PROVIDER,
      error: null
    };
  }

  const raw = process.env.JM1_AI_PROVIDER;

  if (!raw || !raw.trim()) {
    return { ok: false, provider: null, error: "AI_PROVIDER_NOT_CONFIGURED" };
  }

  const normalized = raw.trim().toLowerCase();

  if (!SUPPORTED_PROVIDERS.includes(normalized)) {
    return { ok: false, provider: normalized, error: "AI_PROVIDER_UNSUPPORTED" };
  }

  return { ok: true, provider: normalized, error: null };
}

/**
 * Routes a model call to the correct provider.
 * Returns a normalized result shape regardless of which provider is used.
 *
 * @param {{ promptBody: string, diagnosticId: string }} params
 * @returns {Promise<object>}
 */
async function routeToProvider({ promptBody, diagnosticId, executionType }) {
  const resolution = resolveProvider({ executionType });

  if (!resolution.ok) {
    return {
      ok: false,
      provider: resolution.provider,
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: resolution.error
    };
  }

  switch (resolution.provider) {
    case "anthropic": {
      const { call } = require("./providers/anthropicProvider");
      return call({ promptBody, diagnosticId });
    }
    case "azure-openai": {
      const { call } = require("./providers/azureOpenAiProvider");
      return call({ promptBody, diagnosticId });
    }
    default:
      // Unreachable given SUPPORTED_PROVIDERS check above, but must not fall through silently.
      return {
        ok: false,
        provider: resolution.provider,
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus: null,
        error: "AI_PROVIDER_UNSUPPORTED"
      };
  }
}

module.exports = { resolveProvider, routeToProvider, SUPPORTED_PROVIDERS };
