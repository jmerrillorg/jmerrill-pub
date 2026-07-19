"use strict";

const { readPublishingMailboxReply, PUBLISHING_MAILBOX } = require("../mail/publishingMailboxReader");

const EXECUTION_STATUS = { SUCCESS: 835500001, FAILED: 835500002 };
const BAND_LEVEL_1 = 835500000;
const AUTHOR_DECISION_APPROVE = 196650000;
const AUTHOR_DECISION_REQUEST_REVISION = 196650001;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
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
      throw Object.assign(new Error(body?.error?.message || `HTTP ${response.status}`), {
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
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || headers.get("location") || "");
  }
  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }
  return { list, first, create, patch };
}

function classifyAuthorReviewResponse(text) {
  const normalized = normalizeString(text).toLowerCase();
  if (/^(approved|approve|i approve|i approve!|approved!|yes approved)\b/.test(normalized)) return "APPROVED_WITHOUT_CHANGES";
  if (/\b(corrections?|changes?|revise|revision|fix)\b/.test(normalized)) return "CORRECTIONS_REQUESTED";
  if (/\?|\b(question|clarify|discussion|call)\b/.test(normalized)) return "QUESTION_OR_CLARIFICATION";
  return "UNCLASSIFIED";
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Author Review Response Consumer",
    jm1_agentmodel: "jm1-author-review-inbound-runtime",
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

async function findOpenAuthorReviewGates(client, maxGates) {
  return client.list("jm1pub_editorialapprovalgates", {
    $select:
      "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,_jm1pub_titleid_value,_jm1pub_deliverableartifactid_value,modifiedon",
    $filter: "jm1pub_authordecisionon eq null",
    $orderby: "modifiedon desc",
    $top: String(Math.min(Math.max(Number(maxGates || 10), 1), 25))
  });
}

function subjectProbeForGate(gate) {
  const name = normalizeString(gate.jm1pub_editorialapprovalgatename);
  if (name.toLowerCase().includes("intentional leader")) return "Proofreading Review Package";
  return name.replace(/^A\d+\s*/i, "").replace(/\s+-\s+.*$/, "").slice(0, 80);
}

async function processGateReply(client, gate, deps, triggerSource) {
  const gateId = normalizeString(gate.jm1pub_editorialapprovalgateid);
  const subjectContains = subjectProbeForGate(gate);
  const afterIso = normalizeString(gate.modifiedon) || "2026-01-01T00:00:00Z";
  const reply = await (deps.readReply || readPublishingMailboxReply)({ subjectContains, afterIso }, deps);
  if (!reply.ok || !reply.found) return { gateId, outcome: "NO_REPLY_FOUND", detail: reply.reason || reply.code || "no_match" };

  const inboundMessageId = normalizeString(reply.inboundMessageId) || `${reply.senderAddress || "unknown"}:${reply.receivedDateTime || "unknown"}`;
  const idempotencyKey = `author-review-response:${gateId}:${inboundMessageId}`;
  const existing = await findExecutionLog(client, "AUTHOR_RESPONSE_INBOUND_CORRELATED", idempotencyKey);
  if (existing) return { gateId, outcome: "IDEMPOTENT", detail: "inbound_response_already_processed", executionLogIds: [existing.jm1_executionlogid] };

  const classification = classifyAuthorReviewResponse(reply.bodyText || "");
  const receivedAt = normalizeString(reply.receivedDateTime) || new Date().toISOString();
  const source = `inbound:${PUBLISHING_MAILBOX}:${inboundMessageId}`;
  const correlationLog = await writeLog(client, {
    actionType: "AUTHOR_RESPONSE_INBOUND_CORRELATED",
    name: `AUTHOR_RESPONSE_INBOUND_CORRELATED - ${gateId}`,
    description:
      `Inbound author response received in ${PUBLISHING_MAILBOX}; classification=${classification}; message=${inboundMessageId}; trigger=${triggerSource}; ` +
      `conversation=${reply.conversationId || "unknown"}; Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId
  });

  if (classification === "APPROVED_WITHOUT_CHANGES") {
    await client.patch("jm1pub_editorialapprovalgates", gateId, {
      jm1pub_authordecision: AUTHOR_DECISION_APPROVE,
      jm1pub_authordecisionon: receivedAt,
      jm1pub_authordecisionsource: source,
      jm1pub_authorresponsesummary: "Author approved without changes through monitored publishing mailbox. Automatic approval-event consumer will process the next governed movement."
    });
    const approvalLog = await writeLog(client, {
      actionType: "AUTHOR_RESPONSE_APPROVAL_PERSISTED",
      name: `AUTHOR_RESPONSE_APPROVAL_PERSISTED - ${gateId}`,
      description: `Author approval persisted from monitored mailbox response; approval event is now eligible for the durable approval consumer. Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gateId
    });
    return { gateId, outcome: "APPROVAL_PERSISTED", detail: "approval_ready_for_approval_event_consumer", executionLogIds: [correlationLog, approvalLog] };
  }

  if (classification === "CORRECTIONS_REQUESTED") {
    await client.patch("jm1pub_editorialapprovalgates", gateId, {
      jm1pub_authordecision: AUTHOR_DECISION_REQUEST_REVISION,
      jm1pub_authordecisionon: receivedAt,
      jm1pub_authordecisionsource: source,
      jm1pub_authorresponsesummary: "Author requested proofreading corrections through monitored publishing mailbox. Awaiting returns to Publisher/JM1 Automation."
    });
    const correctionLog = await writeLog(client, {
      actionType: "AUTHOR_RESPONSE_CORRECTIONS_PERSISTED",
      name: `AUTHOR_RESPONSE_CORRECTIONS_PERSISTED - ${gateId}`,
      description: `Author correction request persisted from monitored mailbox response. No Interior Layout autostart is allowed. Idempotency: ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialapprovalgate",
      sourceRecordId: gateId
    });
    return { gateId, outcome: "CORRECTIONS_PERSISTED", detail: "corrections_ready_for_publisher_runtime", executionLogIds: [correlationLog, correctionLog] };
  }

  const reviewLog = await writeLog(client, {
    actionType: "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW",
    name: `AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW - ${gateId}`,
    description: `Author response reached monitored mailbox but classification=${classification}; publisher review required. Idempotency: ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gateId,
    failed: classification === "UNCLASSIFIED"
  });
  return { gateId, outcome: "PUBLISHER_REVIEW_REQUIRED", detail: classification, executionLogIds: [correlationLog, reviewLog] };
}

async function runAuthorReviewResponseConsumer(input = {}, deps = {}) {
  const triggerSource = input.triggerSource || "SCHEDULED_WORKER";
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const gates = await (deps.findGates || findOpenAuthorReviewGates)(client, input.maxGates || 10);
  const results = [];
  for (const gate of gates) results.push(await processGateReply(client, gate, deps, triggerSource));
  return {
    runtimeName: "JM1 Author Review Response Consumer",
    deploymentEnvironment: "jm1-ed-functions",
    triggerType: "Azure Functions timer",
    schedule: "0 */5 * * * *",
    monitoredMailbox: PUBLISHING_MAILBOX,
    queue: "publishing@jmerrill.one Inbox plus open Dataverse author-review gates",
    identity: "func-jm1-diagnostic-ai-runner application identity",
    retryPolicy: "Azure Functions host retry plus idempotent Dataverse response records",
    timeout: "10 minutes host timeout target",
    deadLetterBehavior: "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW with exact blocker",
    costCategory: "Consumption/serverless timer execution",
    processed: results.filter((r) => r.outcome === "APPROVAL_PERSISTED" || r.outcome === "CORRECTIONS_PERSISTED").length,
    idempotent: results.filter((r) => r.outcome === "IDEMPOTENT").length,
    results
  };
}

module.exports = {
  runAuthorReviewResponseConsumer,
  classifyAuthorReviewResponse,
  createDataverseClient
};
