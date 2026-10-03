"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createAzureFoundryCoverImageProvider } = require("../src/production/azureFoundryCoverImageProvider");

function png() {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(1024, 16);
  bytes.writeUInt32BE(1536, 20);
  return bytes;
}

test("provider requires named deployment, safe endpoint, storage, and safety assessment", () => {
  assert.throws(() => createAzureFoundryCoverImageProvider({
    endpoint: "http://example.com", deployment: "cover-image", modelVersion: "1"
  }, {}), /COVER_IMAGE_ENDPOINT_INVALID/);
  assert.throws(() => createAzureFoundryCoverImageProvider({
    endpoint: "https://example.openai.azure.com", deployment: "cover-image", modelVersion: "1"
  }, {}), /COVER_ASSET_STORE_NOT_CONFIGURED/);
});

test("provider uses managed identity and verifies governed storage checksum", async () => {
  const image = png();
  let uploaded = false;
  let calledUrl = "";
  const provider = createAzureFoundryCoverImageProvider({
    endpoint: "https://example.openai.azure.com",
    deployment: "cover-image",
    modelVersion: "2025-12-16"
  }, {
    credential: { getToken: async () => ({ token: "fixture-token" }) },
    fetch: async (url, init) => {
      calledUrl = url;
      assert.match(init.headers.Authorization, /^Bearer /);
      assert.equal(JSON.parse(init.body).size, "1024x1536");
      return { ok: true, json: async () => ({ data: [{ b64_json: image.toString("base64") }] }) };
    },
    assessSafety: async () => ({ passed: true, evidenceId: "safety-1" }),
    uploadAsset: async (asset) => {
      uploaded = true;
      assert.equal(asset.width, 1024);
      return { assetId: "asset-1", location: "sharepoint://asset-1.png", sha256: asset.sha256 };
    }
  });
  const result = await provider({ titleId: "title-1", executionId: "exec-1", direction: 1, prompt: "governed prompt" });
  assert.equal(calledUrl, "https://example.openai.azure.com/openai/v1/images/generations");
  assert.equal(uploaded, true);
  assert.equal(result.safetyPassed, true);
  assert.equal(result.modelVersion, "2025-12-16");
});

test("unsafe generated image is not persisted", async () => {
  let uploaded = false;
  const provider = createAzureFoundryCoverImageProvider({
    endpoint: "https://example.openai.azure.com", deployment: "cover-image", modelVersion: "1"
  }, {
    credential: { getToken: async () => ({ token: "fixture-token" }) },
    fetch: async () => ({ ok: true, json: async () => ({ data: [{ b64_json: png().toString("base64") }] }) }),
    assessSafety: async () => ({ passed: false, evidenceId: "safety-2" }),
    uploadAsset: async () => { uploaded = true; }
  });
  await assert.rejects(provider({ titleId: "title-1", executionId: "exec-1", prompt: "prompt" }), /COVER_IMAGE_SAFETY_NOT_PROVEN/);
  assert.equal(uploaded, false);
});
