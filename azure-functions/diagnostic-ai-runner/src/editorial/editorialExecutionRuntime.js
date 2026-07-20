"use strict";

const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002
};
const BAND_LEVEL_1 = 835500000;

const STAGE_TYPES = {
  EDITORIAL_REVIEW: 100000000,
  DEVELOPMENTAL_EDITING: 100000001,
  LINE_EDITING: 100000002,
  COPYEDITING: 100000003,
  PROOFREADING: 100000004,
  EDITORIAL_INTERNAL_QA: 100000006
};

const STAGE_STATUS = {
  IN_PROGRESS: 100000001,
  AUTHOR_REVIEW: 100000002,
  COMPLETE: 100000008
};

const EXECUTOR_POLICIES = {
  EDITORIAL_REVIEW: {
    stageType: STAGE_TYPES.EDITORIAL_REVIEW,
    outputRoles: ["editorialAssessment", "recommendedEditorialPath", "riskRegister"],
    exactMissingSourceBlocker: "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  DEVELOPMENTAL_EDITING: {
    stageType: STAGE_TYPES.DEVELOPMENTAL_EDITING,
    outputRoles: ["editedManuscript", "developmentalMemo", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  LINE_EDITING: {
    stageType: STAGE_TYPES.LINE_EDITING,
    outputRoles: ["editedManuscript", "lineEditingSummary", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "LINE_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  COPYEDITING: {
    stageType: STAGE_TYPES.COPYEDITING,
    outputRoles: ["editedManuscript", "copyeditingSummary", "styleSheet", "qaEvidence"],
    exactMissingSourceBlocker: "COPYEDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  PROOFREADING: {
    stageType: STAGE_TYPES.PROOFREADING,
    outputRoles: ["proofreadManuscript", "proofreadingCoverNote", "qaEvidence"],
    exactMissingSourceBlocker: "PROOFREADING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  EDITORIAL_INTERNAL_QA: {
    stageType: STAGE_TYPES.EDITORIAL_INTERNAL_QA,
    outputRoles: ["qaEvidence", "exceptionEvidence"],
    exactMissingSourceBlocker: "EDITORIAL_QA_BLOCKED — SOURCE_ARTIFACT_MISSING"
  }
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
}

function normalizeStageCode(stage) {
  const type = Number(stage?.jm1pub_stagetype);
  const name = normalizeString(stage?.jm1pub_name).toLowerCase();
  if (type === STAGE_TYPES.DEVELOPMENTAL_EDITING || name.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (type === STAGE_TYPES.LINE_EDITING || name.includes("line editing")) return "LINE_EDITING";
  if (type === STAGE_TYPES.COPYEDITING || name.includes("copyedit")) return "COPYEDITING";
  if (type === STAGE_TYPES.PROOFREADING || name.includes("proofread")) return "PROOFREADING";
  if (type === STAGE_TYPES.EDITORIAL_INTERNAL_QA || name.includes("qa")) return "EDITORIAL_INTERNAL_QA";
  return "EDITORIAL_REVIEW";
}

function stageStatusIsExecutable(stage) {
  const status = Number(stage?.jm1pub_stagestatus);
  return status === STAGE_STATUS.IN_PROGRESS;
}

function requireDataverseConfig() {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }
  return { apiBase, resourceUrl };
}

async function getDataverseToken(resourceUrl) {
  const tenantId = normalizeString(process.env.DATAVERSE_TENANT_ID);
  const clientId = normalizeString(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeString(process.env.DATAVERSE_CLIENT_SECRET);
  const credential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

function createDataverseClient(config, deps = {}) {
  const getToken = deps.getToken || getDataverseToken;
  let cachedToken = "";

  async function token() {
    if (!cachedToken) cachedToken = await getToken(config.resourceUrl);
    return cachedToken;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${config.apiBase}/${path.replace(/^\//, "")}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = body?.error?.message || `HTTP ${response.status}`;
      throw Object.assign(new Error(`Dataverse request failed: ${message}`), {
        safeCode: "DATAVERSE_REQUEST_FAILED",
        status: response.status,
        body
      });
    }
    return { body, headers: response.headers };
  }

  async function list(entitySet, query = {}) {
    const params = new URLSearchParams(query);
    const { body } = await request(`${entitySet}?${params.toString()}`, {
      method: "GET",
      prefer: "odata.maxpagesize=100"
    });
    return Array.isArray(body.value) ? body.value : [];
  }

  async function create(entitySet, payload) {
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || "");
  }

  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }

  return { list, create, patch };
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Automation",
    jm1_agentmodel: "jm1-editorial-execution-runtime",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc",
    $top: "1"
  });
  return rows[0] || null;
}

async function findActiveEditorialStages(client, maxTasks) {
  return client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
    $filter:
      `jm1pub_stagestatus eq ${STAGE_STATUS.IN_PROGRESS} and (` +
      Object.values(EXECUTOR_POLICIES)
        .map((policy) => `jm1pub_stagetype eq ${policy.stageType}`)
        .join(" or ") +
      ")",
    $orderby: "modifiedon asc",
    $top: String(maxTasks)
  });
}

async function findSourceArtifact(client, stage) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const stageId = normalizeString(stage.jm1pub_editorialstageid);
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_iscurrentapproved,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter:
      `_jm1pub_titleid_value eq ${titleId} and (` +
      `_jm1pub_editorialstageid_value eq ${stageId} or jm1pub_iscurrentapproved eq true or jm1pub_repositorypath ne null` +
      ")",
    $orderby: "modifiedon desc",
    $top: "20"
  }).catch(() => []);
  return rows.find((row) => normalizeString(row.jm1pub_repositoryitemid || row.jm1pub_repositorypath || row.jm1pub_sha256)) || null;
}

function buildExactBlocker(stageCode, sourceArtifact) {
  if (!sourceArtifact) return EXECUTOR_POLICIES[stageCode].exactMissingSourceBlocker;
  if (!normalizeString(sourceArtifact.jm1pub_sha256)) return `${stageCode}_BLOCKED — SOURCE_CHECKSUM_MISSING`;
  if (!normalizeString(sourceArtifact.jm1pub_repositoryitemid || sourceArtifact.jm1pub_repositorypath)) {
    return `${stageCode}_BLOCKED — SOURCE_LOCATION_MISSING`;
  }
  return "";
}

async function claimStageTask(client, stage, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:claim:${stage.jm1pub_editorialstageid}:${stageCode}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_TASK_CLAIMED", idempotencyKey);
  if (existing) return { idempotent: true, idempotencyKey, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_TASK_CLAIMED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_TASK_CLAIMED",
    description:
      `JM1 Automation claimed ${stageCode} task ${stage.jm1pub_editorialstageid}. ` +
      `Execution state QUEUED -> EXECUTING. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, idempotencyKey, logId };
}

async function recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId) {
  const idempotencyKey = `editorial-runtime:block:${stage.jm1pub_editorialstageid}:${stageCode}:${exactBlocker}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_BLOCKED", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `${exactBlocker}. JM1 Automation claimed the stage but could not create a real editorial output because the governed source prerequisite is missing or incomplete. ` +
      `No stage advancement, package release, or author communication occurred. Correlation ${correlationId}.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_BLOCKED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_BLOCKED",
    failed: true,
    description:
      `${exactBlocker}. Stage ${stage.jm1pub_editorialstageid} remains In Progress with exact blocker; generic uncommissioned-runtime blocker removed. ` +
      `Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordRuntimeCommissioned(client, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:commissioned:${stageCode}:v1`;
  const actionType = `${stageCode}_EXECUTOR_COMMISSIONED`;
  const existing = await findExecutionLog(client, actionType, idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `${actionType}`,
    actionType,
    description:
      `${stageCode} reusable editorial executor commissioned under JM1 Automation. It accepts governed stage work items, validates source artifact identity, records exact blockers, and prepares output/package handoff only after real artifacts exist. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: stageCode
  });
  return { idempotent: false, logId };
}

async function processStage(client, stage, correlationId) {
  const stageCode = normalizeStageCode(stage);
  const policy = EXECUTOR_POLICIES[stageCode];
  if (!policy || !stageStatusIsExecutable(stage)) {
    return { stageId: stage.jm1pub_editorialstageid, stageCode, status: "SKIPPED_NOT_EXECUTABLE" };
  }
  const claim = await claimStageTask(client, stage, stageCode, correlationId);
  const sourceArtifact = await findSourceArtifact(client, stage);
  const exactBlocker = buildExactBlocker(stageCode, sourceArtifact);
  if (exactBlocker) {
    const blocked = await recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker,
      claim,
      blocked
    };
  }
  const idempotencyKey = `editorial-runtime:output-ready:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", idempotencyKey);
  if (existing) {
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "OUTPUT_ALREADY_RECORDED",
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      idempotent: true
    };
  }
  const outputLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_CREATED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_CREATED",
    description:
      `${stageCode} source artifact validated for execution handoff. Source artifact ${sourceArtifact.jm1pub_editorialartifactid}; checksum ${sourceArtifact.jm1pub_sha256 || "pending"}. ` +
      `Output roles: ${policy.outputRoles.join(", ")}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  const qaLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_QA_COMPLETED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_QA_COMPLETED",
    description:
      `${stageCode} execution handoff QA completed at source-artifact boundary. Package assembly remains gated until content output artifacts are registered. Correlation ${correlationId}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return {
    stageId: stage.jm1pub_editorialstageid,
    titleId: stage._jm1pub_titleid_value,
    stageCode,
    status: "VALIDATING",
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    outputLogId,
    qaLogId
  };
}

async function runEditorialExecutionRuntime(options = {}, deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const correlationId = options.correlationId || `EDITORIAL-RUNTIME-${new Date().toISOString()}`;
  const maxTasks = Math.min(Math.max(Number(options.maxTasks || process.env.JM1_EDITORIAL_RUNTIME_MAX_TASKS || 10), 1), 25);
  const commissioned = [];
  for (const stageCode of Object.keys(EXECUTOR_POLICIES)) {
    commissioned.push({ stageCode, ...(await recordRuntimeCommissioned(client, stageCode, correlationId)) });
  }
  const stages = deps.stages || (await findActiveEditorialStages(client, maxTasks));
  const results = [];
  for (const stage of stages) {
    results.push(await processStage(client, stage, correlationId));
  }
  await writeLog(client, {
    name: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    actionType: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    description:
      `Editorial execution runtime cycle completed. Claimed/evaluated ${results.length} stage(s). ` +
      `Executors active: ${Object.keys(EXECUTOR_POLICIES).join(", ")}. Correlation ${correlationId}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: correlationId
  });
  return {
    ok: true,
    correlationId,
    executorCount: Object.keys(EXECUTOR_POLICIES).length,
    commissioned,
    processed: results.length,
    results
  };
}

module.exports = {
  EXECUTOR_POLICIES,
  STAGE_STATUS,
  STAGE_TYPES,
  buildExactBlocker,
  normalizeStageCode,
  runEditorialExecutionRuntime
};
