"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { Readable } = require("node:stream");
const test = require("node:test");
const { createCoverSafetyAssessment } = require("../src/production/coverSafetyAssessment");
const { createCoverSafetyEvidenceStore } = require("../src/production/coverSafetyEvidenceStore");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const bytes = Buffer.from("fixture image bytes");
const imageSha256 = createHash("sha256").update(bytes).digest("hex");
const categories = ["Hate", "SelfHarm", "Sexual", "Violence"];
const evidence = {
  titleId, imageSha256, provider: "AZURE_AI_CONTENT_SAFETY", apiVersion: "2024-09-01",
  categoriesAnalysis: categories.map((category) => ({ category, severity: 0 })),
  passed: true, assessedAt: "2026-09-30T12:00:00.000Z"
};

function fixture() {
  const blobs = new Map();
  const uploads = [];
  let downloadError;
  const service = { getContainerClient: (name) => {
    assert.equal(name, "cover-audit");
    return { getBlockBlobClient: (path) => ({
      upload: async (payload, length, options) => {
        uploads.push({ path, payload, length, options });
        assert.equal(options.conditions.ifNoneMatch, "*");
        if (blobs.has(path)) throw Object.assign(new Error("exists"), { statusCode: 412 });
        blobs.set(path, payload);
      },
      download: async () => {
        if (downloadError) throw downloadError;
        if (!blobs.has(path)) throw Object.assign(new Error("missing"), { statusCode: 404 });
        return { readableStreamBody: Readable.from([blobs.get(path)]) };
      }
    }) };
  } };
  const store = createCoverSafetyEvidenceStore({
    serviceUrl: "https://stjm1diagrunner.blob.core.windows.net", containerName: "cover-audit", service
  });
  return { blobs, uploads, store, setDownloadError: (error) => { downloadError = error; } };
}

test("conditional write, readback, deterministic ID and exact replay", async () => {
  const { blobs, uploads, store } = fixture();
  const first = await store.persistEvidence(evidence);
  assert.match(first.evidenceId, /^[a-f0-9]{64}$/);
  assert.equal(first.evidenceId, createHash("sha256")
    .update(`cover-safety-v1\0${titleId}\0${imageSha256}`).digest("hex"));
  assert.equal(uploads[0].path, `publishing/cover/v1/safety/${titleId}/${first.evidenceId}.json`);
  assert.equal(uploads[0].length, Buffer.byteLength(uploads[0].payload));
  assert.equal(uploads[0].options.blobHTTPHeaders.blobContentType, "application/json");
  assert.deepEqual(await store.readEvidence(titleId, first.evidenceId), { ...evidence, evidenceId: first.evidenceId });
  assert.deepEqual(await store.persistEvidence({ ...evidence }), first);
  assert.equal(blobs.size, 1);
  assert.equal(uploads.length, 2);
});

test("different assessment for one title and image fails closed", async () => {
  const { store } = fixture();
  await store.persistEvidence(evidence);
  await assert.rejects(store.persistEvidence({ ...evidence, assessedAt: "2026-09-30T12:01:00.000Z" }),
    /COVER_SAFETY_EVIDENCE_CONFLICT/);
  const flagged = { ...evidence, categoriesAnalysis: evidence.categoriesAnalysis.map((row) =>
    row.category === "Violence" ? { ...row, severity: 2 } : row), passed: false };
  await assert.rejects(store.persistEvidence(flagged), /COVER_SAFETY_EVIDENCE_CONFLICT/);
});

test("corrupt, substituted and unavailable readback never confirms persistence", async () => {
  const { blobs, store, setDownloadError } = fixture();
  const first = await store.persistEvidence(evidence);
  const path = [...blobs.keys()][0];
  blobs.set(path, "not JSON");
  await assert.rejects(store.persistEvidence(evidence), /COVER_SAFETY_EVIDENCE_CONFLICT/);
  blobs.set(path, `${JSON.stringify({ ...evidence, evidenceId: "f".repeat(64) })}\n`);
  await assert.rejects(store.readEvidence(titleId, first.evidenceId), /COVER_SAFETY_EVIDENCE_CONFLICT/);
  blobs.set(path, JSON.stringify({ ...evidence, evidenceId: first.evidenceId }));
  await assert.rejects(store.persistEvidence(evidence), /COVER_SAFETY_EVIDENCE_CONFLICT/);
  blobs.set(path, "x".repeat(16 * 1024 + 1));
  await assert.rejects(store.readEvidence(titleId, first.evidenceId), /COVER_SAFETY_EVIDENCE_CONFLICT/);
  setDownloadError(Object.assign(new Error("storage unavailable"), { statusCode: 503 }));
  await assert.rejects(store.persistEvidence(evidence), /storage unavailable/);
});

test("invalid identity, scores and unexpected secret fields are rejected before upload", async () => {
  const { store, uploads } = fixture();
  const invalid = [
    { ...evidence, titleId: "../../other" },
    { ...evidence, imageSha256: "a".repeat(63) },
    { ...evidence, connectionString: "secret" },
    { ...evidence, categoriesAnalysis: [{ ...evidence.categoriesAnalysis[0], token: "secret" },
      ...evidence.categoriesAnalysis.slice(1)] },
    { ...evidence, categoriesAnalysis: evidence.categoriesAnalysis.map((row) => ({ ...row, severity: 8 })) },
    { ...evidence, passed: false },
    { ...evidence, assessedAt: "yesterday" }
  ];
  for (const record of invalid) {
    await assert.rejects(store.persistEvidence(record), /COVER_SAFETY_EVIDENCE_INVALID/);
  }
  assert.equal(uploads.length, 0);
  await assert.rejects(store.readEvidence("../title", "a".repeat(64)), /COVER_SAFETY_EVIDENCE_ID_INVALID/);
});

test("assessment can use the store's persistEvidence callback", async () => {
  const { store } = fixture();
  const assess = createCoverSafetyAssessment({ endpoint: "https://ais-jm1-foundry.cognitiveservices.azure.com" }, {
    credential: { getToken: async () => ({ token: "test-only" }) },
    fetch: async () => ({ ok: true, json: async () => ({ categoriesAnalysis: evidence.categoriesAnalysis }) }),
    persistEvidence: store.persistEvidence
  });
  const result = await assess({ titleId, bytes, sha256: imageSha256 });
  assert.equal(result.passed, true);
  assert.deepEqual((await store.readEvidence(titleId, result.evidenceId)).categoriesAnalysis,
    evidence.categoriesAnalysis);
});

test("store requires an Azure Blob endpoint and container", () => {
  assert.throws(() => createCoverSafetyEvidenceStore({ serviceUrl: "https://stjm1diagrunner.blob.core.windows.net" }),
    /COVER_SAFETY_EVIDENCE_STORE_NOT_CONFIGURED/);
  for (const serviceUrl of ["http://stjm1diagrunner.blob.core.windows.net",
    "https://stjm1diagrunner.blob.core.windows.net/?sig=secret",
    "https://evil.example.com", "https://stjm1diagrunner.blob.core.windows.net/other"]) {
    assert.throws(() => createCoverSafetyEvidenceStore({ serviceUrl, containerName: "cover-audit" }),
      /COVER_SAFETY_EVIDENCE_STORE_URL_INVALID/);
  }
});
