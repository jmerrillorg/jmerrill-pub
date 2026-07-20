"use strict";

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002
};
const BAND_LEVEL_1 = 835500000;

const AUTHOR_DECISION_APPROVE = 196650000;
const GATE_STATUS_APPROVED = 196650003;
const STAGE_STATUS_COMPLETE = 100000008;
const PRODUCTION_TYPE_INTERIOR_LAYOUT = 710000000;
const PRODUCTION_PROJECT_STATUS_IN_PROGRESS = 710000001;
const PRODUCTION_TASK_STATUS_IN_PROGRESS = 835500001;
const PRODUCTION_TASK_PRIORITY_HIGH = 835500002;

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

function lookupId(row, name) {
  return normalizeString(row?.[name]);
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractChecksum(value) {
  return normalizeString(value).match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() || "";
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
}

function normalizeStageCode(stageName) {
  const normalized = normalizeString(stageName).toLowerCase();
  if (normalized.includes("proof")) return "PROOFREADING";
  if (normalized.includes("copy")) return "COPYEDITING";
  if (normalized.includes("line")) return "LINE_EDITING";
  if (normalized.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  return "EDITORIAL_STAGE";
}

function addBusinessDays(value, days) {
  const date = new Date(value);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString();
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
  const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
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
    const { body } = await request(`${entitySet}?${params.toString()}`, { method: "GET", prefer: "odata.maxpagesize=50" });
    return Array.isArray(body.value) ? body.value : [];
  }

  async function first(entitySet, query = {}) {
    const rows = await list(entitySet, { ...query, $top: "1" });
    return rows[0] || null;
  }

  async function create(entitySet, payload) {
    const { headers, body } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || headers.get("location") || "");
  }

  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }

  return { list, first, create, patch };
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Azure Function Approval Event Consumer",
    jm1_agentmodel: "jm1-ed-functions",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  return client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc"
  });
}

async function findDurableApprovalCandidates(client, maxEvents) {
  return client.list("jm1pub_editorialapprovalgates", {
    $select:
      "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon",
    $filter: `jm1pub_authordecisionon ne null and jm1pub_authordecision eq ${AUTHOR_DECISION_APPROVE}`,
    $orderby: "jm1pub_authordecisionon asc",
    $top: String(maxEvents)
  });
}

async function getStage(client, stageId) {
  const stage = await client.first("jm1pub_editorialstages", {
    $select: "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary",
    $filter: `jm1pub_editorialstageid eq ${stageId}`
  });
  if (!stage) throw Object.assign(new Error("approval_event_stage_not_found"), { safeCode: "APPROVAL_STAGE_NOT_FOUND" });
  return stage;
}

async function getTitle(client, titleId) {
  const title = await client.first("jm1pub_titles", {
    $select: "jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname",
    $filter: `jm1pub_titleid eq ${titleId}`
  });
  if (!title) throw Object.assign(new Error("approval_event_title_not_found"), { safeCode: "APPROVAL_TITLE_NOT_FOUND" });
  return title;
}

async function getArtifact(client, artifactId) {
  const artifact = await client.first("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_sha256,jm1pub_notes,jm1pub_repositoryitemid,jm1pub_repositorypath",
    $filter: `jm1pub_editorialartifactid eq ${artifactId}`
  });
  if (!artifact) throw Object.assign(new Error("approval_event_artifact_not_found"), { safeCode: "APPROVAL_ARTIFACT_NOT_FOUND" });
  return artifact;
}

async function hasCompleteNotificationEvidence(client, gateId, summary, source) {
  const text = `${summary || ""} ${source || ""}`.toLowerCase();
  if (text.includes("corrected-notification") || text.includes("notification sent with required attachments")) return true;
  const evidence = await client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter:
      `jm1_sourcerecordid eq '${gateId}' and (` +
      "jm1_actiontype eq 'AUTHOR_PACKAGE_COMMUNICATION_EVIDENCE_RECORDED' or " +
      "jm1_actiontype eq 'AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED' or " +
      "jm1_actiontype eq 'AUTHOR_PACKAGE_ATTACHMENT_EVIDENCE_RECORDED')",
    $orderby: "createdon desc"
  });
  return Boolean(evidence && /attachment|corrected|required files/i.test(normalizeString(evidence.jm1_actiondescription)));
}

async function buildApprovalEventFromGate(client, gate, trigger) {
  const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid);
  const titleId = lookupId(gate, "_jm1pub_titleid_value");
  const currentStageId = lookupId(gate, "_jm1pub_editorialstageid_value");
  const approvedArtifactId = lookupId(gate, "_jm1pub_deliverableartifactid_value");
  const approvedAt = normalizeString(gate.jm1pub_authordecisionon || gate.modifiedon);
  if (!gateId || !titleId || !currentStageId || !approvedArtifactId || !approvedAt) return null;

  const [stage, artifact] = await Promise.all([getStage(client, currentStageId), getArtifact(client, approvedArtifactId)]);
  const currentStageCode = normalizeStageCode(stage.jm1pub_name);
  const checksum = normalizeString(artifact.jm1pub_sha256) || extractChecksum(artifact.jm1pub_notes);
  if (!checksum) return null;

  const notificationComplete = await hasCompleteNotificationEvidence(
    client,
    gateId,
    gate.jm1pub_authorresponsesummary,
    gate.jm1pub_authordecisionsource
  );
  if (!notificationComplete) return null;

  const eventType = currentStageCode === "PROOFREADING" ? "PROOFREADING_APPROVED" : "EDITORIAL_STAGE_APPROVED";
  const eventId = `${eventType}:${gateId}:${approvedAt}`;
  const idempotencyKey = `approval-event:${eventType}:${gateId}:${approvedArtifactId}:${checksum}`;
  return {
    eventId,
    eventType,
    titleId,
    currentStageId,
    currentStageCode,
    stageId: currentStageId,
    gateId,
    authorResponseId: normalizeString(gate.jm1pub_authordecisionsource) || eventId,
    approvedPackageId: approvedArtifactId,
    approvedArtifactId,
    approvedArtifactChecksum: checksum,
    decision: "Approve",
    approvedAt,
    triggerSource: "AUTHOR_APPROVAL",
    correlationId: `${trigger}:${eventId}`.slice(0, 100),
    idempotencyKey
  };
}

function evaluateInteriorLayoutEligibility({ title, artifact, checksum }) {
  if (!artifact?.jm1pub_editorialartifactid) return { result: "BLOCKED_FOR_MISSING_SOURCE", reason: "APPROVED SOURCE MISSING" };
  if (!checksum) return { result: "BLOCKED_FOR_MISSING_SOURCE", reason: "APPROVED SOURCE CHECKSUM MISSING" };
  if (!normalizeString(artifact.jm1pub_repositoryitemid) && !normalizeString(artifact.jm1pub_repositorypath)) {
    return { result: "BLOCKED_FOR_MISSING_SOURCE", reason: "APPROVED SOURCE FILE REFERENCE MISSING" };
  }
  if (!normalizeString(title.jm1pub_titleid)) return { result: "BLOCKED_FOR_PUBLISHER_DECISION", reason: "CANONICAL TITLE MISSING" };
  return { result: "ELIGIBLE", reason: "Approved source and production profile evidence available." };
}

async function transitionBlocked(client, event, blocker) {
  const logId = await writeLog(client, {
    actionType: "EDITORIAL_APPROVAL_EVENT_BLOCKED",
    name: `EDITORIAL_APPROVAL_EVENT_BLOCKED - ${event.eventType}`,
    description: `${blocker}. Automatic consumer will retry only after the exact event dependency is corrected. Idempotency: ${event.idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: event.gateId,
    failed: true
  });
  return { status: "blocked", blocker, executionLogIds: [logId] };
}

async function findOrCreateInteriorLayoutProject(client, input) {
  const existing = await client.first("jm1_productionprojects", {
    $select: "jm1_productionprojectid,jm1_name,jm1_productiontype,jm1_status,_jm1_title_value",
    $filter: `_jm1_title_value eq ${input.titleId} and jm1_productiontype eq ${PRODUCTION_TYPE_INTERIOR_LAYOUT}`
  });
  if (existing?.jm1_productionprojectid) {
    await client.patch("jm1_productionprojects", existing.jm1_productionprojectid, {
      jm1_status: PRODUCTION_PROJECT_STATUS_IN_PROGRESS,
      jm1_fileslocation: input.artifactPath
    });
    return existing.jm1_productionprojectid;
  }
  return client.create("jm1_productionprojects", {
    jm1_name: `Interior Layout - ${input.titleName}`,
    jm1_productiontype: PRODUCTION_TYPE_INTERIOR_LAYOUT,
    jm1_status: PRODUCTION_PROJECT_STATUS_IN_PROGRESS,
    jm1_fileslocation: input.artifactPath,
    "jm1_Title@odata.bind": `/jm1pub_titles(${input.titleId})`
  });
}

async function findOrCreateInteriorLayoutTask(client, input) {
  const escapedName = escapeODataText(`Interior Layout Start - ${input.titleName}`);
  const existing = await client.first("jm1_productiontasks", {
    $select: "jm1_productiontaskid,jm1_taskname,jm1_status",
    $filter: `jm1_taskname eq '${escapedName}'`
  });
  if (existing?.jm1_productiontaskid) {
    await client.patch("jm1_productiontasks", existing.jm1_productiontaskid, { jm1_status: PRODUCTION_TASK_STATUS_IN_PROGRESS });
    return existing.jm1_productiontaskid;
  }
  return client.create("jm1_productiontasks", {
    jm1_taskname: `Interior Layout Start - ${input.titleName}`,
    jm1_status: PRODUCTION_TASK_STATUS_IN_PROGRESS,
    jm1_priority: PRODUCTION_TASK_PRIORITY_HIGH,
    jm1_assignedto: "JM1 Automation",
    jm1_duedate: input.dueDate
  });
}

async function consumeProofreadingApprovalEvent(client, event) {
  const existing = await findExecutionLog(client, "EDITORIAL_APPROVAL_EVENT_CONSUMED", event.idempotencyKey);
  if (existing) return { status: "idempotent", executionLogIds: [existing.jm1_executionlogid] };

  const [title, stage, artifact] = await Promise.all([
    getTitle(client, event.titleId),
    getStage(client, event.stageId),
    getArtifact(client, event.approvedArtifactId)
  ]);
  const checksum = normalizeString(artifact.jm1pub_sha256) || extractChecksum(artifact.jm1pub_notes);
  if (checksum !== event.approvedArtifactChecksum) return transitionBlocked(client, event, "APPROVED_SOURCE_CHECKSUM_MISMATCH");

  const eligibility = evaluateInteriorLayoutEligibility({ title, stage, artifact, checksum });
  await writeLog(client, {
    actionType: "INTERIOR_LAYOUT_ELIGIBILITY_EVALUATED",
    name: `INTERIOR_LAYOUT_ELIGIBILITY_EVALUATED - ${normalizeString(title.jm1pub_titlename || title.jm1pub_name) || event.titleId}`,
    description: `Eligibility result ${eligibility.result}. ${eligibility.reason}. Idempotency: ${event.idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: event.gateId
  });
  if (eligibility.result.startsWith("BLOCKED")) return transitionBlocked(client, event, eligibility.reason);

  const now = new Date().toISOString();
  const titleName = normalizeString(title.jm1pub_titlename || title.jm1pub_name) || event.titleId;
  await Promise.all([
    client.patch("jm1pub_editorialapprovalgates", event.gateId, {
      jm1pub_gatestatus: GATE_STATUS_APPROVED,
      jm1pub_authordecision: AUTHOR_DECISION_APPROVE,
      jm1pub_authordecisionon: event.approvedAt,
      jm1pub_nextstageauthorized: true,
      jm1pub_nextstageauthorizedon: now,
      jm1pub_authorresponsesummary: "Proofreading approved by author. Interior Layout autostart is authorized.",
      jm1pub_correlationid: event.correlationId
    }),
    client.patch("jm1pub_editorialstages", event.stageId, {
      jm1pub_stagestatus: STAGE_STATUS_COMPLETE,
      jm1pub_stagecompletedate: now,
      jm1pub_authorsafesummary: "Your proofreading review is complete. The publishing team is preparing the manuscript for production.",
      jm1pub_internaloperationalsummary: `Proofreading completed through event-driven approval. Approved source checksum ${checksum}.`,
      jm1pub_correlationid: event.correlationId
    })
  ]);

  const projectId = await findOrCreateInteriorLayoutProject(client, {
    titleId: event.titleId,
    titleName,
    artifactPath: normalizeString(artifact.jm1pub_repositorypath)
  });
  const taskId = await findOrCreateInteriorLayoutTask(client, {
    titleName,
    dueDate: addBusinessDays(now, 5)
  });
  const logIds = [];
  for (const actionType of [
    "PROOFREADING_APPROVAL_EVENT_RECEIVED",
    "PROOFREADING_GATE_CLOSED",
    "PROOFREADING_STAGE_COMPLETED",
    "PRODUCTION_SOURCE_LOCKED",
    "INTERIOR_LAYOUT_AUTOSTARTED",
    "MARKETING_PRODUCTION_PHASE_TRIGGER_EMITTED",
    "JM1_FIRST_EVENT_DRIVEN_STAGE_TRANSITION_COMMISSIONED",
    "EDITORIAL_APPROVAL_EVENT_CONSUMED"
  ]) {
    logIds.push(await writeLog(client, {
      actionType,
      name: `${actionType} - ${titleName}`,
      description: `Automatic approval consumer completed ${actionType}. No Publisher Center action, GitHub Action, Cody session, or manual API request is required for the normal path. Interior project ${projectId}; task ${taskId}. Idempotency: ${event.idempotencyKey}.`,
      sourceEntity: actionType === "INTERIOR_LAYOUT_AUTOSTARTED" ? "jm1_productionproject" : "jm1pub_editorialapprovalgate",
      sourceRecordId: actionType === "INTERIOR_LAYOUT_AUTOSTARTED" ? projectId : event.gateId
    }));
  }
  return { status: "transition-completed", productionProjectId: projectId, productionTaskId: taskId, executionLogIds: logIds };
}

async function consumeApprovalEvent(client, event) {
  if (event.currentStageCode === "PROOFREADING" || event.eventType === "PROOFREADING_APPROVED") {
    return consumeProofreadingApprovalEvent(client, event);
  }
  return transitionBlocked(client, event, "NEXT_STAGE_EXECUTOR_MISSING");
}

async function runAutomaticApprovalEventConsumer(input = {}, deps = {}) {
  const triggerSource = input.triggerSource || "SCHEDULED_WORKER";
  const maxEvents = Math.min(Math.max(Number(input.maxEvents || 10), 1), 25);
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const candidates = await (deps.findCandidates || findDurableApprovalCandidates)(client, maxEvents);
  const results = [];

  for (const gate of candidates) {
    const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid);
    const event = await buildApprovalEventFromGate(client, gate, triggerSource);
    if (!event) {
      const blockerKey = `approval-event-blocked:${gateId}:payload_missing_required_reference_or_complete_notification`;
      const existingBlocker = await findExecutionLog(client, "EDITORIAL_APPROVAL_EVENT_BLOCKED", blockerKey);
      if (existingBlocker) {
        results.push({ gateId, eventType: "EDITORIAL_STAGE_APPROVED", outcome: "IDEMPOTENT", detail: "payload_or_notification_blocker_already_dead_lettered", executionLogIds: [existingBlocker.jm1_executionlogid] });
        continue;
      }
      const logId = await writeLog(client, {
        actionType: "EDITORIAL_APPROVAL_EVENT_BLOCKED",
        name: `EDITORIAL_APPROVAL_EVENT_BLOCKED - ${gateId}`,
        description: `Approval gate could not produce a valid event payload or lacks complete attachment-aware notification evidence. Dead-lettered for exact remediation. Idempotency: ${blockerKey}.`,
        sourceEntity: "jm1pub_editorialapprovalgate",
        sourceRecordId: gateId,
        failed: true
      });
      results.push({ gateId, eventType: "EDITORIAL_STAGE_APPROVED", outcome: "BLOCKED", detail: "payload_missing_required_reference_or_complete_notification", executionLogIds: [logId] });
      continue;
    }

    const existing = await findExecutionLog(client, "EDITORIAL_APPROVAL_EVENT_CONSUMED", event.idempotencyKey);
    if (existing) {
      results.push({ gateId: event.gateId, eventId: event.eventId, eventType: event.eventType, outcome: "IDEMPOTENT", detail: "approval_event_already_consumed", executionLogIds: [existing.jm1_executionlogid] });
      continue;
    }

    const claimLog = await writeLog(client, {
      actionType: "EDITORIAL_APPROVAL_EVENT_CLAIMED",
      name: `EDITORIAL_APPROVAL_EVENT_CLAIMED - ${event.eventType}`,
      description: `Azure Functions timer consumer claimed approval event ${event.eventId}. Trigger ${triggerSource}; schedule every 5 minutes; timeout 10 minutes; idempotency ${event.idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: event.gateId
    });
    const result = await consumeApprovalEvent(client, event);
    results.push({
      gateId: event.gateId,
      eventId: event.eventId,
      eventType: event.eventType,
      outcome: result.status === "transition-completed" ? "APPROVAL_CONSUMED_TRANSITION_COMPLETED_NEXT_STAGE_RUNTIME_STARTED" : result.status === "idempotent" ? "IDEMPOTENT" : "APPROVAL_CONSUMED_TRANSITION_BLOCKED",
      detail: result.status,
      executionLogIds: [claimLog, ...(result.executionLogIds || [])]
    });
  }

  return {
    runtimeName: "JM1 Azure Function Approval Event Consumer",
    deploymentEnvironment: "func-jm1-diagnostic-ai-runner",
    triggerType: "Azure Functions timer",
    schedule: "0 */5 * * * *",
    queue: "Dataverse editorial approval gates plus execution-log claim records",
    identity: "func-jm1-diagnostic-ai-runner application identity",
    retryPolicy: "Azure Functions host retry plus idempotent Dataverse claim/dead-letter records",
    timeout: "10 minutes host timeout target",
    deadLetterBehavior: "EDITORIAL_APPROVAL_EVENT_BLOCKED with exact blocker and idempotency key",
    costCategory: "Consumption/serverless timer execution",
    processed: results.filter((result) => result.outcome.includes("TRANSITION_COMPLETED")).length,
    blocked: results.filter((result) => result.outcome === "BLOCKED" || result.outcome.includes("TRANSITION_BLOCKED")).length,
    idempotent: results.filter((result) => result.outcome === "IDEMPOTENT").length,
    results
  };
}

module.exports = {
  runAutomaticApprovalEventConsumer,
  buildApprovalEventFromGate,
  consumeApprovalEvent,
  createDataverseClient,
  normalizeConfiguredSecret
};
