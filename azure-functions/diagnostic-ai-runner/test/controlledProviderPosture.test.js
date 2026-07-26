"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { resolveProvider } = require("../src/model/providerRouter");

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

describe("controlled provider posture", () => {
  test("controlled synthetic execution resolves the governed azure fallback route", () => {
    withEnv({ JM1_AI_PROVIDER: "anthropic" }, () => {
      const result = resolveProvider({
        executionType: "CONTROLLED_SYNTHETIC_DIAGNOSTIC",
        modelDeploymentAlias: "jm1-pub-diagnostic-primary"
      });
      assert.equal(result.ok, true);
      assert.equal(result.error, null);
      assert.equal(result.provider, "azure-openai");
    });
  });

  test("controlled synthetic execution keeps the registry-selected alias visible", () => {
    withEnv({ JM1_AI_PROVIDER: "azure-openai" }, () => {
      const result = resolveProvider({
        executionType: "CONTROLLED_SYNTHETIC_DIAGNOSTIC",
        modelDeploymentAlias: "jm1-pub-diagnostic-primary"
      });
      assert.equal(result.ok, true);
      assert.equal(result.provider, "azure-openai");
      assert.equal(result.route.deploymentAlias, "jm1-pub-diagnostic-primary");
    });
  });
});
