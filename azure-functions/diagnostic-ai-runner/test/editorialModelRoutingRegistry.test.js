"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  DEPLOYED_MODEL_BASELINE,
  getModelRoute,
  resolveModelRoute
} = require("../src/editorial/editorialModelRoutingRegistry");

describe("editorial model routing registry", () => {
  test("editorial diagnostic / Stage 0 prefers commissioned Claude Sonnet", () => {
    const route = getModelRoute("editorial_diagnostic");
    assert.equal(route.preferredCatalogCandidate.exactModel, "claude-sonnet-5");
    assert.equal(route.executionReadiness, "preferred_route_commissioned");
    assert.equal(route.preferredCatalogCandidate.certificationState, "CERTIFIED_FOR_JM1_EDITORIAL");
  });

  test("developmental editing prefers Claude Sonnet catalog candidate", () => {
    const route = getModelRoute("developmental_editing");
    assert.equal(route.preferredCatalogCandidate.exactModel, "claude-sonnet-5");
    assert.equal(route.executionReadiness, "preferred_route_commissioned");
  });

  test("copy editing prefers GPT-5.4 catalog candidate", () => {
    const route = getModelRoute("copy_editing");
    assert.equal(route.preferredCatalogCandidate.exactModel, "gpt-5.4");
  });

  test("line editing prefers Claude Sonnet catalog candidate", () => {
    const route = getModelRoute("line_editing");
    assert.equal(route.preferredCatalogCandidate.exactModel, "claude-sonnet-5");
    assert.equal(route.executionReadiness, "preferred_route_commissioned");
  });

  test("proofreading prefers GPT-5.4 catalog candidate", () => {
    const route = getModelRoute("proofreading");
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

  test("selects commissioned Claude route when preferred deployment is present", () => {
    const result = resolveModelRoute("editorial_diagnostic", {
      deployedAliases: ["jm1-editorial-devline-primary", DEPLOYED_MODEL_BASELINE.deploymentAlias],
      preferredDeployedAlias: "jm1-editorial-devline-primary"
    });

    assert.equal(result.ok, true);
    assert.equal(result.fellBack, false);
    assert.equal(result.selectedModel.exactModel, "claude-sonnet-5");
    assert.equal(result.selectedModel.deploymentAlias, "jm1-editorial-devline-primary");
  });

  test("fails closed when no approved deployment exists", () => {
    const result = resolveModelRoute("proofreading", {
      deployedAliases: []
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "NO_APPROVED_DEPLOYMENT_AVAILABLE");
  });
});
