"use strict";

const { MESSAGE_CLASS } = require("./constants");
const { normalizeLower, normalizeString } = require("./util");

function correlateMessage(messageEvidence, senderResolution = {}, context = {}) {
  const outbound = Array.isArray(context.outboundEvents)
    ? context.outboundEvents.find((e) => {
        const headers = [messageEvidence.inReplyTo, messageEvidence.references].filter(Boolean).join(" ");
        return normalizeString(e.internetMessageId) && headers.includes(e.internetMessageId);
      })
    : null;
  if (outbound) {
    return {
      status: "DETERMINISTIC",
      reviewRequired: false,
      authorId: outbound.authorId,
      titleId: outbound.titleId,
      workId: outbound.workId,
      engagementId: outbound.engagementId,
      lifecycleId: outbound.lifecycleId,
      stageId: outbound.stageId,
      evidence: "OUTBOUND_MESSAGE_HEADER"
    };
  }

  const active = Array.isArray(context.activeEngagements)
    ? context.activeEngagements.filter((e) => {
        if (senderResolution.authorId && e.authorId === senderResolution.authorId) return true;
        return normalizeLower(e.authorEmail) && normalizeLower(e.authorEmail) === normalizeLower(messageEvidence.fromAddress);
      })
    : [];

  if (active.length === 1) {
    const e = active[0];
    return {
      status: "DETERMINISTIC",
      reviewRequired: false,
      authorId: e.authorId,
      titleId: e.titleId,
      workId: e.workId || null,
      engagementId: e.engagementId,
      lifecycleId: e.lifecycleId || null,
      stageId: e.stageId || null,
      evidence: "SINGLE_ACTIVE_AUTHOR_ENGAGEMENT"
    };
  }

  if (active.length > 1) {
    return {
      status: "AMBIGUOUS",
      reviewRequired: true,
      error: "CORRELATION_REVIEW_REQUIRED_MULTIPLE_ACTIVE_ENGAGEMENTS",
      candidates: active.map((e) => ({ authorId: e.authorId, titleId: e.titleId, engagementId: e.engagementId }))
    };
  }

  if (messageEvidence.classification === MESSAGE_CLASS.ROYALTY_REPORT) {
    return {
      status: "BUSINESS_SENDER_ONLY",
      reviewRequired: true,
      evidence: "KNOWN_DISTRIBUTOR_SENDER"
    };
  }

  return {
    status: "UNRESOLVED",
    reviewRequired: true,
    error: "CORRELATION_REVIEW_REQUIRED"
  };
}

module.exports = {
  correlateMessage
};
