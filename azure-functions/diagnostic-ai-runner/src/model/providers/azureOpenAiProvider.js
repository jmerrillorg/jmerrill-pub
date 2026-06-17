"use strict";

/**
 * Azure OpenAI provider for the Stage 0 Diagnostic AI Runner.
 *
 * Uses DefaultAzureCredential (MSI) — no API keys stored or logged.
 * Never stores prompt body, raw response, or manuscript text.
 * Returns a normalized result shape shared by all providers.
 */

const REQUIRED_VARS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_DEPLOYMENT_NAME"
];

function checkConfig() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  return missing.length === 0 ? null : missing;
}

async function call({ promptBody, diagnosticId }) {
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
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const requestBody = {
    messages: [{ role: "user", content: promptBody }],
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_object" }
  };

  let httpStatus = null;

  try {
    const { DefaultAzureCredential } = require("@azure/identity");
    const credential = new DefaultAzureCredential();
    const tokenResult = await credential.getToken("https://cognitiveservices.azure.com/.default");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenResult.token}`
      },
      body: JSON.stringify(requestBody)
    });

    httpStatus = response.status;
    const responseBody = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        provider: "azure-openai",
        configMissing: null,
        output: null,
        tokenCounts: { input: 0, output: 0, total: 0 },
        httpStatus,
        error: `AZURE_OPENAI_HTTP_${httpStatus}`
      };
    }

    const content = responseBody?.choices?.[0]?.message?.content;
    const usage = responseBody?.usage || {};

    let parsedOutput = null;
    try {
      parsedOutput = JSON.parse(content);
    } catch {
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
        error: "MODEL_RESPONSE_NOT_JSON"
      };
    }

    return {
      ok: true,
      provider: "azure-openai",
      configMissing: null,
      output: parsedOutput,
      tokenCounts: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      httpStatus,
      error: null
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

module.exports = { call, checkConfig, REQUIRED_VARS };
