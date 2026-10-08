"use strict";

const { createHash } = require("node:crypto");
const { replyMessageIds } = require("../mail/inbound/deliveryLedger");
const { verifyCorrespondenceIdentity } = require("../mail/inbound/correspondenceIdentity");
const { authorReplyText } = require("../mail/inbound/replyText");
const { buildMessageEvidence } = require("../mail/inbound/evidenceModel");
const { resumeExactAuthorReviewReply } = require("../orchestration/authorReviewResponseConsumer");
const { isJackieAuthoredTitle } = require("../author/jackieTitleSystemCommissioningPolicy");
const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const equal = (a, b) => Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());

function createAuthorWaitOwner({ client, inbound, graph }) {
  async function authority(wait) {
    if (!GUID.test(wait.sourceRecordId)) return null;
    const gate = await client.first("jm1pub_editorialapprovalgates", { $filter: `jm1pub_editorialapprovalgateid eq ${wait.sourceRecordId}` });
    if (!gate || !equal(gate._jm1pub_titleid_value, wait.titleId) || !equal(gate._jm1pub_editorialstageid_value, wait.stageId)) return null;
    const title = await client.first("jm1pub_titles", {
      $select: "jm1pub_titleid,_jm1_primaryauthor_value,_jm1_author_value,jm1_canonicalauthorcontactreference",
      $filter: `jm1pub_titleid eq ${wait.titleId}`
    });
    const stage = await client.first("jm1pub_editorialstages", { $filter: `jm1pub_editorialstageid eq ${wait.stageId}` });
    const contact = title?._jm1_primaryauthor_value || title?.jm1_canonicalauthorcontactreference?.replace(/^contact:/, "");
    const reference = title?.jm1_canonicalauthorcontactreference;
    if (!equal(contact, wait.authorId) || (reference && reference.toLowerCase() !== `contact:${contact}`.toLowerCase()) ||
        !equal(stage?._jm1pub_titleid_value, wait.titleId) || !equal(stage?._jm1pub_contactid_value, wait.authorId) || stage.jm1pub_stagecompletedate ||
        stage.jm1pub_publishingintakereference !== wait.legacyEngagementReference ||
        wait.executionId !== `author-response:${gate.jm1pub_editorialapprovalgateid}:${gate._jm1pub_deliverableartifactid_value}`) return null;
    return { titleId: title.jm1pub_titleid, authorId: contact, stageId: stage.jm1pub_editorialstageid, title,
      executionId: wait.executionId, legacyEngagementReference: stage.jm1pub_publishingintakereference, gate };
  }
  async function condition(wait, current) {
    if (!current) return { satisfied: false, reason: "CANONICAL_GATE_MISMATCH" };
    const message = await inbound.findMessageByEventId(wait.sourceEventId);
    if (!message || !message.internetMessageId || !message.graphMessageId) return { satisfied: false, reason: "ORIGINAL_EVENT_MISSING" };
    const identity = await verifyCorrespondenceIdentity(wait.authorId, message.fromAddress, { client, store: inbound });
    if (!identity.verified) return { satisfied: false, reason: "VERIFIED_AUTHOR_EMAIL_IDENTITY_MISSING" };
    const artifact = await client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${current.gate._jm1pub_deliverableartifactid_value}` });
    if (!artifact || !equal(artifact._jm1pub_titleid_value, wait.titleId) || !equal(artifact._jm1pub_editorialstageid_value, wait.stageId) || !/^[a-f0-9]{64}$/i.test(artifact.jm1pub_sha256 || "")) return { satisfied: false, reason: "ARTIFACT_BINDING_MISSING" };
    const deliveries = [];
    for (const id of replyMessageIds(message)) {
      const delivery = await inbound.getDeliveryByInternetMessageId(id);
      if (delivery) deliveries.push(delivery);
    }
    const matches = deliveries.filter((d) => equal(d.titleId, wait.titleId) && equal(d.authorId, wait.authorId) && equal(d.stageId, wait.stageId) &&
      equal(d.gateId, wait.sourceRecordId) && equal(d.artifactId, artifact.jm1pub_editorialartifactid) && equal(d.artifactHash, artifact.jm1pub_sha256) &&
      d.engagementId === wait.legacyEngagementReference && d.deliveryStatus === "SENT_COPY_VERIFIED" &&
      Number.isFinite(Date.parse(d.deliveredAt)) && Date.parse(message.receivedAt) >= Date.parse(d.deliveredAt));
    if (matches.length !== 1) return { satisfied: false, reason: matches.length ? "AMBIGUOUS_EXACT_DELIVERY" : "EXACT_DELIVERY_HEADER_BINDING_MISSING" };
    const raw = await graph.getMessage(message.graphMessageId);
    const currentMessage = buildMessageEvidence(raw);
    if (raw.id !== message.graphMessageId || raw.internetMessageId !== message.internetMessageId || raw.receivedDateTime !== message.receivedAt ||
        !equal(raw.from?.emailAddress?.address, identity.email) || currentMessage.bodyHash !== message.bodyHash ||
        !replyMessageIds(currentMessage).includes(matches[0].internetMessageId.toLowerCase())) return { satisfied: false, reason: "ORIGINAL_MESSAGE_CHANGED" };
    return { satisfied: true, evidenceReference: `${message.inboundMessageEventId}:${matches[0].deliveryId}:${artifact.jm1pub_sha256}`, gate: current.gate,
      delivery: matches[0], reply: { ok: true, found: true, inboundMessageId: raw.id, internetMessageId: raw.internetMessageId,
        conversationId: raw.conversationId, senderAddress: identity.email, receivedDateTime: raw.receivedDateTime,
        bodyText: authorReplyText(raw), inReplyTo: matches[0].internetMessageId, gateId: wait.sourceRecordId, titleId: wait.titleId } };
  }
  async function readBusinessWait(wait) {
    const current = await authority(wait);
    const evidenceId = wait.resumeResult?.evidenceId;
    if (!current || !GUID.test(evidenceId || "")) throw Object.assign(new Error("AUTHOR_REVIEW_WAIT_AUTHORITY_CHANGED"), { safeCode: "AUTHOR_REVIEW_WAIT_AUTHORITY_CHANGED" });
    const evidence = await client.first("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiontype,jm1_sourceentity,jm1_sourcerecordid,createdon",
      $filter: `jm1_executionlogid eq ${evidenceId}`
    });
    if (!equal(evidence?.jm1_executionlogid, evidenceId) || evidence.jm1_actiontype !== "AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW" ||
        evidence.jm1_sourceentity !== "jm1pub_editorialapprovalgate" || !equal(evidence.jm1_sourcerecordid, wait.sourceRecordId) ||
        !Number.isFinite(Date.parse(evidence.createdon))) throw Object.assign(new Error("AUTHOR_REVIEW_WAIT_EVIDENCE_MISMATCH"), { safeCode: "AUTHOR_REVIEW_WAIT_EVIDENCE_MISMATCH" });
    // A consumed reply is not a completed business gate. This is a read projection only.
    if (current.gate.jm1pub_authordecision != null || current.gate.jm1pub_authordecisionon ||
        current.gate.jm1pub_nextstageauthorized === true || current.gate.jm1pub_gatestatus !== 196650002) {
      return { status: "OWNER_REVALIDATION_REQUIRED", owner: "JM_PUBLISHING", evidenceId, gateId: wait.sourceRecordId };
    }
    return { status: "WAITING_FOR_PUBLISHER_REVIEW", owner: "JM_PUBLISHING", evidenceId,
      gateId: wait.sourceRecordId, waitingSince: evidence.createdon };
  }
  return { readAuthority: authority, verifyCondition: condition, readBusinessWait, idempotent: true,
    async dispatch({ wait, proof, idempotencyKey }) {
      // The existing consumer alone classifies/persists the original reply. No supplied decision or send.
      const result = await inbound.withBusinessRouteLease(`author-gate-${wait.sourceRecordId}`, async () => {
        const current = await authority(wait);
        if (!current || !isJackieAuthoredTitle(current.title)) {
          throw Object.assign(new Error("NON_JACKIE_AUTOMATION_DENIED"), { safeCode: "NON_JACKIE_AUTOMATION_DENIED" });
        }
        const fresh = await condition(wait, current);
        if (!fresh.satisfied || fresh.evidenceReference !== proof.evidenceReference) throw Object.assign(new Error("AUTHOR_WAIT_CHANGED"), { safeCode: "AUTHOR_WAIT_CHANGED" });
        return resumeExactAuthorReviewReply(client, fresh.gate, fresh.reply, fresh.delivery);
      });
      if (!result.executionLogIds?.length || /^(HELD_|NO_REPLY|CAPTURE_DISABLED)/.test(result.outcome)) throw Object.assign(new Error("AUTHOR_OWNER_HELD"), { safeCode: "AUTHOR_OWNER_HELD" });
      return { accepted: true, executionId: wait.executionId, idempotencyKey, dispatchResult: "AUTHOR_RESPONSE_CONSUMED",
        businessStateResult: result.outcome, evidenceId: result.executionLogIds.at(-1) };
    } };
}

function authorWaitFor(gate, stage, message, now = new Date()) {
  const digest = createHash("sha256").update(`${gate.jm1pub_editorialapprovalgateid}:${gate._jm1pub_deliverableartifactid_value}:${message.inboundMessageEventId}`).digest("hex");
  const waitId = `${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20,32)}`;
  return { schemaVersion: 1, waitId, titleId: gate._jm1pub_titleid_value, authorId: stage._jm1pub_contactid_value,
    stageId: stage.jm1pub_editorialstageid, executionId: `author-response:${gate.jm1pub_editorialapprovalgateid}:${gate._jm1pub_deliverableartifactid_value}`,
    engagementId: null, lifecycleInstanceId: null, legacyEngagementReference: stage.jm1pub_publishingintakereference,
    authorityMode: "VERIFIED_LEGACY_BRIDGE", waitType: "AUTHOR_REVIEW_RESPONSE", waitOwner: "AUTHOR",
    waitReason: "EXACT_ORIGINAL_REPLY_AUTHORITY", sourceSystem: "PUBLISHING_INBOUND", sourceRecordId: gate.jm1pub_editorialapprovalgateid,
    sourceEventId: message.inboundMessageEventId, resumeCondition: "EXACT_DELIVERED_ARTIFACT_AND_VERIFIED_SENDER",
    resumeAction: "DISPATCH_OWNING_RUNTIME", idempotencyKey: `author-wait:${digest}`, status: "PENDING",
    createdAt: now.toISOString(), nextCheckAt: now.toISOString() };
}
module.exports = { createAuthorWaitOwner, authorWaitFor };
