"use strict";

const { persistStageEvent, validateEvent } = require("./stageRuntimeJournal");

const ACTIONS = Object.freeze({
  STAGE_ELIGIBLE: "dispatchStage",
  HUMAN_ACTION_COMPLETED: "dispatchStage",
  EXTERNAL_ACTION_COMPLETED: "dispatchStage",
  STAGE_RETRY_SCHEDULED: "scheduleRetry",
  STAGE_COMPLETED: "advanceStage"
});

function safeCode(code) {
  return Object.assign(new Error(code), { safeCode: code });
}

function matchesExecution(outcome, event) {
  return outcome?.accepted === true &&
    outcome.idempotencyKey === event.idempotencyKey &&
    outcome.titleId?.toLowerCase() === event.titleId.toLowerCase() &&
    outcome.stageId?.toLowerCase() === event.stageId.toLowerCase() &&
    outcome.executionId === event.executionId;
}

async function processStageEvent(event, deps = {}) {
  validateEvent(event);
  const action = ACTIONS[event.eventType];
  if (action && typeof deps[action] !== "function") {
    throw safeCode(`PUBLISHING_STAGE_${action.toUpperCase()}_ADAPTER_MISSING`);
  }

  const recorded = await (deps.persistEvent || persistStageEvent)(event, deps);
  if (!action) return { ...recorded, action: "JOURNAL_ONLY" };

  // A replay must invoke the same idempotent adapter: the first attempt may have
  // recorded the event but failed before its action was durably accepted.
  const outcome = await deps[action](event);
  if (!matchesExecution(outcome, event)) {
    throw safeCode("PUBLISHING_STAGE_ACTION_NOT_CORRELATED_OR_ACCEPTED");
  }
  return { ...recorded, action: "ACCEPTED" };
}

module.exports = { ACTIONS, processStageEvent };
