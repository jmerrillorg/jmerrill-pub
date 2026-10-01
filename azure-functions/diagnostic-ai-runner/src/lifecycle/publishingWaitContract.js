"use strict";

const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const WAIT_TYPES = new Set([
  "AUTHOR_REVIEW_RESPONSE", "EDITORIAL_AUTHOR_DECISION", "AGREEMENT_SIGNATURE",
  "PAYMENT_PROVIDER", "COVER_APPROVAL", "PROVIDER_READBACK", "DEPLOYMENT_GATE"
]);
const WAIT_OWNERS = new Set(["AUTHOR", "JM_PUBLISHING", "FOUNDER", "PROVIDER", "EXTERNAL_SYSTEM", "JMP_IDENTITY_REVIEW"]);
const STATUSES = new Set(["PENDING", "READY_TO_RESUME", "RESUMED", "CANCELLED", "SUPERSEDED", "FAILED"]);

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function exact(value) {
  return typeof value === "string" && Boolean(value.trim()) && value === value.trim() && !/[\r\n]/.test(value);
}

function iso(value) {
  return exact(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function validatePublishingWait(wait) {
  if (!wait || wait.schemaVersion !== 1 || !GUID.test(wait.waitId || "") ||
      !GUID.test(wait.titleId || "") || !GUID.test(wait.authorId || "") ||
      !GUID.test(wait.stageId || "") || !exact(wait.executionId) ||
      !WAIT_TYPES.has(wait.waitType) || !exact(wait.waitReason) || !WAIT_OWNERS.has(wait.waitOwner) ||
      !exact(wait.sourceSystem) || !exact(wait.sourceRecordId) || !exact(wait.sourceEventId) ||
      !iso(wait.createdAt) || !iso(wait.nextCheckAt) ||
      (wait.expiresAt !== null && wait.expiresAt !== undefined && !iso(wait.expiresAt)) ||
      !exact(wait.resumeCondition) || !exact(wait.resumeAction) || !exact(wait.idempotencyKey) ||
      !STATUSES.has(wait.status)) fail("PUBLISHING_WAIT_CONTRACT_INVALID");
  if (Date.parse(wait.nextCheckAt) < Date.parse(wait.createdAt) ||
      (wait.expiresAt && Date.parse(wait.expiresAt) < Date.parse(wait.createdAt))) {
    fail("PUBLISHING_WAIT_TIME_ORDER_INVALID");
  }
  const v2 = GUID.test(wait.engagementId || "") && GUID.test(wait.lifecycleInstanceId || "");
  const legacy = wait.engagementId === null && wait.lifecycleInstanceId === null &&
    exact(wait.legacyEngagementReference) && wait.authorityMode === "VERIFIED_LEGACY_BRIDGE";
  if (!v2 && !legacy) fail("PUBLISHING_WAIT_ENGAGEMENT_AUTHORITY_MISSING");
  return wait;
}

function exactAuthority(wait, current) {
  return current?.titleId?.toLowerCase() === wait.titleId.toLowerCase() &&
    current?.authorId?.toLowerCase() === wait.authorId.toLowerCase() &&
    current?.stageId?.toLowerCase() === wait.stageId.toLowerCase() &&
    current?.executionId === wait.executionId &&
    (wait.authorityMode === "VERIFIED_LEGACY_BRIDGE"
      ? current.legacyEngagementReference === wait.legacyEngagementReference
      : current.engagementId?.toLowerCase() === wait.engagementId.toLowerCase() &&
        current.lifecycleInstanceId?.toLowerCase() === wait.lifecycleInstanceId.toLowerCase());
}

async function resumePublishingWait(signal, deps) {
  if (!signal || !GUID.test(signal.waitId || "") || !exact(signal.sourceEventId)) {
    fail("PUBLISHING_WAIT_SIGNAL_INVALID");
  }
  for (const method of ["loadWait", "loadCanonicalAuthority", "verifyCondition", "claimResume", "dispatchExact", "markResumed"]) {
    if (typeof deps?.[method] !== "function") fail("PUBLISHING_WAIT_RESUME_ADAPTER_MISSING");
  }
  const wait = validatePublishingWait(await deps.loadWait(signal.waitId));
  if (wait.waitId.toLowerCase() !== signal.waitId.toLowerCase()) fail("PUBLISHING_WAIT_ID_MISMATCH");
  if (wait.status === "RESUMED") return { status: "IDEMPOTENT", waitId: wait.waitId };
  if (wait.status !== "PENDING" && wait.status !== "READY_TO_RESUME") {
    return { status: "NOT_RESUMABLE", waitId: wait.waitId };
  }
  const current = await deps.loadCanonicalAuthority(wait);
  if (!exactAuthority(wait, current)) return { status: "STALE_AUTHORITY", waitId: wait.waitId };
  const proof = await deps.verifyCondition(wait, current, signal);
  if (proof?.satisfied !== true || !exact(proof.evidenceReference)) {
    return { status: "CONDITION_NOT_PROVEN", waitId: wait.waitId };
  }
  const claim = await deps.claimResume(wait, signal, proof);
  if (claim?.claimed !== true || !exact(claim.claimId)) {
    return { status: "ALREADY_CLAIMED", waitId: wait.waitId };
  }
  const result = await deps.dispatchExact(wait, current, proof, claim);
  if (result?.accepted !== true || result.idempotencyKey !== wait.idempotencyKey ||
      result.executionId !== wait.executionId) fail("PUBLISHING_WAIT_DISPATCH_NOT_CORRELATED");
  const persisted = await deps.markResumed(wait, signal, proof, claim, result);
  if (persisted?.status !== "RESUMED" || persisted.waitId?.toLowerCase() !== wait.waitId.toLowerCase() ||
      persisted.claimId !== claim.claimId) fail("PUBLISHING_WAIT_RESUME_NOT_PERSISTED");
  return { status: "RESUMED", waitId: wait.waitId, evidenceReference: proof.evidenceReference };
}

module.exports = { validatePublishingWait, resumePublishingWait };
