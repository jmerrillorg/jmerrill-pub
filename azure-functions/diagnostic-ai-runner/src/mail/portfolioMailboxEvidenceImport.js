"use strict";

const { createHash } = require("node:crypto");
const { MAILBOXES, WINDOW, READER_VERSION } = require("./portfolioMailboxReconciliationReader");
const TEXT_FIELDS = ["readerVersion", "sourceMailbox", "sourceMessageId", "graphMessageId", "internetMessageId",
  "conversationId", "parentFolderId", "from", "receivedAt", "sentAt", "createdAt", "lastModifiedAt", "subject",
  "bodyHash", "direction", "extractedAt", "correlationStatus", "titleId", "authorId", "engagementId", "stageId",
  "communicationRecordId", "providerMessageId", "deliveryLedgerId", "inboundMessageEventId"];
const MAIL_FIELDS = new Set([...TEXT_FIELDS, "to", "cc", "bcc", "hasAttachments", "sourceQueryWindow",
  "sources", "observations", "sourceQueries", "conflictingObservations"]);

function validateEvidenceImport(manifest, document, coverage) {
  const requireProof = (condition, code) => { if (!condition) throw new Error(code); };
  const validateMetadata = (row) => {
    requireProof(row && typeof row === "object" && !Array.isArray(row) &&
      Object.keys(row).every(key => MAIL_FIELDS.has(key)), "UNEXPECTED_MAIL_METADATA");
    requireProof(TEXT_FIELDS.every(key => row[key] == null || typeof row[key] === "string"), "INVALID_MAIL_METADATA");
    for (const key of ["to", "cc", "bcc", "sourceQueries"]) {
      requireProof(row[key] === undefined || (Array.isArray(row[key]) && row[key].every(value => typeof value === "string")), "INVALID_MAIL_METADATA");
    }
    requireProof(typeof row.hasAttachments === "boolean" && row.readerVersion === READER_VERSION &&
      (row.bodyHash === null || /^[0-9a-f]{64}$/.test(row.bodyHash)), "INVALID_MAIL_METADATA");
    requireProof(row.sourceQueryWindow && Object.keys(row.sourceQueryWindow).length === Object.keys(WINDOW).length + 1 &&
      Object.entries(WINDOW).every(([key, value]) => row.sourceQueryWindow[key] === value) &&
      ["receivedDateTime", "sentDateTime"].includes(row.sourceQueryWindow.timestampField), "INVALID_OBSERVATION_WINDOW");
    for (const key of ["sources", "observations", "conflictingObservations"]) {
      requireProof(row[key] === undefined || Array.isArray(row[key]), "INVALID_MAIL_METADATA");
      for (const child of row[key] || []) validateMetadata(child);
    }
  };
  requireProof(manifest.status === "EXTRACTED" && manifest.readerVersion === READER_VERSION, "INCOMPLETE_OR_WRONG_READER");
  requireProof(JSON.stringify(manifest.window) === JSON.stringify(WINDOW), "WRONG_WINDOW");
  requireProof(JSON.stringify(manifest.sourceMailboxes) === JSON.stringify(MAILBOXES), "WRONG_MAILBOX_SCOPE");
  const expected = MAILBOXES.flatMap((mailbox) => ["receivedDateTime", "sentDateTime"].map((field) => `${mailbox}:${field}`));
  const actual = manifest.queries?.map((query) => `${query.mailbox}:${query.field}`) || [];
  requireProof(actual.length === expected.length && expected.every((key) => actual.filter((value) => value === key).length === 1), "INCOMPLETE_MAILBOX_QUERIES");
  requireProof(manifest.queries.every((query) => Number.isInteger(query.pages) && query.pages > 0 && Number.isInteger(query.count) && query.count >= 0), "INVALID_QUERY_COUNTS");
  requireProof(manifest.queries.reduce((sum, query) => sum + query.count, 0) === manifest.rawRowCountBeforeSameMailboxDeduplication, "RAW_ROW_COUNT_MISMATCH");
  requireProof(Array.isArray(coverage.folderCoverage) && coverage.folderCoverage.length === MAILBOXES.length &&
    MAILBOXES.every((mailbox) => coverage.folderCoverage.filter((row) => row.mailbox === mailbox).length === 1), "INCOMPLETE_FOLDER_COVERAGE");
  requireProof(manifest.folderCoverageStatus === "ENUMERATED" && manifest.unmatchedFolderIds.length === 0 && coverage.unmatchedFolderIds.length === 0, "UNRESOLVED_FOLDER_COVERAGE");
  requireProof(createHash("sha256").update(JSON.stringify(document)).digest("hex") === manifest.eventsSha256, "EVENT_DIGEST_MISMATCH");
  requireProof(Array.isArray(document.events) && Array.isArray(document.conflicts) && document.events.length === manifest.mailEventCount, "EVENT_COUNT_MISMATCH");
  requireProof(Object.keys(document).every(key => ["events", "conflicts"].includes(key)) &&
    document.conflicts.every(row => row && typeof row.type === "string" && Object.entries(row).every(([key, value]) =>
      ["type", "key", "internetMessageId", "sourceMailbox", "graphMessageId"].includes(key) && typeof value === "string")), "UNEXPECTED_MAIL_METADATA");
  requireProof(manifest.durableIdentityCompleteCount === document.events.length && document.events.every((event) =>
    event.graphMessageId && MAILBOXES.includes(event.sourceMailbox) && event.sources?.length > 0), "DURABLE_IDENTITY_INCOMPLETE");
  const sourceKeys = new Set();
  const folderIds = new Set(coverage.folderCoverage.flatMap(row => row.folders.map(folder => `${row.mailbox}:${folder.id}`)));
  const queryCounts = new Map(expected.map(key => [key, 0]));
  let observationCount = 0;
  for (const event of document.events) {
    validateMetadata(event);
    requireProof(event.correlationStatus !== "CONFLICT_HELD" ||
      ["titleId", "authorId", "engagementId", "stageId", "communicationRecordId", "providerMessageId",
        "deliveryLedgerId", "inboundMessageEventId"].every(key => !event[key]), "HELD_EVENT_AUTHORITY");
  }
  for (const event of document.events) for (const source of event.sources) {
    requireProof(source.graphMessageId && MAILBOXES.includes(source.sourceMailbox), "INVALID_MAILBOX_SOURCE");
    const key = `${source.sourceMailbox}:${source.graphMessageId}`;
    requireProof(!sourceKeys.has(key), "DUPLICATE_GRAPH_SOURCE");
    sourceKeys.add(key);
    requireProof(Array.isArray(source.observations) && source.observations.length > 0, "MISSING_SOURCE_OBSERVATIONS");
    requireProof(source.observations.every(row => row.graphMessageId === source.graphMessageId &&
      row.sourceMailbox === source.sourceMailbox), "OBSERVATION_SOURCE_MISMATCH");
    for (const row of source.observations) {
      requireProof(row.sourceMessageId === row.graphMessageId, "OBSERVATION_SOURCE_MISMATCH");
      const field = row.sourceQueryWindow.timestampField;
      const timestamp = Date.parse(field === "receivedDateTime" ? row.receivedAt : row.sentAt);
      requireProof(Number.isFinite(timestamp) && timestamp >= Date.parse(WINDOW.start) &&
        timestamp < Date.parse(WINDOW.endExclusive), "INVALID_OBSERVATION_WINDOW");
      requireProof(folderIds.has(`${row.sourceMailbox}:${row.parentFolderId}`), "INVALID_OBSERVATION_FOLDER");
      const queryKey = `${row.sourceMailbox}:${field}`;
      queryCounts.set(queryKey, queryCounts.get(queryKey) + 1);
    }
    observationCount += source.observations.length;
  }
  requireProof(observationCount === manifest.rawRowCountBeforeSameMailboxDeduplication, "OBSERVATION_COUNT_MISMATCH");
  requireProof(manifest.queries.every(query => queryCounts.get(`${query.mailbox}:${query.field}`) === query.count), "QUERY_OBSERVATION_COUNT_MISMATCH");
  requireProof(sourceKeys.size === manifest.graphDistinctCount && sourceKeys.size <= manifest.rawRowCountBeforeSameMailboxDeduplication, "GRAPH_COUNT_MISMATCH");
  requireProof(document.conflicts.length === manifest.unresolvedIdentityConflicts, "CONFLICT_COUNT_MISMATCH");
  return {
    runId: manifest.runId, rawRowCount: manifest.rawRowCountBeforeSameMailboxDeduplication,
    messageCount: document.events.length, identityConflicts: document.conflicts.length,
    unresolvedTitleCount: document.events.filter((event) => !event.titleId || !event.authorId || event.correlationStatus === "CONFLICT_HELD").length,
    missingInternetIdentityCount: document.events.filter((event) => !event.internetMessageId).length,
    sourceCoverage: "TWO_PRIMARY_MAILBOXES_ONLY",
    fullPortfolioReconciled: false,
    replacementPolicy: "NEW_VERSIONED_EVIDENCE_ONLY_KEEP_PROVISIONAL_AND_EXCEPTIONS"
  };
}

module.exports = { validateEvidenceImport };
