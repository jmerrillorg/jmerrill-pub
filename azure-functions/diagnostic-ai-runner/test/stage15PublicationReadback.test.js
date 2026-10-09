"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyStage15Publication } = require("../src/distribution/stage15PublicationReadback");

const submission = Object.freeze({
  titleId: "title-1",
  editionId: "edition-paperback-1",
  isbn13: "9781950719938",
  artifactId: "interior-v1",
  artifactChecksum: "a".repeat(64),
  provider: "CORESOURCE",
  receiptId: "receipt-1",
  providerProductId: "product-1"
});

function fixture(overrides = {}) {
  const publicUrl = "https://books.example.com/9781950719938";
  const receipt = { ...submission, status: "ACCEPTED", publicUrl, ...overrides.receipt };
  const product = { ...submission, status: "LIVE", publicUrl, ...overrides.product };
  let receiptReads = 0;
  let productReads = 0;
  let publicReads = 0;
  const provider = {
    async readSubmission() {
      receiptReads += 1;
      if (overrides.receiptError) throw overrides.receiptError;
      return receipt;
    },
    async readPublication() {
      productReads += 1;
      if (overrides.productError && productReads <= (overrides.productFailures || Infinity)) throw overrides.productError;
      return product;
    }
  };
  const fetchFn = async () => {
    publicReads += 1;
    if (overrides.publicError && publicReads <= (overrides.publicFailures || Infinity)) throw overrides.publicError;
    return {
      status: overrides.publicStatus ?? 200,
      headers: { get: (key) => key === "content-type" ? "text/html; charset=utf-8" : null },
      text: async () => overrides.html ?? '<script type="application/ld+json">{"@type":"Book","isbn":"9781950719938","offers":{"availability":"https://schema.org/InStock"}}</script>'
    };
  };
  return { provider, fetchFn, counts: () => ({ receiptReads, productReads, publicReads }) };
}

function run(f, submitted = submission) {
  return verifyStage15Publication(submitted, { ...f, allowedPublicHosts: ["books.example.com"], delay: async () => {} });
}

test("exact receipt, product, ISBN, artifact and orderable public Book prove availability", async () => {
  const f = fixture();
  const result = await run(f);
  assert.equal(result.status, "LIVE_VERIFIED");
  assert.equal(result.publicAvailabilityVerified, true);
  assert.deepEqual(f.counts(), { receiptReads: 1, productReads: 1, publicReads: 1 });
  assert.equal(result.evidence.artifactChecksum, submission.artifactChecksum);
});

test("wrong edition, ISBN, artifact or provider on receipt fails before public read", async () => {
  for (const change of [{ editionId: "other" }, { isbn13: "9780000000001" }, { artifactChecksum: "b".repeat(64) }, { provider: "OTHER" }]) {
    const f = fixture({ receipt: change });
    const result = await run(f);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.reason, "PROVIDER_RECEIPT_IDENTITY_MISMATCH");
    assert.equal(f.counts().publicReads, 0);
  }
});

test("wrong product, receipt or submitted artifact fails before public read", async () => {
  for (const change of [{ providerProductId: "other" }, { receiptId: "other" }, { artifactId: "other" }]) {
    const f = fixture({ product: change });
    const result = await run(f);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.reason, "PROVIDER_PUBLICATION_IDENTITY_MISMATCH");
    assert.equal(f.counts().publicReads, 0);
  }
});

test("provider acceptance and public visibility are not publication", async () => {
  const accepted = await run(fixture({ product: { status: "ACCEPTED" } }));
  assert.equal(accepted.status, "PENDING");
  const notOrderable = await run(fixture({ html: '<script type="application/ld+json">{"@type":"Book","isbn":"9781950719938","offers":{"availability":"https://schema.org/OutOfStock"}}</script>' }));
  assert.equal(notOrderable.status, "BLOCKED");
  assert.equal(notOrderable.reason, "PUBLIC_OFFER_NOT_AVAILABLE");
});

test("wrong public ISBN, duplicate Book identity and URL drift deny live status", async () => {
  const wrongIsbn = await run(fixture({ html: '<script type="application/ld+json">{"@type":"Book","isbn":"9780000000001","offers":{"availability":"https://schema.org/InStock"}}</script>' }));
  assert.equal(wrongIsbn.reason, "PUBLIC_ISBN_NOT_PROVEN");
  const duplicateBook = '<script type="application/ld+json">[{"@type":"Book","isbn":"9781950719938","offers":{"availability":"InStock"}},{"@type":"Book","isbn":"9781950719938","offers":{"availability":"InStock"}}]</script>';
  assert.equal((await run(fixture({ html: duplicateBook }))).reason, "AMBIGUOUS_PUBLIC_ISBN");
  assert.equal((await run(fixture({ product: { publicUrl: "https://other.example.com/book" } }))).reason, "PUBLIC_URL_RECEIPT_MISMATCH");
});

test("transient provider and public failures retry; permanent failure does not", async () => {
  const retry = fixture({ productError: { status: 503 }, productFailures: 1, publicError: { status: 429 }, publicFailures: 1 });
  const result = await run(retry);
  assert.equal(result.status, "LIVE_VERIFIED");
  assert.deepEqual(retry.counts(), { receiptReads: 1, productReads: 2, publicReads: 2 });
  const permanent = fixture({ receiptError: { status: 403 } });
  assert.equal((await run(permanent)).status, "BLOCKED");
  assert.deepEqual(permanent.counts(), { receiptReads: 1, productReads: 0, publicReads: 0 });
});

test("404 is pending and untrusted public host never becomes available", async () => {
  assert.equal((await run(fixture({ publicStatus: 404 }))).reason, "PUBLIC_PAGE_NOT_PROPAGATED");
  const f = fixture({ product: { publicUrl: "https://evil.example.com/book" }, receipt: { publicUrl: "https://evil.example.com/book" } });
  const result = await run(f);
  assert.equal(result.status, "BLOCKED");
  assert.equal(f.counts().publicReads, 0);
});

test("no provider adapter or invalid submission fails closed", async () => {
  assert.equal((await verifyStage15Publication(submission)).reason, "READ_ONLY_PROVIDER_ADAPTER_REQUIRED");
  assert.equal((await run(fixture(), { ...submission, artifactChecksum: "bad" })).reason, "SUBMISSION_CHECKSUM_INVALID");
  assert.equal((await run(fixture(), { ...submission, isbn13: "9781950719937" })).reason, "SUBMISSION_ISBN13_INVALID");
  assert.equal((await run(fixture({ receipt: { status: "REJECTED" } }))).reason, "PROVIDER_RECEIPT_NOT_VALID");
  assert.equal((await run(fixture({ product: { status: "REJECTED" } }))).reason, "PROVIDER_PUBLICATION_NOT_LIVE");
  const alternatePort = fixture({ receipt: { publicUrl: "https://books.example.com:8443/book" }, product: { publicUrl: "https://books.example.com:8443/book" } });
  assert.equal((await run(alternatePort)).reason, "PUBLIC_HOST_NOT_ALLOWED");
  assert.equal(alternatePort.counts().publicReads, 0);
});
