"use strict";

const crypto = require("node:crypto");
const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
const { nextStageCode } = require("./editorialAuthorGatePolicy");

const EXECUTION_STATUS = { SUCCESS: 835500001, FAILED: 835500002 };
const BAND_LEVEL_1 = 835500000;

const AUTHOR_DECISION_APPROVE = 196650000;
const GATE_STATUS_APPROVED = 196650003;

const STAGE_STATUS = {
  IN_PROGRESS: 100000001,
  COMPLETE: 100000008
};

const STAGE_TYPES = {
  EDITORIAL_REVIEW: 100000000,
  DEVELOPMENTAL_EDITING: 100000001,
  LINE_EDITING: 100000002,
  COPYEDITING: 100000003,
  PROOFREADING: 100000004
};

const STAGE_SEQUENCES = {
  EDITORIAL_REVIEW: 1,
  DEVELOPMENTAL_EDITING: 2,
  LINE_EDITING: 3,
  COPYEDITING: 4,
  PROOFREADING: 5
};

const MATERIALIZATION_MODES = Object.freeze({
  DRY_RUN: "DRY_RUN",
  EXECUTE: "EXECUTE"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConfiguredSecret(value) {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (/^\(.*\)$/.test(normalized)) return "";
  if (normalized.toLowerCase().includes("set-before-use")) return "";
  return normalized;
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
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
  const clientId = normalizeConfiguredSecret(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeConfiguredSecret(process.env.DATAVERSE_CLIENT_SECRET);
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
      prefer: "odata.maxpagesize=50"
    });
    return Array.isArray(body.value) ? body.value : [];
  }

  async function create(entitySet, payload) {
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || headers.get("location") || "");
  }

  return { list, create };
}

function stageCodeForTypeOrName(row) {
  const type = Number(row?.jm1pub_stagetype);
  const name = normalizeString(row?.jm1pub_name).toLowerCase();
  if (type === STAGE_TYPES.DEVELOPMENTAL_EDITING || name.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (type === STAGE_TYPES.LINE_EDITING || name.includes("line editing")) return "LINE_EDITING";
  if (type === STAGE_TYPES.COPYEDITING || name.includes("copyedit")) return "COPYEDITING";
  if (type === STAGE_TYPES.PROOFREADING || name.includes("proofread")) return "PROOFREADING";
  return "EDITORIAL_REVIEW";
}

function materializationIdempotencyKey(input) {
  return crypto
    .createHash("sha256")
    .update([
      "EDITORIAL_NEXT_STAGE_MATERIALIZATION_V1",
      normalizeString(input.titleId),
      normalizeString(input.completedStageCode),
      normalizeString(input.completedStageId || input.currentStageId),
      normalizeString(input.approvedArtifactId),
      normalizeString(input.approvedArtifactChecksum),
      normalizeString(input.approvalGateId),
      normalizeString(input.targetStageCode)
    ].join(":"))
    .digest("hex");
}

function blocked(input, code, detail, extra = {}) {
  return {
    ok: false,
    status: "BLOCKED",
    code,
    detail,
    executionMode: normalizeString(input.executionMode),
    titleId: normalizeString(input.titleId),
    completedStageCode: normalizeString(input.completedStageCode),
    targetStageCode: normalizeString(input.targetStageCode),
    approvedArtifactId: normalizeString(input.approvedArtifactId),
    ...extra
  };
}

function normalizeInput(input = {}) {
  return {
    ...input,
    executionMode: normalizeString(input.executionMode || MATERIALIZATION_MODES.DRY_RUN).toUpperCase(),
    titleId: normalizeString(input.titleId),
    projectId: normalizeString(input.projectId),
    completedStageId: normalizeString(input.completedStageId || input.currentStageId || input.stageId),
    completedStageCode: normalizeString(input.completedStageCode || input.currentStageCode).toUpperCase(),
    approvedArtifactId: normalizeString(input.approvedArtifactId),
    approvedArtifactChecksum: normalizeString(input.approvedArtifactChecksum).toLowerCase(),
    approvalGateId: normalizeString(input.approvalGateId || input.gateId),
    approvalDecisionId: normalizeString(input.approvalDecisionId || input.authorResponseId || input.eventId),
    targetStageCode: normalizeString(input.targetStageCode).toUpperCase(),
    expectedCurrentState: normalizeString(input.expectedCurrentState).toUpperCase()
  };
}

function validateInput(input) {
  if (normalizeString(input.bulkSelector || input.portfolioSelector || input.query)) {
    return blocked(input, "BULK_SELECTOR_NOT_ALLOWED", "Next-stage materialization accepts one explicit title/source/target request only.");
  }
  if (!input.titleId) return blocked(input, "TITLE_ID_REQUIRED", "titleId is required.");
  if (!input.completedStageCode || !STAGE_TYPES[input.completedStageCode]) {
    return blocked(input, "COMPLETED_STAGE_CODE_REQUIRED", "completedStageCode must resolve to a canonical editorial stage.");
  }
  if (!input.completedStageId) return blocked(input, "COMPLETED_STAGE_ID_REQUIRED", "completedStageId/currentStageId is required.");
  if (!input.approvedArtifactId) return blocked(input, "APPROVED_ARTIFACT_ID_REQUIRED", "approvedArtifactId is required.");
  if (!input.approvedArtifactChecksum) return blocked(input, "APPROVED_ARTIFACT_CHECKSUM_REQUIRED", "approvedArtifactChecksum is required.");
  if (!input.approvalGateId) return blocked(input, "APPROVAL_GATE_ID_REQUIRED", "approvalGateId is required.");
  if (!input.targetStageCode || !STAGE_TYPES[input.targetStageCode]) {
    return blocked(input, "TARGET_STAGE_CODE_REQUIRED", "targetStageCode must resolve to a canonical editorial stage.");
  }
  if (!Object.values(MATERIALIZATION_MODES).includes(input.executionMode)) {
    return blocked(input, "EXECUTION_MODE_REQUIRED", "executionMode must be DRY_RUN or EXECUTE.");
  }
  const expectedTarget = nextStageCode(input.completedStageCode);
  if (expectedTarget !== input.targetStageCode) {
    return blocked(input, "TARGET_STAGE_SEQUENCE_MISMATCH", "Requested target stage does not match the canonical next-stage sequence.", {
      expectedTarget
    });
  }
  if (input.expectedCurrentState && input.expectedCurrentState !== `${input.completedStageCode}_COMPLETE`) {
    return blocked(input, "EXPECTED_CURRENT_STATE_MISMATCH", "expectedCurrentState must match the completed stage code.");
  }
  return null;
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc",
    $top: "1"
  }).catch(() => []);
  return rows[0] || null;
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Editorial Next Stage Materializer",
    jm1_agentmodel: "jm1-editorial-next-stage-materialization",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function findRows(client, entitySet, query) {
  return client.list(entitySet, query).catch(() => []);
}

async function evaluateEditorialNextStageMaterialization(input = {}, deps = {}) {
  const normalized = normalizeInput(input);
  const invalid = validateInput(normalized);
  if (invalid) return invalid;

  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const idempotencyKey = materializationIdempotencyKey(normalized);
  const completedStageType = STAGE_TYPES[normalized.completedStageCode];
  const targetStageType = STAGE_TYPES[normalized.targetStageCode];

  const [titles, completedStages, artifacts, approvalGates, targetStages] = await Promise.all([
    findRows(client, "jm1pub_titles", {
      $select: "jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname",
      $filter: `jm1pub_titleid eq ${normalized.titleId}`,
      $top: "2"
    }),
    findRows(client, "jm1pub_editorialstages", {
      $select:
        "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagesequence,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,_jm1pub_contactid_value,modifiedon",
      $filter:
        `jm1pub_editorialstageid eq ${normalized.completedStageId} and _jm1pub_titleid_value eq ${normalized.titleId} and jm1pub_stagetype eq ${completedStageType}`,
      $top: "2"
    }),
    findRows(client, "jm1pub_editorialartifacts", {
      $select:
        "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_iscurrentapproved,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
      $filter: `jm1pub_editorialartifactid eq ${normalized.approvedArtifactId} and _jm1pub_titleid_value eq ${normalized.titleId}`,
      $top: "2"
    }),
    findRows(client, "jm1pub_editorialapprovalgates", {
      $select:
        "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value",
      $filter:
        `jm1pub_editorialapprovalgateid eq ${normalized.approvalGateId} and _jm1pub_titleid_value eq ${normalized.titleId} and _jm1pub_editorialstageid_value eq ${normalized.completedStageId}`,
      $top: "2"
    }),
    findRows(client, "jm1pub_editorialstages", {
      $select:
        "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
      $filter: `_jm1pub_titleid_value eq ${normalized.titleId} and jm1pub_stagetype eq ${targetStageType}`,
      $orderby: "modifiedon desc",
      $top: "5"
    })
  ]);

  if (titles.length === 0) return blocked(normalized, "TITLE_NOT_FOUND", "No title resolves to the supplied titleId.", { idempotencyKey });
  if (titles.length > 1) return blocked(normalized, "TITLE_NOT_UNIQUE", "More than one title resolved for the supplied titleId.", { idempotencyKey });
  if (completedStages.length === 0) return blocked(normalized, "COMPLETED_STAGE_NOT_FOUND", "No completed source stage resolves to the supplied title/stage.", { idempotencyKey });
  if (completedStages.length > 1) return blocked(normalized, "COMPLETED_STAGE_NOT_UNIQUE", "More than one completed source stage resolved.", { idempotencyKey });
  if (artifacts.length === 0) return blocked(normalized, "APPROVED_ARTIFACT_NOT_FOUND", "No approved artifact resolves to the supplied title/artifact.", { idempotencyKey });
  if (artifacts.length > 1) return blocked(normalized, "APPROVED_ARTIFACT_NOT_UNIQUE", "More than one approved artifact resolved.", { idempotencyKey });
  if (approvalGates.length === 0) return blocked(normalized, "APPROVAL_GATE_NOT_FOUND", "No approval gate resolves to the supplied title/stage/gate.", { idempotencyKey });
  if (approvalGates.length > 1) return blocked(normalized, "APPROVAL_GATE_NOT_UNIQUE", "More than one approval gate resolved.", { idempotencyKey });

  const title = titles[0];
  const completedStage = completedStages[0];
  const artifact = artifacts[0];
  const gate = approvalGates[0];
  if (stageCodeForTypeOrName(completedStage) !== normalized.completedStageCode) {
    return blocked(normalized, "COMPLETED_STAGE_CODE_MISMATCH", "Resolved source stage does not match completedStageCode.", { idempotencyKey });
  }
  if (Number(completedStage.jm1pub_stagestatus) !== STAGE_STATUS.COMPLETE) {
    return blocked(normalized, "COMPLETED_STAGE_NOT_COMPLETE", "Source stage must be COMPLETE before next-stage materialization.", {
      idempotencyKey,
      stageStatus: completedStage.jm1pub_stagestatus
    });
  }
  if (normalizeString(artifact.jm1pub_sha256).toLowerCase() !== normalized.approvedArtifactChecksum) {
    return blocked(normalized, "APPROVED_ARTIFACT_CHECKSUM_MISMATCH", "Approved artifact checksum does not match the supplied checksum.", {
      idempotencyKey,
      actualChecksum: normalizeString(artifact.jm1pub_sha256)
    });
  }
  if (!normalizeString(artifact.jm1pub_repositoryitemid || artifact.jm1pub_repositorypath)) {
    return blocked(normalized, "APPROVED_ARTIFACT_FILE_REFERENCE_MISSING", "Approved artifact must have a governed repository file reference.", { idempotencyKey });
  }
  if (Number(gate.jm1pub_gatestatus) !== GATE_STATUS_APPROVED) {
    return blocked(normalized, "APPROVAL_GATE_NOT_APPROVED", "Approval gate must be approved.", { idempotencyKey });
  }
  if (Number(gate.jm1pub_authordecision) !== AUTHOR_DECISION_APPROVE || !normalizeString(gate.jm1pub_authordecisionon)) {
    return blocked(normalized, "AUTHOR_FULL_APPROVAL_REQUIRED", "Approval gate must contain a final author approval decision timestamp.", { idempotencyKey });
  }
  if (gate.jm1pub_nextstageauthorized !== true) {
    return blocked(normalized, "NEXT_STAGE_NOT_AUTHORIZED", "Approval gate must authorize the next stage.", { idempotencyKey });
  }
  if (normalizeString(gate._jm1pub_deliverableartifactid_value) !== normalized.approvedArtifactId) {
    return blocked(normalized, "APPROVAL_GATE_BINDS_DIFFERENT_ARTIFACT", "Approval gate does not bind to the supplied approved artifact.", {
      idempotencyKey,
      boundArtifactId: normalizeString(gate._jm1pub_deliverableartifactid_value)
    });
  }

  const matchingTargetStages = targetStages.filter((row) => stageCodeForTypeOrName(row) === normalized.targetStageCode);
  if (matchingTargetStages.length > 1) {
    return blocked(normalized, "DUPLICATE_TARGET_STAGE_EXISTS", "More than one target stage already exists for the title.", {
      idempotencyKey,
      resolvedCount: matchingTargetStages.length
    });
  }
  if (matchingTargetStages.length === 1) {
    const existing = matchingTargetStages[0];
    const summary = normalizeString(existing.jm1pub_internaloperationalsummary);
    if (summary.includes(idempotencyKey)) {
      return {
        ok: true,
        status: "IDEMPOTENT",
        executionMode: normalized.executionMode,
        idempotencyKey,
        targetStage: {
          stageId: existing.jm1pub_editorialstageid,
          stageCode: normalized.targetStageCode,
          stageStatus: existing.jm1pub_stagestatus
        },
        mutationsPerformed: 0,
        externalSends: 0
      };
    }
    return blocked(normalized, "TARGET_STAGE_ALREADY_EXISTS", "A target stage already exists without this materialization provenance.", {
      idempotencyKey,
      existingStageId: existing.jm1pub_editorialstageid
    });
  }

  return {
    ok: true,
    status: normalized.executionMode === MATERIALIZATION_MODES.DRY_RUN ? "DRY_RUN_READY" : "MATERIALIZATION_READY",
    executionMode: normalized.executionMode,
    idempotencyKey,
    canonicalTitle: {
      titleId: title.jm1pub_titleid,
      title: normalizeString(title.jm1pub_titlename || title.jm1pub_name),
      author: normalizeString(title.jm1pub_authorname)
    },
    sourceStage: {
      stageId: completedStage.jm1pub_editorialstageid,
      stageCode: normalized.completedStageCode,
      stageStatus: completedStage.jm1pub_stagestatus
    },
    approvedArtifact: {
      artifactId: artifact.jm1pub_editorialartifactid,
      name: artifact.jm1pub_editorialartifactname,
      filename: artifact.jm1pub_filename,
      sha256: artifact.jm1pub_sha256
    },
    approvalGate: {
      gateId: gate.jm1pub_editorialapprovalgateid,
      decisionOn: gate.jm1pub_authordecisionon,
      nextStageAuthorized: gate.jm1pub_nextstageauthorized === true
    },
    targetStageCode: normalized.targetStageCode,
    expectedMutations: ["create one target editorial stage row", "write one materialization execution log"],
    completedStage,
    artifact,
    gate
  };
}

async function runEditorialNextStageMaterialization(input = {}, deps = {}) {
  const evaluated = await evaluateEditorialNextStageMaterialization(input, deps);
  if (!evaluated.ok) return evaluated;
  if (evaluated.status === "IDEMPOTENT") return evaluated;
  if (evaluated.executionMode === MATERIALIZATION_MODES.DRY_RUN) {
    const { completedStage, artifact, gate, ...safe } = evaluated;
    return { ...safe, mutationsPerformed: 0, externalSends: 0 };
  }

  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const stageName = `${evaluated.targetStageCode === "LINE_EDITING" ? "Line Editing" : evaluated.targetStageCode} - ${evaluated.canonicalTitle.title || evaluated.canonicalTitle.titleId}`;
  const payload = {
    jm1pub_name: stageName,
    jm1pub_projecttitle: evaluated.canonicalTitle.title,
    jm1pub_author: evaluated.canonicalTitle.author,
    jm1pub_stagetype: STAGE_TYPES[evaluated.targetStageCode],
    jm1pub_stagestatus: STAGE_STATUS.IN_PROGRESS,
    jm1pub_stagesequence: STAGE_SEQUENCES[evaluated.targetStageCode],
    jm1pub_authorsafesummary:
      "Your manuscript has completed the prior editorial review step. The publishing team is preparing the next editorial stage internally.",
    jm1pub_internaloperationalsummary:
      `${evaluated.targetStageCode} materialized from ${evaluated.sourceStage.stageCode} author-approved artifact ${evaluated.approvedArtifact.artifactId}; checksum ${evaluated.approvedArtifact.sha256}; gate ${evaluated.approvalGate.gateId}. Idempotency ${evaluated.idempotencyKey}.`,
    jm1pub_correlationid: `NEXT-STAGE-${evaluated.idempotencyKey}`.slice(0, 100),
    jm1pub_stagestartdate: new Date().toISOString(),
    jm1pub_currentartifactcount: 0,
    jm1pub_currentgatecount: 0,
    jm1pub_openexceptioncount: 0,
    "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${evaluated.canonicalTitle.titleId})`
  };
  if (normalizeString(evaluated.completedStage._jm1pub_publishingassetid_value)) {
    payload["Jm1pub_Publishingassetid@odata.bind"] = `/jm1pub_publishingassets(${evaluated.completedStage._jm1pub_publishingassetid_value})`;
  }
  if (normalizeString(evaluated.completedStage._jm1pub_contactid_value)) {
    payload["Jm1pub_Contactid@odata.bind"] = `/contacts(${evaluated.completedStage._jm1pub_contactid_value})`;
  }
  const targetStageId = await client.create("jm1pub_editorialstages", payload);
  const logId = await writeLog(client, {
    actionType: "EDITORIAL_NEXT_STAGE_MATERIALIZED",
    name: `EDITORIAL_NEXT_STAGE_MATERIALIZED - ${evaluated.canonicalTitle.title || evaluated.canonicalTitle.titleId}`,
    description:
      `${evaluated.targetStageCode} stage ${targetStageId} materialized from ${evaluated.sourceStage.stageCode} stage ${evaluated.sourceStage.stageId}. ` +
      `Approved artifact ${evaluated.approvedArtifact.artifactId}; checksum ${evaluated.approvedArtifact.sha256}; gate ${evaluated.approvalGate.gateId}. ` +
      `No author communication sent. No downstream stage authorized. Idempotency ${evaluated.idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: targetStageId
  });
  return {
    ok: true,
    status: "MATERIALIZED",
    executionMode: MATERIALIZATION_MODES.EXECUTE,
    idempotencyKey: evaluated.idempotencyKey,
    canonicalTitle: evaluated.canonicalTitle,
    sourceStage: evaluated.sourceStage,
    approvedArtifact: evaluated.approvedArtifact,
    approvalGate: evaluated.approvalGate,
    targetStage: {
      stageId: targetStageId,
      stageCode: evaluated.targetStageCode,
      stageStatus: STAGE_STATUS.IN_PROGRESS
    },
    executionLogId: logId,
    mutationsPerformed: 2,
    externalSends: 0
  };
}

function inputFromApprovalEvent(event = {}, executionMode = MATERIALIZATION_MODES.EXECUTE) {
  return {
    executionMode,
    titleId: event.titleId,
    completedStageId: event.currentStageId || event.stageId,
    completedStageCode: event.currentStageCode,
    approvedArtifactId: event.approvedArtifactId,
    approvedArtifactChecksum: event.approvedArtifactChecksum,
    approvalGateId: event.gateId,
    approvalDecisionId: event.authorResponseId || event.eventId,
    targetStageCode: nextStageCode(event.currentStageCode),
    expectedCurrentState: `${event.currentStageCode}_COMPLETE`
  };
}

async function materializeNextStageFromApprovalEvent(client, event, deps = {}) {
  const input = inputFromApprovalEvent(event, deps.executionMode || MATERIALIZATION_MODES.EXECUTE);
  return runEditorialNextStageMaterialization(input, { ...deps, client });
}

module.exports = {
  MATERIALIZATION_MODES,
  STAGE_STATUS,
  STAGE_TYPES,
  createDataverseClient,
  evaluateEditorialNextStageMaterialization,
  inputFromApprovalEvent,
  materializationIdempotencyKey,
  materializeNextStageFromApprovalEvent,
  runEditorialNextStageMaterialization
};
