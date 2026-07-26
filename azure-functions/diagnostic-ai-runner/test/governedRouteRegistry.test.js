"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  CONTROLLED_EXECUTION_TYPE,
  SHADOW_EXECUTION_TYPE
} = require("../src/controlled/executionAuthorization");
const {
  LEGACY_PROVIDER_OVERRIDE_ENV,
  PROVIDERS,
  resolveGovernedRoute
} = require("../src/model/governedRouteRegistry");

function withEnv(vars, fn) {
  const originals = {};
  for (const [k, v] of Object.entries(vars)) {
    originals[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(originals)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

describe("governed route registry", () => {
  test("fails closed when alias is missing and legacy override is closed", () => {
    withEnv({ [LEGACY_PROVIDER_OVERRIDE_ENV]: "false", JM1_AI_PROVIDER: undefined }, () => {
      const result = resolveGovernedRoute({ executionType: CONTROLLED_EXECUTION_TYPE });
      assert.equal(result.ok, false);
      assert.equal(result.error, "AI_ROUTE_ALIAS_MISSING");
    });
  });

  test("resolves azure fallback route for diagnostic alias", () => {
    const result = resolveGovernedRoute({
      executionType: CONTROLLED_EXECUTION_TYPE,
      modelDeploymentAlias: "jm1-pub-diagnostic-primary"
    });
    assert.equal(result.ok, true);
    assert.equal(result.route.provider, PROVIDERS.AZURE_OPENAI);
    assert.equal(result.route.certificationStatus, "governed-fallback-certified");
  });

  test("falls back explicitly when Foundry Claude route is not certified", () => {
    const result = resolveGovernedRoute({
      executionType: SHADOW_EXECUTION_TYPE,
      modelDeploymentAlias: "jm1-editorial-devline-primary",
      allowFallback: true
    });
    assert.equal(result.ok, true);
    assert.equal(result.route.provider, PROVIDERS.AZURE_OPENAI);
    assert.equal(result.route.fallbackFromAlias, "jm1-editorial-devline-primary");
  });

  test("blocks uncertified route when fallback is not allowed", () => {
    const result = resolveGovernedRoute({
      executionType: SHADOW_EXECUTION_TYPE,
      modelDeploymentAlias: "jm1-editorial-devline-primary",
      allowFallback: false
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "AI_ROUTE_NOT_CERTIFIED");
  });
});
