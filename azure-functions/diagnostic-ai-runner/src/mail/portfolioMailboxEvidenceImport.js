"use strict";

const { createHash } = require("node:crypto");
const { MAILBOXES, WINDOW, READER_VERSION } = require("./portfolioMailboxReconciliationReader");

function validateEvidenceImport(manifest, document, coverage) {
  const requireProof = (condition, code) => { if (!condition) throw new Error(code); };
  requireProof(manifest.status === "EXTRACTED" && manifest.readerVersion === READER_VERSION, "INCOMPLETE_OR_WRONG_READER");
  requireProof(JSON.stringify(manifest.window) === JSON.stringify(WINDOW), "WRONG_WINDOW");
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
  requireProof(manifest.durableIdentityCompleteCount === document.events.length && document.events.every((event) =>
    event.graphMessageId && MAILBOXES.includes(event.sourceMailbox) && event.sources?.length > 0), "DURABLE_IDENTITY_INCOMPLETE");
  const sourceKeys = new Set();
  for (const event of document.events) for (const source of event.sources) {
    requireProof(source.graphMessageId && MAILBOXES.includes(source.sourceMailbox), "INVALID_MAILBOX_SOURCE");
    sourceKeys.add(`${source.sourceMailbox}:${source.graphMessageId}`);
  }
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
