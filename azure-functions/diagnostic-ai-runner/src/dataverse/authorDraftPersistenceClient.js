"use strict";

/**
 * Live Dataverse client for internal author-response draft persistence.
 *
 * This client only PATCHes confirmed safe author-draft fields on an existing
 * jm1pub_editorialdiagnostic row. It does not send email, create send events,
 * create Opportunities, activate Flow D, run diagnostics, or open gates.
 */

const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
const { ENTITY_SET, ROW_IDENTITY } = require("../author/authorDraftFieldMap");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isConfiguredSecret(value) {
  const normalized = normalizeString(value);
  return Boolean(normalized && !/^\(.*\)$/.test(normalized) && !normalized.toLowerCase().includes("set-before-use"));
}

async function getDataverseToken(resourceUrl) {
  const tenantId = normalizeString(process.env.DATAVERSE_TENANT_ID);
  const clientId = normalizeString(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeString(process.env.DATAVERSE_CLIENT_SECRET);
  const credential = isConfiguredSecret(tenantId) && isConfiguredSecret(clientId) && isConfiguredSecret(clientSecret)
    ? new ClientSecretCredential(tenantId, clientId, clientSecret)
    : new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), {
      safeCode: "DATAVERSE_TOKEN_FAILED"
    });
  }
  return tokenResponse.token;
}

async function patchDataverseRecord(apiBase, token, entitySet, diagnosticId, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${entitySet}(${diagnosticId})`;
  const response = await fetch(url, {
    method: "PATCH",
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
    throw Object.assign(new Error(`Dataverse PATCH failed (${entitySet}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }

  return {
    dataverseRecordId: normalizeString(body[ROW_IDENTITY]) || diagnosticId,
    etag: normalizeString(body["@odata.etag"]) || null
  };
}

function createAuthorDraftDataverseClient(options = {}) {
  const apiBase = options.apiBase || process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = options.resourceUrl || process.env.DATAVERSE_RESOURCE_URL;

  return {
    async persistAuthorDraft(input = {}) {
      if (!apiBase || !resourceUrl) {
        throw Object.assign(new Error("Dataverse configuration missing"), {
          safeCode: "DATAVERSE_CONFIG_MISSING"
        });
      }
      if (input.entitySet !== ENTITY_SET) {
        throw Object.assign(new Error("Unexpected author draft entity set"), {
          safeCode: "DATAVERSE_ENTITY_SET_INVALID"
        });
      }
      if (!input.dataverseUpdatePayload || typeof input.dataverseUpdatePayload !== "object" || Array.isArray(input.dataverseUpdatePayload)) {
        throw Object.assign(new Error("Author draft update payload missing"), {
          safeCode: "DATAVERSE_UPDATE_PAYLOAD_INVALID"
        });
      }

      const diagnosticId = normalizeString(input.diagnosticId);
      const token = await getDataverseToken(resourceUrl);
      return patchDataverseRecord(apiBase, token, input.entitySet, diagnosticId, input.dataverseUpdatePayload);
    }
  };
}

module.exports = {
  createAuthorDraftDataverseClient,
  patchDataverseRecord,
  getDataverseToken
};
