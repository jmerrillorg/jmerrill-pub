"use strict";

/**
 * Read-only Dataverse reader for the Contact linked to an Opportunity as
 * its customer (customerid_contact). Used to confirm the real author
 * recipient from source of truth before any author-facing send — never
 * from a hardcoded literal or caller-supplied value.
 *
 * This module performs GET only. It has no PATCH/POST capability and
 * cannot write to Dataverse.
 */

const { DefaultAzureCredential } = require("@azure/identity");

const OPPORTUNITY_ENTITY_SET = "opportunities";
const OPPORTUNITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORBIDDEN_MAILBOX_SUFFIX = "@jmerrill.pub";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function emailLooksValid(value) {
  const email = normalizeString(value);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
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
 * Reads the Contact (name, email) linked to an Opportunity as its
 * customer, live from Dataverse. Never returns a forbidden mailbox.
 *
 * @param {string} opportunityId
 * @param {{ getToken?: (resourceUrl: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this.
 * @returns {Promise<{
 *   ok: boolean,
 *   code: string|null,
 *   opportunityId: string,
 *   authorName: string|null,
 *   authorEmail: string|null
 * }>}
 */
async function readOpportunityAuthorContact(opportunityId, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  const id = normalizeString(opportunityId);

  if (!id || !OPPORTUNITY_ID_PATTERN.test(id)) {
    return { ok: false, code: "OPPORTUNITY_ID_INVALID", opportunityId: id || null, authorName: null, authorEmail: null };
  }

  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (!apiBase || !resourceUrl) {
    return { ok: false, code: "DATAVERSE_CONFIG_MISSING", opportunityId: id, authorName: null, authorEmail: null };
  }

  let token;
  try {
    token = await resolveToken(resourceUrl);
  } catch (err) {
    return { ok: false, code: err.safeCode || "DATAVERSE_AUTH_FAILED", opportunityId: id, authorName: null, authorEmail: null };
  }

  const url =
    `${apiBase.replace(/\/$/, "")}/${OPPORTUNITY_ENTITY_SET}(${id})` +
    `?$select=name&$expand=customerid_contact($select=fullname,emailaddress1)`;

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
      }
    });
  } catch {
    return { ok: false, code: "DATAVERSE_READ_NETWORK_FAILED", opportunityId: id, authorName: null, authorEmail: null };
  }

  if (response.status === 404) {
    return { ok: false, code: "OPPORTUNITY_NOT_FOUND", opportunityId: id, authorName: null, authorEmail: null };
  }
  if (!response.ok) {
    return { ok: false, code: `DATAVERSE_READ_FAILED:${response.status}`, opportunityId: id, authorName: null, authorEmail: null };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "DATAVERSE_READ_PARSE_FAILED", opportunityId: id, authorName: null, authorEmail: null };
  }

  const contact = body.customerid_contact;
  const authorName = normalizeString(contact?.fullname) || null;
  const authorEmail = normalizeString(contact?.emailaddress1).toLowerCase() || null;

  if (!authorEmail) {
    return { ok: false, code: "OPPORTUNITY_CONTACT_EMAIL_MISSING", opportunityId: id, authorName, authorEmail: null };
  }
  if (!emailLooksValid(authorEmail)) {
    return { ok: false, code: "OPPORTUNITY_CONTACT_EMAIL_INVALID", opportunityId: id, authorName, authorEmail: null };
  }
  if (authorEmail.endsWith(FORBIDDEN_MAILBOX_SUFFIX)) {
    return { ok: false, code: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED", opportunityId: id, authorName, authorEmail: null };
  }

  return { ok: true, code: null, opportunityId: id, authorName, authorEmail };
}

module.exports = {
  readOpportunityAuthorContact,
  OPPORTUNITY_ENTITY_SET,
  OPPORTUNITY_ID_PATTERN,
  FORBIDDEN_MAILBOX_SUFFIX
};
