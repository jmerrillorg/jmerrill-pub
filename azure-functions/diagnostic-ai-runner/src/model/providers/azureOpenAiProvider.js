"use strict";

/**
 * Azure OpenAI provider for the Stage 0 Diagnostic AI Runner.
 *
 * Uses DefaultAzureCredential (MSI) — no API keys stored or logged.
 * Never stores prompt body, raw response, or manuscript text.
 * Returns a normalized result shape shared by all providers.
 */

const { trackDependency } = require("../../observability/dependencyTelemetry");
const {
  fetchWithRetry,
  getProviderRuntimeOptions,
  parseStructuredJsonObject
} = require("../providerSupport");

const REQUIRED_VARS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_DEPLOYMENT_NAME"
];

const RESPONSE_FORMAT_JSON_OBJECT_ENV = "AZURE_OPENAI_ENABLE_RESPONSE_FORMAT_JSON_OBJECT";

function checkConfig() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  return missing.length === 0 ? null : missing;
}

function shouldRequestJsonObjectResponseFormat() {
  return process.env[RESPONSE_FORMAT_JSON_OBJECT_ENV] === "true";
}

async function call({ promptBody, diagnosticId, telemetry = null, route = null }) {
  const missingConfig = checkConfig();
  if (missingConfig) {
    return {
      ok: false,
      provider: "azure-openai",
      configMissing: missingConfig.map(() => "AZURE_OPENAI_CONFIG_MISSING"),
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: `AZURE_OPENAI_CONFIG_MISSING: ${missingConfig.join(", ")}`
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment = route?.deploymentName || process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const requestBody = {
    messages: [{ role: "user", content: promptBody }],
    temperature: 0.2,
    max_tokens: 1200
  };

  if (shouldRequestJsonObjectResponseFormat()) {
    requestBody.response_format = { type: "json_object" };
  }

  let httpStatus = null;

  try {
    const { DefaultAzureCredential } = require("@azure/identity");
    const credential = new DefaultAzureCredential();
    const tokenResult = await credential.getToken("https://cognitiveservices.azure.com/.default");

    const runtimeOptions = getProviderRuntimeOptions("AZURE_OPENAI");
    const response = await trackDependency(
      telemetry,
      {
        name: "Azure OpenAI Chat Completion",
        target: endpoint,
        data: `${deployment}:chat/completions`,
        dependencyTypeName: "Azure OpenAI",
        properties: {
          provider: "azure-openai",
          deployment,
          diagnosticId
        },
        isSuccess: (result) => result.ok,
        getResultCode: (result) => String(result.status)
      },
      () => fetchWithRetry({
        timeoutMs: runtimeOptions.timeoutMs,
        maxRetries: runtimeOptions.maxRetries,
        baseDelayMs: runtimeOptions.baseDelayMs,
        jitterRatio: runtimeOptions.jitterRatio,
        shouldRetry: (result) => [408, 409, 429, 500, 502, 503, 504].includes(result.status),
        requestFn: ({ signal }) => fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenResult.token}`
          },
          body: JSON.stringify(requestBody),
          signal
        })
      })
    );

    httpStatus = response.status;
    const responseBody = await response.json();

    if (!response.ok) {
      const providerMessage = typeof responseBody?.error?.message === "string"
        ? responseBody.error.message.replace(/\s+/g, " ").slice(0, 240)
        : "";
      return {
        ok: false,
        provider: "azure-openai",
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        error: providerMessage ? `AZURE_OPENAI_HTTP_${httpStatus}: ${providerMessage}` : `AZURE_OPENAI_HTTP_${httpStatus}`
      };
    }

    const content = responseBody?.choices?.[0]?.message?.content;
    const usage = responseBody?.usage || {};

    const parsedOutput = parseStructuredJsonObject(content);
    if (!parsedOutput.ok) {
      return {
        ok: false,
        provider: "azure-openai",
        configMissing: null,
        output: null,
        tokenCounts: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
          total: usage.total_tokens || 0
        },
        httpStatus,
        error: parsedOutput.error
      };
    }

    return {
      ok: true,
      provider: "azure-openai",
      configMissing: null,
      output: parsedOutput.value,
      tokenCounts: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      httpStatus,
      error: null,
      responseClassification: parsedOutput.classification
    };
  } catch (err) {
    return {
      ok: false,
      provider: "azure-openai",
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus,
      error: `MODEL_CALL_EXCEPTION: ${String(err.message || err).slice(0, 200)}`
    };
  }
}

module.exports = {
  RESPONSE_FORMAT_JSON_OBJECT_ENV,
  call,
  checkConfig,
  REQUIRED_VARS,
  shouldRequestJsonObjectResponseFormat
};
