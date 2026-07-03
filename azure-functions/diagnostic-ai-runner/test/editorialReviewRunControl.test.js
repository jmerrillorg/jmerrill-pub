"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { DIAGNOSTIC_STATUS } = require("../src/editorial/preContractEditorialReviewGate");
const {
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
} = require("../src/editorial/editorialReviewRunControl");

const READY_RECORD = Object.freeze({
  intakeReferenceCode: "JMP-INT-202607-0W5PTQ",
  diagnosticId: "18cb5c53-6076-f111-ab0f-000d3a9eacee",
  intakeCreated: true,
  workspaceCreated: true,
  stage0HandoffCreated: true,
  manuscriptReceived: true,
  manuscriptUrl: "https://contoso.sharepoint.com/manuscript.docx",
  workspaceUrl: "https://contoso.sharepoint.com/workspace",
  diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
  reviewRunStatus: null,
  authorRecommendationSent: false
});

const MOVEMENT_RECORD = Object.freeze({
  intakeReferenceCode: READY_RECORD.intakeReferenceCode,
  diagnosticId: READY_RECORD.diagnosticId,
  workspaceUrl: READY_RECORD.workspaceUrl,
  currentWorkspaceStage: WORKSPACE_STAGE.INQUIRY,
  targetWorkspaceStage: WORKSPACE_STAGE.MANUSCRIPT_REVIEW,
  editorialReviewComplete: true,
  publisherReviewComplete: true,
  recommendationApprovedOrSent: true,
  dataverseStatusUpdated: true,
  transitionLogged: true,
  sharePointMoveSucceeded: false,
  dataverseWorkspaceWritebackComplete: false
});

describe("editorial review run control readiness", () => {
  test("marks a certified /join intake ready for Editorial Review", () => {
    const result = evaluateEditorialReviewReadiness(READY_RECORD);
    assert.equal(result.ready, true);
    assert.equal(result.status, REVIEW_RUN_STATUS.READY_FOR_EDITORIAL_REVIEW);
    assert.equal(result.canRunNow, true);
    assert.equal(result.canSchedule, true);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.blocking, []);
  });

  test("waits for author when manuscript is missing", () => {
    const result = evaluateEditorialReviewReadiness({
      ...READY_RECORD,
      manuscriptReceived: false,
      manuscriptUrl: ""
    });
    assert.equal(result.ready, false);
    assert.equal(result.status, REVIEW_RUN_STATUS.WAITING_FOR_AUTHOR);
    assert.match(result.missing.join(","), /manuscriptReceived/);
  });

  test("blocks duplicate runs once Publisher Approval Required exists", () => {
    const result = evaluateEditorialReviewReadiness({
      ...READY_RECORD,
      reviewRunStatus: REVIEW_RUN_STATUS.PUBLISHER_APPROVAL_REQUIRED
    });
    assert.equal(result.ready, false);
    assert.equal(result.status, REVIEW_RUN_STATUS.HOLD_EXCEPTION);
    assert.deepEqual(result.blocking, ["EDITORIAL_REVIEW_ALREADY_RUNNING_OR_COMPLETE"]);
  });

  test("blocks if author recommendation was already sent", () => {
    const result = evaluateEditorialReviewReadiness({
      ...READY_RECORD,
      authorRecommendationSent: true
    });
    assert.equal(result.ready, false);
    assert.ok(result.blocking.includes("AUTHOR_RECOMMENDATION_ALREADY_SENT"));
  });
});

describe("editorial review scheduling", () => {
  test("schedules ready records for 10:00 AM the next business day", () => {
    const plan = planEditorialReviewSchedule(READY_RECORD, {
      now: new Date("2026-07-02T15:00:00Z"),
      timeZone: "America/New_York"
    });
    assert.equal(plan.scheduled, true);
    assert.equal(plan.status, REVIEW_RUN_STATUS.SCHEDULED);
    assert.equal(new Date(plan.scheduledFor).getHours(), 10);
  });

  test("skips weekends when computing next business day", () => {
    const scheduled = nextBusinessDayAtTen(new Date("2026-07-03T18:00:00Z"), "America/New_York");
    assert.equal(scheduled.getDay(), 1);
    assert.equal(scheduled.getHours(), 10);
  });

  test("runs scheduled record only when due", () => {
    const due = shouldRunScheduledEditorialReview({
      ...READY_RECORD,
      scheduledFor: "2026-07-06T10:00:00.000Z"
    }, new Date("2026-07-06T10:00:01.000Z"));
    assert.equal(due.run, true);

    const early = shouldRunScheduledEditorialReview({
      ...READY_RECORD,
      scheduledFor: "2026-07-06T10:00:00.000Z"
    }, new Date("2026-07-06T09:59:59.000Z"));
    assert.equal(early.run, false);
    assert.equal(early.reason, "SCHEDULE_NOT_DUE");
  });
});

describe("Run Editorial Review Now action", () => {
  test("accepts ready records and cancels the scheduled run", () => {
    const result = evaluateRunNowRequest({
      ...READY_RECORD,
      scheduledFor: "2026-07-06T10:00:00.000Z"
    });
    assert.equal(result.accepted, true);
    assert.equal(result.status, REVIEW_RUN_STATUS.RUNNING);
    assert.equal(result.cancelScheduledRun, true);
  });

  test("does not accept unready records", () => {
    const result = evaluateRunNowRequest({
      ...READY_RECORD,
      manuscriptReceived: false
    });
    assert.equal(result.accepted, false);
    assert.equal(result.status, REVIEW_RUN_STATUS.WAITING_FOR_AUTHOR);
  });
});

describe("workspace movement gate", () => {
  test("holds the workspace in 00_Inquiry while Editorial Review is running or awaiting approval", () => {
    const result = evaluateWorkspaceMovementGate({
      ...MOVEMENT_RECORD,
      editorialReviewComplete: false,
      publisherReviewComplete: false,
      recommendationApprovedOrSent: false
    });
    assert.equal(result.moveAllowed, false);
    assert.equal(result.status, WORKSPACE_MOVEMENT_STATUS.HOLD_CURRENT_STAGE);
    assert.equal(result.currentWorkspaceStage, WORKSPACE_STAGE.INQUIRY);
    assert.ok(result.blocking.includes("EDITORIAL_REVIEW_NOT_COMPLETE"));
    assert.ok(result.blocking.includes("PUBLISHER_REVIEW_NOT_COMPLETE"));
    assert.ok(result.blocking.includes("RECOMMENDATION_NOT_APPROVED_OR_SENT"));
  });

  test("allows movement to 01_Manuscript_Review only after all exit-gate prerequisites are satisfied", () => {
    const result = evaluateWorkspaceMovementGate(MOVEMENT_RECORD);
    assert.equal(result.moveAllowed, true);
    assert.equal(result.status, WORKSPACE_MOVEMENT_STATUS.READY_TO_MOVE);
    assert.equal(result.currentWorkspaceStage, WORKSPACE_STAGE.INQUIRY);
    assert.equal(result.targetWorkspaceStage, WORKSPACE_STAGE.MANUSCRIPT_REVIEW);
    assert.deepEqual(result.blocking, []);
    assert.deepEqual(result.missing, []);
  });

  test("does not report complete until SharePoint move and Dataverse writeback both finish", () => {
    const partial = evaluateWorkspaceMovementGate({
      ...MOVEMENT_RECORD,
      sharePointMoveSucceeded: true,
      dataverseWorkspaceWritebackComplete: false
    });
    assert.equal(partial.moveAllowed, false);
    assert.ok(partial.blocking.includes("DATAVERSE_WORKSPACE_WRITEBACK_NOT_COMPLETE"));

    const complete = evaluateWorkspaceMovementGate({
      ...MOVEMENT_RECORD,
      currentWorkspaceStage: WORKSPACE_STAGE.MANUSCRIPT_REVIEW,
      sharePointMoveSucceeded: true,
      dataverseWorkspaceWritebackComplete: true
    });
    assert.equal(complete.movementComplete, true);
    assert.equal(complete.status, WORKSPACE_MOVEMENT_STATUS.MOVEMENT_COMPLETE);
  });
});

describe("execution log payload", () => {
  test("contains safe run-control evidence and no author-send claim", () => {
    const payload = buildEditorialReviewRunControlExecutionLogPayload({
      intakeReferenceCode: READY_RECORD.intakeReferenceCode,
      diagnosticId: READY_RECORD.diagnosticId,
      action: REVIEW_RUN_ACTION.RUN_NOW_REQUESTED,
      status: REVIEW_RUN_STATUS.RUNNING,
      message: "Run Editorial Review Now accepted."
    });
    assert.equal(payload.jm1_sourceentity, "jm1pub_editorialdiagnostic");
    assert.match(payload.jm1_actiondescription, /No author recommendation sent/);
    assert.match(payload.jm1_actiondescription, /No raw diagnostic scores/);
  });
});
