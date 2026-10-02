"use strict";

const { createHash } = require("node:crypto");
const { validatePublishingWait } = require("./publishingWaitContract");

const OWNER_BY_TYPE = Object.freeze({
  AUTHOR_REVIEW_RESPONSE: "AUTHOR_RESPONSE_CONSUMER",
  EDITORIAL_AUTHOR_DECISION: "EDITORIAL_RUNTIME",
  AGREEMENT_SIGNATURE: "STAGE_WORKER",
  PAYMENT_PROVIDER: "PAYMENT_RUNTIME",
  COVER_APPROVAL: "COVER_RUNTIME",
  PROVIDER_READBACK: "PROVIDER_READBACK_RUNTIME",
  DEPLOYMENT_GATE: "STAGE_WORKER"
});
const CLAIM_MS = 5 * 60 * 1000;

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function exact(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim() && !/[\r\n]/.test(value);
}

function claimIdFor(wait) {
  return createHash("sha256").update(`${wait.waitId.toLowerCase()}:${wait.idempotencyKey}`).digest("hex");
}

function authorityFingerprint(wait) {
  return JSON.stringify([
    wait.titleId.toLowerCase(), wait.authorId.toLowerCase(), wait.engagementId?.toLowerCase(),
    wait.lifecycleInstanceId?.toLowerCase(), wait.legacyEngagementReference, wait.authorityMode,
    wait.stageId.toLowerCase(), wait.executionId, wait.waitType, wait.sourceSystem,
    wait.sourceRecordId, wait.sourceEventId, wait.resumeCondition, wait.idempotencyKey
  ]);
}

function createPublishingWaitResumeAdapter(deps) {
  if (typeof deps?.store?.read !== "function" || typeof deps.store.compareAndSwap !== "function" ||
      typeof deps.readAuthority !== "function" || typeof deps.verifyCondition !== "function") {
    fail("PUBLISHING_WAIT_RESUME_ADAPTER_MISSING");
  }
  const now = deps.now || (() => new Date());

  return {
    async loadWait(waitId) {
      const snapshot = await deps.store.read(waitId);
      if (!snapshot?.value) fail("PUBLISHING_WAIT_NOT_FOUND");
      return validatePublishingWait(snapshot.value);
    },
    loadCanonicalAuthority: deps.readAuthority,
    verifyCondition: deps.verifyCondition,
    async claimResume(wait, signal, proof) {
      const owner = OWNER_BY_TYPE[wait.waitType];
      const handler = deps.handlers?.[owner];
      if (!owner || handler?.idempotent !== true || typeof handler.dispatch !== "function") {
        fail("PUBLISHING_WAIT_OWNER_NOT_COMMISSIONED");
      }
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const snapshot = await deps.store.read(wait.waitId);
        const current = validatePublishingWait(snapshot?.value);
        if (authorityFingerprint(current) !== authorityFingerprint(wait)) {
          fail("PUBLISHING_WAIT_CHANGED_DURING_RESUME");
        }
        if (current.status === "RESUMED") return { claimed: false };
        if (!["PENDING", "READY_TO_RESUME"].includes(current.status)) return { claimed: false };
        const prior = current.resume;
        const timestamp = now().toISOString();
        if (prior && prior.sourceEventId !== signal.sourceEventId) {
          fail("PUBLISHING_WAIT_COMPETING_SIGNAL");
        }
        if (prior && Date.parse(prior.claimExpiresAt) > Date.parse(timestamp)) {
          return { claimed: false };
        }
        const claimId = claimIdFor(wait);
        const next = { ...current, status: "READY_TO_RESUME", resume: {
          claimId, sourceEventId: signal.sourceEventId, owningRuntime: owner,
          evidenceReference: proof.evidenceReference, claimedAt: timestamp,
          claimExpiresAt: new Date(Date.parse(timestamp) + CLAIM_MS).toISOString()
        } };
        if (await deps.store.compareAndSwap(wait.waitId, snapshot.etag, next)) {
          return { claimed: true, claimId, owningRuntime: owner };
        }
      }
      fail("PUBLISHING_WAIT_CLAIM_CONFLICT");
    },
    async dispatchExact(wait, authority, proof, claim) {
      const owner = OWNER_BY_TYPE[wait.waitType];
      if (claim.owningRuntime !== owner) fail("PUBLISHING_WAIT_OWNER_MISMATCH");
      const handler = deps.handlers?.[owner];
      if (handler?.idempotent !== true || typeof handler.dispatch !== "function") {
        fail("PUBLISHING_WAIT_OWNER_NOT_COMMISSIONED");
      }
      return handler.dispatch({ wait, authority, proof, claim,
        idempotencyKey: wait.idempotencyKey });
    },
    async markResumed(wait, signal, proof, claim, result) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const snapshot = await deps.store.read(wait.waitId);
        const current = validatePublishingWait(snapshot?.value);
        if (current.status === "RESUMED" && current.resumeResult?.claimId === claim.claimId &&
            current.resumeResult?.sourceEventId === signal.sourceEventId) {
          return { status: "RESUMED", waitId: wait.waitId, claimId: claim.claimId };
        }
        if (current.status !== "READY_TO_RESUME" || current.resume?.claimId !== claim.claimId ||
            current.resume?.sourceEventId !== signal.sourceEventId ||
            current.resume?.evidenceReference !== proof.evidenceReference) {
          fail("PUBLISHING_WAIT_CLAIM_LOST");
        }
        if (authorityFingerprint(current) !== authorityFingerprint(wait)) {
          fail("PUBLISHING_WAIT_CHANGED_DURING_RESUME");
        }
        if (!exact(result.dispatchResult) || !exact(result.businessStateResult) ||
            !exact(result.evidenceId)) fail("PUBLISHING_WAIT_RESULT_EVIDENCE_MISSING");
        const next = { ...current, status: "RESUMED", resumeResult: {
          waitId: wait.waitId, sourceEventId: signal.sourceEventId,
          titleId: wait.titleId, stageId: wait.stageId, executionId: wait.executionId,
          owningRuntime: claim.owningRuntime, dispatchResult: result.dispatchResult,
          businessStateResult: result.businessStateResult, evidenceId: result.evidenceId,
          evidenceReference: proof.evidenceReference, resumedAt: now().toISOString(),
          idempotencyKey: wait.idempotencyKey, claimId: claim.claimId
        } };
        if (await deps.store.compareAndSwap(wait.waitId, snapshot.etag, next)) {
          return { status: "RESUMED", waitId: wait.waitId, claimId: claim.claimId };
        }
      }
      fail("PUBLISHING_WAIT_RESULT_PERSIST_CONFLICT");
    }
  };
}

module.exports = { OWNER_BY_TYPE, claimIdFor, createPublishingWaitResumeAdapter };
