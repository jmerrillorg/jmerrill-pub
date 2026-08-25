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
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const DEFAULT_LINE_CHUNK_MAX_OUTPUT_TOKENS = 4000;
const TOKEN_SCOPE = "https://ai.azure.com/.default";
const STRUCTURED_OUTPUT_TOOL = Object.freeze({
  name: "submit_jm1_structured_output",
  description: "Submit the complete JM1 governed structured output object requested by the prompt.",
  input_schema: {
    type: "object",
    additionalProperties: true
  }
});
const LINE_EDITING_CHUNK_OUTPUT_TOOL = Object.freeze({
  name: "submit_jm1_structured_output",
  description: "Submit the complete governed Line Editing chunk output.",
  input_schema: {
    type: "object",
    properties: {
      editedManuscript: {
        type: "string",
        minLength: 1,
        description: "The full line-edited text for this exact chunk. Do not omit source paragraphs."
      },
      lineEditingSummary: { type: "string", minLength: 1 },
      changeLedger: {
        type: "array",
        items: { type: "string" }
      },
      retentionNotes: { type: "string", minLength: 1 },
      authorQueries: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["editedManuscript", "lineEditingSummary", "changeLedger", "retentionNotes", "authorQueries"],
    additionalProperties: true
  }
});

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
  const structuredOutputTool = selectStructuredOutputTool(promptBody);
  const maxOutputTokens = selectMaxOutputTokens(promptBody);
  const requestBody = {
    model: deployment,
    messages: [{ role: "user", content: promptBody }],
    max_tokens: maxOutputTokens,
    tools: [structuredOutputTool],
    tool_choice: { type: "tool", name: structuredOutputTool.name },
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
        minRetryDelayMs: runtimeOptions.minRetryDelayMs,
        maxRetryDelayMs: runtimeOptions.maxRetryDelayMs,
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
    const responseBody = await response.json().catch(() => ({}));
    const rateLimit = buildRateLimitMetadata(response.headers, responseBody);

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

    const usage = responseBody?.usage || {};
    const toolInput = extractStructuredToolInput(responseBody);
    if (toolInput) {
      return {
        ok: true,
        provider: "microsoft-foundry-claude",
        configMissing: null,
        output: toolInput,
        tokenCounts: {
          input: usage.input_tokens || 0,
          output: usage.output_tokens || 0,
          total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        },
        httpStatus,
        request: {
          deployment,
          maxOutputTokens: requestBody.max_tokens,
          responseContract: "anthropic-messages-tool"
        },
        rateLimit,
        error: null,
        responseClassification: "tool-use"
      };
    }

    const content = extractTextContent(responseBody);
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
          responseContract: "anthropic-messages-tool"
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
        responseContract: "anthropic-messages-tool"
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

function selectStructuredOutputTool(promptBody) {
  return isLineEditingChunkPrompt(promptBody)
    ? LINE_EDITING_CHUNK_OUTPUT_TOOL
    : STRUCTURED_OUTPUT_TOOL;
}

function isLineEditingChunkPrompt(promptBody) {
  return typeof promptBody === "string" && promptBody.includes("cc010_line_editing_full_manuscript_chunk_execution");
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function selectMaxOutputTokens(promptBody) {
  if (!isLineEditingChunkPrompt(promptBody)) return DEFAULT_MAX_OUTPUT_TOKENS;
  return parsePositiveInteger(process.env.AZURE_FOUNDRY_LINE_CHUNK_MAX_OUTPUT_TOKENS, DEFAULT_LINE_CHUNK_MAX_OUTPUT_TOKENS);
}

function extractStructuredToolInput(responseBody) {
  const content = responseBody?.content;
  if (!Array.isArray(content)) return null;
  const toolBlock = content.find((part) =>
    part &&
    part.type === "tool_use" &&
    part.name === STRUCTURED_OUTPUT_TOOL.name &&
    part.input &&
    typeof part.input === "object" &&
    !Array.isArray(part.input)
  );
  return toolBlock?.input || null;
}

module.exports = {
  DEFAULT_ANTHROPIC_VERSION,
  DEFAULT_LINE_CHUNK_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  LINE_EDITING_CHUNK_OUTPUT_TOOL,
  REQUIRED_VARS,
  STRUCTURED_OUTPUT_TOOL,
  TOKEN_SCOPE,
  call,
  checkConfig,
  extractStructuredToolInput,
  extractTextContent,
  isLineEditingChunkPrompt,
  selectMaxOutputTokens,
  selectStructuredOutputTool
};
