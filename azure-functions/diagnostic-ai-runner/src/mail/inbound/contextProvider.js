"use strict";

const { getDataverseToken } = require("../../dataverse/authorDraftPersistenceClient");
const { normalizeEmail, normalizeString } = require("./util");

const EDITORIAL_STAGE_IN_PROGRESS = 100000001;
const TITLE_STAGE_BACKLIST_PUBLISHED = 100000013;

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

function titleCandidate(contact, email, row, overrides = {}) {
  const titleId = normalizeString(row.jm1pub_titleid || row._jm1pub_titleid_value);
  const postRelease = Number(row.jm1pub_stage) === TITLE_STAGE_BACKLIST_PUBLISHED;
  return {
    authorId: contact.authorId,
    authorEmail: email,
    titleId,
    workId: titleId,
    title: normalizeString(row.jm1pub_titlename || row.jm1pub_name),
    engagementId: null,
    lifecycleId: null,
    stageId: row.jm1pub_stage == null ? null : String(row.jm1pub_stage),
    movementState: postRelease ? "OUT_OF_MOVEMENT" : "AUTHOR_RELATIONSHIP_ONLY",
    postRelease,
    relationshipAuthority: "JM1_PRIMARY_AUTHOR_LOOKUP",
    ...overrides
  };
}

function activeStageCandidates(contact, email, stages, titlesById) {
  const stageHistoryByTitle = new Map();
  for (const stage of stages) {
    const titleId = normalizeString(stage._jm1pub_titleid_value);
    if (!titleId) continue;
    if (!stageHistoryByTitle.has(titleId)) stageHistoryByTitle.set(titleId, []);
    stageHistoryByTitle.get(titleId).push(stage);
  }

  const seen = new Set();
  return stages
    .filter((stage) => Number(stage.jm1pub_stagestatus) === EDITORIAL_STAGE_IN_PROGRESS)
    .filter((stage) => {
      const titleId = normalizeString(stage._jm1pub_titleid_value);
      if (!titleId || seen.has(titleId)) return false;
      seen.add(titleId);
      return true;
    })
    .map((stage) => {
      const titleId = normalizeString(stage._jm1pub_titleid_value);
      const title = titlesById.get(titleId) || {};
      const history = stageHistoryByTitle.get(titleId) || [];
      const intakeReference = history
        .map((candidate) => normalizeString(candidate.jm1pub_publishingintakereference || candidate.jm1pub_intakereference))
        .find(Boolean);
      return titleCandidate(contact, email, title, {
        titleId,
        workId: titleId,
        engagementId: intakeReference || normalizeString(stage.jm1pub_editorialstageid),
        stageId: normalizeString(stage.jm1pub_editorialstageid),
        stageName: normalizeString(stage.jm1pub_name),
        stageType: stage.jm1pub_stagetype == null ? null : String(stage.jm1pub_stagetype),
        stageStatus: stage.jm1pub_stagestatus == null ? null : String(stage.jm1pub_stagestatus),
        movementState: "CURRENT_ACTIVE",
        postRelease: false,
        relationshipAuthority: "JM1_ACTIVE_EDITORIAL_MOVEMENT"
      });
    });
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
    const primaryAuthorTitles = Array.isArray(titleResult.value) ? titleResult.value : [];
    const stageFilter = encodeURIComponent(`_jm1pub_contactid_value eq ${contact.contactId} and statecode eq 0`);
    const stageResult = await getJson(
      apiBase,
      token,
      `jm1pub_editorialstages?$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_intakereference,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value,statecode,statuscode,modifiedon&$filter=${stageFilter}&$orderby=modifiedon desc`,
      fetchImpl
    );
    const stages = Array.isArray(stageResult.value) ? stageResult.value : [];
    const stageTitleIds = [...new Set(stages.map((row) => normalizeString(row._jm1pub_titleid_value)).filter(Boolean))];
    const knownTitleIds = new Set(primaryAuthorTitles.map((row) => normalizeString(row.jm1pub_titleid)).filter(Boolean));
    const missingTitleIds = stageTitleIds.filter((titleId) => !knownTitleIds.has(titleId));
    let movementTitles = [];
    if (missingTitleIds.length > 0) {
      const movementTitleFilter = encodeURIComponent(missingTitleIds.map((titleId) => `jm1pub_titleid eq ${titleId}`).join(" or "));
      const movementTitleResult = await getJson(
        apiBase,
        token,
        `jm1pub_titles?$select=jm1pub_titleid,jm1pub_titlename,jm1pub_name,jm1pub_stage,jm1pub_currentcatalogstate,_jm1_primaryauthor_value,statecode,statuscode&$filter=${movementTitleFilter}`,
        fetchImpl
      );
      movementTitles = Array.isArray(movementTitleResult.value) ? movementTitleResult.value : [];
    }

    const allTitles = [...primaryAuthorTitles, ...movementTitles];
    const titlesById = new Map(allTitles.map((row) => [normalizeString(row.jm1pub_titleid), row]));
    const activeEngagements = activeStageCandidates(contact, email, stages, titlesById);
    const activeIds = new Set(activeEngagements.map((candidate) => candidate.titleId));
    const historicalCandidates = primaryAuthorTitles
      .map((row) => titleCandidate(contact, email, row))
      .filter((candidate) => !activeIds.has(candidate.titleId));
    const authoritativeWorkCandidates = [...activeEngagements, ...historicalCandidates];

    return {
      contacts,
      activeEngagements,
      authoritativeWorkCandidates,
      historicalWorkCandidates: historicalCandidates,
      contactMatchCount: 1
    };
  };
}

module.exports = {
  EDITORIAL_STAGE_IN_PROGRESS,
  TITLE_STAGE_BACKLIST_PUBLISHED,
  activeStageCandidates,
  createDefaultInboundContextProvider,
  getJson
};
