"use strict";

/**
 * Stages a locally-prepared, author-specific agreement package (the
 * four documents produced by agreementPreparationRunner.js) into Blob
 * Storage under generated-agreements/{diagnosticId}/ — never the
 * template path — so the deployed send path
 * (agreementPackageSendRunner.js) can read them without local
 * filesystem access.
 *
 * Mirrors the same hash-then-upload-then-verify discipline as
 * templateMirrorRunner.js, scoped to the generated-output area instead
 * of the template area, plus a per-package manifest.
 *
 * Requires JM1_AGREEMENT_PACKAGE_SEND_ENABLED="true" — staging and
 * sending are governed by the same single dedicated gate, since staging
 * has no purpose other than enabling the send this gate already covers.
 */

const { computeSha256 } = require("./templateHasher");
const { isValidDocxBuffer } = require("./agreementDocxValidator");
const { createGeneratedOutputBlobWriter } = require("./agreementTemplateSource");
const { REQUIRED_DOCUMENT_NAMES, GATE_NAME } = require("./agreementPackageSendRunner");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "AGREEMENT_GENERATED_PACKAGE_MIRROR_BLOCKED", reason, ...extra };
}

/**
 * @param {{ diagnosticId: string }} input
 * @param {{
 *   readLocalDocument: (name: string) => Promise<Buffer>,
 *   uploadBlob: (blobName: string, buffer: Buffer) => Promise<void>,
 *   downloadBlob: (blobName: string) => Promise<Buffer|null>
 * }} deps
 * @returns {Promise<object>}
 */
async function mirrorGeneratedPackageToBlob(input = {}, deps = {}) {
  const diagnosticId = normalizeString(input.diagnosticId);
  if (!diagnosticId) return blocked("DIAGNOSTIC_ID_REQUIRED");
  if (typeof deps.readLocalDocument !== "function" || typeof deps.uploadBlob !== "function" || typeof deps.downloadBlob !== "function") {
    return blocked("DEPS_MISSING_REQUIRED_FUNCTIONS");
  }

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const writer = createGeneratedOutputBlobWriter({ diagnosticId, uploadBlob: deps.uploadBlob });
  const files = [];

  for (const baseName of REQUIRED_DOCUMENT_NAMES) {
    const fileName = `${baseName}_${diagnosticId}.docx`;
    let buffer;
    try {
      buffer = await deps.readLocalDocument(fileName);
    } catch (err) {
      return blocked("LOCAL_DOCUMENT_READ_FAILED", { file: fileName, detail: err.safeCode || null });
    }

    const docxValidation = await isValidDocxBuffer(buffer);
    if (!docxValidation.valid) {
      return blocked("LOCAL_DOCUMENT_INVALID", { file: fileName, detail: docxValidation.reason });
    }

    const localHash = computeSha256(buffer);

    let uploadedPath;
    try {
      uploadedPath = await writer(fileName, buffer);
    } catch (err) {
      return blocked("UPLOAD_FAILED", { file: fileName, detail: err.safeCode || null });
    }

    let verifyBuffer;
    try {
      verifyBuffer = await deps.downloadBlob(`generated-agreements/${diagnosticId}/${fileName}`);
    } catch (err) {
      return blocked("VERIFICATION_READ_FAILED", { file: fileName, detail: err.safeCode || null });
    }
    if (!verifyBuffer) return blocked("VERIFICATION_BLOB_NOT_FOUND_AFTER_UPLOAD", { file: fileName });

    const verifyHash = computeSha256(verifyBuffer);
    if (verifyHash !== localHash) {
      return blocked("VERIFICATION_HASH_MISMATCH", { file: fileName, expectedSha256: localHash, actualSha256: verifyHash });
    }

    files.push({ name: fileName, sha256: localHash, byteLength: buffer.length, blobPath: uploadedPath });
  }

  const manifest = {
    diagnosticId,
    generatedAt: new Date().toISOString(),
    files: files.map(({ name, sha256, byteLength }) => ({ name, sha256, byteLength })),
    note: "Author-specific generated agreement package. Never the template — see agreement-templates/JMP_Complete_Agreement_Stack_v1/ for the canonical blank templates."
  };

  let manifestUploaded = false;
  try {
    await writer("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
    manifestUploaded = true;
  } catch (err) {
    return blocked("MANIFEST_UPLOAD_FAILED", { detail: err.safeCode || null });
  }

  return {
    ok: true,
    code: "AGREEMENT_GENERATED_PACKAGE_MIRROR_COMPLETE",
    diagnosticId,
    files,
    manifest,
    manifestUploaded,
    gateUsed: GATE_NAME,
    liveActions: {
      readLocalDocuments: true,
      uploadedToGeneratedPath: true,
      overwroteTemplatePath: false,
      sentAuthorFacingOutput: false
    }
  };
}

module.exports = { mirrorGeneratedPackageToBlob, GATE_NAME };
