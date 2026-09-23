"use strict";

const { MESSAGE_CLASS } = require("./constants");
const { normalizeString, redactBodyForEvidence, sha256Hex, stableId } = require("./util");
const { createDataverseClient } = require("../../orchestration/authorReviewResponseConsumer");
const { createDefaultInboundContextProvider } = require("./contextProvider");

const ROUTABLE_CLASSES = new Set([
  MESSAGE_CLASS.AUTHOR_RESPONSE,
  MESSAGE_CLASS.AUTHOR_APPROVAL,
  MESSAGE_CLASS.AUTHOR_REQUEST_CHANGES,
  MESSAGE_CLASS.AUTHOR_CLARIFICATION,
  MESSAGE_CLASS.AUTHOR_QUESTION,
  MESSAGE_CLASS.AUTHOR_HOLD_REQUEST,
  MESSAGE_CLASS.AUTHOR_DECLINE,
  MESSAGE_CLASS.PAYMENT_CORRESPONDENCE
]);
const EVENT_ACTION_TYPE = "PUBLISHING_INBOUND_AUTHOR_BUSINESS_EVENT";

function routeKind(classification) {
  return classification === MESSAGE_CLASS.PAYMENT_CORRESPONDENCE ? "COMMERCIAL_HUMAN_REVIEW" : "EDITORIAL_HUMAN_REVIEW";
}

function humanDecision(kind) {
  if (kind === "COMMERCIAL_HUMAN_REVIEW") {
    return {
      why: "An author has raised a payment or installment request; no additional charge is authorized by this message.",
      decisionRequested: "Review the executed commercial terms and decide whether to approve, decline, or clarify the requested arrangement.",
      allowedOutcomes: ["APPROVE_GOVERNED_ARRANGEMENT", "DECLINE", "REQUEST_CLARIFICATION", "DEFER"],
      outcomeRoutes: {
        APPROVE_GOVERNED_ARRANGEMENT: "Send the authorized terms to the separately governed payment capability; no charge occurs in this route.",
        DECLINE: "Prepare a governed author response without creating a payment instrument.",
        REQUEST_CLARIFICATION: "Request the missing commercial information through the governed communication path.",
        DEFER: "Keep the commercial gate open without financial effect."
      },
      financialEffectsAuthorized: false
    };
  }
  return {
    why: "An author has responded to an editorial review; the exact artifact/version and requested corrections require publisher review.",
    decisionRequested: "Compare this reply with the current delivered editorial artifact and decide how to handle the author's response.",
    allowedOutcomes: ["ACCEPT_REVIEW", "ACCEPT_WITH_CORRECTIONS", "REQUEST_CHANGES", "REQUEST_CLARIFICATION", "DEFER"],
    outcomeRoutes: {
      ACCEPT_REVIEW: "Invoke the governed editorial decision contract only after exact-version verification.",
      ACCEPT_WITH_CORRECTIONS: "Route corrections to editorial review before any version or stage transition.",
      REQUEST_CHANGES: "Keep the current editorial gate open and prepare a governed revision request.",
      REQUEST_CLARIFICATION: "Prepare a governed author clarification request.",
      DEFER: "Keep the editorial gate open without stage movement."
    },
    authorDecisionAuthorized: false
  };
}

function exactCurrentMovement(queueItem, context) {
  const matches = (context.activeEngagements || []).filter((candidate) =>
    normalizeString(candidate.authorId).toLowerCase() === normalizeString(queueItem.authorId).toLowerCase() &&
    normalizeString(candidate.titleId).toLowerCase() === normalizeString(queueItem.titleId).toLowerCase() &&
    normalizeString(candidate.engagementId).toLowerCase() === normalizeString(queueItem.engagementId).toLowerCase() &&
    normalizeString(candidate.stageId).toLowerCase() === normalizeString(queueItem.stageId).toLowerCase()
  );
  return matches.length === 1 ? matches[0] : null;
}

async function resolveEditorialGate(client, queueItem) {
  const titleId = normalizeString(queueItem.titleId);
  const stageId = normalizeString(queueItem.stageId);
  if (!/^[0-9a-f-]{36}$/i.test(titleId) || !/^[0-9a-f-]{36}$/i.test(stageId)) {
    return { status: "UNPROVEN", gateId: null, artifactId: null };
  }
  const rows = await client.list("jm1pub_editorialapprovalgates", {
    $select: "jm1pub_editorialapprovalgateid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,jm1pub_authordecisionon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId} and jm1pub_authordecisionon eq null`,
    $top: "3"
  });
  if (rows.length !== 1) return { status: rows.length === 0 ? "MISSING" : "AMBIGUOUS", gateId: null, artifactId: null };
  return {
    status: "EXACT",
    gateId: rows[0].jm1pub_editorialapprovalgateid,
    artifactId: rows[0]._jm1pub_deliverableartifactid_value || null
  };
}

function buildRoute(queueItem, message, movement, graphMessage, editorialGate, now = new Date().toISOString()) {
  const kind = routeKind(queueItem.classification);
  const sourceText = normalizeString(graphMessage.body?.content || graphMessage.bodyPreview);
  return {
    routeId: stableId("inbound_business_route", [queueItem.evidenceLink]),
    inboundMessageEventId: queueItem.evidenceLink,
    messageIdempotencyKey: message.idempotencyKey,
    internetMessageId: message.internetMessageId,
    messageBodyHash: message.bodyHash,
    receivedAt: message.receivedAt,
    routedAt: now,
    authorId: queueItem.authorId,
    authorName: (movement.authorName || "").slice(0, 160),
    titleId: queueItem.titleId,
    title: movement.title || null,
    engagementId: queueItem.engagementId,
    stageId: queueItem.stageId,
    stageName: movement.stageName || null,
    editorialGate,
    classification: queueItem.classification,
    kind,
    subject: message.subject,
    authorRequestExcerpt: sourceText.slice(0, 1200),
    attachmentCount: queueItem.attachmentCount || 0,
    decisionGate: humanDecision(kind),
    status: "PENDING_DATAVERSE_EVENT",
    dataverseExecutionLogId: null,
    effects: { authorDecisions: 0, titleTransitions: 0, authorMessages: 0, financialMutations: 0 }
  };
}

async function findBusinessEventLog(client, eventId) {
  return client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_sourcerecordid",
    $filter: `jm1_actiontype eq '${EVENT_ACTION_TYPE}' and jm1_sourcerecordid eq '${eventId.replace(/'/g, "''")}'`
  });
}

async function persistBusinessEvent(client, route) {
  const existing = await findBusinessEventLog(client, route.inboundMessageEventId);
  if (existing) return existing.jm1_executionlogid;
  const now = new Date().toISOString();
  const description = [
    `Inbound event ${route.inboundMessageEventId}`,
    `author=${route.authorId}`,
    `title=${route.titleId}`,
    `engagement=${route.engagementId}`,
    `stage=${route.stageId}`,
    `class=${route.classification}`,
    `route=${route.kind}`,
    "humanDisposition=PENDING",
    "businessEffects=0"
  ].join("; ");
  return client.create("jm1_executionlogs", {
    jm1_name: `${EVENT_ACTION_TYPE} - ${route.inboundMessageEventId}`.slice(0, 200),
    jm1_actiontype: EVENT_ACTION_TYPE,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_agentname: "JM1 Publishing Inbound Business Router",
    jm1_agentmodel: "deterministic-inbound-router-v1",
    jm1_bandlevel: 835500000,
    jm1_executionstatus: 835500001,
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: "publishing_inbound_message",
    jm1_sourcerecordid: route.inboundMessageEventId
  });
}

async function projectHumanGate(store, queueItem, route) {
  if (queueItem.businessEventId === route.routeId && queueItem.routingStatus === "HUMAN_REVIEW_READY") return;
  await store.updateQueueItem({
    ...queueItem,
    businessEventId: route.routeId,
    businessEventLogId: route.dataverseExecutionLogId,
    routingStatus: route.status,
    decisionGate: route.decisionGate,
    authorName: route.authorName,
    title: route.title,
    authorRequestExcerpt: route.authorRequestExcerpt,
    editorialGate: route.editorialGate,
    currentStage: route.stageName,
    nextAction: route.decisionGate.decisionRequested,
    waitingOn: "JMP"
  });
}

async function routeQueueItem(queueItem, deps) {
  if (!ROUTABLE_CLASSES.has(queueItem.classification) || !queueItem.authorId) return { outcome: "NOT_APPLICABLE" };
  const { store, graphClient, contextProvider, client } = deps;
  const eventId = queueItem.evidenceLink;
  const existing = await store.getBusinessRoute(eventId);
  if (existing?.status === "HUMAN_REVIEW_READY") {
    await projectHumanGate(store, queueItem, existing);
    return { outcome: "IDEMPOTENT", route: existing };
  }
  if (queueItem.correlationEvidence === "HISTORICAL_AUTHORSHIP_ONLY_EXCLUDED" ||
      !queueItem.messageIdempotencyKey || !queueItem.graphMessageId ||
      !queueItem.titleId || !queueItem.engagementId || !queueItem.stageId) {
    return { outcome: "HELD_IDENTITY_OR_EVENT_LINK", eventId };
  }
  const message = await store.getMessageByIdempotencyKey(queueItem.messageIdempotencyKey);
  if (!message || message.inboundMessageEventId !== eventId || message.correlationStatus !== "DETERMINISTIC") {
    return { outcome: "HELD_EVENT_MISMATCH", eventId };
  }
  const context = await contextProvider(message);
  const movement = exactCurrentMovement(queueItem, context);
  if (!movement) return { outcome: "HELD_STALE_OR_AMBIGUOUS_MOVEMENT", eventId };
  const graphMessage = await graphClient.getMessage(queueItem.graphMessageId);
  if (normalizeString(graphMessage.internetMessageId) !== normalizeString(message.internetMessageId) ||
      normalizeString(graphMessage.from?.emailAddress?.address).toLowerCase() !== normalizeString(message.fromAddress).toLowerCase() ||
      sha256Hex(redactBodyForEvidence(graphMessage.body || graphMessage.bodyPreview || "")) !== message.bodyHash) {
    return { outcome: "HELD_SOURCE_MESSAGE_MISMATCH", eventId };
  }
  const editorialGate = routeKind(queueItem.classification) === "EDITORIAL_HUMAN_REVIEW"
    ? await resolveEditorialGate(client, queueItem)
    : null;
  const proposed = existing || buildRoute(queueItem, message, movement, graphMessage, editorialGate);
  if (!existing) await store.upsertBusinessRoute(proposed);
  return store.withBusinessRouteLease(eventId, async () => {
    const record = await store.getBusinessRoute(eventId);
    if (record.status === "HUMAN_REVIEW_READY") {
      await projectHumanGate(store, queueItem, record);
      return { outcome: "IDEMPOTENT", route: record };
    }
    const logId = await persistBusinessEvent(client, record);
    const completed = { ...record, status: "HUMAN_REVIEW_READY", dataverseExecutionLogId: logId };
    await store.updateBusinessRoute(completed);
    await projectHumanGate(store, queueItem, completed);
    return { outcome: "HUMAN_REVIEW_READY", route: completed };
  });
}

async function runInboundBusinessRouter(input = {}, deps = {}) {
  const store = deps.store || new (require("./blobEvidenceStore").BlobInboundEvidenceStore)();
  const graphClient = deps.graphClient || new (require("./graphClient").PublishingMailboxGraphClient)();
  const contextProvider = deps.contextProvider || createDefaultInboundContextProvider();
  const client = deps.client || createDataverseClient({
    apiBase: normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, ""),
    resourceUrl: normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "")
  });
  const targetEventId = normalizeString(input.targetEventId);
  const rows = targetEventId
    ? [await store.getQueueItem(`queue_${targetEventId}`)].filter(Boolean)
    : await store.listQueueItems(Number.MAX_SAFE_INTEGER);
  const fromIso = normalizeString(process.env.JM1_PUBLISHING_INBOUND_BUSINESS_ROUTER_FROM_ISO) || "2026-09-22T00:00:00Z";
  const selected = rows.filter((row) =>
    ROUTABLE_CLASSES.has(row.classification) &&
    row.authorId &&
    (targetEventId || normalizeString(row.receivedAt) >= fromIso) &&
    (targetEventId || !["HUMAN_REVIEW_READY", "HELD_IDENTITY_OR_EVENT_LINK"].includes(row.routingStatus))
  ).sort((a, b) => normalizeString(a.receivedAt).localeCompare(normalizeString(b.receivedAt)))
    .slice(0, targetEventId ? 1 : Math.min(Math.max(Number(input.limit || 100), 1), 500));
  const results = [];
  for (const row of selected) {
    try {
      const result = await routeQueueItem(row, { store, graphClient, contextProvider, client });
      if (result.outcome.startsWith("HELD_")) {
        await store.updateQueueItem({ ...row, routingStatus: result.outcome, reasonUnresolved: result.outcome });
      }
      results.push({ eventId: row.evidenceLink, ...result });
    } catch (err) {
      const reason = err.safeCode || "INBOUND_ROUTE_FAILED";
      try {
        await store.updateQueueItem({ ...row, routingStatus: "ROUTE_FAILED_RETRYABLE", reasonUnresolved: reason });
      } catch {
        // The timer result remains observable and the next tick retries the source event.
      }
      results.push({ eventId: row.evidenceLink, outcome: "ROUTE_FAILED_RETRYABLE", reason });
    }
  }
  return {
    selected: selected.length,
    businessEventsReady: results.filter((result) => result.outcome === "HUMAN_REVIEW_READY").length,
    idempotent: results.filter((result) => result.outcome === "IDEMPOTENT").length,
    exceptions: results.filter((result) => result.outcome.startsWith("HELD_") || ["ROUTE_FAILED_RETRYABLE", "ROUTE_IN_PROGRESS"].includes(result.outcome)).length,
    results
  };
}

module.exports = { buildRoute, exactCurrentMovement, resolveEditorialGate, routeQueueItem, runInboundBusinessRouter, EVENT_ACTION_TYPE };
