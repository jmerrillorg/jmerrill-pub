"use strict";

/**
 * Dedicated, gated, allowlisted Dataverse writer for Milestone #6 payment-
 * option selection capture.
 *
 * This is NOT a generic CRM writer. It PATCHes exactly one entity set
 * (opportunities) and exactly one fixed allowlist of nine payment-option
 * capture fields on an existing Opportunity record. It never creates
 * records — there is no POST/create code path for Opportunities in this
 * module by design, so duplicate-Opportunity creation is structurally
 * impossible here, not merely gated.
 *
 * Live update requires JM1_PAYMENT_OPTION_CAPTURE_ENABLED="true" — a
 * dedicated gate, separate from JM1_OPPORTUNITY_UPDATE_ENABLED (used for
 * the original package-selection write), since this is new code writing
 * to a distinct field set. The gate is read fresh on every call.
 *
 * After a successful Opportunity PATCH, this module writes one safe
 * jm1_executionlogs evidence record. Never stores manuscript text,
 * prompt body, raw model output, raw email body, raw Graph response,
 * secrets, tokens, or headers.
 */

const {
  patchDataverseRecord,
  getDataverseToken
} = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("./milestone6OpportunityWriter");

const CAPTURE_GATE_NAME = "JM1_PAYMENT_OPTION_CAPTURE_ENABLED";
const ALLOWED_ENTITY_SET = "opportunities";
const OPPORTUNITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "MILESTONE_6_PAYMENT_OPTION_CAPTURED";
const AGENT_MODEL_NAME = "milestone-6-payment-option-capture-writer";

// Confirmed against live Dataverse entity metadata (EntityDefinitions
// query, 2026-06-21). These are the ONLY Opportunity fields this writer
// may ever PATCH, with their confirmed live attribute type.
const ALLOWED_FIELD_TYPES = Object.freeze({
  jm1_m6paymentoptionselectionstatus: "string",
  jm1_m6selectedpaymentoption: "string",
  jm1_m6selectedinstallmentcount: "integer",
  jm1_m6selectedpaymentamount: "number",
  jm1_m6selectedpaymenttotal: "number",
  jm1_m6paymentselectionsource: "string",
  jm1_m6paymentselectionreceivedon: "isoDate",
  jm1_m6paymentselectionthreadsubject: "string",
  jm1_m6paymentselectionevidencelog: "string"
});

const ALLOWED_OPPORTUNITY_FIELDS = Object.freeze(Object.keys(ALLOWED_FIELD_TYPES));

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[CAPTURE_GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "MILESTONE_6_PAYMENT_OPTION_CAPTURE_BLOCKED", reason, ...extra };
}

function valueMatchesType(value, type) {
  if (type === "string") return typeof value === "string" && value.trim().length > 0;
  if (type === "integer") return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
  if (type === "number") return typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (type === "isoDate") return typeof value === "string" && !Number.isNaN(Date.parse(value));
  return false;
}

/**
 * Validates a payment-option capture payload against the fixed allowlist
 * and per-field type constraints. Fails closed on: non-object input,
 * empty payload, any unknown field, or any value that does not match its
 * confirmed Dataverse attribute type.
 *
 * @param {unknown} payload
 * @returns {{ valid: boolean, reason?: string, unknownFields?: string[], invalidFields?: string[] }}
 */
function validatePaymentOptionCapturePayload(payload) {
  if (!isPlainObject(payload)) return { valid: false, reason: "PAYLOAD_NOT_OBJECT" };

  const keys = Object.keys(payload);
  if (keys.length === 0) return { valid: false, reason: "EMPTY_PAYLOAD" };

  const unknownFields = keys.filter((k) => !ALLOWED_OPPORTUNITY_FIELDS.includes(k));
  if (unknownFields.length > 0) return { valid: false, reason: "UNKNOWN_FIELD_PRESENT", unknownFields };

  const invalidFields = keys.filter((k) => !valueMatchesType(payload[k], ALLOWED_FIELD_TYPES[k]));
  if (invalidFields.length > 0) return { valid: false, reason: "INVALID_FIELD_VALUE", invalidFields };

  return { valid: true };
}

/**
 * Builds the safe jm1_executionlogs payload recording that a payment-
 * option capture write occurred. Never contains raw email body, raw
 * Graph response, headers, tokens, or secrets — only the captured
 * structured fields and safe metadata.
 */
function buildPaymentOptionCaptureExecutionLogPayload(input) {
  const {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPaymentOption,
    installmentCount,
    paymentAmount,
    paymentTotal,
    selectionSource,
    completedAt
  } = input;

  const actionDescription = [
    `Milestone 6 payment-option capture executed for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} updated; no Opportunity created, no duplicate Opportunity created.`,
    `Selected payment option: ${selectedPaymentOption || "unknown"}.`,
    `Installment count: ${installmentCount ?? "unknown"}.`,
    `Per-installment amount: $${typeof paymentAmount === "number" ? paymentAmount.toFixed(2) : "unknown"}.`,
    `Total payment amount: $${typeof paymentTotal === "number" ? paymentTotal.toFixed(2) : "unknown"}.`,
    `Selection source: ${selectionSource || "unknown"}.`,
    `Gate used: ${CAPTURE_GATE_NAME}.`,
    "No raw email body, raw Graph response, headers, tokens, or secrets stored.",
    "No Stripe object, contract, onboarding form, production, distribution, launch, royalty, or marketing action occurred."
  ].join(" ");

  return {
    jm1_name: `M6-PAYMENT-OPTION-CAPTURE-${diagnosticId}`,
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
 * Performs exactly one gated, allowlisted Opportunity payment-option
 * capture PATCH, then writes safe execution-log evidence. Returns a safe
 * result only — never the raw Dataverse response.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   opportunityId: string,
 *   opportunityPayload: Record<string, string|number>
 * }} input
 * @param {{ getToken?: (resourceUrl: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this.
 * @returns {Promise<object>}
 */
async function writeMilestone6PaymentOptionCapture(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return blocked("DIAGNOSTIC_ID_INVALID");
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return blocked("INTAKE_REFERENCE_CODE_INVALID");
  }
  if (!opportunityId || !OPPORTUNITY_ID_PATTERN.test(opportunityId)) {
    return blocked("OPPORTUNITY_ID_INVALID");
  }

  const payloadValidation = validatePaymentOptionCapturePayload(input.opportunityPayload);
  if (!payloadValidation.valid) {
    return blocked(payloadValidation.reason, {
      unknownFields: payloadValidation.unknownFields,
      invalidFields: payloadValidation.invalidFields
    });
  }

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", { gate: CAPTURE_GATE_NAME });
  }

  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (!apiBase || !resourceUrl) {
    return blocked("DATAVERSE_CONFIG_MISSING");
  }

  let token;
  try {
    token = await resolveToken(resourceUrl);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_AUTH_FAILED");
  }

  let patchResult;
  try {
    patchResult = await patchDataverseRecord(apiBase, token, ALLOWED_ENTITY_SET, opportunityId, input.opportunityPayload);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_PATCH_FAILED", { httpStatus: err.httpStatus || null });
  }

  const completedAt = new Date().toISOString();
  const executionLogPayload = buildPaymentOptionCaptureExecutionLogPayload({
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPaymentOption: input.opportunityPayload.jm1_m6selectedpaymentoption,
    installmentCount: input.opportunityPayload.jm1_m6selectedinstallmentcount,
    paymentAmount: input.opportunityPayload.jm1_m6selectedpaymentamount,
    paymentTotal: input.opportunityPayload.jm1_m6selectedpaymenttotal,
    selectionSource: input.opportunityPayload.jm1_m6paymentselectionsource,
    completedAt
  });

  let executionLog;
  try {
    const result = await postExecutionLogRecord(apiBase, token, executionLogPayload);
    executionLog = { created: true, id: result.id, error: null, diagnostics: null };
  } catch (err) {
    executionLog = {
      created: false,
      id: null,
      error: err.safeCode || "DATAVERSE_WRITE_FAILED",
      diagnostics: classifyDataverseWriteError(err)
    };
  }

  return {
    ok: true,
    code: "MILESTONE_6_PAYMENT_OPTION_CAPTURED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    opportunityRecordId: patchResult.dataverseRecordId,
    opportunityEtag: patchResult.etag,
    fieldsUpdated: Object.keys(input.opportunityPayload),
    executionLog,
    gateUsed: CAPTURE_GATE_NAME,
    liveActions: {
      updatedOpportunity: true,
      createdOpportunity: false,
      createdDuplicateOpportunity: false,
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
  writeMilestone6PaymentOptionCapture,
  validatePaymentOptionCapturePayload,
  buildPaymentOptionCaptureExecutionLogPayload,
  CAPTURE_GATE_NAME,
  ALLOWED_ENTITY_SET,
  ALLOWED_OPPORTUNITY_FIELDS,
  ALLOWED_FIELD_TYPES,
  OPPORTUNITY_ID_PATTERN,
  EVENT_TYPE
};
