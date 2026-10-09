"use strict";

const { createHash, randomUUID } = require("node:crypto");
const TITLE_ID = "f1908dc9-5775-f111-ab0f-6045bdd69435";
const BINDING_HASH = "db8d5c1739326938f7ac0c8c06396ecae5190cefbddb84f9b4cb13be13374150";
const EXECUTION_ID = `commissioning:${TITLE_ID}:v1:${BINDING_HASH}:editorial-review:v1`;
const RELEASE = "772ccf45e05d3148c47161c58c2dab8ed3e536a8";
const HELD_ETAG = '"0x8DF260AFB989AC7"';
const SOURCE_HASH = "b337a17a27c0c7108302ca7f671c26d788ce289fc3b9ffab6b12e09e23e87e31";
const CANON_HASH = "1dbf411f0cd5edc6b940f5af5d811b7925b993170c0885265c89294115f91760";
const CANDIDATE_HASH = "6118cff2ba82e0fbd4bead7dccd6824a61d8ec2f3f008fcfd8611b95c5cf3d05";
const LIMITS = Object.freeze({ additionalAttempts: 1, maxProviderRetries: 0, timeoutMs: 240000,
  maxOutputTokens: 8192, maxInputTokens: 125000 });
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function deny() { throw Object.assign(new Error("REVIEW_RECOVERY_AUTHORITY_NOT_CURRENT"), { safeCode: "REVIEW_RECOVERY_AUTHORITY_NOT_CURRENT" }); }

// Inactive review candidate: no route, timer, model call or authority-record writer.
// A future owner adapter must independently verify approval and meter provider cost.
async function claimGloryRecovery(input, deps = {}) {
  const { state, etag, current, approval } = input || {};
  if (state?.status !== "HELD" || state.attempts !== 5 || state.causeCode !== "REVIEW_CATEGORY_NOTES_INVALID" ||
      state.executionId !== EXECUTION_ID || state.titleId !== TITLE_ID || state.bindingHash !== BINDING_HASH ||
      etag !== HELD_ETAG || state.quarantineReference !== `commissioning-review-quarantine/${TITLE_ID}/${BINDING_HASH}/${CANDIDATE_HASH}.json` ||
      current?.strictProducerRelease !== RELEASE || !/^[a-f0-9]{40}$/.test(current.release || "") ||
      current.release !== approval?.recoveryRelease || current.sourceSha256 !== SOURCE_HASH || current.canonSha256 !== CANON_HASH ||
      current.strictTool !== true || current.jackieAuthorshipVerified !== true || current.scopeEnabled !== true ||
      approval?.executionId !== EXECUTION_ID || approval.preimageSha256 !== digest(state) ||
      approval.expectedEtag !== etag || approval.release !== RELEASE ||
      JSON.stringify(approval.limits) !== JSON.stringify(LIMITS) ||
      typeof approval.recordId !== "string" || !approval.recordId.trim() ||
      !Number.isFinite(approval.maxCostUsd) || approval.maxCostUsd <= 0 ||
      typeof deps.verifyApproval !== "function" || typeof deps.blob?.uploadData !== "function") deny();
  if (await deps.verifyApproval(approval, current) !== true) deny();
  const now = (deps.now || (() => new Date()))();
  if (!Number.isFinite(Date.parse(approval.expiresAt)) || Date.parse(approval.expiresAt) <= now.getTime()) deny();
  const claimed = { schemaVersion: state.schemaVersion, executionId: state.executionId,
    titleId: state.titleId, bindingHash: state.bindingHash, startedAt: state.startedAt,
    status: "CLAIMED", attempts: 6, claimId: randomUUID(),
    claimedAt: now.toISOString(), leaseUntil: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
    additionalRecovery: { version: "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1", approvalRecordId: approval.recordId,
      approvalSha256: digest(approval), strictRepairRelease: RELEASE, limits: LIMITS,
      maxCostUsd: approval.maxCostUsd, previousEtag: etag, previousState: structuredClone(state) } };
  try {
    const saved = await deps.blob.uploadData(Buffer.from(JSON.stringify(claimed)), {
      conditions: { ifMatch: etag }, blobHTTPHeaders: { blobContentType: "application/json" }
    });
    if (!saved.etag) throw new Error("REVIEW_RECOVERY_CLAIM_VERSION_MISSING");
    return { status: "CLAIMED", state: claimed, etag: saved.etag };
  } catch (error) {
    if ([409, 412].includes(error?.statusCode)) return { status: "CLAIM_CONFLICT", modelCallAuthorized: false };
    throw error;
  }
}

function holdAmbiguousRecovery(state) {
  if (state?.attempts !== 6 || state.executionId !== EXECUTION_ID ||
      state.additionalRecovery?.version !== "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1") deny();
  return { ...state, status: "HELD", causeCode: "REVIEW_RECOVERY_REQUIRES_RECEIPT_RECONCILIATION",
    modelCallAuthorized: false, productionStageChanged: false };
}

async function runGloryRecovery(input, deps = {}) {
  if (typeof deps.executeReview !== "function" || typeof deps.callModel !== "function" ||
      typeof deps.verifyCurrentAuthority !== "function" ||
      await deps.verifyCurrentAuthority(input?.current, input?.reviewInput) !== true ||
      typeof deps.verifyProviderBudget !== "function" ||
      await deps.verifyProviderBudget(input?.approval, LIMITS) !== true) deny();
  const claim = await claimGloryRecovery(input, deps);
  if (claim.status !== "CLAIMED") return claim;
  let calls = 0; let result;
  try {
    const review = await deps.executeReview(input.reviewInput, { ...deps,
      callModel: async request => {
        if (++calls > 1 || request?.allowFallback !== false ||
            request.diagnosticId !== EXECUTION_ID.replace(/:editorial-review:v1$/, "") ||
            request.modelDeploymentAlias !== "jm1-editorial-devline-primary" ||
            request.promptVersion !== "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1") deny();
        return deps.callModel(request);
      } });
    const receipt = review?.receipt;
    require("../editorial/commissioningEditorialReviewContract").validateEditorialReview(receipt?.report);
    if (receipt.status !== "EDITORIAL_REVIEW_READY_FOR_PUBLISHER" || receipt.productionStageChanged !== false ||
        receipt.binding?.titleId !== TITLE_ID || receipt.binding.parentExecutionId !== EXECUTION_ID.replace(/:editorial-review:v1$/, "") ||
        receipt.reportSha256 !== digest(receipt.report) ||
        typeof review.reference !== "string" || !review.reference.startsWith(`commissioning-editorial-review/${TITLE_ID}/${BINDING_HASH}/`)) deny();
    result = { ...claim.state, status: "COMPLETED", receiptReference: review.reference,
      completedAt: (deps.now || (() => new Date()))().toISOString(), productionStageChanged: false };
  } catch (_error) {
    // Timeout/ambiguous owner writes are reconciled from exact receipts, never retried here.
    result = holdAmbiguousRecovery(claim.state);
  }
  try {
    await deps.blob.uploadData(Buffer.from(JSON.stringify(result)), {
      conditions: { ifMatch: claim.etag }, blobHTTPHeaders: { blobContentType: "application/json" }
    });
  } catch (error) {
    if ([409, 412].includes(error?.statusCode)) return { status: "CLAIM_LOST", modelCallAuthorized: false };
    throw error;
  }
  return result;
}

module.exports = { claimGloryRecovery, runGloryRecovery, holdAmbiguousRecovery, LIMITS, EXECUTION_ID, RELEASE,
  TITLE_ID, BINDING_HASH, HELD_ETAG, SOURCE_HASH, CANON_HASH, CANDIDATE_HASH, digest };
