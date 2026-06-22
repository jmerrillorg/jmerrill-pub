"use strict";

/**
 * Selects where the agreement-preparation module reads canonical
 * templates from, and where it writes generated, author-specific
 * output documents to.
 *
 * Two strictly separate areas, by design:
 *   - TEMPLATE path  — approved blank templates only. Read-only at
 *     runtime. The generated-output writer refuses to write here.
 *   - GENERATED path — filled, author-specific agreement packages
 *     only, scoped per diagnosticId. Never the source of canon.
 *
 * Local mode reads the human-governed OneDrive canon folder directly
 * (used in local/dev contexts that have that path mounted — e.g. this
 * one-time controlled run). Blob mode reads the runtime-accessible
 * mirror created by templateMirrorRunner.js, and verifies each
 * template's hash against manifest.json before returning it — a
 * missing blob or a hash mismatch fails safely (throws) rather than
 * silently serving a stale or unexpected file.
 */

const path = require("node:path");
const { computeSha256 } = require("./templateHasher");

const DEFAULT_BLOB_CONTAINER = "publishing";
const DEFAULT_TEMPLATE_PREFIX = "agreement-templates/JMP_Complete_Agreement_Stack_v1/";
const DEFAULT_GENERATED_PREFIX = "generated-agreements/";

function isUnderTemplatePrefix(blobName, templatePrefix) {
  return blobName.startsWith(templatePrefix);
}

/**
 * @param {string} canonPath — absolute local path to the OneDrive canon folder
 * @returns {(name: string) => Promise<Buffer>}
 */
function createLocalTemplateReader(canonPath) {
  const fs = require("node:fs");
  return async (name) => fs.readFileSync(path.join(canonPath, name));
}

/**
 * @param {{
 *   downloadBlob: (blobName: string) => Promise<Buffer|null>,
 *   container?: string, templatePrefix?: string
 * }} deps — downloadBlob returns null if the blob does not exist
 * @returns {(name: string) => Promise<Buffer>}
 */
function createBlobTemplateReader(deps) {
  const templatePrefix = deps.templatePrefix || DEFAULT_TEMPLATE_PREFIX;

  return async (name) => {
    const manifestBuffer = await deps.downloadBlob(`${templatePrefix}manifest.json`);
    if (!manifestBuffer) {
      throw Object.assign(new Error("Template manifest not found in Blob Storage"), { safeCode: "TEMPLATE_MANIFEST_NOT_FOUND" });
    }
    let manifest;
    try {
      manifest = JSON.parse(manifestBuffer.toString("utf8"));
    } catch {
      throw Object.assign(new Error("Template manifest is not valid JSON"), { safeCode: "TEMPLATE_MANIFEST_INVALID" });
    }

    const manifestEntry = (manifest.files || []).find((f) => f.name === name);
    if (!manifestEntry) {
      throw Object.assign(new Error(`Template '${name}' is not listed in the manifest`), { safeCode: "TEMPLATE_NOT_IN_MANIFEST" });
    }

    const blobBuffer = await deps.downloadBlob(`${templatePrefix}${name}`);
    if (!blobBuffer) {
      throw Object.assign(new Error(`Template blob '${name}' not found`), { safeCode: "TEMPLATE_BLOB_NOT_FOUND" });
    }

    const actualHash = computeSha256(blobBuffer);
    if (actualHash !== manifestEntry.sha256) {
      throw Object.assign(new Error(`Template '${name}' hash mismatch against manifest`), { safeCode: "TEMPLATE_HASH_MISMATCH" });
    }

    return blobBuffer;
  };
}

/**
 * @param {{
 *   uploadBlob: (blobName: string, buffer: Buffer) => Promise<string>,
 *   diagnosticId: string, container?: string,
 *   templatePrefix?: string, generatedPrefix?: string
 * }} deps
 * @returns {(name: string, buffer: Buffer) => Promise<string>}
 */
function createGeneratedOutputBlobWriter(deps) {
  const templatePrefix = deps.templatePrefix || DEFAULT_TEMPLATE_PREFIX;
  const generatedPrefix = deps.generatedPrefix || DEFAULT_GENERATED_PREFIX;
  const diagnosticId = deps.diagnosticId;

  if (!diagnosticId) {
    throw Object.assign(new Error("diagnosticId is required to scope the generated-output path"), { safeCode: "DIAGNOSTIC_ID_REQUIRED_FOR_GENERATED_OUTPUT" });
  }

  return async (name, buffer) => {
    const blobName = `${generatedPrefix}${diagnosticId}/${name}`;
    if (isUnderTemplatePrefix(blobName, templatePrefix)) {
      throw Object.assign(new Error("Refusing to write generated output under the template path"), { safeCode: "GENERATED_OUTPUT_WOULD_OVERWRITE_TEMPLATE_PATH" });
    }
    return deps.uploadBlob(blobName, buffer);
  };
}

/**
 * Resolves the read/write dependency pair for prepareAgreementDocumentPackage
 * based on mode. Pure selection logic — the actual storage clients are
 * supplied by the caller (e.g. the HTTP wrapper, using managed identity
 * in Azure) via blobClientDeps.
 *
 * @param {{
 *   mode?: "local" | "blob",
 *   diagnosticId: string,
 *   localCanonPath?: string,
 *   blobClientDeps?: { downloadBlob: Function, uploadBlob: Function }
 * }} input
 * @returns {{ readTemplate: Function, writeOutput: Function }}
 */
function resolveAgreementPrepDeps(input = {}) {
  const mode = input.mode || (typeof process.env.JM1_AGREEMENT_TEMPLATE_SOURCE === "string" ? process.env.JM1_AGREEMENT_TEMPLATE_SOURCE : "blob");

  if (mode === "local") {
    if (!input.localCanonPath) {
      throw Object.assign(new Error("localCanonPath is required in local mode"), { safeCode: "LOCAL_CANON_PATH_REQUIRED" });
    }
    return {
      readTemplate: createLocalTemplateReader(input.localCanonPath),
      // Local mode still writes generated output to Blob when blobClientDeps
      // are supplied (e.g. local script run against the real Azure
      // container, as used for this controlled record) — never back to
      // the local canon folder.
      writeOutput: input.blobClientDeps
        ? createGeneratedOutputBlobWriter({ ...input.blobClientDeps, diagnosticId: input.diagnosticId })
        : undefined
    };
  }

  if (!input.blobClientDeps) {
    throw Object.assign(new Error("blobClientDeps is required in blob mode"), { safeCode: "BLOB_CLIENT_DEPS_REQUIRED" });
  }
  return {
    readTemplate: createBlobTemplateReader(input.blobClientDeps),
    writeOutput: createGeneratedOutputBlobWriter({ ...input.blobClientDeps, diagnosticId: input.diagnosticId })
  };
}

module.exports = {
  createLocalTemplateReader,
  createBlobTemplateReader,
  createGeneratedOutputBlobWriter,
  resolveAgreementPrepDeps,
  isUnderTemplatePrefix,
  DEFAULT_BLOB_CONTAINER,
  DEFAULT_TEMPLATE_PREFIX,
  DEFAULT_GENERATED_PREFIX
};
