"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { canonicalJson, digest } = require("./coverAuthorityBundle");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;

async function readJson(blob) {
  const chunks = [];
  const response = await blob.download();
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createCoverAuthoritySnapshotStore(options = {}) {
  const serviceUrl = String(options.serviceUrl || process.env.JM1_COVER_BLOB_SERVICE_URL || "").trim();
  const containerName = String(options.containerName || process.env.JM1_COVER_AUDIT_CONTAINER || "").trim();
  if (!serviceUrl || !containerName) throw new Error("COVER_AUTHORITY_SNAPSHOT_STORE_NOT_CONFIGURED");
  const url = new URL(serviceUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith(".blob.core.windows.net")) throw new Error("COVER_AUTHORITY_SNAPSHOT_URL_INVALID");
  const service = options.service || new BlobServiceClient(url.origin, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function persistAuthoritySnapshot(bundle, executionId) {
    if (!bundle || !GUID.test(bundle.titleId) || !GUID.test(executionId) || !SHA256.test(bundle.sha256)) {
      throw new Error("COVER_AUTHORITY_SNAPSHOT_INVALID");
    }
    const snapshotId = digest({ titleId: bundle.titleId, authoritySha256: bundle.sha256, executionId });
    const record = {
      snapshotId, titleId: bundle.titleId, authoritySha256: bundle.sha256,
      executionId, sourceIds: Object.values(bundle.fields).map((item) => item.sourceId),
      sourceVersions: Object.values(bundle.fields).map((item) => item.sourceVersion),
      sourceChecksums: Object.values(bundle.fields).map((item) => item.sourceChecksum).filter(Boolean),
      authorityClasses: Object.values(bundle.fields).map((item) => item.authorityClass),
      createdAt: new Date().toISOString(), bundle
    };
    const blob = container.getBlockBlobClient(`publishing/cover/v1/authority/${bundle.titleId}/${snapshotId}.json`);
    try {
      const payload = `${JSON.stringify(record)}\n`;
      await blob.upload(payload, Buffer.byteLength(payload), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: { ifNoneMatch: "*" },
        metadata: { capability: "cover-design", retentionclass: "governed-production-audit" }
      });
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
    }
    const readback = await readJson(blob);
    if (readback.snapshotId !== snapshotId || readback.authoritySha256 !== bundle.sha256 ||
        readback.executionId !== executionId || canonicalJson(readback.bundle) !== canonicalJson(bundle)) {
      throw new Error("COVER_AUTHORITY_SNAPSHOT_CONFLICT");
    }
    return { snapshotId, authoritySha256: bundle.sha256, titleId: bundle.titleId, executionId };
  }

  return { persistAuthoritySnapshot };
}

module.exports = { createCoverAuthoritySnapshotStore };
