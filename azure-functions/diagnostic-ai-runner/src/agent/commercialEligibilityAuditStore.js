"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const DEFAULT_CONTAINER = "agentic-audit";
const DEFAULT_PREFIX = "publishing/commercial-eligibility/v1";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function bodyJson(response) {
  const chunks = [];
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createCommercialEligibilityAuditStore(options = {}) {
  const serviceUrl = clean(options.serviceUrl || process.env.JM1_AGENTIC_AUDIT_BLOB_SERVICE_URL || "https://stjm1diagrunner.blob.core.windows.net");
  const containerName = clean(options.containerName || process.env.JM1_AGENTIC_AUDIT_CONTAINER) || DEFAULT_CONTAINER;
  const prefix = clean(options.prefix || process.env.JM1_AGENTIC_AUDIT_PREFIX) || DEFAULT_PREFIX;
  const service = options.service || new BlobServiceClient(serviceUrl, options.credential || new DefaultAzureCredential());
  const container = service.getContainerClient(containerName);

  async function writeOnce(name, value) {
    const blob = container.getBlockBlobClient(`${prefix}/${name}`);
    const payload = `${JSON.stringify(value, null, 2)}\n`;
    try {
      await blob.upload(payload, Buffer.byteLength(payload), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: { ifNoneMatch: "*" },
        metadata: { capability: "commercial-eligibility", retentionclass: "governed-agent-audit" }
      });
      return { value, created: true, blobName: blob.name };
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      return { value: await bodyJson(await blob.download()), created: false, blobName: blob.name };
    }
  }

  async function read(name) {
    const blob = container.getBlobClient(`${prefix}/${name}`);
    return bodyJson(await blob.download());
  }

  async function savePreparation(envelope) {
    return writeOnce(`preparations/${envelope.prepared.CLASSIFICATION_ID}.json`, envelope);
  }

  async function readPreparation(classificationId) {
    return read(`preparations/${clean(classificationId)}.json`);
  }

  async function saveReview(envelope) {
    const key = digest(JSON.stringify([
      envelope.classificationId,
      envelope.review.REVIEWER,
      envelope.review.REVIEW_ACTION,
      envelope.review.HUMAN_CORRECTION,
      envelope.review.REVIEW_REASON,
      envelope.currentStateVersion
    ]));
    return writeOnce(`reviews/${envelope.classificationId}/${key}.json`, { ...envelope, reviewId: key });
  }

  async function savePolicyDenial(envelope) {
    const key = digest(JSON.stringify([
      envelope.classificationId,
      envelope.effectDecision?.REQUESTED_EFFECT,
      envelope.effectDecision?.DECISION
    ]));
    return writeOnce(`policy-denials/${envelope.classificationId}/${key}.json`, { ...envelope, denialId: key });
  }

  async function saveFailure(event) {
    return writeOnce(`failures/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`, event);
  }

  async function list(limit = 100) {
    const records = [];
    for await (const blob of container.listBlobsFlat({ prefix: `${prefix}/` })) {
      const client = container.getBlobClient(blob.name);
      records.push({
        name: blob.name,
        createdOn: blob.properties.createdOn || null,
        lastModified: blob.properties.lastModified || null,
        record: await bodyJson(await client.download())
      });
      if (records.length >= limit) break;
    }
    return records;
  }

  return { list, readPreparation, saveFailure, savePolicyDenial, savePreparation, saveReview };
}

module.exports = { createCommercialEligibilityAuditStore };
