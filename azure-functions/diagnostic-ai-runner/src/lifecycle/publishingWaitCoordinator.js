"use strict";

const { validatePublishingWait, resumePublishingWait, exactAuthority } = require("./publishingWaitContract");
const { authorityFingerprint, createPublishingWaitResumeAdapter } = require("./publishingWaitResumeAdapter");
const { signalFor, validateWaitSignal } = require("./publishingWaitSignal");
const BACKOFF_MS = 60000;
const MAX_ATTEMPTS = 5;
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Runtime owners publish waits; OPS never creates or changes their business authority.
async function registerPublishingWait(wait, runtime) {
  validatePublishingWait(wait);
  if (wait.status !== "PENDING" || wait.resume || wait.resumeResult || wait.attempts) fail("WAIT_PRODUCER_STATE_INVALID");
  const current = await runtime.store.read(wait.waitId);
  if (current.value) {
    if (authorityFingerprint(current.value) !== authorityFingerprint(wait)) fail("WAIT_PRODUCER_REPLAY_ALTERED");
    return { status: "IDEMPOTENT", waitId: wait.waitId };
  }
  if (!exactAuthority(wait, await runtime.readAuthority(wait))) fail("WAIT_PRODUCER_AUTHORITY_MISMATCH");
  if (!await runtime.store.compareAndSwap(wait.waitId, null, wait)) return registerPublishingWait(wait, runtime);
  return { status: "REGISTERED", waitId: wait.waitId };
}

async function recordFailure(runtime, waitId, error, beforeAttempts) {
  for (let i = 0; i < 6; i += 1) {
    const snapshot = await runtime.store.read(waitId);
    const wait = snapshot.value;
    if (!wait || !["PENDING", "READY_TO_RESUME"].includes(wait.status)) return;
    // Do not release another worker's lease or override a successor attempt.
    if ((wait.attempts || 0) > beforeAttempts + 1) return;
    const now = runtime.now ? runtime.now() : new Date();
    const attempts = Math.max(wait.attempts || 0, beforeAttempts + 1);
    const exhausted = attempts >= MAX_ATTEMPTS;
    const next = { ...wait, attempts, status: exhausted ? "FAILED" : wait.status,
      nextCheckAt: new Date(now.getTime() + Math.min(BACKOFF_MS * 2 ** (attempts - 1), 3600000)).toISOString(),
      lastFailure: { code: /^[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "WAIT_OWNER_EXECUTION_FAILED",
        at: now.toISOString(), attempt: attempts, recovery: exhausted ? "OWNER_REVIEW_REQUIRED" : "SYSTEM_RETRY" } };
    if (await runtime.store.compareAndSwap(waitId, snapshot.etag, next)) {
      runtime.observe?.({ waitId, status: next.status, failure: next.lastFailure });
      return;
    }
  }
  fail("WAIT_FAILURE_PERSIST_CONFLICT");
}

async function dispatchPublishingWait(input, runtime) {
  const signal = validateWaitSignal(input);
  const before = (await runtime.store.read(signal.waitId)).value;
  if (!before) fail("PUBLISHING_WAIT_NOT_FOUND");
  if (runtime.canDispatch && !await runtime.canDispatch(before)) return { status: "PAUSED_BY_SCOPE", waitId: signal.waitId };
  const now = runtime.now ? runtime.now() : new Date();
  if (["CANCELLED", "SUPERSEDED", "FAILED"].includes(before.status)) return { status: "NOT_RESUMABLE", waitId: signal.waitId };
  if (before.status === "RESUMED") {
    if (before.resumeResult?.sourceEventId !== signal.sourceEventId) fail("WAIT_REPLAY_ALTERED");
    return { status: "IDEMPOTENT", waitId: signal.waitId };
  }
  if (before.expiresAt && Date.parse(before.expiresAt) <= now.getTime()) return { status: "EXPIRED", waitId: signal.waitId };
  if (Date.parse(before.nextCheckAt) > now.getTime()) return { status: "BACKOFF", waitId: signal.waitId };
  if (before.resume && Date.parse(before.resume.claimExpiresAt) > now.getTime()) return { status: "ALREADY_CLAIMED", waitId: signal.waitId };
  const verifyCondition = async (wait, authority) => {
    const proof = await runtime.verifyCondition(wait, authority);
    if (proof?.satisfied !== true) return proof;
    const expected = signalFor(wait, proof.evidenceReference);
    if (expected.sourceEventId !== signal.sourceEventId || proof.evidenceReference !== signal.evidenceReference) fail("WAIT_SIGNAL_PROOF_CHANGED");
    return proof;
  };
  try {
    const result = await resumePublishingWait(signal, createPublishingWaitResumeAdapter({ ...runtime, verifyCondition }));
    runtime.observe?.({ waitId: signal.waitId, status: result.status });
    return result;
  } catch (error) {
    if (error.safeCode === "WAIT_SIGNAL_PROOF_CHANGED") {
      runtime.observe?.({ waitId: signal.waitId, status: "SIGNAL_REJECTED" });
      return { status: "SIGNAL_REJECTED", waitId: signal.waitId };
    }
    await recordFailure(runtime, signal.waitId, error, before.attempts || 0);
    throw error;
  }
}

async function reconcilePublishingWaits(runtime) {
  const results = [];
  // list() must paginate the full store; never repeatedly scan only its first page.
  for await (const snapshot of runtime.store.list()) {
    const wait = validatePublishingWait(snapshot.value);
    const now = runtime.now ? runtime.now() : new Date();
    if (!["PENDING", "READY_TO_RESUME"].includes(wait.status)) continue;
    if (runtime.canDispatch && !await runtime.canDispatch(wait)) {
      results.push({ waitId: wait.waitId, status: "PAUSED_BY_SCOPE" });
      continue;
    }
    if (Date.parse(wait.nextCheckAt) > now.getTime()) continue;
    if (wait.resume && Date.parse(wait.resume.claimExpiresAt) > now.getTime()) continue;
    try {
      const authority = await runtime.readAuthority(wait);
      let status = null;
      if (!exactAuthority(wait, authority)) status = "SUPERSEDED";
      else if (wait.expiresAt && Date.parse(wait.expiresAt) <= now.getTime()) status = "CANCELLED";
      if (status) {
        if (await runtime.store.compareAndSwap(wait.waitId, snapshot.etag, { ...wait, status, reconciledAt: now.toISOString() })) {
          results.push({ waitId: wait.waitId, status });
          runtime.observe?.({ waitId: wait.waitId, status });
        }
        continue;
      }
      const proof = await runtime.verifyCondition(wait, authority);
      if (proof?.satisfied !== true) { results.push({ waitId: wait.waitId, status: "WAITING", reason: proof?.reason || "CONDITION_NOT_PROVEN" }); continue; }
      const signal = signalFor(wait, proof.evidenceReference);
      if (wait.resume) {
        // An expired claim retries its original event, never a newly inferred business action.
        if (wait.resume.sourceEventId !== signal.sourceEventId) fail("WAIT_RETRY_PROOF_CHANGED");
        results.push(await dispatchPublishingWait(signal, runtime));
      } else {
        await runtime.publishReady(signal);
        results.push({ waitId: wait.waitId, status: "READY_PROJECTED" });
      }
    } catch (error) {
      await recordFailure(runtime, wait.waitId, error, wait.attempts || 0);
      results.push({ waitId: wait.waitId, status: "FAILURE_RECORDED", code: error.safeCode || "WAIT_READ_FAILED" });
    }
  }
  return results;
}
async function recoverFailedPublishingWait(waitId, recoveryEvidence, runtime) {
  if (typeof runtime.verifyRecovery !== "function" || !recoveryEvidence) fail("WAIT_RECOVERY_AUTHORITY_REQUIRED");
  const snapshot = await runtime.store.read(waitId), wait = snapshot.value;
  if (wait?.status !== "FAILED") fail("WAIT_NOT_FAILED");
  if (!exactAuthority(wait, await runtime.readAuthority(wait)) ||
      await runtime.verifyRecovery(wait, recoveryEvidence) !== true) fail("WAIT_RECOVERY_AUTHORITY_UNPROVEN");
  const now = runtime.now ? runtime.now() : new Date();
  const next = { ...wait, status: "PENDING", attempts: 0, resume: null, nextCheckAt: now.toISOString(),
    recoveryHistory: [...(wait.recoveryHistory || []), { failure: wait.lastFailure, previousAttempts: wait.attempts,
      previousClaim: wait.resume, recoveryEvidence, recoveredAt: now.toISOString() }] };
  if (!await runtime.store.compareAndSwap(waitId, snapshot.etag, next)) fail("WAIT_RECOVERY_CONFLICT");
  return { status: "RECOVERY_QUEUED", waitId };
}
module.exports = { registerPublishingWait, dispatchPublishingWait, reconcilePublishingWaits, recoverFailedPublishingWait, MAX_ATTEMPTS };
