"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { deriveInternalCoverCategory } = require("./coverInternalCategory");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITLE_SELECT = [
  "jm1pub_titleid", "jm1pub_titlename", "jm1pub_subtitle", "jm1pub_authordisplayname",
  "jm1_canonicalauthorcontactreference", "jm1pub_imprint", "modifiedon"
].join(",");
const ASSET_SELECT = [
  "jm1pub_publishingassetid", "jm1pub_assetformat", "jm1pub_isbn13", "jm1pub_iscurrentedition", "modifiedon"
].join(",");
const FORMAT_CODE = Object.freeze({ 100000000: "paperback", 100000002: "ebook" });

function createCoverTitleAuthorityReader(options = {}) {
  const apiBase = String(options.apiBase || process.env.DATAVERSE_WEB_API_BASE_URL || "").replace(/\/$/, "");
  const resourceUrl = String(options.resourceUrl || process.env.DATAVERSE_RESOURCE_URL || "").replace(/\/$/, "");
  const api = new URL(apiBase);
  const resource = new URL(resourceUrl);
  if (api.protocol !== "https:" || resource.protocol !== "https:" || api.hostname !== resource.hostname ||
      !api.hostname.endsWith(".crm.dynamics.com") || !api.pathname.endsWith("/api/data/v9.2")) {
    throw new Error("COVER_DATAVERSE_AUTHORITY_INVALID");
  }
  const credential = options.credential || new DefaultAzureCredential();
  const http = options.fetch || fetch;

  async function get(path) {
    const token = await credential.getToken(`${resourceUrl}/.default`);
    if (!token?.token) throw new Error("COVER_DATAVERSE_IDENTITY_UNAVAILABLE");
    const response = await http(`${apiBase}/${path}`, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
      }
    });
    if (!response.ok) throw new Error("COVER_DATAVERSE_READ_FAILED");
    return response.json();
  }

  return async function loadTitleAuthority(titleId) {
    if (!GUID.test(titleId)) throw new Error("COVER_TITLE_ID_INVALID");
    const title = await get(`jm1pub_titles(${titleId})?$select=${TITLE_SELECT}`);
    if (title.jm1pub_titleid?.toLowerCase() !== titleId.toLowerCase() || !title["@odata.etag"]) {
      throw new Error("COVER_TITLE_READBACK_UNBOUND");
    }
    const assets = await get(`jm1pub_publishingassets?$select=${ASSET_SELECT}&$filter=_jm1pub_titleid_value eq ${titleId} and jm1pub_iscurrentedition eq true&$top=20`);
    if (!Array.isArray(assets.value) || assets["@odata.nextLink"]) throw new Error("COVER_IDENTIFIER_READBACK_INCOMPLETE");
    const now = new Date().toISOString();
    const titleRecord = (field, value, sourceType = "TITLE_RECORD") => value == null || value === "" ? [] : [{
      field, value, titleId, sourceType, sourceId: titleId, sourceVersion: title["@odata.etag"],
      authorityClass: "CANONICAL_RECORD", current: true, lastVerified: now
    }];
    const authorId = /^contact:([0-9a-f-]{36})$/i.exec(title.jm1_canonicalauthorcontactreference || "")?.[1];
    const candidates = [
      ...titleRecord("title", title.jm1pub_titlename),
      ...titleRecord("subtitle", title.jm1pub_subtitle),
      ...titleRecord("authorDisplay", title.jm1pub_authordisplayname),
      ...titleRecord("authorId", authorId, "TITLE_AUTHOR_BINDING"),
      ...titleRecord("imprint", title["jm1pub_imprint@OData.Community.Display.V1.FormattedValue"])
    ];
    const isbn = {};
    const assetVersions = [];
    const assetIds = [];
    for (const asset of assets.value) {
      const format = FORMAT_CODE[asset.jm1pub_assetformat];
      if (!format || !asset.jm1pub_isbn13) continue;
      if (isbn[format]) throw new Error("COVER_DUPLICATE_CURRENT_IDENTIFIER");
      isbn[format] = String(asset.jm1pub_isbn13).replace(/[^0-9]/g, "");
      assetVersions.push(asset["@odata.etag"]);
      assetIds.push(asset.jm1pub_publishingassetid);
    }
    if (assetIds.length) candidates.push({
      field: "isbn", value: isbn, titleId, sourceType: "GOVERNED_IDENTIFIER_RECORD",
      sourceId: assetIds.sort().join(","), sourceVersion: assetVersions.sort().join(","),
      authorityClass: "CANONICAL_RECORD", current: true, lastVerified: now
    });
    if (typeof options.loadInternalCategoryEvidence === "function") {
      const evidence = await options.loadInternalCategoryEvidence(titleId);
      const category = deriveInternalCoverCategory(titleId, evidence, { now });
      if (category.ok) {
        candidates.push(category.candidate, { ...category.candidate, field: "marketContext" });
      }
    }
    return candidates;
  };
}

module.exports = { createCoverTitleAuthorityReader };
