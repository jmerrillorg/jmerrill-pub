"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const DEFAULT_CONTAINER = "agentic-audit";
const DEFAULT_PREFIX = "publishing/payment-election-a3/v1";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

async function bodyJson(response) {
  const chunks = [];
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createPaymentElectionA3ControlStore(options = {}) {
  const serviceUrl = clean(options.serviceUrl || process.env.JM1_AGENTIC_AUDIT_BLOB_SERVICE_URL || "https://stjm1diagrunner.blob.core.windows.net");
  const containerName = clean(options.containerName || process.env.JM1_AGENTIC_AUDIT_CONTAINER) || DEFAULT_CONTAINER;
  const prefix = clean(options.prefix || process.env.JM1_AGENTIC_PAYMENT_ELECTION_A3_AUDIT_PREFIX) || DEFAULT_PREFIX;
  const service = options.service || new BlobServiceClient(serviceUrl, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function writeOnce(name, value, metadata) {
    const blob = container.getBlockBlobClient(`${prefix}/${name}`);
    const payload = `${JSON.stringify(value, null, 2)}\n`;
    try {
      await blob.upload(payload, Buffer.byteLength(payload), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: { ifNoneMatch: "*" },
        metadata
      });
      return { value, created: true, blobName: blob.name };
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      return { value: await bodyJson(await blob.download()), created: false, blobName: blob.name };
    }
  }

  async function audit(record = {}) {
    const planId = clean(record.plan?.planId || record.planId) || "unbound";
    const event = clean(record.event) || "PAYMENT_ELECTION_A3_AUDIT_EVENT";
    const key = digest(JSON.stringify({ event, planId, record }));
    return writeOnce(`audit/${planId}/${event.toLowerCase()}-${key}.json`, {
      schemaVersion: "JM1-PAYMENT-ELECTION-A3-AUDIT-v1",
      storedAt: options.clock ? options.clock() : new Date().toISOString(),
      ...record
    }, { capability: "payment-election-a3", retentionclass: "governed-agent-audit" });
  }

  async function reserve(idempotencyKey, evidence = {}) {
    const key = digest(clean(idempotencyKey));
    return writeOnce(`idempotency/${key}.json`, {
      schemaVersion: "JM1-PAYMENT-ELECTION-A3-IDEMPOTENCY-v1",
      idempotencyKey: clean(idempotencyKey),
      reservedAt: options.clock ? options.clock() : new Date().toISOString(),
      reservationId: randomUUID(),
      evidence
    }, { capability: "payment-election-a3", retentionclass: "governed-agent-idempotency" });
  }

  return { audit, reserve };
}

module.exports = { createPaymentElectionA3ControlStore };
