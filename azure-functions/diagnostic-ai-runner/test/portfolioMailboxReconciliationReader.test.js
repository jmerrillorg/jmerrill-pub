"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { firstUrl, messageRecord, scanQuery, scanFolders, deduplicateRecords, enrichWithDeliveryLedger,
  enrichWithInboundEvents, readInboundEvidencePrefix,
  runPortfolioMailboxReconciliation } =
  require("../src/mail/portfolioMailboxReconciliationReader");

function message(id) {
  return { id, internetMessageId: `<${id}@example.org>`, conversationId: "thread-1",
    parentFolderId: "folder-1", from: { emailAddress: { address: "author@example.org" } },
    toRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }],
    ccRecipients: [], bccRecipients: [], receivedDateTime: "2026-09-21T12:00:00Z", sentDateTime: "2026-09-21T12:00:00Z",
    subject: "Review", bodyPreview: "Short preview", body: { content: "Private message body" },
    hasAttachments: false };
}

test("fixed-window reader preserves Graph identities and hashes body without exporting it", () => {
  const row = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime",
    "2026-10-02T12:00:00.000Z");
  assert.equal(row.internetMessageId, "<m1@example.org>");
  assert.equal(row.graphMessageId, "m1");
  assert.equal(row.conversationId, "thread-1");
  assert.equal(row.parentFolderId, "folder-1");
  assert.equal(row.direction, "INBOUND");
  assert.match(row.bodyHash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(row).includes("Private message body"), false);
  assert.equal(Object.hasOwn(row, "bodyPreview"), false);
  assert.throws(() => firstUrl("attacker@example.org", "receivedDateTime"), /QUERY_NOT_ALLOWED/);
  assert.equal(row.sourceQueryWindow.start, "2026-07-03T04:00:00Z");
  assert.equal(row.sourceQueryWindow.endExclusive, "2026-10-02T04:00:00Z");
});

test("scanner follows only same-mailbox Graph next links with immutable IDs", async () => {
  const pages = [];
  const first = firstUrl("publishing@jmerrill.one", "receivedDateTime");
  const next = `${first}&$skip=100`;
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url === first
      ? { value: [message("m1")], "@odata.nextLink": next }
      : { value: [message("m2")] } };
  };
  const result = await scanQuery("publishing@jmerrill.one", "receivedDateTime", "token",
    async (page) => pages.push(page), { fetchImpl, now: () => new Date("2026-10-02T12:00:00Z") });
  assert.deepEqual({ pages: result.pages, count: result.count }, { pages: 2, count: 2 });
  assert.equal(calls.every((call) => call.options.method === "GET"), true);
  assert.equal(calls.every((call) => call.options.redirect === "error"), true);
  assert.equal(calls.every((call) => call.options.headers.Prefer.includes('IdType="ImmutableId"')), true);
  assert.equal(pages[0].records[0].sourceMailbox, "publishing@jmerrill.one");
  await assert.rejects(scanQuery("publishing@jmerrill.one", "receivedDateTime", "token",
    async () => {}, { fetchImpl: async () => ({ ok: true, json: async () => ({ value: [],
      "@odata.nextLink": "https://evil.example/messages" }) }) }), /NEXT_LINK_UNTRUSTED/);
});

test("deduplication uses provider identity, preserving every mailbox source", () => {
  const first = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "2026-10-02T12:00:00Z");
  const sameMailbox = { ...first, sourceQueryWindow: { ...first.sourceQueryWindow,
    timestampField: "sentDateTime" } };
  const secondMailbox = { ...first, sourceMailbox: "jackie@jmerrill.one", graphMessageId: "m2",
    sourceMessageId: "m2" };
  const { events, conflicts, graphDistinctCount } = deduplicateRecords([first, sameMailbox, secondMailbox]);
  assert.equal(graphDistinctCount, 2);
  assert.equal(events.length, 1);
  assert.equal(events[0].sources.length, 2);
  assert.deepEqual(conflicts, []);
  const collision = deduplicateRecords([first, { ...secondMailbox, subject: "Unrelated" }]);
  assert.equal(collision.events.length, 2);
  assert.equal(collision.conflicts[0].type, "INTERNET_IDENTITY_CONFLICT");
});

test("delivery ledger enriches only exact Internet Message ID matches", () => {
  const matched = messageRecord(message("m1"), "publishing@jmerrill.one", "sentDateTime", "2026-10-02T12:00:00Z");
  const unrelated = messageRecord(message("m2"), "jackie@jmerrill.one", "sentDateTime", "2026-10-02T12:00:00Z");
  const delivery = { internetMessageId: "<m1@example.org>", outboundMessageId: "acs-1",
    communicationRecordId: "comm-1", titleId: "title-1", authorId: "author-1",
    engagementId: "engagement-1", stageId: "stage-1", deliveryId: "delivery-1" };
  const result = enrichWithDeliveryLedger([matched, unrelated], [delivery]);
  assert.equal(result.linkedDeliveryCount, 1);
  assert.equal(result.events[0].communicationRecordId, "comm-1");
  assert.equal(result.events[0].titleId, "title-1");
  assert.equal(result.events[1].communicationRecordId, undefined);
  assert.deepEqual(result.conflicts, []);
  const conflicting = enrichWithDeliveryLedger([matched], [delivery,
    { ...delivery, communicationRecordId: "other" }]);
  assert.equal(conflicting.conflicts[0].type, "DELIVERY_IDENTITY_CONFLICT");
  assert.equal(conflicting.linkedDeliveryCount, 0);
  assert.equal(conflicting.events[0].titleId, undefined);
});

test("inbound event join uses deterministic exact IDs and preserves conflicts", () => {
  const event = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "2026-10-02T12:00:00Z");
  const inbound = { mailbox: "publishing@jmerrill.one", graphMessageId: "m1",
    internetMessageId: "<m1@example.org>", correlationStatus: "DETERMINISTIC",
    titleId: "title-1", authorId: "author-1", stageId: "stage-1",
    inboundMessageEventId: "event-1" };
  const linked = enrichWithInboundEvents([event], [inbound]);
  assert.equal(linked.linkedInboundCount, 1);
  assert.equal(linked.events[0].titleId, "title-1");
  assert.equal(linked.events[0].inboundMessageEventId, "event-1");
  const held = enrichWithInboundEvents([event], [{ ...inbound, correlationStatus: "UNRESOLVED" }]);
  assert.equal(held.linkedInboundCount, 0);
  const conflict = enrichWithInboundEvents([{ ...event, titleId: "other-title" }], [inbound]);
  assert.equal(conflict.linkedInboundCount, 0);
  assert.equal(conflict.conflicts[0].type, "MAIL_SOURCE_CORRELATION_CONFLICT");
});

function harness() {
  const writes = new Map();
  const containerClient = {
    createIfNotExists: async () => {},
    getBlockBlobClient: (path) => ({ downloadToBuffer: async () => {
      if (!writes.has(path)) throw Object.assign(new Error("not found"), { statusCode: 404 });
      return Buffer.from(JSON.stringify(writes.get(path)));
    }, uploadData: async (bytes, options) => {
      assert.equal(options.conditions.ifNoneMatch, "*");
      if (writes.has(path)) throw Object.assign(new Error("exists"), { statusCode: 412 });
      writes.set(path, JSON.parse(bytes.toString("utf8")));
    } })
  };
  const deps = { containerClient, deliveryRecords: [], inboundEvents: [],
    credential: { getToken: async () => ({ token: "secret" }) },
    runId: "11111111-1111-4111-8111-111111111111",
    now: () => new Date("2026-10-02T12:00:00Z"),
    fetchImpl: async (url) => ({ ok: true, json: async () => ({ value: url.includes("mailFolders")
      ? [{ id: "folder-1", displayName: "Inbox", childFolderCount: 0 }]
      : [message("m1")] }) }) };
  return { writes, deps };
}

test("partial delivery and inbound evidence cannot mask conflicting later bindings", () => {
  const event = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "now");
  const base = { internetMessageId: event.internetMessageId, titleId: "title", authorId: "author",
    correlationStatus: "DETERMINISTIC", communicationRecordId: "comm", outboundMessageId: "provider" };
  const deliveries = [{ ...base, stageId: "one" }, base, { ...base, stageId: "two" }];
  const inbounds = [base, { ...base, stageId: "one" }, { ...base, stageId: "two" }];
  for (const rows of [deliveries, deliveries.toReversed(), inbounds]) {
    assert.equal(enrichWithDeliveryLedger([event], rows).events[0].correlationStatus, "CONFLICT_HELD");
    assert.equal(enrichWithInboundEvents([event], rows).events[0].correlationStatus, "CONFLICT_HELD");
  }
  const differentKeys = [base,
    { ...base, internetMessageId: null, mailbox: "publishing@jmerrill.one", graphMessageId: "m1", stageId: "one" }];
  assert.equal(enrichWithInboundEvents([{ ...event, stageId: "two" }], differentKeys)
    .events[0].correlationStatus, "CONFLICT_HELD");
});

test("a poisoned inbound Graph identity holds every linked Internet copy", () => {
  const event = messageRecord(message("copy"), "jackie@jmerrill.one", "receivedDateTime", "now");
  const inbound = { internetMessageId: event.internetMessageId, graphMessageId: "original",
    mailbox: "publishing@jmerrill.one", correlationStatus: "DETERMINISTIC", titleId: "title",
    authorId: "author", stageId: "one" };
  const contradictory = { ...inbound, internetMessageId: "<other@example.org>", stageId: "two" };
  for (const rows of [[inbound, contradictory], [contradictory, inbound]]) {
    const result = enrichWithInboundEvents([event], rows);
    assert.equal(result.events[0].correlationStatus, "CONFLICT_HELD");
    assert.equal(result.events[0].titleId, undefined);
    assert.equal(result.linkedInboundCount, 0);
  }
});

test("import rejects body leakage, out-of-window observations and forged query coverage", async () => {
  const { writes, deps } = harness();
  const manifest = await runPortfolioMailboxReconciliation(deps);
  const original = [...writes.entries()].find(([key]) => key.endsWith("mail-events.json"))[1];
  const coverage = [...writes.entries()].find(([key]) => key.endsWith("folder-coverage.json"))[1];
  const { validateEvidenceImport } = require("../src/mail/portfolioMailboxEvidenceImport");
  for (const [mutate, code] of [
    [doc => { doc.events[0].sources[0].observations[0].body = "private"; }, /UNEXPECTED_MAIL_METADATA/],
    [doc => { doc.events[0].bodyPreview = "entire short message"; }, /UNEXPECTED_MAIL_METADATA/],
    [doc => { doc.events[0].sources[0].observations[0].receivedAt = "2026-01-01T00:00:00Z"; }, /OBSERVATION_WINDOW/],
    [doc => { doc.events[0].sources[0].observations[0].sourceQueryWindow.timestampField = "sentDateTime"; }, /QUERY_OBSERVATION_COUNT/],
    [doc => { doc.events[0].sources[0].observations[0].parentFolderId = "unknown"; }, /OBSERVATION_FOLDER/],
    [doc => { doc.events[0].correlationStatus = "CONFLICT_HELD"; doc.events[0].titleId = "title"; }, /HELD_EVENT_AUTHORITY/]
  ]) {
    const document = structuredClone(original);
    mutate(document);
    const eventsSha256 = require("node:crypto").createHash("sha256").update(JSON.stringify(document)).digest("hex");
    assert.throws(() => validateEvidenceImport({ ...manifest, eventsSha256 }, document, coverage), code);
  }
});

test("a conflicting mailbox copy poisons every Internet identity regardless of input order", () => {
  const first = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "2026-10-02T12:00:00Z");
  const second = { ...first, sourceMailbox: "jackie@jmerrill.one", graphMessageId: "m2" };
  const conflicting = { ...second, internetMessageId: "<changed@example.org>" };
  const otherIdentityCopy = { ...first, graphMessageId: "m3", internetMessageId: conflicting.internetMessageId };
  for (const rows of [[first, second, conflicting, otherIdentityCopy], [conflicting, second, otherIdentityCopy, first]]) {
    const dedup = deduplicateRecords(rows);
    assert.equal(dedup.events.every(event => event.correlationStatus === "CONFLICT_HELD"), true);
    const joined = enrichWithInboundEvents(dedup.events, [
      { internetMessageId: first.internetMessageId, correlationStatus: "DETERMINISTIC", titleId: "title", authorId: "author" },
      { internetMessageId: conflicting.internetMessageId, correlationStatus: "DETERMINISTIC", titleId: "title", authorId: "author" }
    ]);
    assert.equal(joined.linkedInboundCount, 0);
    assert.equal(joined.events.every(event => !event.titleId), true);
  }
});

test("same-mailbox repeated observations retain participants and timestamps", () => {
  const first = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "2026-10-02T12:00:00Z");
  const later = { ...first, bcc: ["audit@example.org"], lastModifiedAt: "2026-10-02T13:00:00Z",
    sourceQueryWindow: { ...first.sourceQueryWindow, timestampField: "sentDateTime" } };
  const { events } = deduplicateRecords([first, later]);
  assert.equal(events[0].sources[0].observations.length, 2);
  assert.deepEqual(events[0].sources[0].observations[1].bcc, later.bcc);
  assert.equal(events[0].sources[0].observations[1].lastModifiedAt, later.lastModifiedAt);
});

test("missing initial body hashes cannot hide conflicting later message observations", () => {
  const first = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "now");
  const rows = [{ ...first, bodyHash: null }, { ...first, bodyHash: "a" }, { ...first, bodyHash: "b" }];
  assert.equal(deduplicateRecords(rows).events.every(event => event.correlationStatus === "CONFLICT_HELD"), true);
  const copies = rows.map((row, index) => ({ ...row, graphMessageId: `m${index}` }));
  assert.equal(deduplicateRecords(copies).events.every(event => event.correlationStatus === "CONFLICT_HELD"), true);
});

test("complete manifest is written only after both mailboxes and both timestamp scans finish", async () => {
  const { writes, deps } = harness();
  const result = await runPortfolioMailboxReconciliation(deps);
  assert.equal(result.queries.length, 4);
  assert.equal(result.rawRowCountBeforeSameMailboxDeduplication, 4);
  assert.equal(result.mailEventCount, 1);
  assert.equal(result.durableIdentityCompleteCount, 1);
  assert.equal(result.deduplicationStatus, "EXACT_ID_PASS_FALLBACK_PENDING");
  assert.equal(result.folderCoverageStatus, "ENUMERATED");
  assert.equal(result.folderCounts.length, 2);
  const { validateEvidenceImport } = require("../src/mail/portfolioMailboxEvidenceImport");
  const document = [...writes.entries()].find(([key]) => key.endsWith("mail-events.json"))[1];
  const coverage = [...writes.entries()].find(([key]) => key.endsWith("folder-coverage.json"))[1];
  assert.equal(validateEvidenceImport(result, document, coverage).messageCount, 1);
  assert.throws(() => validateEvidenceImport({ ...result, queries: result.queries.slice(1) }, document, coverage), /INCOMPLETE_MAILBOX/);
  assert.throws(() => validateEvidenceImport(result, { ...document, events: [] }, coverage), /DIGEST/);
  assert.throws(() => validateEvidenceImport(result, document, { ...coverage, unmatchedFolderIds: ["missing"] }), /FOLDER_COVERAGE/);
  assert.throws(() => validateEvidenceImport({ ...result, rawRowCountBeforeSameMailboxDeduplication: 99 }, document, coverage), /ROW_COUNT/);
  assert.throws(() => validateEvidenceImport({ ...result, graphDistinctCount: 99 }, document, coverage), /GRAPH_COUNT/);
  assert.equal([...writes.keys()].some((key) => key.endsWith("manifest.json")), true);
  writes.clear();
  await assert.rejects(runPortfolioMailboxReconciliation({ ...deps,
    fetchImpl: async () => ({ ok: false, status: 403 }) }), error => {
      assert.match(error.message, /GRAPH_READ_FAILED/);
      assert.equal(error.failureReceiptUnavailable, false);
      return true;
    });
  assert.equal([...writes.keys()].some((key) => key.endsWith("manifest.json")), false);
  const failure = [...writes.entries()].find(([key]) => key.includes("failures/"))[1];
  assert.equal(failure.httpStatus, 403);
  assert.equal(JSON.stringify(failure).includes("secret"), false);
});

test("restart reuses durable pages and completed replay makes no Graph calls", async () => {
  const { writes, deps } = harness();
  let reads = 0;
  await assert.rejects(runPortfolioMailboxReconciliation({ ...deps, fetchImpl: async (url) => {
    reads += 1;
    if (reads === 3) return { ok: false, status: 403 };
    return deps.fetchImpl(url);
  } }), /GRAPH_READ_FAILED/);
  assert.equal([...writes.keys()].some((key) => key.includes("receivedDateTime/0000")), true);
  const restartedUrls = [];
  const result = await runPortfolioMailboxReconciliation({ ...deps, fetchImpl: async (url) => {
    restartedUrls.push(url);
    return deps.fetchImpl(url);
  } });
  assert.equal(result.queries.length, 4);
  assert.equal(restartedUrls.some((url) => url.includes("publishing%40") && url.includes("receivedDateTime+ge")), false);
  const replay = await runPortfolioMailboxReconciliation({ ...deps, fetchImpl: async () => { throw Error("must not fetch"); } });
  assert.deepEqual(replay, result);
});

test("folders recurse through hidden children and every continuation page", async () => {
  const calls = [];
  const root = "https://graph.microsoft.com/v1.0/users/publishing%40jmerrill.one/mailFolders";
  const result = await scanFolders("publishing@jmerrill.one", "token", { fetchImpl: async (url) => {
    calls.push(url);
    return { ok: true, json: async () => url.includes("childFolders")
      ? { value: [{ id: "child", isHidden: true }] }
      : url.includes("skiptoken") ? { value: [{ id: "second" }] }
        : { value: [{ id: "first", childFolderCount: 1 }], "@odata.nextLink": `${root}?$skiptoken=next` } };
  } });
  assert.equal(result.folders.length, 3);
  assert.equal(calls.length, 3);
  assert.equal(calls.some((url) => url.includes("childFolders?includeHiddenFolders=true")), true);
});

test("Graph throttling retries and long Retry-After returns a resumable failure", async () => {
  let calls = 0;
  const sleeps = [];
  const result = await scanQuery("publishing@jmerrill.one", "receivedDateTime", "token", async () => {}, {
    sleep: async (ms) => sleeps.push(ms), fetchImpl: async () => ++calls === 1
      ? { ok: false, status: 429, headers: { get: () => "2" } }
      : { ok: true, json: async () => ({ value: [] }) }
  });
  assert.equal(result.pages, 1);
  assert.deepEqual(sleeps, [2000]);
  await assert.rejects(scanQuery("publishing@jmerrill.one", "receivedDateTime", "token", async () => {}, {
    fetchImpl: async () => ({ ok: false, status: 429, headers: { get: () => "120" } })
  }), /RETRY_LATER/);
});

test("exact Internet identity is case sensitive and source BCC/participants survive dedup", () => {
  const first = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "now");
  const copy = { ...first, sourceMailbox: "jackie@jmerrill.one", graphMessageId: "m2", bcc: ["private@example.org"] };
  const result = deduplicateRecords([first, copy]);
  assert.deepEqual(result.events[0].sources[1].bcc, ["private@example.org"]);
  assert.equal(deduplicateRecords([first, { ...copy, internetMessageId: "<M1@example.org>" }]).events.length, 2);
  const conflict = deduplicateRecords([first, { ...copy, bodyHash: "other" }]);
  assert.equal(conflict.events.every((event) => event.correlationStatus === "CONFLICT_HELD"), true);
});

test("delivery tuple conflicts stay poisoned even when a third record agrees", () => {
  const event = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "now");
  const delivery = { internetMessageId: event.internetMessageId, titleId: "a", authorId: "author", communicationRecordId: "c" };
  const result = enrichWithDeliveryLedger([event], [delivery, { ...delivery, titleId: "b" }, delivery]);
  assert.equal(result.linkedDeliveryCount, 0);
  assert.equal(result.events[0].correlationStatus, "CONFLICT_HELD");
});

test("all mailbox copies participate in inbound binding and disagreeing keys fail closed", () => {
  const event = messageRecord(message("m1"), "publishing@jmerrill.one", "receivedDateTime", "now");
  event.sources = [event, { sourceMailbox: "jackie@jmerrill.one", graphMessageId: "m2" }];
  const inbound = { correlationStatus: "DETERMINISTIC", mailbox: "jackie@jmerrill.one", graphMessageId: "m2", titleId: "a", authorId: "author" };
  assert.equal(enrichWithInboundEvents([event], [inbound]).linkedInboundCount, 1);
  const result = enrichWithInboundEvents([event], [inbound, { ...inbound, graphMessageId: "other", internetMessageId: event.internetMessageId, titleId: "b" }]);
  assert.equal(result.linkedInboundCount, 0);
  assert.equal(result.events[0].titleId, undefined);
});

test("stored runs from a different contract cannot be resumed", async () => {
  const { writes, deps } = harness();
  writes.set(`runs/${deps.runId}/contract.json`, { readerVersion: "old" });
  await assert.rejects(runPortfolioMailboxReconciliation(deps), /RUN_CONTRACT_MISMATCH/);
});

test("lost manifest write is recovered from durable evidence without rescanning", async () => {
  const { writes, deps } = harness();
  await runPortfolioMailboxReconciliation(deps);
  writes.delete(`runs/${deps.runId}/manifest.json`);
  const result = await runPortfolioMailboxReconciliation({ ...deps, fetchImpl: async () => { throw Error("unexpected fresh read"); } });
  assert.equal(result.mailEventCount, 1);
});

test("inbound evidence restart reuses per-record metadata without copying bodies", async () => {
  const cache = new Map();
  let reads = 0;
  const deps = { readCheckpoint: async (key) => cache.get(key),
    writeCheckpoint: async (key, value) => { cache.set(key, value); return value; },
    inboundContainerClient: {
      async *listBlobsFlat() { yield { name: "messages/a.json" }; yield { name: "messages/b.json" }; },
      getBlockBlobClient: (name) => ({ downloadToBuffer: async () => {
        reads += 1;
        if (reads === 2) throw Error("interrupted");
        return Buffer.from(JSON.stringify({ titleId: name, body: "private full body" }));
      } })
    } };
  await assert.rejects(readInboundEvidencePrefix("messages/", null, deps), /interrupted/);
  const records = await readInboundEvidencePrefix("messages/", null, deps);
  assert.equal(reads, 3);
  assert.equal(records.length, 2);
  assert.equal(records[0].sourceEvidence.blobName, "messages/a.json");
  assert.match(records[0].sourceEvidence.sha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(records).includes("private full body"), false);
});

test("missing or out-of-window timestamps fail the extraction rather than contaminating coverage", () => {
  for (const timestamp of [null, "invalid", "2026-07-03T03:59:59Z", "2026-10-02T04:00:00Z"]) {
    assert.throws(() => messageRecord({ ...message("m"), receivedDateTime: timestamp }, "publishing@jmerrill.one", "receivedDateTime", "now"), /OUTSIDE_QUERY_WINDOW/);
  }
  assert.equal(messageRecord({ ...message("m"), receivedDateTime: "2026-07-03T04:00:00Z" }, "publishing@jmerrill.one", "receivedDateTime", "now").graphMessageId, "m");
});
