"use strict";

const { getDataverseToken } = require("../../dataverse/authorDraftPersistenceClient");
const { normalizeEmail, normalizeString } = require("./util");

function cleanBase(value) {
  return normalizeString(value).replace(/\/$/, "");
}

function escapeOData(value) {
  return normalizeString(value).replace(/'/g, "''");
}

async function getJson(apiBase, token, path, fetchImpl) {
  const response = await fetchImpl(`${apiBase}/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse inbound context read failed (${response.status})`), {
      safeCode: "INBOUND_CONTEXT_READ_FAILED",
      httpStatus: response.status,
      dataverseCode: body?.error?.code || null
    });
  }
  return body;
}

function createDefaultInboundContextProvider(options = {}) {
  const apiBase = cleanBase(options.apiBase || process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = cleanBase(options.resourceUrl || process.env.DATAVERSE_RESOURCE_URL);
  const fetchImpl = options.fetchImpl || global.fetch;
  const tokenProvider = options.getToken || getDataverseToken;

  return async function loadInboundContext(messageEvidence) {
    const email = normalizeEmail(messageEvidence?.fromAddress);
    if (!email) return { contacts: [], activeEngagements: [], authoritativeWorkCandidates: [] };
    if (!apiBase || !resourceUrl) {
      throw Object.assign(new Error("Dataverse inbound context configuration is missing"), {
        safeCode: "INBOUND_CONTEXT_CONFIG_MISSING"
      });
    }

    const token = await tokenProvider(resourceUrl);
    const emailLiteral = escapeOData(email);
    const contactFilter = encodeURIComponent(
      `emailaddress1 eq '${emailLiteral}' or emailaddress2 eq '${emailLiteral}' or emailaddress3 eq '${emailLiteral}'`
    );
    const contactResult = await getJson(
      apiBase,
      token,
      `contacts?$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,statecode&$filter=${contactFilter}`,
      fetchImpl
    );
    const contacts = (Array.isArray(contactResult.value) ? contactResult.value : [])
      .filter((row) => row.statecode === 0 && row.jm1pub_isauthor === true)
      .map((row) => ({
        email,
        authorId: normalizeString(row.contactid),
        contactId: normalizeString(row.contactid),
        name: normalizeString(row.fullname)
      }));

    if (contacts.length !== 1) {
      return { contacts, activeEngagements: [], authoritativeWorkCandidates: [], contactMatchCount: contacts.length };
    }

    const contact = contacts[0];
    const titleFilter = encodeURIComponent(`_jm1_primaryauthor_value eq ${contact.contactId} and statecode eq 0`);
    const titleResult = await getJson(
      apiBase,
      token,
      `jm1pub_titles?$select=jm1pub_titleid,jm1pub_titlename,jm1pub_name,jm1pub_stage,jm1pub_currentcatalogstate,_jm1_primaryauthor_value,statecode,statuscode&$filter=${titleFilter}`,
      fetchImpl
    );
    const authoritativeWorkCandidates = (Array.isArray(titleResult.value) ? titleResult.value : []).map((row) => ({
      authorId: contact.authorId,
      authorEmail: email,
      titleId: normalizeString(row.jm1pub_titleid),
      workId: normalizeString(row.jm1pub_titleid),
      title: normalizeString(row.jm1pub_titlename || row.jm1pub_name),
      engagementId: null,
      lifecycleId: null,
      stageId: row.jm1pub_stage == null ? null : String(row.jm1pub_stage),
      relationshipAuthority: "JM1_PRIMARY_AUTHOR_LOOKUP"
    }));

    return {
      contacts,
      activeEngagements: authoritativeWorkCandidates,
      authoritativeWorkCandidates,
      contactMatchCount: 1
    };
  };
}

module.exports = {
  createDefaultInboundContextProvider,
  getJson
};
