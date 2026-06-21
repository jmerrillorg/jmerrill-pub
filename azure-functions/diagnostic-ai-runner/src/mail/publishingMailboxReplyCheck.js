"use strict";

/**
 * Orchestrates one controlled check of the publishing mailbox for a reply
 * to the Milestone 6 continuation send, classifies it, and writes one safe
 * execution-log evidence record.
 *
 * Does NOT write to the Opportunity. Does NOT write any "selected payment
 * option" structured field anywhere — no such field exists in the live
 * Dataverse schema (confirmed by direct metadata inspection: only the nine
 * existing M6 status fields exist on Opportunity; there is no field for
 * selected option, installment count, per-payment amount, or selection
 * source). The classification and structured payment-option detail (when
 * applicable) are recorded only in the existing, schema-confirmed
 * jm1_executionlogs evidence entity, the same pattern already used
 * throughout Milestone 6. A dedicated Opportunity-level capture requires
 * new Dataverse fields to be added first — that is a schema decision, not
 * a code change, and is explicitly out of scope for this module.
 *
 * Never logs or returns the raw reply body text — only the classification
 * and (when applicable) the governed payment-option detail.
 */

const { readPublishingMailboxReply, GATE_NAME } = require("./publishingMailboxReader");
const { classifyPublishingReply, getPaymentOptionDetails } = require("./publishingReplyClassifier");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "MILESTONE_6_PUBLISHING_MAILBOX_REPLY_CHECKED";
const AGENT_MODEL_NAME = "publishing-mailbox-reply-check";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PUBLISHING_MAILBOX_REPLY_CHECK_BLOCKED", reason, ...extra };
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
 * Builds the safe execution-log payload for a mailbox reply check. Never
 * contains the raw reply body — only the classification, governed
 * payment-option detail (if applicable), and safe metadata.
 */
function buildReplyCheckExecutionLogPayload({
  diagnosticId,
  intakeReferenceCode,
  opportunityId,
  found,
  classification,
  paymentOptionDetails,
  receivedDateTime,
  completedAt
}) {
  const descriptionParts = [
    `Publishing mailbox reply check for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} — no Opportunity write occurs in this check; classification recorded for evidence only.`,
    found ? "A matching reply was found in the controlled thread." : "No matching reply was found in the controlled thread.",
    found ? `Classification: ${classification}.` : null,
    paymentOptionDetails
      ? `Selected payment option detail — installments: ${paymentOptionDetails.installments}, ` +
        `per-installment amount: $${paymentOptionDetails.perInstallmentUsd.toFixed(2)}, ` +
        `processing fee applies: ${paymentOptionDetails.feeApplies}.`
      : null,
    receivedDateTime ? `Reply received: ${receivedDateTime}.` : null,
    "Source mailbox: publishing@jmerrill.one (Inbox, read-only).",
    "No raw email body, raw Graph response, headers, tokens, or secrets stored.",
    "No Stripe object, contract, onboarding form, production, distribution, launch, royalty, or marketing action occurred."
  ];

  const actionDescription = descriptionParts.filter(Boolean).join(" ");

  return {
    jm1_name: `M6-MAILBOX-REPLY-CHECK-${diagnosticId}`,
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
 * Runs one controlled publishing-mailbox reply check for the given
 * controlled record, classifies the reply if found, and writes one safe
 * execution-log evidence record.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   opportunityId: string,
 *   subjectContains: string,
 *   afterIso: string
 * }} input
 * @param {{
 *   getToken?: (resourceUrlOrScope: string) => Promise<string>,
 *   readReply?: typeof readPublishingMailboxReply
 * }} [deps] Test-only injection seam. Production callers must omit this.
 * @returns {Promise<object>}
 */
async function checkPublishingMailboxReply(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  const resolveReply = deps.readReply || readPublishingMailboxReply;

  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const subjectContains = normalizeString(input.subjectContains);
  const afterIso = normalizeString(input.afterIso);

  if (!diagnosticId) return blocked("DIAGNOSTIC_ID_MISSING");
  if (!intakeReferenceCode) return blocked("INTAKE_REFERENCE_CODE_MISSING");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");
  if (!subjectContains) return blocked("SUBJECT_FILTER_MISSING");
  if (!afterIso) return blocked("AFTER_TIMESTAMP_MISSING");

  const replyResult = await resolveReply({ subjectContains, afterIso }, { getToken: deps.getGraphToken });

  if (!replyResult.ok) {
    return blocked(replyResult.reason || "MAILBOX_READ_FAILED", { gate: GATE_NAME });
  }

  const found = replyResult.found === true;
  const classificationResult = found
    ? classifyPublishingReply(replyResult.bodyText)
    : { classification: null };
  const classification = classificationResult.classification;
  const paymentOptionDetails = classification ? getPaymentOptionDetails(classification) : null;

  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  const completedAt = new Date().toISOString();

  let executionLog = { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING", diagnostics: null };
  if (apiBase && resourceUrl) {
    try {
      const token = await resolveToken(resourceUrl);
      const payload = buildReplyCheckExecutionLogPayload({
        diagnosticId,
        intakeReferenceCode,
        opportunityId,
        found,
        classification,
        paymentOptionDetails,
        receivedDateTime: replyResult.receivedDateTime,
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
    code: "PUBLISHING_MAILBOX_REPLY_CHECKED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    found,
    classification,
    paymentOptionDetails,
    executionLog,
    schemaGap: {
      opportunityLevelCaptureFieldsExist: false,
      note:
        "No Dataverse field exists for selected payment option, installment count, per-payment amount, or " +
        "selection source on Opportunity. Classification is recorded only in jm1_executionlogs evidence. " +
        "Adding dedicated Opportunity fields requires a schema change, not a code change."
    },
    liveActions: {
      readMailbox: true,
      mutatedMailbox: false,
      updatedOpportunity: false,
      createdOpportunity: false,
      createsPaymentLink: false,
      createsCheckoutSession: false,
      createsInvoice: false,
      createsCustomer: false,
      createsSubscription: false,
      chargesCard: false,
      sendsContract: false,
      sendsOnboardingForm: false,
      activatesFlowD: false,
      startsProduction: false,
      submitsDistribution: false,
      launchesRelease: false,
      createsRoyaltySetup: false,
      activatesMarketing: false,
      usesQboForNewLogic: false
    }
  };
}

module.exports = {
  checkPublishingMailboxReply,
  buildReplyCheckExecutionLogPayload,
  EVENT_TYPE
};
