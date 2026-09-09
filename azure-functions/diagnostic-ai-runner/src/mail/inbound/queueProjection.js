"use strict";

const { MESSAGE_CLASS, QUEUE_CATEGORY, PROCESSING_STATUS } = require("./constants");

function categoryForMessageClass(messageClass) {
  switch (messageClass) {
    case MESSAGE_CLASS.AUTHOR_RESPONSE:
    case MESSAGE_CLASS.AUTHOR_APPROVAL:
    case MESSAGE_CLASS.AUTHOR_REQUEST_CHANGES:
    case MESSAGE_CLASS.AUTHOR_HOLD_REQUEST:
    case MESSAGE_CLASS.AUTHOR_DECLINE:
      return QUEUE_CATEGORY.AUTHOR_RESPONSE_ACTION_REQUIRED;
    case MESSAGE_CLASS.AUTHOR_QUESTION:
      return QUEUE_CATEGORY.AUTHOR_QUESTION;
    case MESSAGE_CLASS.AUTHOR_CLARIFICATION:
      return QUEUE_CATEGORY.AUTHOR_CLARIFICATION;
    case MESSAGE_CLASS.MANUSCRIPT_SUBMISSION:
      return QUEUE_CATEGORY.MANUSCRIPT_SUBMISSION;
    case MESSAGE_CLASS.MANUSCRIPT_REVISION:
      return QUEUE_CATEGORY.MANUSCRIPT_REVISION;
    case MESSAGE_CLASS.COMMERCIAL_CONFIRMATION:
      return QUEUE_CATEGORY.COMMERCIAL_RESPONSE;
    case MESSAGE_CLASS.AGREEMENT_RESPONSE:
      return QUEUE_CATEGORY.AGREEMENT_RESPONSE;
    case MESSAGE_CLASS.ROYALTY_REPORT:
    case MESSAGE_CLASS.SALES_REPORT:
      return QUEUE_CATEGORY.ROYALTY_REPORT_RECEIVED;
    case MESSAGE_CLASS.DISTRIBUTOR_NOTICE:
    case MESSAGE_CLASS.DISTRIBUTION_REPORT:
      return QUEUE_CATEGORY.DISTRIBUTOR_NOTICE;
    case MESSAGE_CLASS.METADATA_EXCEPTION:
    case MESSAGE_CLASS.METADATA_NOTICE:
      return QUEUE_CATEGORY.METADATA_EXCEPTION;
    case MESSAGE_CLASS.PRODUCTION_EXCEPTION:
    case MESSAGE_CLASS.PRODUCTION_NOTICE:
      return QUEUE_CATEGORY.PRODUCTION_EXCEPTION;
    case MESSAGE_CLASS.RIGHTS_INQUIRY:
    case MESSAGE_CLASS.PERMISSIONS_CORRESPONDENCE:
      return QUEUE_CATEGORY.RIGHTS_INQUIRY;
    case MESSAGE_CLASS.INVOICE:
    case MESSAGE_CLASS.FEE_NOTICE:
    case MESSAGE_CLASS.PAYMENT_CORRESPONDENCE:
      return QUEUE_CATEGORY.INVOICE_FEE_NOTICE;
    default:
      return QUEUE_CATEGORY.UNCLASSIFIED_PUBLISHING_MAIL;
  }
}

function buildQueueItem(messageEvidence, attachments = []) {
  const category = categoryForMessageClass(messageEvidence.classification);
  const reviewRequired = messageEvidence.manualReviewRequired === true || messageEvidence.correlationStatus !== "DETERMINISTIC";

  return {
    queueItemId: `queue_${messageEvidence.inboundMessageEventId}`,
    category,
    receivedAt: messageEvidence.receivedAt,
    sender: messageEvidence.fromAddress,
    subject: messageEvidence.subject,
    classification: messageEvidence.classification,
    confidence: messageEvidence.classificationConfidence,
    authorId: messageEvidence.authorId,
    titleId: messageEvidence.titleId,
    stageId: messageEvidence.stageId,
    attachmentIndicator: attachments.length > 0,
    attachmentCount: attachments.length,
    waitingOn: reviewRequired ? "JMP" : null,
    nextAction: reviewRequired ? "Review inbound evidence and route through the applicable V2 authority contract." : "No immediate human action required.",
    evidenceLink: messageEvidence.inboundMessageEventId,
    processingStatus: reviewRequired ? PROCESSING_STATUS.REVIEW_REQUIRED : PROCESSING_STATUS.ROUTED,
    priority: category === QUEUE_CATEGORY.ROYALTY_REPORT_RECEIVED ? "NORMAL" : reviewRequired ? "HIGH" : "NORMAL",
    reasonUnresolved: reviewRequired ? (messageEvidence.error || "MANUAL_REVIEW_REQUIRED") : null,
    recommendedHumanAction: reviewRequired ? "Open the evidence record before taking business action." : null
  };
}

module.exports = {
  categoryForMessageClass,
  buildQueueItem
};
