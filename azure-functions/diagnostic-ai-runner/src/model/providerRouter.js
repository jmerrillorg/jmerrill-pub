"use strict";

/**
 * Provider router for the Stage 0 Diagnostic AI Runner.
 *
 * Resolves provider from the governed route registry and delegates to the
 * appropriate provider module. Never falls through silently — unknown or
 * missing provider values return typed errors.
 */

const {
  PROVIDERS,
  resolveGovernedRoute
} = require("./governedRouteRegistry");

const SUPPORTED_PROVIDERS = Object.freeze([
  PROVIDERS.AZURE_OPENAI,
  PROVIDERS.MICROSOFT_FOUNDRY_CLAUDE,
  PROVIDERS.ANTHROPIC_DIRECT
]);

/**
 * Resolves the governed route and resulting provider.
 * @returns {{ ok: boolean, provider: string|null, error: string|null, route?: object|null }}
 */
function resolveProvider({
  executionType,
  editorialTransaction = null,
  gpatId = null,
  modelDeploymentAlias = null,
  promptKey = null,
  promptVersion = null,
  selectedStyleGuides = [],
  allowFallback = false
} = {}) {
  const routeResolution = resolveGovernedRoute({
    executionType,
    editorialTransaction,
    gpatId,
    modelDeploymentAlias,
    promptKey,
    promptVersion,
    selectedStyleGuides,
    allowFallback
  });

  if (!routeResolution.ok) {
    return {
      ok: false,
      provider: routeResolution.route?.provider || null,
      route: routeResolution.route || null,
      error: routeResolution.error || "AI_ROUTE_NOT_RESOLVED"
    };
  }

  return {
    ok: true,
    provider: routeResolution.route.provider,
    route: routeResolution.route,
    error: null
  };
}

/**
 * Routes a model call to the correct provider.
 * Returns a normalized result shape regardless of which provider is used.
 *
 * @param {{ promptBody: string, diagnosticId: string }} params
 * @returns {Promise<object>}
 */
async function routeToProvider({
  promptBody,
  diagnosticId,
  executionType,
  editorialTransaction = null,
  gpatId = null,
  modelDeploymentAlias = null,
  promptKey = null,
  promptVersion = null,
  selectedStyleGuides = [],
  allowFallback = false,
  telemetry = null
}) {
  const resolution = resolveProvider({
    executionType,
    editorialTransaction,
    gpatId,
    modelDeploymentAlias,
    promptKey,
    promptVersion,
    selectedStyleGuides,
    allowFallback
  });

  if (!resolution.ok) {
    return {
      ok: false,
      provider: resolution.provider,
      route: resolution.route || null,
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: resolution.error
    };
  }

  switch (resolution.provider) {
    case PROVIDERS.ANTHROPIC_DIRECT: {
      const { call } = require("./providers/anthropicProvider");
      return call({ promptBody, diagnosticId, telemetry, route: resolution.route });
    }
    case PROVIDERS.AZURE_OPENAI: {
      const { call } = require("./providers/azureOpenAiProvider");
      return call({ promptBody, diagnosticId, telemetry, route: resolution.route });
    }
    case PROVIDERS.MICROSOFT_FOUNDRY_CLAUDE: {
      const { call } = require("./providers/microsoftFoundryClaudeProvider");
      return call({ promptBody, diagnosticId, telemetry, route: resolution.route });
    }
    default:
      // Unreachable given SUPPORTED_PROVIDERS check above, but must not fall through silently.
      return {
        ok: false,
        provider: resolution.provider,
        route: resolution.route || null,
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus: null,
        error: "AI_PROVIDER_UNSUPPORTED"
      };
  }
}

module.exports = { resolveProvider, routeToProvider, SUPPORTED_PROVIDERS };
