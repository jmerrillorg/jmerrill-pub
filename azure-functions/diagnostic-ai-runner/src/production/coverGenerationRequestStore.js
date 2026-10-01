"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;

function clean(input) {
  return typeof input === "string" ? input.trim() : "";
}

async function readJson(blob) {
  const chunks = [];
  const response = await blob.download();
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateRequest(request) {
  return request && GUID.test(clean(request.titleId)) && GUID.test(clean(request.authorId)) &&
    GUID.test(clean(request.executionId)) && SHA256.test(clean(request.creativeBriefId)) &&
    SHA256.test(clean(request.idempotencyKey)) && SHA256.test(clean(request.creativeBriefVersion)) &&
    SHA256.test(clean(request.authoritySnapshotId)) && SHA256.test(clean(request.authoritySnapshotSha256)) &&
    clean(request.promptContractVersion) && clean(request.modelDeployment) &&
    [2, 3].includes(request.requestedVariantCount) &&
    Number.isFinite(Date.parse(request.requestedAt));
}

function createCoverGenerationRequestStore(options = {}) {
  const serviceUrl = clean(options.serviceUrl || process.env.JM1_COVER_BLOB_SERVICE_URL);
  const containerName = clean(options.containerName || process.env.JM1_COVER_AUDIT_CONTAINER);
  if (!serviceUrl || !containerName) throw new Error("COVER_REQUEST_STORE_NOT_CONFIGURED");
  const url = new URL(serviceUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith(".blob.core.windows.net")) {
    throw new Error("COVER_REQUEST_STORE_URL_INVALID");
  }
  const service = options.service || new BlobServiceClient(url.origin, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function persistGenerationRequest(request) {
    if (!validateRequest(request)) throw new Error("COVER_GENERATION_REQUEST_INVALID");
    const blob = container.getBlockBlobClient(`publishing/cover/v1/requests/${request.titleId}/${request.idempotencyKey}/${request.executionId}.json`);
    const payload = `${JSON.stringify(request)}\n`;
    try {
      await blob.upload(payload, Buffer.byteLength(payload), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: { ifNoneMatch: "*" },
        metadata: { capability: "cover-design", retentionclass: "governed-production-audit" }
      });
      return request;
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      const existing = await readJson(blob);
      if (JSON.stringify(existing) !== JSON.stringify(request)) {
        throw new Error("COVER_GENERATION_REQUEST_CONFLICT");
      }
      return existing;
    }
  }

  return { persistGenerationRequest };
}

module.exports = { createCoverGenerationRequestStore };
