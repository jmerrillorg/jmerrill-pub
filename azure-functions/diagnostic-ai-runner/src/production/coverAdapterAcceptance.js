"use strict";

const { deflateSync } = require("node:zlib");
const { AUTHORITY } = require("./coverAuthorityBundle");
const { createCoverOwnerStore, digest, hash } = require("./coverOwnerStore");
const { executeCoverOwner } = require("./coverOwnerRuntime");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: authorId } = require("../author/jackieTitleSystemCommissioningPolicy");
const CASES = Object.freeze(["success", "lost-provider-response", "unknown-provider-outcome", "denied-authority", "expired-claim"]);
const titleId = "11111111-1111-4111-8111-111111111111";
const SOURCE_BYTES = Buffer.from(JSON.stringify("Synthetic cover adapter source. NOT title authority.\n"));
const source = Object.freeze({ artifactId: "33333333-3333-4333-8333-333333333333", version: "fixture-v1",
  sha256: hash(SOURCE_BYTES) });
const PREFIX_AUTHORITY = "CONTROLLED_COVER_ADAPTER_ACCEPTANCE_V1_NOT_BUSINESS_AUTHORITY";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function fixturePng(direction) {
  const width = 1024, height = 1536;
  const chunk = (type, bytes) => {
    const name = Buffer.from(type);
    const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
    return Buffer.concat([length, name, bytes, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * (width * 3 + 1) + 1 + x * 3;
    pixels[i] = direction === 1 ? 30 : 210; pixels[i + 1] = y % 128 < 64 ? 180 : 100; pixels[i + 2] = 150;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}

function fixture(caseName) {
  if (!CASES.includes(caseName)) throw new Error("COVER_ACCEPTANCE_CASE_DENIED");
  const editionId = { success: "44444444-4444-4444-8444-444444444441", "lost-provider-response": "44444444-4444-4444-8444-444444444442",
    "unknown-provider-outcome": "44444444-4444-4444-8444-444444444443", "denied-authority": "44444444-4444-4444-8444-444444444444",
    "expired-claim": "44444444-4444-4444-8444-444444444445" }[caseName];
  const values = { authorId, title: "SYNTHETIC COVER ACCEPTANCE", subtitle: "Not a publishing title",
    authorDisplay: "Internal acceptance fixture", genre: "Fixture only", audience: "Internal acceptance",
    bookDescription: "Synthetic adapter exercise; never public metadata", positioning: "Non-business fixture",
    titleThemes: ["fixture"], package: "FIXTURE", formatEntitlements: ["PAPERBACK", "EBOOK"], trimSize: "6x9",
    pageCount: 100, isbn: { paperback: "9781954414266", ebook: "9781954414266" }, imprint: "Internal fixture",
    marketContext: "Fixture only", preferences: [], titleRulings: [], prohibitedVisuals: [], approvedBrandAssets: [] };
  const candidates = Object.entries(AUTHORITY).map(([field, types]) => ({ field, value: values[field], titleId,
    sourceType: types[0], sourceId: `fixture:${field}`, sourceVersion: "fixture-v1", sourceChecksum: source.sha256,
    authorityClass: "PUBLISHER_APPROVED", current: true, lastVerified: "2026-10-09T00:00:00Z" }));
  const authority = { schemaVersion: 1, titleId, editionId, authorId, source, status: "READY", held: caseName === "denied-authority",
    synthetic: true, authorityReference: PREFIX_AUTHORITY, candidates };
  const authorityKey = digest({ caseName, fixture: PREFIX_AUTHORITY });
  const requestKey = digest({ titleId, editionId });
  const authorityBytes = Buffer.from(require("./coverAuthorityBundle").canonicalJson(authority));
  const request = { schemaVersion: 1, titleId, editionId, source, stageId: "12_COVER_DESIGN", executionMode: "INTERNAL_CONCEPT",
    variantCount: 2, authorityReference: PREFIX_AUTHORITY, authorityKey, authoritySha256: hash(authorityBytes) };
  return { authority, authorityKey, request, requestKey };
}

async function acceptanceDependencies(containerClient, caseName, options = {}) {
  const store = createCoverOwnerStore({ containerClient, acceptance: true });
  const f = fixture(caseName);
  const now = options.now || (() => new Date());
  const deps = { store, now, generationEnabled: true,
    verifyCurrentAuthority: async (request, authority) => {
      const sourceRow = await store.read("sources", source.sha256);
      return request.authorityReference === PREFIX_AUTHORITY && authority.synthetic === true &&
        sourceRow?.sha256 === source.sha256 && request.titleId === titleId && request.editionId === f.request.editionId;
    },
    verifySpendAuthority: async () => true, // Local bitmap fixture only; not provider spend authority.
    readProviderOutcome: async key => (await store.read("provider-receipts", key))?.value,
    generateImage: async request => {
      const bytes = fixturePng(request.direction), sha256 = hash(bytes);
      const assetKey = digest({ executionKey: request.executionKey, direction: request.direction, sha256 });
      const result = { bytes, sha256, width: 1024, height: 1536, safetyPassed: true,
        safetyEvidenceId: digest({ fixture: sha256 }), providerRequestId: request.providerRequestId,
        providerReceiptId: `LOCAL_BITMAP_FIXTURE:${request.providerRequestId}` };
      if (caseName === "unknown-provider-outcome") throw new Error("CONTROLLED_UNKNOWN_PROVIDER_OUTCOME");
      await store.write("assets", assetKey, bytes, { extension: "png", immutable: true });
      await store.writeJson("provider-receipts", request.providerRequestId, { schemaVersion: 1, status: "RESULT_PERSISTED",
        executionKey: request.executionKey, bindingHash: request.bindingHash, titleId, editionId: request.editionId,
        direction: request.direction, providerRequestId: request.providerRequestId, providerReceiptId: result.providerReceiptId,
        assetKey, sha256, width: result.width, height: result.height, safetyEvidenceId: result.safetyEvidenceId, synthetic: true }, { immutable: true });
      if (caseName === "lost-provider-response" && request.direction === 1) throw new Error("CONTROLLED_LOST_RESPONSE_AFTER_DURABLE_RECEIPT");
      if (caseName === "expired-claim" && request.direction === 1) throw Object.assign(new Error("COVER_ACCEPTANCE_SIMULATED_CRASH"),
        { safeCode: "COVER_ACCEPTANCE_SIMULATED_CRASH" });
      return result;
    }
  };
  // Each read verifies the fixed, immutable local source and then records its
  // current observation time in memory. The persisted fixture is never rewritten.
  const originalRead = store.read;
  store.read = async (...args) => {
    const row = await originalRead(...args);
    if (args[0] === "authority" && row && row.value.authorityReference === PREFIX_AUTHORITY) {
      row.value = { ...row.value, candidates: row.value.candidates.map(candidate => ({ ...candidate, lastVerified: now().toISOString() })) };
    }
    return row;
  };
  return { deps, fixture: f };
}

async function runCoverAdapterAcceptance(containerClient, { seed = false, now } = {}) {
  const results = [];
  for (const caseName of CASES) {
    const { deps, fixture: f } = await acceptanceDependencies(containerClient, caseName, { now });
    if (seed) {
      await deps.store.write("sources", source.sha256, SOURCE_BYTES, { extension: "json", immutable: true });
      await deps.store.writeJson("authority", f.authorityKey, f.authority, { immutable: true });
      await deps.store.writeJson("requests", f.requestKey, f.request, { immutable: true });
    }
    try {
      const result = await executeCoverOwner(f.requestKey, deps);
      results.push({ caseName, requestKey: f.requestKey, ...result });
    } catch (error) {
      results.push({ caseName, requestKey: f.requestKey, status: "DENIED", code: error.safeCode || "COVER_ACCEPTANCE_FAILED" });
    }
  }
  return { proofClass: "CONTROLLED_SYNTHETIC_NATIVE_ADAPTERS_NOT_TITLE_ACCEPTANCE", namespace: depsPrefix(), results,
    paidProviderInvocations: 0, businessStageEffects: 0, authorCommunications: 0 };
}
function depsPrefix() { return require("./coverOwnerStore").ACCEPTANCE_PREFIX; }

async function readCoverAdapterAcceptance(containerClient) {
  const store = createCoverOwnerStore({ containerClient, acceptance: true });
  const counts = {};
  const executions = [];
  for (const kind of ["requests", "executions", "outcomes", "provider-receipts", "receipts", "packages", "assets"]) {
    const rows = await store.list(kind);
    counts[kind] = rows.length;
    if (kind === "executions") for (const row of rows) executions.push({
      reference: row.reference, sha256: row.sha256, status: row.value.status,
      nextAttemptAt: row.value.nextAttemptAt || null, leaseUntil: row.value.leaseUntil || null
    });
  }
  return { proofClass: "CONTROLLED_SYNTHETIC_NATIVE_ADAPTERS_NOT_TITLE_ACCEPTANCE", counts, executions };
}

module.exports = { fixture, fixturePng, acceptanceDependencies, runCoverAdapterAcceptance, readCoverAdapterAcceptance, CASES };
