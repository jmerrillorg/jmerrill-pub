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
const { verifiedServiceDelivery } = require("./deliveryLedger");

const INTERNAL_MAILBOX = "publishing@jmerrill.one";
const SYSTEM_SENDER = "publishing@email.jmerrill.one";
const ROUTINE_INTENTS = new Set([
  "AUTHOR_QUESTIONS_MISSING", "PAYMENT_LINK_ACCESS",
  "AUTHOR_ONBOARDING_ACCESS",
  "AUTHOR_ONBOARDING_CONTACT_CHANGE",
  "TITLE_CHANGE_ACKNOWLEDGMENT", "EDITORIAL_CORRECTIONS_ACKNOWLEDGMENT"
]);

function safeError(code) {
  return { outcome: "HELD_SERVICE_AUTHORITY", reason: code };
}

function serviceWaitOwner(intent) {
  if (intent === "AUTHOR_ONBOARDING_ACCESS") return "AUTHOR";
  if (intent === "AUTHOR_ONBOARDING_CONTACT_CHANGE") return "JMP_IDENTITY_VERIFICATION";
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
    const matched = rows.find((row) => matchesMailboxCopy(row, service));
    return matched ? { status: "PASS", graphMessageId: matched.id,
      internetMessageId: matched.internetMessageId || null,
      conversationId: matched.conversationId || null } : { status: "PENDING" };
  } catch {
    return { status: "READBACK_FAILED" };
  }
}

function matchesMailboxCopy(row, service) {
  return emailAddress(row.from) === SYSTEM_SENDER &&
    (row.toRecipients || []).some((item) => emailAddress(item) === service.recipient) &&
    (row.ccRecipients || []).some((item) => emailAddress(item) === INTERNAL_MAILBOX) &&
    normalizedMailText(row.subject) === service.subject &&
    createHash("sha256").update(normalizedMailText(row.body?.content)).digest("hex") === service.bodyHash;
}

async function completeMailboxReadback(queueItem, deps) {
  let route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
  let service = route?.service;
  if (service?.status === "SENT") {
    if (!service.deliveryId) {
      const holdBackfill = async (reason) => {
        const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
        await deps.store.updateQueueItem({ ...currentQueue, serviceLedgerStatus: reason });
        return { outcome: "HELD_DELIVERY_BACKFILL", eventId: queueItem.evidenceLink, reason };
      };
      if (service.mailboxCopy !== "PASS" || !service.graphMessageId) {
        return holdBackfill("VERIFIED_COPY_REFERENCE_MISSING");
      }
      let copy;
      try { copy = await deps.graphClient.getMessage(service.graphMessageId); }
      catch { return holdBackfill("VERIFIED_COPY_UNAVAILABLE"); }
      if (!matchesMailboxCopy(copy, service) || !copy.internetMessageId) {
        return holdBackfill("VERIFIED_COPY_IDENTITY_MISMATCH");
      }
      const delivery = verifiedServiceDelivery(route, service, copy);
      await deps.store.upsertDelivery(delivery);
      await deps.store.updateBusinessRoute({ ...route, service: { ...service, deliveryId: delivery.deliveryId } });
      const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
      await deps.store.updateQueueItem({ ...currentQueue, serviceDeliveryId: delivery.deliveryId, serviceLedgerStatus: "CERTIFIED" });
      route = { ...route, service: { ...service, deliveryId: delivery.deliveryId } };
      service = route.service;
    }
    const waitingOn = serviceWaitOwner(service.intent);
    if (service.waitingOn !== waitingOn || service.authorWaitingOn !== waitingOn) {
      await deps.store.updateBusinessRoute({ ...route, service: { ...service, waitingOn, authorWaitingOn: waitingOn } });
    }
    const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
    if (currentQueue?.serviceWaitingOn !== waitingOn || currentQueue?.waitingOn !== waitingOn) {
      await deps.store.updateQueueItem({ ...currentQueue, serviceWaitingOn: waitingOn, waitingOn });
    }
    return { outcome: "IDEMPOTENT", eventId: queueItem.evidenceLink, intent: service.intent,
      providerMessageId: service.providerMessageId, sentAt: service.sentAt };
  }
  if (service?.status !== "SENT_READBACK_PENDING") return { outcome: "HELD_AMBIGUOUS_SEND_STATE", eventId: queueItem.evidenceLink };
  const readback = await (deps.verifyMailboxCopy || verifyMailboxCopy)(deps.graphClient, service);
  if (readback.status !== "PASS") return { outcome: "SENT_READBACK_PENDING", eventId: queueItem.evidenceLink,
    reason: readback.status, providerMessageId: service.providerMessageId };
  if (!readback.internetMessageId) return { outcome: "SENT_READBACK_PENDING", eventId: queueItem.evidenceLink,
    reason: "OUTBOUND_INTERNET_MESSAGE_ID_MISSING", providerMessageId: service.providerMessageId };
  const delivery = verifiedServiceDelivery(route, service, readback);
  await deps.store.upsertDelivery(delivery);
  await (deps.writeLog || writeLog)(deps.client, {
    name: "AUTHOR_COMMUNICATION_MAILBOX_COPY_VERIFIED",
    actionType: "AUTHOR_COMMUNICATION_MAILBOX_COPY_VERIFIED",
    description: `sourceInboundEvent=${queueItem.evidenceLink}; providerMessageId=${service.providerMessageId}; ` +
      `graphMessageId=${readback.graphMessageId}; conversationId=${readback.conversationId || "NONE"}; ` +
      `communicationRecordId=${service.communicationRecordId}; MAILBOX_COPY=PASS.`,
    sourceEntity: "jm1pub_title", sourceRecordId: queueItem.titleId
  });
  await deps.store.updateBusinessRoute({ ...route, service: { ...service, status: "SENT",
    deliveryId: delivery.deliveryId,
    mailboxCopy: "PASS", graphMessageId: readback.graphMessageId,
    outboundConversationId: readback.conversationId, waitingOn: serviceWaitOwner(service.intent),
    authorWaitingOn: serviceWaitOwner(service.intent) } });
  const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
  await deps.store.updateQueueItem({ ...currentQueue, serviceStatus: "SENT",
    serviceDeliveryId: delivery.deliveryId,
    serviceLedgerStatus: "CERTIFIED",
    serviceSentAt: service.sentAt, serviceIntent: service.intent,
    serviceWaitingOn: serviceWaitOwner(service.intent), waitingOn: serviceWaitOwner(service.intent) });
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
  if (classified.intent === "PAYMENT_SCHEDULE_DETAILS") {
    return { outcome: "HELD_PAYMENT_SCHEDULE_AUTHORITY", intent: classified.intent, humanGate: false,
      eventId: queueItem.evidenceLink, transitionHeld: true };
  }
  if (classified.intent === "EDITORIAL_QUESTION_REVIEW" && route.editorialGate?.status !== "EXACT") {
    return { outcome: "HELD_EDITORIAL_AUTHORITY", intent: classified.intent, humanGate: false,
      questions: classified.questions || [], questionPlan: classified.questionPlan || [],
      eventId: queueItem.evidenceLink, authorityStatus: route.editorialGate?.status || "UNPROVEN" };
  }
  if (!ROUTINE_INTENTS.has(classified.intent)) {
    return { outcome: classified.humanGate ? "HUMAN_JUDGMENT_REQUIRED" : "NO_ROUTINE_SERVICE_RULE",
      intent: classified.intent, humanGate: classified.humanGate, questions: classified.questions || [],
      questionPlan: classified.questionPlan || [],
      eventId: queueItem.evidenceLink, sourceConversationId: message.conversationId || null,
      sourceInternetMessageId: message.internetMessageId || null };
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

function serviceSla(receivedAt, now = new Date()) {
  const elapsedMinutes = (now.getTime() - Date.parse(receivedAt)) / 60000;
  if (!Number.isFinite(elapsedMinutes)) return "TIMESTAMP_UNPROVEN";
  if (elapsedMinutes > 60) return "ESCALATED_SERVICE_EXCEPTION";
  if (elapsedMinutes > 30) return "SERVICE_EXCEPTION";
  return "WITHIN_TARGET";
}

async function persistHumanGate(queueItem, prepared, deps) {
  return deps.store.withBusinessRouteLease(queueItem.evidenceLink, async () => {
    const route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
    if (route?.service?.status === "HUMAN_REVIEW_REQUIRED") {
      return { outcome: "HUMAN_REVIEW_REQUIRED", eventId: queueItem.evidenceLink,
        intent: route.service.intent, humanGate: true, questionCount: route.service.questions?.length || 0 };
    }
    const now = new Date().toISOString();
    const sla = serviceSla(queueItem.receivedAt, new Date(now));
    const auditId = await (deps.writeLog || writeLog)(deps.client, {
      name: "PUBLISHING_INBOUND_SERVICE_HUMAN_GATE",
      actionType: "PUBLISHING_INBOUND_SERVICE_HUMAN_GATE",
      description: `sourceInboundEvent=${queueItem.evidenceLink}; businessEventId=${queueItem.businessEventId}; ` +
        `intent=${prepared.intent}; questionCount=${prepared.questions.length}; sla=${sla}; authorMessages=0.`,
      sourceEntity: "jm1pub_title", sourceRecordId: queueItem.titleId
    });
    await deps.store.updateBusinessRoute({ ...route, service: {
      intent: prepared.intent, status: "HUMAN_REVIEW_REQUIRED", questions: prepared.questions,
      questionPlan: prepared.questionPlan,
      requestedDecision: "Resolve editorial-evidence questions against the current delivered artifact; escalate only genuinely new editorial judgment.",
      humanGateAt: now, auditId, sla, sourceConversationId: prepared.sourceConversationId,
      sourceInternetMessageId: prepared.sourceInternetMessageId,
      waitingOn: "JMP", authorWaitingOn: "JMP", authorMessages: 0
    } });
    const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
    await deps.store.updateQueueItem({ ...currentQueue, serviceIntent: prepared.intent,
      serviceStatus: "HUMAN_REVIEW_REQUIRED", serviceWaitingOn: "JMP", serviceHumanGateAt: now,
      serviceSla: sla });
    return { outcome: "HUMAN_REVIEW_REQUIRED", eventId: queueItem.evidenceLink,
      intent: prepared.intent, humanGate: true, questionCount: prepared.questions.length, sla };
  });
}

async function persistServiceException(queueItem, outcome, deps) {
  const sla = serviceSla(queueItem.receivedAt);
  if (sla === "WITHIN_TARGET" || sla === "TIMESTAMP_UNPROVEN") return;
  await deps.store.withBusinessRouteLease(queueItem.evidenceLink, async () => {
    const route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
    if (!route || route.service?.status === "SENT" || route.service?.status === "HUMAN_REVIEW_REQUIRED" ||
        route.serviceException?.sla === sla) return;
    const now = new Date().toISOString();
    const auditId = await (deps.writeLog || writeLog)(deps.client, {
      name: "PUBLISHING_INBOUND_SERVICE_EXCEPTION",
      actionType: "PUBLISHING_INBOUND_SERVICE_EXCEPTION",
      description: `sourceInboundEvent=${queueItem.evidenceLink}; businessEventId=${queueItem.businessEventId}; ` +
        `outcome=${outcome}; sla=${sla}; authorMessages=0.`,
      sourceEntity: "jm1pub_title", sourceRecordId: queueItem.titleId
    });
    await deps.store.updateBusinessRoute({ ...route, serviceException: { sla, outcome, detectedAt: now, auditId } });
    const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
    await deps.store.updateQueueItem({ ...currentQueue, serviceSla: sla, serviceExceptionAt: now,
      serviceExceptionOutcome: outcome });
    if (typeof deps.store.mergeHealth === "function") {
      await deps.store.mergeHealth({ lastPublishingServiceExceptionAt: now,
        lastPublishingServiceExceptionEventId: queueItem.evidenceLink });
    }
  });
}

async function reconcileEditorialAuthorityHold(queueItem, prepared, deps) {
  return deps.store.withBusinessRouteLease(queueItem.evidenceLink, async () => {
    const route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
    if (route?.service?.status === "HELD_EDITORIAL_AUTHORITY" &&
        route.service.authorityStatus === prepared.authorityStatus) {
      return { outcome: "HELD_EDITORIAL_AUTHORITY", eventId: queueItem.evidenceLink,
        intent: prepared.intent, authorityStatus: prepared.authorityStatus };
    }
    const now = new Date().toISOString();
    const priorGate = route?.service?.status === "HUMAN_REVIEW_REQUIRED";
    const auditId = await (deps.writeLog || writeLog)(deps.client, {
      name: "PUBLISHING_INBOUND_EDITORIAL_AUTHORITY_HOLD",
      actionType: "PUBLISHING_INBOUND_EDITORIAL_AUTHORITY_HOLD",
      description: `sourceInboundEvent=${queueItem.evidenceLink}; authorityStatus=${prepared.authorityStatus}; ` +
        `questionCount=${prepared.questions.length}; prematureHumanGateRetracted=${priorGate ? "YES" : "NO"}; authorMessages=0.`,
      sourceEntity: "jm1pub_title", sourceRecordId: queueItem.titleId
    });
    await deps.store.updateBusinessRoute({ ...route, service: {
      ...route.service, intent: prepared.intent, status: "HELD_EDITORIAL_AUTHORITY",
      questions: prepared.questions, questionPlan: prepared.questionPlan,
      authorityStatus: prepared.authorityStatus, authorityHoldAt: now, authorityHoldAuditId: auditId,
      prematureHumanGateRetractedAt: priorGate ? now : null,
      waitingOn: "JMP_SYSTEM", authorWaitingOn: "JMP_SYSTEM", authorMessages: 0
    } });
    const currentQueue = await deps.store.getQueueItem(queueItem.queueItemId);
    await deps.store.updateQueueItem({ ...currentQueue, serviceIntent: prepared.intent,
      serviceStatus: null, serviceWaitingOn: "JMP_SYSTEM",
      serviceAuthorityStatus: prepared.authorityStatus,
      serviceHumanGateRetractedAt: priorGate ? now : currentQueue.serviceHumanGateRetractedAt || null });
    return { outcome: "HELD_EDITORIAL_AUTHORITY", eventId: queueItem.evidenceLink,
      intent: prepared.intent, authorityStatus: prepared.authorityStatus };
  });
}

async function executeService(queueItem, deps) {
  const priorRoute = await deps.store.getBusinessRoute(queueItem.evidenceLink);
  if (["SENT_READBACK_PENDING", "SENT"].includes(priorRoute?.service?.status)) {
    return deps.store.withBusinessRouteLease(queueItem.evidenceLink, () => completeMailboxReadback(queueItem, deps));
  }
  let prepared = await prepareService(queueItem, deps);
  if (prepared.outcome === "HELD_EDITORIAL_AUTHORITY") return reconcileEditorialAuthorityHold(queueItem, prepared, deps);
  if (prepared.outcome === "HUMAN_JUDGMENT_REQUIRED") return persistHumanGate(queueItem, prepared, deps);
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
      (!row.serviceStatus || row.serviceStatus === "SENT_READBACK_PENDING" ||
        (row.serviceStatus === "SENT" && !row.serviceDeliveryId) ||
        (row.serviceStatus === "HUMAN_REVIEW_REQUIRED" && row.serviceIntent === "EDITORIAL_QUESTION_REVIEW")));
  const results = [];
  for (const row of rows.slice(0, Math.min(Math.max(Number(input.limit || 20), 1), 100))) {
    try {
      const prepared = preview
        ? await prepareService(row, { store, graphClient, contextProvider, client, validatePaymentLink: deps.validatePaymentLink })
        : await executeService(row, { store, graphClient, contextProvider, client, ...deps });
      if (!preview && !["SENT", "IDEMPOTENT", "HUMAN_REVIEW_REQUIRED", "SENT_READBACK_PENDING"].includes(prepared.outcome)) {
        await persistServiceException(row, prepared.outcome, { store, client, ...deps });
      }
      results.push(publicServiceResult(prepared));
    } catch (error) {
      results.push({ outcome: "SERVICE_FAILED_RETRYABLE", eventId: row.evidenceLink, reason: error.safeCode || "SERVICE_RUNTIME_FAILURE" });
    }
  }
  return { status: preview ? "PREVIEW" : "EXECUTED", selected: rows.length, results };
}

module.exports = { executeService, prepareService, runInboundService, verifyMailboxCopy };
