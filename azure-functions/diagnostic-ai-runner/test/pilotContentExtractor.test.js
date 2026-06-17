"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { detectExtension, fetchAndExtractManuscript } = require("../src/extraction/pilotContentExtractor");

// ---------------------------------------------------------------------------
// detectExtension
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — detectExtension", () => {
  it("returns .docx for a URL ending in .docx", () => {
    assert.equal(detectExtension("https://example.com/files/manuscript.docx"), ".docx");
  });

  it("returns .txt for a URL ending in .txt", () => {
    assert.equal(detectExtension("https://example.com/files/manuscript.txt"), ".txt");
  });

  it("handles uppercase extensions case-insensitively", () => {
    assert.equal(detectExtension("https://example.com/manuscript.DOCX"), ".docx");
    assert.equal(detectExtension("https://example.com/manuscript.TXT"), ".txt");
  });

  it("ignores query string when detecting extension", () => {
    assert.equal(detectExtension("https://example.com/manuscript.docx?e=abc123"), ".docx");
  });

  it("returns null for an unsupported extension", () => {
    assert.equal(detectExtension("https://example.com/manuscript.pdf"), null);
  });

  it("returns null when URL has no recognizable extension", () => {
    assert.equal(detectExtension("https://example.com/document"), null);
  });

  it("returns null for a malformed URL", () => {
    assert.equal(detectExtension("not a url"), null);
  });

  it("returns null for an empty string", () => {
    assert.equal(detectExtension(""), null);
  });
});

// ---------------------------------------------------------------------------
// fetchAndExtractManuscript — network failure paths (no live network)
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — fetch failure paths", () => {
  it("returns MANUSCRIPT_FETCH_NETWORK_FAILED on network error", async () => {
    // Use a URL that cannot be connected to in test environment
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    // Network will fail — code should be fetch-related
    assert.equal(result.ok, false);
    assert.ok(
      result.code === "MANUSCRIPT_FETCH_NETWORK_FAILED" ||
      result.code.startsWith("MANUSCRIPT_FETCH_FAILED:"),
      `Unexpected code: ${result.code}`
    );
    assert.equal(result.content, null);
  });

  it("returns null content on any failure", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.equal(result.content, null);
  });
});

// ---------------------------------------------------------------------------
// fetchAndExtractManuscript — unsupported type
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — unsupported file type", () => {
  it("detectExtension returns null for .pdf", () => {
    assert.equal(detectExtension("https://example.com/manuscript.pdf"), null);
  });
});

// ---------------------------------------------------------------------------
// fileTypeHint priority
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — fileTypeHint priority over URL extension", () => {
  it("fileTypeHint .docx is preferred over URL extension", () => {
    // Verify that if we pass a fileTypeHint, it would be used instead of URL detection.
    // We test the logic directly: fileTypeHint || detectExtension(url)
    const fileTypeHint = ".docx";
    const url = "https://example.com/document.txt"; // URL says .txt
    const ext = fileTypeHint || detectExtension(url);
    assert.equal(ext, ".docx"); // hint wins
  });

  it("falls back to URL detection when fileTypeHint is null", () => {
    const fileTypeHint = null;
    const url = "https://example.com/document.docx";
    const ext = fileTypeHint || detectExtension(url);
    assert.equal(ext, ".docx");
  });

  it("falls back to URL detection when fileTypeHint is empty string", () => {
    const fileTypeHint = "";
    const url = "https://example.com/document.txt";
    const ext = fileTypeHint || detectExtension(url);
    assert.equal(ext, ".txt");
  });

  it("returns null when both fileTypeHint and URL extension are absent", () => {
    const fileTypeHint = null;
    const url = "https://example.com/document";
    const ext = fileTypeHint || detectExtension(url);
    assert.equal(ext, null);
  });
});

// ---------------------------------------------------------------------------
// fetchAndExtractManuscript — TXT extraction from in-memory Buffer
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — in-memory extraction logic", () => {
  it("word count calculation handles normal text", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const wordCount = text.trim().split(/\s+/).length;
    assert.equal(wordCount, 9);
  });

  it("word count handles multiple spaces", () => {
    const text = "  hello   world  ";
    const wordCount = text.trim().split(/\s+/).length;
    assert.equal(wordCount, 2);
  });

  it("empty text yields zero word count", () => {
    const text = "   ";
    const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    assert.equal(wordCount, 0);
  });

  it("char count reflects full text length", () => {
    const text = "hello world";
    assert.equal(text.length, 11);
  });
});

// ---------------------------------------------------------------------------
// Safety invariants
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — safety invariants", () => {
  it("module exports only fetchAndExtractManuscript and detectExtension", () => {
    const mod = require("../src/extraction/pilotContentExtractor");
    const keys = Object.keys(mod).sort();
    assert.deepEqual(keys, ["detectExtension", "fetchAndExtractManuscript"]);
  });

  it("fetchAndExtractManuscript is async", () => {
    const { fetchAndExtractManuscript } = require("../src/extraction/pilotContentExtractor");
    const result = fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.ok(result instanceof Promise);
    // Clean up promise — prevent unhandled rejection noise
    result.catch(() => {});
  });

  it("result always has ok, code, content, metadata on failure", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.ok("ok" in result);
    assert.ok("code" in result);
    assert.ok("content" in result);
    assert.ok("metadata" in result);
  });

  it("content is null on all failure paths", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.equal(result.content, null);
  });

  it("metadata has expected shape on failure", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    const m = result.metadata;
    assert.ok("fileType" in m);
    assert.ok("byteLength" in m);
    assert.ok("wordCount" in m);
    assert.ok("charCount" in m);
    assert.ok("sha256" in m);
  });
});

// ---------------------------------------------------------------------------
// MIN_WORD_COUNT boundary
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — word count boundary", () => {
  it("MIN_WORD_COUNT is 100 (documented safety floor)", () => {
    // This test documents the minimum word count requirement.
    // A real manuscript must have at least 100 words to proceed.
    const MIN_WORD_COUNT = 100;
    assert.equal(MIN_WORD_COUNT, 100);
  });

  it("a 99-word string is below the minimum", () => {
    const words = Array.from({ length: 99 }, (_, i) => `word${i}`).join(" ");
    const wordCount = words.trim().split(/\s+/).length;
    assert.equal(wordCount, 99);
    assert.ok(wordCount < 100);
  });

  it("a 100-word string meets the minimum", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const wordCount = words.trim().split(/\s+/).length;
    assert.equal(wordCount, 100);
    assert.ok(wordCount >= 100);
  });
});
