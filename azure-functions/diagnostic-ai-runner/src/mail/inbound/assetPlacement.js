"use strict";

const { PROCESSING_STATUS } = require("./constants");
const { buildQueueItem } = require("./queueProjection");
const { normalizeString } = require("./util");

const FOUNDER_CURRENT_WORK_AUTHORITY = "FOUNDER_CURRENT_WORK_AUTHORITY";

function fail(code, message, status = 409) {
  throw Object.assign(new Error(message), { safeCode: code, httpStatus: status });
}

function exact(value, expected) {
  return normalizeString(value).toLowerCase() === normalizeString(expected).toLowerCase();
}

function exactCandidate(candidate, input) {
  return exact(candidate.authorId, input.authorId)
    && exact(candidate.titleId, input.titleId)
    && exact(candidate.workId || candidate.titleId, input.workId || input.titleId)
    && exact(candidate.engagementId, input.engagementId)
    && exact(candidate.stageId, input.stageId)
    && candidate.movementState === "CURRENT_ACTIVE";
}

async function applyAuthorizedAssetPlacement(input, options = {}) {
  const store = options.store;
  const contextProvider = options.contextProvider;
  const now = options.now || (() => new Date().toISOString());
  if (!store || typeof contextProvider !== "function") fail("PLACEMENT_RUNTIME_CONFIG_MISSING", "Placement store and context provider are required", 500);
  if (input?.confirmAuthorizedPlacement !== true || input?.authority !== FOUNDER_CURRENT_WORK_AUTHORITY) {
    fail("FOUNDER_PLACEMENT_AUTHORITY_REQUIRED", "Exact founder placement authority is required", 400);
  }

  const required = ["messageEventId", "attachmentEventId", "authorId", "titleId", "engagementId", "stageId", "sha256"];
  for (const field of required) {
    if (!normalizeString(input[field])) fail("PLACEMENT_INPUT_INCOMPLETE", `Missing required field: ${field}`, 400);
  }

  const [message, attachment] = await Promise.all([
    store.findMessageByEventId(input.messageEventId),
    store.findAttachmentByEventId(input.attachmentEventId)
  ]);
  if (!message) fail("MESSAGE_EVIDENCE_NOT_FOUND", "Canonical inbound message evidence was not found", 404);
  if (!attachment) fail("ATTACHMENT_EVIDENCE_NOT_FOUND", "Canonical attachment evidence was not found", 404);
  if (!exact(attachment.messageEventId, message.inboundMessageEventId)) fail("ATTACHMENT_MESSAGE_BINDING_MISMATCH", "Attachment is not bound to the authorized message");
  if (!exact(attachment.sha256, input.sha256)) fail("ATTACHMENT_CHECKSUM_MISMATCH", "Attachment checksum does not match the authorized source");
  if (attachment.originalSourcePreserved !== true || attachment.sourceMessageBinding !== "PASS") {
    fail("PRESERVED_SOURCE_AUTHORITY_MISSING", "Preserved source evidence is incomplete");
  }

  const liveContext = await contextProvider(message);
  const matches = (liveContext.activeEngagements || []).filter((candidate) => exactCandidate(candidate, input));
  if (matches.length !== 1) fail("CURRENT_MOVEMENT_AUTHORITY_MISMATCH", "Exact current active movement could not be proven");
  const candidate = matches[0];

  const alreadyPlaced = message.correlationEvidence === FOUNDER_CURRENT_WORK_AUTHORITY
    && message.manualReviewRequired === false
    && exact(message.titleId, input.titleId)
    && exact(message.engagementId, input.engagementId)
    && exact(message.stageId, input.stageId)
    && attachment.placementAuthority === FOUNDER_CURRENT_WORK_AUTHORITY
    && attachment.placementStatus === "PLACED"
    && exact(attachment.titleId, input.titleId)
    && exact(attachment.engagementCandidate, input.engagementId)
    && exact(attachment.stageCandidate, input.stageId);
  if (alreadyPlaced) {
    return {
      ok: true,
      idempotent: true,
      messageEventId: message.inboundMessageEventId,
      attachmentEventId: attachment.attachmentEventId,
      authorId: input.authorId,
      titleId: input.titleId,
      workId: input.workId || input.titleId,
      engagementId: input.engagementId,
      stageId: input.stageId,
      placementAuthority: FOUNDER_CURRENT_WORK_AUTHORITY,
      consequentialActions: message.consequentialActions
    };
  }

  const placedAt = now();
  const updatedMessage = {
    ...message,
    authorId: input.authorId,
    titleId: input.titleId,
    workId: input.workId || input.titleId,
    engagementId: input.engagementId,
    stageId: input.stageId,
    correlationStatus: "DETERMINISTIC",
    correlationCandidates: [candidate],
    correlationEvidence: FOUNDER_CURRENT_WORK_AUTHORITY,
    manualReviewRequired: false,
    processingStatus: PROCESSING_STATUS.ROUTED,
    error: null,
    placementAuthorizedAt: placedAt,
    placementAuthority: FOUNDER_CURRENT_WORK_AUTHORITY
  };
  const updatedAttachment = {
    ...attachment,
    authorCandidate: input.authorId,
    titleId: input.titleId,
    titleCandidates: [candidate],
    engagementCandidate: input.engagementId,
    stageCandidate: input.stageId,
    authorBinding: "PASS",
    workBinding: "PASS",
    placementAuthority: FOUNDER_CURRENT_WORK_AUTHORITY,
    placementStatus: "PLACED",
    placedAt,
    processingStatus: PROCESSING_STATUS.ROUTED
  };
  const queueItem = buildQueueItem(updatedMessage, [updatedAttachment]);

  await store.updateMessage(updatedMessage);
  await store.updateAttachment(updatedAttachment);
  await store.updateQueueItem(queueItem);

  return {
    ok: true,
    idempotent: false,
    messageEventId: updatedMessage.inboundMessageEventId,
    attachmentEventId: updatedAttachment.attachmentEventId,
    authorId: updatedMessage.authorId,
    titleId: updatedMessage.titleId,
    workId: updatedMessage.workId,
    engagementId: updatedMessage.engagementId,
    stageId: updatedMessage.stageId,
    placedAt,
    placementAuthority: FOUNDER_CURRENT_WORK_AUTHORITY,
    attachmentSha256: updatedAttachment.sha256,
    originalSourcePreserved: updatedAttachment.originalSourcePreserved,
    queueStatus: queueItem.processingStatus,
    consequentialActions: updatedMessage.consequentialActions
  };
}

module.exports = {
  FOUNDER_CURRENT_WORK_AUTHORITY,
  applyAuthorizedAssetPlacement
};
