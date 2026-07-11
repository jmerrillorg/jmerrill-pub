"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  DEPLOYED_MODEL_BASELINE,
  getModelRoute,
  resolveModelRoute
} = require("../src/editorial/editorialModelRoutingRegistry");

describe("editorial model routing registry", () => {
  test("developmental editing prefers Claude Sonnet catalog candidate", () => {
    const route = getModelRoute("developmental_editing");
    assert.equal(route.preferredCatalogCandidate.exactModel, "claude-sonnet-5");
    assert.equal(route.executionReadiness, "fallback_only_until_claude_deployed");
  });

  test("copy editing prefers GPT-5.4 catalog candidate", () => {
    const route = getModelRoute("copy_editing");
    assert.equal(route.preferredCatalogCandidate.exactModel, "gpt-5.4");
  });

  test("falls back to the certified deployed baseline when preferred deployment is absent", () => {
    const result = resolveModelRoute("developmental_editing", {
      deployedAliases: [DEPLOYED_MODEL_BASELINE.deploymentAlias]
    });

    assert.equal(result.ok, true);
    assert.equal(result.fellBack, true);
    assert.equal(result.selectedModel.exactModel, "gpt-4o-mini");
    assert.match(result.qualityImpact, /Reduced structural nuance/);
  });

  test("fails closed when no approved deployment exists", () => {
    const result = resolveModelRoute("proofreading", {
      deployedAliases: []
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "NO_APPROVED_DEPLOYMENT_AVAILABLE");
  });
});
