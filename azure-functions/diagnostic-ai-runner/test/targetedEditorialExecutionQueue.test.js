"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildQueuedTargetedEditorialExecutionMessage,
  enqueueTargetedEditorialExecution,
  processQueuedTargetedEditorialExecution
} = require("../src/editorial/targetedEditorialExecutionQueue");

const input = {
  titleId: "2d21ab5b-4d80-f111-ab0f-7c1e525b15c2",
  stageCode: "line_editing",
  sourceArtifactId: "0c382466-0c9c-f111-b8dc-000d3a14673b",
  sourceChecksum: "d1d26531bae4be696150b3db8bbcfa2b8caab6e2d39b7aec34b6c72f11bd3453",
  expectedCurrentStage: "DEVELOPMENTAL_COMPLETE",
  authorApprovalRequired: true,
  executionMode: "EXECUTE_ASYNC"
};

test("buildQueuedTargetedEditorialExecutionMessage preserves the exact governed target and converts to EXECUTE", () => {
  const message = buildQueuedTargetedEditorialExecutionMessage(input, { idempotencyKey: "idem-1" });
  assert.equal(message.kind, "TARGETED_EDITORIAL_EXECUTION");
  assert.equal(message.version, 1);
  assert.equal(message.idempotencyKey, "idem-1");
  assert.equal(message.titleId, input.titleId);
  assert.equal(message.stageCode, "LINE_EDITING");
  assert.equal(message.sourceArtifactId, input.sourceArtifactId);
  assert.equal(message.sourceChecksum, input.sourceChecksum);
  assert.equal(message.expectedCurrentStage, "DEVELOPMENTAL_COMPLETE");
  assert.equal(message.authorApprovalRequired, true);
  assert.equal(message.executionMode, "EXECUTE");
});

test("enqueueTargetedEditorialExecution writes one durable queue message without inline execution", async () => {
  const sent = [];
  const queueClient = {
    async createIfNotExists() {
      sent.push({ type: "createIfNotExists" });
    },
    async sendMessage(body) {
      sent.push({ type: "sendMessage", body });
      return { messageId: "message-1", insertedOn: "2026-08-25T14:00:00Z" };
    }
  };
  const result = await enqueueTargetedEditorialExecution(input, { idempotencyKey: "idem-2" }, { queueClient });
  assert.equal(result.ok, true);
  assert.equal(result.status, "QUEUED");
  assert.equal(result.messageId, "message-1");
  assert.equal(sent.filter((entry) => entry.type === "sendMessage").length, 1);
  const queued = JSON.parse(sent.find((entry) => entry.type === "sendMessage").body);
  assert.equal(queued.executionMode, "EXECUTE");
  assert.equal(queued.sourceArtifactId, input.sourceArtifactId);
});

test("processQueuedTargetedEditorialExecution invokes the canonical targeted runtime exactly once", async () => {
  const calls = [];
  const message = buildQueuedTargetedEditorialExecutionMessage(input, { idempotencyKey: "idem-3" });
  const result = await processQueuedTargetedEditorialExecution(JSON.stringify(message), {
    async runTargetedEditorialExecution(payload) {
      calls.push(payload);
      return { ok: true, status: "EXECUTED", idempotencyKey: "idem-3" };
    }
  });
  assert.equal(result.status, "EXECUTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executionMode, "EXECUTE");
  assert.equal(calls[0].titleId, input.titleId);
  assert.equal(calls[0].sourceChecksum, input.sourceChecksum);
});

test("processQueuedTargetedEditorialExecution accepts Azure queue Buffer payloads", async () => {
  const calls = [];
  const message = buildQueuedTargetedEditorialExecutionMessage(input, { idempotencyKey: "idem-4" });
  const result = await processQueuedTargetedEditorialExecution(Buffer.from(JSON.stringify(message), "utf8"), {
    async runTargetedEditorialExecution(payload) {
      calls.push(payload);
      return { ok: true, status: "EXECUTED", idempotencyKey: "idem-4" };
    }
  });

  assert.equal(result.status, "EXECUTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executionMode, "EXECUTE");
});

test("processQueuedTargetedEditorialExecution accepts base64-encoded Azure queue text", async () => {
  const calls = [];
  const message = buildQueuedTargetedEditorialExecutionMessage(input, { idempotencyKey: "idem-5" });
  const encoded = Buffer.from(JSON.stringify(message), "utf8").toString("base64");
  const result = await processQueuedTargetedEditorialExecution(encoded, {
    async runTargetedEditorialExecution(payload) {
      calls.push(payload);
      return { ok: true, status: "EXECUTED", idempotencyKey: "idem-5" };
    }
  });

  assert.equal(result.status, "EXECUTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].titleId, input.titleId);
});

test("processQueuedTargetedEditorialExecution accepts wrapped queue trigger payloads", async () => {
  const calls = [];
  const message = buildQueuedTargetedEditorialExecutionMessage(input, { idempotencyKey: "idem-6" });
  const result = await processQueuedTargetedEditorialExecution({ messageText: JSON.stringify(message) }, {
    async runTargetedEditorialExecution(payload) {
      calls.push(payload);
      return { ok: true, status: "EXECUTED", idempotencyKey: "idem-6" };
    }
  });

  assert.equal(result.status, "EXECUTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sourceArtifactId, input.sourceArtifactId);
});
