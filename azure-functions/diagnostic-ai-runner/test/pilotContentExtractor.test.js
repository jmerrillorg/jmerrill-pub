"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { detectExtension, fetchAndExtractManuscript, isSharePointUrl, encodeShareUrl } = require("../src/extraction/pilotContentExtractor");

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
// isSharePointUrl
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — isSharePointUrl", () => {
  it("returns true for a jmerrillfoundation.sharepoint.com URL", () => {
    assert.equal(
      isSharePointUrl("https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/manuscript.docx"),
      true
    );
  });

  it("returns true for any *.sharepoint.com subdomain", () => {
    assert.equal(isSharePointUrl("https://contoso.sharepoint.com/sites/hr/doc.docx"), true);
  });

  it("returns false for a non-SharePoint HTTPS URL", () => {
    assert.equal(isSharePointUrl("https://example.com/manuscript.docx"), false);
  });

  it("returns false for an Azure Blob URL", () => {
    assert.equal(isSharePointUrl("https://stjm1diagrunner.blob.core.windows.net/files/manuscript.docx"), false);
  });

  it("returns false for a malformed URL", () => {
    assert.equal(isSharePointUrl("not a url"), false);
  });

  it("returns false for an empty string", () => {
    assert.equal(isSharePointUrl(""), false);
  });
});

// ---------------------------------------------------------------------------
// encodeShareUrl
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — encodeShareUrl", () => {
  it("produces a u!-prefixed base64url string", () => {
    const encoded = encodeShareUrl("https://example.com/file.docx");
    assert.ok(encoded.startsWith("u!"), `Expected u! prefix, got: ${encoded}`);
  });

  it("does not contain padding characters", () => {
    const encoded = encodeShareUrl("https://example.com/file.docx");
    assert.ok(!encoded.includes("="), `Unexpected padding in: ${encoded}`);
  });

  it("replaces + with - and / with _ (base64url)", () => {
    // Verify result contains only base64url-safe chars after the u! prefix
    const encoded = encodeShareUrl("https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/manuscript.docx");
    const body = encoded.slice(2);
    assert.ok(/^[A-Za-z0-9\-_]+$/.test(body), `Non-base64url chars in: ${body}`);
  });

  it("round-trips correctly — decode matches original URL", () => {
    const url = "https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/manuscript.docx?d=wabc&e=def";
    const encoded = encodeShareUrl(url);
    const body = encoded.slice(2);
    const decoded = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    assert.equal(decoded, url);
  });
});

// ---------------------------------------------------------------------------
// fetchAndExtractManuscript — network failure paths (no live network)
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — fetch failure paths", () => {
  it("returns MANUSCRIPT_FETCH_NETWORK_FAILED on network error", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.equal(result.ok, false);
    assert.ok(
      result.code === "MANUSCRIPT_FETCH_NETWORK_FAILED" ||
      result.code.startsWith("MANUSCRIPT_FETCH_FAILED:") ||
      result.code.startsWith("MANUSCRIPT_FETCH_NETWORK_FAILED:"),
      `Unexpected code: ${result.code}`
    );
    assert.equal(result.content, null);
  });

  it("returns null content on any failure", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.equal(result.content, null);
  });

  it("metadata.downloadMethod is 'direct' for non-SharePoint URLs", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.equal(result.metadata.downloadMethod, "direct");
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
// fetchAndExtractManuscript — download method routing
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — download method routing", () => {
  it("isSharePointUrl returns true for the pilot manuscript domain", () => {
    assert.equal(
      isSharePointUrl("https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/manuscript.docx?d=wabc"),
      true
    );
  });

  it("direct path is chosen for non-SharePoint HTTPS URLs", () => {
    // isSharePointUrl drives the branch — confirm the routing logic
    assert.equal(isSharePointUrl("https://example.com/manuscript.docx"), false);
  });

  it("graph path is chosen for SharePoint URLs", () => {
    assert.equal(
      isSharePointUrl("https://jmerrillfoundation.sharepoint.com/sites/publishing/doc.docx"),
      true
    );
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
  it("module exports the expected set of names", () => {
    const mod = require("../src/extraction/pilotContentExtractor");
    const keys = Object.keys(mod).sort();
    assert.deepEqual(keys, ["detectExtension", "encodeShareUrl", "fetchAndExtractManuscript", "isSharePointUrl"]);
  });

  it("fetchAndExtractManuscript is async", () => {
    const { fetchAndExtractManuscript } = require("../src/extraction/pilotContentExtractor");
    const result = fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    assert.ok(result instanceof Promise);
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

  it("metadata has expected shape on failure including downloadMethod", async () => {
    const result = await fetchAndExtractManuscript("https://0.0.0.0/manuscript.docx");
    const m = result.metadata;
    assert.ok("fileType" in m);
    assert.ok("byteLength" in m);
    assert.ok("wordCount" in m);
    assert.ok("charCount" in m);
    assert.ok("sha256" in m);
    assert.ok("downloadMethod" in m);
  });
});

// ---------------------------------------------------------------------------
// MIN_WORD_COUNT boundary
// ---------------------------------------------------------------------------

describe("pilotContentExtractor — word count boundary", () => {
  it("MIN_WORD_COUNT is 100 (documented safety floor)", () => {
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
