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
 *
 * SharePoint URLs (.sharepoint.com) are downloaded via Microsoft Graph using the
 * Function App's managed identity (Files.Read.All). All other HTTPS URLs fall back
 * to direct fetch. The Graph token is acquired at call time and never stored.
 */

const { createHash } = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");
const mammoth = require("mammoth");

const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MIN_WORD_COUNT = 100;
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_SHARES_BASE = "https://graph.microsoft.com/v1.0/shares";

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

function isSharePointUrl(manuscriptUrl) {
  try {
    const host = new URL(manuscriptUrl).hostname.toLowerCase();
    return host.endsWith(".sharepoint.com");
  } catch {
    return false;
  }
}

/**
 * Encodes a SharePoint/OneDrive sharing URL for use with the Graph /shares endpoint.
 * Encoding: base64url(url) prefixed with "u!"
 *
 * @param {string} url
 * @returns {string}
 */
function encodeShareUrl(url) {
  return "u!" + Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Downloads a SharePoint file via Microsoft Graph /shares/{encodedUrl}/driveItem/content.
 * Requires Files.Read.All on the caller's managed identity.
 * The manuscript URL is used only to form the Graph request and is never logged.
 *
 * @param {string} manuscriptUrl — SharePoint URL (not logged)
 * @returns {Promise<Response>}
 */
async function fetchViaGraph(manuscriptUrl) {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(GRAPH_SCOPE);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Graph token"), {
      safeCode: "GRAPH_TOKEN_FAILED"
    });
  }

  const encodedUrl = encodeShareUrl(manuscriptUrl);
  const graphEndpoint = `${GRAPH_SHARES_BASE}/${encodedUrl}/driveItem/content`;

  return fetch(graphEndpoint, {
    method: "GET",
    headers: { "Authorization": `Bearer ${tokenResponse.token}` },
    signal: AbortSignal.timeout(30000),
    redirect: "follow"
  });
}

/**
 * Downloads from URL and extracts text in memory.
 *
 * Extension detection priority:
 *   1. fileTypeHint — from jm1_manuscriptfiletype on the Dataverse record (preferred)
 *   2. URL path extension — fallback when fileTypeHint is absent or unrecognized
 *
 * Download strategy:
 *   - SharePoint URLs (.sharepoint.com): Graph API with managed identity auth
 *   - All other HTTPS URLs: direct fetch
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
 *     sha256: string|null,
 *     downloadMethod: string|null
 *   }
 * }>}
 */
async function fetchAndExtractManuscript(manuscriptUrl, { fileTypeHint = null } = {}) {
  const emptyMeta = { fileType: null, byteLength: null, wordCount: null, charCount: null, sha256: null, downloadMethod: null };

  const useGraph = isSharePointUrl(manuscriptUrl);
  const downloadMethod = useGraph ? "graph" : "direct";

  // Download
  let response;
  try {
    if (useGraph) {
      response = await fetchViaGraph(manuscriptUrl);
    } else {
      response = await fetch(manuscriptUrl, {
        method: "GET",
        signal: AbortSignal.timeout(30000)
      });
    }
  } catch (err) {
    const code = err.safeCode
      ? `MANUSCRIPT_FETCH_NETWORK_FAILED:${err.safeCode}`
      : "MANUSCRIPT_FETCH_NETWORK_FAILED";
    return { ok: false, code, content: null, metadata: { ...emptyMeta, downloadMethod } };
  }

  if (!response.ok) {
    return { ok: false, code: `MANUSCRIPT_FETCH_FAILED:${response.status}`, content: null, metadata: { ...emptyMeta, downloadMethod } };
  }

  let arrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch {
    return { ok: false, code: "MANUSCRIPT_READ_FAILED", content: null, metadata: { ...emptyMeta, downloadMethod } };
  }

  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    return { ok: false, code: "MANUSCRIPT_FILE_TOO_LARGE", content: null, metadata: { ...emptyMeta, byteLength: arrayBuffer.byteLength, downloadMethod } };
  }

  const buffer = Buffer.from(arrayBuffer);
  const byteLength = buffer.byteLength;
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Detect type — prefer fileTypeHint from Dataverse, fall back to URL path
  const ext = fileTypeHint || detectExtension(manuscriptUrl);
  if (!ext) {
    return { ok: false, code: "MANUSCRIPT_TYPE_UNSUPPORTED", content: null, metadata: { fileType: null, byteLength, wordCount: null, charCount: null, sha256, downloadMethod } };
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
    return { ok: false, code: "MANUSCRIPT_EXTRACTION_FAILED", content: null, metadata: { fileType: ext, byteLength, wordCount: null, charCount: null, sha256, downloadMethod } };
  }

  const charCount = text.length;
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  if (wordCount < MIN_WORD_COUNT) {
    // content is not returned on failure — discarded
    return { ok: false, code: "MANUSCRIPT_WORD_COUNT_TOO_LOW", content: null, metadata: { fileType: ext, byteLength, wordCount, charCount, sha256, downloadMethod } };
  }

  return {
    ok: true,
    code: null,
    content: text, // PILOT ONLY: caller must not log, store, or return this value
    metadata: { fileType: ext, byteLength, wordCount, charCount, sha256, downloadMethod }
  };
}

module.exports = { fetchAndExtractManuscript, detectExtension, isSharePointUrl, encodeShareUrl };
