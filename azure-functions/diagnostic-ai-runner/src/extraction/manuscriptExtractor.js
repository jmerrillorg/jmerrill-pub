/**
 * Synthetic-safe manuscript text extractor for DOCX and TXT files.
 *
 * SAFETY CONTRACT:
 * - Extracted text is held in transient runtime memory only.
 * - Extracted text is never returned to callers.
 * - Extracted text is never logged.
 * - Extracted text is never written to Dataverse, Blob, or any storage.
 * - The returned result object contains safe metadata only.
 * - AI is never called from this module.
 * - Real manuscripts are not processed in contract-test mode.
 *
 * Supported file types for this scaffold pass:
 *   .txt  — UTF-8 text read
 *   .docx — DOCX plain-text extraction via mammoth
 *
 * Unsupported (deferred):
 *   .pdf, scanned images, OCR, unknown types
 */

"use strict";

const { createHash } = require("node:crypto");
const mammoth = require("mammoth");

const SUPPORTED_TYPES = new Set([".txt", ".docx"]);

/**
 * @param {string} ext — normalized lowercase extension e.g. ".txt"
 * @param {Buffer} fileBuffer — raw file bytes
 * @returns {Promise<ExtractionResult>}
 *
 * @typedef {{
 *   supported: boolean,
 *   fileType: string,
 *   byteLength: number|null,
 *   charCount: number|null,
 *   wordCount: number|null,
 *   lineCount: number|null,
 *   sha256: string|null,
 *   extractionWarnings: string[],
 *   contentReturned: false,
 *   error: string|null
 * }} ExtractionResult
 */
async function extractManuscript(ext, fileBuffer) {
  const fileType = ext.toLowerCase();

  if (!SUPPORTED_TYPES.has(fileType)) {
    return {
      supported: false,
      fileType,
      byteLength: fileBuffer ? fileBuffer.byteLength : null,
      charCount: null,
      wordCount: null,
      lineCount: null,
      sha256: null,
      extractionWarnings: [],
      contentReturned: false,
      error: `File type '${fileType}' is not supported. Supported types: .txt, .docx`
    };
  }

  const byteLength = fileBuffer.byteLength;
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

  try {
    let text;
    const warnings = [];

    if (fileType === ".txt") {
      text = fileBuffer.toString("utf8");
    } else if (fileType === ".docx") {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
      if (result.messages && result.messages.length > 0) {
        for (const msg of result.messages) {
          // Log warning category only — no content
          warnings.push(`mammoth: ${msg.type}`);
        }
      }
    }

    // Calculate metadata from text; text itself is not returned
    const charCount = text.length;
    const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    const lineCount = fileType === ".txt" ? text.split(/\r?\n/).length : null;

    // text is discarded here — never returned, never stored, never logged

    return {
      supported: true,
      fileType,
      byteLength,
      charCount,
      wordCount,
      lineCount,
      sha256,
      extractionWarnings: warnings,
      contentReturned: false,
      error: null
    };
  } catch (err) {
    return {
      supported: true,
      fileType,
      byteLength,
      charCount: null,
      wordCount: null,
      lineCount: null,
      sha256,
      extractionWarnings: [],
      contentReturned: false,
      error: "Extraction failed"
    };
  }
}

module.exports = { extractManuscript, SUPPORTED_TYPES };
