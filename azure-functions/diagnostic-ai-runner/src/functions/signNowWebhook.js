"use strict";

const { app } = require("@azure/functions");
const { getDataverseToken, patchDataverseRecord } = require("../dataverse/authorDraftPersistenceClient");

const CONTRACT_ENTITY_SET = "jm1pub_contracts";
const OPPORTUNITY_ENTITY_SET = "opportunities";
const CONTACT_ENTITY_SET = "contacts";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";

const CONTRACT_STATUS = Object.freeze({
  ACTIVE: 196650002
});

const OPPORTUNITY_CONTRACT_STATUS = Object.freeze({
  SIGNED: 196650003
});

const FIRST_PAYMENT_STATUS = Object.freeze({
  PAID_CONFIRMED: 835510002
});

const AUTHOR_PORTAL_STATUS = Object.freeze({
  ACTIVE: 835512003
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyWebhookSecret(request) {
  const expected = normalizeString(process.env.SIGNNOW_WEBHOOK_SECRET);
  const actual = normalizeString(request.headers.get("x-jm1-signnow-webhook-secret"));
  return Boolean(expected && actual && actual === expected);
}

async function dataverseFetch(path, options = {}) {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL);
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }
  const token = await getDataverseToken(resourceUrl);
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(message), { safeCode: "DATAVERSE_REQUEST_FAILED", httpStatus: response.status });
  }
  return body;
}

async function postExecutionLog(eventType, description, sourceRecordId) {
  const now = new Date().toISOString();
  return dataverseFetch(EXECUTION_LOG_ENTITY_SET, {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify({
      jm1_name: `${eventType}-JMP-INT-202607-0W5PTQ`,
      jm1_actiondescription: description.slice(0, 1000),
      jm1_actiontype: eventType,
      jm1_agentname: "jm1-diagnostic-ai-runner",
      jm1_agentmodel: "signnow-webhook",
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: now,
      jm1_completedon: now,
      jm1_sourceentity: "jm1pub_contract",
      jm1_sourcerecordid: sourceRecordId
    })
  });
}

function extractProviderDocumentId(body = {}) {
  return normalizeString(
    body.entity_id ||
    body.document_id ||
    body.documentId ||
    body.id ||
    body.meta?.entity_id ||
    body.meta?.document_id ||
    body.data?.entity_id ||
    body.data?.document_id ||
    body.data?.id
  );
}

function extractEventName(body = {}) {
  return normalizeString(body.event || body.event_name || body.type || body.action || body.data?.event || body.meta?.event);
}

function isCompletionEvent(eventName, body = {}) {
  const lower = eventName.toLowerCase();
  const status = normalizeString(body.status || body.document_status || body.data?.status || body.meta?.status).toLowerCase();
  return lower.includes("complete") || lower.includes("signed") || status === "completed" || status === "signed";
}

function isContractAlreadySigned(contract = {}) {
  return contract.jm1pub_status === CONTRACT_STATUS.ACTIVE || contract.jm1pub_providerstatus === "SIGNNOW_SIGNED";
}

async function findContractByProviderAgreementId(providerAgreementId) {
  const filter = encodeURIComponent(`jm1pub_provideragreementid eq '${providerAgreementId.replace(/'/g, "''")}'`);
  const select = [
    "jm1pub_contractid",
    "jm1pub_contractname",
    "jm1pub_provideragreementid",
    "jm1pub_providerinviteid",
    "jm1pub_providerstatus",
    "jm1pub_status",
    "_jm1pub_opportunity_value",
    "_new_author_value"
  ].join(",");
  const result = await dataverseFetch(`${CONTRACT_ENTITY_SET}?$select=${select}&$filter=${filter}&$top=1`);
  return Array.isArray(result.value) && result.value.length ? result.value[0] : null;
}

async function getOpportunity(opportunityId) {
  return dataverseFetch(`${OPPORTUNITY_ENTITY_SET}(${opportunityId})?$select=jm1_m6firstpaymentstatus,jm1_m6authorportalstatus`);
}

async function markSignedAndUnlock(contract, providerAgreementId, eventName) {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL);
  const token = await getDataverseToken(resourceUrl);
  const now = new Date().toISOString();
  const contractId = contract.jm1pub_contractid;
  const opportunityId = normalizeString(contract._jm1pub_opportunity_value);
  const contactId = normalizeString(contract._new_author_value);

  await patchDataverseRecord(apiBase, token, CONTRACT_ENTITY_SET, contractId, {
    jm1pub_status: CONTRACT_STATUS.ACTIVE,
    jm1pub_providerstatus: "SIGNNOW_SIGNED",
    jm1pub_signeddate: now
  });

  await postExecutionLog(
    "AGREEMENT_SIGNED",
    `SignNow signed/completed callback processed for provider document ${providerAgreementId}; event=${eventName || "unknown"}.`,
    contractId
  );

  let workspaceUnlocked = false;
  if (opportunityId) {
    const opportunity = await getOpportunity(opportunityId);
    if (opportunity.jm1_m6firstpaymentstatus === FIRST_PAYMENT_STATUS.PAID_CONFIRMED) {
      await patchDataverseRecord(apiBase, token, OPPORTUNITY_ENTITY_SET, opportunityId, {
        jm1pub_contractstatus: OPPORTUNITY_CONTRACT_STATUS.SIGNED,
        jm1_m6agreementpreparationstatus: "AGREEMENT_SIGNED_ACTIVE",
        jm1_m6authorportalstatus: AUTHOR_PORTAL_STATUS.ACTIVE
      });
      await postExecutionLog(
        "WORKSPACE_FULL_UNLOCKED",
        "Author Workspace unlocked because SignNow agreement is signed/active and commissioning payment is confirmed. No Business Central, royalties, production, distribution, or SharePoint movement occurred.",
        contractId
      );
      workspaceUnlocked = true;
    }
  }

  if (contactId) {
    await patchDataverseRecord(apiBase, token, CONTACT_ENTITY_SET, contactId, { jm1pub_isauthor: true });
  }

  return { contractId, opportunityId: opportunityId || null, contactId: contactId || null, workspaceUnlocked };
}

app.http("signnow-webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "signnow-webhook",
  handler: async (request, context) => {
    if (!verifyWebhookSecret(request)) {
      context.warn("SignNow webhook rejected: invalid shared secret.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    try {
      let body;
      body = await request.json();
      const providerAgreementId = extractProviderDocumentId(body);
      const eventName = extractEventName(body);
      if (!providerAgreementId) {
        return { status: 202, jsonBody: { status: "ignored", code: "NO_PROVIDER_DOCUMENT_ID" } };
      }

      const contract = await findContractByProviderAgreementId(providerAgreementId);
      if (!contract) {
        return { status: 202, jsonBody: { status: "ignored", code: "CONTRACT_NOT_FOUND" } };
      }

      if (!isCompletionEvent(eventName, body)) {
        await postExecutionLog(
          "SIGNNOW_WEBHOOK_RECEIVED",
          `SignNow webhook received for provider document ${providerAgreementId}; event=${eventName || "unknown"}; no state transition applied.`,
          contract.jm1pub_contractid
        );
        return { status: 202, jsonBody: { status: "accepted", code: "EVENT_LOGGED_NO_TRANSITION" } };
      }

      if (isContractAlreadySigned(contract)) {
        return {
          status: 200,
          jsonBody: {
            status: "accepted",
            code: "SIGNNOW_COMPLETION_ALREADY_PROCESSED",
            contractId: contract.jm1pub_contractid,
            workspaceUnlocked: true
          }
        };
      }

      const result = await markSignedAndUnlock(contract, providerAgreementId, eventName);
      return {
        status: 200,
        jsonBody: {
          status: "accepted",
          code: "SIGNNOW_COMPLETION_PROCESSED",
          contractId: result.contractId,
          workspaceUnlocked: result.workspaceUnlocked
        }
      };
    } catch (error) {
      const safeCode = error?.safeCode || "SIGNNOW_WEBHOOK_PROCESSING_FAILED";
      const httpStatus = Number.isInteger(error?.httpStatus) ? error.httpStatus : null;
      context.error(`SignNow webhook failed: ${safeCode}${httpStatus ? ` HTTP ${httpStatus}` : ""}`);
      return {
        status: 500,
        jsonBody: {
          status: "error",
          code: safeCode
        }
      }
    }
  }
});

module.exports = {
  extractProviderDocumentId,
  extractEventName,
  isCompletionEvent,
  isContractAlreadySigned
};
