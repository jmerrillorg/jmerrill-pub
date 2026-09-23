"use strict";

const { MESSAGE_CLASS } = require("./constants");
const { normalizeLower, normalizeString } = require("./util");
const { normalizeMessageId, replyMessageIds } = require("./deliveryLedger");

function explicitTitleMatches(messageEvidence, candidates) {
  const sourceText = normalizeLower(`${messageEvidence.subject || ""} ${messageEvidence.bodyTextForCorrelation || ""}`);
  if (!sourceText) return [];
  return candidates.filter((candidate) => {
    const title = normalizeLower(candidate.title);
    return title.length >= 5 && sourceText.includes(title);
  });
}

function deterministic(candidate, evidence) {
  return {
    status: "DETERMINISTIC",
    reviewRequired: false,
    authorId: candidate.authorId,
    titleId: candidate.titleId,
    workId: candidate.workId || candidate.titleId || null,
    engagementId: candidate.engagementId || null,
    lifecycleId: candidate.lifecycleId || null,
    stageId: candidate.stageId || null,
    evidence
  };
}

function correlateMessage(messageEvidence, senderResolution = {}, context = {}) {
  const outboundEvents = Array.isArray(context.outboundEvents) ? context.outboundEvents : [];
  const inReplyTo = normalizeMessageId(messageEvidence.inReplyTo);
  const headerIds = replyMessageIds(messageEvidence);
  const directMatches = outboundEvents.filter((event) => inReplyTo && normalizeMessageId(event.internetMessageId) === inReplyTo);
  const referenceMatches = directMatches.length ? [] : outboundEvents.filter((event) =>
    headerIds.includes(normalizeMessageId(event.internetMessageId)));
  const matches = directMatches.length ? directMatches : referenceMatches;
  const identities = new Set(matches.map((event) => [event.authorId, event.titleId, event.engagementId, event.stageId].map(normalizeLower).join("|")));
  const unique = [...new Map(matches.map((event) => [normalizeMessageId(event.internetMessageId), event])).values()];
  if (unique.length > 1 || identities.size > 1 ||
      (unique.length === 1 && normalizeLower(unique[0].authorId) !== normalizeLower(senderResolution.authorId))) {
    return { status: "AMBIGUOUS", reviewRequired: true,
      error: "OUTBOUND_DELIVERY_AUTHOR_OR_THREAD_CONFLICT", evidence: "OUTBOUND_MESSAGE_HEADER_CONFLICT" };
  }
  const outbound = unique[0];
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
      evidence: "OUTBOUND_MESSAGE_HEADER",
      deliveryId: outbound.deliveryId || null,
      outboundInternetMessageId: outbound.internetMessageId
    };
  }

  const active = Array.isArray(context.activeEngagements)
    ? context.activeEngagements.filter((e) => {
        if (senderResolution.authorId && e.authorId === senderResolution.authorId) return true;
        return normalizeLower(e.authorEmail) && normalizeLower(e.authorEmail) === normalizeLower(messageEvidence.fromAddress);
      })
    : [];

  if (active.length === 1) {
    return deterministic(active[0], "SINGLE_CURRENT_ACTIVE_PRODUCTION_MOVEMENT");
  }

  const authoritative = Array.isArray(context.authoritativeWorkCandidates)
    ? context.authoritativeWorkCandidates.filter((candidate) => {
        if (senderResolution.authorId && candidate.authorId === senderResolution.authorId) return true;
        return normalizeLower(candidate.authorEmail) === normalizeLower(messageEvidence.fromAddress);
      })
    : active;
  const explicit = explicitTitleMatches(messageEvidence, authoritative);

  if (explicit.length === 1) {
    return deterministic(
      explicit[0],
      explicit[0].postRelease ? "EXPLICIT_POST_RELEASE_TITLE_REFERENCE" : "EXPLICIT_SOURCE_TITLE_REFERENCE"
    );
  }

  if (active.length > 1) {
    return {
      status: "AMBIGUOUS",
      reviewRequired: true,
      authorId: senderResolution.authorId || active[0].authorId || null,
      error: "CORRELATION_REVIEW_REQUIRED_MULTIPLE_ACTIVE_ENGAGEMENTS",
      evidence: "MULTIPLE_AUTHORITATIVE_AUTHOR_WORK_RELATIONSHIPS",
      candidates: active.map((e) => ({ authorId: e.authorId, titleId: e.titleId, engagementId: e.engagementId }))
    };
  }

  if (authoritative.length > 0) {
    return {
      status: "UNRESOLVED",
      reviewRequired: true,
      authorId: senderResolution.authorId || authoritative[0].authorId || null,
      error: "CORRELATION_REVIEW_REQUIRED_NO_CURRENT_MOVEMENT",
      evidence: "HISTORICAL_AUTHORSHIP_ONLY_EXCLUDED",
      candidates: [],
      excludedCandidates: authoritative.map((candidate) => ({
        authorId: candidate.authorId,
        titleId: candidate.titleId,
        engagementId: candidate.engagementId,
        movementState: candidate.movementState || "UNKNOWN"
      }))
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
  correlateMessage,
  explicitTitleMatches
};
