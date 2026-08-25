"use strict";

const { QueueServiceClient } = require("@azure/storage-queue");
const { runTargetedEditorialExecution } = require("./editorialExecutionRuntime");

const DEFAULT_QUEUE_NAME = "jm1-targeted-editorial-execution";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function queueName() {
  return normalizeString(process.env.JM1_TARGETED_EDITORIAL_EXECUTION_QUEUE_NAME) || DEFAULT_QUEUE_NAME;
}

function createQueueClient(deps = {}) {
  if (deps.queueClient) return deps.queueClient;
  const connectionString = normalizeString(process.env.AzureWebJobsStorage);
  if (!connectionString) {
    throw Object.assign(new Error("AzureWebJobsStorage is required for targeted editorial execution queue."), {
      safeCode: "TARGETED_EDITORIAL_QUEUE_STORAGE_MISSING"
    });
  }
  return QueueServiceClient.fromConnectionString(connectionString).getQueueClient(queueName());
}

function buildQueuedTargetedEditorialExecutionMessage(input = {}, evaluated = {}) {
  return {
    kind: "TARGETED_EDITORIAL_EXECUTION",
    version: 1,
    enqueuedAt: new Date().toISOString(),
    idempotencyKey: normalizeString(evaluated.idempotencyKey),
    titleId: normalizeString(input.titleId),
    stageCode: normalizeString(input.stageCode).toUpperCase(),
    sourceArtifactId: normalizeString(input.sourceArtifactId),
    sourceChecksum: normalizeString(input.sourceChecksum),
    expectedCurrentStage: normalizeString(input.expectedCurrentStage),
    authorApprovalRequired: input.authorApprovalRequired === true,
    executionMode: "EXECUTE"
  };
}

async function enqueueTargetedEditorialExecution(input = {}, evaluated = {}, deps = {}) {
  const client = createQueueClient(deps);
  if (typeof client.createIfNotExists === "function") {
    await client.createIfNotExists();
  }
  const message = buildQueuedTargetedEditorialExecutionMessage(input, evaluated);
  const result = await client.sendMessage(JSON.stringify(message));
  return {
    ok: true,
    status: "QUEUED",
    queueName: queueName(),
    messageId: result?.messageId || result?.messageID || null,
    insertedOn: result?.insertedOn || null,
    idempotencyKey: message.idempotencyKey,
    target: {
      titleId: message.titleId,
      stageCode: message.stageCode,
      sourceArtifactId: message.sourceArtifactId,
      sourceChecksum: message.sourceChecksum
    }
  };
}

function parseQueuedMessage(message) {
  if (Buffer.isBuffer(message)) return parseQueuedMessage(message.toString("utf8"));
  if (typeof message === "string") {
    const trimmed = message.trim();
    if (!trimmed) {
      throw Object.assign(new Error("Queued targeted editorial execution message is empty."), {
        safeCode: "TARGETED_EDITORIAL_QUEUE_MESSAGE_EMPTY"
      });
    }
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
      if (decoded && decoded !== trimmed) {
        return JSON.parse(decoded);
      }
      throw error;
    }
  }
  if (message && typeof message === "object") {
    if (message.kind) return message;
    for (const key of ["messageText", "queueTrigger", "body", "data", "content"]) {
      if (message[key]) return parseQueuedMessage(message[key]);
    }
  }
  throw Object.assign(new Error("Queued targeted editorial execution message is not JSON."), {
    safeCode: "TARGETED_EDITORIAL_QUEUE_MESSAGE_INVALID"
  });
}

async function processQueuedTargetedEditorialExecution(message, deps = {}) {
  const parsed = parseQueuedMessage(message);
  if (parsed.kind !== "TARGETED_EDITORIAL_EXECUTION" || Number(parsed.version) !== 1) {
    throw Object.assign(new Error("Unsupported targeted editorial execution queue message."), {
      safeCode: "TARGETED_EDITORIAL_QUEUE_MESSAGE_UNSUPPORTED"
    });
  }
  const runner = deps.runTargetedEditorialExecution || runTargetedEditorialExecution;
  return runner({
    titleId: parsed.titleId,
    stageCode: parsed.stageCode,
    sourceArtifactId: parsed.sourceArtifactId,
    sourceChecksum: parsed.sourceChecksum,
    expectedCurrentStage: parsed.expectedCurrentStage,
    authorApprovalRequired: parsed.authorApprovalRequired === true,
    executionMode: "EXECUTE"
  });
}

module.exports = {
  DEFAULT_QUEUE_NAME,
  buildQueuedTargetedEditorialExecutionMessage,
  enqueueTargetedEditorialExecution,
  processQueuedTargetedEditorialExecution,
  queueName
};
