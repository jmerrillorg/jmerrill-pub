"use strict";

/**
 * Writes safe metadata-only records to jm1_airequestlog and jm1_executionlog.
 *
 * PROHIBITED fields — never set:
 *   jm1_requestpayload   — prompt body text
 *   jm1_responsepayload  — AI model output
 *   jm1_airecommendation — AI model recommendation
 *   Any field containing manuscript text, extracted text, secrets,
 *   runner keys, headers, cookies, access tokens, or PII beyond
 *   reference IDs required for correlation.
 *
 * Required env vars:
 *   DATAVERSE_WEB_API_BASE_URL — e.g. https://jm1hq.crm.dynamics.com/api/data/v9.2/
 *   DATAVERSE_RESOURCE_URL     — e.g. https://jm1hq.crm.dynamics.com
 */

const { DefaultAzureCredential } = require("@azure/identity");
const { trackDependency } = require("../observability/dependencyTelemetry");

// Dataverse picklist constants — match Dataverse option set values exactly
const MODEL_PROVIDER = { AZURE_OPENAI: 835500000 };
const REQUEST_STATUS = { COMPLETED: 835500002, FAILED: 835500003 };
const SOURCE_BRAND = { JM_PUBLISHING: 835500001 };
const REQUEST_TYPE = { DIAGNOSTIC: 835500000 };
const EXECUTION_STATUS = { SUCCESS: 835500001, FAILED: 835500002 };
const BAND_LEVEL = { BAND_1: 835500000 };

const AGENT_NAME = "jm1-diagnostic-ai-runner";
const AGENT_VERSION = "1.0.0";
const SOURCE_ENTITY = "jm1pub_editorialdiagnostic";
const SOURCE_SYSTEM = "jm1-diagnostic-ai-runner";

/**
 * @typedef {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   correlationId: string|null,
 *   executionMode: string,
 *   modelDeploymentAlias: string,
 *   promptKey: string,
 *   promptVersion: string,
 *   confidence: number|null,
 *   requiresHumanReview: boolean,
 *   tokenCounts: {input: number, output: number, total: number}|null,
 *   requestTimestamp: string,
 *   responseTimestamp: string,
 *   errorCode: string|null,
 *   errorMessage: string|null
 * }} MetadataWriteInput
 */

/**
 * Builds the safe payload for jm1_airequestlog.
 * PROHIBITED fields are intentionally absent — see module header.
 *
 * @param {MetadataWriteInput} input
 * @returns {object}
 */
function buildAiRequestLogPayload(input) {
  const tokens = input.tokenCounts || { input: 0, output: 0, total: 0 };
  const failed = Boolean(input.errorCode);

  const payload = {
    jm1_name: `DIAG-${input.diagnosticId}-${input.executionMode}`,
    jm1_agentname: AGENT_NAME,
    jm1_agentversion: AGENT_VERSION,
    jm1_airequestid: input.correlationId || input.diagnosticId,
    jm1_modeldeployment: input.modelDeploymentAlias,
    jm1_modelprovider: MODEL_PROVIDER.AZURE_OPENAI,
    jm1_promptname: input.promptKey,
    jm1_promptversion: input.promptVersion,
    jm1_requeststatus: failed ? REQUEST_STATUS.FAILED : REQUEST_STATUS.COMPLETED,
    jm1_requesttimestamp: input.requestTimestamp,
    jm1_responsetimestamp: input.responseTimestamp,
    jm1_requesttype: REQUEST_TYPE.DIAGNOSTIC,
    jm1_sourcebrand: SOURCE_BRAND.JM_PUBLISHING,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: input.diagnosticId,
    jm1_sourcesystem: SOURCE_SYSTEM,
    jm1_humanreviewrequired: input.requiresHumanReview !== false,
    jm1_actualinputtokens: typeof tokens.input === "number" ? tokens.input : 0,
    jm1_actualoutputtokens: typeof tokens.output === "number" ? tokens.output : 0,
    jm1_flowrunid: input.correlationId || null,
    jm1_contentdisclosurerequired: false,
    // jm1_requestpayload: NOT SET — prompt body text prohibited
    // jm1_responsepayload: NOT SET — AI model output prohibited
    // jm1_airecommendation: NOT SET — AI model output prohibited
  };

  if (typeof input.confidence === "number") {
    payload.jm1_confidence = input.confidence;
  }

  if (failed && input.errorMessage) {
    // errorMessage must not contain manuscript text, prompt text, or secrets.
    // Caller is responsible for sanitizing before passing.
    payload.jm1_errordetail = input.errorMessage.slice(0, 1000);
  }

  return payload;
}

/**
 * Builds the safe payload for jm1_executionlog.
 *
 * @param {MetadataWriteInput} input
 * @param {string|null} aiRequestLogId — ID of the corresponding airequestlog record if already created
 * @returns {object}
 */
function buildExecutionLogPayload(input, aiRequestLogId) {
  const failed = Boolean(input.errorCode);

  const payload = {
    jm1_name: `EXEC-${input.diagnosticId}-${input.executionMode}`,
    jm1_actiondescription: `Stage 0 Diagnostic Runner — ${input.executionMode} execution for intake ${input.intakeReferenceCode}. No manuscript text stored. No prompt body stored.`,
    jm1_actiontype: "Stage0DiagnosticRun",
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: input.modelDeploymentAlias,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: input.requestTimestamp,
    jm1_completedon: input.responseTimestamp,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: input.diagnosticId,
  };

  if (failed && input.errorMessage) {
    payload.jm1_errordetail = input.errorMessage.slice(0, 1000);
  }

  return payload;
}

/**
 * Acquires a Dataverse access token via managed identity.
 *
 * @param {string} resourceUrl
 * @returns {Promise<string>}
 */
async function getDataverseToken(resourceUrl) {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), {
      safeCode: "DATAVERSE_TOKEN_FAILED"
    });
  }
  return tokenResponse.token;
}

/**
 * POSTs a record to a Dataverse entity set and returns the created record ID.
 *
 * @param {string} apiBase — e.g. https://org.crm.dynamics.com/api/data/v9.2/
 * @param {string} token
 * @param {string} entitySet
 * @param {object} payload
 * @returns {Promise<{id: string, etag: string}>}
 */
async function postDataverseRecord(apiBase, token, entitySet, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${entitySet}`;
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
    throw Object.assign(new Error(`Dataverse POST failed (${entitySet}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }

  // ID field names differ by entity
  const id = body.jm1_airequestlogid || body.jm1_executionlogid || null;
  const etag = body["@odata.etag"] || null;
  return { id, etag };
}

/**
 * Writes safe metadata to jm1_airequestlog and jm1_executionlog.
 *
 * @param {MetadataWriteInput} input
 * @returns {Promise<{
 *   aiRequestLog: {created: boolean, id: string|null, error: string|null},
 *   executionLog: {created: boolean, id: string|null, error: string|null}
 * }>}
 */
async function writeMetadata(input, options = {}) {
  const telemetry = options.telemetry || null;
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;

  if (!apiBase || !resourceUrl) {
    return {
      aiRequestLog: { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING" },
      executionLog: { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING" }
    };
  }

  let token;
  try {
    token = await getDataverseToken(resourceUrl);
  } catch (err) {
    const code = err.safeCode || "DATAVERSE_AUTH_FAILED";
    return {
      aiRequestLog: { created: false, id: null, error: code },
      executionLog: { created: false, id: null, error: code }
    };
  }

  // Write executionlog first so we have its ID before airequestlog (future cross-link)
  let executionLogResult = { created: false, id: null, error: null };
  try {
    const execPayload = buildExecutionLogPayload(input, null);
    const result = await trackDependency(
      telemetry,
      {
        name: "Dataverse Execution Log Write",
        target: resourceUrl,
        data: "jm1_executionlogs:POST",
        dependencyTypeName: "Dataverse",
        properties: {
          entitySet: "jm1_executionlogs",
          executionMode: input.executionMode
        },
        isSuccess: () => true,
        getResultCode: () => "201"
      },
      () => postDataverseRecord(apiBase, token, "jm1_executionlogs", execPayload)
    );
    executionLogResult = { created: true, id: result.id, error: null };
  } catch (err) {
    executionLogResult = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED" };
  }

  // Write airequestlog
  let aiRequestLogResult = { created: false, id: null, error: null };
  try {
    const aiPayload = buildAiRequestLogPayload(input);
    const result = await trackDependency(
      telemetry,
      {
        name: "Dataverse AI Request Log Write",
        target: resourceUrl,
        data: "jm1_airequestlogs:POST",
        dependencyTypeName: "Dataverse",
        properties: {
          entitySet: "jm1_airequestlogs",
          executionMode: input.executionMode
        },
        isSuccess: () => true,
        getResultCode: () => "201"
      },
      () => postDataverseRecord(apiBase, token, "jm1_airequestlogs", aiPayload)
    );
    aiRequestLogResult = { created: true, id: result.id, error: null };
  } catch (err) {
    aiRequestLogResult = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED" };
  }

  return {
    aiRequestLog: aiRequestLogResult,
    executionLog: executionLogResult
  };
}

module.exports = {
  writeMetadata,
  buildAiRequestLogPayload,
  buildExecutionLogPayload,
  MODEL_PROVIDER,
  REQUEST_STATUS,
  SOURCE_BRAND,
  REQUEST_TYPE,
  EXECUTION_STATUS,
  BAND_LEVEL,
  AGENT_NAME,
  SOURCE_ENTITY,
};
