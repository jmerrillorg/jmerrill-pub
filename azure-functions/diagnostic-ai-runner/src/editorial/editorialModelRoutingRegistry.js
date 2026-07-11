"use strict";

const MODEL_ROUTING_POLICY_VERSION = "EDITORIAL-MODEL-ROUTING-V1";

const DEPLOYED_MODEL_BASELINE = Object.freeze({
  deploymentAlias: "jm1-pub-diagnostic-primary",
  provider: "Azure OpenAI",
  exactModel: "gpt-4o-mini",
  version: "2024-07-18",
  region: "eastus",
  deploymentStatus: "DEPLOYED",
  certificationState: "CERTIFIED_BASELINE"
});

const MODEL_ROUTES = Object.freeze({
  editorial_diagnostic: {
    transaction: "editorial_diagnostic",
    preferredFamily: "Claude Sonnet",
    preferredCatalogCandidate: {
      provider: "Anthropic via Azure AI Foundry",
      exactModel: "claude-sonnet-5",
      version: "2",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "Lower nuance in manuscript-level structural and voice-sensitive review than the preferred Claude Sonnet route."
    },
    humanReviewRequired: true,
    costTier: "medium",
    latencyTier: "medium",
    killSwitch: "EDITORIAL_DIAGNOSTIC_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "knowledge-md-section-3 + editorial-review companion",
    prohibitedProviders: ["unregistered-direct-model"],
    executionReadiness: "fallback_only_until_claude_deployed"
  },
  developmental_editing: {
    transaction: "developmental_editing",
    preferredFamily: "Claude Sonnet",
    preferredCatalogCandidate: {
      provider: "Anthropic via Azure AI Foundry",
      exactModel: "claude-sonnet-5",
      version: "2",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "Reduced structural nuance, thematic pacing judgment, and faith-voice handling compared with the preferred Claude Sonnet route."
    },
    humanReviewRequired: true,
    costTier: "medium",
    latencyTier: "medium",
    killSwitch: "DEVELOPMENTAL_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "knowledge-md-section-3 + developmental companion + optional faith overlay",
    prohibitedProviders: ["unregistered-direct-model"],
    executionReadiness: "fallback_only_until_claude_deployed"
  },
  line_editing: {
    transaction: "line_editing",
    preferredFamily: "Claude Sonnet",
    preferredCatalogCandidate: {
      provider: "Anthropic via Azure AI Foundry",
      exactModel: "claude-sonnet-5",
      version: "2",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "Higher risk of flattening cadence and over-normalizing sentence rhythm than the preferred Claude Sonnet route."
    },
    humanReviewRequired: true,
    costTier: "medium",
    latencyTier: "medium",
    killSwitch: "LINE_EDIT_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "knowledge-md-section-3 + line/copy/proof companion + optional faith overlay",
    prohibitedProviders: ["unregistered-direct-model"],
    executionReadiness: "fallback_only_until_claude_deployed"
  },
  copy_editing: {
    transaction: "copy_editing",
    preferredFamily: "GPT-5",
    preferredCatalogCandidate: {
      provider: "OpenAI via Azure AI Foundry",
      exactModel: "gpt-5.4",
      version: "2026-03-05",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "Lower style-rule coverage and less robust consistency checking than the preferred GPT-5 route."
    },
    humanReviewRequired: true,
    costTier: "medium_high",
    latencyTier: "medium",
    killSwitch: "COPY_EDIT_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "knowledge-md-section-3 + line/copy/proof companion + optional faith overlay",
    prohibitedProviders: ["unregistered-direct-model"],
    executionReadiness: "fallback_only_until_gpt5_deployed"
  },
  proofreading: {
    transaction: "proofreading",
    preferredFamily: "GPT-5",
    preferredCatalogCandidate: {
      provider: "OpenAI via Azure AI Foundry",
      exactModel: "gpt-5.4",
      version: "2026-03-05",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "More limited final-pass consistency and style-sheet verification than the preferred GPT-5 route."
    },
    humanReviewRequired: true,
    costTier: "medium_high",
    latencyTier: "medium",
    killSwitch: "PROOFREAD_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "knowledge-md-section-3 + line/copy/proof companion + optional faith overlay",
    prohibitedProviders: ["unregistered-direct-model"],
    executionReadiness: "fallback_only_until_gpt5_deployed"
  },
  independent_quality_review: {
    transaction: "independent_quality_review",
    preferredFamily: "Second Model Family",
    preferredCatalogCandidate: {
      provider: "OpenAI via Azure AI Foundry",
      exactModel: "gpt-5-mini",
      version: "2025-08-07",
      region: "eastus",
      availabilityStatus: "CATALOG_AVAILABLE_NOT_DEPLOYED",
      certificationState: "UNCERTIFIED_FOR_JM1_EDITORIAL"
    },
    approvedFallback: {
      ...DEPLOYED_MODEL_BASELINE,
      qualityImpact: "Self-family validation is weaker than a genuinely independent second-family compliance pass."
    },
    humanReviewRequired: true,
    costTier: "medium",
    latencyTier: "medium",
    killSwitch: "EDITORIAL_COMPLIANCE_MODEL_ROUTE_ENABLED",
    lastEvaluationDate: "2026-07-10",
    nextReviewDate: "2026-07-17",
    preferredGuidePolicy: "same selected guide set as producing transaction, validated independently",
    prohibitedProviders: ["same-model-self-certification-only"],
    executionReadiness: "fallback_only_until_validator_deployed"
  }
});

function getModelRoute(transaction) {
  return MODEL_ROUTES[transaction] || null;
}

function resolveModelRoute(transaction, options = {}) {
  const route = getModelRoute(transaction);
  if (!route) {
    return {
      ok: false,
      error: "UNKNOWN_EDITORIAL_TRANSACTION",
      transaction
    };
  }

  const deployedAliases = new Set((options.deployedAliases || []).filter(Boolean));
  const preferredDeployedAlias = options.preferredDeployedAlias || null;

  if (preferredDeployedAlias && deployedAliases.has(preferredDeployedAlias)) {
    return {
      ok: true,
      transaction,
      selectedModel: {
        provider: route.preferredCatalogCandidate.provider,
        exactModel: route.preferredCatalogCandidate.exactModel,
        deploymentAlias: preferredDeployedAlias,
        selectionReason: "PREFERRED_MODEL_DEPLOYED"
      },
      fellBack: false,
      route
    };
  }

  if (route.approvedFallback && deployedAliases.has(route.approvedFallback.deploymentAlias)) {
    return {
      ok: true,
      transaction,
      selectedModel: {
        provider: route.approvedFallback.provider,
        exactModel: route.approvedFallback.exactModel,
        deploymentAlias: route.approvedFallback.deploymentAlias,
        selectionReason: "APPROVED_FALLBACK_BASELINE"
      },
      fellBack: true,
      qualityImpact: route.approvedFallback.qualityImpact,
      route
    };
  }

  return {
    ok: false,
    transaction,
    error: "NO_APPROVED_DEPLOYMENT_AVAILABLE",
    route
  };
}

module.exports = {
  DEPLOYED_MODEL_BASELINE,
  MODEL_ROUTES,
  MODEL_ROUTING_POLICY_VERSION,
  getModelRoute,
  resolveModelRoute
};
