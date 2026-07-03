"use strict";

/**
 * Editorial Review run control for PROGRAM-002.
 *
 * This module owns readiness, scheduling, duplicate prevention, and
 * safe event payloads for moving a certified /join intake into Stage 3
 * Editorial Review. It deliberately does not implement editorial
 * methodology, send author recommendations, create Opportunities,
 * touch Stripe/Business Central/royalties, or bypass the existing
 * JM Editorial Doctrine runner.
 */

const { DIAGNOSTIC_STATUS } = require("./preContractEditorialReviewGate");

const REVIEW_RUN_STATUS = Object.freeze({
  WAITING_FOR_AUTHOR: "Waiting for Author",
  READY_FOR_EDITORIAL_REVIEW: "Ready for Editorial Review",
  SCHEDULED: "Scheduled",
  RUNNING: "Running",
  PUBLISHER_APPROVAL_REQUIRED: "Publisher Approval Required",
  RECOMMENDATION_SENT: "Recommendation Sent",
  HOLD_EXCEPTION: "Hold / Exception"
});

const REVIEW_RUN_ACTION = Object.freeze({
  READINESS_EVALUATED: "EDITORIAL_REVIEW_READINESS_EVALUATED",
  SCHEDULED: "EDITORIAL_REVIEW_SCHEDULED",
  RUN_NOW_REQUESTED: "EDITORIAL_REVIEW_RUN_NOW_REQUESTED",
  RUN_STARTED: "EDITORIAL_REVIEW_RUN_STARTED",
  RUN_BLOCKED: "EDITORIAL_REVIEW_RUN_BLOCKED",
  PUBLISHER_APPROVAL_REQUIRED: "EDITORIAL_REVIEW_PUBLISHER_APPROVAL_REQUIRED"
});

const WORKSPACE_STAGE = Object.freeze({
  INQUIRY: "00_Inquiry",
  MANUSCRIPT_REVIEW: "01_Manuscript_Review"
});

const WORKSPACE_MOVEMENT_STATUS = Object.freeze({
  HOLD_CURRENT_STAGE: "Hold Current Stage",
  READY_TO_MOVE: "Ready To Move",
  MOVEMENT_COMPLETE: "Movement Complete"
});

const READY_DIAGNOSTIC_STATUSES = new Set([
  DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW
]);

const TERMINAL_OR_ACTIVE_STATUSES = new Set([
  REVIEW_RUN_STATUS.RUNNING,
  REVIEW_RUN_STATUS.PUBLISHER_APPROVAL_REQUIRED,
  REVIEW_RUN_STATUS.RECOMMENDATION_SENT
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isUsableHttpsUrl(value) {
  const text = normalizeString(value);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function nextBusinessDayAtTen(now = new Date(), timeZone = "America/New_York") {
  const local = new Date(now.toLocaleString("en-US", { timeZone }));
  local.setDate(local.getDate() + 1);
  local.setHours(10, 0, 0, 0);

  while (local.getDay() === 0 || local.getDay() === 6) {
    local.setDate(local.getDate() + 1);
  }

  return local;
}

function evaluateEditorialReviewReadiness(record = {}) {
  const missing = [];
  const blocking = [];

  const intakeReferenceCode = normalizeString(record.intakeReferenceCode);
  const diagnosticId = normalizeString(record.diagnosticId);
  const manuscriptUrl = normalizeString(record.manuscriptUrl || record.manuscriptAssetUrl);
  const workspaceUrl = normalizeString(record.workspaceUrl);
  const diagnosticStatus = record.diagnosticStatus;
  const currentRunStatus = normalizeString(record.reviewRunStatus);

  if (!intakeReferenceCode) missing.push("intakeReferenceCode");
  if (!diagnosticId) missing.push("diagnosticId");
  if (!record.intakeCreated) missing.push("intakeCreated");
  if (!record.workspaceCreated) missing.push("workspaceCreated");
  if (!record.stage0HandoffCreated) missing.push("stage0HandoffCreated");
  if (!record.manuscriptReceived) missing.push("manuscriptReceived");
  if (!isUsableHttpsUrl(manuscriptUrl)) missing.push("manuscriptUrl");
  if (!isUsableHttpsUrl(workspaceUrl)) missing.push("workspaceUrl");

  if (!READY_DIAGNOSTIC_STATUSES.has(diagnosticStatus)) {
    blocking.push("DIAGNOSTIC_NOT_AWAITING_PUBLISHER_REVIEW");
  }
  if (TERMINAL_OR_ACTIVE_STATUSES.has(currentRunStatus)) {
    blocking.push("EDITORIAL_REVIEW_ALREADY_RUNNING_OR_COMPLETE");
  }
  if (record.authorRecommendationSent === true) {
    blocking.push("AUTHOR_RECOMMENDATION_ALREADY_SENT");
  }

  const ready = missing.length === 0 && blocking.length === 0;

  return {
    ready,
    status: ready ? REVIEW_RUN_STATUS.READY_FOR_EDITORIAL_REVIEW :
      (record.manuscriptReceived ? REVIEW_RUN_STATUS.HOLD_EXCEPTION : REVIEW_RUN_STATUS.WAITING_FOR_AUTHOR),
    intakeReferenceCode: intakeReferenceCode || null,
    diagnosticId: diagnosticId || null,
    missing,
    blocking,
    canRunNow: ready,
    canSchedule: ready
  };
}

function planEditorialReviewSchedule(record = {}, options = {}) {
  const readiness = evaluateEditorialReviewReadiness(record);
  if (!readiness.ready) {
    return {
      scheduled: false,
      status: readiness.status,
      reason: "NOT_READY",
      readiness
    };
  }

  return {
    scheduled: true,
    status: REVIEW_RUN_STATUS.SCHEDULED,
    scheduledFor: (options.scheduledFor || nextBusinessDayAtTen(options.now, options.timeZone)).toISOString(),
    readiness
  };
}

function shouldRunScheduledEditorialReview(record = {}, now = new Date()) {
  const readiness = evaluateEditorialReviewReadiness(record);
  if (!readiness.ready) return { run: false, reason: "NOT_READY", readiness };

  const scheduledFor = record.scheduledFor ? new Date(record.scheduledFor) : null;
  if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    return { run: false, reason: "SCHEDULE_MISSING", readiness };
  }
  if (scheduledFor > now) {
    return { run: false, reason: "SCHEDULE_NOT_DUE", readiness };
  }

  return { run: true, reason: "SCHEDULE_DUE", readiness };
}

function evaluateRunNowRequest(record = {}) {
  const readiness = evaluateEditorialReviewReadiness(record);
  if (!readiness.ready) {
    return {
      accepted: false,
      status: readiness.status,
      reason: "NOT_READY",
      cancelScheduledRun: false,
      readiness
    };
  }

  return {
    accepted: true,
    status: REVIEW_RUN_STATUS.RUNNING,
    reason: "RUN_NOW_ACCEPTED",
    cancelScheduledRun: Boolean(record.scheduledFor),
    readiness
  };
}

function evaluateWorkspaceMovementGate(record = {}) {
  const missing = [];
  const blocking = [];

  const intakeReferenceCode = normalizeString(record.intakeReferenceCode);
  const diagnosticId = normalizeString(record.diagnosticId);
  const currentWorkspaceStage = normalizeString(record.currentWorkspaceStage || record.workspaceStage || WORKSPACE_STAGE.INQUIRY);
  const targetWorkspaceStage = normalizeString(record.targetWorkspaceStage || WORKSPACE_STAGE.MANUSCRIPT_REVIEW);
  const workspaceUrl = normalizeString(record.workspaceUrl);
  const moveAlreadyCompleted = record.sharePointMoveSucceeded === true && record.dataverseWorkspaceWritebackComplete === true;

  if (!intakeReferenceCode) missing.push("intakeReferenceCode");
  if (!diagnosticId) missing.push("diagnosticId");
  if (!isUsableHttpsUrl(workspaceUrl)) missing.push("workspaceUrl");

  if (!moveAlreadyCompleted && currentWorkspaceStage !== WORKSPACE_STAGE.INQUIRY) {
    blocking.push("WORKSPACE_NOT_IN_INQUIRY_STAGE");
  }
  if (targetWorkspaceStage !== WORKSPACE_STAGE.MANUSCRIPT_REVIEW) {
    blocking.push("TARGET_STAGE_NOT_MANUSCRIPT_REVIEW");
  }
  if (record.editorialReviewComplete !== true) {
    blocking.push("EDITORIAL_REVIEW_NOT_COMPLETE");
  }
  if (record.publisherReviewComplete !== true) {
    blocking.push("PUBLISHER_REVIEW_NOT_COMPLETE");
  }
  if (record.recommendationApprovedOrSent !== true) {
    blocking.push("RECOMMENDATION_NOT_APPROVED_OR_SENT");
  }
  if (record.dataverseStatusUpdated !== true) {
    blocking.push("DATAVERSE_STATUS_NOT_UPDATED");
  }
  if (record.transitionLogged === false) {
    blocking.push("TRANSITION_NOT_LOGGED");
  }
  if (record.sharePointMoveSucceeded === true && record.dataverseWorkspaceWritebackComplete !== true) {
    blocking.push("DATAVERSE_WORKSPACE_WRITEBACK_NOT_COMPLETE");
  }

  const readyToMove = missing.length === 0 &&
    blocking.length === 0 &&
    record.sharePointMoveSucceeded !== true &&
    record.dataverseWorkspaceWritebackComplete !== true;

  const movementComplete = missing.length === 0 &&
    blocking.length === 0 &&
    moveAlreadyCompleted;

  return {
    moveAllowed: readyToMove,
    movementComplete,
    status: movementComplete
      ? WORKSPACE_MOVEMENT_STATUS.MOVEMENT_COMPLETE
      : (readyToMove ? WORKSPACE_MOVEMENT_STATUS.READY_TO_MOVE : WORKSPACE_MOVEMENT_STATUS.HOLD_CURRENT_STAGE),
    intakeReferenceCode: intakeReferenceCode || null,
    diagnosticId: diagnosticId || null,
    currentWorkspaceStage,
    targetWorkspaceStage,
    missing,
    blocking,
    requiredExitGate: [
      "Editorial Review complete",
      "Publisher review complete",
      "Recommendation approved/sent",
      "Dataverse status updated",
      "Transition logged where practical",
      "SharePoint move succeeds",
      "Dataverse workspace URL/folder ID/stage written back"
    ]
  };
}

function buildEditorialReviewRunControlExecutionLogPayload({
  intakeReferenceCode,
  diagnosticId,
  action,
  status,
  message,
  occurredAt = new Date().toISOString()
}) {
  return {
    jm1_name: `EDITORIAL-REVIEW-RUN-CONTROL-${diagnosticId || intakeReferenceCode}`,
    jm1_actiontype: action,
    jm1_actiondescription: [
      `Editorial Review run-control event for intake ${intakeReferenceCode}.`,
      `Status: ${status}.`,
      message,
      "No author recommendation sent by this event.",
      "No raw diagnostic scores, manuscript text, prompt body, model output, secrets, tokens, or headers stored.",
      "No Stripe, Business Central, royalty, payment, public marketing, or production action occurred."
    ].filter(Boolean).join(" ").slice(0, 1000),
    jm1_agentname: "jm1-diagnostic-ai-runner",
    jm1_agentmodel: "editorial-review-run-control",
    jm1_startedon: occurredAt,
    jm1_completedon: occurredAt,
    jm1_sourceentity: "jm1pub_editorialdiagnostic",
    jm1_sourcerecordid: diagnosticId || null
  };
}

module.exports = {
  REVIEW_RUN_STATUS,
  REVIEW_RUN_ACTION,
  evaluateEditorialReviewReadiness,
  planEditorialReviewSchedule,
  shouldRunScheduledEditorialReview,
  evaluateRunNowRequest,
  evaluateWorkspaceMovementGate,
  buildEditorialReviewRunControlExecutionLogPayload,
  nextBusinessDayAtTen,
  WORKSPACE_STAGE,
  WORKSPACE_MOVEMENT_STATUS
};
