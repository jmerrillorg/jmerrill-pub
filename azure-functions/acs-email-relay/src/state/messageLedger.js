"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { TableClient } = require("@azure/data-tables");

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
    plainTextSha256: clean(input.plainTextSha256)
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
      systemSender: clean(input.systemSender),
      recipient: clean((input.recipients || []).join(","), 2048),
      brandCc: clean((input.brandCc || []).join(","), 2048),
      replyTo: clean(input.replyTo),
      deliveryState: DELIVERY_STATE.RESERVED,
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
      return { kind: "REPLAY", entity: existing };
    }
  }

  async function recordAccepted(entity, providerMessageId) {
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
    await tableClient.updateEntity(updated, "Merge");
    return { ...entity, ...updated };
  }

  return { reserve, recordAccepted, recordFailure };
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
