"use strict";

const { DETECTION_SOURCE, PROCESSING_STATUS } = require("./constants");
const { buildAttachmentEvidence, buildMessageEvidence, applyClassification, applyCorrelation } = require("./evidenceModel");
const { classifyInboundMessage } = require("./classifier");
const { correlateMessage } = require("./correlator");
const { buildQueueItem } = require("./queueProjection");
const { resolveSender } = require("./senderResolver");

async function captureAttachments(graphClient, messageEvidence) {
  if (!messageEvidence.hasAttachments) return [];
  const listed = await graphClient.listAttachments(messageEvidence.graphMessageId);
  const attachments = Array.isArray(listed.value) ? listed.value : [];
  const evidence = [];

  for (const attachment of attachments) {
    const full = await graphClient.getAttachmentContent(messageEvidence.graphMessageId, attachment.id);
    const bytes = full.contentBytes ? Buffer.from(full.contentBytes, "base64") : Buffer.alloc(0);
    evidence.push(buildAttachmentEvidence(messageEvidence, { ...full, ...attachment }, bytes));
  }

  return evidence;
}

async function processGraphMessage(graphMessage, options = {}) {
  const {
    graphClient,
    store,
    detectionSource = DETECTION_SOURCE.SYNTHETIC,
    context = {},
    detectedAt = new Date().toISOString()
  } = options;
  if (!store) throw new Error("store is required");

  let messageEvidence = buildMessageEvidence(graphMessage, {
    detectedAt,
    causationId: detectionSource
  });

  const created = await store.upsertMessage(messageEvidence);
  if (!created.created && created.record.processingStatus !== PROCESSING_STATUS.FAILED) {
    return {
      ok: true,
      idempotent: true,
      messageEvent: created.record,
      attachments: [],
      queueItem: null,
      consequentialActions: created.record.consequentialActions
    };
  }
  if (!created.created && created.record.processingStatus === PROCESSING_STATUS.FAILED) {
    messageEvidence = {
      ...created.record,
      detectedAt,
      processingStatus: PROCESSING_STATUS.DETECTED,
      manualReviewRequired: false,
      error: null
    };
  }

  let attachmentEvidence = [];
  try {
    attachmentEvidence = graphClient ? await captureAttachments(graphClient, messageEvidence) : [];
    for (const attachment of attachmentEvidence) {
      await store.upsertAttachment(attachment);
    }
  } catch (err) {
    messageEvidence = {
      ...messageEvidence,
      processingStatus: PROCESSING_STATUS.FAILED,
      manualReviewRequired: true,
      error: err.safeCode || "ATTACHMENT_CAPTURE_FAILED"
    };
    await store.updateMessage(messageEvidence);
    return { ok: false, code: "ATTACHMENT_CAPTURE_FAILED", messageEvent: messageEvidence, attachments: attachmentEvidence };
  }

  const senderResolution = resolveSender(messageEvidence, context);
  const classification = classifyInboundMessage(
    { ...messageEvidence, bodyTextForClassification: graphMessage.body?.content || graphMessage.bodyPreview || "" },
    attachmentEvidence,
    senderResolution
  );
  messageEvidence = applyClassification(messageEvidence, classification);
  messageEvidence.senderResolution = senderResolution.status;
  messageEvidence.senderIdentityType = senderResolution.identityType;

  const correlation = correlateMessage(messageEvidence, senderResolution, context);
  messageEvidence = applyCorrelation(messageEvidence, correlation);

  const queueItem = buildQueueItem(messageEvidence, attachmentEvidence);
  messageEvidence = {
    ...messageEvidence,
    processingStatus: queueItem.processingStatus === PROCESSING_STATUS.REVIEW_REQUIRED
      ? PROCESSING_STATUS.REVIEW_REQUIRED
      : PROCESSING_STATUS.ROUTED
  };

  await store.updateMessage(messageEvidence);
  await store.upsertQueueItem(queueItem);

  return {
    ok: true,
    idempotent: false,
    messageEvent: messageEvidence,
    attachments: attachmentEvidence,
    queueItem,
    senderResolution,
    classification,
    correlation,
    consequentialActions: messageEvidence.consequentialActions
  };
}

async function ingestNotification(notification, options = {}) {
  const { graphClient, store, clientStateValidator } = options;
  if (!graphClient || !store) throw new Error("graphClient and store are required");
  if (clientStateValidator && !clientStateValidator(notification.clientState)) {
    return { ok: false, code: "CLIENT_STATE_INVALID" };
  }
  await store.recordNotification(new Date().toISOString());
  const messageId = String(notification.resourceData?.id || "").trim();
  if (!messageId) return { ok: false, code: "MESSAGE_ID_MISSING" };
  const message = await graphClient.getMessage(messageId);
  return processGraphMessage(message, {
    ...options,
    detectionSource: DETECTION_SOURCE.GRAPH_NOTIFICATION
  });
}

async function reconcileDelta(options = {}) {
  const { graphClient, store, context = {} } = options;
  if (!graphClient || !store) throw new Error("graphClient and store are required");
  const checkpoint = await store.getCheckpoint("publishing-mailbox-delta");
  const deltaResult = await graphClient.delta(checkpoint?.deltaLink || null);
  const messages = Array.isArray(deltaResult.value) ? deltaResult.value.filter((m) => !m["@removed"]) : [];
  const results = [];

  for (const message of messages) {
    results.push(await processGraphMessage(message, {
      graphClient,
      store,
      context,
      detectionSource: DETECTION_SOURCE.DELTA_RECONCILIATION
    }));
  }

  await store.setCheckpoint("publishing-mailbox-delta", {
    deltaLink: deltaResult["@odata.deltaLink"] || deltaResult["@odata.nextLink"] || checkpoint?.deltaLink || null,
    lastRunAt: new Date().toISOString(),
    tokenStatus: deltaResult["@odata.deltaLink"] ? "CURRENT" : "PAGED"
  });

  return {
    ok: true,
    messagesDetected: messages.length,
    messagesIngested: results.filter((r) => r.ok).length,
    idempotent: results.filter((r) => r.idempotent).length,
    failed: results.filter((r) => !r.ok).length,
    results
  };
}

async function runShadowWindow(options = {}) {
  const { graphClient, store, afterIso, top = 25, context = {} } = options;
  if (!graphClient || !store) throw new Error("graphClient and store are required");
  const listed = await graphClient.listInboxMessagesSince(afterIso, top);
  const messages = Array.isArray(listed.value) ? listed.value : [];
  const results = [];
  for (const message of messages) {
    results.push(await processGraphMessage(message, {
      graphClient,
      store,
      context,
      detectionSource: DETECTION_SOURCE.SHADOW_READ
    }));
  }
  return {
    messagesInWindow: messages.length,
    messagesDetected: messages.length,
    messagesIngested: results.filter((r) => r.ok).length,
    messagesClassified: results.filter((r) => r.messageEvent?.classification).length,
    messagesCorrelated: results.filter((r) => r.messageEvent?.correlationStatus === "DETERMINISTIC").length,
    messagesReviewRequired: results.filter((r) => r.queueItem?.processingStatus === PROCESSING_STATUS.REVIEW_REQUIRED).length,
    messagesFailed: results.filter((r) => !r.ok).length,
    messagesSilentlyDropped: 0,
    results
  };
}

module.exports = {
  processGraphMessage,
  ingestNotification,
  reconcileDelta,
  runShadowWindow
};
