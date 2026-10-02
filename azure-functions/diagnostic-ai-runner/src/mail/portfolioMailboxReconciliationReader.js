"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { ManagedIdentityCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPE = "https://graph.microsoft.com/.default";
const MAILBOXES = Object.freeze(["publishing@jmerrill.one", "jackie@jmerrill.one"]);
const WINDOW = Object.freeze({ start: "2026-07-03T04:00:00Z", endExclusive: "2026-10-02T04:00:00Z",
  businessTimeZone: "America/New_York", businessStartDate: "2026-07-03", businessEndDate: "2026-10-01" });
const FIELDS = "id,internetMessageId,conversationId,parentFolderId,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,createdDateTime,lastModifiedDateTime,subject,bodyPreview,body,hasAttachments";
const CONTAINER = "jm1-publishing-portfolio-evidence";
const READER_VERSION = "2.0.0";
const INTERNAL_SENDERS = new Set([...MAILBOXES, "publishing@email.jmerrill.one"]);

function fail(code, status) {
  throw Object.assign(new Error(code), { safeCode: code, httpStatus: status });
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function address(value) {
  return String(value?.emailAddress?.address || "").trim().toLowerCase();
}

function recipients(value) {
  return Array.isArray(value) ? value.map(address).filter(Boolean) : [];
}

function messageRecord(message, mailbox, query, extractedAt) {
  if (!message?.id) fail("PORTFOLIO_MAIL_GRAPH_ID_MISSING");
  const sender = address(message.from);
  const body = typeof message.body?.content === "string" ? message.body.content : null;
  return {
    readerVersion: READER_VERSION, sourceMailbox: mailbox,
    sourceMessageId: message.id, graphMessageId: message.id,
    internetMessageId: message.internetMessageId || null,
    conversationId: message.conversationId || null,
    parentFolderId: message.parentFolderId || null,
    from: sender, to: recipients(message.toRecipients), cc: recipients(message.ccRecipients),
    bcc: recipients(message.bccRecipients),
    receivedAt: message.receivedDateTime || null, sentAt: message.sentDateTime || null,
    createdAt: message.createdDateTime || null, lastModifiedAt: message.lastModifiedDateTime || null,
    subject: message.subject || null, bodyPreview: message.bodyPreview || null,
    bodyHash: body === null ? null : hash(body), hasAttachments: message.hasAttachments === true,
    direction: INTERNAL_SENDERS.has(sender) ? "OUTBOUND" : sender ? "INBOUND" : "UNKNOWN",
    sourceQueryWindow: { ...WINDOW, timestampField: query }, extractedAt
  };
}

function firstUrl(mailbox, field) {
  if (!MAILBOXES.includes(mailbox) || !["receivedDateTime", "sentDateTime"].includes(field)) {
    fail("PORTFOLIO_MAIL_QUERY_NOT_ALLOWED");
  }
  const params = new URLSearchParams({
    $select: FIELDS,
    $filter: `${field} ge ${WINDOW.start} and ${field} lt ${WINDOW.endExclusive}`,
    $top: "100"
  });
  return `${GRAPH}/users/${encodeURIComponent(mailbox)}/messages?${params}`;
}

function validateNextLink(next, mailbox) {
  const url = new URL(next);
  const path = `/v1.0/users/${mailbox}/messages`;
  if (url.origin !== new URL(GRAPH).origin ||
      decodeURIComponent(url.pathname).toLowerCase() !== path.toLowerCase() || !url.search) {
    fail("PORTFOLIO_MAIL_NEXT_LINK_UNTRUSTED");
  }
  return url.href;
}

function deduplicateRecords(records) {
  const byGraph = new Map();
  const conflicts = [];
  for (const record of records) {
    const key = `${record.sourceMailbox}:${record.graphMessageId}`;
    const existing = byGraph.get(key);
    if (existing) {
      if (existing.internetMessageId && record.internetMessageId &&
          existing.internetMessageId.toLowerCase() !== record.internetMessageId.toLowerCase()) {
        conflicts.push({ type: "GRAPH_IDENTITY_CONFLICT", key });
        continue;
      }
      existing.sourceQueries.push(record.sourceQueryWindow.timestampField);
      if (!existing.internetMessageId) existing.internetMessageId = record.internetMessageId;
    } else {
      byGraph.set(key, { ...record, sourceQueries: [record.sourceQueryWindow.timestampField] });
    }
  }
  const byInternet = new Map();
  const events = [];
  for (const record of byGraph.values()) {
    const internetKey = record.internetMessageId?.trim().toLowerCase();
    const existing = internetKey ? byInternet.get(internetKey) : null;
    const source = { sourceMailbox: record.sourceMailbox, graphMessageId: record.graphMessageId,
      parentFolderId: record.parentFolderId, sourceQueries: record.sourceQueries };
    if (existing) {
      if (existing.from !== record.from || existing.subject !== record.subject) {
        conflicts.push({ type: "INTERNET_IDENTITY_CONFLICT", internetMessageId: internetKey,
          sourceMailbox: record.sourceMailbox, graphMessageId: record.graphMessageId });
        events.push({ ...record, sources: [source] });
        continue;
      }
      existing.sources.push(source);
    } else {
      const event = { ...record, sources: [source] };
      events.push(event);
      if (internetKey) byInternet.set(internetKey, event);
    }
  }
  return { events, conflicts, graphDistinctCount: byGraph.size };
}

async function scanQuery(mailbox, field, token, onPage, deps = {}) {
  const request = deps.fetchImpl || fetch;
  const seenLinks = new Set();
  let next = firstUrl(mailbox, field);
  let pageNumber = 0;
  let count = 0;
  while (next) {
    if (seenLinks.has(next) || pageNumber >= 1000) fail("PORTFOLIO_MAIL_PAGINATION_LOOP");
    seenLinks.add(next);
    const response = await request(next, { method: "GET", headers: {
      Authorization: `Bearer ${token}`, Accept: "application/json",
      Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"'
    } });
    if (!response.ok) fail("PORTFOLIO_MAIL_GRAPH_READ_FAILED", response.status);
    const page = await response.json();
    if (!Array.isArray(page.value)) fail("PORTFOLIO_MAIL_GRAPH_PAGE_INVALID");
    const extractedAt = (deps.now || (() => new Date()))().toISOString();
    const records = page.value.map((message) => messageRecord(message, mailbox, field, extractedAt));
    await onPage({ mailbox, field, pageNumber, records });
    count += records.length;
    pageNumber += 1;
    next = page["@odata.nextLink"] ? validateNextLink(page["@odata.nextLink"], mailbox) : null;
  }
  return { mailbox, field, pages: pageNumber, count };
}

async function runPortfolioMailboxReconciliation(deps = {}) {
  const clientId = process.env.JM1_PORTFOLIO_MAIL_MANAGED_IDENTITY_CLIENT_ID;
  const credential = deps.credential || new ManagedIdentityCredential(clientId || undefined);
  const token = await credential.getToken(SCOPE);
  if (!token?.token) fail("PORTFOLIO_MAIL_SYSTEM_IDENTITY_UNAVAILABLE");
  const connectionString = deps.connectionString || process.env.AzureWebJobsStorage;
  if (!deps.containerClient && !connectionString) fail("PORTFOLIO_MAIL_EVIDENCE_STORAGE_MISSING");
  const container = deps.containerClient || BlobServiceClient.fromConnectionString(connectionString)
    .getContainerClient(CONTAINER);
  await container.createIfNotExists();
  const runId = (deps.runId || randomUUID()).toLowerCase();
  if (!/^[0-9a-f-]{36}$/.test(runId)) fail("PORTFOLIO_MAIL_RUN_ID_INVALID");
  const prefix = `runs/${runId}`;
  const records = [];
  const write = async (path, value) => {
    const blob = container.getBlockBlobClient(`${prefix}/${path}`);
    const bytes = Buffer.from(JSON.stringify(value));
    await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" },
      blobHTTPHeaders: { blobContentType: "application/json" } });
  };
  const queries = [];
  for (const mailbox of MAILBOXES) {
    for (const field of ["receivedDateTime", "sentDateTime"]) {
      const result = await scanQuery(mailbox, field, token.token, async (page) => {
        await write(`pages/${mailbox}/${field}/${String(page.pageNumber).padStart(4, "0")}.json`, page);
        records.push(...page.records);
      }, deps);
      queries.push(result);
    }
  }
  const deduplication = deduplicateRecords(records);
  await write("mail-events.json", deduplication);
  const manifest = { status: "EXTRACTED", runId, readerVersion: READER_VERSION,
    sourceMailboxes: MAILBOXES, window: WINDOW, queries,
    rawRowCountBeforeSameMailboxDeduplication: queries.reduce((sum, query) => sum + query.count, 0),
    graphDistinctCount: deduplication.graphDistinctCount,
    mailEventCount: deduplication.events.length,
    missingInternetMessageIdCount: deduplication.events.filter((event) => !event.internetMessageId).length,
    missingConversationIdCount: deduplication.events.filter((event) => !event.conversationId).length,
    unresolvedIdentityConflicts: deduplication.conflicts.length,
    deduplicationStatus: deduplication.conflicts.length === 0 ? "PASS" : "IN_PROGRESS",
    completedAt: (deps.now || (() => new Date()))().toISOString() };
  await write("manifest.json", manifest);
  return manifest;
}

module.exports = { MAILBOXES, WINDOW, READER_VERSION, firstUrl, messageRecord,
  scanQuery, deduplicateRecords, runPortfolioMailboxReconciliation };
