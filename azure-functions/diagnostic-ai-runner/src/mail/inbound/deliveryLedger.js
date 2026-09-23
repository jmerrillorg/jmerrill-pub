"use strict";

const { createHash } = require("node:crypto");

function normalizeMessageId(value) {
  return String(value || "").trim().toLowerCase();
}

function messageIdKey(value) {
  const id = normalizeMessageId(value);
  return id ? createHash("sha256").update(id).digest("hex") : null;
}

function replyMessageIds(message) {
  const source = [message.inReplyTo, message.references].filter(Boolean).join(" ");
  const ids = source.match(/<[^<>\s]+>/g) || [];
  return [...new Set(ids.map(normalizeMessageId))];
}

function verifiedServiceDelivery(route, service, readback) {
  const outboundInternetMessageId = String(readback.internetMessageId || "").trim();
  if (!messageIdKey(outboundInternetMessageId)) {
    throw Object.assign(new Error("Verified copy has no Internet Message ID"), {
      safeCode: "OUTBOUND_INTERNET_MESSAGE_ID_MISSING"
    });
  }
  return {
    deliveryId: `delivery_${createHash("sha256").update(String(service.communicationRecordId)).digest("hex").slice(0, 32)}`,
    outboundMessageId: service.providerMessageId,
    internetMessageId: outboundInternetMessageId,
    conversationId: readback.conversationId || null,
    authorId: route.authorId,
    engagementId: route.engagementId,
    titleId: route.titleId,
    stageId: route.stageId,
    gateId: null,
    artifactId: null,
    artifactVersion: null,
    artifactHash: null,
    deliveredAt: service.sentAt,
    deliveryStatus: "SENT_COPY_VERIFIED",
    channel: "ACS_EMAIL",
    sourceWorkflow: "PUBLISHING_INBOUND_SERVICE",
    communicationRecordId: service.communicationRecordId,
    sentRecordId: service.sentRecordId,
    sourceInboundEventId: route.inboundMessageEventId
  };
}

module.exports = { messageIdKey, normalizeMessageId, replyMessageIds, verifiedServiceDelivery };
