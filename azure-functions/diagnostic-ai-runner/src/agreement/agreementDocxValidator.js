"use strict";

/**
 * Validates that a buffer is a structurally valid .docx file before it
 * is attached to an outbound email. Never inspects or returns document
 * text — only confirms the ZIP signature and the presence of the
 * required word/document.xml part.
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

  return { valid: true, reason: null };
}

module.exports = { isValidDocxBuffer, DOCX_MIME_TYPE };
