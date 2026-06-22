"use strict";

/**
 * Builds the template-stack manifest. Pure — no I/O.
 *
 * The manifest documents the runtime (Blob) copy's provenance — it
 * never claims to BE the canon. OneDrive remains the human-governed
 * legal/template source of truth; this manifest exists so the
 * runtime copy can be verified against it.
 */

const TEMPLATE_STACK_ID = "JMP_Complete_Agreement_Stack_v1";
const TEMPLATE_STACK_VERSION = "v1";
const MANIFEST_STATUS = Object.freeze({ APPROVED_RUNTIME_COPY: "approved/runtime-copy" });
const REVIEWED_APPROVED_BY = "Jackie Smith Jr.";
const CANON_SOURCE_NOTE = "OneDrive canon remains source of truth. This Blob copy is a runtime-accessible mirror only, not the canon.";

/**
 * @param {{
 *   sourceCanonPath: string,
 *   files: { name: string, sha256: string, byteLength: number }[],
 *   uploadedAt: string,
 *   targetBlobPath: string,
 *   generatedBy: string,
 *   environment: { storageAccount: string, container: string }
 * }} input
 * @returns {object} the manifest
 */
function buildTemplateStackManifest(input = {}) {
  return {
    templateStackId: TEMPLATE_STACK_ID,
    version: TEMPLATE_STACK_VERSION,
    sourceCanonPath: input.sourceCanonPath,
    files: (input.files || []).map((f) => ({ name: f.name, sha256: f.sha256, byteLength: f.byteLength })),
    uploadedAt: input.uploadedAt,
    status: MANIFEST_STATUS.APPROVED_RUNTIME_COPY,
    reviewedApprovedBy: REVIEWED_APPROVED_BY,
    canonSourceNote: CANON_SOURCE_NOTE,
    targetBlobPath: input.targetBlobPath,
    generatedBy: input.generatedBy,
    environment: input.environment || null
  };
}

module.exports = {
  buildTemplateStackManifest,
  TEMPLATE_STACK_ID,
  TEMPLATE_STACK_VERSION,
  MANIFEST_STATUS,
  REVIEWED_APPROVED_BY,
  CANON_SOURCE_NOTE
};
