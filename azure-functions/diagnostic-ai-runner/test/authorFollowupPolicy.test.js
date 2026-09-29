"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  CADENCE_DAYS,
  STAGE_DEFAULTS,
  addEasternCalendarDays,
  evaluateAuthorFollowup
} = require("../src/author/authorFollowupPolicy");

const request = Object.freeze({
  titleId: "title-1",
  engagementId: "engagement-1",
  authorId: "author-1",
  stageId: "stage-7",
  stageCode: "07_DEVELOPMENTAL_EDITING",
  actionType: "DEVELOPMENTAL_EDIT_REVIEW",
  actionRequestId: "request-1",
  requestedAt: "2026-09-01T17:00:00.000Z",
  dueAt: "2026-09-15T17:00:00.000Z",
  delivered: true
});

const state = Object.freeze({ currentStageId: "stage-7", currentActionRequestId: "request-1", nextActionOwner: "AUTHOR", responses: [] });

function at(days) {
  return new Date(Date.parse(request.requestedAt) + days * 86400000);
}

test("every governed pipeline stage declares a default without author-action inference", () => {
  assert.equal(Object.keys(STAGE_DEFAULTS).length, 16);
  assert.deepEqual(CADENCE_DAYS.STANDARD_ACTION, [0, 3, 7, 14]);
  assert.deepEqual(CADENCE_DAYS.LAUNCH_CRITICAL, [0, 1, 3, 5]);
  assert.equal(evaluateAuthorFollowup({ ...request, actionType: "UNKNOWN" }, state, at(7)).status, "DENIED");
});

test("standard action fires on days 3 and 7 with distinct semantic keys", () => {
  const day3 = evaluateAuthorFollowup(request, state, at(3));
  const day7 = evaluateAuthorFollowup(request, state, at(7));
  assert.equal(day3.status, "DUE");
  assert.equal(day3.position, 3);
  assert.equal(day7.status, "DUE");
  assert.equal(day7.position, 7);
  assert.notEqual(day3.idempotencyKey, day7.idempotencyKey);
});

test("qualified current response cancels, but an unrelated or nonqualified reply does not", () => {
  const response = {
    actionRequestId: request.actionRequestId,
    titleId: request.titleId,
    engagementId: request.engagementId,
    authorId: request.authorId,
    stageId: request.stageId,
    receivedAt: "2026-09-06T17:00:00.000Z",
    qualified: true
  };
  assert.equal(evaluateAuthorFollowup(request, { ...state, responses: [response] }, at(7)).status, "CANCELLED");
  assert.equal(evaluateAuthorFollowup(request, { ...state, responses: [{ ...response, titleId: "other" }] }, at(7)).status, "DUE");
  assert.equal(evaluateAuthorFollowup(request, { ...state, responses: [{ ...response, qualified: false }] }, at(7)).status, "DUE");
  assert.equal(evaluateAuthorFollowup(request, { ...state, responses: [{ ...response, receivedAt: at(8).toISOString() }] }, at(7)).status, "DUE");
});

test("publisher ownership, stale stage, and undelivered requests cannot send", () => {
  assert.equal(evaluateAuthorFollowup(request, { ...state, nextActionOwner: "JM_PUBLISHING" }, at(7)).status, "DENIED");
  assert.equal(evaluateAuthorFollowup(request, { ...state, currentStageId: "stage-8" }, at(7)).status, "CANCELLED");
  assert.equal(evaluateAuthorFollowup({ ...request, delivered: false }, state, at(7)).status, "DENIED");
  assert.equal(evaluateAuthorFollowup({ ...request, dueAt: null }, state, at(7)).status, "DENIED");
  assert.equal(evaluateAuthorFollowup({ ...request, actionType: "FINAL_RELEASE_APPROVAL" }, state, at(7)).status, "DENIED");
  assert.equal(evaluateAuthorFollowup(request, { ...state, currentActionRequestId: "" }, at(7)).reason, "CURRENT_ACTION_REQUEST_UNPROVEN");
  assert.equal(evaluateAuthorFollowup(request, { ...state, deliveryUnverified: true }, at(7)).reason, "PREVIOUS_DELIVERY_UNVERIFIED");
});

test("replayed timer and backlog select only the current cadence position", () => {
  const first = evaluateAuthorFollowup(request, state, at(18));
  assert.equal(first.position, 14);
  assert.equal(evaluateAuthorFollowup(request, { ...state, sentKeys: [first.idempotencyKey] }, at(18)).status, "SKIP_DUPLICATE");
  assert.equal(evaluateAuthorFollowup(request, { ...state, reservedKeys: [first.idempotencyKey] }, at(18)).status, "SKIP_DUPLICATE");
});

test("Day 20 uses governed business-day count and does not change the action", () => {
  const result = evaluateAuthorFollowup(request, { ...state, elapsedBusinessDays: 20 }, at(30));
  assert.equal(result.day20Escalation, true);
  assert.equal(result.position, 14);
  assert.equal(result.releaseAtRisk, false);
});

test("launch-critical and production-blocking positions are tighter", () => {
  const launch = evaluateAuthorFollowup({ ...request, stageCode: "15_PUBLICATION", actionType: "FINAL_RELEASE_APPROVAL" }, state, at(1));
  const proof = evaluateAuthorFollowup({ ...request, stageCode: "11_INTERIOR_LAYOUT", actionType: "INTERIOR_PROOF_APPROVAL" }, state, at(2));
  assert.equal(launch.position, 1);
  assert.equal(proof.position, 2);
});

test("commercial actions route to the existing payment cadence", () => {
  const result = evaluateAuthorFollowup({ ...request, stageCode: "05_AGREEMENT_PAYMENT", actionType: "PAYMENT" }, state, at(7));
  assert.equal(result.status, "ROUTE_COMMERCIAL");
});

test("new request and stage change invalidate old semantic position", () => {
  const original = evaluateAuthorFollowup(request, state, at(3));
  const next = evaluateAuthorFollowup({ ...request, actionRequestId: "request-2" }, { ...state, currentActionRequestId: "request-2" }, at(3));
  assert.notEqual(original.idempotencyKey, next.idempotencyKey);
  assert.equal(evaluateAuthorFollowup(request, { ...state, currentStageId: "stage-8" }, at(3)).status, "CANCELLED");
  assert.equal(evaluateAuthorFollowup(request, { ...state, currentActionRequestId: "request-2" }, at(3)).reason, "ACTION_REQUEST_SUPERSEDED");
});

test("calendar-day positions preserve New York local time across daylight-saving changes", () => {
  const beforeFall = new Date("2026-10-31T21:00:00.000Z");
  const afterFall = addEasternCalendarDays(beforeFall, 3);
  assert.equal(afterFall.toISOString(), "2026-11-03T22:00:00.000Z");
  const fallRequest = { ...request, requestedAt: beforeFall.toISOString(), dueAt: "2026-11-15T22:00:00.000Z" };
  assert.equal(evaluateAuthorFollowup(fallRequest, state, new Date("2026-11-03T21:59:59.000Z")).status, "NOT_DUE");
  assert.equal(evaluateAuthorFollowup(fallRequest, state, afterFall).position, 3);
});
