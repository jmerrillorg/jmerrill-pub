"use strict";

const TITLE_ID = "ca68c994-fd89-f111-ab10-00224820105b";
const AUTHOR_NAME = "Atta Boateng";
const RECIPIENT = "zecatconserve@yahoo.com";
const FROM = "publishing@email.jmerrill.one";
const MAILBOX = "publishing@jmerrill.one";
const TEMPLATE_NAME = "ATTA_FINAL_TITLE_DECISION_V1";
const SUGGESTIONS = Object.freeze([
  "Thinking Yourself to Be Something",
  "When We Think We Are Something",
  "The Deception of Self-Importance"
]);
const RELAY_FALLBACK_URL = "https://func-jm1-acs-email-relay.azurewebsites.net";
const INTAKE_REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;

function clean(value) { return String(value || "").trim(); }
function blocked(code, detail, extra = {}) { return { ok: false, status: "BLOCKED", code, detail, communicationsSent: 0, ...extra }; }
function runtime() { return require("./editorialExecutionRuntime"); }
function intentStore() { return require("./communicationIntentStore"); }

function renderTitleDecisionCopy() {
  const subject = "Your Book Title: One Decision Needed";
  const body = [
    "Good day, Atta,",
    "",
    "Thank you for your recent call and voicemail checking on the status of your book. Your project is actively moving, and our editorial work is continuing.",
    "",
    "As we continue shaping the manuscript, we need your final title decision. You are welcome to provide the title you prefer, or you may select or refine one of these editorial suggestions:",
    "",
    "1. Thinking Yourself to Be Something",
    "2. When We Think We Are Something",
    "3. The Deception of Self-Importance",
    "",
    "Please reply with your preferred title or any direction you would like us to consider. This decision will help us finalize the manuscript architecture while editorial work continues.",
    "",
    "J Merrill Publishing"
  ].join("\n");
  const htmlBody = `<p>Good day, Atta,</p><p>Thank you for your recent call and voicemail checking on the status of your book. Your project is actively moving, and our editorial work is continuing.</p><p>As we continue shaping the manuscript, we need your final title decision. You are welcome to provide the title you prefer, or you may select or refine one of these editorial suggestions:</p><ol><li>Thinking Yourself to Be Something</li><li>When We Think We Are Something</li><li>The Deception of Self-Importance</li></ol><p>Please reply with your preferred title or any direction you would like us to consider. This decision will help us finalize the manuscript architecture while editorial work continues.</p><p>J Merrill Publishing</p>`;
  return { subject, body, htmlBody };
}

async function evaluateAttaTitleDecisionSend(input = {}, deps = {}) {
  if (clean(input.titleId).toLowerCase() !== TITLE_ID) return blocked("TITLE_AUTHORITY_MISMATCH", "The request does not bind the canonical Atta title ID.");
  if (!clean(input.stageId)) return blocked("STAGE_ID_REQUIRED", "The exact governed stage ID is required.");
  if (!clean(input.contactId)) return blocked("CONTACT_ID_REQUIRED", "The exact governed Atta contact ID is required.");
  if (!INTAKE_REFERENCE_PATTERN.test(clean(input.intakeReference))) return blocked("INTAKE_REFERENCE_REQUIRED", "A canonical intake reference is required.");
  const editorialRuntime = deps.client ? null : runtime();
  const client = deps.client || editorialRuntime.createDataverseClient(editorialRuntime.requireDataverseConfig(), deps);
  const [titles, stages, contacts] = await Promise.all([
    client.list("jm1pub_titles", { $select: "jm1pub_titleid,jm1pub_titlename,jm1pub_authorname", $filter: `jm1pub_titleid eq ${TITLE_ID}`, $top: "2" }),
    client.list("jm1pub_editorialstages", { $select: "jm1pub_editorialstageid,_jm1pub_titleid_value,_jm1pub_contactid_value", $filter: `jm1pub_editorialstageid eq ${clean(input.stageId)} and _jm1pub_titleid_value eq ${TITLE_ID}`, $top: "2" }),
    client.list("contacts", { $select: "contactid,fullname,emailaddress1", $filter: `contactid eq ${clean(input.contactId)}`, $top: "2" })
  ]);
  if (titles.length !== 1 || clean(titles[0].jm1pub_authorname).toLowerCase() !== AUTHOR_NAME.toLowerCase()) return blocked("AUTHOR_TITLE_AUTHORITY_MISMATCH", "The canonical title does not resolve exactly to Atta Boateng.");
  if (stages.length !== 1 || clean(stages[0]._jm1pub_contactid_value).toLowerCase() !== clean(input.contactId).toLowerCase()) return blocked("STAGE_CONTACT_AUTHORITY_MISMATCH", "The stage does not bind the supplied author contact.");
  if (contacts.length !== 1 || clean(contacts[0].fullname).toLowerCase() !== AUTHOR_NAME.toLowerCase() || clean(contacts[0].emailaddress1).toLowerCase() !== RECIPIENT) return blocked("RECIPIENT_AUTHORITY_MISMATCH", "The contact is not the governed Atta Boateng recipient.");
  return { ok: true, status: "READY", client, title: titles[0], stage: stages[0], contact: contacts[0], suggestions: [...SUGGESTIONS], copy: renderTitleDecisionCopy(), communicationsSent: 0 };
}

async function sendAttaTitleDecision(input = {}, deps = {}) {
  const evaluated = await evaluateAttaTitleDecisionSend(input, deps);
  if (!evaluated.ok) return evaluated;
  const client = evaluated.client;
  const intent = {
    titleId: TITLE_ID, titleName: "Untitled", authorId: clean(input.contactId), communicationType: TEMPLATE_NAME,
    workstream: clean(input.stageId), recipient: RECIPIENT, attachments: []
  };
  const reserveIntent = deps.reserveCommunicationIntent || intentStore().reserveCommunicationIntent;
  const markSent = deps.markCommunicationSent || intentStore().markCommunicationSent;
  const reserve = await reserveIntent(client, intent);
  if (reserve.status !== "RESERVED") return { ok: true, status: reserve.status, communicationsSent: 0, semanticIdempotencyKey: reserve.semanticIdempotencyKey, communicationRecordId: reserve.communicationRecordId };
  const payload = {
    messageType: "APPROVED_AUTHOR_RESPONSE", diagnosticId: clean(input.stageId), intakeReferenceCode: clean(input.intakeReference),
    authorEmail: RECIPIENT, to: [RECIPIENT], authorName: AUTHOR_NAME, projectTitle: "Untitled",
    ...evaluated.copy, templateName: TEMPLATE_NAME, templateVersion: "1.0", attachments: [],
    communicationObservability: { from: FROM, replyTo: MAILBOX, cc: [MAILBOX], dataverseCommunicationRecordRequired: true, publishingMailboxCopyRequired: true },
    approvedBy: "founder-authority:parallel-workstream-correction", approvedOn: new Date().toISOString(),
    futureSendRequiresInternalCopy: true, futureSendRequiresDataverseLog: true,
    internalVisibilityMailbox: MAILBOX, replyTo: MAILBOX, cc: [MAILBOX], bcc: [],
    idempotencyKey: reserve.semanticIdempotencyKey, communicationRecordId: reserve.communicationRecordId
  };
  let relayResult;
  if (deps.sendRelay) relayResult = await deps.sendRelay(payload);
  else {
    const relayUrl = clean(process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || RELAY_FALLBACK_URL).replace(/\/$/, "");
    const relayKey = process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY;
    if (!relayKey) return blocked("RELAY_KEY_MISSING", "The governed ACS relay key is unavailable.", { communicationRecordId: reserve.communicationRecordId });
    const response = await (deps.fetchImpl || fetch)(`${relayUrl}/api/send-approved-author-response`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-jm1-relay-key": relayKey }, body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || (!body?.accepted && !body?.providerMessageId)) return blocked("RELAY_SEND_FAILED", body?.reason || body?.code || `HTTP_${response.status}`, { relayResponse: body });
    relayResult = { status: body.deliveryStatus === "ALREADY_DELIVERED" ? "ALREADY_DELIVERED" : "SENT", ...body };
  }
  if (relayResult.status !== "SENT" && relayResult.status !== "ALREADY_DELIVERED") return blocked("RELAY_SEND_FAILED", "Relay did not prove delivery.", { relayResult });
  await markSent(client, {
    ...intent, semanticIdempotencyKey: reserve.semanticIdempotencyKey, communicationRecordId: reserve.communicationRecordId,
    providerMessageId: relayResult.providerMessageId, sentAt: relayResult.sentAt, artifactChecksums: [], artifactManifest: [], observability: relayResult.observability
  });
  return {
    ok: true, status: relayResult.status, communicationsSent: relayResult.status === "SENT" ? 1 : 0,
    providerMessageId: relayResult.providerMessageId, sentAt: relayResult.sentAt, recipient: RECIPIENT,
    from: FROM, replyTo: MAILBOX, cc: [MAILBOX], semanticIdempotencyKey: reserve.semanticIdempotencyKey,
    communicationRecordId: reserve.communicationRecordId, suggestions: [...SUGGESTIONS]
  };
}

module.exports = { AUTHOR_NAME, FROM, MAILBOX, RECIPIENT, SUGGESTIONS, TEMPLATE_NAME, TITLE_ID, evaluateAttaTitleDecisionSend, renderTitleDecisionCopy, sendAttaTitleDecision };
