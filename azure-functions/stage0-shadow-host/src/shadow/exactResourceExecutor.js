"use strict";

const { ManagedIdentityCredential } = require("@azure/identity");

const RESOURCE_ID = "/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-ai/providers/Microsoft.CognitiveServices/accounts/oai-jm1-diagnostic";
const ENDPOINT = "https://oai-jm1-diagnostic.openai.azure.com";
const DEPLOYMENT_NAME = "jm1-pub-diagnostic-primary";
const DEPLOYMENT_ID = `${RESOURCE_ID}/deployments/${DEPLOYMENT_NAME}`;
const MODEL_VERSION = "2024-07-18";
const API_VERSION = "2024-08-01-preview";

function assertSelection(selection) {
  if (selection?.azureResourceId !== RESOURCE_ID || selection?.deploymentId !== DEPLOYMENT_ID ||
      selection?.deploymentName !== DEPLOYMENT_NAME || selection?.modelVersion !== MODEL_VERSION) {
    throw new Error("SHADOW_MODEL_RESOURCE_MISMATCH");
  }
}

function validateInput(input) {
  if (!input || typeof input !== "object" ||
      typeof input.sourceEventId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.sourceEventId) ||
      typeof input.approvedExcerpt !== "string" ||
      input.approvedExcerpt.length < 1 || input.approvedExcerpt.length > 12000 ||
      !Array.isArray(input.sourceReferenceIds) || input.sourceReferenceIds.length < 1 ||
      input.sourceReferenceIds.length > 10 ||
      input.sourceReferenceIds.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) ||
      Object.keys(input).some((key) => !["sourceEventId", "approvedExcerpt", "sourceReferenceIds"].includes(key))) {
    throw new Error("SHADOW_MODEL_INPUT_DENIED");
  }
}

async function infer(input, selection, options = {}) {
  assertSelection(selection);
  validateInput(input);
  const credential = options.credential || new ManagedIdentityCredential(options.clientId);
  const token = await credential.getToken("https://cognitiveservices.azure.com/.default");
  if (!token?.token) throw new Error("SHADOW_MODEL_AUTH_FAILED");
  const request = {
    messages: [
      { role: "system", content: "Return one JSON object matching the supplied schema. Echo source_event_id and source_reference_ids exactly. Set jm1_requireshumanreview to true. Keep summary and risk flags concise. This is non-authoritative shadow analysis. Do not recommend or execute business actions. Use only the supplied excerpt." },
      { role: "user", content: JSON.stringify(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "stage0_shadow_diagnostic",
        strict: true,
        schema: {
          type: "object",
          properties: {
            source_event_id: { type: "string", enum: [input.sourceEventId] },
            source_reference_ids: { type: "array", items: { type: "string", enum: input.sourceReferenceIds } },
            jm1_diagnosticoutputsummary: { type: "string" },
            jm1_diagnosticriskflags: { type: "string" },
            jm1_confidence: { type: "number" },
            jm1_requireshumanreview: { type: "boolean" },
          },
          required: ["source_event_id", "source_reference_ids", "jm1_diagnosticoutputsummary",
            "jm1_diagnosticriskflags", "jm1_confidence", "jm1_requireshumanreview"],
          additionalProperties: false,
        },
      },
    },
    temperature: 0,
    max_tokens: 500,
  };
  const response = await (options.fetchImpl || fetch)(
    `${ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) throw new Error(`SHADOW_MODEL_HTTP_${response.status}`);
  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length > 8000) throw new Error("SHADOW_MODEL_RESPONSE_INVALID");
  let output;
  try { output = JSON.parse(content); } catch { throw new Error("SHADOW_MODEL_RESPONSE_INVALID"); }
  const inputTokens = body?.usage?.prompt_tokens;
  const outputTokens = body?.usage?.completion_tokens;
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 ||
      !Number.isSafeInteger(outputTokens) || outputTokens < 0) {
    throw new Error("SHADOW_MODEL_USAGE_MISSING");
  }
  return { output, tokenCounts: { input: inputTokens, output: outputTokens } };
}

module.exports = { RESOURCE_ID, DEPLOYMENT_ID, DEPLOYMENT_NAME, MODEL_VERSION, assertSelection, validateInput, infer };
