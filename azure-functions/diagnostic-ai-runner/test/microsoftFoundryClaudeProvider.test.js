"use strict";

const { afterEach, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const providerPath = path.resolve(
  __dirname,
  "../src/model/providers/microsoftFoundryClaudeProvider.js"
);

function withEnv(vars, fn) {
  const originals = {};
  for (const [key, value] of Object.entries(vars)) {
    originals[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function loadProviderWithStubs({
  credentialToken = "foundry-token",
  fetchImpl,
  trackDependencyImpl
} = {}) {
  delete require.cache[providerPath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@azure/identity") {
      return {
        DefaultAzureCredential: class {
          async getToken(scope) {
            return { token: credentialToken, scope };
          }
        }
      };
    }

    if (request === "../../observability/dependencyTelemetry") {
      return {
        trackDependency: trackDependencyImpl || (async (_telemetry, _meta, fn) => fn())
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  global.fetch = fetchImpl;
  const loaded = require(providerPath);

  return {
    loaded,
    restore() {
      delete require.cache[providerPath];
      Module._load = originalLoad;
      delete global.fetch;
    }
  };
}

afterEach(() => {
  delete global.fetch;
});

describe("microsoftFoundryClaudeProvider", () => {
  test("fails closed when endpoint or route deployment is missing", async () => {
    const { loaded, restore } = loadProviderWithStubs();
    try {
      await withEnv({ AZURE_FOUNDRY_ENDPOINT: undefined }, async () => {
        const result = await loaded.call({
          promptBody: "{\"task\":\"test\"}",
          diagnosticId: "diag-1",
          route: {}
        });

        assert.equal(result.ok, false);
        assert.match(result.error, /MICROSOFT_FOUNDRY_CONFIG_MISSING/);
      });
    } finally {
      restore();
    }
  });

  test("uses governed Anthropic Messages endpoint, bearer auth, and route deployment name", async () => {
    const calls = [];
    const dependencyCalls = [];

    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          async json() {
            return {
              content: [{ type: "text", text: "{\"ok\":true,\"provider\":\"foundry\"}" }],
              usage: { input_tokens: 11, output_tokens: 7 }
            };
          }
        };
      },
      trackDependencyImpl: async (telemetry, meta, fn) => {
        dependencyCalls.push({ telemetry, meta });
        return fn();
      }
    });

    try {
      await withEnv(
        {
          AZURE_FOUNDRY_ENDPOINT: "https://ais-jm1-foundry.services.ai.azure.com/",
          AZURE_FOUNDRY_ANTHROPIC_VERSION: "2023-06-01",
          AZURE_FOUNDRY_TIMEOUT_MS: "5000",
          AZURE_FOUNDRY_MAX_RETRIES: "1",
          AZURE_FOUNDRY_BASE_DELAY_MS: "1",
          AZURE_FOUNDRY_JITTER_RATIO: "0"
        },
        async () => {
          const result = await loaded.call({
            promptBody: "{\"task\":\"analyze\"}",
            diagnosticId: "diag-2",
            telemetry: { correlationId: "corr-1" },
            route: {
              deploymentName: "jm1-editorial-devline-primary",
              model: "claude-sonnet-5",
              version: "2"
            }
          });

          assert.equal(result.ok, true);
          assert.equal(result.provider, "microsoft-foundry-claude");
          assert.equal(result.output.ok, true);
          assert.equal(result.tokenCounts.total, 18);
          assert.equal(result.responseClassification, "direct-json");
        }
      );

      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].url,
        "https://ais-jm1-foundry.services.ai.azure.com/anthropic/v1/messages"
      );
      assert.equal(calls[0].init.method, "POST");
      assert.equal(calls[0].init.headers.Authorization, "Bearer foundry-token");
      assert.equal(calls[0].init.headers["Content-Type"], "application/json");
      assert.equal(calls[0].init.headers["anthropic-version"], "2023-06-01");

      const parsedBody = JSON.parse(calls[0].init.body);
      assert.equal(parsedBody.temperature, undefined);
      assert.equal(parsedBody.max_tokens, 4096);
      assert.equal(parsedBody.stream, false);
      assert.equal(parsedBody.model, "jm1-editorial-devline-primary");
      assert.equal(parsedBody.tools[0].name, "submit_jm1_structured_output");
      assert.equal(parsedBody.tool_choice.name, "submit_jm1_structured_output");
      assert.equal(parsedBody.messages[0].role, "user");
      assert.equal(parsedBody.messages[0].content, "{\"task\":\"analyze\"}");

      assert.equal(dependencyCalls.length, 1);
      assert.equal(dependencyCalls[0].meta.dependencyTypeName, "Microsoft Foundry");
      assert.equal(dependencyCalls[0].meta.properties.provider, "microsoft-foundry-claude");
      assert.equal(dependencyCalls[0].meta.properties.model, "claude-sonnet-5");
    } finally {
      restore();
    }
  });

  test("accepts structured tool_use output before falling back to text JSON parsing", async () => {
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        async json() {
          return {
            content: [
              {
                type: "tool_use",
                name: "submit_jm1_structured_output",
                input: {
                  editedManuscript: "Edited chunk text.",
                  lineEditingSummary: "Completed."
                }
              }
            ],
            usage: { input_tokens: 9, output_tokens: 8 }
          };
        }
      })
    });

    try {
      await withEnv(
        { AZURE_FOUNDRY_ENDPOINT: "https://ais-jm1-foundry.services.ai.azure.com/" },
        async () => {
          const result = await loaded.call({
            promptBody: "{\"task\":\"line\"}",
            diagnosticId: "diag-tool",
            route: { deploymentName: "jm1-editorial-devline-primary" }
          });

          assert.equal(result.ok, true);
          assert.equal(result.responseClassification, "tool-use");
          assert.equal(result.output.editedManuscript, "Edited chunk text.");
          assert.equal(result.request.responseContract, "anthropic-messages-tool");
        }
      );
    } finally {
      restore();
    }
  });

  test("classifies malformed model output without pretending success", async () => {
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        async json() {
          return {
            content: [{ type: "text", text: "```json\nnot-json\n```" }],
            usage: { input_tokens: 5, output_tokens: 5 }
          };
        }
      })
    });

    try {
      await withEnv(
        { AZURE_FOUNDRY_ENDPOINT: "https://ais-jm1-foundry.services.ai.azure.com/" },
        async () => {
          const result = await loaded.call({
            promptBody: "{\"task\":\"analyze\"}",
            diagnosticId: "diag-3",
            route: { deploymentName: "jm1-editorial-devline-primary" }
          });

          assert.equal(result.ok, false);
          assert.equal(result.error, "MODEL_RESPONSE_FENCED_JSON_INVALID");
          assert.equal(result.httpStatus, 200);
        }
      );
    } finally {
      restore();
    }
  });

  test("extractTextContent joins Anthropic text content blocks", () => {
    const { loaded, restore } = loadProviderWithStubs();
    try {
      assert.equal(
        loaded.extractTextContent({
          content: [
            { type: "text", text: "{\"a\":" },
            { type: "thinking", thinking: "ignored" },
            { type: "text", text: "true}" }
          ]
        }),
        "{\"a\":\ntrue}"
      );
    } finally {
      restore();
    }
  });
});
