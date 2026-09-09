"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");

const DEFAULT_CONTAINER = "jm1-publishing-inbound-evidence";
const DELTA_CHECKPOINT_NAME = "publishing-mailbox-delta";

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

function encodePathPart(value) {
  return encodeURIComponent(String(value || "unknown")).replace(/%/g, "~");
}

async function readJson(blobClient) {
  try {
    const response = await blobClient.download();
    const chunks = [];
    for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

class BlobInboundEvidenceStore {
  constructor(options = {}) {
    const connectionString = options.connectionString || process.env.AzureWebJobsStorage;
    if (!connectionString) throw new Error("AzureWebJobsStorage is required for blob inbound evidence store");
    const containerName = options.containerName || process.env.JM1_PUBLISHING_INBOUND_EVIDENCE_CONTAINER || DEFAULT_CONTAINER;
    this.containerClient = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
    this.ready = null;
  }

  async ensureReady() {
    if (!this.ready) this.ready = this.containerClient.createIfNotExists();
    await this.ready;
  }

  blob(path) {
    return this.containerClient.getBlockBlobClient(path);
  }

  async put(path, value) {
    await this.ensureReady();
    await this.blob(path).upload(safeJson(value), Buffer.byteLength(safeJson(value)), {
      blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" }
    });
    return value;
  }

  async get(path) {
    await this.ensureReady();
    return readJson(this.blob(path));
  }

  messagePath(key) {
    return `messages/${encodePathPart(key)}.json`;
  }

  attachmentPath(attachment) {
    const messageId = encodePathPart(attachment.messageEventId);
    const attachmentId = encodePathPart(attachment.graphAttachmentId || attachment.originalFilename);
    return `attachments/${messageId}/${attachmentId}.json`;
  }

  queuePath(id) {
    return `queue/${encodePathPart(id)}.json`;
  }

  checkpointPath(name) {
    return `checkpoints/${encodePathPart(name)}.json`;
  }

  async upsertMessage(message) {
    const path = this.messagePath(message.idempotencyKey);
    const existing = await this.get(path);
    if (existing) return { created: false, record: existing };
    await this.put(path, message);
    await this.mergeHealth({ lastMessageDetectedAt: message.detectedAt });
    return { created: true, record: message };
  }

  async updateMessage(message) {
    await this.put(this.messagePath(message.idempotencyKey), message);
    const update = { lastMessageProcessedAt: new Date().toISOString() };
    if (message.processingStatus === "FAILED") update.failedMessageCountIncrement = 1;
    await this.mergeHealth(update);
    return { record: message };
  }

  async upsertAttachment(attachment) {
    const path = this.attachmentPath(attachment);
    const existing = await this.get(path);
    if (existing) return { created: false, record: existing };
    await this.put(path, attachment);
    if (attachment.processingStatus === "FAILED") await this.mergeHealth({ attachmentFailureCountIncrement: 1 });
    return { created: true, record: attachment };
  }

  async upsertQueueItem(item) {
    const path = this.queuePath(item.queueItemId);
    const existing = await this.get(path);
    if (existing) return { created: false, record: existing };
    await this.put(path, item);
    return { created: true, record: item };
  }

  async getCheckpoint(name) {
    return this.get(this.checkpointPath(name));
  }

  async setCheckpoint(name, value) {
    await this.put(this.checkpointPath(name), value);
    if (name === DELTA_CHECKPOINT_NAME) {
      await this.mergeHealth({
        lastDeltaReconciliationAt: new Date().toISOString(),
        deltaTokenStatus: value.tokenStatus || "CURRENT"
      });
    }
    return value;
  }

  async recordNotification(at = new Date().toISOString()) {
    await this.mergeHealth({ lastNotificationAt: at });
  }

  async listPrefix(prefix) {
    await this.ensureReady();
    const records = [];
    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      const value = await this.get(blob.name);
      if (value) records.push(value);
    }
    return records;
  }

  async listQueueItems(limit = 100) {
    const items = await this.listPrefix("queue/");
    return items
      .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")))
      .slice(0, limit);
  }

  async getHealthSnapshot() {
    const [health, messages, queue, attachments] = await Promise.all([
      this.get("health/health.json"),
      this.listPrefix("messages/"),
      this.listPrefix("queue/"),
      this.listPrefix("attachments/")
    ]);
    return {
      ...(health || {}),
      processingBacklog: queue.filter((q) => q.processingStatus === "REVIEW_REQUIRED").length,
      failedMessageCount: messages.filter((m) => m.processingStatus === "FAILED").length,
      unclassifiedCount: messages.filter((m) => m.classification === "UNCLASSIFIED").length,
      attachmentFailureCount: attachments.filter((a) => a.processingStatus === "FAILED").length
    };
  }

  async mergeHealth(update) {
    const current = (await this.get("health/health.json")) || {};
    const next = { ...current };
    for (const [key, value] of Object.entries(update)) {
      if (key.endsWith("Increment")) {
        const target = key.replace(/Increment$/, "");
        next[target] = Number(next[target] || 0) + Number(value || 0);
      } else {
        next[key] = value;
      }
    }
    next.updatedAt = new Date().toISOString();
    await this.put("health/health.json", next);
    return next;
  }
}

module.exports = {
  BlobInboundEvidenceStore
};
