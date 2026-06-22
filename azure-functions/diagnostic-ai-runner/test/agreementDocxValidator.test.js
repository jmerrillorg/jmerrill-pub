"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const { isValidDocxBuffer, DOCX_MIME_TYPE } = require("../src/agreement/agreementDocxValidator");

async function buildMinimalDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file("word/document.xml", "<w:document/>");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("isValidDocxBuffer", () => {
  test("accepts a structurally valid .docx buffer", async () => {
    const buffer = await buildMinimalDocx();
    const result = await isValidDocxBuffer(buffer);
    assert.equal(result.valid, true);
    assert.equal(result.reason, null);
  });

  test("rejects a non-buffer input", async () => {
    const result = await isValidDocxBuffer("not a buffer");
    assert.equal(result.valid, false);
    assert.equal(result.reason, "BUFFER_TOO_SMALL");
  });

  test("rejects a buffer that is too small", async () => {
    const result = await isValidDocxBuffer(Buffer.from([0x50]));
    assert.equal(result.valid, false);
    assert.equal(result.reason, "BUFFER_TOO_SMALL");
  });

  test("rejects a buffer without the ZIP signature", async () => {
    const result = await isValidDocxBuffer(Buffer.from("not a zip file at all"));
    assert.equal(result.valid, false);
    assert.equal(result.reason, "NOT_A_ZIP_ARCHIVE");
  });

  test("rejects a zip that is missing word/document.xml", async () => {
    const zip = new JSZip();
    zip.file("not_a_word_doc.txt", "hello");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await isValidDocxBuffer(buffer);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "MISSING_WORD_DOCUMENT_XML");
  });

  test("DOCX_MIME_TYPE matches the standard Office Open XML word-processing MIME type", () => {
    assert.equal(DOCX_MIME_TYPE, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});
