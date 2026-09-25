"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { budgetDecision, reserve, finalize } = require("../../src/shadow/stage0BudgetPolicy");

const id = "00000000-0000-4000-8000-000000000001";
const now = "2026-09-24T12:00:00Z";

test("hard ceiling includes outstanding reservations", () => {
  assert.equal(budgetDecision({ spentCents: 2400, reservedCents: 90, projectedCents: 11 }).allowed, false);
  assert.equal(budgetDecision({ spentCents: 2400, reservedCents: 90, projectedCents: 10 }).allowed, true);
});

test("same source event and policy cannot reserve or infer twice", () => {
  const first = reserve(null, { sourceEventId: id, policyVersion: "v1", projectedCents: 12, now });
  assert.equal(first.outcome, "RESERVED");
  const replay = reserve(first.state, { sourceEventId: id, policyVersion: "v1", projectedCents: 12, now });
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  assert.deepEqual(replay.state, first.state);
});

test("budget denial is durable and replay is still denied", () => {
  const state = { month: "2026-09", spentCents: 2490, reservedCents: 0, events: {} };
  const denied = reserve(state, { sourceEventId: id, policyVersion: "v1", projectedCents: 11, now });
  assert.equal(denied.outcome, "BUDGET_DENIED");
  assert.equal(denied.state.reservedCents, 0);
  assert.equal(reserve(denied.state, { sourceEventId: id, policyVersion: "v1", projectedCents: 11, now }).event.status, "BUDGET_DENIED");
});

test("actual cost releases the unused reservation without permitting overspend", () => {
  const reserved = reserve(null, { sourceEventId: id, policyVersion: "v1", projectedCents: 20, now });
  const final = finalize(reserved.state, { sourceEventId: id, policyVersion: "v1", actualCents: 7, status: "SUCCEEDED", now });
  assert.equal(final.spentCents, 7);
  assert.equal(final.reservedCents, 0);
  assert.throws(() => finalize(reserved.state, { sourceEventId: id, policyVersion: "v1", actualCents: 21, status: "SUCCEEDED", now }), /EXCEEDS_RESERVATION/);
});

test("evaluation failure settles provider cost and releases its reservation", () => {
  const reserved = reserve(null, { sourceEventId: id, policyVersion: "v1", projectedCents: 20, now });
  const final = finalize(reserved.state, { sourceEventId: id, policyVersion: "v1",
    actualCents: 7, status: "EVALUATION_FAILED", now });
  assert.equal(final.spentCents, 7);
  assert.equal(final.reservedCents, 0);
  assert.equal(Object.values(final.events)[0].status, "EVALUATION_FAILED");
});

test("completion after month rollover settles the original reservation", () => {
  const reserved = reserve(null, { sourceEventId: id, policyVersion: "v1", projectedCents: 20, now });
  const completedAt = "2026-10-01T00:01:00Z";
  const final = finalize(reserved.state, {
    sourceEventId: id, policyVersion: "v1", actualCents: 7,
    status: "SUCCEEDED", now: completedAt,
  });
  assert.equal(final.month, "2026-09");
  assert.equal(final.spentCents, 7);
  assert.equal(final.reservedCents, 0);
});

test("invalid or zero projections fail closed", () => {
  assert.throws(() => budgetDecision({ spentCents: 0, reservedCents: 0, projectedCents: 0 }));
  assert.throws(() => reserve(null, { sourceEventId: "bad", policyVersion: "v1", projectedCents: 1, now }));
});
