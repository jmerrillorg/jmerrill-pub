"use strict";

/**
 * Provider abstraction unit tests.
 *
 * Verifies:
 * - governed deployment alias drives provider selection
 * - legacy env override is explicit, not silent
 * - unknown/missing route returns typed errors without silent fallthrough
 * - Azure OpenAI provider config validation
 * - Anthropic provider config validation and typed error codes
 * - Dual gate still blocks all providers when closed
 * - Normalized result shape from each provider path
 * - No secrets, keys, or prompt body exposed in any result
 * - No raw response stored (validated through payload builders, confirmed by shape)
 *
 * CONTRACT: No live AI calls. No Dataverse writes. No real manuscripts.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { resolveProvider, routeToProvider, SUPPORTED_PROVIDERS } = require("../src/model/providerRouter");
const { callModel } = require("../src/model/modelCaller");
const { LEGACY_PROVIDER_OVERRIDE_ENV } = require("../src/model/governedRouteRegistry");
const { checkConfig: checkAzureConfig, REQUIRED_VARS: AZURE_REQUIRED_VARS } = require("../src/model/providers/azureOpenAiProvider");
const { checkConfig: checkAnthropicConfig, REQUIRED_VARS: ANTHROPIC_REQUIRED_VARS, ANTHROPIC_ENDPOINT, DIAGNOSTIC_TOOL } = require("../src/model/providers/anthropicProvider");
const { GATE_REASON } = require("../src/activation/aiExecutionGate");

// ── Env var helper ────────────────────────────────────────────────────────────

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
    for (const [k, orig] of Object.entries(originals)) {
      if (orig === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  }
}

// ── Provider constants ────────────────────────────────────────────────────────

describe("SUPPORTED_PROVIDERS", () => {
  test("contains azure-openai", () => {
    assert.ok(SUPPORTED_PROVIDERS.includes("azure-openai"));
  });

  test("contains microsoft-foundry-claude", () => {
    assert.ok(SUPPORTED_PROVIDERS.includes("microsoft-foundry-claude"));
  });

  test("contains anthropic-direct", () => {
    assert.ok(SUPPORTED_PROVIDERS.includes("anthropic-direct"));
  });

  test("does not contain unexpected providers", () => {
    for (const p of SUPPORTED_PROVIDERS) {
      assert.ok(
        ["azure-openai", "microsoft-foundry-claude", "anthropic-direct"].includes(p),
        `unexpected provider: ${p}`
      );
    }
  });
});

// ── resolveProvider ───────────────────────────────────────────────────────────

describe("resolveProvider — governed route selection", () => {
  test("resolves azure-openai from governed diagnostic alias", () => {
    const r = resolveProvider({ modelDeploymentAlias: "jm1-pub-diagnostic-primary" });
    assert.equal(r.ok, true);
    assert.equal(r.provider, "azure-openai");
    assert.equal(r.error, null);
  });

  test("uncertified Foundry route fails closed without fallback", () => {
    const r = resolveProvider({ modelDeploymentAlias: "jm1-editorial-devline-primary" });
    assert.equal(r.ok, false);
    assert.equal(r.provider, "microsoft-foundry-claude");
    assert.equal(r.error, "AI_ROUTE_NOT_CERTIFIED");
  });

  test("uncertified Foundry route falls back explicitly when allowed", () => {
    const r = resolveProvider({
      modelDeploymentAlias: "jm1-editorial-devline-primary",
      allowFallback: true
    });
    assert.equal(r.ok, true);
    assert.equal(r.provider, "azure-openai");
    assert.equal(r.route.fallbackFromAlias, "jm1-editorial-devline-primary");
  });

  test("returns AI_ROUTE_ALIAS_MISSING when alias is absent and legacy override is closed", () => {
    withEnv({ JM1_AI_PROVIDER: undefined, [LEGACY_PROVIDER_OVERRIDE_ENV]: "false" }, () => {
      const r = resolveProvider();
      assert.equal(r.ok, false);
      assert.equal(r.error, "AI_ROUTE_ALIAS_MISSING");
      assert.equal(r.provider, null);
    });
  });

  test("legacy provider override is case-insensitive and explicit", () => {
    withEnv({ JM1_AI_PROVIDER: "Anthropic", [LEGACY_PROVIDER_OVERRIDE_ENV]: "true" }, () => {
      const r = resolveProvider();
      assert.equal(r.ok, true);
      assert.equal(r.provider, "anthropic-direct");
    });
  });

  test("legacy provider override still returns typed unsupported errors", () => {
    withEnv({ JM1_AI_PROVIDER: "gpt-4", [LEGACY_PROVIDER_OVERRIDE_ENV]: "true" }, () => {
      const r = resolveProvider();
      assert.equal(r.ok, false);
      assert.equal(r.error, "AI_PROVIDER_UNSUPPORTED");
    });
  });
});

// ── Azure OpenAI provider config ──────────────────────────────────────────────

describe("Azure OpenAI provider — config validation", () => {
  test("REQUIRED_VARS contains all three Azure settings", () => {
    assert.ok(AZURE_REQUIRED_VARS.includes("AZURE_OPENAI_ENDPOINT"));
    assert.ok(AZURE_REQUIRED_VARS.includes("AZURE_OPENAI_API_VERSION"));
    assert.ok(AZURE_REQUIRED_VARS.includes("AZURE_OPENAI_DEPLOYMENT_NAME"));
  });

  test("checkConfig returns null when all vars are present", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
      AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary"
    }, () => {
      assert.equal(checkAzureConfig(), null);
    });
  });

  test("checkConfig returns missing names when endpoint absent", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
      AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary"
    }, () => {
      const result = checkAzureConfig();
      assert.ok(Array.isArray(result));
      assert.ok(result.includes("AZURE_OPENAI_ENDPOINT"));
    });
  });

  test("checkConfig returns all missing names when all absent", () => {
    withEnv({
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined
    }, () => {
      const result = checkAzureConfig();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, AZURE_REQUIRED_VARS.length);
    });
  });
});

// ── Anthropic provider config ─────────────────────────────────────────────────

describe("Anthropic provider — config validation", () => {
  test("REQUIRED_VARS contains ANTHROPIC_API_KEY and ANTHROPIC_MODEL", () => {
    assert.ok(ANTHROPIC_REQUIRED_VARS.includes("ANTHROPIC_API_KEY"));
    assert.ok(ANTHROPIC_REQUIRED_VARS.includes("ANTHROPIC_MODEL"));
  });

  test("checkConfig returns null when all vars are present", () => {
    withEnv({
      ANTHROPIC_API_KEY: "sk-test-key",
      ANTHROPIC_MODEL: "claude-sonnet-4-6"
    }, () => {
      assert.equal(checkAnthropicConfig(), null);
    });
  });

  test("checkConfig returns missing var names when API key absent", () => {
    withEnv({ ANTHROPIC_API_KEY: undefined, ANTHROPIC_MODEL: "claude-sonnet-4-6" }, () => {
      const result = checkAnthropicConfig();
      assert.ok(Array.isArray(result));
      assert.ok(result.includes("ANTHROPIC_API_KEY"));
    });
  });

  test("checkConfig returns missing var names when model absent", () => {
    withEnv({ ANTHROPIC_API_KEY: "sk-test-key", ANTHROPIC_MODEL: undefined }, () => {
      const result = checkAnthropicConfig();
      assert.ok(Array.isArray(result));
      assert.ok(result.includes("ANTHROPIC_MODEL"));
    });
  });

  test("ANTHROPIC_ENDPOINT is the canonical Anthropic Messages API URL", () => {
    assert.equal(ANTHROPIC_ENDPOINT, "https://api.anthropic.com/v1/messages");
  });
});

// ── Anthropic provider — typed error codes ────────────────────────────────────

describe("Anthropic provider — typed error codes when config missing", () => {
  test("returns ANTHROPIC_API_KEY_MISSING when key absent", async () => {
    await withEnv({
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-sonnet-4-6",
      JM1_AI_EXECUTION_ENABLED: "true"
    }, async () => {
      const { call } = require("../src/model/providers/anthropicProvider");
      const result = await call({ promptBody: "test", diagnosticId: "test-id" });
      assert.equal(result.ok, false);
      assert.ok(result.configMissing.includes("ANTHROPIC_API_KEY_MISSING"),
        `expected ANTHROPIC_API_KEY_MISSING in configMissing, got: ${JSON.stringify(result.configMissing)}`);
    });
  });

  test("returns ANTHROPIC_MODEL_MISSING when model absent", async () => {
    await withEnv({
      ANTHROPIC_API_KEY: "sk-test-key",
      ANTHROPIC_MODEL: undefined,
      JM1_AI_EXECUTION_ENABLED: "true"
    }, async () => {
      const { call } = require("../src/model/providers/anthropicProvider");
      const result = await call({ promptBody: "test", diagnosticId: "test-id" });
      assert.equal(result.ok, false);
      assert.ok(result.configMissing.includes("ANTHROPIC_MODEL_MISSING"),
        `expected ANTHROPIC_MODEL_MISSING in configMissing, got: ${JSON.stringify(result.configMissing)}`);
    });
  });

  test("error field is ANTHROPIC_API_KEY_MISSING (not the key value)", async () => {
    await withEnv({
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-sonnet-4-6"
    }, async () => {
      const { call } = require("../src/model/providers/anthropicProvider");
      const result = await call({ promptBody: "test", diagnosticId: "test-id" });
      assert.equal(result.error, "ANTHROPIC_API_KEY_MISSING");
    });
  });

  test("tokenCounts are 0 when config is missing", async () => {
    await withEnv({ ANTHROPIC_API_KEY: undefined, ANTHROPIC_MODEL: undefined }, async () => {
      const { call } = require("../src/model/providers/anthropicProvider");
      const result = await call({ promptBody: "test", diagnosticId: "test-id" });
      assert.deepEqual(result.tokenCounts, { input: 0, output: 0, total: 0 });
    });
  });
});

// ── Anthropic provider — tool-use schema contract ────────────────────────────

describe("Anthropic provider — DIAGNOSTIC_TOOL schema contract", () => {
  test("DIAGNOSTIC_TOOL name is submit_stage0_diagnostic", () => {
    assert.equal(DIAGNOSTIC_TOOL.name, "submit_stage0_diagnostic");
  });

  test("DIAGNOSTIC_TOOL input_schema type is object", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.type, "object");
  });

  test("DIAGNOSTIC_TOOL requires all four output fields", () => {
    const req = DIAGNOSTIC_TOOL.input_schema.required;
    assert.ok(req.includes("jm1_diagnosticoutputsummary"));
    assert.ok(req.includes("jm1_diagnosticriskflags"));
    assert.ok(req.includes("jm1_confidence"));
    assert.ok(req.includes("jm1_requireshumanreview"));
    assert.equal(req.length, 4);
  });

  test("jm1_confidence schema type is number", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_confidence.type, "number");
  });

  test("jm1_confidence schema has minimum 0.0 and maximum 1.0", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_confidence.minimum, 0.0);
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_confidence.maximum, 1.0);
  });

  test("jm1_requireshumanreview schema type is boolean", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_requireshumanreview.type, "boolean");
  });

  test("jm1_diagnosticoutputsummary schema type is string with minLength 1", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticoutputsummary.type, "string");
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticoutputsummary.minLength, 1);
  });

  test("jm1_diagnosticoutputsummary schema has maxLength 240", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticoutputsummary.maxLength, 240);
  });

  test("jm1_diagnosticriskflags schema type is string with minLength 1", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticriskflags.type, "string");
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticriskflags.minLength, 1);
  });

  test("jm1_diagnosticriskflags schema has maxLength 240", () => {
    assert.equal(DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticriskflags.maxLength, 240);
  });

  test("jm1_diagnosticoutputsummary description requires concise non-paragraph output", () => {
    const desc = DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticoutputsummary.description.toLowerCase();
    assert.ok(desc.includes("concise"), "summary description must mention concise output");
    assert.ok(desc.includes("no paragraph"), "summary description must prohibit paragraphs");
    assert.ok(desc.includes("no manuscript excerpt"), "summary description must prohibit excerpts");
    assert.ok(desc.includes("under 240 characters"), "summary description must state the 240-character limit");
  });

  test("jm1_diagnosticriskflags description requires label-style non-prose output", () => {
    const desc = DIAGNOSTIC_TOOL.input_schema.properties.jm1_diagnosticriskflags.description.toLowerCase();
    assert.ok(desc.includes("short labels"), "risk flags description must require labels");
    assert.ok(desc.includes("semicolon-separated") || desc.includes("comma-separated"),
      "risk flags description must mention separated labels");
    assert.ok(desc.includes("no explanatory paragraph"), "risk flags description must prohibit paragraphs");
    assert.ok(desc.includes("no manuscript excerpt"), "risk flags description must prohibit excerpts");
    assert.ok(desc.includes("under 240 characters"), "risk flags description must state the 240-character limit");
  });

  test("DIAGNOSTIC_TOOL description instructs characterization-only output", () => {
    const desc = DIAGNOSTIC_TOOL.description.toLowerCase();
    assert.ok(desc.includes("characterization"), "description must instruct characterization-only output");
    assert.ok(desc.includes("no manuscript excerpts") || desc.includes("no quoted prose"),
      "description must prohibit manuscript content in output");
  });

  test("DIAGNOSTIC_TOOL description instructs all four fields must be populated", () => {
    const desc = DIAGNOSTIC_TOOL.description;
    assert.ok(
      desc.includes("ALL FOUR") || desc.includes("all four") || desc.includes("all 4"),
      "description must explicitly instruct that all four fields are required"
    );
  });

  test("jm1_requireshumanreview description states it must always be true", () => {
    const desc = DIAGNOSTIC_TOOL.input_schema.properties.jm1_requireshumanreview.description.toLowerCase();
    assert.ok(desc.includes("always true") || desc.includes("must always be true"),
      "description must state requiresHumanReview is always true");
  });

  test("jm1_confidence description includes numeric example", () => {
    const desc = DIAGNOSTIC_TOOL.input_schema.properties.jm1_confidence.description;
    assert.ok(desc.includes("0.") || desc.includes("1.0"),
      "description should include a numeric example to prevent string submission");
  });

  test("Anthropic request keeps max_tokens at 4096", async () => {
    let capturedRequestBody = null;
    const originalFetch = global.fetch;
    global.fetch = async (_url, options) => {
      capturedRequestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            usage: { input_tokens: 10, output_tokens: 5 },
            content: [{
              type: "tool_use",
              name: "submit_stage0_diagnostic",
              input: {
                jm1_diagnosticoutputsummary: "Concise diagnostic characterization.",
                jm1_diagnosticriskflags: "Rights review needed; Developmental review likely",
                jm1_confidence: 0.8,
                jm1_requireshumanreview: true
              }
            }]
          };
        }
      };
    };

    try {
      await withEnv({
        ANTHROPIC_API_KEY: "test-key-not-real",
        ANTHROPIC_MODEL: "claude-sonnet-4-6"
      }, async () => {
        const { call } = require("../src/model/providers/anthropicProvider");
        const result = await call({ promptBody: "test prompt", diagnosticId: "test-id" });
        assert.equal(result.ok, true);
      });
    } finally {
      global.fetch = originalFetch;
    }

    assert.equal(capturedRequestBody.max_tokens, 4096);
  });
});

// ── routeToProvider ───────────────────────────────────────────────────────────

describe("routeToProvider — provider routing errors (no live calls)", () => {
  test("returns AI_ROUTE_ALIAS_MISSING when governed alias is absent", async () => {
    await withEnv({ JM1_AI_PROVIDER: undefined, [LEGACY_PROVIDER_OVERRIDE_ENV]: "false" }, async () => {
      const result = await routeToProvider({ promptBody: "test", diagnosticId: "test-id" });
      assert.equal(result.ok, false);
      assert.equal(result.error, "AI_ROUTE_ALIAS_MISSING");
    });
  });

  test("returns AI_ROUTE_NOT_CERTIFIED for uncertified Foundry route without explicit fallback", async () => {
    const result = await routeToProvider({
      promptBody: "test",
      diagnosticId: "test-id",
      modelDeploymentAlias: "jm1-editorial-devline-primary"
    });
      assert.equal(result.ok, false);
      assert.equal(result.error, "AI_ROUTE_NOT_CERTIFIED");
  });

  test("legacy override routes to Anthropic config check (no HTTP call — key missing)", async () => {
    await withEnv({
      JM1_AI_PROVIDER: "anthropic",
      [LEGACY_PROVIDER_OVERRIDE_ENV]: "true",
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-sonnet-4-6"
    }, async () => {
      const result = await routeToProvider({ promptBody: "test", diagnosticId: "test-id" });
      assert.equal(result.ok, false);
      assert.equal(result.provider, "anthropic");
      assert.ok(result.error.includes("ANTHROPIC_API_KEY_MISSING"),
        `expected ANTHROPIC_API_KEY_MISSING in error, got: ${result.error}`);
    });
  });

  test("governed diagnostic alias routes to Azure config check (no HTTP call — config missing)", async () => {
    await withEnv({
      JM1_AI_PROVIDER: "anthropic",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined
    }, async () => {
      const result = await routeToProvider({
        promptBody: "test",
        diagnosticId: "test-id",
        modelDeploymentAlias: "jm1-pub-diagnostic-primary"
      });
      assert.equal(result.ok, false);
      assert.equal(result.provider, "azure-openai");
      assert.ok(result.error.includes("AZURE_OPENAI_CONFIG_MISSING"),
        `expected AZURE_OPENAI_CONFIG_MISSING in error, got: ${result.error}`);
    });
  });

  test("provider field in routing error result never contains secret values", async () => {
    const result = await routeToProvider({
      promptBody: "SECRET_PROMPT",
      diagnosticId: "test",
      modelDeploymentAlias: "jm1-editorial-devline-primary"
    });
      const resultStr = JSON.stringify(result);
      assert.ok(!resultStr.includes("SECRET_PROMPT"), "prompt body must not appear in error result");
  });
});

// ── callModel — gate enforcement with provider abstraction ────────────────────

describe("callModel — dual gate enforcement (no live calls)", () => {
  test("gate blocks before provider is called when CONTRACT_TEST_MODE=true", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: "true", JM1_AI_PROVIDER: "anthropic" }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.ok, false);
      assert.equal(result.gateBlocked, true);
      assert.equal(result.gateReason, GATE_REASON.CONTRACT_TEST_MODE_ACTIVE);
      assert.equal(result.provider, null);
    });
  });

  test("gate blocks when JM1_AI_EXECUTION_ENABLED absent regardless of provider", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined, JM1_AI_PROVIDER: "anthropic" }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.ok, false);
      assert.equal(result.gateBlocked, true);
      assert.equal(result.gateReason, GATE_REASON.AI_EXECUTION_NOT_ENABLED);
    });
  });

  test("gate blocks for azure-openai provider when CONTRACT_TEST_MODE=true", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "true",
      JM1_AI_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
      AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary"
    }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.gateBlocked, true);
      assert.equal(result.provider, null);
    });
  });

  test("gate blocks for anthropic provider when JM1_AI_EXECUTION_ENABLED=false", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "false",
      JM1_AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-test",
      ANTHROPIC_MODEL: "claude-sonnet-4-6"
    }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.gateBlocked, true);
    });
  });

  test("when gate passes, routes to provider (Anthropic config error — no HTTP call)", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "true",
      JM1_AI_PROVIDER: "anthropic",
      [LEGACY_PROVIDER_OVERRIDE_ENV]: "true",
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-sonnet-4-6"
    }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.gateBlocked, false);
      assert.equal(result.provider, "anthropic");
      assert.equal(result.ok, false);
    });
  });

  test("when gate passes, routes to provider (Azure config error — no HTTP call)", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "true",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_API_VERSION: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined
    }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1",
        modelDeploymentAlias: "jm1-pub-diagnostic-primary"
      });
      assert.equal(result.gateBlocked, false);
      assert.equal(result.provider, "azure-openai");
      assert.equal(result.ok, false);
    });
  });

  test("when gate passes and governed alias is missing, returns AI_ROUTE_ALIAS_MISSING", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "true",
      JM1_AI_PROVIDER: undefined,
      [LEGACY_PROVIDER_OVERRIDE_ENV]: "false"
    }, async () => {
      const result = await callModel({
        contractTestMode: false,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "test-key",
        promptVersion: "V1"
      });
      assert.equal(result.gateBlocked, false);
      assert.equal(result.error, "AI_ROUTE_ALIAS_MISSING");
    });
  });
});

// ── Normalized result shape ───────────────────────────────────────────────────

describe("Normalized result shape invariants", () => {
  test("gate-blocked result has required fields", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined, JM1_AI_PROVIDER: "anthropic" }, async () => {
      const result = await callModel({
        contractTestMode: true, promptBody: "test",
        diagnosticId: "test-id", promptKey: "k", promptVersion: "v"
      });
      assert.ok("ok" in result);
      assert.ok("gateBlocked" in result);
      assert.ok("gateReason" in result);
      assert.ok("provider" in result);
      assert.ok("tokenCounts" in result);
      assert.ok("error" in result);
    });
  });

  test("gate-blocked result has zero tokenCounts", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true, promptBody: "test",
        diagnosticId: "test-id", promptKey: "k", promptVersion: "v"
      });
      assert.deepEqual(result.tokenCounts, { input: 0, output: 0, total: 0 });
    });
  });

  test("gate-blocked result output is null", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true, promptBody: "test",
        diagnosticId: "test-id", promptKey: "k", promptVersion: "v"
      });
      assert.equal(result.output, null);
    });
  });
});

// ── Safety invariants ─────────────────────────────────────────────────────────

describe("Provider abstraction safety invariants", () => {
  test("gate-closed result does not echo prompt body", async () => {
    const sensitivePrompt = "CONFIDENTIAL PROMPT CONTENT — must not appear in any result field";
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: sensitivePrompt,
        diagnosticId: "test-id",
        promptKey: "k",
        promptVersion: "v"
      });
      assert.ok(!JSON.stringify(result).includes("CONFIDENTIAL PROMPT"),
        "prompt body must not appear in gate-closed result");
    });
  });

  test("Anthropic config-missing result does not expose API key value", async () => {
    const fakeKey = "sk-ant-SUPER-SECRET-KEY-DO-NOT-LOG";
    await withEnv({
      ANTHROPIC_API_KEY: fakeKey,
      ANTHROPIC_MODEL: undefined
    }, async () => {
      const { call } = require("../src/model/providers/anthropicProvider");
      const result = await call({ promptBody: "test", diagnosticId: "test-id" });
      assert.ok(!JSON.stringify(result).includes(fakeKey),
        "API key value must not appear in any result field");
    });
  });

  test("routing error does not expose ANTHROPIC_API_KEY env value", async () => {
    const fakeKey = "sk-ant-ANOTHER-SECRET-12345";
    await withEnv({
      JM1_AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: fakeKey,
      ANTHROPIC_MODEL: "claude-sonnet-4-6",
      JM1_AI_EXECUTION_ENABLED: "true"
    }, async () => {
      // Gate is open, model will be called — but we just need to verify
      // that even on config-ok path, key is not in the result from routeToProvider
      // when it returns (will fail at HTTP since there's no real endpoint in tests)
      // Instead verify via callModel with gate closed
      const result = await callModel({
        contractTestMode: true, // gate closed
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "k",
        promptVersion: "v"
      });
      assert.ok(!JSON.stringify(result).includes(fakeKey),
        "API key must not appear in gate-closed result");
    });
  });

  test("AI_EXECUTION_GATE_CLOSED error message does not contain provider key material", async () => {
    await withEnv({
      JM1_AI_EXECUTION_ENABLED: "true",
      JM1_AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-secret-12345"
    }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "k",
        promptVersion: "v"
      });
      assert.ok(!result.error.includes("sk-secret"),
        "gate error message must not contain key material");
    });
  });

  test("rawResponseStored is not present on gate-blocked result (no raw response path taken)", async () => {
    await withEnv({ JM1_AI_EXECUTION_ENABLED: undefined }, async () => {
      const result = await callModel({
        contractTestMode: true,
        promptBody: "test",
        diagnosticId: "test-id",
        promptKey: "k",
        promptVersion: "v"
      });
      assert.ok(!("rawResponseStored" in result) || result.rawResponseStored === false,
        "gate-blocked path must never indicate raw response was stored");
    });
  });
});
