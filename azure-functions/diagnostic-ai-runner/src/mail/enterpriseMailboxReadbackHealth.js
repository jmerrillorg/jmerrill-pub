"use strict";

const { DefaultAzureCredential } = require("@azure/identity");

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const HEALTH_GATE_NAME = "JM1_ENTERPRISE_MAILBOX_READBACK_HEALTH_ENABLED";
const MAX_PROOF_MESSAGES = 10;

const GOVERNED_MAILBOXES = Object.freeze({
  AIC: Object.freeze({
    brand: "AIC",
    displayName: "Agape International Cathedral",
    objectId: "516ec810-7be4-4bfe-97b4-7d7756732111",
    upn: "aic@jmerrill.one",
    primarySmtp: "aic@agapeic.org",
    mailReadPrincipal: "aic@agapeic.org",
    expectedAcsFrom: "aic@email.agapeic.org",
    expectedReplyTo: "aic@agapeic.org"
  }),
  JMP: Object.freeze({
    brand: "JMP",
    displayName: "J Merrill Publishing",
    objectId: null,
    upn: "publishing@jmerrill.one",
    primarySmtp: "publishing@jmerrill.one",
    mailReadPrincipal: "publishing@jmerrill.one",
    expectedAcsFrom: "publishing@email.jmerrill.one",
    expectedReplyTo: "publishing@jmerrill.one"
  })
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBrand(value) {
  return normalizeString(value).toUpperCase();
}

function getConfiguredGateName() {
  return process.env[HEALTH_GATE_NAME] !== undefined ? HEALTH_GATE_NAME : "JM1_PUBLISHING_MAIL_READ_ENABLED";
}

function isGateOpen() {
  const gateName = getConfiguredGateName();
  return normalizeString(process.env[gateName]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "ENTERPRISE_MAILBOX_READBACK_BLOCKED", reason, ...extra };
}

function targetForBrand(brand) {
  return GOVERNED_MAILBOXES[normalizeBrand(brand)] || null;
}

function graphUserId(target) {
  return target.mailReadPrincipal || target.objectId || target.upn || target.primarySmtp;
}

function graphUserIdCandidates(target) {
  const candidates = [
    graphUserId(target),
    target.primarySmtp,
    target.upn,
    target.objectId
  ].map(normalizeString).filter(Boolean);
  return [...new Set(candidates)];
}

async function getGraphToken(deps = {}) {
  if (typeof deps.getToken === "function") return deps.getToken(GRAPH_SCOPE);
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

async function graphJson(token, url, deps = {}) {
  const response = await getFetchImpl(deps)(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Prefer": 'outlook.body-content-type="text"'
    }
  });
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    body,
    graphErrorCode: normalizeString(body?.error?.code) || null
  };
}

function safeProbeResult(probe) {
  return {
    status: probe.status,
    graphErrorCode: probe.graphErrorCode,
    result: probe.ok ? "PASS" : "FAIL"
  };
}

function recipientAddresses(recipients) {
  return Array.isArray(recipients)
    ? recipients.map((r) => normalizeString(r?.emailAddress?.address).toLowerCase()).filter(Boolean)
    : [];
}

function safeMessageMetadata(message) {
  return {
    idPresent: Boolean(normalizeString(message.id)),
    internetMessageIdPresent: Boolean(normalizeString(message.internetMessageId)),
    conversationIdPresent: Boolean(normalizeString(message.conversationId)),
    subject: normalizeString(message.subject) || null,
    from: normalizeString(message.from?.emailAddress?.address).toLowerCase() || null,
    toRecipients: recipientAddresses(message.toRecipients),
    ccRecipients: recipientAddresses(message.ccRecipients),
    replyTo: recipientAddresses(message.replyTo),
    receivedDateTime: normalizeString(message.receivedDateTime) || null,
    sentDateTime: normalizeString(message.sentDateTime) || null,
    hasAttachments: message.hasAttachments === true
  };
}

async function runEnterpriseMailboxReadbackHealth(input = {}, deps = {}) {
  const brand = normalizeBrand(input.brand || "AIC");
  const target = targetForBrand(brand);
  if (!target) return blocked("MAILBOX_BRAND_NOT_GOVERNED", { brand });
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: getConfiguredGateName(), brand, mailbox: target.primarySmtp });

  let token;
  try {
    token = await getGraphToken(deps);
  } catch (err) {
    return blocked(err.safeCode || "GRAPH_AUTH_FAILED", { brand, mailbox: target.primarySmtp });
  }

  const verifiedAt = deps.now ? deps.now() : new Date().toISOString();
  let selectedUserId = null;
  let selectedProbeSet = null;
  const principalAttempts = [];

  for (const candidate of graphUserIdCandidates(target)) {
    const encodedUser = encodeURIComponent(candidate);
    const userProbe = await graphJson(
      token,
      `${GRAPH_BASE}/users/${encodedUser}?$select=id,displayName,userPrincipalName,mail,accountEnabled`,
      deps
    );
    const foldersProbe = await graphJson(
      token,
      `${GRAPH_BASE}/users/${encodedUser}/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount&$top=50`,
      deps
    );
    const inboxProbe = await graphJson(
      token,
      `${GRAPH_BASE}/users/${encodedUser}/mailFolders/inbox/messages?$select=id,subject,from,toRecipients,ccRecipients,replyTo,receivedDateTime,internetMessageId,conversationId,hasAttachments&$orderby=receivedDateTime desc&$top=1`,
      deps
    );
    const sentProbe = await graphJson(
      token,
      `${GRAPH_BASE}/users/${encodedUser}/mailFolders/sentitems/messages?$select=id,subject,from,toRecipients,ccRecipients,replyTo,sentDateTime,internetMessageId,conversationId,hasAttachments&$orderby=sentDateTime desc&$top=1`,
      deps
    );
    const requiredProbesPass = foldersProbe.ok && inboxProbe.ok && sentProbe.ok;
    principalAttempts.push({
      principal: candidate,
      userObject: safeProbeResult(userProbe),
      mailFolders: safeProbeResult(foldersProbe),
      inbox: safeProbeResult(inboxProbe),
      sentItems: safeProbeResult(sentProbe)
    });
    selectedUserId = candidate;
    selectedProbeSet = { userProbe, foldersProbe, inboxProbe, sentProbe };
    if (requiredProbesPass) break;
  }

  const { userProbe, foldersProbe, inboxProbe, sentProbe } = selectedProbeSet;
  const encodedUser = encodeURIComponent(selectedUserId);

  let proof = null;
  const subjectContains = normalizeString(input.subjectContains);
  const afterIso = normalizeString(input.afterIso);
  if (subjectContains && afterIso && !Number.isNaN(Date.parse(afterIso))) {
    const filter = encodeURIComponent(`receivedDateTime ge ${afterIso}`);
    const select = encodeURIComponent("id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,replyTo,receivedDateTime,hasAttachments");
    const proofProbe = await graphJson(
      token,
      `${GRAPH_BASE}/users/${encodedUser}/mailFolders/inbox/messages?$filter=${filter}&$select=${select}&$orderby=receivedDateTime desc&$top=${MAX_PROOF_MESSAGES}`,
      deps
    );
    const subjectLower = subjectContains.toLowerCase();
    const messages = Array.isArray(proofProbe.body?.value) ? proofProbe.body.value : [];
    const matches = messages
      .filter((m) => normalizeString(m.subject).toLowerCase().includes(subjectLower))
      .map(safeMessageMetadata);
    proof = {
      probe: safeProbeResult(proofProbe),
      subjectContains,
      afterIso,
      matchCount: matches.length,
      matches
    };
  }

  const folders = Array.isArray(foldersProbe.body?.value)
    ? foldersProbe.body.value.map((folder) => ({
      displayName: normalizeString(folder.displayName) || null,
      totalItemCount: Number.isFinite(folder.totalItemCount) ? folder.totalItemCount : null,
      unreadItemCount: Number.isFinite(folder.unreadItemCount) ? folder.unreadItemCount : null
    }))
    : [];

  const inboxMessages = Array.isArray(inboxProbe.body?.value) ? inboxProbe.body.value.map(safeMessageMetadata) : [];
  const sentMessages = Array.isArray(sentProbe.body?.value) ? sentProbe.body.value.map(safeMessageMetadata) : [];
  const requiredProbesPass = foldersProbe.ok && inboxProbe.ok && sentProbe.ok;

  return {
    ok: requiredProbesPass,
    code: requiredProbesPass ? "ENTERPRISE_MAILBOX_READBACK_HEALTH_PASS" : "ENTERPRISE_MAILBOX_READBACK_HEALTH_FAIL",
    verifiedAt,
    brand,
    mailbox: {
      displayName: target.displayName,
      objectId: target.objectId,
      upn: target.upn,
      primarySmtp: target.primarySmtp,
      mailReadPrincipal: target.mailReadPrincipal,
      selectedMailReadPrincipal: selectedUserId,
      expectedAcsFrom: target.expectedAcsFrom,
      expectedReplyTo: target.expectedReplyTo
    },
    principalAttempts,
    probes: {
      userObject: safeProbeResult(userProbe),
      mailFolders: safeProbeResult(foldersProbe),
      inbox: safeProbeResult(inboxProbe),
      sentItems: safeProbeResult(sentProbe)
    },
    folderCount: folders.length,
    folders,
    inboxMessages,
    sentMessages,
    proof
  };
}

module.exports = {
  runEnterpriseMailboxReadbackHealth,
  HEALTH_GATE_NAME,
  GOVERNED_MAILBOXES,
  MAX_PROOF_MESSAGES
};
