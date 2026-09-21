"use strict";

class InMemoryInboundEvidenceStore {
  constructor(seed = {}) {
    this.messages = new Map(seed.messages || []);
    this.attachments = new Map(seed.attachments || []);
    this.sourceAttachments = new Map(seed.sourceAttachments || []);
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

  async findMessageByEventId(eventId) {
    return [...this.messages.values()].find((message) => message.inboundMessageEventId === eventId) || null;
  }

  async upsertAttachment(attachment) {
    const key = `${attachment.messageEventId}:${attachment.graphAttachmentId || attachment.originalFilename}`;
    const existing = this.attachments.get(key);
    if (existing) return { created: false, record: existing };
    this.attachments.set(key, attachment);
    if (attachment.processingStatus === "FAILED") this.health.attachmentFailureCount += 1;
    return { created: true, record: attachment };
  }

  async updateAttachment(attachment) {
    const key = `${attachment.messageEventId}:${attachment.graphAttachmentId || attachment.originalFilename}`;
    this.attachments.set(key, attachment);
    return { record: attachment };
  }

  async findAttachmentByEventId(eventId) {
    return [...this.attachments.values()].find((attachment) => attachment.attachmentEventId === eventId) || null;
  }

  async preserveSourceAttachment(attachment, bytes) {
    const key = `${attachment.messageEventId}:${attachment.graphAttachmentId || attachment.originalFilename}:source`;
    if (this.sourceAttachments.has(key)) return { created: false, path: key };
    this.sourceAttachments.set(key, Buffer.from(bytes));
    return { created: true, path: key };
  }

  async readSourceAttachment(attachment) {
    const key = `${attachment.messageEventId}:${attachment.graphAttachmentId || attachment.originalFilename}:source`;
    const bytes = this.sourceAttachments.get(key);
    return bytes ? Buffer.from(bytes) : null;
  }

  async upsertQueueItem(item) {
    const existing = this.queue.get(item.queueItemId);
    if (existing) return { created: false, record: existing };
    this.queue.set(item.queueItemId, item);
    return { created: true, record: item };
  }

  async updateQueueItem(item) {
    this.queue.set(item.queueItemId, item);
    return { record: item };
  }

  async getQueueItem(id) {
    return this.queue.get(id) || null;
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
