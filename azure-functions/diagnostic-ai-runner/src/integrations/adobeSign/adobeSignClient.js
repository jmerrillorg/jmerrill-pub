"use strict";

/**
 * Adobe Acrobat Sign REST API (v6) client skeleton.
 *
 * NOT YET CONNECTED — no Adobe Sign developer account, OAuth
 * credentials, or API access point exist anywhere in this environment
 * as of this build (confirmed: no JM1_ADOBE_SIGN_* app settings, no
 * adobe/sign secrets in Key Vault). This module defines the correct
 * API shape (per Adobe's published REST v6 contract) behind an
 * injectable HTTP dependency so it is ready to wire up once credentials
 * exist — every method here is fully unit-testable with a mocked
 * client and NEVER calls the real Adobe Sign API on its own.
 *
 * Required before this can run live:
 *   - An Adobe Acrobat Sign account with API/developer access.
 *   - OAuth2 credentials (client ID, client secret, redirect URI) and a
 *     stored refresh token, OR an integration key, depending on the
 *     account's auth model.
 *   - The account's API access point (e.g. api.na1.adobesign.com),
 *     returned by Adobe at OAuth token time.
 *
 * Gated by JM1_ADOBE_SIGN_ENABLED — defaults closed and, absent the
 * credentials above, has nothing to call even when opened.
 *
 * API call shape (per Adobe's documented REST v6 contract):
 *   1. POST /transientDocuments (multipart) -> { transientDocumentId }
 *      — uploads one file for later reference in an agreement.
 *   2. POST /agreements -> { id } — creates and (with state IN_PROCESS)
 *      immediately sends the agreement. Accepts MULTIPLE fileInfos in
 *      one agreement — the recommended approach here (see
 *      agreementSigningPacketBuilder.js): present the Publishing
 *      Agreement, Package Addendum, Audiobook Addendum, and Payment
 *      Disclosure as separate fileInfos within ONE agreement, which
 *      Adobe Sign presents to the signer as a single signing session —
 *      no document merging required.
 *   3. GET /agreements/{agreementId} -> { status, ... }
 *   4. GET /agreements/{agreementId}/combinedDocument -> signed PDF bytes.
 */

const GATE_NAME = "JM1_ADOBE_SIGN_ENABLED";

const AGREEMENT_STATUS = Object.freeze({
  OUT_FOR_SIGNATURE: "OUT_FOR_SIGNATURE",
  SIGNED: "SIGNED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "ADOBE_SIGN_CLIENT_BLOCKED", reason, ...extra };
}

/**
 * Uploads one document as a transient document, returning the ID used
 * to reference it when creating the agreement.
 *
 * @param {{ fileName: string, mimeType: string, buffer: Buffer }} input
 * @param {{ uploadTransientDocument: Function }} deps
 * @returns {Promise<object>}
 */
async function uploadTransientDocument(input = {}, deps = {}) {
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });
  if (typeof deps.uploadTransientDocument !== "function") return blocked("DEPS_MISSING_UPLOAD_TRANSIENT_DOCUMENT");

  const fileName = normalizeString(input.fileName);
  if (!fileName) return blocked("FILE_NAME_REQUIRED");
  if (!Buffer.isBuffer(input.buffer)) return blocked("BUFFER_REQUIRED");

  try {
    const result = await deps.uploadTransientDocument(input);
    return { ok: true, code: "TRANSIENT_DOCUMENT_UPLOADED", transientDocumentId: result.transientDocumentId };
  } catch (err) {
    return blocked("UPLOAD_FAILED", { detail: err.safeCode || null });
  }
}

/**
 * Creates and sends an agreement referencing one or more already-
 * uploaded transient documents, presented to the signer(s) as a single
 * signing session.
 *
 * @param {{
 *   name: string, transientDocumentIds: string[],
 *   participants: { email: string, role: string, order: number }[],
 *   formFields?: object[]
 * }} input
 * @param {{ createAgreement: Function }} deps
 * @returns {Promise<object>}
 */
async function createAgreement(input = {}, deps = {}) {
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });
  if (typeof deps.createAgreement !== "function") return blocked("DEPS_MISSING_CREATE_AGREEMENT");

  const name = normalizeString(input.name);
  if (!name) return blocked("AGREEMENT_NAME_REQUIRED");
  if (!Array.isArray(input.transientDocumentIds) || input.transientDocumentIds.length === 0) {
    return blocked("TRANSIENT_DOCUMENT_IDS_REQUIRED");
  }
  if (!Array.isArray(input.participants) || input.participants.length === 0) {
    return blocked("PARTICIPANTS_REQUIRED");
  }

  try {
    const result = await deps.createAgreement(input);
    return { ok: true, code: "AGREEMENT_CREATED", agreementId: result.agreementId, sentAt: new Date().toISOString() };
  } catch (err) {
    return blocked("AGREEMENT_CREATION_FAILED", { detail: err.safeCode || null });
  }
}

/**
 * @param {string} agreementId
 * @param {{ getAgreementStatus: Function }} deps
 * @returns {Promise<object>}
 */
async function getAgreementStatus(agreementId, deps = {}) {
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });
  if (typeof deps.getAgreementStatus !== "function") return blocked("DEPS_MISSING_GET_AGREEMENT_STATUS");
  if (!normalizeString(agreementId)) return blocked("AGREEMENT_ID_REQUIRED");

  try {
    const result = await deps.getAgreementStatus(agreementId);
    return { ok: true, code: "AGREEMENT_STATUS_RETRIEVED", status: result.status, completedAt: result.completedAt || null };
  } catch (err) {
    return blocked("STATUS_RETRIEVAL_FAILED", { detail: err.safeCode || null });
  }
}

/**
 * @param {string} agreementId
 * @param {{ downloadSignedDocument: Function }} deps
 * @returns {Promise<object>}
 */
async function downloadSignedDocument(agreementId, deps = {}) {
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });
  if (typeof deps.downloadSignedDocument !== "function") return blocked("DEPS_MISSING_DOWNLOAD_SIGNED_DOCUMENT");
  if (!normalizeString(agreementId)) return blocked("AGREEMENT_ID_REQUIRED");

  try {
    const buffer = await deps.downloadSignedDocument(agreementId);
    return { ok: true, code: "SIGNED_DOCUMENT_DOWNLOADED", buffer };
  } catch (err) {
    return blocked("DOWNLOAD_FAILED", { detail: err.safeCode || null });
  }
}

module.exports = {
  uploadTransientDocument,
  createAgreement,
  getAgreementStatus,
  downloadSignedDocument,
  AGREEMENT_STATUS,
  GATE_NAME
};
