"use strict";

/**
 * Engine: Inbound Communications Engine
 * Reusable? Y
 * Stage-specific exception? N
 */

const { readPublishingMailboxReply, PUBLISHING_MAILBOX } = require("../mail/publishingMailboxReader");
const { classifyPackageReply } = require("../mail/publishingPackageReplyClassifier");
const {
  buildPackageAcceptedEvent,
  buildOfferPreview,
  renderPaymentOptionsResponsePreview
} = require("../author/packageAcceptancePaymentOptions");
const { createHash } = require("node:crypto");

const EXECUTION_STATUS = { SUCCESS: 835500001, FAILED: 835500002 };
const BAND_LEVEL_1 = 835500000;
const AUTHOR_DECISION_APPROVE = 196650000;
const AUTHOR_DECISION_REQUEST_REVISION = 196650001;
const AUTHOR_DECISION_REQUEST_CLARIFICATION = 196650002;
const RESPONSE_STATES = Object.freeze({
  DISCOVERED: "DISCOVERED",
  CLAIMED: "CLAIMED",
  CORRELATED: "CORRELATED",
  CLASSIFIED: "CLASSIFIED",
  PERSISTED: "PERSISTED",
  COMPLETED: "COMPLETED",
  BLOCKED: "BLOCKED",
  DEAD_LETTERED: "DEAD_LETTERED"
});
const DECISION = Object.freeze({
  APPROVED: "APPROVED",
  APPROVED_WITH_CORRECTIONS: "APPROVED_WITH_CORRECTIONS",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  QUESTIONS_OR_REVIEW_REQUIRED: "QUESTIONS_OR_REVIEW_REQUIRED",
  PENDING_AMBIGUOUS: "PENDING_AMBIGUOUS",
  ACKNOWLEDGMENT_ONLY: "ACKNOWLEDGMENT_ONLY"
});
const MESSAGE_INTENT = Object.freeze({
  ACKNOWLEDGMENT: "ACKNOWLEDGMENT",
  APPROVAL: "APPROVAL",
  ACCESS_HELP: "ACCESS_HELP",
  ACCESS_CODE_REQUEST: "ACCESS_CODE_REQUEST",
  FILE_RECEIVED: "FILE_RECEIVED",
  QUESTION: "QUESTION",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  HOLD: "HOLD"
});
const SEAN_FOUNDER_CORRECTION = Object.freeze({
  gateId: "e996abe7-2f8e-f111-8077-000d3a14673b",
  titleId: "91c5e1ef-2980-f111-ab0f-7c1e525b15c2",
  authorEmail: "scrowley50@gmail.com",
  originalClassification: "ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL",
  correctedClassification: "DEVELOPMENTAL_EDITING_APPROVED_WITH_ACCESS_HELP",
  authoritativeLifecycleDecision: DECISION.APPROVED,
  correctionSource: "JACKIE_FOUNDER_AUTHORITY_2026-08-29"
});
const ACKNOWLEDGEMENT_POLICY = Object.freeze({
  status: "NOT_YET_GOVERNED",
  wouldSend: false,
  htmlRendering: "NOT_APPLICABLE"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConfiguredSecret(value) {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (/^\(.*\)$/.test(normalized)) return "";
  if (normalized.toLowerCase().includes("set-before-use")) return "";
  return normalized;
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
}

function stableIdempotencyKey(gateId, inboundMessageId) {
  const digest = createHash("sha256").update(`${gateId}:${inboundMessageId}`).digest("hex").slice(0, 24);
  return `author-review-response:${digest}`;
}

function stablePackageSelectionIdempotencyKey(diagnosticId, inboundMessageId) {
  const digest = createHash("sha256").update(`${diagnosticId}:${inboundMessageId}`).digest("hex").slice(0, 24);
  return `package-selection-response:${digest}`;
}

function captureEnabled() {
  return normalizeString(process.env.JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED).toLowerCase() !== "true";
}

function requireDataverseConfig() {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }
  return { apiBase, resourceUrl };
}

async function getDataverseToken(resourceUrl) {
  const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
  const tenantId = normalizeString(process.env.DATAVERSE_TENANT_ID);
  const clientId = normalizeConfiguredSecret(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeConfiguredSecret(process.env.DATAVERSE_CLIENT_SECRET);
  const credential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

function createDataverseClient(config, deps = {}) {
  const getToken = deps.getToken || getDataverseToken;
  let cachedToken = "";
  async function token() {
    if (!cachedToken) cachedToken = await getToken(config.resourceUrl);
    return cachedToken;
  }
  async function request(path, options = {}) {
    const response = await fetch(`${config.apiBase}/${path.replace(/^\//, "")}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw Object.assign(new Error(body?.error?.message || `HTTP ${response.status}`), {
        safeCode: "DATAVERSE_REQUEST_FAILED",
        status: response.status,
        body
      });
    }
    return { body, headers: response.headers };
  }
  async function list(entitySet, query = {}) {
    const params = new URLSearchParams(query);
    const { body } = await request(`${entitySet}?${params.toString()}`, { method: "GET", prefer: "odata.maxpagesize=50" });
    return Array.isArray(body.value) ? body.value : [];
  }
  async function first(entitySet, query = {}) {
    const rows = await list(entitySet, { ...query, $top: "1" });
    return rows[0] || null;
  }
  async function create(entitySet, payload) {
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || headers.get("location") || "");
  }
  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }
  return { list, first, create, patch };
}

function classifyAuthorReviewResponse(text) {
  const normalized = normalizeString(text).toLowerCase();
  if (!normalized) return DECISION.PENDING_AMBIGUOUS;
  if (/^(thank you|thanks|received|got it|i will review|will review|looking now)\b/.test(normalized)) return DECISION.ACKNOWLEDGMENT_ONLY;
  if (/\b(approved with corrections|approve with corrections|approved with minor corrections|approve with minor corrections|i approve with corrections|i approve with minor corrections)\b/.test(normalized)) {
    return DECISION.APPROVED_WITH_CORRECTIONS;
  }
  if (/\b(approved|approve|i approve|yes approved|convey approval)\b/.test(normalized) && /\b(corrections?|changes?|revise|revision|fix|notes?|preferred style|italics?)\b/.test(normalized)) {
    return DECISION.APPROVED_WITH_CORRECTIONS;
  }
  if (/^(approved|approve|i approve|i approve!|approved!|yes approved)\b/.test(normalized)) return DECISION.APPROVED;
  if (/\b(corrections?|changes?|revise|revision|fix)\b/.test(normalized)) return DECISION.CHANGES_REQUESTED;
  if (/\?|\b(question|clarify|discussion|call)\b/.test(normalized)) return DECISION.QUESTIONS_OR_REVIEW_REQUIRED;
  return DECISION.PENDING_AMBIGUOUS;
}

function classifyAuthorReviewMessageIntents(text) {
  const normalized = normalizeString(text).toLowerCase().replace(/[’]/g, "'");
  const intents = new Set();
  if (/^(thank you|thanks|received|got it|i have received|i received|i got|i will review|will review|looking now)\b/.test(normalized)) {
    intents.add(MESSAGE_INTENT.ACKNOWLEDGMENT);
  }
  if (/\b(received|got|have the files|got the files|received the files)\b/.test(normalized)) intents.add(MESSAGE_INTENT.FILE_RECEIVED);
  if (/\b(access code|login code|sign[- ]?in code|portal access|author central|author center|author operating center|workspace access)\b/.test(normalized)) {
    intents.add(MESSAGE_INTENT.ACCESS_HELP);
    intents.add(MESSAGE_INTENT.ACCESS_CODE_REQUEST);
  }
  if (/\b(can't|cannot|unable to|trouble|problem|issue)\s+(log|sign|get)\s*(in|on|into)?\b/.test(normalized)) {
    intents.add(MESSAGE_INTENT.ACCESS_HELP);
  }
  if (/\b(i approve|approved by me|you have my approval|approved to proceed|everything looks good and i approve|looks good and i approve)\b/.test(normalized) || /^(approved|approve|yes approved)\b/.test(normalized)) {
    intents.add(MESSAGE_INTENT.APPROVAL);
  }
  if (/\b(corrections?|changes?|revise|revision|fix|notes?)\b/.test(normalized)) intents.add(MESSAGE_INTENT.CHANGES_REQUESTED);
  if (/\?|\b(question|clarify|can you|could you|may i|please let me know)\b/.test(normalized)) intents.add(MESSAGE_INTENT.QUESTION);
  if (/\b(hold|pause|wait|not ready|do not proceed|don't proceed)\b/.test(normalized)) intents.add(MESSAGE_INTENT.HOLD);
  return Array.from(intents);
}

function supportActionsForIntents(intents) {
  const actions = new Set();
  if (intents.includes(MESSAGE_INTENT.ACCESS_HELP) || intents.includes(MESSAGE_INTENT.ACCESS_CODE_REQUEST)) actions.add("ACCESS_HELP");
  return Array.from(actions);
}

function isSeanFounderCorrection(gate, reply) {
  const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid).toLowerCase();
  const titleId = normalizeString(gate._jm1pub_titleid_value || gate.titleId).toLowerCase();
  const sender = normalizeString(reply.senderAddress).toLowerCase();
  const subject = normalizeString(reply.subject).toLowerCase();
  const body = normalizeString(reply.bodyText).toLowerCase().replace(/[’]/g, "'");
  return (
    gateId === SEAN_FOUNDER_CORRECTION.gateId &&
    (!titleId || titleId === SEAN_FOUNDER_CORRECTION.titleId) &&
    sender === SEAN_FOUNDER_CORRECTION.authorEmail &&
    subject.includes("developmental editing materials") &&
    body.includes("i have received the files") &&
    body.includes("please approve them") &&
    body.includes("author") &&
    body.includes("access code")
  );
}

function resolveAuthorReviewDecision(gate, reply) {
  const originalDecision = classifyAuthorReviewResponse(reply.bodyText || "");
  let messageIntents = classifyAuthorReviewMessageIntents(reply.bodyText || "");
  if (isSeanFounderCorrection(gate, reply)) {
    messageIntents = Array.from(new Set([
      ...messageIntents,
      MESSAGE_INTENT.ACKNOWLEDGMENT,
      MESSAGE_INTENT.FILE_RECEIVED,
      MESSAGE_INTENT.APPROVAL,
      MESSAGE_INTENT.ACCESS_HELP,
      MESSAGE_INTENT.ACCESS_CODE_REQUEST
    ]));
    return {
      classification: SEAN_FOUNDER_CORRECTION.authoritativeLifecycleDecision,
      originalClassification: originalDecision === DECISION.ACKNOWLEDGMENT_ONLY ? SEAN_FOUNDER_CORRECTION.originalClassification : originalDecision,
      correctedClassification: SEAN_FOUNDER_CORRECTION.correctedClassification,
      authoritativeLifecycleDecision: DECISION.APPROVED,
      messageIntents,
      supportActions: supportActionsForIntents(messageIntents),
      founderAuthorityCorrection: true,
      correctionSource: SEAN_FOUNDER_CORRECTION.correctionSource
    };
  }
  return {
    classification: originalDecision,
    originalClassification: originalDecision,
    correctedClassification: null,
    authoritativeLifecycleDecision: decisionCode(originalDecision) === null ? null : originalDecision,
    messageIntents,
    supportActions: supportActionsForIntents(messageIntents),
    founderAuthorityCorrection: false,
    correctionSource: null
  };
}

function decisionCode(decision) {
  if (decision === DECISION.APPROVED) return AUTHOR_DECISION_APPROVE;
  if (decision === DECISION.APPROVED_WITH_CORRECTIONS || decision === DECISION.CHANGES_REQUESTED) return AUTHOR_DECISION_REQUEST_REVISION;
  if (decision === DECISION.QUESTIONS_OR_REVIEW_REQUIRED) return AUTHOR_DECISION_REQUEST_CLARIFICATION;
  return null;
}

function decisionOutcome(decision) {
  if (decision === DECISION.APPROVED) return "APPROVAL_PERSISTED";
  if (decision === DECISION.APPROVED_WITH_CORRECTIONS) return "APPROVED_WITH_CORRECTIONS_PERSISTED";
  if (decision === DECISION.CHANGES_REQUESTED) return "CHANGES_REQUESTED_PERSISTED";
  if (decision === DECISION.QUESTIONS_OR_REVIEW_REQUIRED) return "QUESTIONS_REQUIRING_REVIEW_PERSISTED";
  if (decision === DECISION.ACKNOWLEDGMENT_ONLY) return "ACKNOWLEDGMENT_RECORDED";
  return "PUBLISHER_REVIEW_REQUIRED";
}

function decisionActionType(decision) {
  if (decision === DECISION.APPROVED) return "AUTHOR_APPROVAL_PERSISTED";
  if (decision === DECISION.APPROVED_WITH_CORRECTIONS) return "AUTHOR_APPROVED_WITH_CORRECTIONS_PERSISTED";
  if (decision === DECISION.CHANGES_REQUESTED) return "AUTHOR_CHANGES_REQUESTED";
  if (decision === DECISION.QUESTIONS_OR_REVIEW_REQUIRED) return "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW";
  if (decision === DECISION.ACKNOWLEDGMENT_ONLY) return "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED";
  return "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW";
}

function decisionSummary(decision) {
  if (decision === DECISION.APPROVED) return "Author approved without changes through monitored publishing mailbox.";
  if (decision === DECISION.APPROVED_WITH_CORRECTIONS) return "Author approved with corrections/notes through monitored publishing mailbox. Production movement remains separately governed.";
  if (decision === DECISION.CHANGES_REQUESTED) return "Author requested changes through monitored publishing mailbox. Production movement remains separately governed.";
  if (decision === DECISION.QUESTIONS_OR_REVIEW_REQUIRED) return "Author response requires publisher review before any production movement.";
  if (decision === DECISION.ACKNOWLEDGMENT_ONLY) return "Acknowledgment-only response preserved; response wait remains open.";
  return "Author response is ambiguous and requires publisher review.";
}

function extractEmailCandidates(gate) {
  return [
    gate.jm1pub_authoremail,
    gate.jm1_authoremail,
    gate.authorEmail,
    gate.emailaddress1,
    gate.author?.email,
    gate.contact?.emailaddress1
  ].map((value) => normalizeString(value).toLowerCase()).filter(Boolean);
}

function validateAuthorIdentity(gate, reply) {
  const sender = normalizeString(reply.senderAddress).toLowerCase();
  const candidates = extractEmailCandidates(gate);
  if (!sender) return { ok: false, reason: "UNKNOWN_SENDER_EMAIL" };
  if (candidates.length === 0) return { ok: false, reason: "AUTHOR_IDENTITY_NOT_AVAILABLE_FOR_GATE" };
  if (!candidates.includes(sender)) return { ok: false, reason: "AUTHOR_SENDER_MISMATCH" };
  return { ok: true, sender, candidates };
}

function gateValue(gate, names) {
  for (const name of names) {
    const value = normalizeString(gate[name]);
    if (value) return value;
  }
  return "";
}

function validateReplyCorrelation(gate, reply, subjectContains) {
  const gateTitleId = gateValue(gate, ["_jm1pub_titleid_value", "titleId", "jm1pub_titleid"]);
  const gatePackageId = gateValue(gate, ["jm1pub_packageid", "packageId", "jm1pub_decisionpackageid"]);
  const gateDecisionRequestId = gateValue(gate, ["jm1pub_decisionrequestid", "decisionRequestId"]);
  const gateOutboundMessageId = gateValue(gate, ["jm1pub_outboundmessageid", "outboundMessageId", "jm1pub_notificationmessageid"]);
  const gateThreadId = gateValue(gate, ["jm1pub_threadid", "threadId", "jm1pub_conversationid"]);
  const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid);

  if (reply.titleId && gateTitleId && reply.titleId !== gateTitleId) return { ok: false, reason: "WRONG_TITLE_REPLY_REVIEW_REQUIRED" };
  if (reply.gateId && reply.gateId !== gateId) return { ok: false, reason: "WRONG_GATE_REPLY_REVIEW_REQUIRED" };
  if (reply.packageId && gatePackageId && reply.packageId !== gatePackageId) return { ok: false, reason: "WRONG_PACKAGE_REPLY_REVIEW_REQUIRED" };
  if (reply.decisionRequestId && gateDecisionRequestId && reply.decisionRequestId !== gateDecisionRequestId) return { ok: false, reason: "WRONG_DECISION_REQUEST_REPLY_REVIEW_REQUIRED" };

  if (gateOutboundMessageId && (reply.inReplyToMessageId === gateOutboundMessageId || reply.references?.includes(gateOutboundMessageId))) {
    return { ok: true, mode: "MESSAGE_THREAD_EXACT" };
  }
  if (gateThreadId && reply.conversationId === gateThreadId) return { ok: true, mode: "THREAD_ID_EXACT" };
  if (gatePackageId && reply.packageId === gatePackageId) return { ok: true, mode: "PACKAGE_ID_EXACT" };
  if (gateDecisionRequestId && reply.decisionRequestId === gateDecisionRequestId) return { ok: true, mode: "DECISION_REQUEST_ID_EXACT" };
  if (gateTitleId && reply.titleId === gateTitleId && gateId && reply.gateId === gateId) return { ok: true, mode: "TITLE_GATE_EXACT" };

  const subject = normalizeString(reply.subject).toLowerCase();
  if (subject && subjectContains && subject.includes(subjectContains.toLowerCase())) {
    return { ok: true, mode: "SUBJECT_PROBE_WITH_VALIDATED_IDENTITY" };
  }

  return { ok: false, reason: "UNMATCHED_REPLY_REVIEW_REQUIRED" };
}

function isManualRecoveryGate(gate) {
  return Boolean(
    gate.manualRecovery === true ||
    gate.jm1pub_manualrecovery === true ||
    normalizeString(gate.jm1pub_recoverymode).toUpperCase() === "MANUAL_RECOVERY" ||
    normalizeString(gate.jm1pub_productionmode).toUpperCase() === "MANUAL" ||
    normalizeString(gate.jm1pub_titleidentifier).toUpperCase() === "JMP-INT-202607-DL2T20"
  );
}

function preserveAuthorNotes(text) {
  const notes = normalizeString(text);
  return notes.length > 900 ? `${notes.slice(0, 897)}...` : notes;
}

function evaluateAcknowledgementPolicy(input = {}) {
  const required = input.requireAcknowledgement === true;
  if (!required) return ACKNOWLEDGEMENT_POLICY;
  const render = input.renderedAcknowledgement || {};
  const metadata = render.templateMetadata || render.metadata || {};
  const ok =
    normalizeString(render.htmlBody || render.html).startsWith("<!doctype html>") &&
    normalizeString(metadata.renderTemplateGuard) === "PASS" &&
    normalizeString(metadata.renderMode) === "CANONICAL_HTML";
  return {
    status: "REQUIRED",
    wouldSend: ok,
    htmlRendering: ok ? "PASS" : "FAIL",
    blockers: ok ? [] : ["CANONICAL_JMP_HTML_RENDERER_REQUIRED"]
  };
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Author Review Response Consumer",
    jm1_agentmodel: "jm1-author-review-inbound-runtime",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  return client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc"
  });
}

async function findAnyExecutionLog(client, actionTypes, idempotencyKey) {
  for (const actionType of actionTypes) {
    const found = await findExecutionLog(client, actionType, idempotencyKey);
    if (found) return found;
  }
  return null;
}

async function findRecommendationSendEvidence(client, diagnosticId) {
  const safeId = escapeODataText(diagnosticId);
  return client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter:
      `jm1_sourcerecordid eq '${safeId}' and (` +
      "jm1_actiontype eq 'AUTHOR_RESPONSE_SENT' or " +
      "jm1_actiontype eq 'EDITORIAL_RECOMMENDATION_LETTER_REPLACEMENT_SENT'" +
      ")",
    $orderby: "createdon desc"
  });
}

async function writeStateLog(client, { state, gateId, inboundMessageId, idempotencyKey, description, failed = false }) {
  return writeLog(client, {
    actionType: `AUTHOR_INBOUND_MESSAGE_${state}`,
    name: `AUTHOR_INBOUND_MESSAGE_${state} - ${gateId}`,
    description:
      `${description} State=${state}; inboundMessageId=${inboundMessageId}; monitoredMailbox=${PUBLISHING_MAILBOX}; ` +
      `Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId,
    failed
  });
}

async function writePackageStateLog(client, { state, diagnosticId, inboundMessageId, idempotencyKey, description, failed = false }) {
  return writeLog(client, {
    actionType: `AUTHOR_PACKAGE_SELECTION_MESSAGE_${state}`,
    name: `AUTHOR_PACKAGE_SELECTION_MESSAGE_${state} - ${diagnosticId}`,
    description:
      `${description} State=${state}; inboundMessageId=${inboundMessageId}; monitoredMailbox=${PUBLISHING_MAILBOX}; ` +
      `Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialdiagnostic",
    sourceRecordId: diagnosticId,
    failed
  });
}

function durableInboundMessageId(reply) {
  return (
    normalizeString(reply.internetMessageId) ||
    normalizeString(reply.inboundMessageId) ||
    `${normalizeString(reply.senderAddress).toLowerCase() || "unknown"}:${normalizeString(reply.receivedDateTime) || "unknown"}`
  );
}

function compactDecisionSource(inboundMessageId) {
  const normalized = normalizeString(inboundMessageId).replace(/[<>\s]/g, "");
  return `inbound:${PUBLISHING_MAILBOX}:${normalized.slice(0, 44)}`;
}

async function loadCadenceEngine() {
  return import("../../../../lib/server/editorial-cadence-engine.ts");
}

function cadenceClassification(decision) {
  if (decision === DECISION.APPROVED) return "APPROVED";
  if (decision === DECISION.APPROVED_WITH_CORRECTIONS) return "APPROVED_WITH_CORRECTIONS";
  if (decision === DECISION.CHANGES_REQUESTED) return "CHANGES_REQUESTED";
  if (decision === DECISION.QUESTIONS_OR_REVIEW_REQUIRED) return "QUESTION_ONLY";
  if (decision === DECISION.PENDING_AMBIGUOUS) return "AMBIGUOUS";
  return null;
}

function inferCadenceStage(gate) {
  const source = `${normalizeString(gate.jm1pub_editorialapprovalgatename)} ${normalizeString(gate.jm1pub_gatecode)}`.toLowerCase();
  if (source.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (source.includes("line")) return "LINE_EDITING";
  if (source.includes("copyedit")) return "COPYEDITING";
  if (source.includes("proofread")) return "PROOFREADING";
  if (source.includes("interior") || source.includes("layout")) return "INTERIOR_LAYOUT";
  if (source.includes("cover")) return "COVER_DESIGN";
  if (source.includes("production proof")) return "PRODUCTION_PROOF";
  if (source.includes("distribution preparation")) return "DISTRIBUTION_PREPARATION";
  if (source.includes("distribution submission")) return "DISTRIBUTION_SUBMISSION";
  if (source.includes("publication launch")) return "PUBLICATION_LAUNCH";
  if (source.includes("editorial review")) return "EDITORIAL_REVIEW";
  return null;
}

function nextStageForApprovedResponse(stage) {
  return {
    EDITORIAL_REVIEW: "DEVELOPMENTAL_EDITING",
    DEVELOPMENTAL_EDITING: "LINE_EDITING",
    LINE_EDITING: "COPYEDITING",
    COPYEDITING: "PROOFREADING",
    PROOFREADING: "INTERIOR_LAYOUT",
    INTERIOR_LAYOUT: "COVER_DESIGN",
    COVER_DESIGN: "PRODUCTION_PROOF",
    PRODUCTION_PROOF: "DISTRIBUTION_PREPARATION",
    DISTRIBUTION_PREPARATION: "DISTRIBUTION_SUBMISSION",
    DISTRIBUTION_SUBMISSION: "PUBLICATION_LAUNCH"
  }[stage] || stage;
}

async function defaultResolveAuthorResponseCadenceContext(_client, { gate, reply, classification, receivedAt }) {
  const responseClassification = cadenceClassification(classification);
  if (!responseClassification || responseClassification === "QUESTION_ONLY" || responseClassification === "AMBIGUOUS") return null;
  const currentStage = inferCadenceStage(gate);
  const titleId = normalizeString(gate._jm1pub_titleid_value || gate.titleId);
  const stageId = normalizeString(gate._jm1pub_editorialstageid_value || gate.stageId || gate.jm1pub_editorialapprovalgateid);
  const packageId = normalizeString(gate.jm1pub_packageid) || `${titleId || "unknown-title"}:${gate.jm1pub_editorialapprovalgateid}:author-response`;
  const artifactId = normalizeString(gate._jm1pub_deliverableartifactid_value || gate.artifactId);
  const artifactChecksum = normalizeString(gate.jm1pub_artifactchecksum || gate.artifactChecksum);
  const wordCount = Number(gate.jm1pub_wordcount || gate.wordCount);
  const bookType = normalizeString(gate.jm1pub_booktype || gate.bookType);
  const complexityScoreRaw = gate.jm1pub_complexityscore ?? gate.complexityScore;
  const complexityFactorsRaw = gate.jm1pub_complexityfactors ?? gate.complexityFactors ?? "";
  const complexityFactors = Array.isArray(complexityFactorsRaw)
    ? complexityFactorsRaw
    : normalizeString(complexityFactorsRaw).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  const assignedBy = normalizeString(gate.jm1pub_complexityassignedby || gate.complexityAssignedBy);
  const assignedAt = normalizeString(gate.jm1pub_complexityassignedat || gate.complexityAssignedAt);
  if (!currentStage || !titleId || !stageId || !artifactId || !artifactChecksum || !Number.isFinite(wordCount) || !bookType || !assignedBy || !assignedAt) {
    return null;
  }
  return {
    titleId,
    stageId,
    packageId,
    currentStage,
    stage: currentStage,
    nextStageIfApproved: nextStageForApprovedResponse(currentStage),
    stageCompletedAt: receivedAt,
    now: receivedAt,
    manuscript: {
      artifactId,
      artifactChecksum,
      wordCount,
      countedAt: normalizeString(gate.jm1pub_wordcountcountedat || gate.countedAt) || receivedAt,
      countMethod: normalizeString(gate.jm1pub_wordcountmethod || gate.countMethod) || "GOVERNED_STAGE_ENTRY_ARTIFACT_COUNT"
    },
    bookType,
    complexity: {
      complexityScore: complexityScoreRaw === undefined || complexityScoreRaw === null || complexityScoreRaw === "" ? undefined : Number(complexityScoreRaw),
      complexityFactors,
      assignedBy,
      assignedAt
    },
    priorAuthorPackageDeliveredAt: normalizeString(gate.jm1pub_priorauthorpackagedeliveredat || gate.priorAuthorPackageDeliveredAt) || null,
    responseClassification
  };
}

async function recordAuthorResponseCadenceRestart(client, gate, reply, classification, receivedAt, idempotencyKey, deps = {}) {
  const responseClassification = cadenceClassification(classification);
  if (!responseClassification || responseClassification === "QUESTION_ONLY" || responseClassification === "AMBIGUOUS") {
    return { action: "NO_CADENCE_RESTART", reason: responseClassification || "CLASSIFICATION_NOT_CADENCE_ELIGIBLE" };
  }
  const resolver = deps.resolveAuthorResponseCadenceContext || defaultResolveAuthorResponseCadenceContext;
  const context = await resolver(client, { gate, reply, classification, receivedAt, idempotencyKey });
  if (!context) {
    const logId = await writeLog(client, {
      actionType: "AUTHOR_RESPONSE_CADENCE_RESTART_BLOCKED",
      name: `AUTHOR_RESPONSE_CADENCE_RESTART_BLOCKED - ${gate.jm1pub_editorialapprovalgateid}`,
      description:
        `Cadence restart blocked because canonical calculation evidence is incomplete; classification=${classification}; ` +
        `productionProgression=0; workerExecutionAuthorized=0; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gate.jm1pub_editorialapprovalgateid,
      failed: true
    });
    return { action: "CADENCE_RESTART_BLOCKED", reason: "CANONICAL_CALCULATION_EVIDENCE_INCOMPLETE", executionLogIds: [logId] };
  }
  try {
    const engine = deps.cadenceEngine || (await loadCadenceEngine());
    const result = engine.applyAuthorResponseCadenceRestart(context);
    if (result.action !== "CADENCE_RESTARTED") return result;
    const payload = engine.buildEditorialCadencePersistencePayload(result.schedule);
    const logId = await writeLog(client, {
      actionType: "AUTHOR_RESPONSE_CADENCE_RESTARTED",
      name: `AUTHOR_RESPONSE_CADENCE_RESTARTED - ${gate.jm1pub_editorialapprovalgateid}`,
      description:
        `Editorial cadence restarted under ${payload.policyVersion}; stage=${payload.stage}; status=${payload.status}; ` +
        `waitingOn=${payload.waitingOn}; earliestReleaseAt=${payload.earliestReleaseAt}; scheduledReleaseAt=${payload.scheduledReleaseAt}; ` +
        `nextAutomaticAction=${payload.nextAutomaticAction}; productionProgression=0; workerExecutionAuthorized=0; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gate.jm1pub_editorialapprovalgateid
    });
    return { ...result, persistencePayload: payload, executionLogIds: [logId] };
  } catch (error) {
    const reason = normalizeString(error.reason || error.code || error.safeCode || error.message) || "CADENCE_CALCULATION_FAILED";
    const logId = await writeLog(client, {
      actionType: "AUTHOR_RESPONSE_CADENCE_RESTART_BLOCKED",
      name: `AUTHOR_RESPONSE_CADENCE_RESTART_BLOCKED - ${gate.jm1pub_editorialapprovalgateid}`,
      description:
        `Cadence restart failed closed; reason=${reason}; classification=${classification}; ` +
        `productionProgression=0; workerExecutionAuthorized=0; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gate.jm1pub_editorialapprovalgateid,
      failed: true
    });
    return { action: "CADENCE_RESTART_BLOCKED", reason, executionLogIds: [logId] };
  }
}

async function findOpenAuthorReviewGates(client, maxGates) {
  return client.list("jm1pub_editorialapprovalgates", {
    $select:
      "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_awaitingsince,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon",
    $filter: "jm1pub_authordecisionon eq null",
    $orderby: "modifiedon desc",
    $top: String(Math.min(Math.max(Number(maxGates || 10), 1), 25))
  });
}

async function findOpenPackageSelectionDiagnostics(client, maxDiagnostics) {
  const rows = await client.list("jm1pub_editorialdiagnostics", {
    $select:
      "jm1pub_editorialdiagnosticid,jm1pub_name,jm1pub_recommendedpackage,jm1_m6alternatepackagecode,jm1_authordraftsubject,jm1_authordraftsendstatus,jm1_authordraftpreparedon,jm1_authordraftapprovalnotes,_jm1pub_publishingintake_value,_jm1pub_authorcontact_value,modifiedon",
    $filter: "jm1pub_recommendedpackage ne null and jm1_authordraftpreparedon ne null",
    $orderby: "modifiedon desc",
    $top: String(Math.min(Math.max(Number(maxDiagnostics || 10), 1), 25))
  });
  const open = [];
  for (const row of rows) {
    const status = normalizeString(row.jm1_authordraftsendstatus).toUpperCase();
    const notes = normalizeString(row.jm1_authordraftapprovalnotes);
    if (status === "AUTHOR_RESPONSE_SENT" || /Awaiting Author Response/i.test(notes)) {
      open.push(row);
      continue;
    }
    const diagnosticId = normalizeString(row.jm1pub_editorialdiagnosticid);
    if (diagnosticId && await findRecommendationSendEvidence(client, diagnosticId)) open.push(row);
  }
  return open.slice(0, Math.min(Math.max(Number(maxDiagnostics || 10), 1), 25));
}

function packageSelectionSubjectProbe(diagnostic) {
  return normalizeString(diagnostic.jm1_authordraftsubject) || "My Publishing Package Selection";
}

function packageSelectionSubjectProbes(diagnostic) {
  return [...new Set([
    packageSelectionSubjectProbe(diagnostic),
    "My Publishing Package Selection"
  ].filter(Boolean))];
}

function packageSelectionAfterIso(diagnostic) {
  return normalizeString(diagnostic.jm1_authordraftpreparedon || diagnostic.modifiedon) || "2026-01-01T00:00:00Z";
}

function packageSelectionConfidence(classification) {
  if (/PACKAGE_SELECTED$/.test(classification)) return "HIGH";
  if (classification === "UNCLASSIFIED") return "LOW";
  return "MEDIUM";
}

async function processPackageSelectionReply(client, diagnostic, deps, triggerSource) {
  const diagnosticId = normalizeString(diagnostic.jm1pub_editorialdiagnosticid);
  if (!diagnosticId) return { diagnosticId: "", outcome: "DIAGNOSTIC_ID_MISSING" };
  if (!captureEnabled()) return { diagnosticId, outcome: "CAPTURE_DISABLED", detail: "JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED" };

  const subjectProbes = packageSelectionSubjectProbes(diagnostic);
  let reply = null;
  let subjectContains = subjectProbes[0] || "My Publishing Package Selection";
  for (const probe of subjectProbes) {
    const candidate = await (deps.readPackageSelectionReply || deps.readReply || readPublishingMailboxReply)(
      {
        subjectContains: probe,
        afterIso: packageSelectionAfterIso(diagnostic),
        allowInternalPublishingSelection: true
      },
      deps
    );
    if (candidate.ok && candidate.found) {
      reply = candidate;
      subjectContains = probe;
      break;
    }
    reply = candidate;
  }
  if (!reply.ok || !reply.found) return { diagnosticId, outcome: "NO_PACKAGE_SELECTION_REPLY_FOUND", detail: reply.reason || reply.code || "no_match" };
  const targetDiagnosticId = normalizeString(deps.targetDiagnosticId).toLowerCase();
  if (reply.selfAddressedPublishingSelection === true && (!targetDiagnosticId || targetDiagnosticId !== diagnosticId.toLowerCase())) {
    return {
      diagnosticId,
      outcome: "SELF_ADDRESSED_SELECTION_REQUIRES_EXACT_DIAGNOSTIC_TARGET",
      detail: "self_addressed_internal_validation_reply_not_applied_without_exact_target"
    };
  }

  const inboundMessageId = durableInboundMessageId(reply);
  const idempotencyKey = stablePackageSelectionIdempotencyKey(diagnosticId, inboundMessageId);
  const existing = await findAnyExecutionLog(
    client,
    [
      "AUTHOR_PACKAGE_SELECTION_MESSAGE_COMPLETED",
      "AUTHOR_RESPONSE_CAPTURED",
      "PACKAGE_SELECTED",
      "AUTHOR_PACKAGE_SELECTION_REQUIRES_PUBLISHER_REVIEW"
    ],
    idempotencyKey
  );
  if (existing) return { diagnosticId, outcome: "IDEMPOTENT", detail: "package_selection_already_processed", executionLogIds: [existing.jm1_executionlogid] };

  const receivedAt = normalizeString(reply.receivedDateTime) || new Date().toISOString();
  const classified = classifyPackageReply(reply.bodyText || "");
  const classification = classified.classification;
  const selectedPackage = classified.selectedPackage;
  const confidence = packageSelectionConfidence(classification);

  const discoveredLog = await writePackageStateLog(client, {
    state: RESPONSE_STATES.DISCOVERED,
    diagnosticId,
    inboundMessageId,
    idempotencyKey,
    description: `Package-selection author response discovered by ${triggerSource}; internetMessageId=${reply.internetMessageId || "unknown"}; conversation=${reply.conversationId || "unknown"}.`
  });
  const correlatedLog = await writePackageStateLog(client, {
    state: RESPONSE_STATES.CORRELATED,
    diagnosticId,
    inboundMessageId,
    idempotencyKey,
    description: `Package-selection response correlated to Stage 0 recommendation by subject/body context; subjectProbe="${subjectContains}".`
  });
  const classifiedLog = await writePackageStateLog(client, {
    state: RESPONSE_STATES.CLASSIFIED,
    diagnosticId,
    inboundMessageId,
    idempotencyKey,
    description: `Package-selection response classified as ${classification}; confidence=${confidence}; clarificationRequired=${selectedPackage ? "NO" : "YES"}.`,
    failed: !selectedPackage
  });
  const capturedLog = await writeLog(client, {
    actionType: "AUTHOR_RESPONSE_CAPTURED",
    name: `AUTHOR_RESPONSE_CAPTURED - ${diagnosticId}`,
    description:
      `Author package-selection response captured; source=Stage0Recommendation; message=${inboundMessageId}; received=${receivedAt}; ` +
      `classification=${classification}; selectedPackage=${selectedPackage?.code || "none"}; confidence=${confidence}; ` +
      `selfAddressedPublishingSelection=${reply.selfAddressedPublishingSelection === true ? "YES" : "NO"}; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialdiagnostic",
    sourceRecordId: diagnosticId
  });

  if (!selectedPackage) {
    const reviewLog = await writeLog(client, {
      actionType: "AUTHOR_PACKAGE_SELECTION_REQUIRES_PUBLISHER_REVIEW",
      name: `AUTHOR_PACKAGE_SELECTION_REQUIRES_PUBLISHER_REVIEW - ${diagnosticId}`,
      description: `Package-selection reply reached the monitored mailbox but classification=${classification}; no package persisted; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialdiagnostic",
      sourceRecordId: diagnosticId,
      failed: true
    });
    return {
      diagnosticId,
      outcome: "PACKAGE_SELECTION_REVIEW_REQUIRED",
      detail: classification,
      selectedPackage: null,
      executionLogIds: [discoveredLog, correlatedLog, classifiedLog, capturedLog, reviewLog]
    };
  }

  await client.patch("jm1pub_editorialdiagnostics", diagnosticId, {
    jm1_authordraftapprovalnotes:
      `Author selected ${selectedPackage.name}. Package selection captured from monitored publishing mailbox. ` +
      `Message received ${receivedAt}. Awaiting Author Response is resolved; downstream onboarding/agreement continuation is eligible.`
  });
  const selectedLog = await writeLog(client, {
    actionType: "PACKAGE_SELECTED",
    name: `PACKAGE_SELECTED - ${diagnosticId}`,
    description:
      `Package selected from real author response. selectedPackage=${selectedPackage.name} (${selectedPackage.code}); classification=${classification}; ` +
      `received=${receivedAt}; manualPackageSelectionMutation=0; unnecessaryJackieGate=0; unnecessaryAuthorClarification=0; downstreamResumeRequired=YES; ` +
      `Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialdiagnostic",
    sourceRecordId: diagnosticId
  });
  const offerContext = await (deps.resolvePackageAcceptanceOfferContext || (async () => ({})))({
    diagnostic,
    reply,
    selectedPackage,
    idempotencyKey
  });
  const packageAcceptedEvent = buildPackageAcceptedEvent({
    diagnosticId,
    authorId: normalizeString(diagnostic._jm1pub_authorcontact_value),
    titleId: diagnosticId,
    title: normalizeString(diagnostic.jm1pub_name),
    intakeReferenceCode: normalizeString(diagnostic.jm1_intakereferencecode),
    selectedPackageCode: selectedPackage.code,
    decisionSource: `inbound:${PUBLISHING_MAILBOX}`,
    decisionChannel: "MICROSOFT_365_OUTLOOK",
    decisionTimestamp: receivedAt,
    supportingCommunicationId: inboundMessageId,
    recommendationContext: {
      recommendedPackage: normalizeString(diagnostic.jm1pub_recommendedpackage),
      authorDraftSubject: normalizeString(diagnostic.jm1_authordraftsubject)
    },
    idempotencyKey
  });
  const packageAcceptedLog = await writeLog(client, {
    actionType: "PACKAGE_ACCEPTED",
    name: `PACKAGE_ACCEPTED - ${diagnosticId}`,
    description:
      `Package acceptance event established; selectedPackage=${selectedPackage.name} (${selectedPackage.code}); ` +
      `decisionChannel=MICROSOFT_365_OUTLOOK; sourceMailbox=${PUBLISHING_MAILBOX}; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialdiagnostic",
    sourceRecordId: diagnosticId
  });
  const offerPreview = buildOfferPreview({
    packageAcceptedEvent,
    priorEligibleTitleCount: offerContext.priorEligibleTitleCount,
    referralCreditsAvailablePercent: offerContext.referralCreditsAvailablePercent,
    referralCreditsSelectedPercent: offerContext.referralCreditsSelectedPercent,
    referralLedger: offerContext.referralLedger
  });
  let offerPreviewLog = null;
  let responsePreviewLog = null;
  let responsePreview = null;
  if (offerPreview.ok) {
    offerPreviewLog = await writeLog(client, {
      actionType: "OFFER_PREVIEW_GENERATED",
      name: `OFFER_PREVIEW_GENERATED - ${diagnosticId}`,
      description:
        `Canonical Author Offer Engine generated ${offerPreview.pricingState}; package=${offerPreview.offer.packageCode}; ` +
        `loyalty=${offerPreview.offer.returningAuthorPercent}; referralAvailable=${offerPreview.offer.referralCreditsAvailablePercent}; ` +
        `referralApplied=${offerPreview.offer.referralCreditsAppliedPercent}; adjustedPrincipal=${offerPreview.offer.adjustedPackagePrincipalFormatted}; ` +
        `pricingRuleVersion=${offerPreview.offer.pricingRuleVersion}; liveAuthorSend=0; StripeWrite=0; agreementRegeneration=0; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialdiagnostic",
      sourceRecordId: diagnosticId
    });
    responsePreview = renderPaymentOptionsResponsePreview(offerPreview);
    responsePreviewLog = await writeLog(client, {
      actionType: "RESPONSE_PREVIEW",
      name: `RESPONSE_PREVIEW - ${diagnosticId}`,
      description:
        `Payment-options response preview prepared through ${PUBLISHING_MAILBOX}; renderer=${responsePreview.rendererAuthority}; ` +
        `state=${responsePreview.pricingState}; liveAutoSend=0; referralBalanceMutation=0; StripeWrite=0; agreementRegeneration=0; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialdiagnostic",
      sourceRecordId: diagnosticId
    });
  }
  const completedLog = await writePackageStateLog(client, {
    state: RESPONSE_STATES.COMPLETED,
    diagnosticId,
    inboundMessageId,
    idempotencyKey,
    description: "Package-selection response capture completed; awaiting-response state resolved. Downstream continuation remains governed by the commercial/onboarding runtime."
  });
  return {
    diagnosticId,
    outcome: "PACKAGE_SELECTED",
    detail: classification,
    selectedPackage,
    confidence,
    receivedDateTime: receivedAt,
    processingState: RESPONSE_STATES.COMPLETED,
    packageAcceptedEvent,
    offerPreview,
    responsePreview,
    executionLogIds: [discoveredLog, correlatedLog, classifiedLog, capturedLog, selectedLog, packageAcceptedLog, offerPreviewLog, responsePreviewLog, completedLog].filter(Boolean)
  };
}

function subjectProbeForGate(gate) {
  const name = normalizeString(gate.jm1pub_editorialapprovalgatename);
  const gateCode = normalizeString(gate.jm1pub_gatecode);
  const source = `${name} ${gateCode}`.toLowerCase();
  if (source.includes("cover")) return "Cover Design Review";
  if (source.includes("proofread")) return "Proofreading Review Package";
  if (source.includes("copyedit")) return "Copyediting Review Package";
  if (source.includes("line edit")) return "Line Editing Review Package";
  if (source.includes("developmental")) return "Developmental Review";
  return name.replace(/^A\d+\s*/i, "").replace(/\s+-\s+.*$/, "").slice(0, 80);
}

async function processGateReply(client, gate, deps, triggerSource) {
  const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid);
  if (!captureEnabled()) return { gateId, outcome: "CAPTURE_DISABLED", detail: "JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED" };

  const subjectContains = subjectProbeForGate(gate);
  const afterIso = normalizeString(gate.modifiedon) || "2026-01-01T00:00:00Z";
  const reply = await (deps.readReply || readPublishingMailboxReply)({ subjectContains, afterIso }, deps);
  if (!reply.ok || !reply.found) return { gateId, outcome: "NO_REPLY_FOUND", detail: reply.reason || reply.code || "no_match" };

  const identity = validateAuthorIdentity(gate, reply);
  if (!identity.ok) return { gateId, outcome: "HELD_IDENTITY_VALIDATION", detail: identity.reason, processingState: RESPONSE_STATES.BLOCKED };
  const correlation = validateReplyCorrelation(gate, reply, subjectContains);
  if (!correlation.ok) return { gateId, outcome: "HELD_CORRELATION_VALIDATION", detail: correlation.reason, processingState: RESPONSE_STATES.BLOCKED };

  const inboundMessageId = durableInboundMessageId(reply);
  const idempotencyKey = stableIdempotencyKey(gateId, inboundMessageId);
  const existing = await findAnyExecutionLog(
    client,
    [
      "AUTHOR_INBOUND_MESSAGE_COMPLETED",
      "AUTHOR_RESPONSE_CAPTURED",
      "AUTHOR_APPROVAL_PERSISTED",
      "AUTHOR_APPROVED_WITH_CORRECTIONS_PERSISTED",
      "AUTHOR_CORRECTIONS_REQUESTED",
      "AUTHOR_CHANGES_REQUESTED",
      "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW",
      "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED"
    ],
    idempotencyKey
  );
  if (existing) return { gateId, outcome: "IDEMPOTENT", detail: "inbound_response_already_processed", executionLogIds: [existing.jm1_executionlogid] };

  const discoveredLog = await writeStateLog(client, {
    state: RESPONSE_STATES.DISCOVERED,
    gateId,
    inboundMessageId,
    idempotencyKey,
    description: `Candidate author response discovered by ${triggerSource}; internetMessageId=${reply.internetMessageId || "unknown"}; conversation=${reply.conversationId || "unknown"}.`
  });
  const claimedLog = await writeStateLog(client, {
    state: RESPONSE_STATES.CLAIMED,
    gateId,
    inboundMessageId,
    idempotencyKey,
    description: "Inbound response claim recorded before classification. Duplicate listener deliveries use the same immutable message identity."
  });
  const correlatedLog = await writeStateLog(client, {
    state: RESPONSE_STATES.CORRELATED,
    gateId,
    inboundMessageId,
    idempotencyKey,
    description: `Inbound response correlated with CORRELATED_HIGH_CONFIDENCE; subjectProbe="${subjectContains}".`
  });
  const decisionResolution = resolveAuthorReviewDecision(gate, reply);
  const classification = decisionResolution.classification;
  const receivedAt = normalizeString(reply.receivedDateTime) || new Date().toISOString();
  const source = compactDecisionSource(inboundMessageId);
  const manualRecovery = isManualRecoveryGate(gate);
  const authorNotes = preserveAuthorNotes(reply.bodyText || "");
  const acknowledgement = evaluateAcknowledgementPolicy(deps.acknowledgement || {});
  const classifiedLog = await writeStateLog(client, {
    state: RESPONSE_STATES.CLASSIFIED,
    gateId,
    inboundMessageId,
    idempotencyKey,
    description:
      `Author response classified as ${classification}; messageIntents=${decisionResolution.messageIntents.join("|") || "none"}; ` +
      `supportActions=${decisionResolution.supportActions.join("|") || "none"}; founderAuthorityCorrection=${decisionResolution.founderAuthorityCorrection ? "YES" : "NO"}; ` +
      `originalClassification=${decisionResolution.originalClassification || "none"}; correctedClassification=${decisionResolution.correctedClassification || "none"}; trigger=${triggerSource}.`,
    failed: classification === "AMBIGUOUS"
  });
  const correlationLog = await writeLog(client, {
    actionType: "AUTHOR_RESPONSE_INBOUND_CORRELATED",
    name: `AUTHOR_RESPONSE_INBOUND_CORRELATED - ${gateId}`,
    description:
      `Inbound author response received in ${PUBLISHING_MAILBOX}; classification=${classification}; message=${inboundMessageId}; trigger=${triggerSource}; ` +
      `conversation=${reply.conversationId || "unknown"}; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId
  });
  const capturedLog = await writeLog(client, {
    actionType: "AUTHOR_RESPONSE_CAPTURED",
    name: `AUTHOR_RESPONSE_CAPTURED - ${gateId}`,
    description:
      `Author response captured; author=${identity.sender}; title=${gate._jm1pub_titleid_value || gate.titleId || "unknown"}; ` +
      `package=${gate.jm1pub_packageid || reply.packageId || "unknown"}; decisionRequest=${gate.jm1pub_decisionrequestid || reply.decisionRequestId || "unknown"}; ` +
      `message=${inboundMessageId}; received=${receivedAt}; classification=${classification}; notesReference=jm1pub_authorresponsesummary; ` +
      `awaitingState=CLOSE_MATCHING_RESPONSE_WAIT; manualRecovery=${manualRecovery ? "YES" : "NO"}; correlation=${correlation.mode}; ` +
      `messageIntents=${decisionResolution.messageIntents.join("|") || "none"}; supportActions=${decisionResolution.supportActions.join("|") || "none"}; ` +
      `founderAuthorityCorrection=${decisionResolution.founderAuthorityCorrection ? "YES" : "NO"}; correctionSource=${decisionResolution.correctionSource || "none"}; ` +
      `originalClassification=${decisionResolution.originalClassification || "none"}; correctedClassification=${decisionResolution.correctedClassification || "none"}; ` +
      `acknowledgementPolicy=${acknowledgement.status}; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId
  });

  const code = decisionCode(classification);
  if (code !== null) {
    await client.patch("jm1pub_editorialapprovalgates", gateId, {
      jm1pub_authordecision: code,
      jm1pub_authordecisionon: receivedAt,
      jm1pub_authordecisionsource: source,
      jm1pub_authorresponsesummary: authorNotes,
      jm1pub_awaitingsince: null
    });
    const persistedLog = await writeStateLog(client, {
      state: RESPONSE_STATES.PERSISTED,
      gateId,
      inboundMessageId,
      idempotencyKey,
      description: `${decisionSummary(classification)} Matching response wait closed only for this gate. Production stage progression remains separately governed.`
    });
    const decisionLog = await writeLog(client, {
      actionType: decisionActionType(classification),
      name: `${decisionActionType(classification)} - ${gateId}`,
      description:
        `${decisionSummary(classification)} Decision=${classification}; author=${identity.sender}; manualRecovery=${manualRecovery ? "YES" : "NO"}; ` +
        `messageIntents=${decisionResolution.messageIntents.join("|") || "none"}; supportActions=${decisionResolution.supportActions.join("|") || "none"}; ` +
        `founderAuthorityCorrection=${decisionResolution.founderAuthorityCorrection ? "YES" : "NO"}; originalClassification=${decisionResolution.originalClassification || "none"}; ` +
        `correctedClassification=${decisionResolution.correctedClassification || "none"}; productionProgression=0; acknowledgementPolicy=${acknowledgement.status}; Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gateId
    });
    const cadenceRestart = await recordAuthorResponseCadenceRestart(client, gate, reply, classification, receivedAt, idempotencyKey, deps);
    const completedLog = await writeStateLog(client, {
      state: RESPONSE_STATES.COMPLETED,
      gateId,
      inboundMessageId,
      idempotencyKey,
      description:
        "Inbound listener completed durable response capture, classification, notes persistence, awaiting-state closure, cadence restart evaluation, and execution logging. It did not call the transition handler."
    });
    return {
      gateId,
      outcome: decisionOutcome(classification),
      detail: manualRecovery ? "manual_recovery_capture_complete_no_production_progression" : "response_capture_complete",
      processingState: RESPONSE_STATES.COMPLETED,
      acknowledgementPolicy: acknowledgement.status,
      productionProgression: 0,
      cadenceRestart,
      manualRecovery,
      messageIntents: decisionResolution.messageIntents,
      supportActions: decisionResolution.supportActions,
      founderAuthorityCorrection: decisionResolution.founderAuthorityCorrection,
      originalClassification: decisionResolution.originalClassification,
      correctedClassification: decisionResolution.correctedClassification,
      executionLogIds: [
        discoveredLog,
        claimedLog,
        correlatedLog,
        classifiedLog,
        correlationLog,
        capturedLog,
        persistedLog,
        decisionLog,
        ...(cadenceRestart.executionLogIds || []),
        completedLog
      ]
    };
  }

  const terminalState = classification === DECISION.ACKNOWLEDGMENT_ONLY ? RESPONSE_STATES.COMPLETED : RESPONSE_STATES.BLOCKED;
  const terminalLog = await writeStateLog(client, {
    state: terminalState,
    gateId,
    inboundMessageId,
    idempotencyKey,
    description:
      classification === DECISION.ACKNOWLEDGMENT_ONLY
        ? "Acknowledgment-only response preserved; A5 remains open and no approval event is emitted."
        : `Classification ${classification} requires publisher review before gate movement.`,
    failed: classification !== DECISION.ACKNOWLEDGMENT_ONLY
  });
  const reviewLog = await writeLog(client, {
    actionType: classification === DECISION.ACKNOWLEDGMENT_ONLY ? "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED" : "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW",
    name: `${classification === DECISION.ACKNOWLEDGMENT_ONLY ? "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED" : "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW"} - ${gateId}`,
    description: `Author response reached monitored mailbox but classification=${classification}; publisher review required; manualRecovery=${manualRecovery ? "YES" : "NO"}; productionProgression=0; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId,
    failed: classification !== DECISION.ACKNOWLEDGMENT_ONLY
  });
  return {
    gateId,
    outcome: classification === DECISION.ACKNOWLEDGMENT_ONLY ? "ACKNOWLEDGMENT_RECORDED" : "PUBLISHER_REVIEW_REQUIRED",
    detail: classification,
    processingState: terminalState,
    acknowledgementPolicy: acknowledgement.status,
    productionProgression: 0,
    manualRecovery,
    messageIntents: decisionResolution.messageIntents,
    supportActions: decisionResolution.supportActions,
    founderAuthorityCorrection: decisionResolution.founderAuthorityCorrection,
    originalClassification: decisionResolution.originalClassification,
    correctedClassification: decisionResolution.correctedClassification,
    executionLogIds: [discoveredLog, claimedLog, correlatedLog, classifiedLog, correlationLog, capturedLog, terminalLog, reviewLog]
  };
}

async function runAuthorReviewResponseConsumer(input = {}, deps = {}) {
  const triggerSource = input.triggerSource || "SCHEDULED_WORKER";
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const gates = await (deps.findGates || findOpenAuthorReviewGates)(client, input.maxGates || 10);
  const targetDiagnosticId = normalizeString(input.targetDiagnosticId);
  const packageDiagnostics = (await (deps.findPackageSelectionDiagnostics || findOpenPackageSelectionDiagnostics)(client, input.maxPackageSelections || 10))
    .filter((diagnostic) => !targetDiagnosticId || normalizeString(diagnostic.jm1pub_editorialdiagnosticid).toLowerCase() === targetDiagnosticId.toLowerCase());
  const results = [];
  for (const gate of gates) results.push(await processGateReply(client, gate, deps, triggerSource));
  const packageSelectionResults = [];
  const packageDeps = { ...deps, targetDiagnosticId };
  for (const diagnostic of packageDiagnostics) packageSelectionResults.push(await processPackageSelectionReply(client, diagnostic, packageDeps, triggerSource));
  return {
    runtimeName: "JM1 Author Review Response Consumer",
    deploymentEnvironment: "func-jm1-diagnostic-ai-runner",
    triggerType: "Azure Functions timer",
    schedule: "0 */5 * * * *",
    monitoredMailbox: PUBLISHING_MAILBOX,
    queue: "publishing@jmerrill.one Inbox plus open Dataverse author-review gates and Stage 0 package-selection responses",
    identity: "func-jm1-diagnostic-ai-runner application identity",
    retryPolicy: "Azure Functions host retry plus idempotent Dataverse response records",
    timeout: "10 minutes host timeout target",
    deadLetterBehavior: "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW with exact blocker",
    costCategory: "Consumption/serverless timer execution",
    processed: results.filter((r) => [
      "APPROVAL_PERSISTED",
      "APPROVED_WITH_CORRECTIONS_PERSISTED",
      "CHANGES_REQUESTED_PERSISTED",
      "QUESTIONS_REQUIRING_REVIEW_PERSISTED"
    ].includes(r.outcome)).length + packageSelectionResults.filter((r) => r.outcome === "PACKAGE_SELECTED").length,
    idempotent: [...results, ...packageSelectionResults].filter((r) => r.outcome === "IDEMPOTENT").length,
    results,
    packageSelectionResults
  };
}

module.exports = {
  runAuthorReviewResponseConsumer,
  classifyAuthorReviewResponse,
  classifyAuthorReviewMessageIntents,
  resolveAuthorReviewDecision,
  stableIdempotencyKey,
  stablePackageSelectionIdempotencyKey,
  createDataverseClient,
  normalizeConfiguredSecret,
  compactDecisionSource,
  validateAuthorIdentity,
  validateReplyCorrelation,
  findOpenPackageSelectionDiagnostics,
  packageSelectionSubjectProbes,
  processPackageSelectionReply,
  evaluateAcknowledgementPolicy,
  DECISION
};
