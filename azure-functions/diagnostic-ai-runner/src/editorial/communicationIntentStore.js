"use strict";

const { createHash } = require("node:crypto");
const { writeLog } = require("./editorialExecutionRuntime");

const RESERVED_ACTION = "AUTHOR_COMMUNICATION_INTENT_RESERVED";
const SENT_ACTION = "AUTHOR_COMMUNICATION_INTENT_SENT";

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeODataText(value) {
  return String(value || "").replace(/'/g, "''");
}

function canonicalArtifacts(attachments = []) {
  return attachments
    .map((attachment) => ({ role: clean(attachment.role || "attachment"), sha256: clean(attachment.sha256) }))
    .sort((left, right) => `${left.role}:${left.sha256}`.localeCompare(`${right.role}:${right.sha256}`));
}

function buildCommunicationIdentity(input = {}) {
  const identity = {
    titleId: clean(input.titleId),
    authorId: clean(input.authorId),
    communicationType: clean(input.communicationType),
    workstream: clean(input.workstream),
    recipient: clean(input.recipient),
    artifacts: canonicalArtifacts(input.attachments)
  };
  const digest = createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
  return { identity, key: `communication:v1:${digest}` };
}

function describesSameDelivery(row, semantic) {
  const text = clean(row.jm1_actiondescription);
  if (!text || !semantic.identity.recipient || semantic.identity.artifacts.length === 0) return false;
  return text.includes(semantic.identity.recipient)
    && semantic.identity.artifacts.every((artifact) => artifact.sha256 && text.includes(artifact.sha256))
    && (!semantic.identity.titleId || clean(row.jm1_sourcerecordid) === semantic.identity.titleId || text.includes(semantic.identity.titleId));
}

function effectiveSentAt(row) {
  return String(row?.jm1_actiondescription || "").match(/sentAt=([^;\s]+)/i)?.[1] || row?.createdon;
}

async function findIntentState(client, semantic) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter:
      `(jm1_actiontype eq '${RESERVED_ACTION}' or jm1_actiontype eq '${SENT_ACTION}') and ` +
      `contains(jm1_actiondescription,'${escapeODataText(semantic.key)}')`,
    $orderby: "createdon desc",
    $top: "10"
  });
  const sent = rows.find((row) => row.jm1_actiontype === SENT_ACTION);
  if (sent) return { status: "ALREADY_DELIVERED", record: sent, source: "CANONICAL_INTENT" };
  const reserved = rows.find((row) => row.jm1_actiontype === RESERVED_ACTION);
  if (reserved) return { status: "AMBIGUOUS_SEND_STATE", record: reserved, source: "CANONICAL_INTENT" };

  const historical = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `contains(jm1_actiondescription,'${escapeODataText(semantic.identity.recipient)}')`,
    $orderby: "createdon desc",
    $top: "100"
  });
  const existing = historical.find((row) => /SENT|DELIVERED|READBACK/.test(String(row.jm1_actiontype || "")) && describesSameDelivery(row, semantic));
  return existing
    ? { status: "ALREADY_DELIVERED", record: existing, source: "HISTORICAL_SEMANTIC_MATCH" }
    : { status: "AVAILABLE" };
}

async function reserveCommunicationIntent(client, input) {
  const semantic = buildCommunicationIdentity(input);
  const current = await findIntentState(client, semantic);
  if (current.status !== "AVAILABLE") {
    return {
      ...current,
      semanticIdempotencyKey: semantic.key,
      communicationRecordId: current.record?.jm1_executionlogid,
      sentAt: effectiveSentAt(current.record),
      recipient: semantic.identity.recipient,
      artifactChecksums: semantic.identity.artifacts.map((artifact) => artifact.sha256)
    };
  }
  const description =
    `Idempotency ${semantic.key}. DELIVERY_STATE=RESERVED; titleId=${semantic.identity.titleId}; ` +
    `authorId=${semantic.identity.authorId}; communicationType=${semantic.identity.communicationType}; ` +
    `workstream=${semantic.identity.workstream}; recipient=${semantic.identity.recipient}; ` +
    `artifacts=${semantic.identity.artifacts.map((artifact) => `${artifact.role}:${artifact.sha256}`).join("|")}.`;
  const communicationRecordId = await writeLog(client, {
    name: `AUTHOR_COMMUNICATION_INTENT_RESERVED - ${input.titleName || semantic.identity.titleId}`,
    actionType: RESERVED_ACTION,
    description,
    sourceEntity: "jm1pub_title",
    sourceRecordId: semantic.identity.titleId
  });
  return { status: "RESERVED", semanticIdempotencyKey: semantic.key, communicationRecordId, semanticIdentity: semantic.identity };
}

async function markCommunicationSent(client, input) {
  const description =
    `Idempotency ${input.semanticIdempotencyKey}. DELIVERY_STATE=SENT; communicationRecordId=${input.communicationRecordId}; ` +
    `providerMessageId=${input.providerMessageId || "UNKNOWN"}; sentAt=${input.sentAt || new Date().toISOString()}; ` +
    `recipient=${clean(input.recipient)}; artifacts=${(input.artifactChecksums || []).join("|")}.`;
  const sentRecordId = await writeLog(client, {
    name: `AUTHOR_COMMUNICATION_INTENT_SENT - ${input.titleName || input.titleId}`,
    actionType: SENT_ACTION,
    description,
    sourceEntity: "jm1pub_title",
    sourceRecordId: input.titleId
  });
  return { sentRecordId };
}

module.exports = {
  RESERVED_ACTION,
  SENT_ACTION,
  buildCommunicationIdentity,
  describesSameDelivery,
  findIntentState,
  markCommunicationSent,
  reserveCommunicationIntent
};
