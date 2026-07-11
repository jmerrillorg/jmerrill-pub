/**
 * Reads knowledge.md from Azure Blob Storage using managed identity.
 *
 * Returns safe metadata and content for prompt injection.
 * Content must not be logged, stored, or returned in API responses.
 * Never calls AI.
 *
 * Required env vars:
 *   KNOWLEDGE_BLOB_URL    — full private blob URL
 *   KNOWLEDGE_BLOB_SHA256 — approved SHA-256 hex digest
 */

"use strict";

const { BlobClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { createHash } = require("node:crypto");
const { trackDependency } = require("../observability/dependencyTelemetry");

/**
 * Reads knowledge.md and verifies its SHA-256 against the expected value.
 *
 * @returns {Promise<{
 *   reachable: boolean,
 *   hashMatched: boolean,
 *   calculatedSha256: string|null,
 *   expectedSha256: string|null,
 *   byteLength: number|null,
 *   etag: string|null,
 *   lastModified: string|null,
 *   content: string|null,
 *   error: string|null
 * }>}
 */
async function verifyKnowledgeBlob(options = {}) {
  const telemetry = options.telemetry || null;
  const blobUrl = process.env.KNOWLEDGE_BLOB_URL;
  const expectedHash = process.env.KNOWLEDGE_BLOB_SHA256;

  if (!blobUrl) {
    return {
      reachable: false,
      hashMatched: false,
      calculatedSha256: null,
      expectedSha256: expectedHash || null,
      byteLength: null,
      etag: null,
      lastModified: null,
      content: null,
      error: "KNOWLEDGE_BLOB_URL not configured"
    };
  }

  if (!expectedHash) {
    return {
      reachable: false,
      hashMatched: false,
      calculatedSha256: null,
      expectedSha256: null,
      byteLength: null,
      etag: null,
      lastModified: null,
      content: null,
      error: "KNOWLEDGE_BLOB_SHA256 not configured"
    };
  }

  try {
    const credential = new DefaultAzureCredential();
    const blobClient = new BlobClient(blobUrl, credential);

    const downloadResponse = await trackDependency(
      telemetry,
      {
        name: "Blob Knowledge Read",
        target: blobUrl,
        data: "knowledge.md:download",
        dependencyTypeName: "Azure Blob",
        properties: {
          blobUrl
        },
        isSuccess: () => true,
        getResultCode: () => "OK"
      },
      () => blobClient.download()
    );
    const etag = downloadResponse.etag || null;
    const lastModified = downloadResponse.lastModified
      ? downloadResponse.lastModified.toISOString()
      : null;

    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const content = Buffer.concat(chunks);
    const byteLength = content.byteLength;

    const calculatedSha256 = createHash("sha256").update(content).digest("hex");
    const hashMatched = calculatedSha256 === expectedHash.toLowerCase();

    return {
      reachable: true,
      hashMatched,
      calculatedSha256,
      expectedSha256: expectedHash,
      byteLength,
      etag,
      lastModified,
      // For prompt injection only — must not be logged, stored, or returned in API responses
      content: content.toString("utf8"),
      error: null
    };
  } catch (err) {
    return {
      reachable: false,
      hashMatched: false,
      calculatedSha256: null,
      expectedSha256: expectedHash,
      byteLength: null,
      etag: null,
      lastModified: null,
      content: null,
      error: "Blob read failed"
    };
  }
}

module.exports = { verifyKnowledgeBlob };
