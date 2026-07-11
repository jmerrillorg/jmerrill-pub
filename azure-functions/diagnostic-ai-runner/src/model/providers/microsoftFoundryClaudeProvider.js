"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { trackDependency } = require("../../observability/dependencyTelemetry");
const {
  fetchWithRetry,
  getProviderRuntimeOptions,
  parseStructuredJsonObject
} = require("../providerSupport");

const REQUIRED_VARS = ["AZURE_FOUNDRY_ENDPOINT"];
const DEFAULT_API_VERSION = "2024-10-21";
const TOKEN_SCOPE = "https://ai.azure.com/.default";

function checkConfig(route = {}) {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (!route.deploymentName) {
    missing.push("ROUTE_DEPLOYMENT_NAME");
  }
  return missing.length === 0 ? null : missing;
}

async function call({ promptBody, diagnosticId, telemetry = null, route }) {
  const missingConfig = checkConfig(route);
  if (missingConfig) {
    return {
      ok: false,
      provider: "microsoft-foundry-claude",
      configMissing: missingConfig.map(() => "MICROSOFT_FOUNDRY_CONFIG_MISSING"),
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus: null,
      error: `MICROSOFT_FOUNDRY_CONFIG_MISSING: ${missingConfig.join(", ")}`
    };
  }

  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT.replace(/\/$/, "");
  const apiVersion = process.env.AZURE_FOUNDRY_API_VERSION || DEFAULT_API_VERSION;
  const deployment = route.deploymentName;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const requestBody = {
    messages: [{ role: "user", content: promptBody }],
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_object" }
  };

  let httpStatus = null;

  try {
    const credential = new DefaultAzureCredential();
    const tokenResult = await credential.getToken(TOKEN_SCOPE);
    const runtimeOptions = getProviderRuntimeOptions("AZURE_FOUNDRY");

    const response = await trackDependency(
      telemetry,
      {
        name: "Microsoft Foundry Claude Chat Completion",
        target: endpoint,
        data: `${deployment}:chat/completions`,
        dependencyTypeName: "Microsoft Foundry",
        properties: {
          provider: "microsoft-foundry-claude",
          deployment,
          diagnosticId,
          model: route.model || "claude-sonnet-5",
          version: route.version || null
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
            Authorization: `Bearer ${tokenResult.token}`
          },
          body: JSON.stringify(requestBody),
          signal
        })
      })
    );

    httpStatus = response.status;
    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        provider: "microsoft-foundry-claude",
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        error: `MICROSOFT_FOUNDRY_HTTP_${httpStatus}`
      };
    }

    const content = responseBody?.choices?.[0]?.message?.content;
    const usage = responseBody?.usage || {};
    const parsed = parseStructuredJsonObject(content);
    if (!parsed.ok) {
      return {
        ok: false,
        provider: "microsoft-foundry-claude",
        configMissing: null,
        output: null,
        tokenCounts: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
          total: usage.total_tokens || 0
        },
        httpStatus,
        error: parsed.error
      };
    }

    return {
      ok: true,
      provider: "microsoft-foundry-claude",
      configMissing: null,
      output: parsed.value,
      tokenCounts: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      httpStatus,
      error: null,
      responseClassification: parsed.classification
    };
  } catch (error) {
    return {
      ok: false,
      provider: "microsoft-foundry-claude",
      configMissing: null,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus,
      error: `MODEL_CALL_EXCEPTION: ${String(error.message || error).slice(0, 200)}`
    };
  }
}

module.exports = {
  DEFAULT_API_VERSION,
  REQUIRED_VARS,
  TOKEN_SCOPE,
  call,
  checkConfig
};
