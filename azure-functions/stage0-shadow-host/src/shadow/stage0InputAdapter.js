"use strict";

const { createHash } = require("node:crypto");
const { ManagedIdentityCredential } = require("@azure/identity");
const mammoth = require("mammoth");

const SITE_ID = "jmerrillfoundation.sharepoint.com,35fb0d98-bc68-4250-9d0d-8c07d68e4024,10208ad5-0028-48f0-9ffa-717812924835";
const SITE_ORIGIN = "https://jmerrillfoundation.sharepoint.com";
const SITE_PATH = "/sites/publishing/";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EXCERPT_CHARS = 12000;

function canonicalAssetUrl(value) {
  const url = new URL(value);
  if (url.origin !== SITE_ORIGIN || !url.pathname.startsWith(SITE_PATH) ||
      url.pathname.includes("/_layouts/") || url.username || url.password || url.hash ||
      !/\.(docx|md|txt)$/i.test(url.pathname)) {
    throw new Error("SHADOW_MANUSCRIPT_URL_DENIED");
  }
  url.search = "";
  return url;
}

function encodeShareUrl(url) {
  return `u!${Buffer.from(url).toString("base64url")}`;
}

async function boundedBytes(response) {
  if (!response.ok) throw new Error(`SHADOW_MANUSCRIPT_READ_${response.status}`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error("SHADOW_MANUSCRIPT_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("SHADOW_MANUSCRIPT_BODY_MISSING");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("SHADOW_MANUSCRIPT_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new Error("SHADOW_MANUSCRIPT_EMPTY");
  return Buffer.concat(chunks);
}

async function readApprovedInput(event, { clientId, credential, fetchImpl = fetch } = {}) {
  if (event?.manuscriptApprovedForDiagnostic !== true ||
      !/^[0-9a-f-]{36}$/i.test(event?.sourceEventId || "")) {
    throw new Error("SHADOW_SOURCE_NOT_APPROVED");
  }
  const url = canonicalAssetUrl(event.manuscriptUrl);
  const extension = url.pathname.toLowerCase().slice(url.pathname.lastIndexOf("."));
  const identity = credential || new ManagedIdentityCredential(clientId);
  const token = await identity.getToken("https://graph.microsoft.com/.default");
  if (!token?.token) throw new Error("SHADOW_GRAPH_AUTH_FAILED");
  const share = encodeShareUrl(url.href);
  const base = `https://graph.microsoft.com/v1.0/shares/${share}/driveItem`;
  const headers = { Authorization: `Bearer ${token.token}`, Accept: "application/json" };
  const metadataResponse = await fetchImpl(`${base}?$select=id,parentReference`, {
    headers, signal: AbortSignal.timeout(30000),
  });
  if (!metadataResponse.ok) throw new Error(`SHADOW_MANUSCRIPT_METADATA_${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  if (!metadata.id || metadata.parentReference?.siteId !== SITE_ID ||
      !metadata.parentReference?.driveId) throw new Error("SHADOW_MANUSCRIPT_SITE_MISMATCH");
  let content = await fetchImpl(`${base}/content`, {
    headers, signal: AbortSignal.timeout(30000), redirect: "manual",
  });
  if (content.status === 302) {
    const location = new URL(content.headers.get("location"));
    if (location.protocol !== "https:" ||
        (location.hostname !== "jmerrillfoundation.sharepoint.com" &&
         !location.hostname.endsWith(".sharepoint.com"))) {
      throw new Error("SHADOW_DOWNLOAD_REDIRECT_DENIED");
    }
    content = await fetchImpl(location.href, { signal: AbortSignal.timeout(30000), redirect: "error" });
  }
  const bytes = await boundedBytes(content);
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const extracted = extension === ".docx"
    ? (await mammoth.extractRawText({ buffer: bytes })).value
    : bytes.toString("utf8");
  const excerpt = extracted.replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT_CHARS);
  if (!excerpt) throw new Error("SHADOW_EXCERPT_EMPTY");
  return {
    sourceEventId: event.sourceEventId,
    approvedExcerpt: excerpt,
    sourceReferenceIds: [sourceHash],
  };
}

module.exports = { SITE_ID, canonicalAssetUrl, readApprovedInput };
