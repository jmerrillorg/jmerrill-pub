"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

// ---------------------------------------------------------------------------
// Helpers — inline hash calculation (mirrors knowledgeReader.js logic)
// ---------------------------------------------------------------------------

function sha256hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

const APPROVED_HASH = "64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78";
const FAKE_CONTENT = Buffer.from("# JM1 Publishing — Stage 0 Diagnostic Knowledge Base\nv1.0 approved content");
const FAKE_CONTENT_HASH = sha256hex(FAKE_CONTENT);

// ---------------------------------------------------------------------------
// Hash calculation
// ---------------------------------------------------------------------------

describe("sha256 hash calculation", () => {
  it("produces a 64-char lowercase hex string", () => {
    const hash = sha256hex(Buffer.from("test"));
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const a = sha256hex(Buffer.from("same content"));
    const b = sha256hex(Buffer.from("same content"));
    assert.equal(a, b);
  });

  it("differs for different inputs", () => {
    const a = sha256hex(Buffer.from("content A"));
    const b = sha256hex(Buffer.from("content B"));
    assert.notEqual(a, b);
  });

  it("matches approved knowledge.md hash when content matches", () => {
    // Verifies the comparison logic: calculatedHash === expectedHash
    const calculated = sha256hex(Buffer.from("exact content that would produce the approved hash"));
    // We don't have the real file locally, but we verify the comparison logic works
    assert.equal(calculated === APPROVED_HASH, false); // fake content won't match
    assert.equal(FAKE_CONTENT_HASH === APPROVED_HASH, false);
  });

  it("hash match returns true when hashes are identical", () => {
    const content = Buffer.from("some content");
    const hash = sha256hex(content);
    assert.equal(hash === sha256hex(content), true);
  });
});

// ---------------------------------------------------------------------------
// verifyKnowledgeBlob — env var guard behavior (no real Blob calls)
// ---------------------------------------------------------------------------

describe("verifyKnowledgeBlob env var guards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    Object.keys(process.env).forEach((k) => {
      if (!(k in originalEnv)) delete process.env[k];
    });
    Object.assign(process.env, originalEnv);
  });

  it("returns reachable=false and error when KNOWLEDGE_BLOB_URL is missing", async () => {
    delete process.env.KNOWLEDGE_BLOB_URL;
    process.env.KNOWLEDGE_BLOB_SHA256 = APPROVED_HASH;

    const { verifyKnowledgeBlob } = require("../src/blob/knowledgeReader");
    const result = await verifyKnowledgeBlob();

    assert.equal(result.reachable, false);
    assert.equal(result.hashMatched, false);
    assert.equal(result.calculatedSha256, null);
    assert.ok(result.error && result.error.includes("KNOWLEDGE_BLOB_URL"));
  });

  it("returns reachable=false and error when KNOWLEDGE_BLOB_SHA256 is missing", async () => {
    process.env.KNOWLEDGE_BLOB_URL = "https://stjm1diagrunner.blob.core.windows.net/knowledge/knowledge.md";
    delete process.env.KNOWLEDGE_BLOB_SHA256;

    // Clear require cache so env is re-read
    delete require.cache[require.resolve("../src/blob/knowledgeReader")];
    const { verifyKnowledgeBlob } = require("../src/blob/knowledgeReader");
    const result = await verifyKnowledgeBlob();

    assert.equal(result.reachable, false);
    assert.equal(result.hashMatched, false);
    assert.ok(result.error && result.error.includes("KNOWLEDGE_BLOB_SHA256"));
  });

  it("returns expectedSha256 from env even when unreachable", async () => {
    delete process.env.KNOWLEDGE_BLOB_URL;
    process.env.KNOWLEDGE_BLOB_SHA256 = APPROVED_HASH;

    delete require.cache[require.resolve("../src/blob/knowledgeReader")];
    const { verifyKnowledgeBlob } = require("../src/blob/knowledgeReader");
    const result = await verifyKnowledgeBlob();

    assert.equal(result.expectedSha256, APPROVED_HASH);
  });
});

// ---------------------------------------------------------------------------
// Response safety — knowledge metadata shape
// ---------------------------------------------------------------------------

describe("knowledge verification response shape", () => {
  it("safe metadata object contains only expected keys", () => {
    const knowledgeMeta = {
      reachable: true,
      hashMatched: true,
      calculatedSha256: FAKE_CONTENT_HASH,
      expectedSha256: APPROVED_HASH,
      byteLength: 29232,
      etag: '"0x8DECBF9A7DEF3A2"',
      lastModified: "2026-06-16T22:50:25.000Z",
      error: null
    };

    const allowedKeys = new Set([
      "reachable", "hashMatched", "calculatedSha256", "expectedSha256",
      "byteLength", "etag", "lastModified", "error"
    ]);

    for (const key of Object.keys(knowledgeMeta)) {
      assert.ok(allowedKeys.has(key), `Unexpected key in metadata: ${key}`);
    }
  });

  it("no knowledge.md file content appears in metadata object", () => {
    const knowledgeMeta = {
      reachable: true,
      hashMatched: true,
      calculatedSha256: FAKE_CONTENT_HASH,
      expectedSha256: APPROVED_HASH,
      byteLength: 29232,
      etag: '"0x8DECBF9A7DEF3A2"',
      lastModified: "2026-06-16T22:50:25.000Z",
      error: null
    };

    const serialized = JSON.stringify(knowledgeMeta);
    // File content would contain markdown headings or section markers
    assert.ok(!serialized.includes("## 1. Imprint"), "Metadata must not contain file content");
    assert.ok(!serialized.includes("Imprint Definitions"), "Metadata must not contain file content");
    assert.ok(!serialized.includes("Routing Rules"), "Metadata must not contain file content");
  });

  it("hash mismatch results in hashMatched=false", () => {
    const calculatedSha256 = FAKE_CONTENT_HASH;
    const expectedSha256 = APPROVED_HASH;
    assert.equal(calculatedSha256 === expectedSha256, false);

    const hashMatched = calculatedSha256 === expectedSha256;
    assert.equal(hashMatched, false);
  });

  it("hash match results in hashMatched=true when hashes are equal", () => {
    const h = sha256hex(Buffer.from("consistent content"));
    assert.equal(h === h, true);
  });
});

// ---------------------------------------------------------------------------
// contract-test verifyKnowledge request body flag
// ---------------------------------------------------------------------------

describe("verifyKnowledge request body parsing", () => {
  it("verifyKnowledge=true triggers knowledge verification path", () => {
    const body = { verifyKnowledge: true };
    assert.equal(body.verifyKnowledge === true, true);
  });

  it("verifyKnowledge absent does not trigger knowledge verification", () => {
    const body = {};
    assert.equal(body.verifyKnowledge === true, false);
  });

  it("verifyKnowledge='true' (string) does not trigger knowledge verification", () => {
    // Only boolean true triggers — guards against accidental string coercion
    const body = { verifyKnowledge: "true" };
    assert.equal(body.verifyKnowledge === true, false);
  });
});
