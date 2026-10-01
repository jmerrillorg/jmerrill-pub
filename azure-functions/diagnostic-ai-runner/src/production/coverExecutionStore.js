"use strict";

const { randomUUID } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const SHA256 = /^[a-f0-9]{64}$/i;

async function readRecord(blob) {
  const result = await blob.download();
  const chunks = [];
  for await (const chunk of result.readableStreamBody) chunks.push(Buffer.from(chunk));
  return { record: JSON.parse(Buffer.concat(chunks).toString("utf8")), etag: result.etag };
}

async function writeRecord(blob, record, conditions) {
  const payload = `${JSON.stringify(record)}\n`;
  await blob.upload(payload, Buffer.byteLength(payload), {
    blobHTTPHeaders: { blobContentType: "application/json" }, conditions,
    metadata: { capability: "cover-design", retentionclass: "governed-production-audit" }
  });
}

function createCoverExecutionStore(options = {}) {
  const serviceUrl = String(options.serviceUrl || process.env.JM1_COVER_BLOB_SERVICE_URL || "").trim();
  const containerName = String(options.containerName || process.env.JM1_COVER_AUDIT_CONTAINER || "").trim();
  if (!serviceUrl || !containerName) throw new Error("COVER_EXECUTION_STORE_NOT_CONFIGURED");
  const url = new URL(serviceUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith(".blob.core.windows.net")) throw new Error("COVER_EXECUTION_STORE_URL_INVALID");
  const service = options.service || new BlobServiceClient(url.origin, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);
  const blobFor = (key) => {
    if (!SHA256.test(key)) throw new Error("COVER_EXECUTION_KEY_INVALID");
    return container.getBlockBlobClient(`publishing/cover/v1/executions/${key}.json`);
  };

  async function reserveExecution(key) {
    const blob = blobFor(key);
    const record = { key, state: "IN_PROGRESS", executionId: randomUUID(), attempt: 1,
      startedAt: new Date().toISOString(), finishedAt: null, result: null };
    try {
      await writeRecord(blob, record, { ifNoneMatch: "*" });
      return { status: "ACQUIRED", executionId: record.executionId };
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
    }
    const current = await readRecord(blob);
    if (current.record.key !== key) throw new Error("COVER_EXECUTION_RECORD_CONFLICT");
    if (current.record.state === "COMPLETE") return { status: "EXISTING", record: current.record.result };
    if (current.record.state === "IN_PROGRESS") return { status: "IN_PROGRESS" };
    if (current.record.state !== "FAILED" || !current.etag) throw new Error("COVER_EXECUTION_RECORD_INVALID");
    const retry = { ...record, attempt: current.record.attempt + 1 };
    try {
      await writeRecord(blob, retry, { ifMatch: current.etag });
      return { status: "ACQUIRED", executionId: retry.executionId };
    } catch (error) {
      if ([409, 412].includes(error?.statusCode)) return { status: "IN_PROGRESS" };
      throw error;
    }
  }

  async function transition(key, executionId, state, result) {
    const blob = blobFor(key);
    const current = await readRecord(blob);
    if (current.record.key !== key || current.record.state !== "IN_PROGRESS" ||
        current.record.executionId !== executionId || !current.etag) {
      throw new Error("COVER_EXECUTION_STALE_TRANSITION");
    }
    await writeRecord(blob, { ...current.record, state, finishedAt: new Date().toISOString(), result },
      { ifMatch: current.etag });
  }

  return {
    reserveExecution,
    completeExecution: (key, record) => transition(key, record.executionId, "COMPLETE", record),
    failExecution: (key, failure) => transition(key, failure.executionId, "FAILED", failure)
  };
}

module.exports = { createCoverExecutionStore };
