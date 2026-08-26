"use strict";

/**
 * Read-only Microsoft Graph reader for the publishing@jmerrill.one mailbox.
 *
 * Scope, by design, not merely by configuration:
 *   - Only ever queries the hardcoded PUBLISHING_MAILBOX address — never a
 *     caller-supplied mailbox.
 *   - Only ever reads the Inbox folder.
 *   - GET only. No code path in this module performs PATCH, POST, or DELETE
 *     against Graph. Mail cannot be sent, deleted, moved, or marked
 *     read/unread from this module — those operations are simply absent.
 *   - The default reply reader never ingests attachments. Attachment reads
 *     require an explicit caller path in this module and remain GET-only.
 *   - Never logs or returns the raw Graph response, headers, or tokens.
 *
 * Live read requires JM1_PUBLISHING_MAIL_READ_ENABLED="true", checked fresh
 * on every call — never cached.
 *
 * Recommended Graph permission: application Mail.Read, constrained via an
 * Exchange Online Application Access Policy
 * (New-ApplicationAccessPolicy -AccessRight RestrictAccess
 *  -AppId <managed identity app id> -PolicyScopeGroupId <mail-enabled
 *  security group containing only publishing@jmerrill.one>) so the
 * managed identity's Mail.Read grant cannot reach any other mailbox in
 * the tenant. This module cannot enforce that restriction itself — it is
 * an Exchange Online / Entra configuration, not application code — but
 * the module's own query is hardcoded to this one address regardless.
 */

const { createHash } = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");

const GATE_NAME = "JM1_PUBLISHING_MAIL_READ_ENABLED";
const PUBLISHING_MAILBOX = "publishing@jmerrill.one";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MAX_MESSAGES_FETCHED = 25;
const FILE_ATTACHMENT_TYPE = "#microsoft.graph.fileAttachment";
const INTERNAL_PUBLISHING_SENDERS = Object.freeze([
  "publishing@email.jmerrill.one",
  "publishing@jmerrill.one"
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PUBLISHING_MAILBOX_READ_BLOCKED", reason, ...extra };
}

function normalizeRecipients(value) {
  return Array.isArray(value)
    ? value.map((r) => normalizeString(r?.emailAddress?.address).toLowerCase()).filter(Boolean)
    : [];
}

function isInternalPublishingSender(address) {
  return INTERNAL_PUBLISHING_SENDERS.includes(normalizeString(address).toLowerCase());
}

function extractAuthorReplyText(bodyText) {
  const text = normalizeString(bodyText);
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const replyLines = [];
  for (const line of lines) {
    if (/^\s*from:\s+/i.test(line)) break;
    if (/^\s*on .+ wrote:\s*$/i.test(line)) break;
    if (/^\s*-{2,}\s*original message\s*-{2,}\s*$/i.test(line)) break;
    replyLines.push(line);
  }
  return normalizeString(replyLines.join("\n"));
}

async function getGraphToken(deps = {}) {
  const resolveToken = deps.getToken;
  if (resolveToken) return resolveToken(GRAPH_SCOPE);

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(GRAPH_SCOPE);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Graph token"), { safeCode: "GRAPH_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

function getFetchImpl(deps = {}) {
  return deps.fetchImpl || fetch;
}

function graphMailboxMessageUrl(messageId, suffix = "") {
  const id = normalizeString(messageId);
  if (!id) throw Object.assign(new Error("Message id missing"), { safeCode: "MESSAGE_ID_MISSING" });
  return `${GRAPH_BASE}/users/${encodeURIComponent(PUBLISHING_MAILBOX)}/messages/${encodeURIComponent(id)}${suffix}`;
}

function attachmentSafeMetadata(attachment = {}) {
  return {
    id: normalizeString(attachment.id) || null,
    name: normalizeString(attachment.name) || null,
    contentType: normalizeString(attachment.contentType) || null,
    size: Number.isFinite(attachment.size) ? attachment.size : null,
    isInline: attachment.isInline === true,
    lastModifiedDateTime: normalizeString(attachment.lastModifiedDateTime) || null,
    graphType: normalizeString(attachment["@odata.type"]) || null
  };
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Fetches recent Inbox messages for the publishing mailbox received on or
 * after `afterIso`, requesting only the fields needed for filtering and
 * classification. GET only — no other Graph verb is ever used.
 */
async function fetchRecentFolderMessages(token, folder, afterIso, deps = {}) {
  const filter = encodeURIComponent(`receivedDateTime ge ${afterIso}`);
  const select = encodeURIComponent(
    "id,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,conversationId,hasAttachments"
  );
  const url =
    `${GRAPH_BASE}/users/${encodeURIComponent(PUBLISHING_MAILBOX)}/mailFolders/${encodeURIComponent(folder)}/messages` +
    `?$filter=${filter}&$select=${select}&$orderby=receivedDateTime desc&$top=${MAX_MESSAGES_FETCHED}`;

  const response = await getFetchImpl(deps)(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Prefer": 'outlook.body-content-type="text"'
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Graph mailbox read failed: HTTP ${response.status}`), {
      safeCode: "GRAPH_MAILBOX_READ_FAILED",
      httpStatus: response.status
    });
  }

  const body = await response.json().catch(() => ({}));
  return Array.isArray(body.value) ? body.value : [];
}

async function fetchRecentInboxMessages(token, afterIso, deps = {}) {
  return fetchRecentFolderMessages(token, "inbox", afterIso, deps);
}

function safeMessage(message = {}, folder = "inbox") {
  const senderAddress = normalizeString(message.from?.emailAddress?.address).toLowerCase();
  const toRecipients = normalizeRecipients(message.toRecipients);
  const ccRecipients = normalizeRecipients(message.ccRecipients);
  const bodyText = normalizeString(message.body?.content) || normalizeString(message.bodyPreview) || "";
  return {
    folder,
    inboundMessageId: normalizeString(message.id) || null,
    internetMessageId: normalizeString(message.internetMessageId) || null,
    conversationId: normalizeString(message.conversationId) || null,
    subject: normalizeString(message.subject) || null,
    senderAddress,
    toRecipients,
    ccRecipients,
    receivedDateTime: normalizeString(message.receivedDateTime) || null,
    hasAttachments: message.hasAttachments === true,
    bodyText
  };
}

function includesAny(haystack, needles) {
  const source = normalizeString(haystack).toLowerCase();
  return needles.map((item) => normalizeString(item).toLowerCase()).filter(Boolean).some((item) => source.includes(item));
}

function deliveryEvidenceConfidence(message, input) {
  const haystack = `${message.subject || ""}\n${message.bodyText || ""}`;
  const packageId = normalizeString(input.packageId);
  const artifactId = normalizeString(input.artifactId);
  const title = normalizeString(input.title);
  const stage = normalizeString(input.stage);
  const recipient = normalizeString(input.recipient).toLowerCase();
  const exact = [];
  const supporting = [];
  const recipients = [...message.toRecipients, ...message.ccRecipients];

  if (recipient && !recipients.includes(recipient)) return { ok: false, confidence: "LOW", exact, supporting };

  if (packageId && includesAny(haystack, [packageId])) exact.push("PACKAGE_ID");
  if (artifactId && includesAny(haystack, [artifactId])) exact.push("ARTIFACT_ID");
  if (recipient && recipients.includes(recipient)) exact.push("RECIPIENT");
  if (title && includesAny(haystack, [title])) supporting.push("TITLE");
  if (stage && includesAny(haystack, [stage])) supporting.push("STAGE");

  if (exact.includes("PACKAGE_ID") || exact.includes("ARTIFACT_ID")) return { ok: true, confidence: "HIGH", exact, supporting };
  if (exact.includes("RECIPIENT") && supporting.length >= 2) return { ok: true, confidence: "HIGH", exact, supporting };
  if (exact.includes("RECIPIENT") && supporting.length >= 1) return { ok: true, confidence: "MEDIUM", exact, supporting };
  if (supporting.length >= 2) return { ok: true, confidence: "MEDIUM", exact, supporting };
  return { ok: false, confidence: "LOW", exact, supporting };
}

/**
 * Reads governed Publishing mailbox evidence that an author package was
 * already delivered. This is read-only and searches only publishing@jmerrill.one.
 * It intentionally admits internal Publishing/ACS senders because delivery
 * evidence often reaches the governed mailbox through the required CC copy.
 */
async function readPublishingMailboxDeliveryEvidence(input = {}, deps = {}) {
  const subjectContains = normalizeString(input.subjectContains);
  const afterIso = normalizeString(input.afterIso);
  if (!subjectContains) return blocked("SUBJECT_FILTER_MISSING", { found: false, ambiguous: false });
  if (!afterIso || Number.isNaN(Date.parse(afterIso))) return blocked("AFTER_TIMESTAMP_INVALID", { found: false, ambiguous: false });
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME, found: false, ambiguous: false });

  let token;
  try {
    token = await getGraphToken(deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_AUTH_FAILED", { found: false, ambiguous: false });
  }

  let messages;
  try {
    const inbox = await fetchRecentFolderMessages(token, "inbox", afterIso, deps);
    const sent = await fetchRecentFolderMessages(token, "sentitems", afterIso, deps);
    messages = [
      ...inbox.map((message) => safeMessage(message, "inbox")),
      ...sent.map((message) => safeMessage(message, "sentitems"))
    ];
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_MAILBOX_READ_FAILED", { httpStatus: err.httpStatus || null, found: false, ambiguous: false });
  }

  const subjectLower = subjectContains.toLowerCase();
  const candidates = messages
    .filter((message) => normalizeString(message.subject).toLowerCase().includes(subjectLower))
    .map((message) => ({ message, match: deliveryEvidenceConfidence(message, input) }))
    .filter((candidate) => candidate.match.ok)
    .sort((a, b) => new Date(b.message.receivedDateTime || 0).getTime() - new Date(a.message.receivedDateTime || 0).getTime());

  if (candidates.length === 0) {
    return { ok: true, code: "NO_DELIVERY_EVIDENCE_FOUND", found: false, ambiguous: false, sourceMailbox: PUBLISHING_MAILBOX };
  }

  const topHasPackageOrArtifact = candidates[0]?.match?.exact?.includes("PACKAGE_ID") || candidates[0]?.match?.exact?.includes("ARTIFACT_ID");
  if (candidates.length > 1 && !topHasPackageOrArtifact) {
    return {
      ok: true,
      code: "AMBIGUOUS_DELIVERY_EVIDENCE",
      found: false,
      ambiguous: true,
      sourceMailbox: PUBLISHING_MAILBOX,
      candidateCount: candidates.length
    };
  }

  const latest = candidates[0];
  return {
    ok: true,
    code: "DELIVERY_EVIDENCE_FOUND",
    found: true,
    ambiguous: false,
    sourceMailbox: PUBLISHING_MAILBOX,
    deliveryStatus: "DELIVERED",
    correlationSource: "PUBLISHING_MAILBOX",
    correlationConfidence: latest.match.confidence,
    matchEvidence: [...latest.match.exact, ...latest.match.supporting],
    ...latest.message,
    deliveredAt: latest.message.receivedDateTime
  };
}

async function fetchMessageAttachmentMetadata(token, messageId, deps = {}) {
  const select = encodeURIComponent("id,name,contentType,size,isInline,lastModifiedDateTime");
  const url = graphMailboxMessageUrl(messageId, `/attachments?$select=${select}`);

  const response = await getFetchImpl(deps)(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Graph attachment metadata read failed: HTTP ${response.status}`), {
      safeCode: "GRAPH_ATTACHMENT_METADATA_READ_FAILED",
      httpStatus: response.status
    });
  }

  const body = await response.json().catch(() => ({}));
  return Array.isArray(body.value) ? body.value.map(attachmentSafeMetadata) : [];
}

async function fetchMessageFileAttachment(token, messageId, attachmentId, deps = {}) {
  const id = normalizeString(attachmentId);
  if (!id) throw Object.assign(new Error("Attachment id missing"), { safeCode: "ATTACHMENT_ID_MISSING" });

  const url = graphMailboxMessageUrl(messageId, `/attachments/${encodeURIComponent(id)}`);
  const response = await getFetchImpl(deps)(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Graph attachment content read failed: HTTP ${response.status}`), {
      safeCode: "GRAPH_ATTACHMENT_CONTENT_READ_FAILED",
      httpStatus: response.status
    });
  }

  const body = await response.json().catch(() => ({}));
  const metadata = attachmentSafeMetadata(body);
  if (metadata.graphType && metadata.graphType !== FILE_ATTACHMENT_TYPE) {
    throw Object.assign(new Error(`Unsupported Graph attachment type: ${metadata.graphType}`), {
      safeCode: "GRAPH_ATTACHMENT_TYPE_UNSUPPORTED",
      graphType: metadata.graphType
    });
  }
  if (!normalizeString(body.contentBytes)) {
    throw Object.assign(new Error("Graph fileAttachment contentBytes missing"), {
      safeCode: "GRAPH_ATTACHMENT_CONTENT_MISSING"
    });
  }

  const content = Buffer.from(body.contentBytes, "base64");
  return {
    ...metadata,
    declaredSize: metadata.size,
    size: content.length,
    sha256: sha256Buffer(content),
    content
  };
}

/**
 * Reads the most recent Inbox reply to the controlled thread for the
 * publishing mailbox, after the given timestamp. Returns only safe,
 * extracted fields — never the raw Graph message object.
 *
 * @param {{
 *   subjectContains: string,
 *   afterIso: string,
 *   allowInternalPublishingSelection?: boolean
 * }} input
 * @param {{ getToken?: (scope: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this.
 * @returns {Promise<{
 *   ok: boolean,
 *   code: string|null,
 *   reason?: string,
 *   found: boolean,
 *   senderAddress: string|null,
 *   receivedDateTime: string|null,
 *   bodyText: string|null
 * }>}
 */
async function readPublishingMailboxReply(input = {}, deps = {}) {
  const subjectContains = normalizeString(input.subjectContains);
  const afterIso = normalizeString(input.afterIso);
  const allowInternalPublishingSelection = input.allowInternalPublishingSelection === true;

  if (!subjectContains) return blocked("SUBJECT_FILTER_MISSING", { found: false });
  if (!afterIso || Number.isNaN(Date.parse(afterIso))) return blocked("AFTER_TIMESTAMP_INVALID", { found: false });

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", { gate: GATE_NAME, found: false });
  }

  let token;
  try {
    token = await getGraphToken(deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_AUTH_FAILED", { found: false });
  }

  let messages;
  try {
    messages = await fetchRecentInboxMessages(token, afterIso, deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_MAILBOX_READ_FAILED", { httpStatus: err.httpStatus || null, found: false });
  }

  const subjectLower = subjectContains.toLowerCase();
  const candidates = messages
    .map((m) => {
      const senderAddress = normalizeString(m.from?.emailAddress?.address).toLowerCase();
      const toRecipients = normalizeRecipients(m.toRecipients);
      const ccRecipients = normalizeRecipients(m.ccRecipients);
      const bodyText = normalizeString(m.body?.content) || normalizeString(m.bodyPreview) || "";
      const authorReplyText = extractAuthorReplyText(bodyText);
      return {
        raw: m,
        senderAddress,
        toRecipients,
        ccRecipients,
        authorReplyText
      };
    })
    .filter((m) => normalizeString(m.raw.subject).toLowerCase().includes(subjectLower))
    .filter((m) => allowInternalPublishingSelection || !isInternalPublishingSender(m.senderAddress))
    .filter((m) => m.toRecipients.includes(PUBLISHING_MAILBOX))
    .filter((m) => Boolean(m.authorReplyText));

  if (candidates.length === 0) {
    return { ok: true, code: "NO_MATCHING_REPLY_FOUND", found: false, senderAddress: null, receivedDateTime: null, bodyText: null };
  }

  // Most recent match — messages were already ordered desc by receivedDateTime.
  const latestCandidate = candidates[0];
  const latest = latestCandidate.raw;
  const senderAddress = latestCandidate.senderAddress || null;
  const receivedDateTime = normalizeString(latest.receivedDateTime) || null;

  return {
    ok: true,
    code: "REPLY_FOUND",
    found: true,
    inboundMessageId: normalizeString(latest.id) || null,
    internetMessageId: normalizeString(latest.internetMessageId) || null,
    conversationId: normalizeString(latest.conversationId) || null,
    hasAttachments: latest.hasAttachments === true,
    subject: normalizeString(latest.subject) || null,
    senderAddress,
    selfAddressedPublishingSelection: allowInternalPublishingSelection && isInternalPublishingSender(senderAddress),
    toRecipients: latestCandidate.toRecipients,
    ccRecipients: latestCandidate.ccRecipients,
    receivedDateTime,
    bodyText: latestCandidate.authorReplyText
  };
}

async function listPublishingMailboxMessageAttachments(input = {}, deps = {}) {
  const messageId = normalizeString(input.messageId);
  if (!messageId) return blocked("MESSAGE_ID_MISSING", { sourceMailbox: PUBLISHING_MAILBOX, attachmentCount: 0 });
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME, sourceMailbox: PUBLISHING_MAILBOX, attachmentCount: 0 });

  let token;
  try {
    token = await getGraphToken(deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_AUTH_FAILED", { sourceMailbox: PUBLISHING_MAILBOX, attachmentCount: 0 });
  }

  try {
    const attachments = await fetchMessageAttachmentMetadata(token, messageId, deps);
    return {
      ok: true,
      code: "PUBLISHING_MAILBOX_ATTACHMENTS_LISTED",
      sourceMailbox: PUBLISHING_MAILBOX,
      sourceMessageId: messageId,
      attachmentCount: attachments.length,
      attachments
    };
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_ATTACHMENT_METADATA_READ_FAILED", {
      sourceMailbox: PUBLISHING_MAILBOX,
      sourceMessageId: messageId,
      attachmentCount: 0,
      httpStatus: err.httpStatus || null
    });
  }
}

async function fetchPublishingMailboxMessageAttachment(input = {}, deps = {}) {
  const messageId = normalizeString(input.messageId);
  const attachmentId = normalizeString(input.attachmentId);
  if (!messageId) return blocked("MESSAGE_ID_MISSING", { sourceMailbox: PUBLISHING_MAILBOX, attachment: null });
  if (!attachmentId) return blocked("ATTACHMENT_ID_MISSING", { sourceMailbox: PUBLISHING_MAILBOX, sourceMessageId: messageId, attachment: null });
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME, sourceMailbox: PUBLISHING_MAILBOX, sourceMessageId: messageId, attachment: null });

  let token;
  try {
    token = await getGraphToken(deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_AUTH_FAILED", { sourceMailbox: PUBLISHING_MAILBOX, sourceMessageId: messageId, attachment: null });
  }

  try {
    const attachment = await fetchMessageFileAttachment(token, messageId, attachmentId, deps);
    const retrievedAt = deps.now ? deps.now() : new Date().toISOString();
    return {
      ok: true,
      code: "PUBLISHING_MAILBOX_ATTACHMENT_FETCHED",
      sourceMailbox: PUBLISHING_MAILBOX,
      sourceMessageId: messageId,
      attachmentId,
      retrievedAt,
      attachment
    };
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_ATTACHMENT_CONTENT_READ_FAILED", {
      sourceMailbox: PUBLISHING_MAILBOX,
      sourceMessageId: messageId,
      attachmentId,
      attachment: null,
      httpStatus: err.httpStatus || null,
      graphType: err.graphType || null
    });
  }
}

module.exports = {
  readPublishingMailboxReply,
  readPublishingMailboxDeliveryEvidence,
  listPublishingMailboxMessageAttachments,
  fetchPublishingMailboxMessageAttachment,
  GATE_NAME,
  PUBLISHING_MAILBOX,
  MAX_MESSAGES_FETCHED,
  FILE_ATTACHMENT_TYPE,
  INTERNAL_PUBLISHING_SENDERS,
  extractAuthorReplyText
};
