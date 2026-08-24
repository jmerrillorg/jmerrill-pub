"use strict";

/**
 * Governed manual signature handoff.
 *
 * J Merrill Publishing does not require a paid e-sign provider for the
 * current agreement workflow. This module records the two manual states:
 * a validated agreement package is ready for Jackie to send, and Jackie
 * later records that the package was sent manually. It never sends email,
 * never creates a provider envelope, and never verifies signatures.
 */

const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS } = require("../dataverse/metadataWriter");

const GATE_NAME = "JM1_MANUAL_SIGNATURE_HANDOFF_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const OPPORTUNITY_ENTITY_SET = "opportunities";
const READY_EVENT_TYPE = "AGREEMENT_READY_FOR_MANUAL_SIGNATURE_SEND";
const SENT_EVENT_TYPE = "AGREEMENT_SENT_MANUALLY";
const READY_FOR_MANUAL_SIGNATURE_SEND = "READY_FOR_MANUAL_SIGNATURE_SEND";
const AGREEMENT_SENT_MANUALLY = "AGREEMENT_SENT_MANUALLY";
const WAITING_ON_JMP = "WAITING_ON_JMP";
const WAITING_ON_AUTHOR = "WAITING_ON_AUTHOR";
const MODEL_NAME = "manual-signature-handoff";
const OPPORTUNITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  return { ok: false, code: "MANUAL_SIGNATURE_HANDOFF_BLOCKED", reason, ...extra };
}

function apiBase() {
  return normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
}

function resourceUrl() {
  return normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
}

function encodeODataString(value) {
  return normalizeString(value).replace(/'/g, "''");
}

async function dataverseRequest(api, token, path, options = {}) {
  const response = await fetch(`${api}/${path.replace(/^\//, "")}`, {
    method: options.method || "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse request failed: ${response.status}`), {
      safeCode: "DATAVERSE_REQUEST_FAILED",
      httpStatus: response.status,
      dvCode: body?.error?.code || null,
      dvMessage: typeof body?.error?.message === "string"
        ? body.error.message.replace(/\s+/g, " ").slice(0, 500)
        : null,
      step: options.step || null
    });
  }
  return { body, entityId: normalizeString(response.headers?.get?.("OData-EntityId")) || null };
}

function validateCommonInput(input) {
  const errors = [];
  const opportunityId = normalizeString(input.opportunityId);
  if (!opportunityId || !OPPORTUNITY_ID_PATTERN.test(opportunityId)) errors.push("OPPORTUNITY_ID_INVALID");
  if (!normalizeString(input.intakeReferenceCode)) errors.push("INTAKE_REFERENCE_REQUIRED");
  if (!normalizeString(input.authorName)) errors.push("AUTHOR_NAME_REQUIRED");
  if (!normalizeString(input.authorEmail)) errors.push("AUTHOR_EMAIL_REQUIRED");
  if (!normalizeString(input.title)) errors.push("TITLE_REQUIRED");
  if (!normalizeString(input.documentLocation)) errors.push("DOCUMENT_LOCATION_REQUIRED");
  return errors;
}

function validateArtifacts(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) return ["AGREEMENT_ARTIFACTS_REQUIRED"];
  return artifacts.flatMap((artifact, index) => {
    const errors = [];
    if (!isPlainObject(artifact)) return [`ARTIFACT_${index}_INVALID`];
    if (!normalizeString(artifact.name)) errors.push(`ARTIFACT_${index}_NAME_REQUIRED`);
    if (!normalizeString(artifact.sha256)) errors.push(`ARTIFACT_${index}_SHA256_REQUIRED`);
    if (!normalizeString(artifact.location)) errors.push(`ARTIFACT_${index}_LOCATION_REQUIRED`);
    return errors;
  });
}

function buildManualSignatureLogPayload({ input, actionType, status, waitingOn, completedAt }) {
  const artifactSummary = (input.artifacts || [])
    .map((artifact) => `${normalizeString(artifact.name)}:${normalizeString(artifact.sha256).slice(0, 12)}`)
    .join(", ");
  const description = [
    `${actionType} for Opportunity ${input.opportunityId}.`,
    `Intake ${input.intakeReferenceCode}; author ${input.authorName}; title ${input.title}.`,
    `Document location: ${input.documentLocation}.`,
    artifactSummary ? `Artifacts: ${artifactSummary}.` : null,
    `Agreement status ${status}; Waiting On ${waitingOn}.`,
    "Manual signature policy: Jackie sends the validated package outside automation, then records the send.",
    "No automatic author email, Adobe Sign call, SignNow call, provider envelope, Stripe charge, Business Central posting, or production action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `${actionType}-${normalizeString(input.opportunityId)}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: actionType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: OPPORTUNITY_ENTITY_SET,
    jm1_sourcerecordid: normalizeString(input.opportunityId)
  };
}

async function resolveDataverse(deps) {
  const api = deps.apiBase || apiBase();
  const resource = deps.resourceUrl || resourceUrl();
  if (!api || !resource) return { ok: false, result: blocked("DATAVERSE_CONFIG_MISSING") };
  try {
    const token = deps.getToken ? await deps.getToken(resource) : await getDataverseToken(resource);
    return { ok: true, api, token };
  } catch (err) {
    return { ok: false, result: blocked(err.safeCode || "DATAVERSE_AUTH_FAILED") };
  }
}

async function findExistingEvent(api, token, opportunityId, actionType) {
  const filter = encodeURIComponent([
    `jm1_sourcerecordid eq '${encodeODataString(opportunityId)}'`,
    `jm1_actiontype eq '${actionType}'`
  ].join(" and "));
  return (await dataverseRequest(
    api,
    token,
    `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,createdon&$filter=${filter}&$orderby=createdon desc&$top=1`
  )).body?.value?.[0] || null;
}

async function writeState({ input, deps, actionType, status, waitingOn, patchStep }) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  if (input.confirmManualSignatureHandoff !== true) return blocked("CONFIRMATION_REQUIRED");
  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const errors = [...validateCommonInput(input), ...validateArtifacts(input.artifacts)];
  if (errors.length > 0) return blocked("INPUT_VALIDATION_FAILED", { errors });

  const resolved = await resolveDataverse(deps);
  if (!resolved.ok) return resolved.result;
  const { api, token } = resolved;
  const opportunityId = normalizeString(input.opportunityId);

  try {
    const existing = await findExistingEvent(api, token, opportunityId, actionType);
    const completedAt = normalizeString(existing?.createdon) || new Date().toISOString();
    let executionLogId = normalizeString(existing?.jm1_executionlogid) || null;

    if (!existing) {
      const log = await dataverseRequest(api, token, EXECUTION_LOG_ENTITY_SET, {
        method: "POST",
        step: `${patchStep}:log`,
        headers: { Prefer: "return=representation" },
        body: buildManualSignatureLogPayload({ input, actionType, status, waitingOn, completedAt })
      });
      executionLogId = normalizeString(log.body.jm1_executionlogid) || null;
    }

    await dataverseRequest(api, token, `${OPPORTUNITY_ENTITY_SET}(${opportunityId})`, {
      method: "PATCH",
      step: patchStep,
      body: {
        jm1_m6agreementpreparationstatus: status
      }
    });

    return {
      ok: true,
      code: actionType,
      opportunityId,
      status,
      waitingOn,
      idempotentReplay: Boolean(existing),
      executionLogId,
      documentLocation: normalizeString(input.documentLocation),
      artifacts: input.artifacts.map((artifact) => ({
        name: normalizeString(artifact.name),
        location: normalizeString(artifact.location),
        sha256: normalizeString(artifact.sha256)
      })),
      communication: {
        from: "publishing@email.jmerrill.one",
        replyTo: "publishing@jmerrill.one",
        cc: "publishing@jmerrill.one",
        htmlRequired: true,
        automaticSend: false
      },
      liveActions: {
        updatedOpportunity: true,
        createdExecutionLog: !existing,
        sentAuthorFacingOutput: false,
        invokedAdobeSign: false,
        invokedSignNow: false,
        createdProviderEnvelope: false,
        chargedCard: false,
        postedBusinessCentral: false,
        startedProduction: false
      },
      gateUsed: GATE_NAME
    };
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_OPERATION_FAILED", {
      httpStatus: err.httpStatus || null,
      dvCode: err.dvCode || null,
      dvMessage: err.dvMessage || null,
      step: err.step || null
    });
  }
}

function markAgreementReadyForManualSignatureSend(input = {}, deps = {}) {
  return writeState({
    input,
    deps,
    actionType: READY_EVENT_TYPE,
    status: READY_FOR_MANUAL_SIGNATURE_SEND,
    waitingOn: WAITING_ON_JMP,
    patchStep: "opportunity:manual-signature-ready"
  });
}

function recordAgreementSentManually(input = {}, deps = {}) {
  return writeState({
    input,
    deps,
    actionType: SENT_EVENT_TYPE,
    status: AGREEMENT_SENT_MANUALLY,
    waitingOn: WAITING_ON_AUTHOR,
    patchStep: "opportunity:agreement-sent-manually"
  });
}

module.exports = {
  markAgreementReadyForManualSignatureSend,
  recordAgreementSentManually,
  buildManualSignatureLogPayload,
  GATE_NAME,
  READY_EVENT_TYPE,
  SENT_EVENT_TYPE,
  READY_FOR_MANUAL_SIGNATURE_SEND,
  AGREEMENT_SENT_MANUALLY,
  WAITING_ON_JMP,
  WAITING_ON_AUTHOR
};
