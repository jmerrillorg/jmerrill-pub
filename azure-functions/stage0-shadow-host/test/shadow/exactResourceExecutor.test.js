"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const executor = require("../../src/shadow/exactResourceExecutor");

const selection = {
  azureResourceId: executor.RESOURCE_ID,
  deploymentId: executor.DEPLOYMENT_ID,
  deploymentName: executor.DEPLOYMENT_NAME,
  modelVersion: executor.MODEL_VERSION,
};
const input = { sourceEventId: "00000000-0000-4000-8000-000000000001",
  approvedExcerpt: "Synthetic test text only.", sourceReferenceIds: ["SYNTHETIC_1"] };

test("alias-only or wrong-resource routes cannot call the provider", async () => {
  let calls = 0;
  const options = { credential: { getToken: async () => ({ token: "synthetic" }) },
    fetchImpl: async () => { calls++; throw new Error("unexpected"); } };
  await assert.rejects(executor.infer(input, { deploymentName: executor.DEPLOYMENT_NAME }, options),
    /SHADOW_MODEL_RESOURCE_MISMATCH/);
  await assert.rejects(executor.infer(input, { ...selection, azureResourceId: "/other/resource" }, options),
    /SHADOW_MODEL_RESOURCE_MISMATCH/);
  assert.equal(calls, 0);
});

test("payload allowlist rejects extra fields and oversized content before token acquisition", async () => {
  let tokens = 0;
  const options = { credential: { getToken: async () => { tokens++; return { token: "synthetic" }; } } };
  await assert.rejects(executor.infer({ ...input, authorEmail: "private@example.test" }, selection, options),
    /SHADOW_MODEL_INPUT_DENIED/);
  await assert.rejects(executor.infer({ ...input, approvedExcerpt: "x".repeat(12001) }, selection, options),
    /SHADOW_MODEL_INPUT_DENIED/);
  assert.equal(tokens, 0);
});

test("exact resource uses managed identity token and returns bounded output with usage", async () => {
  let url;
  let request;
  const result = await executor.infer(input, selection, {
    credential: { getToken: async (scope) => {
      assert.equal(scope, "https://cognitiveservices.azure.com/.default");
      return { token: "synthetic" };
    } },
    fetchImpl: async (target, options) => {
      url = target;
      request = JSON.parse(options.body);
      return { ok: true, json: async () => ({
        choices: [{ message: { content: JSON.stringify({ jm1_diagnosticoutputsummary: "Synthetic" }) } }],
        usage: { prompt_tokens: 12, completion_tokens: 3 },
      }) };
    },
  });
  assert.ok(url.startsWith("https://oai-jm1-diagnostic.openai.azure.com/openai/deployments/jm1-pub-diagnostic-primary/"));
  assert.equal(request.messages[1].content, JSON.stringify(input));
  assert.equal(result.output.jm1_diagnosticoutputsummary, "Synthetic");
  assert.deepEqual(result.tokenCounts, { input: 12, output: 3 });
});
