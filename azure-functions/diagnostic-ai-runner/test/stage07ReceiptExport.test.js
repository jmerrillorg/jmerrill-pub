"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { RECEIPTS, MAX_BYTES, exportStage07Receipts } = require("../src/author/stage07ReceiptExport");
const { handleStage07ReceiptExport } = require("../src/functions/readStage07Receipts");

function fixture(overrides = {}) {
  const reads = [];
  const bytes = Buffer.from('{"stageCompletionApproved":false,"nextStageAuthorized":false}');
  const container = {
    getProperties: async () => ({ blobPublicAccess: overrides.publicAccess }),
    getBlobClient(name) {
      assert.ok(RECEIPTS.includes(name));
      return {
        getProperties: async () => {
          if (overrides.error) throw Object.assign(new Error("PRIVATE_ERROR"), { statusCode: overrides.error });
          return { etag: '"original"', contentLength: overrides.size ?? bytes.length, lastModified: new Date("2026-10-23T00:00:00Z") };
        },
        downloadToBuffer: async (offset, length, options) => {
          assert.equal(offset, 0);
          assert.equal(length, bytes.length);
          assert.equal(options.conditions.ifMatch, '"original"');
          if (overrides.changed) throw Object.assign(new Error("ETAG_CHANGED"), { statusCode: 412 });
          reads.push(name);
          return overrides.short ? bytes.subarray(1) : bytes;
        },
      };
    },
  };
  return { container, reads, bytes };
}
function request(key = "test-secret", suffix = "", method = "GET") {
  return { method, url: `https://example.test/api/publishing/authority/stage07-receipts${suffix}`,
    headers: new Headers(key ? { "x-jm1-diagnostic-runner-key": key } : {}) };
}

test("fixed scope contains exactly five of each receipt kind and twenty unique paths", () => {
  assert.equal(RECEIPTS.length, 20);
  assert.equal(new Set(RECEIPTS).size, 20);
  for (const suffix of ["/send.json", "/decision.json", "/result.json"]) {
    assert.equal(RECEIPTS.filter(p => p.endsWith(suffix)).length, 5);
  }
  assert.equal(RECEIPTS.filter(p => p.includes("/executions/")).length, 5);
});
test("exports exact bytes with independent digest, pinned ETag and no mutation API", async () => {
  const f = fixture();
  const result = await exportStage07Receipts(f.container);
  assert.equal(result.count, 20);
  assert.deepEqual(f.reads, RECEIPTS);
  for (const row of result.rows) {
    assert.deepEqual(Buffer.from(row.bytesBase64, "base64"), f.bytes);
    assert.equal(row.sha256, createHash("sha256").update(f.bytes).digest("hex"));
    assert.equal(row.etag, '"original"');
  }
});
test("repeated exports preserve every byte and ETag without writes or business imports", async () => {
  const f = fixture();
  const first = await exportStage07Receipts(f.container);
  const second = await exportStage07Receipts(f.container);
  assert.deepEqual(first.rows, second.rows);
  assert.equal(f.reads.length, 40);
});
test("missing or incorrect authentication never accesses storage", async () => {
  for (const key of [null, "wrong", "test-secreu"]) {
    const container = { getProperties: () => { throw new Error("MUST_NOT_READ"); } };
    assert.equal((await handleStage07ReceiptExport(request(key), { expectedKey: "test-secret", container })).status, 401);
  }
});
test("rejects arbitrary paths, query options and non-GET before reading", async () => {
  for (const req of [request(undefined, "?blob=other"), request(undefined, "?action=replay"), request(undefined, "", "POST")]) {
    const f = fixture();
    assert.equal((await handleStage07ReceiptExport(req, { expectedKey: "test-secret", container: f.container })).status, 400);
    assert.equal(f.reads.length, 0);
  }
});
test("authenticated export prohibits caching", async () => {
  const result = await handleStage07ReceiptExport(request(), { expectedKey: "test-secret", container: fixture().container });
  assert.equal(result.status, 200);
  assert.equal(result.headers["Cache-Control"], "no-store, private");
});
for (const [label, options] of Object.entries({
  public: { publicAccess: "blob" }, oversized: { size: MAX_BYTES + 1 }, empty: { size: 0 },
  forbidden: { error: 403 }, missing: { error: 404 }, changed: { changed: true }, incomplete: { short: true },
})) {
  test(`${label} fails closed without partial receipt content or private error details`, async () => {
    const result = await handleStage07ReceiptExport(request(), { expectedKey: "test-secret", container: fixture(options).container });
    assert.equal(result.status, 503);
    assert.deepEqual(result.jsonBody, { error: "EXACT_RECEIPT_READ_FAILED" });
  });
}
