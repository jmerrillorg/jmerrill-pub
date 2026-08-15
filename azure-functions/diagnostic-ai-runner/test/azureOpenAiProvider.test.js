"use strict";

const { afterEach, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const providerPath = path.resolve(
  __dirname,
  "../src/model/providers/azureOpenAiProvider.js"
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
  credentialToken = "azure-token",
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

describe("azureOpenAiProvider", () => {
  test("uses the governed prompt-only JSON contract by default", async () => {
    const calls = [];
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          async json() {
            return {
              choices: [{ message: { content: "{\"jm1_diagnosticoutputsummary\":\"Ready\",\"jm1_diagnosticriskflags\":\"None\",\"jm1_confidence\":0.8,\"jm1_requireshumanreview\":true}" } }],
              usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 }
            };
          }
        };
      }
    });

    try {
      await withEnv(
        {
          AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
          AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
          AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary",
          AZURE_OPENAI_ENABLE_RESPONSE_FORMAT_JSON_OBJECT: undefined
        },
        async () => {
          const result = await loaded.call({
            promptBody: "Return one valid JSON object only.",
            diagnosticId: "diag-azure-default"
          });
          assert.equal(result.ok, true);
        }
      );
    } finally {
      restore();
    }

    assert.equal(calls.length, 1);
    const parsedBody = JSON.parse(calls[0].init.body);
    assert.equal("response_format" in parsedBody, false);
  });

  test("adds Azure JSON response_format only when explicitly enabled", async () => {
    const calls = [];
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async (_url, init) => {
        calls.push({ init });
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          async json() {
            return {
              choices: [{ message: { content: "{\"ok\":true}" } }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
            };
          }
        };
      }
    });

    try {
      await withEnv(
        {
          AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
          AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
          AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary",
          AZURE_OPENAI_ENABLE_RESPONSE_FORMAT_JSON_OBJECT: "true"
        },
        async () => {
          await loaded.call({
            promptBody: "Return one valid JSON object only.",
            diagnosticId: "diag-azure-json-mode"
          });
        }
      );
    } finally {
      restore();
    }

    const parsedBody = JSON.parse(calls[0].init.body);
    assert.deepEqual(parsedBody.response_format, { type: "json_object" });
  });

  test("returns sanitized Azure 400 detail without logging prompt or manuscript content", async () => {
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        headers: new Headers(),
        async json() {
          return {
            error: {
              message: "This model deployment rejected response_format for this request."
            }
          };
        }
      })
    });

    try {
      await withEnv(
        {
          AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
          AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
          AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary"
        },
        async () => {
          const result = await loaded.call({
            promptBody: "SECRET MANUSCRIPT CONTENT",
            diagnosticId: "diag-azure-400"
          });
          assert.equal(result.ok, false);
          assert.equal(result.httpStatus, 400);
          assert.match(result.error, /^AZURE_OPENAI_HTTP_400:/);
          assert.doesNotMatch(result.error, /SECRET MANUSCRIPT CONTENT/);
        }
      );
    } finally {
      restore();
    }
  });

  test("returns safe Azure 429 rate-limit metadata without prompt content", async () => {
    const { loaded, restore } = loadProviderWithStubs({
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        headers: new Headers({
          "retry-after": "0",
          "x-ratelimit-remaining-tokens": "0",
          "x-ratelimit-limit-tokens": "10000",
          "apim-request-id": "apim-123",
          "authorization": "Bearer secret"
        }),
        async json() {
          return {
            error: {
              message: "Requests to the ChatCompletions_Create Operation have exceeded token rate limit."
            }
          };
        }
      })
    });

    try {
      await withEnv(
        {
          AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
          AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
          AZURE_OPENAI_DEPLOYMENT_NAME: "jm1-pub-diagnostic-primary"
        },
        async () => {
          const result = await loaded.call({
            promptBody: "SECRET MANUSCRIPT CONTENT",
            diagnosticId: "diag-azure-429"
          });
          assert.equal(result.ok, false);
          assert.equal(result.httpStatus, 429);
          assert.equal(result.request.deployment, "jm1-pub-diagnostic-primary");
          assert.equal(result.request.maxOutputTokens, loaded.DEFAULT_MAX_OUTPUT_TOKENS);
          assert.equal(result.rateLimit.retryAfterMs, 0);
          assert.equal(result.rateLimit.headers["x-ratelimit-limit-tokens"], "10000");
          assert.equal(result.rateLimit.headers["apim-request-id"], "apim-123");
          assert.equal("authorization" in result.rateLimit.headers, false);
          assert.doesNotMatch(result.error, /SECRET MANUSCRIPT CONTENT/);
        }
      );
    } finally {
      restore();
    }
  });
});
