"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { TableClient } = require("@azure/data-tables");
const { COMMUNICATION_STATE, MAILBOX_VERIFICATION_POLICY, verifyPublishingMailboxEvidence } = require("../generated/communications/publishing-communication-acceptance");

const DEFAULT_TABLE_NAME = "JM1RelayMessages";
const DELIVERY_STATE = Object.freeze({
  RESERVED: "RESERVED",
  ACCEPTED: "ACCEPTED",
  FAILED: "FAILED"
});

let defaultLedger;

function hash(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function clean(value, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function createFingerprint(input) {
  return hash(JSON.stringify({
    callerId: clean(input.callerId),
    brand: clean(input.brand),
    businessObjectType: clean(input.businessObjectType),
    businessObjectId: clean(input.businessObjectId),
    recipients: [...(input.recipients || [])].map((value) => clean(value).toLowerCase()).sort(),
    communicationPurpose: clean(input.communicationPurpose),
    templateId: clean(input.templateId),
    templateVersion: clean(input.templateVersion),
    rendererVersion: clean(input.rendererVersion),
    brandTokenVersion: clean(input.brandTokenVersion),
    htmlSha256: clean(input.htmlSha256),
    plainTextSha256: clean(input.plainTextSha256),
    artifactFingerprint: clean(input.artifactFingerprint, 4096)
  }));
}

function createLedger(tableClient) {
  let initialized = false;

  async function ensureTable() {
    if (initialized) return;
    try {
      await tableClient.createTable();
    } catch (error) {
      if (Number(error?.statusCode) !== 409) throw error;
    }
    initialized = true;
  }

  async function reserve(input) {
    await ensureTable();
    const partitionKey = hash(`${input.callerId}|${input.brand}`).slice(0, 32);
    const rowKey = hash(input.idempotencyKey);
    const fingerprint = createFingerprint(input);
    const now = new Date().toISOString();
    const entity = {
      partitionKey,
      rowKey,
      jm1MessageId: randomUUID(),
      idempotencyKey: clean(input.idempotencyKey, 512),
      fingerprint,
      callerId: clean(input.callerId),
      brand: clean(input.brand),
      businessObjectType: clean(input.businessObjectType),
      businessObjectId: clean(input.businessObjectId),
      correlationId: clean(input.correlationId),
      templateId: clean(input.templateId),
      templateVersion: clean(input.templateVersion),
      rendererVersion: clean(input.rendererVersion),
      brandTokenVersion: clean(input.brandTokenVersion),
      htmlSha256: clean(input.htmlSha256),
      plainTextSha256: clean(input.plainTextSha256),
      artifactFingerprint: clean(input.artifactFingerprint, 4096),
      systemSender: clean(input.systemSender),
      recipient: clean((input.recipients || []).join(","), 2048),
      brandCc: clean((input.brandCc || []).join(","), 2048),
      replyTo: clean(input.replyTo),
      deliveryState: DELIVERY_STATE.RESERVED,
      communicationState: COMMUNICATION_STATE.RENDERED,
      acceptanceVersion: "1.0.0",
      acceptedAt: "",
      providerMessageId: "",
      failureClass: "",
      createdAt: now,
      updatedAt: now
    };

    try {
      await tableClient.createEntity(entity);
      return { kind: "RESERVED", entity };
    } catch (error) {
      if (Number(error?.statusCode) !== 409) throw error;
      const existing = await tableClient.getEntity(partitionKey, rowKey);
      if (existing.fingerprint !== fingerprint) {
        const conflict = new Error("Idempotency key was already used for a different communication effect.");
        conflict.safeCode = "IDEMPOTENCY_KEY_CONFLICT";
        throw conflict;
      }
      if (existing.deliveryState === DELIVERY_STATE.FAILED) {
        const retry = {
          partitionKey,
          rowKey,
          deliveryState: DELIVERY_STATE.RESERVED,
          failureClass: "",
          updatedAt: now
        };
        try {
          await tableClient.updateEntity(retry, "Merge", existing.etag ? { etag: existing.etag } : undefined);
          return { kind: "RETRY_RESERVED", entity: { ...existing, ...retry } };
        } catch (retryError) {
          if (Number(retryError?.statusCode) !== 412) throw retryError;
          return { kind: "REPLAY", entity: await tableClient.getEntity(partitionKey, rowKey) };
        }
      }
      if (existing.deliveryState === DELIVERY_STATE.ACCEPTED) {
        const replay = { partitionKey, rowKey,
          duplicateSendsPrevented: Number(existing.duplicateSendsPrevented || 0) + 1,
          lastReplayAt: now };
        try { await tableClient.updateEntity(replay, "Merge", existing.etag ? { etag: existing.etag } : undefined); }
        catch (replayError) { if (Number(replayError?.statusCode) !== 412) throw replayError; }
        return { kind: "REPLAY", entity: { ...existing, ...replay } };
      }
      return { kind: "REPLAY", entity: existing };
    }
  }

  async function recordAccepted(entity, providerMessageId, message = null) {
    const acceptedAt = new Date().toISOString();
    const updated = {
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey,
      deliveryState: DELIVERY_STATE.ACCEPTED,
      providerMessageId: clean(providerMessageId),
      acceptedAt,
      updatedAt: acceptedAt,
      failureClass: ""
    };
    if (entity.brand === "JMPRODUCTIONS" && entity.templateId === "PRODUCTIONS.BP09_NOTICE") {
      updated.communicationState = COMMUNICATION_STATE.PROVIDER_ACCEPTED;
    }
    if (entity.brand === "JMP") Object.assign(updated, {
      communicationState: COMMUNICATION_STATE.PROVIDER_ACCEPTED,
      verificationRequired: true, verificationAttempts: 0,
      nextVerificationAt: acceptedAt,
      verificationDeadline: new Date(Date.parse(acceptedAt) + MAILBOX_VERIFICATION_POLICY.windowMs).toISOString(),
      subject: clean(message?.content?.subject, 998),
      contentValid: Boolean(message),
      canonicalRender: Boolean(entity.rendererVersion && entity.htmlSha256 && entity.plainTextSha256),
      businessEventId: entity.businessObjectId,
      recipientId: entity.recipient,
      serviceException: false
    });
    await tableClient.updateEntity(updated, "Merge");
    return { ...entity, ...updated };
  }

  async function recordSubmitted(entity) {
    const updated = { partitionKey: entity.partitionKey, rowKey: entity.rowKey,
      communicationState: COMMUNICATION_STATE.SUBMITTED, updatedAt: new Date().toISOString() };
    await tableClient.updateEntity(updated, "Merge");
    return { ...entity, ...updated };
  }

  async function recordFailure(entity, failureClass) {
    const updatedAt = new Date().toISOString();
    const updated = {
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey,
      deliveryState: DELIVERY_STATE.FAILED,
      failureClass: clean(failureClass),
      updatedAt
    };
    updated.communicationState = COMMUNICATION_STATE.FAILED;
    await tableClient.updateEntity(updated, "Merge");
    return { ...entity, ...updated };
  }

  async function findByCommunicationId(id) {
    if (!/^[a-f0-9-]{36}$/i.test(id || "")) throw Object.assign(new Error("Communication ID required"), { safeCode: "COMMUNICATION_ID_REQUIRED" });
    const rows = [];
    for await (const row of tableClient.listEntities({ queryOptions: { filter: `brand eq 'JMP' and jm1MessageId eq '${id}'` } })) rows.push(row);
    if (rows.length !== 1) throw Object.assign(new Error("Communication authority unavailable"), { safeCode: "COMMUNICATION_AUTHORITY_UNAVAILABLE" });
    return rows[0];
  }

  async function listVerificationPending(limit = 25, now = new Date().toISOString()) {
    const rows = [];
    for await (const row of tableClient.listEntities({ queryOptions: { filter: "brand eq 'JMP' and verificationRequired eq true" } })) {
      if (row.communicationState !== COMMUNICATION_STATE.MAILBOX_VERIFIED && row.nextVerificationAt && row.nextVerificationAt <= now) rows.push(row);
      if (rows.length >= limit) break;
    }
    return rows;
  }

  async function recordVerification(entity, nativeMessage, now = new Date().toISOString(), runtimeFailure = "") {
    const current = await tableClient.getEntity(entity.partitionKey, entity.rowKey);
    if (current.communicationState === COMMUNICATION_STATE.MAILBOX_VERIFIED) return current;
    if (!current.verificationRequired || !Number.isFinite(Date.parse(current.verificationDeadline))) {
      return current;
    }
    const result = verifyPublishingMailboxEvidence(current, nativeMessage || {}, "publishing@jmerrill.one");
    const attempts = Number(current.verificationAttempts || 0) + 1;
    const expired = Date.parse(now) >= Date.parse(current.verificationDeadline);
    const updated = { partitionKey: current.partitionKey, rowKey: current.rowKey, updatedAt: now,
      verificationAttempts: attempts, lastVerificationAt: now,
      verificationRuntimeFailure: result.verified ? "" : clean(runtimeFailure),
      communicationState: result.verified ? COMMUNICATION_STATE.MAILBOX_VERIFIED
        : expired ? COMMUNICATION_STATE.DELIVERY_UNVERIFIED : COMMUNICATION_STATE.PROVIDER_ACCEPTED,
      serviceException: !result.verified && expired,
      nextVerificationAt: result.verified || expired ? "" : new Date(Math.min(Date.parse(current.verificationDeadline),
        Date.parse(current.acceptedAt) + MAILBOX_VERIFICATION_POLICY.retryOffsetsMs[Math.min(attempts, MAILBOX_VERIFICATION_POLICY.retryOffsetsMs.length - 1)])).toISOString(),
      verificationFailure: result.verified ? "" : "MAILBOX_EVIDENCE_UNVERIFIED" };
    if (result.verified) Object.assign(updated, { mailbox: result.evidence.mailbox,
      mailboxMessageId: result.evidence.mailboxMessageId,
      mailboxInternetMessageId: result.evidence.mailboxInternetMessageId,
      mailboxVerifiedAt: now });
    await tableClient.updateEntity(updated, "Merge", current.etag ? { etag: current.etag } : undefined);
    return { ...current, ...updated };
  }

  async function findByProviderId(id) {
    if (!/^[a-f0-9-]{36}$/i.test(id || "")) return null;
    const rows = [];
    for await (const row of tableClient.listEntities({ queryOptions: { filter: `brand eq 'JMP' and providerMessageId eq '${id}'` } })) rows.push(row);
    if (rows.length > 1) throw Object.assign(new Error("Provider correlation is ambiguous"), { safeCode: "PROVIDER_CORRELATION_AMBIGUOUS" });
    return rows[0] || null;
  }
  async function acceptanceSummary() {
    const counts = { submitted: 0, providerAccepted: 0, pending: 0, verified: 0, unverified: 0, providerFailed: 0, serviceExceptions: 0, duplicateSendsPrevented: 0 };
    for await (const row of tableClient.listEntities({ queryOptions: { filter: "brand eq 'JMP' and acceptanceVersion eq '1.0.0'" } })) {
      if (![COMMUNICATION_STATE.CREATED, COMMUNICATION_STATE.RENDERED].includes(row.communicationState)) counts.submitted++;
      if (row.providerMessageId && row.acceptedAt) counts.providerAccepted++;
      if (row.communicationState === COMMUNICATION_STATE.MAILBOX_VERIFIED) counts.verified++;
      else if (row.communicationState === COMMUNICATION_STATE.DELIVERY_UNVERIFIED) counts.unverified++;
      else if (row.communicationState === COMMUNICATION_STATE.PROVIDER_ACCEPTED) counts.pending++;
      else if (row.communicationState === COMMUNICATION_STATE.FAILED) counts.providerFailed++;
      if (row.serviceException) counts.serviceExceptions++;
      counts.duplicateSendsPrevented += Number(row.duplicateSendsPrevented || 0);
    }
    return counts;
  }
  async function recordRuntimeHealth(counts) {
    await ensureTable();
    const entity = { partitionKey: "publishing-acceptance", rowKey: "runtime-health",
      observedAt: new Date().toISOString(), ...counts };
    await tableClient.upsertEntity(entity, "Replace");
    return entity;
  }
  return { reserve, recordSubmitted, recordAccepted, recordFailure, findByCommunicationId, findByProviderId, listVerificationPending, recordVerification, acceptanceSummary, recordRuntimeHealth };
}

function getMessageLedger() {
  if (defaultLedger) return defaultLedger;
  const connectionString = process.env.JM1_MESSAGE_STORE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
  if (!connectionString) {
    throw Object.assign(new Error("Durable relay message store is not configured."), { safeCode: "MESSAGE_STORE_CONFIG_MISSING" });
  }
  const tableName = clean(process.env.JM1_MESSAGE_TABLE_NAME || DEFAULT_TABLE_NAME, 63);
  defaultLedger = createLedger(TableClient.fromConnectionString(connectionString, tableName));
  return defaultLedger;
}

module.exports = {
  DEFAULT_TABLE_NAME,
  DELIVERY_STATE,
  createFingerprint,
  createLedger,
  getMessageLedger
};
