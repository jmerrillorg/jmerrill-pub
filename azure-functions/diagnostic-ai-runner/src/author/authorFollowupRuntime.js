"use strict";

const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { PublishingMailboxGraphClient } = require("../mail/inbound/graphClient");
const { sendConfiguredAuthorResponse } = require("./authorResponseSendProviderConfig");
const { reserveCommunicationIntent, markCommunicationSent } = require("../editorial/communicationIntentStore");
const { findExecutionLog, writeLog } = require("../editorial/editorialExecutionRuntime");
const { evaluateAuthorFollowup } = require("./authorFollowupPolicy");
const { elapsedGovernedBusinessDays } = require("./authorBusinessCalendar");
const { scanCurrentAuthorActions } = require("./currentAuthorActionCensus");
const { createCurrentAuthorResponseSearch } = require("./currentAuthorResponseSearch");

const INTERNAL_MAILBOX = "publishing@jmerrill.one";

function actionRequest(projection) {
  return {
    titleId: projection.titleId, engagementId: projection.engagementId,
    authorId: projection.authorId, stageId: projection.stageId,
    stageCode: "07_DEVELOPMENTAL_EDITING", actionType: projection.authorActionType,
    actionRequestId: projection.actionRequestId, requestedAt: projection.actionRequestedAt,
    dueAt: projection.actionDueAt, delivered: projection.currentDeliveryState === "VERIFIED"
  };
}

function actionState(projection) {
  return { currentStageId: projection.stageId, currentActionRequestId: projection.actionRequestId,
    nextActionOwner: projection.nextActionOwner, responses: [] };
}

function authorCopy(title, author, dueAt, position) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric"
  }).format(new Date(dueAt));
  const overdue = position >= 7;
  const deadline = overdue
    ? `The review response date was ${formatted}. Please send your decision as soon as you can.`
    : `Please send your decision by ${formatted}.`;
  return {
    subject: `Developmental Editing Review - ${title}`,
    body: `Good day, ${author.split(/\s+/)[0]},\n\n` +
      `We are following up on the developmental editing materials for ${title}. Please reply with your decision ` +
      `on the edited manuscript, or let us know if you have questions. ${deadline}\n\n` +
      `Until we receive your response, the next editorial step will remain on hold.\n\nJ Merrill Publishing`
  };
}

async function prepareFollowup(client, projection, position) {
  const [title, contact] = await Promise.all([
    client.first("jm1pub_titles", {
      $select: "jm1pub_titleid,jm1pub_titlename,_jm1_primaryauthor_value,jm1_canonicalauthorcontactreference",
      $filter: `jm1pub_titleid eq ${projection.titleId}`
    }),
    client.first("contacts", {
      $select: "contactid,fullname,emailaddress1", $filter: `contactid eq ${projection.authorId}`
    })
  ]);
  if (title?.jm1pub_titleid !== projection.titleId ||
      title?._jm1_primaryauthor_value !== projection.authorId ||
      title?.jm1_canonicalauthorcontactreference?.toLowerCase() !== `contact:${projection.authorId}` ||
      contact?.contactid !== projection.authorId || !contact?.emailaddress1 || !contact?.fullname ||
      !title.jm1pub_titlename) {
    return { status: "HELD", reason: "CURRENT_RECIPIENT_IDENTITY_UNPROVEN" };
  }
  const workstream = `author-followup:${projection.titleId}:${projection.stageId}:${projection.actionRequestId}:${position}`;
  const copy = authorCopy(title.jm1pub_titlename, contact.fullname, projection.actionDueAt, position);
  return { status: "READY", workstream, copy, title, contact,
    intent: { titleId: projection.titleId, titleName: title.jm1pub_titlename,
      authorId: projection.authorId, communicationType: "AUTHOR_FOLLOWUP_STANDARD_ACTION",
      workstream, recipient: contact.emailaddress1.toLowerCase(), attachments: [] } };
}

async function sendFollowup(client, projection, position, now, deps = {}) {
  const prepared = await prepareFollowup(client, projection, position);
  if (prepared.status !== "READY") return prepared;
  const reserved = await (deps.reserveCommunicationIntent || reserveCommunicationIntent)(client, prepared.intent);
  if (reserved.status === "ALREADY_DELIVERED") return { status: "IDEMPOTENT" };
  if (!["RESERVED", "PROVIDER_ACCEPTED", "AMBIGUOUS_SEND_STATE", "DELIVERY_UNVERIFIED"].includes(reserved.status)) {
    return { status: "HELD", reason: `OUTBOX_${reserved.status}` };
  }
  const input = { sendApproval: {
    authorId: projection.authorId, communicationType: prepared.intent.communicationType,
    workstream: prepared.workstream, diagnosticId: projection.titleId,
    intakeReferenceCode: projection.engagementId, authorEmail: prepared.intent.recipient,
    authorName: prepared.contact.fullname, projectTitle: prepared.title.jm1pub_titlename,
    draftSubject: prepared.copy.subject, draftBody: prepared.copy.body,
    templateName: "AUTHOR_FOLLOWUP_STANDARD_ACTION_V1", templateVersion: "1.0",
    approvedBy: "publishing-author-followup-policy:v1", approvedOn: now.toISOString(),
    sendApproved: true, decision: "APPROVE_AUTHOR_SEND",
    internalVisibilityMailbox: INTERNAL_MAILBOX,
    futureSendRequiresInternalCopy: true, futureSendRequiresDataverseLog: true
  }, to: [prepared.intent.recipient], cc: [INTERNAL_MAILBOX], bcc: [], attachments: [] };
  const sent = await (deps.sendConfiguredAuthorResponse || sendConfiguredAuthorResponse)({ input,
    env: deps.env || process.env, providers: deps.providers || {} });
  if (!sent.ok || !sent.providerMessageId) {
    return { status: "HELD", reason: sent.reason || "RELAY_ACCEPTANCE_UNPROVEN" };
  }
  await (deps.markCommunicationSent || markCommunicationSent)(client, {
    ...prepared.intent, semanticIdempotencyKey: reserved.semanticIdempotencyKey,
    communicationRecordId: reserved.communicationRecordId,
    providerMessageId: sent.providerMessageId, sentAt: now.toISOString(), communicationComplete: sent.communicationComplete,
    artifactChecksums: [], artifactManifest: [],
    observability: { acsDelivery: "PASS", publishingMailboxCopy: sent.communicationComplete ? "PASS" : "UNPROVEN",
      semanticAttachmentParity: "PASS" }
  });
  return { status: sent.communicationComplete ? "SENT" : "MAILBOX_VERIFICATION_PENDING",
    providerMessageId: sent.providerMessageId, position, workstream: prepared.workstream };
}

async function recordDay20Escalation(client, projection, deps = {}) {
  const key = `author-day20:${projection.titleId}:${projection.stageId}:${projection.actionRequestId}`;
  const existing = await (deps.findExecutionLog || findExecutionLog)(client, "AUTHOR_DAY20_ESCALATED", key);
  if (existing) return "IDEMPOTENT";
  await (deps.writeLog || writeLog)(client, {
    name: "AUTHOR_DAY20_ESCALATED - author review requires Publishing attention",
    actionType: "AUTHOR_DAY20_ESCALATED",
    description: `Idempotency ${key}. Author response still outstanding. Administrative hold review required; ` +
      "no adverse author classification without AUTHOR_STATUS_RULING_RECORDED.",
    sourceEntity: "jm1pub_editorialapprovalgate", sourceRecordId: projection.actionRequestId
  });
  return "RECORDED";
}

async function recordAmbiguousReview(client, candidate, deps = {}) {
  const key = `author-followup-review:${candidate.titleId}:${candidate.stageId || "stage-unbound"}:${candidate.reason}`;
  const existing = await (deps.findExecutionLog || findExecutionLog)(client, "AUTHOR_FOLLOWUP_REVIEW_REQUIRED", key);
  if (existing) return "IDEMPOTENT";
  await (deps.writeLog || writeLog)(client, {
    name: "AUTHOR_FOLLOWUP_REVIEW_REQUIRED - current author action unresolved",
    actionType: "AUTHOR_FOLLOWUP_REVIEW_REQUIRED",
    description: `Idempotency ${key}. Current author-action evidence is ambiguous; reason=${candidate.reason}; ` +
      "follow-up send denied pending Publishing reconciliation.",
    sourceEntity: "jm1pub_title", sourceRecordId: candidate.titleId
  });
  return "RECORDED";
}

async function runAuthorFollowupCadence(input = {}, deps = {}) {
  const now = new Date(input.now || Date.now());
  if (!Number.isFinite(now.getTime())) return { status: "FAILED", reason: "CURRENT_TIME_INVALID" };
  const client = deps.client || createDataverseClient({
    apiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
    resourceUrl: process.env.DATAVERSE_RESOURCE_URL
  });
  const responseSearch = deps.responseSearch || createCurrentAuthorResponseSearch(client,
    deps.graphClient || new PublishingMailboxGraphClient());
  const scan = deps.scanCurrentAuthorActions || scanCurrentAuthorActions;
  const census = await scan(client, { responseSearch });
  const enabled = input.preview !== true && (deps.enabled ?? process.env.JM1_AUTHOR_FOLLOWUP_ENABLED === "true");
  const reviewQueue = [];
  for (const candidate of census.reviewCandidates || []) {
    try {
      reviewQueue.push({ ...candidate,
        recordStatus: enabled ? await recordAmbiguousReview(client, candidate, deps) : "PREVIEW" });
    } catch (error) {
      reviewQueue.push({ ...candidate, recordStatus: "FAILED", reason: error.safeCode || "REVIEW_RECORD_FAILED" });
    }
  }
  const results = [];
  for (const projection of census.projections.filter((row) => row.nextActionOwner === "AUTHOR")) {
    try {
      const elapsedBusinessDays = elapsedGovernedBusinessDays(projection.actionRequestedAt, now);
      if (elapsedBusinessDays === null) {
        results.push({ titleId: projection.titleId, status: "HELD", reason: "GOVERNED_BUSINESS_CALENDAR_UNAVAILABLE" });
        continue;
      }
      const decision = evaluateAuthorFollowup(actionRequest(projection),
        { ...actionState(projection), elapsedBusinessDays }, now);
      if ((decision.status !== "DUE" && !decision.day20Escalation) || !enabled) {
        results.push({ titleId: projection.titleId, status: decision.status, position: decision.position });
        continue;
      }
      const fresh = await scan(client, { responseSearch });
      const current = fresh.projections.find((row) => row.titleId === projection.titleId);
      if (current?.nextActionOwner !== "AUTHOR" || current.actionRequestId !== projection.actionRequestId ||
          current.stageId !== projection.stageId || current.actionRequestedAt !== projection.actionRequestedAt) {
        results.push({ titleId: projection.titleId, status: "HELD", reason: "CURRENT_ACTION_CHANGED" });
        continue;
      }
      const escalation = decision.day20Escalation
        ? await recordDay20Escalation(client, current, deps) : null;
      const delivery = decision.status === "DUE"
        ? await sendFollowup(client, current, decision.position, now, deps)
        : { status: decision.status };
      results.push({ titleId: projection.titleId, ...delivery, day20Escalation: escalation });
    } catch (error) {
      results.push({ titleId: projection.titleId, status: "HELD", reason: error.safeCode || "FOLLOWUP_RUNTIME_FAILED" });
    }
  }
  return { status: enabled ? "EXECUTED" : "PREVIEW", activeTitlesScanned: census.activeTitlesScanned,
    classifications: census.classifications, reviewQueue, results };
}

module.exports = { actionRequest, authorCopy, prepareFollowup, recordAmbiguousReview, recordDay20Escalation,
  runAuthorFollowupCadence, sendFollowup };
