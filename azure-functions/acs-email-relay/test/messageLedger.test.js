"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DELIVERY_STATE, createLedger } = require("../src/state/messageLedger");

class MemoryTableClient {
  constructor() {
    this.entities = new Map();
  }

  async createTable() {}

  async createEntity(entity) {
    const key = `${entity.partitionKey}/${entity.rowKey}`;
    if (this.entities.has(key)) throw Object.assign(new Error("exists"), { statusCode: 409 });
    this.entities.set(key, { ...entity });
  }

  async getEntity(partitionKey, rowKey) {
    return { ...this.entities.get(`${partitionKey}/${rowKey}`) };
  }

  async updateEntity(entity) {
    const key = `${entity.partitionKey}/${entity.rowKey}`;
    this.entities.set(key, { ...this.entities.get(key), ...entity });
  }
}

function effect(overrides = {}) {
  return {
    callerId: "publishing-web-prod",
    brand: "JMP",
    businessObjectType: "TITLE",
    businessObjectId: "title-123",
    correlationId: "corr-123",
    recipients: ["author@example.com"],
    communicationPurpose: "AUTHOR_UPDATE",
    templateId: "JMP_AUTHOR_UPDATE",
    templateVersion: "1.0",
    idempotencyKey: "title-123-author-update-v1",
    systemSender: "publishing@email.jmerrill.one",
    brandCc: ["publishing@jmerrill.one"],
    replyTo: "publishing@jmerrill.one",
    ...overrides
  };
}

test("first request reserves a durable JM1 message identity and exact replay returns it", async () => {
  const ledger = createLedger(new MemoryTableClient());
  const first = await ledger.reserve(effect());
  assert.equal(first.kind, "RESERVED");
  assert.match(first.entity.jm1MessageId, /^[0-9a-f-]{36}$/);
  const accepted = await ledger.recordAccepted(first.entity, "acs-provider-123");
  assert.equal(accepted.deliveryState, DELIVERY_STATE.ACCEPTED);

  const replay = await ledger.reserve(effect());
  assert.equal(replay.kind, "REPLAY");
  assert.equal(replay.entity.jm1MessageId, first.entity.jm1MessageId);
  assert.equal(replay.entity.providerMessageId, "acs-provider-123");
  assert.equal(replay.entity.deliveryState, DELIVERY_STATE.ACCEPTED);
});

test("concurrent duplicate reservations converge on one effect", async () => {
  const table = new MemoryTableClient();
  const ledger = createLedger(table);
  const results = await Promise.all([ledger.reserve(effect()), ledger.reserve(effect())]);
  assert.equal(results.filter((result) => result.kind === "RESERVED").length, 1);
  assert.equal(results.filter((result) => result.kind === "REPLAY").length, 1);
  assert.equal(table.entities.size, 1);
});

test("same idempotency key cannot be reused for a different communication effect", async () => {
  const ledger = createLedger(new MemoryTableClient());
  await ledger.reserve(effect());
  await assert.rejects(
    ledger.reserve(effect({ recipients: ["different@example.com"] })),
    (error) => error.safeCode === "IDEMPOTENCY_KEY_CONFLICT"
  );
});

test("failed sends remain durable and fail closed", async () => {
  const ledger = createLedger(new MemoryTableClient());
  const first = await ledger.reserve(effect());
  await ledger.recordFailure(first.entity, "ACS_SEND_FAILED");
  const replay = await ledger.reserve(effect());
  assert.equal(replay.entity.deliveryState, DELIVERY_STATE.FAILED);
  assert.equal(replay.entity.failureClass, "ACS_SEND_FAILED");
});
