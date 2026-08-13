"use strict";

/**
 * Validates that a buffer is a structurally valid .docx file before it
 * is allowed to enter any agreement execution path. Never inspects or
 * returns document text — only confirms the Open XML package shape
 * required by Word/e-sign providers.
 */

const JSZip = require("jszip");

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ valid: boolean, reason: string|null }>}
 */
async function isValidDocxBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return { valid: false, reason: "BUFFER_TOO_SMALL" };
  }
  if (!buffer.subarray(0, 4).equals(ZIP_SIGNATURE)) {
    return { valid: false, reason: "NOT_A_ZIP_ARCHIVE" };
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { valid: false, reason: "ZIP_PARSE_FAILED" };
  }

  if (!zip.file("word/document.xml")) {
    return { valid: false, reason: "MISSING_WORD_DOCUMENT_XML" };
  }
  if (!zip.file("[Content_Types].xml")) {
    return { valid: false, reason: "MISSING_CONTENT_TYPES_XML" };
  }
  if (!zip.file("_rels/.rels")) {
    return { valid: false, reason: "MISSING_PACKAGE_RELS" };
  }

  let contentTypesXml;
  let packageRelsXml;
  try {
    contentTypesXml = await zip.file("[Content_Types].xml").async("string");
    packageRelsXml = await zip.file("_rels/.rels").async("string");
  } catch {
    return { valid: false, reason: "OPENXML_PACKAGE_PART_READ_FAILED" };
  }
  if (!contentTypesXml.includes("wordprocessingml.document.main+xml")) {
    return { valid: false, reason: "MISSING_MAIN_DOCUMENT_CONTENT_TYPE" };
  }
  if (!packageRelsXml.includes("officeDocument")) {
    return { valid: false, reason: "MISSING_OFFICE_DOCUMENT_RELATIONSHIP" };
  }

  return { valid: true, reason: null };
}

module.exports = { isValidDocxBuffer, DOCX_MIME_TYPE };
