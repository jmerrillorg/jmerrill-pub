"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { firstUrl, messageRecord, scanQuery, deduplicateRecords, runPortfolioMailboxReconciliation } =
  require("../src/mail/portfolioMailboxReconciliationReader");

function message(id) {
  return { id, internetMessageId: `<${id}@example.org>`, conversationId: "thread-1",
    parentFolderId: "folder-1", from: { emailAddress: { address: "author@example.org" } },
    toRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }],
    ccRecipients: [], bccRecipients: [], receivedDateTime: "2026-09-21T12:00:00Z",
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

test("complete manifest is written only after both mailboxes and both timestamp scans finish", async () => {
  const writes = new Map();
  const containerClient = {
    createIfNotExists: async () => {},
    getBlockBlobClient: (path) => ({ uploadData: async (bytes, options) => {
      assert.equal(options.conditions.ifNoneMatch, "*");
      writes.set(path, JSON.parse(bytes.toString("utf8")));
    } })
  };
  const deps = { containerClient, credential: { getToken: async () => ({ token: "secret" }) },
    runId: "11111111-1111-4111-8111-111111111111",
    now: () => new Date("2026-10-02T12:00:00Z"),
    fetchImpl: async () => ({ ok: true, json: async () => ({ value: [message("m1")] }) }) };
  const result = await runPortfolioMailboxReconciliation(deps);
  assert.equal(result.queries.length, 4);
  assert.equal(result.rawRowCountBeforeSameMailboxDeduplication, 4);
  assert.equal(result.mailEventCount, 1);
  assert.equal(writes.size, 6);
  assert.equal([...writes.keys()].some((key) => key.endsWith("manifest.json")), true);
  writes.clear();
  await assert.rejects(runPortfolioMailboxReconciliation({ ...deps,
    fetchImpl: async () => ({ ok: false, status: 403 }) }), /GRAPH_READ_FAILED/);
  assert.equal(writes.size, 0);
});
