"use strict";

/**
 * Reads a jm1pub_editorialdiagnostic record from Dataverse by GUID.
 *
 * Fetches the manuscript asset URL and all asset-gate fields in a single
 * request. The URL must not be logged. Asset-gate metadata (status, filename,
 * filetype) is safe to log.
 *
 * Uses managed identity (DefaultAzureCredential) — same pattern as metadataWriter.js.
 *
 * Required env vars:
 *   DATAVERSE_WEB_API_BASE_URL — e.g. https://jm1hq.crm.dynamics.com/api/data/v9.2
 *   DATAVERSE_RESOURCE_URL     — e.g. https://jm1hq.crm.dynamics.com
 *
 * Optional env vars (override defaults):
 *   DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET            — default: jm1pub_editorialdiagnostics
 *   DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN — default: jm1_manuscriptasseturl
 */

const { DefaultAzureCredential } = require("@azure/identity");
const { trackDependency } = require("../observability/dependencyTelemetry");

// Confirmed Power Apps schema — Power Apps 2026-06-17
const ASSET_GATE_COLUMNS = {
  manuscriptAssetUrl:             "jm1_manuscriptasseturl",          // URL, max 500
  manuscriptAssetStatus:          "jm1_manuscriptassetstatus",       // safe metadata
  manuscriptApprovedForDiagnostic: "jm1_manuscriptapprovedfordiagnostic", // Yes/No — must be true
  manuscriptFilename:             "jm1_manuscriptfilename",          // safe metadata
  manuscriptFileType:             "jm1_manuscriptfiletype",          // safe metadata; used for extension hint
};

function getEntitySet() {
  return process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET || "jm1pub_editorialdiagnostics";
}

function getManuscriptUrlColumn() {
  return process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN || ASSET_GATE_COLUMNS.manuscriptAssetUrl;
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
 * Normalizes a Dataverse filetype string to a supported extension.
 * Returns ".docx", ".txt", or null.
 *
 * @param {string|null} raw
 * @returns {string|null}
 */
function normalizeFileTypeHint(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/^\./, "");
  if (s === "docx") return ".docx";
  if (s === "txt") return ".txt";
  return null;
}

/**
 * Reads the editorial diagnostic record and returns its manuscript asset URL
 * along with asset-gate field values.
 *
 * The manuscript URL is returned for in-memory use only.
 * The caller MUST NOT log, store, or transmit the URL.
 * Asset-gate metadata fields (assetStatus, filename, fileType) are safe to log.
 *
 * Blocks with MANUSCRIPT_NOT_APPROVED_FOR_DIAGNOSTIC if
 * jm1_manuscriptapprovedfordiagnostic is not truthy.
 *
 * @param {string} diagnosticId — GUID of the jm1pub_editorialdiagnostic record
 * @returns {Promise<{
 *   ok: boolean,
 *   code: string|null,
 *   manuscriptUrl: string|null,
 *   assetGate: {
 *     approvedForDiagnostic: boolean|null,
 *     assetStatus: string|null,
 *     filename: string|null,
 *     fileTypeHint: string|null
 *   }
 * }>}
 */
async function readDiagnosticRecord(diagnosticId, options = {}) {
  const telemetry = options.telemetry || null;
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;

  const emptyGate = { approvedForDiagnostic: null, assetStatus: null, filename: null, fileTypeHint: null };

  if (!apiBase || !resourceUrl) {
    return { ok: false, code: "DATAVERSE_CONFIG_MISSING", manuscriptUrl: null, assetGate: emptyGate };
  }

  const urlColumn = getManuscriptUrlColumn();
  const selectColumns = [
    urlColumn,
    ASSET_GATE_COLUMNS.manuscriptAssetStatus,
    ASSET_GATE_COLUMNS.manuscriptApprovedForDiagnostic,
    ASSET_GATE_COLUMNS.manuscriptFilename,
    ASSET_GATE_COLUMNS.manuscriptFileType,
  ].join(",");

  let token;
  try {
    token = await getDataverseToken(resourceUrl);
  } catch (err) {
    return { ok: false, code: err.safeCode || "DATAVERSE_TOKEN_FAILED", manuscriptUrl: null, assetGate: emptyGate };
  }

  const recordUrl = `${apiBase.replace(/\/$/, "")}/${getEntitySet()}(${diagnosticId})?$select=${selectColumns}`;

  let response;
  try {
    response = await trackDependency(
      telemetry,
      {
        name: "Dataverse Diagnostic Record Read",
        target: resourceUrl,
        data: `${getEntitySet()}:GET`,
        dependencyTypeName: "Dataverse",
        properties: {
          diagnosticId
        },
        isSuccess: (result) => result.ok,
        getResultCode: (result) => String(result.status)
      },
      () => fetch(recordUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0"
        }
      })
    );
  } catch {
    return { ok: false, code: "DATAVERSE_READ_NETWORK_FAILED", manuscriptUrl: null, assetGate: emptyGate };
  }

  if (response.status === 404) {
    return { ok: false, code: "DIAGNOSTIC_RECORD_NOT_FOUND", manuscriptUrl: null, assetGate: emptyGate };
  }

  if (!response.ok) {
    return { ok: false, code: `DATAVERSE_READ_FAILED:${response.status}`, manuscriptUrl: null, assetGate: emptyGate };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "DATAVERSE_READ_PARSE_FAILED", manuscriptUrl: null, assetGate: emptyGate };
  }

  // Extract asset-gate metadata fields (safe to log)
  const approvedForDiagnostic = body[ASSET_GATE_COLUMNS.manuscriptApprovedForDiagnostic] === true;
  const assetStatus = typeof body[ASSET_GATE_COLUMNS.manuscriptAssetStatus] === "string"
    ? body[ASSET_GATE_COLUMNS.manuscriptAssetStatus].trim() || null
    : null;
  const filename = typeof body[ASSET_GATE_COLUMNS.manuscriptFilename] === "string"
    ? body[ASSET_GATE_COLUMNS.manuscriptFilename].trim() || null
    : null;
  const fileTypeHint = normalizeFileTypeHint(body[ASSET_GATE_COLUMNS.manuscriptFileType]);

  const assetGate = { approvedForDiagnostic, assetStatus, filename, fileTypeHint };

  // Gate: jm1_manuscriptapprovedfordiagnostic must be true
  if (!approvedForDiagnostic) {
    return { ok: false, code: "MANUSCRIPT_NOT_APPROVED_FOR_DIAGNOSTIC", manuscriptUrl: null, assetGate };
  }

  // Validate manuscript URL
  const rawUrl = typeof body[urlColumn] === "string" ? body[urlColumn].trim() : "";

  if (!rawUrl) {
    return { ok: false, code: "MANUSCRIPT_URL_NOT_POPULATED", manuscriptUrl: null, assetGate };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, code: "MANUSCRIPT_URL_INVALID", manuscriptUrl: null, assetGate };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, code: "MANUSCRIPT_URL_INVALID_PROTOCOL", manuscriptUrl: null, assetGate };
  }

  // URL returned for in-memory use only — caller must not log or store it
  return { ok: true, code: null, manuscriptUrl: rawUrl, assetGate };
}

module.exports = {
  readDiagnosticRecord,
  getEntitySet,
  getManuscriptUrlColumn,
  normalizeFileTypeHint,
  ASSET_GATE_COLUMNS,
};
