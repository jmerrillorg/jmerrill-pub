"use strict";

const { createHash } = require("node:crypto");
const { createDataverseClient } = require("../../orchestration/authorReviewResponseConsumer");
const { sendConfiguredAuthorResponse } = require("../../author/authorResponseSendProviderConfig");
const { markCommunicationSent, reserveCommunicationIntent } = require("../../editorial/communicationIntentStore");
const { writeLog } = require("../../editorial/editorialExecutionRuntime");
const { authorReplyText, exactCurrentMovement } = require("./businessRouter");
const { BlobInboundEvidenceStore } = require("./blobEvidenceStore");
const { createDefaultInboundContextProvider } = require("./contextProvider");
const { PublishingMailboxGraphClient } = require("./graphClient");
const { serviceCopy, serviceIntent } = require("./serviceIntent");
const { validatePaymentLink } = require("./paymentLinkAuthority");
const { normalizeString, redactBodyForEvidence, sha256Hex } = require("./util");

const INTERNAL_MAILBOX = "publishing@jmerrill.one";
const SYSTEM_SENDER = "publishing@email.jmerrill.one";
const ROUTINE_INTENTS = new Set([
  "AUTHOR_QUESTIONS_MISSING", "PAYMENT_LINK_ACCESS",
  "TITLE_CHANGE_ACKNOWLEDGMENT", "EDITORIAL_CORRECTIONS_ACKNOWLEDGMENT"
]);

function safeError(code) {
  return { outcome: "HELD_SERVICE_AUTHORITY", reason: code };
}

function serviceWaitOwner(intent) {
  if (intent === "AUTHOR_QUESTIONS_MISSING") return "AUTHOR_QUESTIONS";
  if (intent === "PAYMENT_LINK_ACCESS") return "AUTHOR";
  return "JMP";
}

function emailAddress(recipient) {
  return normalizeString(recipient?.emailAddress?.address).toLowerCase();
}

function normalizedMailText(value) {
  return normalizeString(value).replace(/\r\n/g, "\n").trim();
}

async function verifyMailboxCopy(graphClient, service) {
  try {
    const after = new Date(new Date(service.sentAt).getTime() - 120000).toISOString();
    const rows = (await graphClient.listInboxMessagesSince(after, 100)).value || [];
    const matched = rows.find((row) =>
      emailAddress(row.from) === SYSTEM_SENDER &&
      (row.toRecipients || []).some((item) => emailAddress(item) === service.recipient) &&
      (row.ccRecipients || []).some((item) => emailAddress(item) === INTERNAL_MAILBOX) &&
      normalizedMailText(row.subject) === service.subject &&
      createHash("sha256").update(normalizedMailText(row.body?.content)).digest("hex") === service.bodyHash
    );
    return matched ? { status: "PASS", graphMessageId: matched.id,
      conversationId: matched.conversationId || null } : { status: "PENDING" };
  } catch {
    return { status: "READBACK_FAILED" };
  }
}

async function completeMailboxReadback(queueItem, deps) {
  const route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
  const service = route?.service;
  if (service?.status === "SENT") {
    const waitingOn = serviceWaitOwner(service.intent);
    if (service.waitingOn !== waitingOn || service.authorWaitingOn !== waitingOn) {
      await deps.store.updateBusinessRoute({ ...route, service: { ...service, waitingOn, authorWaitingOn: waitingOn } });
    }
    const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
    if (currentQueue?.serviceWaitingOn !== waitingOn) {
      await deps.store.updateQueueItem({ ...currentQueue, serviceWaitingOn: waitingOn });
    }
    return { outcome: "IDEMPOTENT", eventId: queueItem.evidenceLink, intent: service.intent,
      providerMessageId: service.providerMessageId, sentAt: service.sentAt };
  }
  if (service?.status !== "SENT_READBACK_PENDING") return { outcome: "HELD_AMBIGUOUS_SEND_STATE", eventId: queueItem.evidenceLink };
  const readback = await (deps.verifyMailboxCopy || verifyMailboxCopy)(deps.graphClient, service);
  if (readback.status !== "PASS") return { outcome: "SENT_READBACK_PENDING", eventId: queueItem.evidenceLink,
    reason: readback.status, providerMessageId: service.providerMessageId };
  await (deps.writeLog || writeLog)(deps.client, {
    name: "AUTHOR_COMMUNICATION_MAILBOX_COPY_VERIFIED",
    actionType: "AUTHOR_COMMUNICATION_MAILBOX_COPY_VERIFIED",
    description: `sourceInboundEvent=${queueItem.evidenceLink}; providerMessageId=${service.providerMessageId}; ` +
      `graphMessageId=${readback.graphMessageId}; conversationId=${readback.conversationId || "NONE"}; ` +
      `communicationRecordId=${service.communicationRecordId}; MAILBOX_COPY=PASS.`,
    sourceEntity: "jm1pub_title", sourceRecordId: queueItem.titleId
  });
  await deps.store.updateBusinessRoute({ ...route, service: { ...service, status: "SENT",
    mailboxCopy: "PASS", graphMessageId: readback.graphMessageId,
    outboundConversationId: readback.conversationId, waitingOn: serviceWaitOwner(service.intent),
    authorWaitingOn: serviceWaitOwner(service.intent) } });
  const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
  await deps.store.updateQueueItem({ ...currentQueue, serviceStatus: "SENT",
    serviceSentAt: service.sentAt, serviceIntent: service.intent, serviceWaitingOn: serviceWaitOwner(service.intent) });
  return { outcome: "SENT", eventId: queueItem.evidenceLink, intent: service.intent,
    providerMessageId: service.providerMessageId, sentAt: service.sentAt };
}

async function prepareService(queueItem, deps) {
  const { store, graphClient, contextProvider, client } = deps;
  if (!queueItem?.evidenceLink || !queueItem.authorId || !queueItem.titleId || !queueItem.engagementId || !queueItem.stageId) {
    return safeError("INBOUND_IDENTITY_INCOMPLETE");
  }
  const [route, message] = await Promise.all([
    store.getBusinessRoute(queueItem.evidenceLink),
    store.getMessageByIdempotencyKey(queueItem.messageIdempotencyKey)
  ]);
  if (!route?.dataverseExecutionLogId || !message || message.inboundMessageEventId !== queueItem.evidenceLink ||
      message.correlationStatus !== "DETERMINISTIC" || route.authorId !== queueItem.authorId ||
      route.titleId !== queueItem.titleId || route.engagementId !== queueItem.engagementId) return safeError("BUSINESS_EVENT_BINDING_UNPROVEN");
  const movement = exactCurrentMovement(queueItem, await contextProvider(message));
  if (!movement) return safeError("CURRENT_MOVEMENT_UNPROVEN");
  const graphMessage = await graphClient.getMessage(queueItem.graphMessageId);
  if (normalizeString(graphMessage.internetMessageId) !== normalizeString(message.internetMessageId) ||
      normalizeString(graphMessage.from?.emailAddress?.address).toLowerCase() !== normalizeString(message.fromAddress).toLowerCase() ||
      sha256Hex(redactBodyForEvidence(graphMessage.body || graphMessage.bodyPreview || "")) !== message.bodyHash) {
    return safeError("SOURCE_MESSAGE_MISMATCH");
  }
  const classified = serviceIntent(graphMessage, queueItem.classification);
  if (!ROUTINE_INTENTS.has(classified.intent)) {
    return { outcome: classified.humanGate ? "HUMAN_JUDGMENT_REQUIRED" : "NO_ROUTINE_SERVICE_RULE", intent: classified.intent };
  }
  const contact = await client.first("contacts", {
    $select: "contactid,fullname,emailaddress1",
    $filter: `contactid eq ${queueItem.authorId}`
  });
  const recipient = normalizeString(contact?.emailaddress1).toLowerCase();
  if (contact?.contactid !== queueItem.authorId || !recipient || recipient !== normalizeString(message.fromAddress).toLowerCase()) {
    return safeError("AUTHOR_RECIPIENT_AUTHORITY_UNPROVEN");
  }
  const linkResult = classified.intent === "PAYMENT_LINK_ACCESS"
    ? await (deps.validatePaymentLink || validatePaymentLink)(client, queueItem, deps) : null;
  if (classified.intent === "PAYMENT_LINK_ACCESS" && linkResult?.status !== "VALID") {
    return { outcome: "HELD_PAYMENT_LINK_AUTHORITY", intent: classified.intent, humanGate: false,
      eventId: queueItem.evidenceLink, linkStatus: linkResult?.status || "UNVERIFIED",
      linkReason: linkResult?.reason || "CURRENT_LINK_UNVERIFIED", transitionHeld: true };
  }
  const copy = serviceCopy(classified.intent, contact.fullname, movement.title, message.subject, linkResult);
  if (!copy || !authorReplyText(graphMessage)) return safeError("SERVICE_COPY_UNAVAILABLE");
  return {
    outcome: "ROUTINE_SERVICE_READY", intent: classified.intent, humanGate: false,
    eventId: queueItem.evidenceLink, route, message, movement, recipient,
    authorName: contact.fullname, copy, linkStatus: linkResult?.status || "NOT_APPLICABLE",
    linkReason: linkResult?.reason || null, linkInvoiceId: linkResult?.invoiceId || null,
    transitionHeld: Boolean(classified.transitionHeld || route.status !== "HUMAN_REVIEW_READY")
  };
}

function publicServiceResult(prepared) {
  return {
    outcome: prepared.outcome,
    intent: prepared.intent || null,
    humanGate: prepared.humanGate || false,
    eventId: prepared.eventId || null,
    linkStatus: prepared.linkStatus || null,
    linkReason: prepared.linkReason || null,
    transitionHeld: prepared.transitionHeld ?? true,
    reason: prepared.reason || null,
    providerMessageId: prepared.providerMessageId || null,
    sentAt: prepared.sentAt || null
  };
}

async function executeService(queueItem, deps) {
  const priorRoute = await deps.store.getBusinessRoute(queueItem.evidenceLink);
  if (["SENT_READBACK_PENDING", "SENT"].includes(priorRoute?.service?.status)) {
    return deps.store.withBusinessRouteLease(queueItem.evidenceLink, () => completeMailboxReadback(queueItem, deps));
  }
  let prepared = await prepareService(queueItem, deps);
  if (prepared.outcome !== "ROUTINE_SERVICE_READY") return publicServiceResult(prepared);
  const { store, client } = deps;
  return store.withBusinessRouteLease(queueItem.evidenceLink, async () => {
    const route = await store.getBusinessRoute(queueItem.evidenceLink);
    if (route.service?.status === "SENT") return { ...publicServiceResult(prepared), outcome: "IDEMPOTENT", providerMessageId: route.service.providerMessageId };
    if (route.service?.status === "SENT_READBACK_PENDING") return completeMailboxReadback(queueItem, deps);
    if (route.service?.status === "SEND_ACCEPTED_AUDIT_PENDING" || route.service?.status === "AMBIGUOUS_SEND_STATE") {
      return { ...publicServiceResult(prepared), outcome: "HELD_AMBIGUOUS_SEND_STATE" };
    }
    prepared = await prepareService(queueItem, deps);
    if (prepared.outcome !== "ROUTINE_SERVICE_READY") return publicServiceResult(prepared);
    const intent = {
      titleId: queueItem.titleId, titleName: prepared.movement.title,
      authorId: queueItem.authorId, communicationType: `INBOUND_SERVICE_${prepared.intent}`,
      workstream: queueItem.evidenceLink, recipient: prepared.recipient, attachments: []
    };
    const reserve = await (deps.reserveCommunicationIntent || reserveCommunicationIntent)(client, intent);
    if (reserve.status === "ALREADY_DELIVERED") return { ...publicServiceResult(prepared), outcome: "IDEMPOTENT" };
    if (reserve.status !== "RESERVED") return { ...publicServiceResult(prepared), outcome: "HELD_AMBIGUOUS_SEND_STATE" };
    await store.updateBusinessRoute({ ...route, service: { intent: prepared.intent, status: "RESERVED", communicationRecordId: reserve.communicationRecordId } });
    const approval = {
      diagnosticId: queueItem.stageId,
      intakeReferenceCode: queueItem.engagementId,
      authorEmail: prepared.recipient,
      authorName: prepared.authorName,
      projectTitle: prepared.movement.title,
      draftSubject: prepared.copy.subject,
      draftBody: prepared.copy.body,
      templateName: `INBOUND_SERVICE_${prepared.intent}_V1`,
      templateVersion: "1.0",
      approvedBy: `publishing-service-rule:${prepared.intent}:v1`,
      approvedOn: new Date().toISOString(),
      sendApproved: true,
      decision: "APPROVE_AUTHOR_SEND",
      internalVisibilityMailbox: INTERNAL_MAILBOX,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true
    };
    const result = await (deps.sendConfiguredAuthorResponse || sendConfiguredAuthorResponse)({
      input: { sendApproval: approval, to: [prepared.recipient], cc: [INTERNAL_MAILBOX], bcc: [], attachments: [] },
      env: deps.env || process.env, providers: deps.providers || {}
    });
    if (!result.ok || result.authorEmailStatus !== "AUTHOR_RESPONSE_SENT" || !result.providerMessageId) {
      await store.updateBusinessRoute({ ...route, service: { intent: prepared.intent, status: "AMBIGUOUS_SEND_STATE",
        communicationRecordId: reserve.communicationRecordId, reason: result.reason || "SEND_READBACK_UNPROVEN" } });
      return { ...publicServiceResult(prepared), outcome: "HELD_AMBIGUOUS_SEND_STATE" };
    }
    const sentAt = new Date().toISOString();
    const copyHash = createHash("sha256").update(`${prepared.copy.subject}\n${prepared.copy.body}`).digest("hex");
    const bodyHash = createHash("sha256").update(normalizedMailText(prepared.copy.body)).digest("hex");
    await store.updateBusinessRoute({ ...route, service: { intent: prepared.intent, status: "SEND_ACCEPTED_AUDIT_PENDING",
      communicationRecordId: reserve.communicationRecordId, providerMessageId: result.providerMessageId, sentAt, copyHash,
      subject: prepared.copy.subject, bodyHash, recipient: prepared.recipient,
      sourceConversationId: prepared.message.conversationId || null } });
    const sent = await (deps.markCommunicationSent || markCommunicationSent)(client, {
      ...intent, semanticIdempotencyKey: reserve.semanticIdempotencyKey,
      communicationRecordId: reserve.communicationRecordId,
      providerMessageId: result.providerMessageId, sentAt, artifactChecksums: [], artifactManifest: [],
      observability: { acsDelivery: "PASS", publishingMailboxCopy: "UNPROVEN", semanticAttachmentParity: "PASS" }
    });
    await store.updateBusinessRoute({ ...route, service: { intent: prepared.intent, status: "SENT_READBACK_PENDING",
      communicationRecordId: reserve.communicationRecordId, sentRecordId: sent.sentRecordId,
      providerMessageId: result.providerMessageId, sentAt, copyHash, bodyHash,
      subject: prepared.copy.subject, recipient: prepared.recipient,
      sourceConversationId: prepared.message.conversationId || null,
      linkStatus: prepared.linkStatus, linkReason: prepared.linkReason,
      waitingOn: serviceWaitOwner(prepared.intent), authorWaitingOn: serviceWaitOwner(prepared.intent) } });
    const currentQueue = await store.getQueueItem(queueItem.queueItemId);
    await store.updateQueueItem({ ...currentQueue, serviceIntent: prepared.intent, serviceStatus: "SENT_READBACK_PENDING",
      serviceSentAt: sentAt });
    return completeMailboxReadback(queueItem, deps);
  });
}

async function runInboundService(input = {}, deps = {}) {
  const enabled = deps.enabled ?? (process.env.JM1_PUBLISHING_INBOUND_SERVICE_ENABLED === "true");
  const preview = input.preview === true;
  if (!enabled && !preview) return { status: "DISABLED", results: [] };
  const store = deps.store || new BlobInboundEvidenceStore();
  const graphClient = deps.graphClient || new PublishingMailboxGraphClient();
  const contextProvider = deps.contextProvider || createDefaultInboundContextProvider();
  const client = deps.client || createDataverseClient({
    apiBase: normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, ""),
    resourceUrl: normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "")
  });
  const targetEventId = normalizeString(input.targetEventId);
  const rows = targetEventId ? [await store.getQueueItem(`queue_${targetEventId}`)].filter(Boolean)
    : (await store.listQueueItems(Number.MAX_SAFE_INTEGER)).filter((row) => row.receivedAt >= "2026-09-22T00:00:00Z" && row.businessEventId &&
      (!row.serviceStatus || row.serviceStatus === "SENT_READBACK_PENDING"));
  const results = [];
  for (const row of rows.slice(0, Math.min(Math.max(Number(input.limit || 20), 1), 100))) {
    try {
      const prepared = preview
        ? await prepareService(row, { store, graphClient, contextProvider, client, validatePaymentLink: deps.validatePaymentLink })
        : await executeService(row, { store, graphClient, contextProvider, client, ...deps });
      results.push(publicServiceResult(prepared));
    } catch (error) {
      results.push({ outcome: "SERVICE_FAILED_RETRYABLE", eventId: row.evidenceLink, reason: error.safeCode || "SERVICE_RUNTIME_FAILURE" });
    }
  }
  return { status: preview ? "PREVIEW" : "EXECUTED", selected: rows.length, results };
}

module.exports = { executeService, prepareService, runInboundService, verifyMailboxCopy };
