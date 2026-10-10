"use strict";

const { createHash } = require("node:crypto");
const { canonicalJson } = require("./coverAuthorityBundle");
const PRODUCTION_PREFIX = "publishing/cover/owner/v1";
const ACCEPTANCE_PREFIX = "publishing/cover/acceptance/v1";
const SHA = /^[a-f0-9]{64}$/;
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const digest = value => hash(Buffer.from(canonicalJson(value)));
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

function createCoverOwnerStore({ containerClient, acceptance = false } = {}) {
  if (typeof containerClient?.getBlockBlobClient !== "function") deny("COVER_OWNER_STORE_NOT_BOUND");
  const prefix = acceptance ? ACCEPTANCE_PREFIX : PRODUCTION_PREFIX;
  const path = (kind, key) => {
    if (!["requests", "authority", "sources", "executions", "outcomes", "provider-receipts", "receipts", "packages", "assets", "alerts", "faults", "spend-claims", "review-upload-intents", "review-upload-attempts", "review-upload-failures", "review-deliveries"].includes(kind) ||
        !SHA.test(key || "")) deny("COVER_OWNER_STORE_REFERENCE_INVALID");
    return `${prefix}/${kind}/${key}`;
  };
  async function read(kind, key, extension = "json") {
    if (!["json", "html", "png"].includes(extension)) deny("COVER_OWNER_STORE_REFERENCE_INVALID");
    const reference = `${path(kind, key)}.${extension}`;
    const blob = containerClient.getBlockBlobClient(reference);
    try {
      const properties = await blob.getProperties();
      if (!properties.etag) deny("COVER_OWNER_STORE_VERSION_MISSING");
      const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } });
      let value;
      if (extension === "json") {
        try { value = JSON.parse(bytes.toString("utf8")); } catch { deny("COVER_OWNER_STORE_JSON_INVALID"); }
      }
      return { value, bytes, etag: properties.etag, sha256: hash(bytes), reference };
    } catch (error) { if (error.statusCode === 404) return null; throw error; }
  }
  async function write(kind, key, bytes, { extension = "json", etag, immutable = false } = {}) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 20 * 1024 * 1024 || !["json", "html", "png"].includes(extension)) {
      deny("COVER_OWNER_STORE_BYTES_INVALID");
    }
    const blob = containerClient.getBlockBlobClient(`${path(kind, key)}.${extension}`);
    try {
      await blob.uploadData(bytes, { conditions: etag ? { ifMatch: etag } : { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: { json: "application/json", html: "text/html; charset=utf-8", png: "image/png" }[extension] },
        metadata: { capability: "cover-owner", evidenceclass: acceptance ? "synthetic-acceptance-not-title-authority" : "governed-internal-cover" } });
    } catch (error) {
      if (![409, 412].includes(error.statusCode) || !immutable) throw error;
    }
    const result = await read(kind, key, extension);
    if (!result || !result.bytes.equals(bytes)) deny("COVER_OWNER_STORE_READBACK_CONFLICT");
    return result;
  }
  async function list(kind) {
    if (typeof containerClient.listBlobsFlat !== "function") deny("COVER_OWNER_ENUMERATION_NOT_BOUND");
    const marker = `${path(kind, "0".repeat(64)).slice(0, -64)}`;
    const rows = [];
    for await (const item of containerClient.listBlobsFlat({ prefix: marker })) {
      const match = /^([a-f0-9]{64})\.(json|html|png)$/.exec(item.name.slice(marker.length));
      if (!match) deny("COVER_OWNER_ENUMERATION_CONFLICT");
      const row = await read(kind, match[1], match[2]);
      if (!row) deny("COVER_OWNER_ENUMERATION_RACE");
      rows.push({ key: match[1], ...row });
    }
    return rows;
  }
  return { prefix, acceptance, read, write, list,
    writeJson: (kind, key, value, options) => write(kind, key, Buffer.from(canonicalJson(value)), options) };
}

function validateOwnerBinding(request) {
  if (request?.schemaVersion !== 1 || request.revoked === true || request.enabled === false ||
      !GUID.test(request.titleId || "") || !GUID.test(request.editionId || "") ||
      request.stageId !== "12_COVER_DESIGN" || request.executionMode !== "INTERNAL_CONCEPT" ||
      !GUID.test(request.source?.artifactId || "") || !SHA.test(request.source?.sha256 || "") ||
      typeof request.source.version !== "string" || !request.source.version.trim() ||
      !SHA.test(request.authorityKey || "") || !SHA.test(request.authoritySha256 || "") ||
      typeof request.authorityReference !== "string" || !request.authorityReference.trim() ||
      ![2, 3].includes(request.variantCount)) deny("COVER_OWNER_REQUEST_INVALID");
  return { titleId: request.titleId, editionId: request.editionId, source: request.source,
    authorityKey: request.authorityKey, authoritySha256: request.authoritySha256,
    authorityReference: request.authorityReference, executionMode: request.executionMode,
    stageId: request.stageId, variantCount: request.variantCount };
}

module.exports = { createCoverOwnerStore, validateOwnerBinding, hash, digest, PRODUCTION_PREFIX, ACCEPTANCE_PREFIX };
