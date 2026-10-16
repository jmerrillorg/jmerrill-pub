"use strict";

// One private blob is the serialization point for the entire six-component batch.
// Reservations never expire: an uncertain provider attempt remains fully charged
// against available funds until independent usage reconciliation settles it.
const LIMIT = 50_000_000;
const AMENDMENT = Object.freeze({
  reference: "codex://threads/01a10bb0-3832-7e03-b3a7-2cc488694143/turns/01a14203-8fee-7102-894b-0dd296707beb",
  planSha256: "3e10ccdf20a07108e6169d23fb667c70afae9cda2204ca49c76fc3a29bfe0b0e",
  fromMicroUsd: LIMIT, toMicroUsd: 55_000_000
});
const RETRIES = 12;
const AMENDMENT_60 = Object.freeze({
  reference: "codex://threads/01a10bb0-3832-7e03-b3a7-2cc488694143/turns/01a143ef-5ecd-7a70-b5c6-44f7f040c282",
  planSha256: AMENDMENT.planSha256,
  fromMicroUsd: AMENDMENT.toMicroUsd, toMicroUsd: 60_000_000
});
const { valid: validBound } = require("./stage07CostBound");
const closure = require("./stage07ClosureAuthority");
const maximum = a => Math.max(a.reservedMicroUsd, a.conservativeMaximumMicroUsd || 0);
const reservationIdentity = a => ({ id:a.id, taskId:a.taskId, requestSha256:a.requestSha256,
  reservedMicroUsd:a.reservedMicroUsd, conservativeMaximumMicroUsd:a.conservativeMaximumMicroUsd, bound:a.bound });
const reservationHash = attempts => require("node:crypto").createHash("sha256").update(JSON.stringify(attempts.map(reservationIdentity))).digest("hex");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function integer(n) { return Number.isSafeInteger(n) && n >= 0; }
function validate(state) {
  const amended = [3, 4, 5].includes(state.version);
  if (amended && (!state.budgetAmendment || state.budgetAmendment.reference !== AMENDMENT.reference ||
      state.planSha256 !== AMENDMENT.planSha256 || state.budgetAmendment.fromMicroUsd !== LIMIT ||
      state.budgetAmendment.toMicroUsd !== AMENDMENT.toMicroUsd ||
      !/^[a-f0-9]{64}$/.test(state.budgetAmendment.preimageSha256 || ""))) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
  if ([4, 5].includes(state.version) && (!state.budgetAmendment60 ||
      state.budgetAmendment60.reference !== AMENDMENT_60.reference ||
      state.budgetAmendment60.planSha256 !== AMENDMENT_60.planSha256 ||
      state.budgetAmendment60.fromMicroUsd !== AMENDMENT_60.fromMicroUsd ||
      state.budgetAmendment60.toMicroUsd !== AMENDMENT_60.toMicroUsd ||
      !/^[a-f0-9]{64}$/.test(state.budgetAmendment60.preimageSha256 || ""))) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
  if (![1, 2, 3, 4, 5].includes(state.version) || state.limitMicroUsd !== (state.version >= 4 ? AMENDMENT_60.toMicroUsd : amended ? AMENDMENT.toMicroUsd : LIMIT) || state.maxAdditionalAttempts !== (state.version === 5 ? 13 : RETRIES) ||
      !state.approvalReference || !/^[a-f0-9]{64}$/.test(state.planSha256 || "") || !Array.isArray(state.attempts) ||
      !Array.isArray(state.taskIds) || !state.taskIds.length || new Set(state.taskIds).size !== state.taskIds.length) {
    deny("STAGE07_BUDGET_STATE_INVALID");
  }
  const ids = new Set();
  for (const a of state.attempts) {
    if (ids.has(a.id) || !a.id || !state.taskIds.includes(a.taskId) || !/^[a-f0-9]{64}$/.test(a.requestSha256 || "") ||
        !integer(a.reservedMicroUsd) || a.reservedMicroUsd < 1 ||
        !["RESERVED", "UNKNOWN", "SETTLED"].includes(a.status) ||
        (a.status === "SETTLED" && (!integer(a.actualMicroUsd) || !a.receiptReference ||
          !["SUCCESS", "FAILED"].includes(a.outcome)))) deny("STAGE07_BUDGET_STATE_INVALID");
    ids.add(a.id);
    if (a.conservativeMaximumMicroUsd !== undefined &&
        (!integer(a.conservativeMaximumMicroUsd) || a.conservativeMaximumMicroUsd < a.reservedMicroUsd ||
         !validBound(a.bound, a.requestSha256) || a.conservativeMaximumMicroUsd !== Math.max(a.reservedMicroUsd,a.bound.maximumMicroUsd))) deny("STAGE07_BUDGET_BOUND_INVALID");
    if (a.bound && (!validBound(a.bound,a.requestSha256) || maximum(a) < a.bound.maximumMicroUsd)) deny("STAGE07_BUDGET_BOUND_INVALID");
  }
  if (state.attempts.length - new Set(state.attempts.map(a => a.taskId)).size > state.maxAdditionalAttempts) deny("STAGE07_BUDGET_STATE_INVALID");
  if (state.version === 5) {
    const a = state.closureAmendment;
    if (!a || a.reference !== closure.reference || a.correctiveTask !== closure.correctiveTask ||
        !integer(a.baselineAttemptCount) || a.baselineAttemptCount > state.attempts.length ||
        !/^[a-f0-9]{64}$/.test(a.preimageSha256 || "") ||
        a.baselineReservationsSha256 !== reservationHash(state.attempts.slice(0,a.baselineAttemptCount))) deny("STAGE07_CLOSURE_AUTHORITY_INVALID");
    const added = state.attempts.slice(a.baselineAttemptCount);
    if (added.some(x => !closure.paidTasks.includes(x.taskId) || maximum(x) > closure.maximumMicroUsd) ||
        new Set(added.map(x=>x.taskId)).size !== added.length) deny("STAGE07_CLOSURE_AUTHORITY_INVALID");
  }
  return state;
}
function exposure(state) {
  validate(state);
  return state.attempts.reduce((sum, a) => sum + (a.status === "SETTLED" ? a.actualMicroUsd : maximum(a)), 0);
}
function createState({ approvalReference, planSha256, taskIds }) {
  return validate({ version: 2, limitMicroUsd: LIMIT, maxAdditionalAttempts: RETRIES,
    approvalReference, planSha256, taskIds, attempts: [] });
}
async function transact(store, change) {
  for (let i = 0; i < 30; i++) {
    const snapshot = await store.read();
    const next = structuredClone(validate(snapshot.value));
    const result = change(next);
    if (result.noWrite) return result;
    validate(next);
    if (await store.compareAndSwap(snapshot.etag, next)) return result;
  }
  deny("STAGE07_BUDGET_CONTENTION_HOLD");
}
async function reserve(store, input) {
  return transact(store, state => {
    if (state.tariffOrUsageViolation) deny("STAGE07_TARIFF_OR_USAGE_HOLD");
    if (input.requireVerifiedBounds && (![2, 3, 4, 5].includes(state.version) || !validBound(input.bound,input.requestSha256) || input.bound.maximumMicroUsd !== input.maxMicroUsd ||
        state.attempts.some(a => a.status !== "SETTLED" && !validBound(a.bound,a.requestSha256)))) deny("STAGE07_LEGACY_BOUND_RECONCILIATION_REQUIRED");
    if (input.planSha256 !== state.planSha256 || !input.id || !state.taskIds.includes(input.taskId) ||
        !/^[a-f0-9]{64}$/.test(input.requestSha256 || "") ||
        !integer(input.maxMicroUsd) || input.maxMicroUsd < 1) deny("STAGE07_RESERVATION_INVALID");
    const existing = state.attempts.find(a => a.id === input.id);
    if (existing) {
      if (existing.taskId !== input.taskId || existing.requestSha256 !== input.requestSha256 ||
          maximum(existing) !== input.maxMicroUsd) deny("STAGE07_ATTEMPT_ID_CONFLICT");
      return { noWrite: true, dispatch: false, replay: true, attempt: existing };
    }
    if (input.capacityTokens !== undefined) {
      if (!integer(input.capacityTokens) || input.capacityTokens < 1 || input.capacityTokens > 40192) deny("STAGE07_CAPACITY_BOUND_INVALID");
      const used = state.attempts.filter(a => a.reservedAtMs > Date.now() - 60000)
        .reduce((n, a) => n + (a.capacityTokens || 0), 0);
      if (used + input.capacityTokens > 80000) deny("STAGE07_CAPACITY_WAIT");
    }
    const prior = state.attempts.filter(a => a.taskId === input.taskId);
    if (prior.some(a => a.status !== "SETTLED")) deny("STAGE07_UNRESOLVED_ATTEMPT_HOLD");
    if (prior.some(a => a.outcome === "SUCCESS")) deny("STAGE07_COMPLETED_TASK_REPLAY_REQUIRED");
    const retries = state.attempts.length - new Set(state.attempts.map(a => a.taskId)).size;
    if (state.version === 5 && (!closure.paidTasks.includes(input.taskId) || input.maxMicroUsd > closure.maximumMicroUsd ||
        state.attempts.slice(state.closureAmendment.baselineAttemptCount).some(a=>a.taskId===input.taskId) ||
        (prior.length && input.taskId !== closure.correctiveTask))) deny("STAGE07_CLOSURE_SCOPE_DENIED");
    if (prior.length && retries >= state.maxAdditionalAttempts) deny("STAGE07_RETRY_LIMIT");
    if (exposure(state) + input.maxMicroUsd > state.limitMicroUsd) deny("STAGE07_SPEND_LIMIT");
    const attempt = { id: input.id, taskId: input.taskId, requestSha256: input.requestSha256,
      reservedMicroUsd: input.maxMicroUsd, status: "RESERVED",
      ...(input.bound ? { bound: input.bound } : {}),
      ...(input.capacityTokens !== undefined ? { capacityTokens: input.capacityTokens, reservedAtMs: Date.now() } : {}) };
    state.attempts.push(attempt);
    return { dispatch: true, attempt };
  });
}
async function settle(store, input) {
  return transact(store, state => {
    const a = state.attempts.find(a => a.id === input.id);
    if (!a || !integer(input.actualMicroUsd) || !input.receiptReference ||
        !["SUCCESS", "FAILED"].includes(input.outcome)) deny("STAGE07_SETTLEMENT_INVALID");
    if (a.status === "SETTLED") {
      if (a.actualMicroUsd !== input.actualMicroUsd || a.receiptReference !== input.receiptReference ||
          a.outcome !== input.outcome) deny("STAGE07_SETTLEMENT_CONFLICT");
      return { noWrite: true, replay: true };
    }
    // Preserve an unexpected overage as fact; every subsequent dispatch fails closed.
    Object.assign(a, { status: "SETTLED", actualMicroUsd: input.actualMicroUsd,
      receiptReference: input.receiptReference, outcome: input.outcome });
    if (input.actualMicroUsd > maximum(a)) state.tariffOrUsageViolation = true;
    return { settled: true, hold: Boolean(state.tariffOrUsageViolation) };
  });
}
async function reconcileBound(store, { id, request, authority }) {
  const bound = require("./stage07CostBound").quote(request, authority);
  return transact(store, state => {
    const a = state.attempts.find(attempt => attempt.id === id);
    if (!a || a.status === "SETTLED" || a.requestSha256 !== bound.requestSha256) deny("STAGE07_BOUND_RECONCILIATION_CONFLICT");
    if (a.bound) {
      if (JSON.stringify(a.bound) !== JSON.stringify(bound)) deny("STAGE07_BOUND_RECONCILIATION_CONFLICT");
      return { noWrite: true, replay: true, dispatch: false };
    }
    const conservativeMaximumMicroUsd = Math.max(a.reservedMicroUsd, bound.maximumMicroUsd);
    if (exposure(state) - maximum(a) + conservativeMaximumMicroUsd > state.limitMicroUsd) deny("STAGE07_SPEND_LIMIT");
    // Add an audited supplement; original reservation and unresolved state survive.
    if (state.version === 1) {
      state.reservationMigration = { fromVersion: 1, toVersion: 2, method: bound.method,
        preimageSha256: require("node:crypto").createHash("sha256").update(JSON.stringify(state)).digest("hex") };
      state.version = 2; // Older deployments reject this ledger rather than ignore the supplement.
    }
    Object.assign(a, { conservativeMaximumMicroUsd, bound });
    return { reconciled: true, dispatch: false, originalReservedMicroUsd: a.reservedMicroUsd, conservativeMaximumMicroUsd };
  });
}
async function initialize(blob, initial) {
  if (await blob.exists()) return;
  try {
    await blob.uploadData(Buffer.from(JSON.stringify(validate(initial))), {
      conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" }
    });
  } catch (error) {
    if (![409, 412].includes(error.statusCode)) throw error;
  }
}
async function applyApprovedAmendment(store, reference) {
  if (reference !== AMENDMENT.reference) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
  return transact(store, state => {
    if (state.planSha256 !== AMENDMENT.planSha256) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
    if ([3, 4, 5].includes(state.version)) return { noWrite: true, replay: true, dispatch: false };
    if (state.version !== 2) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
    const preimageSha256 = require("node:crypto").createHash("sha256").update(JSON.stringify(state)).digest("hex");
    state.budgetAmendment = { ...AMENDMENT, preimageSha256 };
    state.version = 3;
    state.limitMicroUsd = AMENDMENT.toMicroUsd;
    validate(state);
    return { amended: true, dispatch: false, preimageSha256, limitMicroUsd: state.limitMicroUsd };
  });
}
async function readIfPresent(blob) {
  try { return (await blobStore(blob).read()).value; }
  catch (error) { if (error.statusCode === 404) return null; throw error; }
}
async function applyApproved60Amendment(store, reference) {
  if (reference !== AMENDMENT_60.reference) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
  return transact(store, state => {
    if (state.planSha256 !== AMENDMENT_60.planSha256) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
    if ([4, 5].includes(state.version)) return { noWrite: true, replay: true, dispatch: false };
    if (state.version !== 3) deny("STAGE07_BUDGET_AMENDMENT_INVALID");
    const preimageSha256 = require("node:crypto").createHash("sha256").update(JSON.stringify(state)).digest("hex");
    state.budgetAmendment60 = { ...AMENDMENT_60, preimageSha256 };
    state.version = 4;
    state.limitMicroUsd = AMENDMENT_60.toMicroUsd;
    validate(state);
    return { amended: true, dispatch: false, preimageSha256, limitMicroUsd: state.limitMicroUsd };
  });
}
async function applyClosureAmendment(store, reference) {
  if (reference !== closure.reference) deny("STAGE07_CLOSURE_AUTHORITY_INVALID");
  return transact(store, state => {
    if (state.version === 5) return { noWrite: true, replay: true, dispatch: false };
    if (state.version !== 4 || state.planSha256 !== AMENDMENT.planSha256 ||
        state.attempts.length-new Set(state.attempts.map(a=>a.taskId)).size !== 12) deny("STAGE07_CLOSURE_AUTHORITY_INVALID");
    const sha = x => require("node:crypto").createHash("sha256").update(JSON.stringify(x)).digest("hex");
    state.closureAmendment = { reference, correctiveTask:closure.correctiveTask, preimageSha256:sha(state),
      baselineAttemptCount:state.attempts.length, baselineAttemptsSha256:sha(state.attempts),
      baselineReservationsSha256:reservationHash(state.attempts) };
    state.version=5; state.maxAdditionalAttempts=13;
    validate(state);
    return { amended:true, dispatch:false, amendment:state.closureAmendment };
  });
}
function blobStore(blob) {
  return {
    async read() {
      const response = await blob.download();
      const chunks = [];
      for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
      return { etag: response.etag, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
    },
    async compareAndSwap(etag, value) {
      try {
        await blob.uploadData(Buffer.from(JSON.stringify(value)), { conditions: { ifMatch: etag },
          blobHTTPHeaders: { blobContentType: "application/json" } });
        return true;
      } catch (e) { if (e.statusCode === 412) return false; throw e; }
    }
  };
}
module.exports = { LIMIT, RETRIES, AMENDMENT, AMENDMENT_60, applyApprovedAmendment, applyApproved60Amendment, applyClosureAmendment, createState, exposure, reserve, settle, reconcileBound, blobStore, initialize, readIfPresent };
