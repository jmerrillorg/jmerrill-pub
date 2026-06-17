"use strict";

/**
 * Downloads a manuscript from a URL and extracts text for prompt injection.
 *
 * FOR AUTHORIZED PILOT USE ONLY.
 *
 * SAFETY CONTRACT:
 * - Extracted text is returned to the caller for in-memory prompt construction ONLY.
 * - The caller MUST NOT log the extracted text.
 * - The caller MUST NOT store the extracted text to any storage system.
 * - The caller MUST NOT return the extracted text to any HTTP client.
 * - The caller MUST NOT log the manuscript URL.
 * - Pilot authorization is enforced upstream in runStage0Diagnostic.js.
 *
 * Supported file types: .txt, .docx
 * File size limit: 10 MB
 * Minimum word count: 100
 */

const { createHash } = require("node:crypto");
const mammoth = require("mammoth");

const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MIN_WORD_COUNT = 100;

function detectExtension(manuscriptUrl) {
  try {
    const url = new URL(manuscriptUrl);
    const pathname = url.pathname.toLowerCase().split("?")[0];
    if (pathname.endsWith(".docx")) return ".docx";
    if (pathname.endsWith(".txt")) return ".txt";
  } catch {
    // Fall through to null
  }
  return null;
}

/**
 * Downloads from URL and extracts text in memory.
 *
 * Extension detection priority:
 *   1. fileTypeHint — from jm1_manuscriptfiletype on the Dataverse record (preferred)
 *   2. URL path extension — fallback when fileTypeHint is absent or unrecognized
 *
 * @param {string} manuscriptUrl — shareable manuscript URL (not logged by this module)
 * @param {{ fileTypeHint?: string|null }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   code: string|null,
 *   content: string|null,
 *   metadata: {
 *     fileType: string|null,
 *     byteLength: number|null,
 *     wordCount: number|null,
 *     charCount: number|null,
 *     sha256: string|null
 *   }
 * }>}
 */
async function fetchAndExtractManuscript(manuscriptUrl, { fileTypeHint = null } = {}) {
  const emptyMeta = { fileType: null, byteLength: null, wordCount: null, charCount: null, sha256: null };

  // Download
  let response;
  try {
    response = await fetch(manuscriptUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30000)
    });
  } catch {
    return { ok: false, code: "MANUSCRIPT_FETCH_NETWORK_FAILED", content: null, metadata: emptyMeta };
  }

  if (!response.ok) {
    return { ok: false, code: `MANUSCRIPT_FETCH_FAILED:${response.status}`, content: null, metadata: emptyMeta };
  }

  let arrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch {
    return { ok: false, code: "MANUSCRIPT_READ_FAILED", content: null, metadata: emptyMeta };
  }

  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    return { ok: false, code: "MANUSCRIPT_FILE_TOO_LARGE", content: null, metadata: { ...emptyMeta, byteLength: arrayBuffer.byteLength } };
  }

  const buffer = Buffer.from(arrayBuffer);
  const byteLength = buffer.byteLength;
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Detect type — prefer fileTypeHint from Dataverse, fall back to URL path
  const ext = fileTypeHint || detectExtension(manuscriptUrl);
  if (!ext) {
    return { ok: false, code: "MANUSCRIPT_TYPE_UNSUPPORTED", content: null, metadata: { fileType: null, byteLength, wordCount: null, charCount: null, sha256 } };
  }

  // Extract text in memory
  let text;
  try {
    if (ext === ".txt") {
      text = buffer.toString("utf8");
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }
  } catch {
    return { ok: false, code: "MANUSCRIPT_EXTRACTION_FAILED", content: null, metadata: { fileType: ext, byteLength, wordCount: null, charCount: null, sha256 } };
  }

  const charCount = text.length;
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  if (wordCount < MIN_WORD_COUNT) {
    // content is not returned on failure — discarded
    return { ok: false, code: "MANUSCRIPT_WORD_COUNT_TOO_LOW", content: null, metadata: { fileType: ext, byteLength, wordCount, charCount, sha256 } };
  }

  return {
    ok: true,
    code: null,
    content: text, // PILOT ONLY: caller must not log, store, or return this value
    metadata: { fileType: ext, byteLength, wordCount, charCount, sha256 }
  };
}

module.exports = { fetchAndExtractManuscript, detectExtension };
