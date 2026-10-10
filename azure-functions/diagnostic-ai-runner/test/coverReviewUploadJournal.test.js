"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { digest } = require("../src/production/coverOwnerStore");
const { createCoverReviewUploadJournal } = require("../src/production/coverReviewUploadJournal");
function fixture(acceptance = false) {
  const rows = new Map(); let sequence = 0;
  return { rows, store: { acceptance, read: async (kind, key) => rows.get(`${kind}/${key}`) || null,
    writeJson: async (kind, key, value, options = {}) => {
      const name = `${kind}/${key}`, old = rows.get(name);
      if (old && options.immutable) { assert.deepEqual(old.value, value); return old; }
      if ((old && old.etag !== options.etag) || (!old && options.etag)) throw Object.assign(new Error("conflict"), { statusCode: 412 });
      const row = { value, sha256: digest(value), etag: String(++sequence) }; rows.set(name, row); return row;
    } } };
}
const intent = { bindingSha256: "a".repeat(64), checksum: "b".repeat(64), filename: "fixture.html" };
test("known pre-upload rejection permits only bounded exact-binding retries after restart", async () => {
  const f = fixture();
  for (let n = 0; n < 3; n++) {
    const journal = createCoverReviewUploadJournal(f.store);
    assert.equal(await journal.reserveUploadIntent(intent), true);
    await journal.recordUploadSessionFailure({ operation: "UPLOAD_SESSION", statusCode: 400, providerCode: "invalidRequest" });
  }
  assert.equal(await createCoverReviewUploadJournal(f.store).reserveUploadIntent(intent), false);
  assert.equal([...f.rows.keys()].filter(x => x.startsWith("review-upload-failures/")).length, 3);
});
test("unknown session outcome, changed bytes, and lost PUT response never authorize a retry", async () => {
  for (const statusCode of [408, 429, 500, undefined]) {
    const f = fixture(), journal = createCoverReviewUploadJournal(f.store);
    assert.equal(await journal.reserveUploadIntent(intent), true);
    await journal.recordUploadSessionFailure({ operation: "UPLOAD_SESSION", statusCode });
    assert.equal(await createCoverReviewUploadJournal(f.store).reserveUploadIntent(intent), false);
    assert.equal(await journal.reserveUploadIntent({ ...intent, checksum: "c".repeat(64) }), false);
  }
});
test("legacy recovery is exact source-backed acceptance only and preserves original intent", async () => {
  const f = fixture(true), key = digest({ bindingSha256: intent.bindingSha256 });
  const old = await f.store.writeJson("review-upload-intents", key, { ...intent, synthetic: true });
  const proof = { intentSha256: old.sha256, status: 400, sourceSha256: "d".repeat(64), sourceRelease: "e".repeat(40), observedAt: "2026-10-10T01:12:27.844Z" };
  assert.equal(await createCoverReviewUploadJournal(f.store).reserveUploadIntent(intent), false);
  assert.equal(await createCoverReviewUploadJournal(f.store, { ...proof, intentSha256: "f".repeat(64) }).reserveUploadIntent(intent), false);
  assert.equal(await createCoverReviewUploadJournal(f.store, proof).reserveUploadIntent(intent), true);
  assert.deepEqual(await f.store.read("review-upload-intents", key), old);
  const production = fixture(); await production.store.writeJson("review-upload-intents", key, { ...intent, synthetic: true });
  assert.equal(await createCoverReviewUploadJournal(production.store, proof).reserveUploadIntent(intent), false);
});
test("parallel claim contenders cannot both reserve the same session attempt", async () => {
  const f = fixture();
  const results = await Promise.all([createCoverReviewUploadJournal(f.store).reserveUploadIntent(intent), createCoverReviewUploadJournal(f.store).reserveUploadIntent(intent)]);
  assert.equal(results.filter(Boolean).length, 1);
});
