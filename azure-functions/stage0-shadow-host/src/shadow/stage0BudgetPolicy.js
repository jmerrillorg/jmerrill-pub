"use strict";

const { createHash } = require("node:crypto");

const HARD_CEILING_CENTS = 2500;
const SOFT_TARGET_CENTS = 10;
const WORKLOAD = "STAGE_0_DIAGNOSTIC_SHADOW";

function eventKey(sourceEventId, policyVersion) {
  if (!/^[0-9a-f-]{36}$/i.test(sourceEventId || "") || !/^[A-Za-z0-9._-]+$/.test(policyVersion || "")) {
    throw new Error("INVALID_SHADOW_EVENT_IDENTITY");
  }
  return createHash("sha256")
    .update(`${sourceEventId.toLowerCase()}|${WORKLOAD}|${policyVersion}`)
    .digest("hex");
}

function monthKey(now) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_SHADOW_TIME");
  return date.toISOString().slice(0, 7);
}

function assertCents(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`INVALID_${name}`);
}

function budgetDecision({ spentCents, reservedCents, projectedCents }) {
  assertCents(spentCents, "SPEND");
  assertCents(reservedCents, "RESERVATION");
  assertCents(projectedCents, "PROJECTION");
  if (projectedCents === 0) throw new Error("ZERO_COST_PROJECTION_NOT_AUTHORIZED");
  const projectedMonthlyCents = spentCents + reservedCents + projectedCents;
  if (!Number.isSafeInteger(projectedMonthlyCents)) throw new Error("BUDGET_OVERFLOW");
  return {
    allowed: projectedMonthlyCents <= HARD_CEILING_CENTS,
    monthlyHardCeilingCents: HARD_CEILING_CENTS,
    perEventSoftTargetCents: SOFT_TARGET_CENTS,
    overSoftTarget: projectedCents > SOFT_TARGET_CENTS,
    currentMonthSpendCents: spentCents,
    reservedCents,
    projectedExecutionCents: projectedCents,
    projectedMonthlyCents,
    budgetRemainingCents: Math.max(0, HARD_CEILING_CENTS - spentCents - reservedCents),
  };
}

function reserve(state, { sourceEventId, policyVersion, projectedCents, now }) {
  const month = monthKey(now);
  const key = eventKey(sourceEventId, policyVersion);
  const current = state || { month, spentCents: 0, reservedCents: 0, events: {} };
  if (current.month !== month || !current.events || typeof current.events !== "object") {
    throw new Error("INVALID_MONTHLY_LEDGER");
  }
  if (Object.hasOwn(current.events, key)) {
    return { state: current, outcome: "IDEMPOTENT_REPLAY", event: current.events[key] };
  }
  const decision = budgetDecision({
    spentCents: current.spentCents,
    reservedCents: current.reservedCents,
    projectedCents,
  });
  const event = {
    sourceEventId: sourceEventId.toLowerCase(),
    policyVersion,
    workload: WORKLOAD,
    projectedCents,
    status: decision.allowed ? "RESERVED" : "BUDGET_DENIED",
    monthToDateCostCents: current.spentCents,
    budgetRemainingCents: decision.budgetRemainingCents,
    recordedAt: new Date(now).toISOString(),
  };
  const next = {
    ...current,
    reservedCents: current.reservedCents + (decision.allowed ? projectedCents : 0),
    events: { ...current.events, [key]: event },
  };
  return { state: next, outcome: event.status, event, decision };
}

function finalize(state, { sourceEventId, policyVersion, actualCents, status, now }) {
  assertCents(actualCents, "ACTUAL_COST");
  if (!new Set(["SUCCEEDED", "FAILED", "EVALUATION_FAILED"]).has(status)) throw new Error("INVALID_FINAL_STATUS");
  const key = eventKey(sourceEventId, policyVersion);
  const event = state.events?.[key];
  if (!event || event.status !== "RESERVED") throw new Error("EVENT_NOT_RESERVED");
  if (actualCents > event.projectedCents) throw new Error("ACTUAL_COST_EXCEEDS_RESERVATION");
  if (state.month !== monthKey(event.recordedAt) || new Date(now) < new Date(event.recordedAt)) {
    throw new Error("INVALID_RESERVATION_PERIOD");
  }
  const spentCents = state.spentCents + actualCents;
  const reservedCents = state.reservedCents - event.projectedCents;
  return {
    ...state,
    spentCents,
    reservedCents,
    events: {
      ...state.events,
      [key]: { ...event, status, actualCents,
        primaryInferenceCostCents: actualCents, evaluatorCostCents: 0,
        totalEventCostCents: actualCents, monthToDateCostCents: spentCents,
        budgetRemainingCents: HARD_CEILING_CENTS - spentCents - reservedCents,
        completedAt: new Date(now).toISOString() },
    },
  };
}

module.exports = { HARD_CEILING_CENTS, SOFT_TARGET_CENTS, WORKLOAD, eventKey, monthKey, budgetDecision, reserve, finalize };
