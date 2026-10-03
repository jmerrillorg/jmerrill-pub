"use strict";

const { createHash } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const CATEGORIES = ["Hate", "SelfHarm", "Sexual", "Violence"];
const RECORD_KEYS = ["titleId", "imageSha256", "provider", "apiVersion", "categoriesAnalysis", "passed", "assessedAt"];
const MAX_RECORD_BYTES = 16 * 1024;

function sameKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function normalizeEvidence(value) {
  if (!sameKeys(value, RECORD_KEYS) || !GUID.test(value.titleId) || !SHA256.test(value.imageSha256) ||
      value.provider !== "AZURE_AI_CONTENT_SAFETY" || value.apiVersion !== "2024-09-01" ||
      typeof value.passed !== "boolean" || typeof value.assessedAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.assessedAt) ||
      !Number.isFinite(Date.parse(value.assessedAt)) ||
      new Date(value.assessedAt).toISOString() !== value.assessedAt ||
      !Array.isArray(value.categoriesAnalysis) || value.categoriesAnalysis.length !== CATEGORIES.length) {
    throw new Error("COVER_SAFETY_EVIDENCE_INVALID");
  }
  const scores = new Map();
  for (const row of value.categoriesAnalysis) {
    if (!sameKeys(row, ["category", "severity"]) || !CATEGORIES.includes(row.category) ||
        ![0, 2, 4, 6].includes(row.severity) || scores.has(row.category)) {
      throw new Error("COVER_SAFETY_EVIDENCE_INVALID");
    }
    scores.set(row.category, row.severity);
  }
  if (scores.size !== CATEGORIES.length || value.passed !== [...scores.values()].every((score) => score === 0)) {
    throw new Error("COVER_SAFETY_EVIDENCE_INVALID");
  }
  return {
    titleId: value.titleId, imageSha256: value.imageSha256, provider: value.provider,
    apiVersion: value.apiVersion,
    categoriesAnalysis: CATEGORIES.map((category) => ({ category, severity: scores.get(category) })),
    passed: value.passed, assessedAt: value.assessedAt
  };
}

function evidenceIdFor(record) {
  return createHash("sha256").update(`cover-safety-v1\0${record.titleId}\0${record.imageSha256}`).digest("hex");
}

async function readRecord(blob) {
  const response = await blob.download();
  const chunks = [];
  let size = 0;
  for await (const chunk of response.readableStreamBody) {
    size += chunk.length;
    if (size > MAX_RECORD_BYTES) throw new Error("COVER_SAFETY_EVIDENCE_CONFLICT");
    chunks.push(Buffer.from(chunk));
  }
  try {
    const payload = Buffer.concat(chunks).toString("utf8");
    const stored = JSON.parse(payload);
    if (!sameKeys(stored, [...RECORD_KEYS, "evidenceId"])) throw new Error("invalid record");
    const { evidenceId, ...fields } = stored;
    const record = normalizeEvidence(fields);
    if (evidenceId !== evidenceIdFor(record) || payload !== `${JSON.stringify({ ...record, evidenceId })}\n`) {
      throw new Error("invalid identity or payload");
    }
    return { ...record, evidenceId };
  } catch {
    throw new Error("COVER_SAFETY_EVIDENCE_CONFLICT");
  }
}

function createCoverSafetyEvidenceStore(options = {}) {
  const serviceUrl = options.serviceUrl || process.env.JM1_COVER_BLOB_SERVICE_URL;
  const containerName = options.containerName || process.env.JM1_COVER_AUDIT_CONTAINER;
  if (!serviceUrl || !containerName) throw new Error("COVER_SAFETY_EVIDENCE_STORE_NOT_CONFIGURED");
  let url;
  try { url = new URL(serviceUrl); } catch { throw new Error("COVER_SAFETY_EVIDENCE_STORE_URL_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || url.port || !/^[a-z0-9]{3,24}\.blob\.core\.windows\.net$/.test(url.hostname) ||
      typeof containerName !== "string" || containerName.length < 3 || containerName.length > 63 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(containerName)) {
    throw new Error("COVER_SAFETY_EVIDENCE_STORE_URL_INVALID");
  }
  const clientId = options.managedIdentityClientId || process.env.AZURE_CLIENT_ID;
  const credential = options.credential || (clientId ? new ManagedIdentityCredential(clientId) : new ManagedIdentityCredential());
  const service = options.service || new BlobServiceClient(url.origin, credential);
  const container = service.getContainerClient(containerName);
  const blobFor = (titleId, evidenceId) => container.getBlockBlobClient(
    `publishing/cover/v1/safety/${titleId}/${evidenceId}.json`);

  async function persistEvidence(input) {
    const record = normalizeEvidence(input);
    const evidenceId = evidenceIdFor(record);
    const expected = { ...record, evidenceId };
    const blob = blobFor(record.titleId, evidenceId);
    const payload = `${JSON.stringify(expected)}\n`;
    try {
      await blob.upload(payload, Buffer.byteLength(payload), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: { ifNoneMatch: "*" },
        metadata: { capability: "cover-design", retentionclass: "governed-production-audit" }
      });
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
    }
    const stored = await readRecord(blob);
    if (JSON.stringify(stored) !== JSON.stringify(expected)) throw new Error("COVER_SAFETY_EVIDENCE_CONFLICT");
    return { evidenceId, titleId: record.titleId, imageSha256: record.imageSha256, passed: record.passed };
  }

  async function readEvidence(titleId, evidenceId) {
    if (!GUID.test(titleId) || !SHA256.test(evidenceId)) throw new Error("COVER_SAFETY_EVIDENCE_ID_INVALID");
    const stored = await readRecord(blobFor(titleId, evidenceId));
    if (stored.titleId !== titleId || stored.evidenceId !== evidenceId) {
      throw new Error("COVER_SAFETY_EVIDENCE_CONFLICT");
    }
    return stored;
  }

  return { persistEvidence, readEvidence };
}

module.exports = { createCoverSafetyEvidenceStore };
