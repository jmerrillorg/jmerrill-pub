"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const {
  CONTROLLED_EXECUTION_TYPE,
  CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV,
  CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV
} = require("../controlled/executionAuthorization");
const { trackDependency } = require("../observability/dependencyTelemetry");

const DEFAULT_PROMPT_KEY = "jm1-prompt-pub-stage0-diagnostic";
const DEFAULT_PROMPT_VERSION = "PUB-STAGE0-DIAGNOSTIC-V1";
const STAGE0_CANONICAL_PRIMARY_MODEL_DEPLOYMENT_ALIAS = "jm1-editorial-devline-primary";
const STAGE0_APPROVED_FALLBACK_MODEL_DEPLOYMENT_ALIAS = "jm1-pub-diagnostic-primary";
const DEFAULT_MODEL_DEPLOYMENT_ALIAS = STAGE0_CANONICAL_PRIMARY_MODEL_DEPLOYMENT_ALIAS;
const ENTITY_SET = "jm1pub_aiprompttemplates";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isEnvTrue(name) {
  return process.env[name] === "true";
}

function normalizeStage0ModelDeploymentAlias(value) {
  const alias = normalizeString(value) || DEFAULT_MODEL_DEPLOYMENT_ALIAS;
  if (alias.toLowerCase() === STAGE0_APPROVED_FALLBACK_MODEL_DEPLOYMENT_ALIAS.toLowerCase()) {
    return STAGE0_CANONICAL_PRIMARY_MODEL_DEPLOYMENT_ALIAS;
  }
  return alias;
}

function getStage0ModelDeploymentAliasNormalization(rawAlias) {
  const normalizedAlias = normalizeStage0ModelDeploymentAlias(rawAlias);
  const originalAlias = normalizeString(rawAlias) || null;
  return {
    originalAlias,
    normalizedAlias,
    normalized: Boolean(originalAlias && originalAlias !== normalizedAlias),
    normalizationReason:
      originalAlias && originalAlias !== normalizedAlias
        ? "STAGE0_PROMPT_TEMPLATE_REFERENCED_APPROVED_FALLBACK_ALIAS"
        : null
  };
}

function buildFallbackPromptResolution(executionType) {
  const fallbackAllowed = isEnvTrue(CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV);
  const aliasNormalization = getStage0ModelDeploymentAliasNormalization(
    process.env.JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS ||
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
    DEFAULT_MODEL_DEPLOYMENT_ALIAS
  );

  return {
    ok: fallbackAllowed,
    source: "env-fallback",
    promptRecordId: null,
    promptKey: process.env.JM1_PROMPT_KEY || DEFAULT_PROMPT_KEY,
    promptName: process.env.JM1_PROMPT_NAME || "Stage 0 Editorial Diagnostic",
    promptVersion: process.env.JM1_PROMPT_VERSION || DEFAULT_PROMPT_VERSION,
    promptModelDeploymentAlias: aliasNormalization.originalAlias,
    modelDeploymentAlias: aliasNormalization.normalizedAlias,
    modelDeploymentAliasNormalized: aliasNormalization.normalized,
    modelDeploymentAliasNormalizationReason: aliasNormalization.normalizationReason,
    active: false,
    effectiveState:
      executionType === CONTROLLED_EXECUTION_TYPE
        ? "controlled-fallback"
        : "inactive-fallback",
    error: fallbackAllowed ? null : "PROMPT_TEMPLATE_NOT_GOVERNED"
  };
}

function buildPromptResolutionError({ promptKey, promptVersion, row, effectiveState, error }) {
  const aliasNormalization = getStage0ModelDeploymentAliasNormalization(row?.jm1pub_modeldeploymentalias);
  return {
    ok: false,
    source: "dataverse",
    promptRecordId: row?.jm1pub_aiprompttemplateid || null,
    promptKey: normalizeString(row?.jm1pub_promptkey) || promptKey,
    promptName: normalizeString(row?.jm1pub_promptname) || "Stage 0 Editorial Diagnostic",
    promptVersion: normalizeString(row?.jm1pub_promptversion) || promptVersion,
    promptModelDeploymentAlias: aliasNormalization.originalAlias,
    modelDeploymentAlias: aliasNormalization.normalizedAlias,
    modelDeploymentAliasNormalized: aliasNormalization.normalized,
    modelDeploymentAliasNormalizationReason: aliasNormalization.normalizationReason,
    active: false,
    effectiveState,
    error
  };
}

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

async function fetchPromptTemplateRows({ promptKey, promptVersion, telemetry = null }) {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL);

  if (!apiBase || !resourceUrl) {
    return { ok: false, error: "DATAVERSE_CONFIG_MISSING" };
  }

  const token = await getDataverseToken(resourceUrl);
  const filterParts = [`jm1pub_promptkey eq '${promptKey.replace(/'/g, "''")}'`];
  if (promptVersion) {
    filterParts.push(`jm1pub_promptversion eq '${promptVersion.replace(/'/g, "''")}'`);
  }

  const url =
    `${apiBase.replace(/\/$/, "")}/${ENTITY_SET}` +
    `?$select=jm1pub_aiprompttemplateid,jm1pub_promptkey,jm1pub_promptname,jm1pub_promptversion,jm1pub_modeldeploymentalias,jm1pub_active,statecode` +
    `&$filter=${encodeURIComponent(filterParts.join(" and "))}`;

  const response = await trackDependency(
    telemetry,
    {
      name: "Dataverse Prompt Template Read",
      target: resourceUrl,
      data: `${ENTITY_SET}:GET`,
      dependencyTypeName: "Dataverse",
      properties: {
        promptKey,
        promptVersion: promptVersion || null
      },
      isSuccess: (result) => result.ok,
      getResultCode: (result) => String(result.status)
    },
    () => fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json"
      }
    })
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: body?.error?.code || "PROMPT_TEMPLATE_READ_FAILED"
    };
  }

  return {
    ok: true,
    rows: Array.isArray(body.value) ? body.value : []
  };
}

function choosePromptTemplateRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const activeRow = rows.find((row) => row.jm1pub_active === true && row.statecode === 0);
  return activeRow || rows[0];
}

async function resolveGovernedPromptTemplate({ executionType, telemetry = null }) {
  const promptKey = process.env.JM1_PROMPT_KEY || DEFAULT_PROMPT_KEY;
  const promptVersion = process.env.JM1_PROMPT_VERSION || DEFAULT_PROMPT_VERSION;

  let rowsResult;
  try {
    rowsResult = await fetchPromptTemplateRows({ promptKey, promptVersion, telemetry });
  } catch (error) {
    rowsResult = { ok: false, error: error.safeCode || "PROMPT_TEMPLATE_READ_FAILED" };
  }

  if (!rowsResult.ok) {
    if (isEnvTrue(CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV)) {
      return buildFallbackPromptResolution(executionType);
    }

    return buildPromptResolutionError({
      promptKey,
      promptVersion,
      row: null,
      effectiveState: "read-failed",
      error: rowsResult.error || "PROMPT_TEMPLATE_READ_FAILED"
    });
  }

  const row = choosePromptTemplateRow(rowsResult.rows);

  if (!row) {
    if (isEnvTrue(CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV)) {
      return buildFallbackPromptResolution(executionType);
    }

    return buildPromptResolutionError({
      promptKey,
      promptVersion,
      row: null,
      effectiveState: "missing",
      error: "PROMPT_TEMPLATE_NOT_FOUND"
    });
  }

  const active = row.jm1pub_active === true && row.statecode === 0;
  const inactiveAllowed =
    executionType === CONTROLLED_EXECUTION_TYPE &&
    isEnvTrue(CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV);

  if (!active && !inactiveAllowed) {
    return buildPromptResolutionError({
      promptKey,
      promptVersion,
      row,
      effectiveState: "inactive",
      error: "PROMPT_TEMPLATE_INACTIVE"
    });
  }

  const aliasNormalization = getStage0ModelDeploymentAliasNormalization(row.jm1pub_modeldeploymentalias);

  return {
    ok: true,
    source: "dataverse",
    promptRecordId: row.jm1pub_aiprompttemplateid || null,
    promptKey: normalizeString(row.jm1pub_promptkey) || promptKey,
    promptName: normalizeString(row.jm1pub_promptname) || "Stage 0 Editorial Diagnostic",
    promptVersion: normalizeString(row.jm1pub_promptversion) || promptVersion,
    promptModelDeploymentAlias: aliasNormalization.originalAlias,
    modelDeploymentAlias: aliasNormalization.normalizedAlias,
    modelDeploymentAliasNormalized: aliasNormalization.normalized,
    modelDeploymentAliasNormalizationReason: aliasNormalization.normalizationReason,
    active,
    effectiveState: active ? "active" : "controlled-inactive-allowed",
    error: null
  };
}

module.exports = {
  DEFAULT_MODEL_DEPLOYMENT_ALIAS,
  DEFAULT_PROMPT_KEY,
  DEFAULT_PROMPT_VERSION,
  STAGE0_APPROVED_FALLBACK_MODEL_DEPLOYMENT_ALIAS,
  STAGE0_CANONICAL_PRIMARY_MODEL_DEPLOYMENT_ALIAS,
  buildFallbackPromptResolution,
  choosePromptTemplateRow,
  fetchPromptTemplateRows,
  getStage0ModelDeploymentAliasNormalization,
  normalizeStage0ModelDeploymentAlias,
  resolveGovernedPromptTemplate
};
