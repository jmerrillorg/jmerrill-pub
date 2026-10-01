"use strict";

const { createHash } = require("node:crypto");

const CONTAINER = "jm1-publishing-stage-runtime";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGES = new Set([
  "01_INQUIRY", "02_INTAKE", "03_EDITORIAL_REVIEW", "04_AUTHOR_DECISION",
  "05_AGREEMENT_PAYMENT", "06_ONBOARDING", "07_DEVELOPMENTAL_EDITING",
  "08_LINE_EDITING", "09_COPYEDITING", "10_PROOFREADING",
  "11_INTERIOR_LAYOUT", "12_COVER_DESIGN", "13_PRODUCTION",
  "14_DISTRIBUTION", "15_PUBLICATION", "16_POST_PUBLICATION"
]);
const EVENTS = new Set([
  "TITLE_CREATED", "STAGE_ELIGIBLE", "STAGE_STARTED", "STAGE_BLOCKED",
  "HUMAN_ACTION_REQUIRED", "HUMAN_ACTION_COMPLETED", "EXTERNAL_ACTION_REQUIRED",
  "EXTERNAL_ACTION_COMPLETED", "STAGE_COMPLETED", "STAGE_FAILED",
  "STAGE_RETRY_SCHEDULED", "STAGE_RECONCILED", "TITLE_ADVANCED",
  "PUBLICATION_CONFIRMED"
]);

function safeCode(code) {
  return Object.assign(new Error(code), { safeCode: code });
}

function exact(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim() && !/[\r\n]/.test(value);
}

function keyFor(event) {
  return createHash("sha256").update(JSON.stringify([
    event.eventType, event.titleId.toLowerCase(), event.stageId.toLowerCase(),
    event.stageCode, event.executionId, (event.artifactId || "").toLowerCase(),
    event.sourceEventId
  ])).digest("hex");
}

function validateEvent(event) {
  if (!event || !EVENTS.has(event.eventType) ||
      !GUID.test(event.titleId || "") || !GUID.test(event.stageId || "") ||
      (event.artifactId && !GUID.test(event.artifactId)) ||
      !exact(event.stageCode) || !STAGES.has(event.stageCode) ||
      !exact(event.executionId) || !exact(event.sourceEventId) ||
      !exact(event.evidenceReference) ||
      !["SYSTEM", "HUMAN", "EXTERNAL_PROVIDER"].includes(event.actorClass) ||
      !exact(event.timestamp) || !Number.isFinite(Date.parse(event.timestamp)) ||
      new Date(event.timestamp).toISOString() !== event.timestamp ||
      event.idempotencyKey !== keyFor(event)) {
    throw safeCode("PUBLISHING_STAGE_EVENT_INVALID");
  }
  if ((event.eventType === "TITLE_CREATED" && event.stageCode !== "01_INQUIRY") ||
      (event.eventType === "PUBLICATION_CONFIRMED" && event.stageCode !== "15_PUBLICATION")) {
    throw safeCode("PUBLISHING_STAGE_EVENT_STAGE_MISMATCH");
  }
  if ((event.eventType === "HUMAN_ACTION_COMPLETED" && event.actorClass !== "HUMAN") ||
      (event.eventType === "EXTERNAL_ACTION_COMPLETED" && event.actorClass !== "EXTERNAL_PROVIDER")) {
    throw safeCode("PUBLISHING_STAGE_EVENT_ACTOR_MISMATCH");
  }
  return event;
}

function blobName(event) {
  const executionHash = createHash("sha256").update(event.executionId).digest("hex");
  return `stages/${event.titleId.toLowerCase()}/${event.stageId.toLowerCase()}/${executionHash}.json`;
}

function createJournalClient(deps = {}) {
  if (deps.containerClient) return deps.containerClient;
  const connectionString = process.env.AzureWebJobsStorage;
  if (!connectionString) throw safeCode("PUBLISHING_STAGE_STORAGE_MISSING");
  const { BlobServiceClient } = require("@azure/storage-blob");
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(CONTAINER);
}

function isConflict(error) {
  return [409, 412].includes(error?.statusCode) ||
    ["BlobAlreadyExists", "ConditionNotMet"].includes(error?.code);
}

function isMissing(error) {
  return error?.statusCode === 404 || error?.code === "BlobNotFound";
}

async function readJournal(blob) {
  try {
    const properties = await blob.getProperties();
    const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } });
    return { value: JSON.parse(bytes.toString("utf8")), etag: properties.etag };
  } catch (error) {
    if (isMissing(error)) return { value: null, etag: null };
    throw error;
  }
}

function applyEvent(previous, event) {
  const journal = previous || {
    version: 1,
    titleId: event.titleId.toLowerCase(),
    stageId: event.stageId.toLowerCase(),
    stageCode: event.stageCode,
    executionId: event.executionId,
    phase: "WAITING",
    events: []
  };
  if (journal.titleId !== event.titleId.toLowerCase() ||
      journal.stageId !== event.stageId.toLowerCase() ||
      journal.stageCode !== event.stageCode || journal.executionId !== event.executionId) {
    throw safeCode("PUBLISHING_STAGE_JOURNAL_CORRELATION_MISMATCH");
  }
  if (journal.events.some((item) => item.idempotencyKey === event.idempotencyKey)) {
    return { journal, duplicate: true };
  }
  if (journal.events.length >= 1000) throw safeCode("PUBLISHING_STAGE_JOURNAL_CAPACITY_REACHED");

  const allowed = {
    TITLE_CREATED: ["WAITING"], STAGE_ELIGIBLE: ["WAITING"],
    STAGE_STARTED: ["ELIGIBLE", "RETRY_WAIT"], STAGE_BLOCKED: ["ELIGIBLE", "RUNNING"],
    HUMAN_ACTION_REQUIRED: ["RUNNING"], HUMAN_ACTION_COMPLETED: ["HUMAN_HOLD"],
    EXTERNAL_ACTION_REQUIRED: ["RUNNING"], EXTERNAL_ACTION_COMPLETED: ["EXTERNAL_HOLD"],
    STAGE_COMPLETED: ["RUNNING"], STAGE_FAILED: ["RUNNING", "ELIGIBLE"],
    STAGE_RETRY_SCHEDULED: ["FAILED"],
    STAGE_RECONCILED: ["FAILED", "RETRY_WAIT", "HUMAN_HOLD", "EXTERNAL_HOLD"],
    TITLE_ADVANCED: ["COMPLETED"], PUBLICATION_CONFIRMED: ["RUNNING"]
  };
  if (!allowed[event.eventType].includes(journal.phase)) {
    throw safeCode("PUBLISHING_STAGE_INVALID_TRANSITION");
  }
  const nextPhase = {
    STAGE_ELIGIBLE: "ELIGIBLE", STAGE_STARTED: "RUNNING", STAGE_BLOCKED: "FAILED",
    HUMAN_ACTION_REQUIRED: "HUMAN_HOLD", HUMAN_ACTION_COMPLETED: "RUNNING",
    EXTERNAL_ACTION_REQUIRED: "EXTERNAL_HOLD", EXTERNAL_ACTION_COMPLETED: "RUNNING",
    STAGE_COMPLETED: "COMPLETED", STAGE_FAILED: "FAILED",
    STAGE_RETRY_SCHEDULED: "RETRY_WAIT", TITLE_ADVANCED: "ADVANCED"
  }[event.eventType] || journal.phase;
  return { duplicate: false, journal: {
    ...journal, phase: nextPhase, updatedAt: event.timestamp,
    events: [...journal.events, event]
  } };
}

async function persistStageEvent(event, deps = {}) {
  validateEvent(event);
  if (typeof deps.authorize !== "function") throw safeCode("PUBLISHING_STAGE_AUTHORITY_READER_MISSING");
  const container = createJournalClient(deps);
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(blobName(event));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let snapshot;
    try { snapshot = await readJournal(blob); }
    catch (error) { if (isConflict(error)) continue; throw error; }
    const applied = applyEvent(snapshot.value, event);
    if (applied.duplicate) return { status: "DUPLICATE", phase: applied.journal.phase, blobName: blobName(event) };
    const authority = await deps.authorize(event);
    if (authority?.titleId?.toLowerCase() !== event.titleId.toLowerCase() ||
        authority?.stageId?.toLowerCase() !== event.stageId.toLowerCase() ||
        authority?.stageCode !== event.stageCode || authority?.current !== true) {
      throw safeCode("PUBLISHING_STAGE_LIVE_AUTHORITY_MISMATCH");
    }
    if (["STAGE_COMPLETED", "TITLE_ADVANCED", "PUBLICATION_CONFIRMED"].includes(event.eventType)) {
      if (typeof deps.verifyCompletion !== "function" || await deps.verifyCompletion(event, authority) !== true) {
        throw safeCode("PUBLISHING_STAGE_COMPLETION_NOT_VERIFIED");
      }
    }
    if (["HUMAN_ACTION_COMPLETED", "EXTERNAL_ACTION_COMPLETED"].includes(event.eventType)) {
      if (typeof deps.verifyGate !== "function" || await deps.verifyGate(event, authority) !== true) {
        throw safeCode("PUBLISHING_STAGE_GATE_NOT_VERIFIED");
      }
    }
    try {
      await blob.uploadData(Buffer.from(JSON.stringify(applied.journal)), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        conditions: snapshot.etag ? { ifMatch: snapshot.etag } : { ifNoneMatch: "*" }
      });
      return { status: "RECORDED", phase: applied.journal.phase, blobName: blobName(event) };
    } catch (error) { if (!isConflict(error)) throw error; }
  }
  throw safeCode("PUBLISHING_STAGE_CONCURRENT_UPDATE_RETRY_EXHAUSTED");
}

module.exports = { applyEvent, blobName, keyFor, persistStageEvent, validateEvent };
