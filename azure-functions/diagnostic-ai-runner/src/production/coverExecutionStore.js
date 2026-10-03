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
  const now = options.now || (() => new Date());
  const staleAfterMs = options.staleAfterMs || 2 * 60 * 60 * 1000;
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs < 5 * 60 * 1000) {
    throw new Error("COVER_EXECUTION_STALE_WINDOW_INVALID");
  }
  const blobFor = (key) => {
    if (!SHA256.test(key)) throw new Error("COVER_EXECUTION_KEY_INVALID");
    return container.getBlockBlobClient(`publishing/cover/v1/executions/${key}.json`);
  };

  async function reserveExecution(key) {
    const blob = blobFor(key);
    const record = { key, state: "IN_PROGRESS", executionId: randomUUID(), attempt: 1,
      startedAt: now().toISOString(), finishedAt: null, result: null, previousAttempts: [] };
    try {
      await writeRecord(blob, record, { ifNoneMatch: "*" });
      return { status: "ACQUIRED", executionId: record.executionId };
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
    }
    const current = await readRecord(blob);
    if (current.record.key !== key) throw new Error("COVER_EXECUTION_RECORD_CONFLICT");
    if (current.record.state === "COMPLETE") return { status: "EXISTING", record: current.record.result };
    const stale = current.record.state === "IN_PROGRESS" &&
      Number.isFinite(Date.parse(current.record.startedAt)) &&
      now().getTime() - Date.parse(current.record.startedAt) >= staleAfterMs;
    if (current.record.state === "IN_PROGRESS" && !stale) return { status: "IN_PROGRESS" };
    if (!(["FAILED", "IN_PROGRESS"].includes(current.record.state)) || !current.etag ||
        !Number.isSafeInteger(current.record.attempt) || current.record.attempt < 1) {
      throw new Error("COVER_EXECUTION_RECORD_INVALID");
    }
    const prior = { executionId: current.record.executionId, state: stale ? "STALE" : "FAILED",
      startedAt: current.record.startedAt, finishedAt: current.record.finishedAt,
      result: current.record.result };
    const retry = { ...record, attempt: current.record.attempt + 1,
      previousAttempts: [...(current.record.previousAttempts || []), prior] };
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
    await writeRecord(blob, { ...current.record, state, finishedAt: now().toISOString(), result },
      { ifMatch: current.etag });
  }

  return {
    reserveExecution,
    completeExecution: (key, record) => transition(key, record.executionId, "COMPLETE", record),
    failExecution: (key, failure) => transition(key, failure.executionId, "FAILED", failure)
  };
}

module.exports = { createCoverExecutionStore };
