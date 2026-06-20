"use strict";

/**
 * Dedicated, gated, allowlisted Dataverse writer for Milestone #6
 * controlled package-selection activation.
 *
 * This is NOT a generic CRM writer. It PATCHes exactly one entity set
 * (opportunities) and exactly one fixed allowlist of Milestone #6 fields
 * on an existing Opportunity record. It never creates records — there is
 * no POST/create code path for Opportunities in this module by design,
 * so duplicate-Opportunity creation is structurally impossible here, not
 * merely gated.
 *
 * Live update requires JM1_OPPORTUNITY_UPDATE_ENABLED="true". The gate is
 * read fresh on every call — it is never cached.
 *
 * After a successful Opportunity PATCH, this module writes one safe
 * jm1_executionlogs evidence record. The execution log never contains
 * manuscript text, prompt body, raw model output, secrets, tokens, or
 * headers — only intake/diagnostic/Opportunity IDs, package codes,
 * readiness statuses, a timestamp, and the gate name used.
 */

const {
  patchDataverseRecord,
  getDataverseToken
} = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");

const OPPORTUNITY_GATE_NAME = "JM1_OPPORTUNITY_UPDATE_ENABLED";
const ALLOWED_ENTITY_SET = "opportunities";
const OPPORTUNITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const MILESTONE6_WRITER_EVENT_TYPE = "MILESTONE_6_OPPORTUNITY_UPDATE_EXECUTED";
const MILESTONE6_WRITER_MODEL_NAME = "milestone-6-opportunity-writer";
const MILESTONE6_EVIDENCE_RECOVERY_EVENT_TYPE = "MILESTONE_6_EVIDENCE_RECOVERY_LOG";
const MILESTONE6_EVIDENCE_RECOVERY_MODEL_NAME = "milestone-6-evidence-only-recovery";
const EVIDENCE_RECOVERY_REASON = "OPPORTUNITY_PATCH_SUCCEEDED_EXECUTION_LOG_RETRY";

// Fixed allowlist — the ONLY Opportunity fields this writer may ever PATCH.
const ALLOWED_OPPORTUNITY_FIELDS = Object.freeze([
  "jm1pub_packagerecommended",
  "jm1_m6packageselectionstatus",
  "jm1_m6authorselectedpackagecode",
  "jm1_m6stripeproductmappingstatus",
  "jm1_m6stripepricemappingstatus",
  "jm1_m6paymentoptionpreparationstatus",
  "jm1_m6agreementpreparationstatus",
  "jm1_m6onboardingstatus",
  "jm1_m6businesshandoffstatus"
]);

// Confirmed against live jm1_executionlog entity metadata (EntityDefinitions
// query, 2026-06-20). These are the fields this module is allowed to write
// to jm1_executionlogs. jm1_flowrunid is intentionally absent — it does not
// exist on this entity; an earlier version of this module incorrectly sent
// it, which caused Dataverse to reject the entire POST (the actual root
// cause of the first two execution-log write failures, not a permission
// issue). ApplicationRequired fields per metadata: jm1_actiondescription,
// jm1_actiontype, jm1_agentname, jm1_bandlevel, jm1_executionstatus,
// jm1_startedon — all are populated below. jm1_agentmodel, jm1_completedon,
// jm1_sourceentity, jm1_sourcerecordid, jm1_name are optional but populated
// for evidence quality. SystemRequired fields (ownerid, statecode, etc.)
// are populated automatically by Dataverse and must not be set explicitly.
const EXECUTION_LOG_FIELDS_USED = Object.freeze([
  "jm1_name",
  "jm1_actiondescription",
  "jm1_actiontype",
  "jm1_agentname",
  "jm1_agentmodel",
  "jm1_bandlevel",
  "jm1_executionstatus",
  "jm1_startedon",
  "jm1_completedon",
  "jm1_sourceentity",
  "jm1_sourcerecordid"
]);

const EXECUTION_LOG_APPLICATION_REQUIRED_FIELDS = Object.freeze([
  "jm1_actiondescription",
  "jm1_actiontype",
  "jm1_agentname",
  "jm1_bandlevel",
  "jm1_executionstatus",
  "jm1_startedon"
]);

/**
 * Categorizes a Dataverse write failure into a closed set of safe labels.
 * Never includes the raw response body, headers, tokens, or secrets — only
 * the HTTP status, Dataverse's own short error code (not message text), and
 * a coarse category derived solely from the status code.
 *
 * @param {{ httpStatus?: number|null, dvCode?: string|number|null }} err
 * @returns {{ httpStatus: number|null, dvCode: string|null, category: string }}
 */
function classifyDataverseWriteError(err) {
  const httpStatus = typeof err?.httpStatus === "number" ? err.httpStatus : null;
  const dvCode = err?.dvCode != null ? String(err.dvCode) : null;

  let category = "UNKNOWN_WRITE_FAILURE";
  if (httpStatus === 400) category = "INVALID_FIELD_OR_SCHEMA_MISMATCH";
  else if (httpStatus === 401) category = "AUTH_FAILED";
  else if (httpStatus === 403) category = "PERMISSION_DENIED";
  else if (httpStatus === 404) category = "RECORD_OR_ENTITY_NOT_FOUND";
  else if (httpStatus === 412) category = "PRECONDITION_FAILED";
  else if (typeof httpStatus === "number" && httpStatus >= 500) category = "DATAVERSE_SERVER_ERROR";

  return { httpStatus, dvCode, category };
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[OPPORTUNITY_GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "MILESTONE_6_WRITER_BLOCKED", reason, ...extra };
}

/**
 * Validates an Opportunity update payload against the fixed allowlist.
 * Fails closed on: non-object input, empty payload, any unknown field,
 * or any value that is not a non-empty string.
 *
 * @param {unknown} payload
 * @returns {{ valid: boolean, reason?: string, unknownFields?: string[], invalidFields?: string[] }}
 */
function validateOpportunityPayload(payload) {
  if (!isPlainObject(payload)) return { valid: false, reason: "PAYLOAD_NOT_OBJECT" };

  const keys = Object.keys(payload);
  if (keys.length === 0) return { valid: false, reason: "EMPTY_PAYLOAD" };

  const unknownFields = keys.filter((k) => !ALLOWED_OPPORTUNITY_FIELDS.includes(k));
  if (unknownFields.length > 0) return { valid: false, reason: "UNKNOWN_FIELD_PRESENT", unknownFields };

  const invalidFields = keys.filter((k) => typeof payload[k] !== "string" || payload[k].trim().length === 0);
  if (invalidFields.length > 0) return { valid: false, reason: "INVALID_FIELD_VALUE", invalidFields };

  return { valid: true };
}

/**
 * Builds the safe jm1_executionlogs payload recording that a Milestone #6
 * controlled Opportunity update occurred. Contains only safe metadata —
 * no manuscript text, prompt body, raw model output, secrets, or headers.
 */
function buildMilestone6WriterExecutionLogPayload(input) {
  const {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    paymentOptionPreparationStatus,
    agreementPreparationStatus,
    onboardingStatus,
    correlationId,
    completedAt
  } = input;

  const actionDescription = [
    `Milestone 6 controlled Opportunity update executed for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} updated; no Opportunity created, no duplicate Opportunity created.`,
    `Recommended package ${recommendedPackageCode || "unknown"}.`,
    alternatePackageCode ? `Alternate package ${alternatePackageCode}.` : "No alternate package.",
    `Author selected package ${selectedPackageCode || "unknown"}.`,
    `Payment option preparation status ${paymentOptionPreparationStatus || "unknown"}.`,
    `Agreement preparation status ${agreementPreparationStatus || "unknown"}.`,
    `Onboarding status ${onboardingStatus || "unknown"}.`,
    `Gate used: ${OPPORTUNITY_GATE_NAME}.`,
    correlationId ? `Correlation ID: ${correlationId}.` : null,
    "No payment link, checkout session, invoice, customer, subscription, charge, contract, author email, " +
      "Flow D activation, production automation, ISBN assignment, distribution submission, launch/release, " +
      "royalty setup, QBO logic, manuscript text, prompt body, raw model output, secrets, tokens, or headers stored."
  ].filter(Boolean).join(" ");

  // jm1_flowrunid does NOT exist on jm1_executionlog (confirmed against live
  // entity metadata) — correlationId is folded into jm1_actiondescription
  // text above instead of sent as a separate field.
  return {
    jm1_name: `M6-OPP-WRITE-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: MILESTONE6_WRITER_EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MILESTONE6_WRITER_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * POSTs the Milestone #6 writer execution-log evidence record.
 * Failure here does not unwind a successful Opportunity update — it is
 * reported back to the caller as a non-fatal evidence-write failure.
 */
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
 * Performs exactly one gated, allowlisted Opportunity update for Milestone #6
 * controlled package-selection activation, then writes safe execution-log
 * evidence. Returns a safe result only — never the raw Dataverse response.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   entitySet: string,
 *   opportunityId: string,
 *   opportunityPayload: Record<string, string>,
 *   selectedPackageCode?: string,
 *   recommendedPackageCode?: string,
 *   alternatePackageCode?: string,
 *   correlationId?: string|null
 * }} input
 * @param {{ getToken?: (resourceUrl: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this — the real
 *   getDataverseToken (managed identity) is used by default.
 * @returns {Promise<object>}
 */
async function writeMilestone6OpportunityUpdate(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const entitySet = normalizeString(input.entitySet);
  const opportunityId = normalizeString(input.opportunityId);
  const correlationId = normalizeString(input.correlationId) || null;
  const selectedPackageCode = normalizeString(input.selectedPackageCode) || null;
  const recommendedPackageCode = normalizeString(input.recommendedPackageCode) || null;
  const alternatePackageCode = normalizeString(input.alternatePackageCode) || null;

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return blocked("DIAGNOSTIC_ID_INVALID");
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return blocked("INTAKE_REFERENCE_CODE_INVALID");
  }
  if (entitySet !== ALLOWED_ENTITY_SET) {
    return blocked("ENTITY_SET_NOT_ALLOWED", { entitySet: entitySet || null });
  }
  if (!opportunityId || !OPPORTUNITY_ID_PATTERN.test(opportunityId)) {
    return blocked("OPPORTUNITY_ID_INVALID");
  }

  const payloadValidation = validateOpportunityPayload(input.opportunityPayload);
  if (!payloadValidation.valid) {
    return blocked(payloadValidation.reason, {
      unknownFields: payloadValidation.unknownFields,
      invalidFields: payloadValidation.invalidFields
    });
  }

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", { gate: OPPORTUNITY_GATE_NAME });
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
  const executionLogPayload = buildMilestone6WriterExecutionLogPayload({
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    paymentOptionPreparationStatus: input.opportunityPayload.jm1_m6paymentoptionpreparationstatus || null,
    agreementPreparationStatus: input.opportunityPayload.jm1_m6agreementpreparationstatus || null,
    onboardingStatus: input.opportunityPayload.jm1_m6onboardingstatus || null,
    correlationId,
    completedAt
  });

  let executionLog;
  try {
    const result = await postExecutionLogRecord(apiBase, token, executionLogPayload);
    executionLog = { created: true, id: result.id, error: null };
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
    code: "MILESTONE_6_OPPORTUNITY_UPDATED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    opportunityRecordId: patchResult.dataverseRecordId,
    opportunityEtag: patchResult.etag,
    fieldsUpdated: Object.keys(input.opportunityPayload),
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    executionLog,
    gateUsed: OPPORTUNITY_GATE_NAME,
    liveActions: {
      updatedOpportunity: true,
      createdOpportunity: false,
      createdDuplicateOpportunity: false,
      sendsAuthorEmail: false,
      sendsInternalNotification: false,
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
      usesQboForNewLogic: false
    }
  };
}

/**
 * Builds the safe jm1_executionlogs payload for an evidence-only recovery
 * write. Used ONLY when an Opportunity PATCH already succeeded in a prior
 * attempt and the execution-log write failed that time — this records the
 * original success after the fact. Contains only safe metadata; no
 * Opportunity write occurs anywhere in this path.
 */
function buildMilestone6EvidenceRecoveryLogPayload(input) {
  const {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    correlationId,
    completedAt
  } = input;

  const actionDescription = [
    `Milestone 6 evidence-only recovery log for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} — no Opportunity write occurs in this recovery path; recorded here for evidence only.`,
    `Recommended package ${recommendedPackageCode || "unknown"}.`,
    alternatePackageCode ? `Alternate package ${alternatePackageCode}.` : "No alternate package.",
    `Selected package ${selectedPackageCode || "unknown"}.`,
    "Opportunity update result: SUCCEEDED.",
    `Evidence recovery reason: ${EVIDENCE_RECOVERY_REASON}.`,
    "Original activation attempt result: Opportunity PATCH succeeded, execution-log write failed.",
    `Gate final state: false (${OPPORTUNITY_GATE_NAME}).`,
    "Process: Milestone 6 Controlled Activation.",
    correlationId ? `Correlation ID: ${correlationId}.` : null,
    "No payment link, checkout session, invoice, customer, subscription, charge, contract, author email, " +
      "Flow D activation, production automation, ISBN assignment, distribution submission, launch/release, " +
      "royalty setup, QBO logic, manuscript text, prompt body, raw model output, secrets, tokens, or headers stored."
  ].filter(Boolean).join(" ");

  // jm1_flowrunid does NOT exist on jm1_executionlog (confirmed against live
  // entity metadata) — correlationId is folded into jm1_actiondescription
  // text above instead of sent as a separate field.
  return {
    jm1_name: `M6-EVIDENCE-RECOVERY-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: MILESTONE6_EVIDENCE_RECOVERY_EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MILESTONE6_EVIDENCE_RECOVERY_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * Writes exactly one safe jm1_executionlogs evidence record documenting a
 * Milestone #6 Opportunity update that already succeeded in a prior
 * attempt. This function NEVER calls patchDataverseRecord and NEVER
 * imports any Opportunity-write code path — it cannot touch the
 * Opportunity entity even if called incorrectly.
 *
 * Still requires JM1_OPPORTUNITY_UPDATE_ENABLED="true" (the same gate used
 * for the original activation) — reusing the existing, already-governed
 * gate rather than introducing a new one for a one-time recovery write.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   opportunityId: string,
 *   selectedPackageCode?: string,
 *   recommendedPackageCode?: string,
 *   alternatePackageCode?: string,
 *   correlationId?: string|null
 * }} input
 * @param {{ getToken?: (resourceUrl: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this.
 * @returns {Promise<object>}
 */
async function writeMilestone6EvidenceOnlyLog(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const correlationId = normalizeString(input.correlationId) || null;
  const selectedPackageCode = normalizeString(input.selectedPackageCode) || null;
  const recommendedPackageCode = normalizeString(input.recommendedPackageCode) || null;
  const alternatePackageCode = normalizeString(input.alternatePackageCode) || null;

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return blocked("DIAGNOSTIC_ID_INVALID");
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return blocked("INTAKE_REFERENCE_CODE_INVALID");
  }
  if (!opportunityId || !OPPORTUNITY_ID_PATTERN.test(opportunityId)) {
    return blocked("OPPORTUNITY_ID_INVALID");
  }

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", { gate: OPPORTUNITY_GATE_NAME });
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

  const completedAt = new Date().toISOString();
  const executionLogPayload = buildMilestone6EvidenceRecoveryLogPayload({
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    correlationId,
    completedAt
  });

  let executionLog;
  try {
    const result = await postExecutionLogRecord(apiBase, token, executionLogPayload);
    executionLog = { created: true, id: result.id, error: null };
  } catch (err) {
    executionLog = {
      created: false,
      id: null,
      error: err.safeCode || "DATAVERSE_WRITE_FAILED",
      diagnostics: classifyDataverseWriteError(err)
    };
  }

  return {
    ok: executionLog.created,
    code: executionLog.created ? "MILESTONE_6_EVIDENCE_RECOVERY_LOGGED" : "MILESTONE_6_EVIDENCE_RECOVERY_LOG_FAILED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode,
    recommendedPackageCode,
    alternatePackageCode,
    executionLog,
    gateUsed: OPPORTUNITY_GATE_NAME,
    liveActions: {
      updatedOpportunity: false,
      createdOpportunity: false,
      createdDuplicateOpportunity: false,
      sendsAuthorEmail: false,
      sendsInternalNotification: false,
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
      usesQboForNewLogic: false
    }
  };
}

module.exports = {
  writeMilestone6OpportunityUpdate,
  writeMilestone6EvidenceOnlyLog,
  validateOpportunityPayload,
  buildMilestone6WriterExecutionLogPayload,
  buildMilestone6EvidenceRecoveryLogPayload,
  classifyDataverseWriteError,
  OPPORTUNITY_GATE_NAME,
  ALLOWED_ENTITY_SET,
  ALLOWED_OPPORTUNITY_FIELDS,
  OPPORTUNITY_ID_PATTERN,
  EXECUTION_LOG_ENTITY_SET,
  EXECUTION_LOG_FIELDS_USED,
  EXECUTION_LOG_APPLICATION_REQUIRED_FIELDS,
  MILESTONE6_WRITER_EVENT_TYPE,
  MILESTONE6_EVIDENCE_RECOVERY_EVENT_TYPE,
  EVIDENCE_RECOVERY_REASON
};
