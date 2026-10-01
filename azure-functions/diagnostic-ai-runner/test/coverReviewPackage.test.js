"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { deflateSync } = require("node:zlib");
const test = require("node:test");
const { createCoverReviewPackage } = require("../src/production/coverReviewPackage");
const { prepareReviewPackage } = require("../src/production/coverDesignRuntime");

const TITLE_ID = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(name, data) {
  const body = Buffer.concat([Buffer.from(name), data]);
  const result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), result.length - 4);
  return result;
}

function png(metadata = "private model metadata") {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1024, 0);
  ihdr.writeUInt32BE(1024, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + 1024 * 3, 180);
  row[0] = 0;
  return Buffer.concat([signature, chunk("IHDR", ihdr),
    chunk("tEXt", Buffer.from(`Comment\0${metadata}`)),
    chunk("IDAT", deflateSync(Buffer.concat(Array(1024).fill(row)))),
    chunk("IEND", Buffer.alloc(0))]);
}

function fixture() {
  const assets = new Map([["asset-a", png("secret prompt A")], ["asset-b", png("secret prompt B")]]);
  const concepts = [...assets].map(([assetId, bytes], index) => ({
    label: String.fromCharCode(65 + index), assetId, sha256: digest(bytes),
    width: 1024, height: 1024, provider: "INTERNAL_PROVIDER", model: "INTERNAL_MODEL"
  }));
  const brief = { titleId: TITLE_ID, title: "Before You Were Born", subtitle: "Discovering Your Purpose",
    authorDisplay: "Sean Arron Crowley", authorityDigest: "internal-authority" };
  const saved = [];
  const adapters = createCoverReviewPackage({
    fetchAssetBytes: async (concept) => assets.get(concept.assetId),
    saveReviewArtifact: async (input) => {
      saved.push(input);
      return { assetId: input.sha256, location: `review://${input.sha256}.html`, sha256: input.sha256 };
    }
  });
  return { assets, concepts, brief, saved, adapters };
}

test("composes deterministic, standalone, author-safe HTML and passes runtime preflight", async () => {
  const { concepts, brief, saved, adapters } = fixture();
  const input = { titleId: TITLE_ID, brief, concepts };
  const first = await adapters.composeReviewPackage(input);
  const second = await adapters.composeReviewPackage(input);
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(saved[0].contentType, "text/html; charset=utf-8");
  const html = first.bytes.toString("utf8");
  assert.match(html, /Before You Were Born/);
  assert.match(html, /Discovering Your Purpose/);
  assert.match(html, /Sean Arron Crowley/);
  assert.equal((html.match(/data:image\/png;base64,/g) || []).length, 2);
  for (const forbidden of ["secret prompt", "INTERNAL_PROVIDER", "INTERNAL_MODEL", "internal-authority", "tEXt"]) {
    assert.equal(html.includes(forbidden), false);
  }
  const record = { state: "CONCEPTS_READY", titleId: TITLE_ID, brief, briefVersion: "current-v1", concepts };
  const preflight = await adapters.preflightReviewPackage({ record, reviewPackage: first });
  assert.equal(preflight.passed, true);
  assert.match(preflight.evidenceId, /^[a-f0-9]{64}$/);
  let persisted;
  const result = await prepareReviewPackage(record, { ...adapters,
    readCurrentAuthorityDigest: async () => "current-v1",
    saveReviewPackage: async (value) => { persisted = value; return value; } });
  assert.equal(result.state, "AWAITING_REVIEW");
  assert.equal(result.reviewPackage.sha256, first.sha256);
  assert.deepEqual(result, persisted);
});

test("rejects altered concepts, malformed PNGs, and dimension mismatch", async () => {
  const { assets, concepts, brief, adapters } = fixture();
  const input = { titleId: TITLE_ID, brief, concepts };
  assets.set("asset-a", Buffer.from("not a png"));
  await assert.rejects(adapters.composeReviewPackage(input), /COVER_REVIEW_CONCEPT_CHECKSUM_MISMATCH/);
  const malformed = png();
  malformed[30] ^= 1;
  assets.set("asset-a", malformed);
  concepts[0].sha256 = digest(malformed);
  await assert.rejects(adapters.composeReviewPackage(input), /COVER_REVIEW_PNG_INVALID/);
  assets.set("asset-a", png());
  concepts[0].sha256 = digest(assets.get("asset-a"));
  concepts[0].width = 1200;
  await assert.rejects(adapters.composeReviewPackage(input), /COVER_REVIEW_PNG_DIMENSIONS_INVALID/);
});

test("escapes typeset copy and rejects text that cannot remain legible", async () => {
  const { concepts, brief, adapters } = fixture();
  brief.title = "A <Cover> & Story";
  const result = await adapters.composeReviewPackage({ titleId: TITLE_ID, brief, concepts });
  assert.match(result.bytes.toString(), /A &lt;Cover&gt; &amp; Story/);
  brief.title = "A".repeat(79);
  await assert.rejects(adapters.composeReviewPackage({ titleId: TITLE_ID, brief, concepts }),
    /COVER_REVIEW_THUMBNAIL_TEXT_UNREADABLE/);
});

test("preflight fails after artifact or source changes", async () => {
  const { assets, concepts, brief, adapters } = fixture();
  const reviewPackage = await adapters.composeReviewPackage({ titleId: TITLE_ID, brief, concepts });
  const record = { state: "CONCEPTS_READY", titleId: TITLE_ID, brief, concepts };
  assert.equal((await adapters.preflightReviewPackage({ record, reviewPackage: {
    ...reviewPackage, bytes: Buffer.from("tampered")
  } })).passed, false);
  assets.set("asset-a", png("changed source"));
  assert.equal((await adapters.preflightReviewPackage({ record, reviewPackage })).passed, false);
});
