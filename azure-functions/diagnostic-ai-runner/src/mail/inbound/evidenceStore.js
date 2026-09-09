"use strict";

class InMemoryInboundEvidenceStore {
  constructor(seed = {}) {
    this.messages = new Map(seed.messages || []);
    this.attachments = new Map(seed.attachments || []);
    this.queue = new Map(seed.queue || []);
    this.checkpoints = new Map(seed.checkpoints || []);
    this.health = {
      lastNotificationAt: null,
      lastDeltaReconciliationAt: null,
      deltaTokenStatus: "UNKNOWN",
      lastMessageDetectedAt: null,
      lastMessageProcessedAt: null,
      failedMessageCount: 0,
      attachmentFailureCount: 0
    };
  }

  async upsertMessage(message) {
    const existing = this.messages.get(message.idempotencyKey);
    if (existing) return { created: false, record: existing };
    this.messages.set(message.idempotencyKey, message);
    this.health.lastMessageDetectedAt = message.detectedAt;
    return { created: true, record: message };
  }

  async updateMessage(message) {
    this.messages.set(message.idempotencyKey, message);
    this.health.lastMessageProcessedAt = new Date().toISOString();
    if (message.processingStatus === "FAILED") this.health.failedMessageCount += 1;
    return { record: message };
  }

  async upsertAttachment(attachment) {
    const key = `${attachment.messageEventId}:${attachment.graphAttachmentId || attachment.originalFilename}`;
    const existing = this.attachments.get(key);
    if (existing) return { created: false, record: existing };
    this.attachments.set(key, attachment);
    if (attachment.processingStatus === "FAILED") this.health.attachmentFailureCount += 1;
    return { created: true, record: attachment };
  }

  async upsertQueueItem(item) {
    const existing = this.queue.get(item.queueItemId);
    if (existing) return { created: false, record: existing };
    this.queue.set(item.queueItemId, item);
    return { created: true, record: item };
  }

  async getCheckpoint(name) {
    return this.checkpoints.get(name) || null;
  }

  async setCheckpoint(name, value) {
    this.checkpoints.set(name, value);
    if (name === "publishing-mailbox-delta") {
      this.health.lastDeltaReconciliationAt = new Date().toISOString();
      this.health.deltaTokenStatus = value.tokenStatus || "CURRENT";
    }
    return value;
  }

  async recordNotification(at = new Date().toISOString()) {
    this.health.lastNotificationAt = at;
  }

  async listQueueItems(limit = 100) {
    return [...this.queue.values()]
      .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")))
      .slice(0, limit);
  }

  async getHealthSnapshot() {
    const messages = [...this.messages.values()];
    const queue = [...this.queue.values()];
    const attachments = [...this.attachments.values()];
    return {
      ...this.health,
      processingBacklog: queue.filter((q) => q.processingStatus === "REVIEW_REQUIRED").length,
      failedMessageCount: messages.filter((m) => m.processingStatus === "FAILED").length + this.health.failedMessageCount,
      unclassifiedCount: messages.filter((m) => m.classification === "UNCLASSIFIED").length,
      attachmentFailureCount: attachments.filter((a) => a.processingStatus === "FAILED").length + this.health.attachmentFailureCount
    };
  }
}

module.exports = {
  InMemoryInboundEvidenceStore
};
