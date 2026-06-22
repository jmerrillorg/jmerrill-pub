"use strict";

/**
 * Mirrors the approved agreement template stack from the human-governed
 * OneDrive canon folder to Azure Blob Storage, so the Azure-deployed
 * agreement-preparation path can read templates without local
 * filesystem access. The OneDrive canon remains the legal/template
 * source of truth — this module only ever reads from it, never writes
 * or deletes there, and the resulting manifest explicitly says so.
 *
 * Safety boundaries:
 *   - Never overwrites a previously approved template blob silently. If
 *     a blob already exists at the target path with a DIFFERENT hash
 *     than the local canon file, this stops and reports the mismatch
 *     rather than replacing it — a version bump or explicit approval is
 *     required to proceed in that case.
 *   - Every upload is read back and re-hashed to verify it landed
 *     correctly before the manifest is written.
 *   - Never logs file contents or raw document XML — only file names,
 *     byte lengths, and hashes.
 *
 * Requires JM1_TEMPLATE_MIRROR_ENABLED="true", checked fresh on every
 * call.
 */

const { computeSha256 } = require("./templateHasher");
const { buildTemplateStackManifest } = require("./templateManifestBuilder");
const { DEFAULT_TEMPLATE_PREFIX } = require("./agreementTemplateSource");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const GATE_NAME = "JM1_TEMPLATE_MIRROR_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "AGREEMENT_TEMPLATE_MIRROR_PERFORMED";
const AGENT_MODEL_NAME = "template-mirror-runner";

const CANONICAL_TEMPLATE_FILES = Object.freeze([
  "JMP_Publishing_Agreement_v3.docx",
  "JMP_Publishing_Package_Addendum_v3.docx",
  "JMP_Audiobook_Addendum_v3.docx"
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "AGREEMENT_TEMPLATE_MIRROR_BLOCKED", reason, ...extra };
}

/**
 * @param {{
 *   sourceCanonPath: string, templatePrefix?: string,
 *   generatedBy?: string, environment?: object
 * }} input
 * @param {{
 *   getToken?: Function,
 *   readLocalCanon: (name: string) => Promise<Buffer>,
 *   downloadBlob: (blobName: string) => Promise<Buffer|null>,
 *   uploadBlob: (blobName: string, buffer: Buffer) => Promise<void>
 * }} deps
 * @returns {Promise<object>}
 */
async function mirrorAgreementTemplateStack(input = {}, deps = {}) {
  if (typeof deps.readLocalCanon !== "function" || typeof deps.downloadBlob !== "function" || typeof deps.uploadBlob !== "function") {
    return blocked("DEPS_MISSING_REQUIRED_FUNCTIONS");
  }

  const sourceCanonPath = normalizeString(input.sourceCanonPath);
  if (!sourceCanonPath) return blocked("SOURCE_CANON_PATH_REQUIRED");

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const templatePrefix = input.templatePrefix || DEFAULT_TEMPLATE_PREFIX;
  const files = [];
  const skipped = [];

  for (const name of CANONICAL_TEMPLATE_FILES) {
    let localBuffer;
    try {
      localBuffer = await deps.readLocalCanon(name);
    } catch (err) {
      return blocked("LOCAL_CANON_READ_FAILED", { file: name, detail: err.safeCode || null });
    }
    const localHash = computeSha256(localBuffer);

    let existing;
    try {
      existing = await deps.downloadBlob(`${templatePrefix}${name}`);
    } catch (err) {
      return blocked("BLOB_CHECK_FAILED", { file: name, detail: err.safeCode || null });
    }

    if (existing) {
      const existingHash = computeSha256(existing);
      if (existingHash === localHash) {
        skipped.push(name);
        files.push({ name, sha256: localHash, byteLength: localBuffer.length, action: "unchanged" });
        continue;
      }
      return blocked("EXISTING_TEMPLATE_HASH_MISMATCH", {
        file: name,
        existingSha256: existingHash,
        newSha256: localHash,
        message: "A previously approved template exists at this path with a different hash. Stopping rather than overwriting — requires an explicit version bump or approval to proceed."
      });
    }

    try {
      await deps.uploadBlob(`${templatePrefix}${name}`, localBuffer);
    } catch (err) {
      return blocked("UPLOAD_FAILED", { file: name, detail: err.safeCode || null });
    }

    let verifyBuffer;
    try {
      verifyBuffer = await deps.downloadBlob(`${templatePrefix}${name}`);
    } catch (err) {
      return blocked("VERIFICATION_READ_FAILED", { file: name, detail: err.safeCode || null });
    }
    if (!verifyBuffer) {
      return blocked("VERIFICATION_BLOB_NOT_FOUND_AFTER_UPLOAD", { file: name });
    }
    const verifyHash = computeSha256(verifyBuffer);
    if (verifyHash !== localHash) {
      return blocked("VERIFICATION_HASH_MISMATCH", { file: name, expectedSha256: localHash, actualSha256: verifyHash });
    }

    files.push({ name, sha256: localHash, byteLength: localBuffer.length, action: "uploaded" });
  }

  const uploadedAt = new Date().toISOString();
  const manifest = buildTemplateStackManifest({
    sourceCanonPath,
    files: files.map(({ name, sha256, byteLength }) => ({ name, sha256, byteLength })),
    uploadedAt,
    targetBlobPath: templatePrefix,
    generatedBy: input.generatedBy || "templateMirrorRunner.js",
    environment: input.environment || null
  });

  let manifestBuffer;
  try {
    manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
    await deps.uploadBlob(`${templatePrefix}manifest.json`, manifestBuffer);
  } catch (err) {
    return blocked("MANIFEST_UPLOAD_FAILED", { detail: err.safeCode || null });
  }

  let manifestVerifyBuffer;
  try {
    manifestVerifyBuffer = await deps.downloadBlob(`${templatePrefix}manifest.json`);
  } catch (err) {
    return blocked("MANIFEST_VERIFICATION_READ_FAILED", { detail: err.safeCode || null });
  }
  const manifestMatches = manifestVerifyBuffer && manifestVerifyBuffer.toString("utf8") === manifestBuffer.toString("utf8");
  if (!manifestMatches) {
    return blocked("MANIFEST_VERIFICATION_MISMATCH");
  }

  let executionLog = { created: false, id: null, error: "EXECUTION_LOG_NOT_ATTEMPTED", diagnostics: null };
  if (deps.getToken && process.env.DATAVERSE_WEB_API_BASE_URL && process.env.DATAVERSE_RESOURCE_URL) {
    try {
      const token = await deps.getToken(process.env.DATAVERSE_RESOURCE_URL);
      const payload = buildTemplateMirrorExecutionLogPayload({ manifest, files, skipped, completedAt: uploadedAt });
      const result = await postExecutionLogRecord(process.env.DATAVERSE_WEB_API_BASE_URL, token, payload);
      executionLog = { created: true, id: result.id, error: null, diagnostics: null };
    } catch (err) {
      executionLog = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics: classifyDataverseWriteError(err) };
    }
  }

  return {
    ok: true,
    code: "AGREEMENT_TEMPLATE_MIRROR_COMPLETE",
    manifest,
    files,
    skipped,
    manifestVerified: manifestMatches,
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      readLocalCanon: true,
      movedOrDeletedLocalCanon: false,
      overwroteExistingTemplate: false,
      uploadedNewTemplates: files.some((f) => f.action === "uploaded"),
      uploadedManifest: true,
      sentAuthorFacingOutput: false
    }
  };
}

function buildTemplateMirrorExecutionLogPayload({ manifest, files, skipped, completedAt }) {
  const actionDescription = [
    `Agreement template stack mirrored to Blob Storage: ${manifest.templateStackId} ${manifest.version}.`,
    `Target path: ${manifest.targetBlobPath}.`,
    `Files: ${files.map((f) => `${f.name} (${f.action}, sha256:${f.sha256.slice(0, 12)}...)`).join("; ")}.`,
    skipped.length > 0 ? `Unchanged (hash already matched): ${skipped.join(", ")}.` : null,
    `Source canon path: ${manifest.sourceCanonPath} (OneDrive canon remains source of truth — never modified by this run).`,
    "No file contents or raw document XML logged — only names, byte lengths, and hashes.",
    "No agreement documents sent, no Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `AGREEMENT-TEMPLATE-MIRROR-${manifest.templateStackId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: manifest.templateStackId
  };
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.error?.code || response.status;
    const msg = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }
  return { id: typeof body.jm1_executionlogid === "string" ? body.jm1_executionlogid : null };
}

module.exports = {
  mirrorAgreementTemplateStack,
  buildTemplateMirrorExecutionLogPayload,
  CANONICAL_TEMPLATE_FILES,
  GATE_NAME,
  EVENT_TYPE
};
