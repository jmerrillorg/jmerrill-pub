"use strict";

const { createHash } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;

async function bytesFrom(blob) {
  const response = await blob.download();
  const chunks = [];
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function createCoverAssetStore(options = {}) {
  const serviceUrl = String(options.serviceUrl || process.env.JM1_COVER_BLOB_SERVICE_URL || "").trim();
  const containerName = String(options.containerName || process.env.JM1_COVER_ASSET_CONTAINER || "").trim();
  if (!serviceUrl || !containerName) throw new Error("COVER_ASSET_STORE_NOT_CONFIGURED");
  const url = new URL(serviceUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith(".blob.core.windows.net") || !/^[a-z0-9-]{3,63}$/.test(containerName)) {
    throw new Error("COVER_ASSET_STORE_URL_INVALID");
  }
  const service = options.service || new BlobServiceClient(url.origin, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function uploadAsset(input) {
    if (!GUID.test(input?.titleId || "") || !GUID.test(input?.executionId || "") ||
        ![1, 2, 3].includes(input.direction) || !Buffer.isBuffer(input.bytes) ||
        !SHA256.test(input.sha256 || "") ||
        createHash("sha256").update(input.bytes).digest("hex") !== input.sha256 ||
        input.contentType !== "image/png" || !Number.isInteger(input.width) || !Number.isInteger(input.height)) {
      throw new Error("COVER_ASSET_INVALID");
    }
    const name = `publishing/cover/v1/concepts/${input.titleId}/${input.executionId}/${input.direction}-${input.sha256}.png`;
    const blob = container.getBlockBlobClient(name);
    try {
      await blob.upload(input.bytes, input.bytes.length, {
        blobHTTPHeaders: { blobContentType: "image/png" },
        conditions: { ifNoneMatch: "*" },
        metadata: { titleid: input.titleId, executionid: input.executionId, sha256: input.sha256 }
      });
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
    }
    const readback = await bytesFrom(blob);
    if (createHash("sha256").update(readback).digest("hex") !== input.sha256) {
      throw new Error("COVER_ASSET_READBACK_MISMATCH");
    }
    return { assetId: input.sha256, sha256: input.sha256,
      location: `${url.origin}/${containerName}/${name}` };
  }

  return { uploadAsset };
}

module.exports = { createCoverAssetStore };
