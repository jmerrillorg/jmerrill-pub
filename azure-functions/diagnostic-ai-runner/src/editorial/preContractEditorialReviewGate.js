"use strict";

/**
 * Pre-contract editorial review / imprint readiness gate.
 *
 * In the manual J Merrill Publishing process, editorial review happens
 * BEFORE contract: the review determines manuscript fit, confirms the
 * official (manuscript-derived) word count, recommends or locks the
 * imprint, and confirms package fit. Agreement/onboarding preparation
 * must not proceed until this review is complete and an imprint has
 * been recommended or locked — a missing imprint is an upstream
 * editorial-review output gap, not a contract-field-fill issue.
 *
 * This module is split into a pure evaluator (testable without any
 * Dataverse access) and a thin orchestrator that reads the existing
 * jm1pub_editorialdiagnostic review/imprint fields, evaluates them, and
 * writes one safe execution-log evidence record. It never reads or logs
 * manuscript text, raw AI output, or prompt content — only the existing
 * structured review/imprint/package fields already on the diagnostic
 * record.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const GATE_NAME = "JM1_EDITORIAL_REVIEW_GATE_CHECK_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_CHECKED";
const AGENT_MODEL_NAME = "pre-contract-editorial-review-gate";

// Confirmed against live Dataverse picklist metadata for
// jm1pub_editorialdiagnostic (EntityDefinitions query, 2026-06-21).
const DIAGNOSTIC_STATUS = Object.freeze({
  PENDING: 196650000,
  IN_PROGRESS: 196650001,
  COMPLETE: 196650002,
  AUTO_ROUTED: 196650003,
  AWAITING_JACKIE_REVIEW: 196650004,
  JACKIE_APPROVED: 196650005,
  JACKIE_REDIRECTED: 196650006,
  DECLINED: 196650007,
  HARD_STOP: 196650008
});

const JACKIE_DECISION = Object.freeze({
  APPROVED: 196650000,
  DECLINED: 196650001,
  REDIRECTED: 196650002
});

const HUMAN_DECISION = Object.freeze({
  ACCEPTED: 196650000,
  MODIFIED: 196650001,
  REJECTED: 196650002,
  ESCALATED: 196650003,
  DEFERRED: 196650004,
  NO_DECISION: 196650005
});

const RECOMMENDED_IMPRINT = Object.freeze({
  J_MERRILL_PUBLISHING: 835500000,
  JM_WORKS: 752590001,
  JM_LITTLE: 752590002,
  JM_VERSE: 752590003,
  JM_SIGNATURE: 752590004,
  JM_PRESTIGE: 752590005
});

const RECOMMENDED_IMPRINT_LABELS = Object.freeze({
  [RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING]: "J Merrill Publishing",
  [RECOMMENDED_IMPRINT.JM_WORKS]: "JM Works",
  [RECOMMENDED_IMPRINT.JM_LITTLE]: "JM Little",
  [RECOMMENDED_IMPRINT.JM_VERSE]: "JM Verse",
  [RECOMMENDED_IMPRINT.JM_SIGNATURE]: "JM Signature",
  [RECOMMENDED_IMPRINT.JM_PRESTIGE]: "JM Prestige"
});

// diagnosticStatus values that indicate the review itself has concluded
// with a positive outcome (not merely "in queue" or "awaiting review").
const EDITORIAL_REVIEW_COMPLETE_STATUSES = Object.freeze([
  DIAGNOSTIC_STATUS.COMPLETE,
  DIAGNOSTIC_STATUS.JACKIE_APPROVED
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_BLOCKED", reason, ...extra };
}

/**
 * Pure evaluator — no I/O, no Dataverse access, no manuscript content.
 * Takes already-read structured review/imprint/package fields and
 * determines whether agreement/onboarding preparation may proceed.
 *
 * @param {{
 *   diagnosticStatus: number|null,
 *   jackieDecision: number|null,
 *   humanDecision: number|null,
 *   editorialRecommendation: number|null,
 *   recommendedImprint: number|null,
 *   imprintLocked: boolean|null,
 *   imprintOverride: number|null,
 *   recommendedPackage: number|null,
 *   packageOverride: number|null
 * }} fields
 * @returns {{
 *   readyForAgreement: boolean,
 *   editorialReviewComplete: boolean,
 *   imprintReady: boolean,
 *   recommendedImprintLabel: string|null,
 *   blockingReasons: string[],
 *   routeBackTo: string|null
 * }}
 */
function evaluatePreContractEditorialReviewReadiness(fields = {}) {
  const f = isPlainObject(fields) ? fields : {};

  const editorialReviewComplete =
    EDITORIAL_REVIEW_COMPLETE_STATUSES.includes(f.diagnosticStatus) ||
    f.jackieDecision === JACKIE_DECISION.APPROVED ||
    (f.humanDecision != null && f.humanDecision !== HUMAN_DECISION.NO_DECISION &&
      f.humanDecision !== HUMAN_DECISION.REJECTED && f.humanDecision !== HUMAN_DECISION.DEFERRED);

  const imprintLocked = f.imprintLocked === true;
  const imprintRecommended = f.recommendedImprint != null && f.recommendedImprint in RECOMMENDED_IMPRINT_LABELS;
  const imprintOverridden = f.imprintOverride != null;
  const imprintReady = imprintLocked || imprintRecommended || imprintOverridden;

  const blockingReasons = [];
  if (!editorialReviewComplete) blockingReasons.push("EDITORIAL_REVIEW_NOT_COMPLETE");
  if (!imprintReady) blockingReasons.push("IMPRINT_NOT_RECOMMENDED_OR_LOCKED");

  const readyForAgreement = editorialReviewComplete && imprintReady;

  const recommendedImprintCode = imprintOverridden ? f.imprintOverride : f.recommendedImprint;
  const recommendedImprintLabel =
    recommendedImprintCode != null ? (RECOMMENDED_IMPRINT_LABELS[recommendedImprintCode] || null) : null;

  return {
    readyForAgreement,
    editorialReviewComplete,
    imprintReady,
    recommendedImprintLabel,
    blockingReasons,
    routeBackTo: readyForAgreement ? null : "EDITORIAL_REVIEW"
  };
}

/**
 * Builds the safe jm1_executionlogs payload recording a pre-contract
 * editorial review gate check. Never contains raw AI output, raw
 * manuscript text, or prompt content — only the structured readiness
 * result.
 */
function buildEditorialReviewGateExecutionLogPayload({
  diagnosticId,
  intakeReferenceCode,
  opportunityId,
  readiness,
  completedAt
}) {
  const actionDescription = [
    `Pre-contract editorial review gate checked for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId} — no Opportunity write occurs in this check; result recorded for evidence only.`,
    `Editorial review complete: ${readiness.editorialReviewComplete}.`,
    `Imprint ready: ${readiness.imprintReady}.`,
    readiness.recommendedImprintLabel ? `Recommended/locked imprint: ${readiness.recommendedImprintLabel}.` : "No imprint recommended or locked.",
    `Ready for agreement preparation: ${readiness.readyForAgreement}.`,
    readiness.readyForAgreement ? null : `Blocking reasons: ${readiness.blockingReasons.join(", ")}. Routed back to: ${readiness.routeBackTo}.`,
    "No raw AI output, raw manuscript text, prompt body, secrets, tokens, or headers stored.",
    "No contract generated, no author-facing send, no Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `PRE-CONTRACT-EDITORIAL-GATE-${diagnosticId}`,
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

async function getDataverseToken(resourceUrl) {
  const { DefaultAzureCredential } = require("@azure/identity");
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const DIAGNOSTIC_REVIEW_FIELD_SELECT = [
  "jm1pub_diagnosticstatus",
  "jm1pub_jackiedecision",
  "jm1pub_humandecision",
  "jm1pub_editorialrecommendation",
  "jm1pub_recommendedimprint",
  "jm1pub_imprintlocked",
  "jm1pub_imprintoverride",
  "jm1pub_recommendedpackage",
  "jm1pub_packageoverride"
].join(",");

/**
 * Reads the diagnostic record's existing review/imprint/package fields —
 * GET only, never the manuscript URL, never raw AI output fields.
 */
async function readEditorialReviewFields(apiBase, token, diagnosticId) {
  const url = `${apiBase.replace(/\/$/, "")}/${DIAGNOSTIC_ENTITY_SET}(${diagnosticId})?$select=${DIAGNOSTIC_REVIEW_FIELD_SELECT}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse read failed: HTTP ${response.status}`), {
      safeCode: "DATAVERSE_READ_FAILED",
      httpStatus: response.status
    });
  }

  const body = await response.json();
  return {
    diagnosticStatus: body.jm1pub_diagnosticstatus ?? null,
    jackieDecision: body.jm1pub_jackiedecision ?? null,
    humanDecision: body.jm1pub_humandecision ?? null,
    editorialRecommendation: body.jm1pub_editorialrecommendation ?? null,
    recommendedImprint: body.jm1pub_recommendedimprint ?? null,
    imprintLocked: body.jm1pub_imprintlocked === true,
    imprintOverride: body.jm1pub_imprintoverride ?? null,
    recommendedPackage: body.jm1pub_recommendedpackage ?? null,
    packageOverride: body.jm1pub_packageoverride ?? null
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
 * Checks pre-contract editorial review / imprint readiness for the given
 * controlled record, then writes one safe execution-log evidence record.
 * Never writes to the Opportunity or the Diagnostic record — read-only
 * against Dataverse except for the evidence log.
 *
 * Requires JM1_EDITORIAL_REVIEW_GATE_CHECK_ENABLED="true" for the live
 * check + evidence write, checked fresh on every call.
 *
 * @param {{ diagnosticId: string, intakeReferenceCode: string, opportunityId: string }} input
 * @param {{ getToken?: (resourceUrl: string) => Promise<string> }} [deps]
 *   Test-only injection seam. Production callers must omit this.
 * @returns {Promise<object>}
 */
async function checkPreContractEditorialReviewGate(input = {}, deps = {}) {
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
  if (!opportunityId) {
    return blocked("OPPORTUNITY_ID_MISSING");
  }

  if (!isGateOpen()) {
    return blocked("GATE_CLOSED", { gate: GATE_NAME });
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

  let fields;
  try {
    fields = await readEditorialReviewFields(apiBase, token, diagnosticId);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_READ_FAILED", { httpStatus: err.httpStatus || null });
  }

  const readiness = evaluatePreContractEditorialReviewReadiness(fields);

  const completedAt = new Date().toISOString();
  const executionLogPayload = buildEditorialReviewGateExecutionLogPayload({
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    readiness,
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
    code: readiness.readyForAgreement ? "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_PASSED" : "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_BLOCKED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    readyForAgreement: readiness.readyForAgreement,
    editorialReviewComplete: readiness.editorialReviewComplete,
    imprintReady: readiness.imprintReady,
    recommendedImprintLabel: readiness.recommendedImprintLabel,
    blockingReasons: readiness.blockingReasons,
    routeBackTo: readiness.routeBackTo,
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      readDiagnosticRecord: true,
      mutatedDiagnosticRecord: false,
      updatedOpportunity: false,
      generatedAgreement: false,
      sentAuthorFacingOutput: false,
      createsPaymentLink: false,
      startsProduction: false,
      activatesFlowD: false
    }
  };
}

module.exports = {
  checkPreContractEditorialReviewGate,
  evaluatePreContractEditorialReviewReadiness,
  buildEditorialReviewGateExecutionLogPayload,
  GATE_NAME,
  DIAGNOSTIC_STATUS,
  JACKIE_DECISION,
  HUMAN_DECISION,
  RECOMMENDED_IMPRINT,
  RECOMMENDED_IMPRINT_LABELS,
  EDITORIAL_REVIEW_COMPLETE_STATUSES,
  EVENT_TYPE
};
