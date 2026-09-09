"use strict";

const {
  MAILBOX,
  PROCESSING_STATUS,
  SUPPORTED_ATTACHMENT_EXTENSIONS
} = require("./constants");
const {
  addresses,
  extensionFromName,
  headerValue,
  normalizeEmail,
  normalizeString,
  redactBodyForEvidence,
  sha256Hex,
  stableId
} = require("./util");

function buildMessageIdempotencyKey(message) {
  const internetMessageId = normalizeString(message.internetMessageId);
  const graphMessageId = normalizeString(message.id);
  const conversationId = normalizeString(message.conversationId);
  return stableId("msg", [MAILBOX, internetMessageId || graphMessageId, conversationId]);
}

function buildMessageEvidence(graphMessage, detection = {}) {
  const headers = Array.isArray(graphMessage.internetMessageHeaders) ? graphMessage.internetMessageHeaders : [];
  const receivedAt = normalizeString(graphMessage.receivedDateTime);
  const detectedAt = normalizeString(detection.detectedAt) || new Date().toISOString();
  const idempotencyKey = buildMessageIdempotencyKey(graphMessage);
  const bodyText = redactBodyForEvidence(graphMessage.body || graphMessage.bodyPreview || "");

  return {
    inboundMessageEventId: stableId("inbound_message_event", [idempotencyKey]),
    mailbox: MAILBOX,
    graphMessageId: normalizeString(graphMessage.id) || null,
    internetMessageId: normalizeString(graphMessage.internetMessageId) || null,
    conversationId: normalizeString(graphMessage.conversationId) || null,
    inReplyTo: headerValue(headers, "In-Reply-To"),
    references: headerValue(headers, "References"),
    subject: normalizeString(graphMessage.subject),
    fromAddress: normalizeEmail(graphMessage.from?.emailAddress?.address) || null,
    fromDisplayName: normalizeString(graphMessage.from?.emailAddress?.name) || null,
    to: addresses(graphMessage.toRecipients),
    cc: addresses(graphMessage.ccRecipients),
    receivedAt: receivedAt || null,
    detectedAt,
    ingestedAt: detection.ingestedAt || detectedAt,
    bodyHash: sha256Hex(bodyText),
    hasAttachments: graphMessage.hasAttachments === true,
    classification: null,
    classificationConfidence: null,
    classificationAuthority: null,
    correlationStatus: "UNRESOLVED",
    authorId: null,
    titleId: null,
    workId: null,
    engagementId: null,
    lifecycleId: null,
    stageId: null,
    correlationId: normalizeString(detection.correlationId) || stableId("corr", [idempotencyKey]),
    causationId: normalizeString(detection.causationId) || null,
    idempotencyKey,
    processingStatus: PROCESSING_STATUS.INGESTED,
    manualReviewRequired: true,
    error: null,
    evidenceSource: "MICROSOFT_365_GRAPH_REFERENCE",
    untrustedContent: {
      bodyAvailableForClassification: Boolean(bodyText),
      bodyHashOnlyPersistedAsAuthority: true,
      externalInstructionsAreAuthority: false
    },
    consequentialActions: {
      titleLifecycleTransitions: 0,
      authorDecisionsCreated: 0,
      authorCommunicationsSent: 0,
      agreementsCreated: 0,
      paymentRequests: 0,
      royaltyLedgerRecords: 0,
      royaltyStatementsCreated: 0,
      royaltyPayments: 0,
      productionDeployments: 0,
      manualStateRepairs: 0
    }
  };
}

function buildAttachmentEvidence(messageEvidence, graphAttachment, bytes = null) {
  const filename = normalizeString(graphAttachment.name);
  const extension = extensionFromName(filename);
  const contentBuffer = bytes == null
    ? Buffer.alloc(0)
    : (Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
  const hash = contentBuffer.length > 0
    ? sha256Hex(contentBuffer)
    : normalizeString(graphAttachment.contentBytes)
      ? sha256Hex(Buffer.from(graphAttachment.contentBytes, "base64"))
      : null;

  return {
    attachmentEventId: stableId("attachment_event", [
      messageEvidence.inboundMessageEventId,
      normalizeString(graphAttachment.id),
      filename
    ]),
    messageEventId: messageEvidence.inboundMessageEventId,
    graphAttachmentId: normalizeString(graphAttachment.id) || null,
    originalFilename: filename,
    mimeType: normalizeString(graphAttachment.contentType) || null,
    sizeBytes: typeof graphAttachment.size === "number" ? graphAttachment.size : contentBuffer.length,
    sha256: hash,
    receivedAt: messageEvidence.receivedAt,
    classification: SUPPORTED_ATTACHMENT_EXTENSIONS.has(extension) ? extension.toUpperCase() : "UNKNOWN",
    titleIsbnCandidate: null,
    authorCandidate: null,
    engagementCandidate: null,
    storageStatus: "EVIDENCE_REFERENCE_CAPTURED",
    sharePointItemId: null,
    processingStatus: PROCESSING_STATUS.INGESTED,
    unsupportedTypePreserved: !SUPPORTED_ATTACHMENT_EXTENSIONS.has(extension),
    embeddedContentExecuted: false,
    macroOpened: false
  };
}

function applyClassification(messageEvidence, classification) {
  return {
    ...messageEvidence,
    classification: classification.messageClass,
    classificationConfidence: classification.confidence,
    classificationAuthority: classification.authority,
    manualReviewRequired: classification.manualReviewRequired,
    processingStatus: PROCESSING_STATUS.CLASSIFIED
  };
}

function applyCorrelation(messageEvidence, correlation) {
  return {
    ...messageEvidence,
    correlationStatus: correlation.status,
    authorId: correlation.authorId || null,
    titleId: correlation.titleId || null,
    workId: correlation.workId || null,
    engagementId: correlation.engagementId || null,
    lifecycleId: correlation.lifecycleId || null,
    stageId: correlation.stageId || null,
    manualReviewRequired: messageEvidence.manualReviewRequired || correlation.reviewRequired,
    processingStatus: correlation.reviewRequired ? PROCESSING_STATUS.REVIEW_REQUIRED : PROCESSING_STATUS.CORRELATED,
    error: correlation.error || messageEvidence.error
  };
}

module.exports = {
  buildMessageIdempotencyKey,
  buildMessageEvidence,
  buildAttachmentEvidence,
  applyClassification,
  applyCorrelation
};
