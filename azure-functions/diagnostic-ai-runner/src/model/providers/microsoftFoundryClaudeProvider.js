"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { trackDependency } = require("../../observability/dependencyTelemetry");
const {
  buildRateLimitMetadata,
  fetchWithRetry,
  getProviderRuntimeOptions,
  parseStructuredJsonObject
} = require("../providerSupport");

const REQUIRED_VARS = ["AZURE_FOUNDRY_ENDPOINT"];
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_OUTPUT_TOKENS = 1200;
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
  const anthropicVersion = process.env.AZURE_FOUNDRY_ANTHROPIC_VERSION || DEFAULT_ANTHROPIC_VERSION;
  const deployment = route.deploymentName;
  const url = `${endpoint}/anthropic/v1/messages`;
  const requestBody = {
    model: deployment,
    messages: [{ role: "user", content: promptBody }],
    max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
    stream: false
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
            "anthropic-version": anthropicVersion,
            Authorization: `Bearer ${tokenResult.token}`
          },
          body: JSON.stringify(requestBody),
          signal
        })
      })
    );

    httpStatus = response.status;
    const rateLimit = buildRateLimitMetadata(response.headers);
    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage = typeof responseBody?.error?.message === "string"
        ? responseBody.error.message.replace(/\s+/g, " ").slice(0, 240)
        : "";
      return {
        ok: false,
        provider: "microsoft-foundry-claude",
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        request: {
          deployment,
          maxOutputTokens: requestBody.max_tokens,
          responseContract: "anthropic-messages"
        },
        rateLimit,
        error: providerMessage
          ? `MICROSOFT_FOUNDRY_HTTP_${httpStatus}: ${providerMessage}`
          : `MICROSOFT_FOUNDRY_HTTP_${httpStatus}`
      };
    }

    const content = extractTextContent(responseBody);
    const usage = responseBody?.usage || {};
    const parsed = parseStructuredJsonObject(content);
    if (!parsed.ok) {
      return {
        ok: false,
        provider: "microsoft-foundry-claude",
        configMissing: null,
        output: null,
        tokenCounts: {
          input: usage.input_tokens || 0,
          output: usage.output_tokens || 0,
          total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        },
        httpStatus,
        request: {
          deployment,
          maxOutputTokens: requestBody.max_tokens,
          responseContract: "anthropic-messages"
        },
        rateLimit,
        error: parsed.error
      };
    }

    return {
      ok: true,
      provider: "microsoft-foundry-claude",
      configMissing: null,
      output: parsed.value,
      tokenCounts: {
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0,
        total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
      },
      httpStatus,
      request: {
        deployment,
        maxOutputTokens: requestBody.max_tokens,
        responseContract: "anthropic-messages"
      },
      rateLimit,
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

function extractTextContent(responseBody) {
  const content = responseBody?.content;
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

module.exports = {
  DEFAULT_ANTHROPIC_VERSION,
  DEFAULT_MAX_OUTPUT_TOKENS,
  REQUIRED_VARS,
  TOKEN_SCOPE,
  call,
  checkConfig,
  extractTextContent
};
