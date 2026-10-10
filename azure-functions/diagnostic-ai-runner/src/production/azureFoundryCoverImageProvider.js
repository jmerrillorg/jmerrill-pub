"use strict";

const { createHash } = require("node:crypto");

const TOKEN_SCOPE = "https://ai.azure.com/.default";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function parsePngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("COVER_IMAGE_NOT_PNG");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1024 || height < 1024) throw new Error("COVER_IMAGE_RESOLUTION_INSUFFICIENT");
  return { width, height };
}

function validatedEndpoint(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !/(\.openai\.azure\.com|\.services\.ai\.azure\.com)$/.test(url.hostname)) {
    throw new Error("COVER_IMAGE_ENDPOINT_INVALID");
  }
  return url.origin;
}

function createAzureFoundryCoverImageProvider(config = {}, deps = {}) {
  const endpoint = validatedEndpoint(config.endpoint || process.env.JM1_COVER_IMAGE_ENDPOINT || "");
  const deployment = String(config.deployment || process.env.JM1_COVER_IMAGE_DEPLOYMENT || "").trim();
  const modelVersion = String(config.modelVersion || process.env.JM1_COVER_IMAGE_MODEL_VERSION || "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,80}$/.test(deployment) || !modelVersion) {
    throw new Error("COVER_IMAGE_DEPLOYMENT_NOT_CONFIGURED");
  }
  if (typeof deps.uploadAsset !== "function") throw new Error("COVER_ASSET_STORE_NOT_CONFIGURED");
  if (typeof deps.assessSafety !== "function") throw new Error("COVER_SAFETY_ASSESSMENT_NOT_CONFIGURED");
  const credential = deps.credential || new (require("@azure/identity").DefaultAzureCredential)();
  const http = deps.fetch || fetch;

  return async function generateImage(request) {
    if (!request || !request.titleId || !request.executionId || !request.prompt) {
      throw new Error("COVER_IMAGE_REQUEST_INCOMPLETE");
    }
    const token = await credential.getToken(TOKEN_SCOPE);
    if (!token?.token) throw new Error("COVER_IMAGE_IDENTITY_UNAVAILABLE");
    const response = await http(`${endpoint}/openai/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: deployment,
        prompt: request.prompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
        output_format: "png"
      })
    });
    if (!response.ok) {
      const error = new Error("COVER_IMAGE_PROVIDER_FAILED");
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    const providerReceiptId = response.headers?.get?.("apim-request-id") || response.headers?.get?.("x-ms-request-id") ||
      response.headers?.get?.("x-request-id") || null;
    const base64 = payload?.data?.[0]?.b64_json;
    if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      throw new Error("COVER_IMAGE_PROVIDER_RESULT_INVALID");
    }
    const bytes = Buffer.from(base64, "base64");
    const { width, height } = parsePngDimensions(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const safety = await deps.assessSafety({ bytes, sha256, titleId: request.titleId });
    if (safety?.passed !== true || !safety.evidenceId) throw new Error("COVER_IMAGE_SAFETY_NOT_PROVEN");
    const stored = await deps.uploadAsset({
      titleId: request.titleId,
      executionId: request.executionId,
      direction: request.direction,
      bytes,
      sha256,
      contentType: "image/png",
      width,
      height
    });
    if (!stored?.assetId || !stored?.location || stored.sha256 !== sha256) {
      throw new Error("COVER_IMAGE_STORAGE_READBACK_FAILED");
    }
    return {
      assetId: stored.assetId,
      location: stored.location,
      sha256,
      width,
      height,
      provider: "AZURE_FOUNDRY",
      model: deployment,
      modelVersion,
      safetyPassed: true,
      safetyEvidenceId: safety.evidenceId,
      providerReceiptId
    };
  };
}

module.exports = { createAzureFoundryCoverImageProvider, parsePngDimensions };
