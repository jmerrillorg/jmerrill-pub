"use strict";

const {
  CONTROLLED_EXECUTION_TYPE,
  SHADOW_EXECUTION_TYPE
} = require("../controlled/executionAuthorization");

const ROUTE_KILL_SWITCH_ENV = "JM1_AI_ROUTE_KILL_SWITCH";
const LEGACY_PROVIDER_OVERRIDE_ENV = "JM1_ALLOW_LEGACY_PROVIDER_OVERRIDE";

const PROVIDERS = Object.freeze({
  AZURE_OPENAI: "azure-openai",
  MICROSOFT_FOUNDRY_CLAUDE: "microsoft-foundry-claude",
  ANTHROPIC_DIRECT: "anthropic-direct"
});

const ROUTES = Object.freeze({
  "jm1-pub-diagnostic-primary": Object.freeze({
    editorialTransaction: "GPAT-001",
    provider: PROVIDERS.AZURE_OPENAI,
    foundryAccount: null,
    foundryProject: null,
    deploymentAlias: "jm1-pub-diagnostic-primary",
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "jm1-pub-diagnostic-primary",
    model: process.env.AZURE_OPENAI_MODEL_NAME || "gpt-4o-mini",
    version: process.env.AZURE_OPENAI_MODEL_VERSION || null,
    promptKey: "jm1-prompt-pub-stage0-diagnostic",
    promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
    certificationStatus: "governed-fallback-certified",
    fallbackDeploymentAlias: null,
    humanReviewRequired: true,
    requiredStyleGuides: [],
    allowedExecutionTypes: [
      CONTROLLED_EXECUTION_TYPE,
      SHADOW_EXECUTION_TYPE,
      "REAL_MANUSCRIPT_PILOT",
      "default"
    ],
    routePolicy: "fallback"
  }),
  "jm1-editorial-devline-primary": Object.freeze({
    editorialTransaction: "GPAT-001",
    provider: PROVIDERS.MICROSOFT_FOUNDRY_CLAUDE,
    foundryAccount: process.env.AZURE_FOUNDRY_ACCOUNT_NAME || "ais-jm1-foundry",
    foundryProject: process.env.AZURE_FOUNDRY_PROJECT_NAME || "jm1-editorial-foundry",
    deploymentAlias: "jm1-editorial-devline-primary",
    deploymentName: process.env.AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME || "jm1-editorial-devline-primary",
    model: "claude-sonnet-5",
    version: "2",
    promptKey: "jm1-prompt-pub-stage0-diagnostic",
    promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
    certificationStatus: "pending-deployment-certification",
    fallbackDeploymentAlias: "jm1-pub-diagnostic-primary",
    humanReviewRequired: true,
    requiredStyleGuides: [],
    allowedExecutionTypes: [
      CONTROLLED_EXECUTION_TYPE,
      SHADOW_EXECUTION_TYPE,
      "REAL_MANUSCRIPT_PILOT",
      "default"
    ],
    routePolicy: "explicit-fallback-only"
  })
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isEnvTrue(name) {
  return process.env[name] === "true";
}

function normalizeAlias(alias) {
  return normalizeString(alias).toLowerCase();
}

function resolveLegacyProviderFromEnv() {
  const raw = normalizeString(process.env.JM1_AI_PROVIDER).toLowerCase();
  if (!raw) {
    return { ok: false, error: "AI_PROVIDER_NOT_CONFIGURED" };
  }

  if (!Object.values(PROVIDERS).includes(raw) && raw !== "anthropic") {
    return { ok: false, error: "AI_PROVIDER_UNSUPPORTED", provider: raw };
  }

  const provider = raw === "anthropic" ? PROVIDERS.ANTHROPIC_DIRECT : raw;
  return {
    ok: true,
    route: {
      source: "legacy-env",
      editorialTransaction: null,
      provider,
      foundryAccount: null,
      foundryProject: null,
      deploymentAlias: null,
      deploymentName: null,
      model: null,
      version: null,
      promptKey: null,
      promptVersion: null,
      certificationStatus: "legacy-env-override",
      fallbackDeploymentAlias: null,
      humanReviewRequired: true,
      requiredStyleGuides: [],
      routePolicy: "legacy-env-override",
      legacyOverride: true
    }
  };
}

function resolveGovernedRoute({
  executionType = null,
  editorialTransaction = null,
  gpatId = null,
  modelDeploymentAlias = null,
  promptKey = null,
  promptVersion = null,
  selectedStyleGuides = [],
  allowFallback = false
} = {}) {
  if (isEnvTrue(ROUTE_KILL_SWITCH_ENV)) {
    return { ok: false, error: "AI_ROUTE_KILL_SWITCH_ACTIVE", route: null };
  }

  const alias = normalizeAlias(modelDeploymentAlias);

  if (!alias) {
    if (isEnvTrue(LEGACY_PROVIDER_OVERRIDE_ENV)) {
      return resolveLegacyProviderFromEnv();
    }
    return { ok: false, error: "AI_ROUTE_ALIAS_MISSING", route: null };
  }

  const routeTemplate = ROUTES[alias];
  if (!routeTemplate) {
    if (isEnvTrue(LEGACY_PROVIDER_OVERRIDE_ENV)) {
      return resolveLegacyProviderFromEnv();
    }
    return { ok: false, error: "AI_ROUTE_NOT_REGISTERED", route: null, alias };
  }

  const route = {
    ...routeTemplate,
    source: "registry",
    deploymentAlias: alias,
    promptKey: promptKey || routeTemplate.promptKey,
    promptVersion: promptVersion || routeTemplate.promptVersion,
    gpatId: gpatId || routeTemplate.editorialTransaction,
    editorialTransaction: editorialTransaction || routeTemplate.editorialTransaction
  };

  const requestedExecutionType = executionType || "default";
  if (
    Array.isArray(route.allowedExecutionTypes) &&
    !route.allowedExecutionTypes.includes(requestedExecutionType)
  ) {
    return { ok: false, error: "AI_ROUTE_EXECUTION_TYPE_NOT_ALLOWED", route };
  }

  if (route.humanReviewRequired !== true) {
    return { ok: false, error: "AI_ROUTE_HUMAN_REVIEW_BOUNDARY_MISSING", route };
  }

  const requiredStyleGuides = Array.isArray(route.requiredStyleGuides)
    ? route.requiredStyleGuides.filter(Boolean)
    : [];
  const styleGuideSet = new Set(
    Array.isArray(selectedStyleGuides) ? selectedStyleGuides.map((value) => normalizeString(value).toLowerCase()).filter(Boolean) : []
  );

  if (
    requiredStyleGuides.length > 0 &&
    requiredStyleGuides.some((guide) => !styleGuideSet.has(normalizeString(guide).toLowerCase()))
  ) {
    return { ok: false, error: "AI_ROUTE_REQUIRED_STYLE_GUIDE_MISSING", route };
  }

  if (route.provider === PROVIDERS.ANTHROPIC_DIRECT) {
    return { ok: false, error: "AI_ROUTE_PROVIDER_NOT_APPROVED", route };
  }

  if (
    route.certificationStatus !== "governed-fallback-certified" &&
    route.certificationStatus !== "certified"
  ) {
    if (!allowFallback || !route.fallbackDeploymentAlias) {
      return { ok: false, error: "AI_ROUTE_NOT_CERTIFIED", route };
    }

    const fallback = ROUTES[normalizeAlias(route.fallbackDeploymentAlias)];
    if (!fallback) {
      return { ok: false, error: "AI_ROUTE_FALLBACK_NOT_REGISTERED", route };
    }

    return {
      ok: true,
      route: {
        ...fallback,
        source: "registry-fallback",
        deploymentAlias: normalizeAlias(route.fallbackDeploymentAlias),
        promptKey: promptKey || fallback.promptKey,
        promptVersion: promptVersion || fallback.promptVersion,
        gpatId: gpatId || fallback.editorialTransaction,
        editorialTransaction: editorialTransaction || fallback.editorialTransaction,
        fallbackFromAlias: alias,
        fallbackReason: "PRIMARY_ROUTE_NOT_CERTIFIED"
      }
    };
  }

  return { ok: true, route };
}

module.exports = {
  LEGACY_PROVIDER_OVERRIDE_ENV,
  PROVIDERS,
  ROUTE_KILL_SWITCH_ENV,
  ROUTES,
  normalizeAlias,
  resolveGovernedRoute
};
