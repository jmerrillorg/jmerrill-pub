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
 *   - Never ingests attachments.
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

const { DefaultAzureCredential } = require("@azure/identity");

const GATE_NAME = "JM1_PUBLISHING_MAIL_READ_ENABLED";
const PUBLISHING_MAILBOX = "publishing@jmerrill.one";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MAX_MESSAGES_FETCHED = 25;
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

/**
 * Fetches recent Inbox messages for the publishing mailbox received on or
 * after `afterIso`, requesting only the fields needed for filtering and
 * classification. GET only — no other Graph verb is ever used.
 */
async function fetchRecentInboxMessages(token, afterIso) {
  const filter = encodeURIComponent(`receivedDateTime ge ${afterIso}`);
  const select = encodeURIComponent(
    "id,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,conversationId"
  );
  const url =
    `${GRAPH_BASE}/users/${encodeURIComponent(PUBLISHING_MAILBOX)}/mailFolders/inbox/messages` +
    `?$filter=${filter}&$select=${select}&$orderby=receivedDateTime desc&$top=${MAX_MESSAGES_FETCHED}`;

  const response = await fetch(url, {
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

/**
 * Reads the most recent Inbox reply to the controlled thread for the
 * publishing mailbox, after the given timestamp. Returns only safe,
 * extracted fields — never the raw Graph message object.
 *
 * @param {{
 *   subjectContains: string,
 *   afterIso: string
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
    messages = await fetchRecentInboxMessages(token, afterIso);
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
    .filter((m) => !isInternalPublishingSender(m.senderAddress))
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
    senderAddress,
    toRecipients: latestCandidate.toRecipients,
    ccRecipients: latestCandidate.ccRecipients,
    receivedDateTime,
    bodyText: latestCandidate.authorReplyText
  };
}

module.exports = {
  readPublishingMailboxReply,
  GATE_NAME,
  PUBLISHING_MAILBOX,
  MAX_MESSAGES_FETCHED,
  INTERNAL_PUBLISHING_SENDERS,
  extractAuthorReplyText
};
