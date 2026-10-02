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
const DELIVERY_CONTAINER = "jm1-publishing-inbound-evidence";
const READER_VERSION = "2.1.0";
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

function internetIdentity(value) {
  return typeof value === "string" ? value.trim() : "";
}

const BINDING_FIELDS = ["titleId", "authorId", "engagementId", "stageId"];
function bindingConflicts(a, b) {
  return BINDING_FIELDS.some((key) => a[key] && b[key] && a[key] !== b[key]);
}

function hold(event) {
  const result = { ...event, correlationStatus: "CONFLICT_HELD" };
  for (const field of [...BINDING_FIELDS, "communicationRecordId", "providerMessageId",
    "deliveryLedgerId", "inboundMessageEventId"]) delete result[field];
  return result;
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
      if ((existing.internetMessageId && record.internetMessageId &&
          internetIdentity(existing.internetMessageId) !== internetIdentity(record.internetMessageId)) ||
          existing.from !== record.from || existing.subject !== record.subject ||
          (existing.bodyHash && record.bodyHash && existing.bodyHash !== record.bodyHash)) {
        conflicts.push({ type: "GRAPH_IDENTITY_CONFLICT", key });
        existing.correlationStatus = "CONFLICT_HELD";
        (existing.conflictingObservations ||= []).push(record);
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
    const internetKey = internetIdentity(record.internetMessageId);
    const existing = internetKey ? byInternet.get(internetKey) : null;
    // Keep every mailbox's participants, BCC, timestamps and hash, not just its ID.
    const source = { ...record };
    if (existing) {
      if (existing.from !== record.from || existing.subject !== record.subject ||
          (existing.bodyHash && record.bodyHash && existing.bodyHash !== record.bodyHash)) {
        conflicts.push({ type: "INTERNET_IDENTITY_CONFLICT", internetMessageId: internetKey,
          sourceMailbox: record.sourceMailbox, graphMessageId: record.graphMessageId });
        existing.correlationStatus = "CONFLICT_HELD";
        events.push({ ...record, correlationStatus: "CONFLICT_HELD", sources: [source] });
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

function enrichWithDeliveryLedger(events, deliveries) {
  const byInternet = new Map();
  const poisoned = new Set();
  const conflicts = [];
  for (const delivery of deliveries) {
    const key = internetIdentity(delivery.internetMessageId);
    if (!key) continue;
    if (poisoned.has(key)) continue;
    const previous = byInternet.get(key);
    if (previous && (previous.communicationRecordId !== delivery.communicationRecordId ||
        previous.outboundMessageId !== delivery.outboundMessageId || bindingConflicts(previous, delivery))) {
      conflicts.push({ type: "DELIVERY_IDENTITY_CONFLICT", internetMessageId: key });
      byInternet.delete(key);
      poisoned.add(key);
      continue;
    }
    byInternet.set(key, delivery);
  }
  let linked = 0;
  const enriched = events.map((event) => {
    const key = internetIdentity(event.internetMessageId);
    if (poisoned.has(key) || event.correlationStatus === "CONFLICT_HELD") return hold(event);
    const delivery = key ? byInternet.get(key) : null;
    if (!delivery) return event;
    linked += 1;
    return { ...event, providerMessageId: delivery.outboundMessageId || null,
      communicationRecordId: delivery.communicationRecordId || null,
      titleId: delivery.titleId || null, authorId: delivery.authorId || null,
      engagementId: delivery.engagementId || null, stageId: delivery.stageId || null,
      deliveryLedgerId: delivery.deliveryId || null };
  });
  return { events: enriched, conflicts, linkedDeliveryCount: linked,
    deliveryLedgerRowCount: deliveries.length };
}

function enrichWithInboundEvents(events, inboundEvents) {
  const byIdentity = new Map();
  const poisoned = new Set();
  const conflicts = [];
  for (const inbound of inboundEvents) {
    if (inbound.correlationStatus !== "DETERMINISTIC" || !inbound.titleId || !inbound.authorId) continue;
    const keys = [inbound.internetMessageId && `internet:${internetIdentity(inbound.internetMessageId)}`,
      inbound.graphMessageId && `graph:${String(inbound.mailbox || "").toLowerCase()}:${inbound.graphMessageId}`].filter(Boolean);
    for (const key of keys) {
      if (poisoned.has(key)) continue;
      const prior = byIdentity.get(key);
      if (prior && bindingConflicts(prior, inbound)) {
        conflicts.push({ type: "INBOUND_CORRELATION_CONFLICT", key });
        byIdentity.delete(key);
        poisoned.add(key);
      } else if (!prior) {
        byIdentity.set(key, inbound);
      }
    }
  }
  let linked = 0;
  const enriched = events.map((event) => {
    const keys = [event.internetMessageId && `internet:${internetIdentity(event.internetMessageId)}`,
      ...(event.sources || [event]).map((source) => `graph:${source.sourceMailbox}:${source.graphMessageId}`)].filter(Boolean);
    if (event.correlationStatus === "CONFLICT_HELD" || keys.some((key) => poisoned.has(key))) return hold(event);
    const candidates = keys.map((key) => byIdentity.get(key)).filter(Boolean);
    const inbound = candidates[0];
    if (!inbound) return event;
    if (candidates.some((candidate) => bindingConflicts(candidate, inbound)) || bindingConflicts(event, inbound)) {
      conflicts.push({ type: "MAIL_SOURCE_CORRELATION_CONFLICT", graphMessageId: event.graphMessageId,
        sourceMailbox: event.sourceMailbox });
      return hold(event);
    }
    linked += 1;
    return { ...event, authorId: inbound.authorId, titleId: inbound.titleId,
      engagementId: event.engagementId || inbound.engagementId || null,
      stageId: event.stageId || inbound.stageId || null,
      inboundMessageEventId: inbound.inboundMessageEventId };
  });
  return { events: enriched, conflicts, linkedInboundCount: linked,
    inboundEvidenceRowCount: inboundEvents.length };
}

async function readInboundEvidencePrefix(prefix, connectionString, deps = {}) {
  const container = deps.inboundContainerClient || BlobServiceClient.fromConnectionString(connectionString)
    .getContainerClient(process.env.JM1_PUBLISHING_INBOUND_EVIDENCE_CONTAINER || DELIVERY_CONTAINER);
  const records = [];
  for await (const blob of container.listBlobsFlat({ prefix })) {
    const bytes = await container.getBlockBlobClient(blob.name).downloadToBuffer();
    const record = JSON.parse(bytes.toString("utf8"));
    const fields = [...BINDING_FIELDS, "internetMessageId", "graphMessageId", "mailbox", "correlationStatus",
      "outboundMessageId", "communicationRecordId", "deliveryId", "inboundMessageEventId"];
    records.push(Object.fromEntries(fields.filter((field) => record[field] !== undefined).map((field) => [field, record[field]])));
  }
  return records;
}

async function graphGet(url, token, deps) {
  const request = deps.fetchImpl || fetch;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const accessToken = deps.getToken ? await deps.getToken() : token;
    const response = await request(url, { method: "GET", signal: AbortSignal.timeout(30000), headers: {
      Authorization: `Bearer ${accessToken}`, Accept: "application/json",
      Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"'
    } });
    if (response.ok) return response.json();
    if (![429, 502, 503, 504].includes(response.status) || attempt === 3) {
      fail("PORTFOLIO_MAIL_GRAPH_READ_FAILED", response.status);
    }
    const retryAfter = response.headers?.get("retry-after");
    const seconds = retryAfter === null || retryAfter === undefined ? 2 ** attempt
      : /^\d+$/.test(retryAfter) ? Number(retryAfter)
        : Math.max(0, (Date.parse(retryAfter) - Date.now()) / 1000);
    if (!Number.isFinite(seconds) || seconds > 60) fail("PORTFOLIO_MAIL_RETRY_LATER", response.status);
    await (deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(seconds * 1000);
  }
}

async function scanFolders(mailbox, token, deps = {}) {
  const root = `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders`;
  const pending = [root];
  const folders = new Map();
  for (let index = 0; index < pending.length; index += 1) {
    const endpoint = pending[index];
    let next = `${endpoint}?includeHiddenFolders=true&$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,isHidden`;
    const seen = new Set();
    while (next) {
      if (seen.has(next) || seen.size >= 1000) fail("PORTFOLIO_FOLDER_PAGINATION_LOOP");
      seen.add(next);
      const url = new URL(next);
      if (url.origin !== new URL(GRAPH).origin || url.pathname !== new URL(endpoint).pathname) {
        fail("PORTFOLIO_FOLDER_NEXT_LINK_UNTRUSTED");
      }
      const path = `folder-pages/${mailbox}/${hash(next)}.json`;
      let page = await deps.readCheckpoint?.(path);
      if (!page) {
        const response = await graphGet(next, token, deps);
        if (!Array.isArray(response.value)) fail("PORTFOLIO_FOLDER_PAGE_INVALID");
        page = { value: response.value, nextLink: response["@odata.nextLink"] || null };
        page = deps.writeCheckpoint ? await deps.writeCheckpoint(path, page) : page;
      }
      for (const folder of page.value) {
        if (!folder.id) fail("PORTFOLIO_FOLDER_ID_MISSING");
        if (folders.has(folder.id)) continue;
        folders.set(folder.id, { ...folder, sourceMailbox: mailbox });
        if (folder.childFolderCount > 0) pending.push(`${root}/${encodeURIComponent(folder.id)}/childFolders`);
      }
      next = page.nextLink;
    }
  }
  return { mailbox, folders: [...folders.values()], scope: "ALL_PRIMARY_MAILBOX_FOLDERS_INCLUDING_HIDDEN" };
}

async function scanQuery(mailbox, field, token, onPage, deps = {}) {
  const seenLinks = new Set();
  let next = firstUrl(mailbox, field);
  let pageNumber = 0;
  let count = 0;
  while (next) {
    if (seenLinks.has(next) || pageNumber >= 1000) fail("PORTFOLIO_MAIL_PAGINATION_LOOP");
    seenLinks.add(next);
    const path = `pages/${mailbox}/${field}/${String(pageNumber).padStart(4, "0")}.json`;
    let page = await deps.readCheckpoint?.(path);
    if (!page) {
      const response = await graphGet(next, token, deps);
      if (!Array.isArray(response.value)) fail("PORTFOLIO_MAIL_GRAPH_PAGE_INVALID");
      const extractedAt = (deps.now || (() => new Date()))().toISOString();
      page = { mailbox, field, pageNumber, requestUrl: next,
        records: response.value.map((message) => messageRecord(message, mailbox, field, extractedAt)),
        nextLink: response["@odata.nextLink"] ? validateNextLink(response["@odata.nextLink"], mailbox) : null };
      page = deps.writeCheckpoint ? await deps.writeCheckpoint(path, page) : page;
    }
    if (page.requestUrl !== next || page.mailbox !== mailbox || page.field !== field) fail("PORTFOLIO_MAIL_CHECKPOINT_MISMATCH");
    await onPage(page);
    count += page.records.length;
    pageNumber += 1;
    next = page.nextLink ? validateNextLink(page.nextLink, mailbox) : null;
  }
  return { mailbox, field, pages: pageNumber, count };
}

async function runPortfolioMailboxReconciliation(deps = {}) {
  const clientId = process.env.JM1_PORTFOLIO_MAIL_MANAGED_IDENTITY_CLIENT_ID;
  const credential = deps.credential || new ManagedIdentityCredential(clientId || undefined);
  const connectionString = deps.connectionString || process.env.AzureWebJobsStorage;
  if (!deps.containerClient && !connectionString) fail("PORTFOLIO_MAIL_EVIDENCE_STORAGE_MISSING");
  const container = deps.containerClient || BlobServiceClient.fromConnectionString(connectionString)
    .getContainerClient(CONTAINER);
  await container.createIfNotExists();
  const runId = (deps.runId || randomUUID()).toLowerCase();
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(runId)) fail("PORTFOLIO_MAIL_RUN_ID_INVALID");
  const prefix = `runs/${runId}`;
  const records = [];
  const read = async (path) => {
    try {
      return JSON.parse((await container.getBlockBlobClient(`${prefix}/${path}`).downloadToBuffer()).toString("utf8"));
    } catch (error) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  };
  const write = async (path, value) => {
    const blob = container.getBlockBlobClient(`${prefix}/${path}`);
    const bytes = Buffer.from(JSON.stringify(value));
    try {
      await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" } });
      return value;
    } catch (error) {
      if (![409, 412].includes(error.statusCode)) throw error;
      const winner = await read(path);
      if (!winner) throw error;
      return winner;
    }
  };
  const attemptId = randomUUID();
  const queries = [];
  const folderCoverage = [];
  try {
  const contract = await write("contract.json", { readerVersion: READER_VERSION, window: WINDOW, sourceMailboxes: MAILBOXES });
  if (JSON.stringify(contract) !== JSON.stringify({ readerVersion: READER_VERSION, window: WINDOW, sourceMailboxes: MAILBOXES })) {
    fail("PORTFOLIO_MAIL_RUN_CONTRACT_MISMATCH");
  }
  const completed = await read("manifest.json");
  if (completed) return completed;
  const runtimeDeps = { ...deps, readCheckpoint: read, writeCheckpoint: write,
    getToken: async () => {
      const token = await credential.getToken(SCOPE);
      if (!token?.token) fail("PORTFOLIO_MAIL_SYSTEM_IDENTITY_UNAVAILABLE");
      return token.token;
    } };
  for (const mailbox of MAILBOXES) {
    folderCoverage.push(await scanFolders(mailbox, null, runtimeDeps));
    for (const field of ["receivedDateTime", "sentDateTime"]) {
      const result = await scanQuery(mailbox, field, null, async (page) => {
        records.push(...page.records);
      }, runtimeDeps);
      queries.push(result);
    }
  }
  const deduplication = deduplicateRecords(records);
  const evidence = await read("source-evidence.json") || await write("source-evidence.json", {
    deliveries: deps.deliveryRecords || await readInboundEvidencePrefix("deliveries/", connectionString, deps),
    inboundEvents: deps.inboundEvents || await readInboundEvidencePrefix("messages/", connectionString, deps)
  });
  const deliveries = evidence.deliveries;
  const linkage = enrichWithDeliveryLedger(deduplication.events, deliveries);
  const inboundEvents = evidence.inboundEvents;
  const inboundLinkage = enrichWithInboundEvents(linkage.events, inboundEvents);
  const identityConflicts = [...deduplication.conflicts, ...linkage.conflicts, ...inboundLinkage.conflicts];
  const eventDocument = await write("mail-events.json", { events: inboundLinkage.events, conflicts: identityConflicts });
  const folderIds = new Set(folderCoverage.flatMap((coverage) => coverage.folders.map((folder) => `${coverage.mailbox}:${folder.id}`)));
  const unmatchedFolderIds = [...new Set(records.filter((record) => !folderIds.has(`${record.sourceMailbox}:${record.parentFolderId}`))
    .map((record) => `${record.sourceMailbox}:${record.parentFolderId || "MISSING"}`))];
  await write("folder-coverage.json", { folderCoverage, unmatchedFolderIds });
  const manifest = { status: "EXTRACTED", runId, readerVersion: READER_VERSION,
    sourceMailboxes: MAILBOXES, window: WINDOW, queries,
    folderCounts: folderCoverage.map((coverage) => ({ mailbox: coverage.mailbox, count: coverage.folders.length })),
    unmatchedFolderIds,
    folderCoverageStatus: unmatchedFolderIds.length ? "EXCEPTION" : "ENUMERATED",
    snapshotSemantics: "SEQUENTIAL_OBSERVATIONS_NOT_ATOMIC_SNAPSHOT",
    coverageLimitations: ["ONLINE_ARCHIVE_AND_PURGED_MESSAGES_NOT_COVERED", "OTHER_SHARED_DELEGATED_MAILBOXES_REQUIRE_SEPARATE_INVENTORY"],
    eventsSha256: hash(JSON.stringify(eventDocument)),
    rawRowCountBeforeSameMailboxDeduplication: queries.reduce((sum, query) => sum + query.count, 0),
    graphDistinctCount: deduplication.graphDistinctCount,
    mailEventCount: inboundLinkage.events.length,
    durableIdentityCompleteCount: inboundLinkage.events.filter((event) =>
      Boolean(event.internetMessageId || (event.graphMessageId && event.sourceMailbox))).length,
    exactTitleCorrelatedCount: inboundLinkage.events.filter((event) =>
      Boolean(event.titleId && event.authorId)).length,
    missingInternetMessageIdCount: inboundLinkage.events.filter((event) => !event.internetMessageId).length,
    missingConversationIdCount: inboundLinkage.events.filter((event) => !event.conversationId).length,
    deliveryLedgerRowCount: linkage.deliveryLedgerRowCount,
    linkedDeliveryCount: linkage.linkedDeliveryCount,
    inboundEvidenceRowCount: inboundLinkage.inboundEvidenceRowCount,
    linkedInboundCount: inboundLinkage.linkedInboundCount,
    unresolvedIdentityConflicts: identityConflicts.length,
    deduplicationStatus: identityConflicts.length === 0 ? "EXACT_ID_PASS_FALLBACK_PENDING" : "IN_PROGRESS",
    completedAt: (deps.now || (() => new Date()))().toISOString() };
  return await write("manifest.json", manifest);
  } catch (error) {
    try {
      await write(`failures/${attemptId}.json`, { runId, attemptId, status: "INCOMPLETE",
        code: error.safeCode || "UNEXPECTED_FAILURE", httpStatus: error.httpStatus || null,
        completedQueries: queries, recordedAt: (deps.now || (() => new Date()))().toISOString() });
    } catch { error.failureReceiptUnavailable = true; }
    error.runId = runId;
    throw error;
  }
}

module.exports = { MAILBOXES, WINDOW, READER_VERSION, firstUrl, messageRecord,
  scanQuery, scanFolders, deduplicateRecords, enrichWithDeliveryLedger, enrichWithInboundEvents,
  readInboundEvidencePrefix,
  runPortfolioMailboxReconciliation };
