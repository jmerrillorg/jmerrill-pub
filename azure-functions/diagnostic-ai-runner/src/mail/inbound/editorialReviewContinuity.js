"use strict";

const { lifecycleReadback } = require("../../functions/runPublishingLifecycleReadback");
const { authorReplyText } = require("./replyText");

// Bounded founder authorization; this does not grant portfolio-wide sends.
const CONTINUITY_AUTHORITY = Object.freeze({
  packet: "JMP-JACKULINE-WHOLE-LIFECYCLE-RECOVERY-003-C1",
  authorId: "106a78d0-fb9a-f111-b8dc-6045bdd69738",
  titleId: "daf8180f-85a3-f111-b8de-000d3a14673b",
});
function continuityAuthorized(row) {
  return row?.authorId === CONTINUITY_AUTHORITY.authorId && row?.titleId === CONTINUITY_AUTHORITY.titleId;
}
function field(description, name) {
  return String(description || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`))?.[1] || null;
}
function held(reason, extra = {}) { return { status: "HELD", reason, effects: 0, ...extra }; }

async function prepareEditorialReviewContinuity(row, deps) {
  if (!continuityAuthorized(row)) return held("CONTINUITY_NOT_AUTHORIZED");
  const stage = await deps.client.first("jm1pub_editorialstages", {
    $filter: `jm1pub_editorialstageid eq ${row.stageId} and _jm1pub_titleid_value eq ${row.titleId}`,
  });
  if (stage?.jm1pub_editorialstageid !== row.stageId || stage?._jm1pub_titleid_value !== row.titleId ||
      stage?._jm1pub_contactid_value !== row.authorId || Number(stage.jm1pub_stagetype) !== 100000001) {
    return held("DELIVERED_DEVELOPMENTAL_STAGE_BINDING_UNPROVEN");
  }
  const logs = await deps.client.list("jm1_executionlogs", {
    $filter: `jm1_sourcerecordid eq '${row.stageId}' and jm1_actiontype eq 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT'`,
    $top: "100",
  });
  const providers = [...new Set(logs.map(log => field(log.jm1_actiondescription, "providerMessageId")).filter(Boolean))];
  if (logs.length >= 100 || providers.length !== 1) return held("DELIVERED_PACKAGE_CARDINALITY_UNPROVEN");
  const sent = logs.find(log => field(log.jm1_actiondescription, "providerMessageId") === providers[0]);
  const gateId = field(sent.jm1_actiondescription, "gate");
  if (!/^[a-f0-9-]{36}$/i.test(gateId || "")) return held("DELIVERED_GATE_ID_UNPROVEN");
  const gate = await deps.client.first("jm1pub_editorialapprovalgates", {
    $filter: `jm1pub_editorialapprovalgateid eq ${gateId} and _jm1pub_titleid_value eq ${row.titleId}`,
  });
  if (gate?.jm1pub_editorialapprovalgateid !== gateId || gate?._jm1pub_titleid_value !== row.titleId ||
      Number(gate?.jm1pub_gatestatus) !== 196650002 || gate.jm1pub_authordecision || gate.jm1pub_authordecisionon) {
    return held("DELIVERED_REVIEW_GATE_CHANGED");
  }
  const artifactId = gate._jm1pub_deliverableartifactid_value;
  if (!/^[a-f0-9-]{36}$/i.test(artifactId || "")) return held("DELIVERED_ARTIFACT_BINDING_UNPROVEN");
  const artifact = await deps.client.first("jm1pub_editorialartifacts", {
    $filter: `jm1pub_editorialartifactid eq ${artifactId} and _jm1pub_titleid_value eq ${row.titleId}`,
  });
  const checksums = field(sent.jm1_actiondescription, "checksums");
  if (artifact?.jm1pub_editorialartifactid !== artifactId || artifact?._jm1pub_titleid_value !== row.titleId ||
      artifact?._jm1pub_editorialstageid_value !== row.stageId ||
      !/^[a-f0-9]{64}$/i.test(artifact.jm1pub_sha256 || "") ||
      !checksums?.split("|").some(value => value === `editedManuscript:${artifact.jm1pub_sha256}`)) {
    return held("DELIVERED_ARTIFACT_CHECKSUM_MISMATCH");
  }
  const result = await (deps.lifecycleReadback || lifecycleReadback)({ authorId: row.authorId,
    titleId: row.titleId, afterIso: new Date(Date.parse(sent.createdon) - 86400000).toISOString(),
    includeResponseSearch: true }, deps);
  const search = result.jsonBody;
  if (result.status !== 200 || search?.responseSearch?.complete !== true) return held("AUTHOR_RESPONSE_SEARCH_INCOMPLETE");
  const messages = [...new Map(search.queries.flatMap(query => query.rows).map(message => [message.id, message])).values()];
  const token = providers[0].replaceAll("-", "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(token)) return held("PROVIDER_ID_UNPROVEN");
  const copies = messages.filter(message => message.from?.emailAddress?.address?.toLowerCase() === "publishing@email.jmerrill.one" &&
    new RegExp(`^<[0-9]{12}\\.${token}-[^<>]+@microsoft\\.com>$`, "i").test(message.internetMessageId || ""));
  if (copies.length !== 1 || !copies[0].toRecipients?.some(recipient =>
    recipient.emailAddress?.address?.toLowerCase() === search.authorEmail)) {
    return held("DELIVERED_NATIVE_MESSAGE_BINDING_UNPROVEN");
  }
  const copy = copies[0];
  const after = Date.parse(copy.sentDateTime);
  if (!Number.isFinite(after)) return held("DELIVERY_TIMESTAMP_UNPROVEN");
  const canonicalEmail = search.authorEmail;
  const authorEmails = new Set([canonicalEmail, ...search.responseSearch.aliases]);
  const candidates = messages.filter(message => authorEmails.has(message.from?.emailAddress?.address?.toLowerCase()) &&
    Date.parse(message.receivedDateTime) >= after && (
      message.conversationId === copy.conversationId ||
      /\b(?:approv(?:e|ed|al)|corrections?|edited manuscript|editorial review|developmental)\b/i.test(authorReplyText(message))));
  if (candidates.length) return held("AUTHOR_RESPONSE_REQUIRES_EXACT_PACKAGE_DISPOSITION", {
    responseMessageIds: candidates.map(message => message.internetMessageId),
  });
  // Re-read after the mailbox search so a concurrent disposition invalidates preparation.
  const freshGate = await deps.client.first("jm1pub_editorialapprovalgates", {
    $filter: `jm1pub_editorialapprovalgateid eq ${gateId} and _jm1pub_titleid_value eq ${row.titleId}`,
  });
  if (freshGate?.jm1pub_editorialapprovalgateid !== gateId || freshGate?._jm1pub_titleid_value !== row.titleId ||
      freshGate?._jm1pub_deliverableartifactid_value !== artifactId ||
      Number(freshGate?.jm1pub_gatestatus) !== 196650002 || freshGate.jm1pub_authordecision || freshGate.jm1pub_authordecisionon) {
    return held("DELIVERED_REVIEW_GATE_CHANGED");
  }
  return { status: "READY", packet: CONTINUITY_AUTHORITY.packet, response: "NOT_FOUND",
    authorId: row.authorId, titleId: row.titleId, stageId: row.stageId, gateId,
    sentLogId: sent.jm1_executionlogid, providerMessageId: providers[0],
    artifactId, artifactChecksum: artifact.jm1pub_sha256,
    deliveryMessageId: copy.internetMessageId, deliveredAt: copy.sentDateTime,
    packageId: field(sent.jm1_actiondescription, "package"), effects: 0 };
}
module.exports = { CONTINUITY_AUTHORITY, continuityAuthorized, prepareEditorialReviewContinuity };
