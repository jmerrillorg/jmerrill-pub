"use strict";

const { MESSAGE_CLASS } = require("./constants");
const { normalizeString, redactBodyForEvidence, sha256Hex, stableId } = require("./util");
const { authorReplyText } = require("./replyText");
const { serviceIntent } = require("./serviceIntent");
const { createDataverseClient } = require("../../orchestration/authorReviewResponseConsumer");
const { createDefaultInboundContextProvider } = require("./contextProvider");

const ROUTABLE_CLASSES = new Set([
  MESSAGE_CLASS.AUTHOR_RESPONSE,
  MESSAGE_CLASS.AUTHOR_ACCESS_REQUEST,
  MESSAGE_CLASS.AUTHOR_APPROVAL,
  MESSAGE_CLASS.AUTHOR_REQUEST_CHANGES,
  MESSAGE_CLASS.AUTHOR_CLARIFICATION,
  MESSAGE_CLASS.AUTHOR_QUESTION,
  MESSAGE_CLASS.AUTHOR_HOLD_REQUEST,
  MESSAGE_CLASS.AUTHOR_DECLINE,
  MESSAGE_CLASS.PAYMENT_CORRESPONDENCE
]);
const EVENT_ACTION_TYPE = "PUBLISHING_INBOUND_AUTHOR_BUSINESS_EVENT";

function routeKind(classification, graphMessage) {
  if (classification === MESSAGE_CLASS.AUTHOR_ACCESS_REQUEST) return "ROUTINE_AUTHOR_ACCESS_SERVICE";
  if (classification !== MESSAGE_CLASS.PAYMENT_CORRESPONDENCE) return "EDITORIAL_HUMAN_REVIEW";
  return serviceIntent(graphMessage, classification).intent === "PAYMENT_LINK_ACCESS"
    ? "ROUTINE_COMMERCIAL_SERVICE" : "COMMERCIAL_HUMAN_REVIEW";
}

function finalRouteStatus(kind, editorialGate, commercialAuthority) {
  if (kind === "ROUTINE_AUTHOR_ACCESS_SERVICE") return "ROUTINE_SERVICE_READY";
  if (kind === "EDITORIAL_HUMAN_REVIEW" && editorialGate?.status !== "EXACT") return "HELD_EDITORIAL_GATE_BINDING";
  if (kind.startsWith("COMMERCIAL_") || kind === "ROUTINE_COMMERCIAL_SERVICE") {
    if (commercialAuthority?.status !== "EXACT") return "HELD_COMMERCIAL_AUTHORITY";
    if (kind === "ROUTINE_COMMERCIAL_SERVICE") return "ROUTINE_SERVICE_READY";
  }
  return "HUMAN_REVIEW_READY";
}

function humanDecision(kind, sourceText) {
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
  if (/\bapprov(?:e|ed|al)\b[\s\S]{0,80}\bcorrections?\b/i.test(sourceText)) {
    return {
      why: "The author approves developmental work only with corrections and asks to review the revised manuscript again.",
      decisionRequested: "Confirm the requested correction scope or request clarification; do not treat this as final manuscript approval.",
      allowedOutcomes: ["ROUTE_CORRECTIONS_TO_EDITORIAL", "REQUEST_CLARIFICATION", "DEFER"],
      outcomeRoutes: {
        ROUTE_CORRECTIONS_TO_EDITORIAL: "Open governed editorial revision work against the exact delivered artifact; retain the author final-review gate.",
        REQUEST_CLARIFICATION: "Prepare a governed clarification for human approval before any author communication.",
        DEFER: "Keep the review open without production stage movement."
      },
      authorDecisionAuthorized: false
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

function sentChecksums(row) {
  const description = normalizeString(row.jm1_actiondescription);
  if (row.jm1_actiontype === "AUTHOR_COMMUNICATION_INTENT_SENT" &&
      !/DELIVERY_STATE=SENT;/.test(description)) return [];
  if (row.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT" &&
      !/DELIVERY_STATUS=SENT;/.test(description)) return [];
  const manifestText = description.match(/artifactManifest=(\[[\s\S]*?\]);/i)?.[1];
  if (manifestText) {
    try {
      const manifest = JSON.parse(manifestText);
      if (Array.isArray(manifest)) return manifest.map((item) => normalizeString(item.checksum).toLowerCase()).filter((value) => /^[0-9a-f]{64}$/.test(value));
    } catch {
      return [];
    }
  }
  return [...description.matchAll(/(?:^|;)\s*checksum=([0-9a-f]{64})(?:;|$)/gi)].map((match) => match[1].toLowerCase());
}

async function resolveEditorialGate(client, queueItem, message, graphMessage) {
  const titleId = normalizeString(queueItem.titleId);
  const stageId = normalizeString(queueItem.stageId);
  if (!/^[0-9a-f-]{36}$/i.test(titleId) || !/^[0-9a-f-]{36}$/i.test(stageId)) {
    return { status: "UNPROVEN", gateId: null, artifactId: null };
  }
  const reply = authorReplyText(graphMessage);
  if (/\btitle of the book is\b/i.test(reply) && /\b(update|change)\b/i.test(reply)) {
    return { status: "TITLE_CHANGE_REQUEST", gateId: null, artifactId: null };
  }
  const replyQualification = /\bapproved? with questions\b/i.test(reply) && !/\?/.test(reply)
    ? "QUESTIONS_NOT_SUPPLIED" : null;
  const rows = await client.list("jm1pub_editorialapprovalgates", {
    $select: "jm1pub_editorialapprovalgateid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,jm1pub_authordecisionon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId} and jm1pub_authordecisionon eq null`,
    $top: "3"
  });
  if (rows.length === 0) return { status: "MISSING", gateId: null, artifactId: null };
  const artifactIds = rows.map((row) => normalizeString(row._jm1pub_deliverableartifactid_value)).filter(Boolean);
  if (artifactIds.length === 0) return { status: "UNBOUND_ARTIFACT", gateId: null, artifactId: null };
  const artifacts = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_sha256,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter: artifactIds.map((id) => `jm1pub_editorialartifactid eq ${id}`).join(" or "),
    $top: String(Math.min(artifactIds.length, 10))
  });
  const sentRows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `jm1_sourcerecordid eq '${titleId.replace(/'/g, "''")}' and (jm1_actiontype eq 'AUTHOR_COMMUNICATION_INTENT_SENT' or jm1_actiontype eq 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT')`,
    $orderby: "createdon desc",
    $top: "100"
  });
  const receivedAt = Date.parse(message?.receivedAt || queueItem.receivedAt || "");
  const delivered = sentRows.filter((row) => Number.isFinite(receivedAt) && Date.parse(row.createdon) <= receivedAt)
    .map((row) => ({ row, checksums: sentChecksums(row) }));
  const matches = rows.flatMap((gate) => {
    const artifact = artifacts.find((item) => item.jm1pub_editorialartifactid === gate._jm1pub_deliverableartifactid_value &&
      item._jm1pub_titleid_value === titleId && item._jm1pub_editorialstageid_value === stageId);
    const checksum = normalizeString(artifact?.jm1pub_sha256).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(checksum)) return [];
    return delivered.filter((item) => item.checksums.includes(checksum)).map((item) => ({ gate, artifact, delivery: item.row }));
  });
  const uniqueGates = [...new Set(matches.map((item) => item.gate.jm1pub_editorialapprovalgateid))];
  if (uniqueGates.length !== 1) return {
    status: uniqueGates.length ? "AMBIGUOUS_DELIVERY" : "DELIVERY_MISMATCH",
    gateId: null, artifactId: null, replyQualification
  };
  const matched = matches.find((item) => item.gate.jm1pub_editorialapprovalgateid === uniqueGates[0]);
  return {
    // A matching delivered artifact identifies a candidate, not the message this author replied to.
    status: replyQualification || "PROBABLE_DELIVERY_MATCH",
    gateId: matched.gate.jm1pub_editorialapprovalgateid,
    artifactId: matched.artifact.jm1pub_editorialartifactid,
    artifactChecksum: normalizeString(matched.artifact.jm1pub_sha256).toLowerCase(),
    deliveryEventId: matched.delivery.jm1_executionlogid,
    deliveryAt: matched.delivery.createdon,
    replyQualification
  };
}

async function resolveCommercialAuthority(client, queueItem) {
  const title = await client.first("jm1pub_titles", {
    $select: "jm1pub_titleid,_jm1pub_contract_value",
    $filter: `jm1pub_titleid eq ${queueItem.titleId}`
  });
  if (!title?._jm1pub_contract_value) return { status: "CONTRACT_NOT_BOUND" };
  const contract = await client.first("jm1pub_contracts", {
    $select: "jm1pub_contractid,jm1pub_providerstatus,_jm1pub_opportunity_value,_new_author_value",
    $filter: `jm1pub_contractid eq ${title._jm1pub_contract_value}`
  });
  if (!contract || contract._new_author_value !== queueItem.authorId || contract.jm1pub_providerstatus !== "ADOBE_SIGNED_COMPLETED") {
    return { status: "CONTRACT_AUTHORITY_MISMATCH" };
  }
  const ledger = await client.first("jmpv2_agreementrecords", {
    $select: "jmpv2_agreementrecordid,jmpv2_authoridentity,jmpv2_titleid,jmpv2_agreementkey",
    $filter: `jmpv2_agreementrecordid eq ${contract._jm1pub_opportunity_value}`
  });
  if (!ledger || ledger.jmpv2_authoridentity !== queueItem.authorId || ledger.jmpv2_agreementkey !== contract._jm1pub_opportunity_value) {
    return { status: "LEDGER_AUTHORITY_MISMATCH" };
  }
  if (ledger.jmpv2_titleid !== queueItem.titleId) {
    return { status: "LEDGER_TITLE_MISMATCH", ledgerTitleId: ledger.jmpv2_titleid, currentTitleId: queueItem.titleId };
  }
  return { status: "EXACT", contractId: contract.jm1pub_contractid, agreementId: ledger.jmpv2_agreementrecordid };
}

function buildRoute(queueItem, message, movement, graphMessage, editorialGate, commercialAuthority, now = new Date().toISOString()) {
  const kind = routeKind(queueItem.classification, graphMessage);
  const sourceText = authorReplyText(graphMessage);
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
    commercialAuthority,
    classification: queueItem.classification,
    kind,
    subject: message.subject,
    authorRequestExcerpt: sourceText.slice(0, 1200),
    attachmentCount: queueItem.attachmentCount || 0,
    decisionGate: finalRouteStatus(kind, editorialGate, commercialAuthority) === "HUMAN_REVIEW_READY" ? humanDecision(kind, sourceText) : null,
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
    `gateBinding=${route.editorialGate?.status || "NOT_APPLICABLE"}`,
    `commercialBinding=${route.commercialAuthority?.status || "NOT_APPLICABLE"}`,
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

async function projectRoute(store, queueItem, route) {
  if (queueItem.businessEventId === route.routeId && queueItem.routingStatus === route.status &&
      queueItem.editorialGate?.status === route.editorialGate?.status &&
      queueItem.editorialGate?.gateId === route.editorialGate?.gateId &&
      queueItem.editorialGate?.artifactChecksum === route.editorialGate?.artifactChecksum &&
      queueItem.editorialGate?.deliveryEventId === route.editorialGate?.deliveryEventId &&
      queueItem.commercialAuthority?.status === route.commercialAuthority?.status &&
      queueItem.commercialAuthority?.currentTitleId === route.commercialAuthority?.currentTitleId &&
      queueItem.commercialAuthority?.ledgerTitleId === route.commercialAuthority?.ledgerTitleId &&
      Boolean(queueItem.decisionGate) === Boolean(route.decisionGate)) return;
  const ready = route.status === "HUMAN_REVIEW_READY";
  const routine = route.status === "ROUTINE_SERVICE_READY";
  const heldAction = route.status === "HELD_EDITORIAL_GATE_BINDING"
    ? "Resolve the exact delivered editorial artifact and approval gate before requesting a founder decision."
    : route.status === "HELD_COMMERCIAL_AUTHORITY"
      ? "Reconcile executed commercial terms and title-bound payment ledger before preparing payment advice or requesting a founder decision."
      : "Reconcile current title/stage and source-message authority before any human decision.";
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
    commercialAuthority: route.commercialAuthority,
    currentStage: route.stageName,
    nextAction: ready ? route.decisionGate.decisionRequested
      : routine ? (queueItem.serviceStatus === "SENT"
        ? queueItem.serviceWaitingOn === "JMP_IDENTITY_VERIFICATION"
          ? "Verify the requested author correspondence address before changing account identity."
          : "Await author response to the governed service communication."
        : "Complete governed routine author service.")
        : heldAction,
    waitingOn: ready ? "JMP" : routine && queueItem.serviceStatus === "SENT" ? queueItem.serviceWaitingOn || "AUTHOR" : "JMP_SYSTEM",
    reasonUnresolved: ready || routine ? null : route.status
  });
}

async function invalidateExistingRoute(store, queueItem, route, reason) {
  if (!route) return;
  await store.withBusinessRouteLease(queueItem.evidenceLink, async () => {
    const current = await store.getBusinessRoute(queueItem.evidenceLink);
    const invalidated = { ...current, status: reason, decisionGate: null };
    await store.updateBusinessRoute(invalidated);
    await projectRoute(store, queueItem, invalidated);
  });
}

async function routeQueueItem(queueItem, deps) {
  if (!ROUTABLE_CLASSES.has(queueItem.classification) || !queueItem.authorId) return { outcome: "NOT_APPLICABLE" };
  const { store, graphClient, contextProvider, client } = deps;
  const eventId = queueItem.evidenceLink;
  const existing = await store.getBusinessRoute(eventId);
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
  if (!movement) {
    await invalidateExistingRoute(store, queueItem, existing, "HELD_STALE_OR_AMBIGUOUS_MOVEMENT");
    return { outcome: "HELD_STALE_OR_AMBIGUOUS_MOVEMENT", eventId };
  }
  const graphMessage = await graphClient.getMessage(queueItem.graphMessageId);
  if (normalizeString(graphMessage.internetMessageId) !== normalizeString(message.internetMessageId) ||
      normalizeString(graphMessage.from?.emailAddress?.address).toLowerCase() !== normalizeString(message.fromAddress).toLowerCase() ||
      sha256Hex(redactBodyForEvidence(graphMessage.body || graphMessage.bodyPreview || "")) !== message.bodyHash) {
    await invalidateExistingRoute(store, queueItem, existing, "HELD_SOURCE_MESSAGE_MISMATCH");
    return { outcome: "HELD_SOURCE_MESSAGE_MISMATCH", eventId };
  }
  const kind = routeKind(queueItem.classification, graphMessage);
  const editorialGate = kind === "EDITORIAL_HUMAN_REVIEW"
    ? await (deps.resolveEditorialGate || resolveEditorialGate)(client, queueItem, message, graphMessage)
    : null;
  const commercialAuthority = kind !== "EDITORIAL_HUMAN_REVIEW" && kind !== "ROUTINE_AUTHOR_ACCESS_SERVICE"
    ? await (deps.resolveCommercialAuthority || resolveCommercialAuthority)(client, queueItem)
    : null;
  const proposed = existing || buildRoute(queueItem, message, movement, graphMessage, editorialGate, commercialAuthority);
  if (!existing) await store.upsertBusinessRoute(proposed);
  return store.withBusinessRouteLease(eventId, async () => {
    const record = await store.getBusinessRoute(eventId);
    const status = finalRouteStatus(kind, editorialGate, commercialAuthority);
    if (record.kind === kind && record.status === status && record.editorialGate?.status === editorialGate?.status &&
        record.editorialGate?.gateId === editorialGate?.gateId &&
        record.editorialGate?.artifactChecksum === editorialGate?.artifactChecksum &&
        record.editorialGate?.deliveryEventId === editorialGate?.deliveryEventId &&
        record.commercialAuthority?.status === commercialAuthority?.status &&
        record.dataverseExecutionLogId) {
      await projectRoute(store, queueItem, record);
      return { outcome: status === "HUMAN_REVIEW_READY" ? "IDEMPOTENT" : status, route: record };
    }
    const logId = record.dataverseExecutionLogId || await persistBusinessEvent(client, record);
    const completed = {
      ...record,
      kind,
      editorialGate,
      commercialAuthority,
      status,
      decisionGate: status === "HUMAN_REVIEW_READY" ? humanDecision(record.kind, record.authorRequestExcerpt) : null,
      dataverseExecutionLogId: logId
    };
    await store.updateBusinessRoute(completed);
    await projectRoute(store, queueItem, completed);
    return { outcome: status, route: completed };
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
    (targetEventId || row.routingStatus !== "HELD_IDENTITY_OR_EVENT_LINK")
  ).sort((a, b) => normalizeString(a.receivedAt).localeCompare(normalizeString(b.receivedAt)))
    .slice(0, targetEventId ? 1 : Math.min(Math.max(Number(input.limit || 100), 1), 500));
  const results = [];
  for (const row of selected) {
    try {
      const result = await routeQueueItem(row, { store, graphClient, contextProvider, client,
        resolveEditorialGate: deps.resolveEditorialGate, resolveCommercialAuthority: deps.resolveCommercialAuthority });
      if (result.outcome.startsWith("HELD_")) {
        const current = await store.getQueueItem(row.queueItemId) || row;
        await store.updateQueueItem({
          ...current,
          routingStatus: result.outcome,
          reasonUnresolved: result.outcome,
          decisionGate: null,
          waitingOn: "JMP_SYSTEM"
        });
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

module.exports = { authorReplyText, buildRoute, exactCurrentMovement, resolveCommercialAuthority, resolveEditorialGate,
  routeQueueItem, runInboundBusinessRouter, sentChecksums, EVENT_ACTION_TYPE };
