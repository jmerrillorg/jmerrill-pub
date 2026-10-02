"use strict";

const { randomUUID, createHash } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const DEFAULT_CONTAINER = "agentic-audit";
const DEFAULT_PREFIX = "publishing/editorial-shadow/v1";

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function createEditorialShadowEvidenceStore(options = {}) {
  const serviceUrl = options.serviceUrl || process.env.JM1_AGENTIC_AUDIT_BLOB_SERVICE_URL ||
    "https://stjm1diagrunner.blob.core.windows.net";
  const containerName = options.containerName || process.env.JM1_AGENTIC_AUDIT_CONTAINER || DEFAULT_CONTAINER;
  const prefix = options.prefix || DEFAULT_PREFIX;
  const service = options.service || new BlobServiceClient(serviceUrl, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function read(recordId) {
    if (!/^[a-f0-9-]{36}$/.test(recordId || "")) fail("EDITORIAL_SHADOW_RECORD_ID_INVALID");
    const bytes = await container.getBlobClient(`${prefix}/snapshots/${recordId}.json`).downloadToBuffer();
    const record = JSON.parse(bytes.toString("utf8"));
    if (record.recordId !== recordId || checksum(record.snapshot) !== record.snapshotSha256) {
      fail("EDITORIAL_SHADOW_SNAPSHOT_CORRUPT");
    }
    return record;
  }

  async function persistAuthoritySnapshot({ snapshot, snapshotSha256 }) {
    if (checksum(snapshot) !== snapshotSha256) fail("EDITORIAL_SHADOW_SNAPSHOT_CHECKSUM_INVALID");
    const agentVersion = options.agentVersion || process.env.JM1_EDITORIAL_FOUNDRY_AGENT_VERSION;
    if (!/^\d+$/.test(agentVersion || "")) fail("EDITORIAL_SHADOW_AGENT_VERSION_REQUIRED");
    const recordId = randomUUID();
    const record = {
      recordId,
      executionId: options.executionId || randomUUID(),
      timestamp: new Date().toISOString(),
      executionMode: "SHADOW",
      jm1AgentId: snapshot.agentId,
      foundryAgentId: snapshot.agentId,
      foundryAgentVersion: agentVersion,
      snapshotSha256,
      snapshot
    };
    const blob = container.getBlockBlobClient(`${prefix}/snapshots/${recordId}.json`);
    const body = Buffer.from(`${JSON.stringify(record)}\n`);
    await blob.uploadData(body, {
      blobHTTPHeaders: { blobContentType: "application/json" },
      conditions: { ifNoneMatch: "*" },
      metadata: { capability: "editorial-shadow", retentionclass: "governed-agent-audit" }
    });
    return { recordId, snapshotSha256 };
  }

  return { persistAuthoritySnapshot, readAuthoritySnapshot: read };
}

module.exports = { createEditorialShadowEvidenceStore };
