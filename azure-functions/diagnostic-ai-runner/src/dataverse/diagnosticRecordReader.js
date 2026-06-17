"use strict";

/**
 * Reads a jm1pub_editorialdiagnostic record from Dataverse by GUID.
 *
 * Returns the manuscript URL field only. The URL must not be logged.
 * Uses managed identity (DefaultAzureCredential) — same pattern as metadataWriter.js.
 *
 * Required env vars:
 *   DATAVERSE_WEB_API_BASE_URL — e.g. https://jm1hq.crm.dynamics.com/api/data/v9.2
 *   DATAVERSE_RESOURCE_URL     — e.g. https://jm1hq.crm.dynamics.com
 *
 * Optional env vars (override defaults):
 *   DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET          — default: jm1pub_editorialdiagnostics
 *   DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN — default: jm1pub_manuscripturl
 */

const { DefaultAzureCredential } = require("@azure/identity");

function getEntitySet() {
  return process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET || "jm1pub_editorialdiagnostics";
}

function getManuscriptUrlColumn() {
  return process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN || "jm1pub_manuscripturl";
}

async function getDataverseToken(resourceUrl) {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), {
      safeCode: "DATAVERSE_TOKEN_FAILED"
    });
  }
  return tokenResponse.token;
}

/**
 * Reads the editorial diagnostic record and returns its manuscript URL.
 *
 * The manuscript URL is returned to the caller for in-memory use only.
 * The caller MUST NOT log, store, or transmit the URL.
 *
 * @param {string} diagnosticId — GUID of the jm1pub_editorialdiagnostic record
 * @returns {Promise<{ok: boolean, code: string|null, manuscriptUrl: string|null}>}
 */
async function readDiagnosticRecord(diagnosticId) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;

  if (!apiBase || !resourceUrl) {
    return { ok: false, code: "DATAVERSE_CONFIG_MISSING", manuscriptUrl: null };
  }

  const urlColumn = getManuscriptUrlColumn();

  let token;
  try {
    token = await getDataverseToken(resourceUrl);
  } catch (err) {
    return { ok: false, code: err.safeCode || "DATAVERSE_TOKEN_FAILED", manuscriptUrl: null };
  }

  const recordUrl = `${apiBase.replace(/\/$/, "")}/${getEntitySet()}(${diagnosticId})?$select=${urlColumn}`;

  let response;
  try {
    response = await fetch(recordUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
      }
    });
  } catch {
    return { ok: false, code: "DATAVERSE_READ_NETWORK_FAILED", manuscriptUrl: null };
  }

  if (response.status === 404) {
    return { ok: false, code: "DIAGNOSTIC_RECORD_NOT_FOUND", manuscriptUrl: null };
  }

  if (!response.ok) {
    return { ok: false, code: `DATAVERSE_READ_FAILED:${response.status}`, manuscriptUrl: null };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "DATAVERSE_READ_PARSE_FAILED", manuscriptUrl: null };
  }

  const rawUrl = typeof body[urlColumn] === "string" ? body[urlColumn].trim() : "";

  if (!rawUrl) {
    return { ok: false, code: "MANUSCRIPT_URL_NOT_POPULATED", manuscriptUrl: null };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, code: "MANUSCRIPT_URL_INVALID", manuscriptUrl: null };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, code: "MANUSCRIPT_URL_INVALID_PROTOCOL", manuscriptUrl: null };
  }

  // URL returned for in-memory use only — caller must not log or store it
  return { ok: true, code: null, manuscriptUrl: rawUrl };
}

module.exports = { readDiagnosticRecord, getEntitySet, getManuscriptUrlColumn };
