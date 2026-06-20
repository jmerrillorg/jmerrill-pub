"use strict";

/**
 * Orchestrates the Milestone #6 continuation author-facing send:
 * package-selection confirmation + payment options + agreement/onboarding
 * next steps, for the existing, already-package-selected Opportunity.
 *
 * Reuses, unmodified:
 *   - readOpportunityAuthorContact (live recipient lookup — never hardcoded)
 *   - buildMilestone6ContinuationCommunication (dedicated content builder)
 *   - sendConfiguredAuthorResponse (existing, content-agnostic ACS send
 *     pipeline already used by Milestone 5 — reused here because its
 *     validation layer has no diagnostic-specific checks; only the upstream
 *     content/approval source is new)
 *
 * Requires ALL THREE gates true: JM1_AUTHOR_RESPONSE_SEND_ENABLED (master
 * author-email-send switch), JM1_PUBLISHING_ONBOARDING_ENABLED, and
 * JM1_AGREEMENT_PREPARATION_ENABLED (this email covers both onboarding and
 * agreement next steps). All three are read fresh on every call.
 *
 * Never creates a Stripe object, payment link, checkout session, invoice,
 * customer, subscription, or charge. Never starts production, activates
 * Flow D, or touches the Opportunity (no PATCH capability anywhere in this
 * module).
 */

const { readOpportunityAuthorContact } = require("../dataverse/opportunityContactReader");
const { buildMilestone6ContinuationCommunication } = require("./milestone6ContinuationCommunicationBuilder");
const { sendConfiguredAuthorResponse } = require("./authorResponseSendProviderConfig");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("./milestone6OpportunityWriter");

const GATE_NAMES = Object.freeze({
  authorResponseSend: "JM1_AUTHOR_RESPONSE_SEND_ENABLED",
  publishingOnboarding: "JM1_PUBLISHING_ONBOARDING_ENABLED",
  agreementPreparation: "JM1_AGREEMENT_PREPARATION_ENABLED"
});

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "MILESTONE_6_CONTINUATION_COMMUNICATION_SENT";
const AGENT_MODEL_NAME = "milestone-6-continuation-communication";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen(name) {
  return normalizeString(process.env[name]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "MILESTONE_6_CONTINUATION_COMMUNICATION_BLOCKED", reason, ...extra };
}

function allGatesOpen() {
  return Object.values(GATE_NAMES).every(isGateOpen);
}

async function getDataverseToken(resourceUrl) {
  const { DefaultAzureCredential } = require("@azure/identity");
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
    method: "POST",
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
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }

  return {
    id: normalizeString(body.jm1_executionlogid) || null,
    etag: normalizeString(body["@odata.etag"]) || null
  };
}

/**
 * Builds the safe jm1_executionlogs payload for the continuation send.
 * Schema-confirmed against live jm1_executionlog metadata (no jm1_flowrunid).
 * Never includes the author's email address, raw email body, or any
 * provider response — only safe categorical metadata.
 */
function buildContinuationExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, selectedPackageCode, providerMessageId, completedAt }) {
  const actionDescription = [
    `Milestone 6 continuation communication sent for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} — package-selection confirmation, payment options, and agreement/onboarding next steps presented to the author.`,
    `Selected package ${selectedPackageCode || "unknown"}.`,
    "Payment options presented with 4% processing fee disclosed; no tax invented.",
    "Internal visibility copied to publishing@jmerrill.one.",
    providerMessageId ? `Provider message reference recorded.` : "Provider message reference unavailable.",
    "No Stripe payment link, checkout session, invoice, customer, subscription, or charge created. " +
      "No contract sent. No production start, Flow D activation, distribution submission, launch/release, " +
      "royalty action, or marketing action occurred. No QBO logic used. No manuscript text, prompt body, " +
      "raw model output, secrets, tokens, or headers stored."
  ].join(" ");

  return {
    jm1_name: `M6-CONTINUATION-SEND-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * Sends the Milestone 6 continuation communication for the controlled
 * record, then writes one safe execution-log evidence record.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   opportunityId: string,
 *   projectTitle: string,
 *   selectedPackageCode: string,
 *   paymentOptions: Array<{ payments: number, totalPerInstallmentUsd: number }>,
 *   approvedBy: string
 * }} input
 * @param {{
 *   getToken?: (resourceUrl: string) => Promise<string>,
 *   readContact?: typeof readOpportunityAuthorContact,
 *   sendResponse?: typeof sendConfiguredAuthorResponse
 * }} [deps] Test-only injection seam. Production callers must omit this.
 * @returns {Promise<object>}
 */
async function sendMilestone6ContinuationCommunication(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  const resolveContact = deps.readContact || readOpportunityAuthorContact;
  const resolveSend = deps.sendResponse || sendConfiguredAuthorResponse;

  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const projectTitle = normalizeString(input.projectTitle);
  const selectedPackageCode = normalizeString(input.selectedPackageCode);
  const approvedBy = normalizeString(input.approvedBy);

  if (!diagnosticId) return blocked("DIAGNOSTIC_ID_MISSING");
  if (!intakeReferenceCode) return blocked("INTAKE_REFERENCE_CODE_MISSING");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");
  if (!projectTitle) return blocked("PROJECT_TITLE_MISSING");
  if (!selectedPackageCode) return blocked("SELECTED_PACKAGE_CODE_MISSING");
  if (!approvedBy) return blocked("APPROVED_BY_MISSING");

  if (!allGatesOpen()) {
    return blocked("GATE_CLOSED", {
      gateStates: Object.fromEntries(Object.entries(GATE_NAMES).map(([k, name]) => [name, isGateOpen(name)]))
    });
  }

  // Recipient confirmed live from Dataverse source of truth — never hardcoded.
  const contactResult = await resolveContact(opportunityId, { getToken: resolveToken });
  if (!contactResult.ok) {
    return blocked("RECIPIENT_NOT_CONFIRMED", { recipientCheckCode: contactResult.code });
  }

  const contentResult = buildMilestone6ContinuationCommunication({
    diagnosticId,
    intakeReferenceCode,
    authorName: contactResult.authorName,
    authorEmail: contactResult.authorEmail,
    projectTitle,
    selectedPackageCode,
    paymentOptions: input.paymentOptions,
    approvedBy
  });
  if (!contentResult.ok) {
    return blocked(contentResult.reason || "CONTENT_BUILD_FAILED");
  }

  const sendResult = await resolveSend({ input: { sendApproval: contentResult.sendApproval } });
  if (!sendResult.ok) {
    return blocked(sendResult.reason || "SEND_FAILED", { sendCode: sendResult.code || null });
  }
  if (sendResult.deliveryStatus !== "AUTHOR_RESPONSE_SENT") {
    return blocked("SEND_NOT_CONFIRMED_SENT", { deliveryStatus: sendResult.deliveryStatus });
  }

  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  const completedAt = new Date().toISOString();

  let executionLog = { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING", diagnostics: null };
  if (apiBase && resourceUrl) {
    try {
      const token = await resolveToken(resourceUrl);
      const payload = buildContinuationExecutionLogPayload({
        diagnosticId,
        intakeReferenceCode,
        opportunityId,
        selectedPackageCode,
        providerMessageId: sendResult.providerMessageId,
        completedAt
      });
      const result = await postExecutionLogRecord(apiBase, token, payload);
      executionLog = { created: true, id: result.id, error: null, diagnostics: null };
    } catch (err) {
      executionLog = {
        created: false,
        id: null,
        error: err.safeCode || "DATAVERSE_WRITE_FAILED",
        diagnostics: classifyDataverseWriteError(err)
      };
    }
  }

  return {
    ok: true,
    code: "MILESTONE_6_CONTINUATION_COMMUNICATION_SENT",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    authorEmailStatus: "AUTHOR_RESPONSE_SENT",
    internalVisibilityStatus: "INTERNAL_VISIBILITY_SATISFIED",
    providerMessageId: sendResult.providerMessageId || null,
    executionLog,
    gatesUsed: GATE_NAMES,
    liveActions: {
      sentAuthorEmail: true,
      sentInternalVisibilityCopy: true,
      updatedOpportunity: false,
      createdOpportunity: false,
      createdDuplicateOpportunity: false,
      createsPaymentLink: false,
      createsCheckoutSession: false,
      createsInvoice: false,
      createsCustomer: false,
      createsSubscription: false,
      chargesCard: false,
      sendsContract: false,
      activatesFlowD: false,
      startsProduction: false,
      assignsIsbn: false,
      submitsDistribution: false,
      launchesRelease: false,
      createsRoyaltySetup: false,
      activatesMarketing: false,
      usesQboForNewLogic: false
    }
  };
}

module.exports = {
  sendMilestone6ContinuationCommunication,
  buildContinuationExecutionLogPayload,
  GATE_NAMES,
  EVENT_TYPE
};
