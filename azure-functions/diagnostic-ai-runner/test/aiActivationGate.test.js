"use strict";

/**
 * Activation gate unit tests.
 *
 * Proves that AI cannot execute unless BOTH gates are intentionally opened:
 *   1. CONTRACT_TEST_MODE=false (requires Jackie Approval 1 + code change)
 *   2. JM1_AI_EXECUTION_ENABLED=true (requires env var to be explicitly set)
 *
 * These tests run without any live HTTP calls, Azure credentials, or Dataverse
 * access. They test only the gate logic and the model caller's gate enforcement.
 *
 * CONTRACT: No AI calls. No real manuscripts. No Dataverse writes.
 */

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { checkAiExecutionGate, getGateState, GATE_REASON } = require("../src/activation/aiExecutionGate");
const { callModel, checkModelConfig, REQUIRED_ENV_VARS } = require("../src/ai/modelCaller");

// ── Helper: capture and restore env vars ─────────────────────────────────────

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

// ── Dual-gate logic ───────────────────────────────────────────────────────────

describe("checkAiExecutionGate — CONTRACT_TEST_MODE=true (current state)", () => {
  test("gate is closed when CONTRACT_TEST_MODE is true regardless of env var", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, () => {
      const result = checkAiExecutionGate(true);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.CONTRACT_TEST_MODE_ACTIVE);
    });
  });

  test("gate is closed when CONTRACT_TEST_MODE is true and env var is absent", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, () => {
      const result = checkAiExecutionGate(true);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.CONTRACT_TEST_MODE_ACTIVE);
    });
  });

  test("gate is closed when CONTRACT_TEST_MODE is true and env var is false", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "false" }, () => {
      const result = checkAiExecutionGate(true);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.CONTRACT_TEST_MODE_ACTIVE);
    });
  });
});

describe("checkAiExecutionGate — CONTRACT_TEST_MODE=false (post-approval state)", () => {
  test("gate is closed when CONTRACT_TEST_MODE is false but env var is absent", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, () => {
      const result = checkAiExecutionGate(false);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
    });
  });

  test("gate is closed when CONTRACT_TEST_MODE is false but env var is 'false'", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "false" }, () => {
      const result = checkAiExecutionGate(false);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
    });
  });

  test("gate is closed when CONTRACT_TEST_MODE is false but env var is '1' (not 'true')", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "1" }, () => {
      const result = checkAiExecutionGate(false);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
    });
  });

  test("gate is closed when CONTRACT_TEST_MODE is false but env var is 'TRUE' (case-sensitive)", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "TRUE" }, () => {
      const result = checkAiExecutionGate(false);
      assert.equal(result.permitted, false);
      assert.equal(result.reason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
    });
  });

  test("gate is open ONLY when CONTRACT_TEST_MODE is false AND env var is exactly 'true'", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, () => {
      const result = checkAiExecutionGate(false);
      assert.equal(result.permitted, true);
      assert.equal(result.reason, GATE_REASON.OPEN);
    });
  });
});

describe("getGateState — returns structured state for logging", () => {
  test("reflects CONTRACT_TEST_MODE=true correctly", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, () => {
      const state = getGateState(true);
      assert.equal(state.contractTestModeActive, true);
      assert.equal(state.aiExecutionEnabled, true);
      assert.equal(state.permitted, false);
    });
  });

  test("reflects both gates open correctly", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, () => {
      const state = getGateState(false);
      assert.equal(state.contractTestModeActive, false);
      assert.equal(state.aiExecutionEnabled, true);
      assert.equal(state.permitted, true);
    });
  });

  test("reflects env var absent correctly", () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, () => {
      const state = getGateState(false);
      assert.equal(state.aiExecutionEnabled, false);
      assert.equal(state.permitted, false);
    });
  });
});

// ── callModel gate enforcement ────────────────────────────────────────────────

describe("callModel — gate enforcement (no HTTP calls made)", () => {
  test("returns gateBlocked=true when CONTRACT_TEST_MODE=true", async () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.ok, false);
      assert.equal(result.gateBlocked, true);
      assert.equal(result.gateReason, GATE_REASON.CONTRACT_TEST_MODE_ACTIVE);
      assert.equal(result.httpStatus, null);
    });
  });

  test("returns gateBlocked=true when env var absent", async () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.ok, false);
      assert.equal(result.gateBlocked, true);
      assert.equal(result.gateReason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
      assert.equal(result.httpStatus, null);
    });
  });

  test("token counts are 0 when gate is closed", async () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.deepEqual(result.tokenCounts, { input: 0, output: 0, total: 0 });
    });
  });

  test("gate-blocked result contains no model output", async () => {
    withEnv({ JM1_AI_EXECUTION_ENABLED: "true" }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.output, null);
    });
  });

  test("gate enforced even if all model env vars are present", async () => {
    withEnv({
      JM1_AI_EXECUTION_ENABLED: "false",
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_VERSION: "2024-02-01",
      AZURE_OPENAI_DEPLOYMENT_NAME: "gpt-4"
    }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.ok, false);
      assert.equal(result.gateBlocked, true);
    });
  });
});

// ── checkModelConfig ──────────────────────────────────────────────────────────

describe("checkModelConfig — required env var presence", () => {
  test("returns null when all required vars are present", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_VERSION: "2024-02-01",
      AZURE_OPENAI_DEPLOYMENT_NAME: "gpt-4"
    }, () => {
      const result = checkModelConfig();
      assert.equal(result, null);
    });
  });

  test("returns missing var names when endpoint is absent", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: "2024-02-01",
      AZURE_OPENAI_DEPLOYMENT_NAME: "gpt-4"
    }, () => {
      const result = checkModelConfig();
      assert.ok(Array.isArray(result));
      assert.ok(result.includes("AZURE_OPENAI_ENDPOINT"));
    });
  });

  test("returns all missing var names when all are absent", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined
    }, () => {
      const result = checkModelConfig();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, REQUIRED_ENV_VARS.length);
    });
  });

  test("gate-blocked result is returned before config is checked", async () => {
    withEnv({
      JM1_AI_EXECUTION_ENABLED: undefined,
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined
    }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.gateBlocked, true);
      assert.equal(result.configMissing, null);
    });
  });
});

// ── Safety invariants ─────────────────────────────────────────────────────────

describe("Activation gate safety invariants", () => {
  test("GATE_REASON constants are non-empty strings", () => {
    for (const [key, val] of Object.entries(GATE_REASON)) {
      assert.equal(typeof val, "string", `GATE_REASON.${key} must be a string`);
      assert.ok(val.length > 0, `GATE_REASON.${key} must be non-empty`);
    }
  });

  test("REQUIRED_ENV_VARS contains all three Azure OpenAI vars", () => {
    assert.ok(REQUIRED_ENV_VARS.includes("AZURE_OPENAI_ENDPOINT"));
    assert.ok(REQUIRED_ENV_VARS.includes("AZURE_OPENAI_API_VERSION"));
    assert.ok(REQUIRED_ENV_VARS.includes("AZURE_OPENAI_DEPLOYMENT_NAME"));
  });

  test("callModel result when gate closed never exposes promptBody in error field", async () => {
    const sensitivePrompt = "SECRET PROMPT CONTENT — must not appear in logs";
    withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: sensitivePrompt,
        diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      const resultStr = JSON.stringify(result);
      assert.ok(!resultStr.includes("SECRET PROMPT"), "gate-blocked result must not echo prompt body");
    });
  });
});
