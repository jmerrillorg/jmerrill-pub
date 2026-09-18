"use strict";

const { createHash } = require("node:crypto");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");

const OPPORTUNITY_ENTITY_SET = "opportunities";
const TITLE_ENTITY_SET = "jm1pub_titles";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function formatted(row, field) {
  return clean(row?.[`${field}@OData.Community.Display.V1.FormattedValue`]) || clean(row?.[field]);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function encodeOData(value) {
  return clean(value).replace(/'/g, "''");
}

async function getJson(apiBase, token, path, fetchImpl = fetch) {
  const response = await fetchImpl(`${apiBase.replace(/\/$/, "")}/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse read failed (${response.status})`), {
      safeCode: "DATAVERSE_READ_FAILED",
      httpStatus: response.status,
      dvCode: body?.error?.code || null
    });
  }
  return body;
}

function agreementState(opportunity, logs) {
  const contract = normalized(formatted(opportunity, "jm1pub_contractstatus"));
  const preparation = normalized(formatted(opportunity, "jm1_m6agreementpreparationstatus"));
  const logTypes = logs.map((row) => normalized(row.jm1_actiontype));
  const executedEvidence = logTypes.some((value) => value.includes("AGREEMENT_EXECUTED"));
  if (executedEvidence && ["SIGNED", "EXECUTED", "COMPLETE", "COMPLETED"].some((value) => contract.includes(value))) {
    return { state: "COMPLETE", executedEvidence: true };
  }
  if (preparation || contract) return { state: "INCOMPLETE", executedEvidence: false };
  return { state: "", executedEvidence: false };
}

function electionState(opportunity) {
  const selection = normalized(formatted(opportunity, "jm1_m6paymentoptionselectionstatus"));
  const option = clean(opportunity.jm1_m6selectedpaymentoption);
  if (option && ["PAYMENT_OPTION_SELECTED", "SELECTED", "COMPLETED", "COMPLETE"].some((value) => selection.includes(value))) {
    return "RECEIVED_VALID";
  }
  if (["REQUESTED", "WAITING_ON_AUTHOR", "PENDING_AUTHOR"].some((value) => selection.includes(value))) return "WAITING_ON_AUTHOR";
  if (!selection && !option) return "MISSING";
  return selection || "";
}

function paymentState(opportunity) {
  const payment = normalized(formatted(opportunity, "jm1_m6firstpaymentstatus"));
  if (["PAID", "SUCCEEDED", "CONFIRMED", "COMPLETE", "COMPLETED"].some((value) => payment.includes(value))) return "CONFIRMED";
  if (["PENDING", "AWAITING", "OPEN", "PROCESSING"].some((value) => payment.includes(value))) return "PENDING";
  return payment || "NONE";
}

function requestState(logs) {
  const logTypes = logs.map((row) => normalized(row.jm1_actiontype));
  if (logTypes.some((value) => value.includes("STRIPE_INVOICE") || value.includes("PAYMENT_REQUEST_CREATED"))) return "EXISTS";
  return "NONE";
}

function buildState({ opportunity, title, logs, observedAt }) {
  const agreement = agreementState(opportunity, logs);
  const opportunityId = clean(opportunity.opportunityid);
  const titleId = clean(title.jm1pub_titleid);
  const stateMaterial = [
    clean(opportunity["@odata.etag"]),
    clean(title["@odata.etag"]),
    ...logs.map((row) => `${clean(row.jm1_executionlogid)}:${clean(row.modifiedon || row.createdon)}`)
  ].join("|");
  const stateVersion = `dv-${hash(stateMaterial).slice(0, 32)}`;
  const evidence = [
    `dataverse://${OPPORTUNITY_ENTITY_SET}/${opportunityId}`,
    `dataverse://${TITLE_ENTITY_SET}/${titleId}`,
    ...logs.map((row) => `dataverse://${EXECUTION_LOG_ENTITY_SET}/${clean(row.jm1_executionlogid)}`)
  ];
  const titleName = clean(title.jm1pub_titlename || title.jm1pub_name);
  const opportunityTitle = clean(opportunity.jm1pub_projecttitle);
  const conflicts = titleName && opportunityTitle && titleName.toLowerCase() !== opportunityTitle.toLowerCase()
    ? ["TITLE_OPPORTUNITY_NAME_MISMATCH"]
    : [];
  const missingEvidence = [];
  if (!agreement.state) missingEvidence.push("AGREEMENT_STATE");

  return {
    WORK_ID: opportunityId,
    TITLE_ID: titleId,
    AUTHORITATIVE_STATE_VERSION: stateVersion,
    OBSERVED_AT: observedAt,
    STATE_EXPIRES_AT: new Date(Date.parse(observedAt) + 15 * 60 * 1000).toISOString(),
    LIFECYCLE_COMMERCIAL_STATUS: normalized(formatted(opportunity, "statecode")) || "ACTIVE",
    AGREEMENT_STATE: agreement.state,
    EXECUTED_AGREEMENT_EVIDENCE: agreement.executedEvidence,
    PAYMENT_ELECTION_STATE: electionState(opportunity),
    PAYMENT_ELECTION_REVIEW_STATE: "PENDING",
    PAYMENT_REQUEST_STATE: requestState(logs),
    PAYMENT_STATE: paymentState(opportunity),
    ACTION_REQUESTS: [],
    EXCEPTIONS: [],
    CONFLICTS: conflicts,
    EVIDENCE_REFERENCES: evidence,
    MISSING_EVIDENCE: missingEvidence
  };
}

function createCommercialEligibilityDataverseReader(options = {}) {
  const apiBase = clean(options.apiBase || process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = clean(options.resourceUrl || process.env.DATAVERSE_RESOURCE_URL);
  const fetchImpl = options.fetchImpl || fetch;
  const tokenProvider = options.getToken || getDataverseToken;
  const clock = options.clock || (() => new Date().toISOString());

  return async function read({ opportunityId, titleId }) {
    if (!GUID.test(clean(opportunityId)) || !GUID.test(clean(titleId))) {
      throw Object.assign(new Error("Canonical opportunityId and titleId are required."), { safeCode: "INVALID_WORK_BINDING" });
    }
    if (!apiBase || !resourceUrl) throw Object.assign(new Error("Dataverse configuration missing."), { safeCode: "DATAVERSE_CONFIG_MISSING" });
    const token = await tokenProvider(resourceUrl);
    const opportunity = await getJson(
      apiBase,
      token,
      `${OPPORTUNITY_ENTITY_SET}(${opportunityId})?$select=opportunityid,jm1pub_projecttitle,jm1pub_contractstatus,jm1_m6agreementpreparationstatus,jm1_m6paymentoptionselectionstatus,jm1_m6selectedpaymentoption,jm1_m6firstpaymentstatus,statecode,modifiedon`,
      fetchImpl
    );
    const title = await getJson(
      apiBase,
      token,
      `${TITLE_ENTITY_SET}(${titleId})?$select=jm1pub_titleid,jm1pub_name,jm1pub_titlename,statecode,modifiedon`,
      fetchImpl
    );
    const filter = encodeURIComponent(`jm1_sourcerecordid eq '${encodeOData(opportunityId)}'`);
    const logResult = await getJson(
      apiBase,
      token,
      `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,jm1_actiontype,createdon,modifiedon&$filter=${filter}&$orderby=createdon desc&$top=20`,
      fetchImpl
    );
    return buildState({ opportunity, title, logs: Array.isArray(logResult.value) ? logResult.value : [], observedAt: clock() });
  };
}

module.exports = {
  buildState,
  createCommercialEligibilityDataverseReader,
  getJson
};
