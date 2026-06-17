"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { extractManuscript, SUPPORTED_TYPES } = require("../src/extraction/manuscriptExtractor");

const FIXTURES = path.join(__dirname, "fixtures");
const TXT_PATH = path.join(FIXTURES, "synthetic-stage0.txt");
const DOCX_PATH = path.join(FIXTURES, "synthetic-stage0.docx");

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

describe("extractManuscript — TXT", () => {
  test("returns supported:true and safe metadata for .txt", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.supported, true);
    assert.equal(result.fileType, ".txt");
    assert.equal(result.byteLength, buf.byteLength);
    assert.ok(typeof result.charCount === "number" && result.charCount > 0, "charCount must be positive");
    assert.ok(typeof result.wordCount === "number" && result.wordCount > 0, "wordCount must be positive");
    assert.ok(typeof result.lineCount === "number" && result.lineCount > 0, "lineCount must be positive");
    assert.equal(result.sha256, sha256(buf));
    assert.deepEqual(result.extractionWarnings, []);
    assert.equal(result.contentReturned, false);
    assert.equal(result.error, null);
  });

  test("result object has no extracted text property", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".txt", buf);
    const keys = Object.keys(result);
    for (const key of keys) {
      assert.notEqual(key, "text", "result must not contain a 'text' property");
      assert.notEqual(key, "content", "result must not contain a 'content' property");
      assert.notEqual(key, "rawText", "result must not contain a 'rawText' property");
      assert.notEqual(key, "extractedText", "result must not contain an 'extractedText' property");
    }
  });

  test("no extracted text value appears in any string field", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".txt", buf);
    // The TXT content contains a distinctive phrase. It must not appear in any returned string.
    const distinctive = "quick brown fox";
    for (const [key, val] of Object.entries(result)) {
      if (typeof val === "string") {
        assert.ok(
          !val.includes(distinctive),
          `Extracted text leaked into result.${key}`
        );
      }
    }
  });

  test("sha256 matches independent calculation", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.sha256, sha256(buf));
  });

  test("charCount matches text length", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const text = buf.toString("utf8");
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.charCount, text.length);
  });

  test("wordCount matches whitespace-split count", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const text = buf.toString("utf8").trim();
    const expected = text.length === 0 ? 0 : text.split(/\s+/).length;
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.wordCount, expected);
  });

  test("lineCount is number of newline-delimited lines", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const text = buf.toString("utf8");
    const expected = text.split(/\r?\n/).length;
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.lineCount, expected);
  });

  test("extension matching is case-insensitive", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".TXT", buf);
    assert.equal(result.supported, true);
    assert.equal(result.fileType, ".txt");
  });
});

describe("extractManuscript — DOCX", () => {
  test("returns supported:true and safe metadata for .docx", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    assert.equal(result.supported, true);
    assert.equal(result.fileType, ".docx");
    assert.equal(result.byteLength, buf.byteLength);
    assert.ok(typeof result.charCount === "number" && result.charCount > 0, "charCount must be positive");
    assert.ok(typeof result.wordCount === "number" && result.wordCount > 0, "wordCount must be positive");
    assert.equal(result.lineCount, null, "lineCount is null for DOCX");
    assert.equal(result.sha256, sha256(buf));
    assert.equal(result.contentReturned, false);
    assert.equal(result.error, null);
  });

  test("result object has no extracted text property for .docx", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    const keys = Object.keys(result);
    for (const key of keys) {
      assert.notEqual(key, "text", "result must not contain a 'text' property");
      assert.notEqual(key, "content", "result must not contain a 'content' property");
      assert.notEqual(key, "rawText", "result must not contain a 'rawText' property");
      assert.notEqual(key, "extractedText", "result must not contain an 'extractedText' property");
    }
  });

  test("no extracted text value appears in any string field", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    const distinctive = "quick brown fox";
    for (const [key, val] of Object.entries(result)) {
      if (typeof val === "string") {
        assert.ok(
          !val.includes(distinctive),
          `Extracted text leaked into result.${key}`
        );
      }
    }
  });

  test("sha256 matches independent calculation for .docx", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    assert.equal(result.sha256, sha256(buf));
  });

  test("wordCount is positive for synthetic DOCX", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    assert.ok(result.wordCount > 0, `wordCount=${result.wordCount} must be positive`);
  });
});

describe("extractManuscript — unsupported types", () => {
  test("returns supported:false for .pdf", async () => {
    const buf = Buffer.from("fake pdf bytes");
    const result = await extractManuscript(".pdf", buf);
    assert.equal(result.supported, false);
    assert.equal(result.fileType, ".pdf");
    assert.equal(result.charCount, null);
    assert.equal(result.wordCount, null);
    assert.equal(result.sha256, null);
    assert.equal(result.contentReturned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  test("returns supported:false for unknown extension", async () => {
    const buf = Buffer.from("some bytes");
    const result = await extractManuscript(".xyz", buf);
    assert.equal(result.supported, false);
    assert.equal(result.contentReturned, false);
  });

  test("returns supported:false for empty extension", async () => {
    const buf = Buffer.from("some bytes");
    const result = await extractManuscript("", buf);
    assert.equal(result.supported, false);
    assert.equal(result.contentReturned, false);
  });
});

describe("extractManuscript — safety invariants", () => {
  test("contentReturned is always false for supported .txt", async () => {
    const buf = fs.readFileSync(TXT_PATH);
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.contentReturned, false);
  });

  test("contentReturned is always false for supported .docx", async () => {
    const buf = fs.readFileSync(DOCX_PATH);
    const result = await extractManuscript(".docx", buf);
    assert.equal(result.contentReturned, false);
  });

  test("contentReturned is always false for unsupported types", async () => {
    const buf = Buffer.from("bytes");
    const result = await extractManuscript(".pdf", buf);
    assert.equal(result.contentReturned, false);
  });

  test("SUPPORTED_TYPES contains exactly .txt and .docx", () => {
    assert.ok(SUPPORTED_TYPES.has(".txt"));
    assert.ok(SUPPORTED_TYPES.has(".docx"));
    assert.equal(SUPPORTED_TYPES.size, 2);
  });

  test("empty buffer does not throw and returns metadata", async () => {
    const buf = Buffer.alloc(0);
    const result = await extractManuscript(".txt", buf);
    assert.equal(result.supported, true);
    assert.equal(result.byteLength, 0);
    assert.equal(result.charCount, 0);
    assert.equal(result.wordCount, 0);
    assert.equal(result.contentReturned, false);
  });
});
