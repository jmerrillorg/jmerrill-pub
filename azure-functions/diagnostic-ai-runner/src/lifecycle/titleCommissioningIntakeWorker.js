"use strict";

const { randomUUID } = require("node:crypto");
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { executeTitleCommissioningIntake } = require("./titleCommissioningIntake");

const LEASE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RETRYABLE = new Set(["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "COMMISSIONING_DEPENDENCY_UNAVAILABLE",
  "REVIEW_MODEL_REQUEST_TIMEOUT", "REVIEW_MODEL_TRANSPORT_UNAVAILABLE"]);
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function conflict(error) { return [409, 412].includes(error?.statusCode); }
function retryable(error) { return RETRYABLE.has(error?.safeCode || error?.code) || [408, 429, 500, 502, 503, 504].includes(error?.statusCode ?? error?.status); }

// This is an execution receipt, not canonical title stage state. A recovered
// claim invokes the same create-only intake adapter and cannot advance a title.
async function processTitleCommissioningIntake(input, deps = {}) {
  return processTitleCommissioningStep(input, deps, {
    namespace: "commissioning-executions", executionSuffix: "",
    execute: deps.executeIntake || executeTitleCommissioningIntake,
    validate: (intake, plan) => intake?.receipt?.executionId === plan.executionId &&
      intake.receipt.bindingHash === plan.bindingHash && intake.receipt.status === "INTAKE_MATERIALS_VERIFIED" &&
      intake.receipt.productionStageChanged === false,
    reference: (_result, plan) => `commissioning-intake/${plan.titleId}/${plan.bindingHash}.json`
  });
}

// Internal step contracts reuse the same lease/CAS/backoff control. They are
// supplied by reviewed owner code, never an invocation or persisted request.
async function processTitleCommissioningStep(input, deps, contract) {
  const plan = planTitleCommissioningRun(input);
  plan.executionId += contract.executionSuffix;
  if (typeof deps.containerClient?.getBlockBlobClient !== "function" ||
      typeof deps.readScope !== "function") fail("COMMISSIONING_WORKER_NOT_BOUND");
  const now = (deps.now || (() => new Date()))();
  const at = now.toISOString();
  const blob = deps.containerClient.getBlockBlobClient(`${contract.namespace}/${plan.titleId}/${plan.bindingHash}.json`);
  let state; let etag;
  try {
    const properties = await blob.getProperties();
    etag = properties.etag;
    if (!etag) fail("COMMISSIONING_EXECUTION_VERSION_MISSING");
    state = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } })).toString("utf8"));
    if (state.schemaVersion !== 1 || state.executionId !== plan.executionId || state.bindingHash !== plan.bindingHash ||
        state.titleId !== plan.titleId || !Number.isInteger(state.attempts) || state.attempts < 1 ||
        !["CLAIMED", "RETRY_PENDING", "HELD", "COMPLETED"].includes(state.status)) fail("COMMISSIONING_EXECUTION_CONFLICT");
  } catch (error) {
    if (conflict(error)) return { status: "CLAIM_CONFLICT", executionId: plan.executionId };
    if (error?.statusCode !== 404) throw error;
  }
  // Additional budget claims belong to their separately reviewed recovery owner.
  // Ordinary timer/expired-lease recovery must never initiate another model call.
  if (state?.additionalRecovery) return state;
  const repairRecovery = state?.status === "HELD" && state.attempts < MAX_ATTEMPTS &&
    typeof contract.recoverHeld === "function" && contract.recoverHeld(state) === true;
  if (state?.status === "COMPLETED" || (state?.status === "HELD" && !repairRecovery)) return state;
  if (state?.status === "CLAIMED") {
    if (!Number.isFinite(Date.parse(state.leaseUntil))) fail("COMMISSIONING_EXECUTION_LEASE_INVALID");
    if (Date.parse(state.leaseUntil) > now.getTime()) return { status: "IN_FLIGHT", executionId: plan.executionId };
  }
  if (state?.status === "RETRY_PENDING") {
    if (!Number.isFinite(Date.parse(state.nextAttemptAt))) fail("COMMISSIONING_RETRY_TIME_INVALID");
    if (Date.parse(state.nextAttemptAt) > now.getTime()) return state;
  }
  const scope = await deps.readScope(plan.titleId);
  if (scope?.enabled !== true || scope.revoked === true || scope.titleId !== plan.titleId ||
      scope.mode !== "JACKIE_TITLE_INTERNAL_COMMISSIONING") fail("COMMISSIONING_SCOPE_NOT_CURRENT");
  const claimed = {
    schemaVersion: 1, executionId: plan.executionId, bindingHash: plan.bindingHash, titleId: plan.titleId,
    status: "CLAIMED", attempts: (state?.attempts || 0) + 1,
    ...(repairRecovery ? { repairRecovery: { version: contract.repairVersion, previousState: state } }
      : state?.repairRecovery ? { repairRecovery: state.repairRecovery } : {}),
    claimId: randomUUID(), startedAt: state?.startedAt || at, claimedAt: at,
    leaseUntil: new Date(now.getTime() + (contract.leaseMs || LEASE_MS)).toISOString()
  };
  const save = (value, conditions) => blob.uploadData(Buffer.from(JSON.stringify(value)), {
    conditions, blobHTTPHeaders: { blobContentType: "application/json" }
  });
  let claimEtag;
  try {
    const written = await save(claimed, etag ? { ifMatch: etag } : { ifNoneMatch: "*" });
    claimEtag = written.etag;
  } catch (error) {
    if (conflict(error)) return { status: "CLAIM_CONFLICT", executionId: plan.executionId };
    throw error;
  }
  if (!claimEtag) fail("COMMISSIONING_CLAIM_VERSION_MISSING");
  let result;
  try {
    const intake = await contract.execute(input, deps);
    if (!contract.validate(intake, plan)) {
      fail("COMMISSIONING_INTAKE_RESULT_INVALID");
    }
    result = { ...claimed, status: "COMPLETED", completedAt: (deps.now || (() => new Date()))().toISOString(),
      receiptReference: contract.reference(intake, plan),
      productionStageChanged: false };
  } catch (error) {
    const canRetry = retryable(error) && claimed.attempts < MAX_ATTEMPTS;
    result = { ...claimed, status: canRetry ? "RETRY_PENDING" : "HELD",
      failureCode: retryable(error) ? "COMMISSIONING_DEPENDENCY_UNAVAILABLE" : "COMMISSIONING_AUTHORITY_OR_RESULT_REQUIRES_REVIEW",
      ...(/^(?:REVIEW|COMMISSIONING)_[A-Z_]{1,100}$/.test(error?.safeCode || "") ? { causeCode: error.safeCode } : {}),
      ...(typeof error.quarantineReference === "string" &&
        error.quarantineReference.startsWith(`commissioning-review-quarantine/${plan.titleId}/${plan.bindingHash}/`) &&
        /^[a-f0-9]{64}\.json$/.test(error.quarantineReference.split("/").pop())
        ? { quarantineReference: error.quarantineReference } : {}),
      failedAt: (deps.now || (() => new Date()))().toISOString(),
      ...(canRetry ? { nextAttemptAt: new Date(now.getTime() + Math.min(60 * 60 * 1000, 60000 * 2 ** (claimed.attempts - 1))).toISOString() } : {}) };
  }
  try { await save(result, { ifMatch: claimEtag }); }
  catch (error) {
    if (conflict(error)) return { status: "CLAIM_LOST", executionId: plan.executionId };
    throw error;
  }
  return result;
}

module.exports = { processTitleCommissioningIntake, processTitleCommissioningStep, LEASE_MS, MAX_ATTEMPTS };
