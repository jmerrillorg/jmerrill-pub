"use strict";

const { randomUUID } = require("node:crypto");
const c = require("./gloryReviewRecoveryCandidate");
const { HELD_ETAG } = require("./gloryNextAssessmentProposal");
const VERSION = "GLORY_EXACT_SOURCE_SINGLE_RECOVERY_V2";
function deny(code = "REVIEW_RECOVERY_NEXT_AUTHORITY_REQUIRED") {
  throw Object.assign(new Error(code), { safeCode: code });
}

// No timer binding. The authenticated owner supplies durable authority,
// fresh native budget/identity checks and explicit enablement before any claim.
async function runGloryNextAssessmentRecovery(input, deps = {}) {
  const { state, etag, approval, current } = input || {};
  const now = (deps.now || (() => new Date()))();
  if (deps.env?.JM1_GLORY_NEXT_ASSESSMENT_ENABLED !== "true" ||
      ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"]
        .some(key => deps.env[key] !== "false")) deny("REVIEW_RECOVERY_NEXT_DISABLED");
  if (state?.status !== "HELD" || state.attempts !== 6 || state.receiptReference || etag !== HELD_ETAG ||
      state.causeCode !== "REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH" || state.executionId !== c.EXECUTION_ID ||
      state.titleId !== c.TITLE_ID || state.bindingHash !== c.BINDING_HASH ||
      state.additionalRecovery?.version !== "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1" ||
      state.additionalRecovery.previousState?.attempts !== 5 ||
      state.additionalRecovery.previousState?.executionId !== c.EXECUTION_ID ||
      !state.additionalRecovery.approvalRecordId || !approval?.recordId ||
      approval.recordId === state.additionalRecovery.approvalRecordId || approval.status !== "APPROVED" ||
      approval.executionId !== c.EXECUTION_ID || approval.proposedAttempt !== 7 || approval.expectedEtag !== etag ||
      approval.preimageSha256 !== c.digest(state) || !approval.decisionEvidenceReference ||
      !/^[a-f0-9]{64}$/.test(approval.decisionEvidenceSha256 || "") ||
      !Number.isFinite(Date.parse(approval.expiresAt)) || Date.parse(approval.expiresAt) <= now.getTime() ||
      JSON.stringify(approval.limits) !== JSON.stringify(c.LIMITS) ||
      !Number.isFinite(approval.maxCostUsd) || approval.maxCostUsd <= 0 || approval.maxCostUsd > 0.33192 ||
      !/^[a-f0-9]{40}$/.test(current?.release || "") || current.release !== approval.recoveryRelease ||
      current.sourceSha256 !== c.SOURCE_HASH || current.canonSha256 !== c.CANON_HASH ||
      current.jackieAuthorshipVerified !== true || current.scopeEnabled !== true ||
      !/^[a-f0-9]{64}$/.test(current.requestSha256 || "") || current.requestSha256 !== approval.requestSha256 ||
      !/^[a-f0-9]{64}$/.test(current.tariffSha256 || "") || current.tariffSha256 !== approval.tariffSha256 ||
      !Number.isFinite(Date.parse(current.verifiedAt)) || Date.parse(current.verifiedAt) > now.getTime() ||
      now.getTime() - Date.parse(current.verifiedAt) > 60000 ||
      typeof deps.verifyApproval !== "function" || typeof deps.verifyCurrentAuthority !== "function" ||
      typeof deps.verifyProviderBudget !== "function" || typeof deps.executeReview !== "function" ||
      typeof deps.callModel !== "function" || typeof deps.blob?.uploadData !== "function") deny();
  const verify = async () => {
    if (await deps.verifyApproval(approval, current) !== true ||
        await deps.verifyCurrentAuthority(current, input.reviewInput) !== true ||
        await deps.verifyProviderBudget(approval, c.LIMITS) !== true) deny();
  };
  await verify();
  const claim = { ...state, status: "CLAIMED", attempts: 7, claimId: randomUUID(),
    claimedAt: now.toISOString(), leaseUntil: new Date(now.getTime() + 20 * 60000).toISOString(),
    additionalRecovery: { version: VERSION, approvalRecordId: approval.recordId, approvalSha256: c.digest(approval),
      previousEtag: etag, previousState: structuredClone(state), limits: c.LIMITS, maxCostUsd: approval.maxCostUsd } };
  let claimEtag;
  try {
    claimEtag = (await deps.blob.uploadData(Buffer.from(JSON.stringify(claim)), {
      conditions: { ifMatch: etag }, blobHTTPHeaders: { blobContentType: "application/json" }
    })).etag;
  } catch (error) {
    if ([409, 412].includes(error?.statusCode)) return { status: "CLAIM_CONFLICT", modelInvocationAttempts: 0 };
    throw error;
  }
  if (!claimEtag) deny("REVIEW_RECOVERY_NEXT_CLAIM_RECONCILIATION_REQUIRED");
  let calls = 0, result;
  try {
    const review = await deps.executeReview(input.reviewInput, { ...deps, callModel: async request => {
      await verify();
      if (calls >= 1 || request?.allowFallback !== false || request.diagnosticId !== c.EXECUTION_ID.replace(/:editorial-review:v1$/, "") ||
          request.modelDeploymentAlias !== "jm1-editorial-devline-primary" || request.promptVersion !== "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1") deny();
      const actualRequest = require("./gloryReviewRecoveryReaders").sha(JSON.stringify(
        require("../model/providers/microsoftFoundryClaudeProvider").buildRequestBody(request.promptBody,
          require("./gloryReviewRecoveryReaders").route)));
      if (actualRequest !== approval.requestSha256) deny("REVIEW_RECOVERY_REQUEST_DRIFT");
      calls++;
      const response = await deps.callModel(request);
      const cost = response?.recoveryCostProof;
      if (response?.ok && (response.recoveryBudgetVerified !== true || cost?.requestSha256 !== approval.requestSha256 ||
          cost?.tariffSha256 !== approval.tariffSha256 || !Number.isSafeInteger(cost?.actualMicroUsd) ||
          cost.actualMicroUsd < 0 || cost.actualMicroUsd > Math.floor(approval.maxCostUsd * 1000000))) {
        // Let the existing producer quarantine the rejected output and usage;
        // rejecting here would discard the only attributable provider result.
        return { ...response, recoveryBudgetVerified: false };
      }
      return response;
    } });
    const receipt = review?.receipt;
    require("../editorial/commissioningEditorialReviewContract").validateEditorialReview(receipt?.report);
    if (receipt.status !== "EDITORIAL_REVIEW_READY_FOR_PUBLISHER" || receipt.productionStageChanged !== false ||
        receipt.authorDecisionInferred !== false || receipt.binding?.titleId !== c.TITLE_ID ||
        receipt.binding.stage !== "EDITORIAL_REVIEW" ||
        receipt.binding.parentExecutionId !== c.EXECUTION_ID.replace(/:editorial-review:v1$/, "") ||
        receipt.binding.source?.sha256 !== c.SOURCE_HASH || receipt.reportSha256 !== c.digest(receipt.report) ||
        !new RegExp(`^commissioning-editorial-review/${c.TITLE_ID}/${c.BINDING_HASH}/[a-f0-9]{64}\\.json$`).test(review.reference || "")) deny();
    await verify();
    result = { ...claim, status: "COMPLETED", receiptReference: review.reference,
      completedAt: (deps.now || (() => new Date()))().toISOString(), productionStageChanged: false };
  } catch (error) {
    result = { ...claim, status: "HELD", causeCode: "REVIEW_RECOVERY_REQUIRES_RECEIPT_RECONCILIATION",
      modelCallAuthorized: false, productionStageChanged: false };
    if (/^REVIEW_[A-Z_]{1,100}$/.test(error?.safeCode || "")) result.causeCode = error.safeCode;
    const prefix = `commissioning-review-quarantine/${c.TITLE_ID}/${c.BINDING_HASH}/`;
    if (typeof error?.quarantineReference === "string" && error.quarantineReference.startsWith(prefix) &&
        /^[a-f0-9]{64}\.json$/.test(error.quarantineReference.slice(prefix.length))) result.quarantineReference = error.quarantineReference;
  }
  try {
    await deps.blob.uploadData(Buffer.from(JSON.stringify(result)), {
      conditions: { ifMatch: claimEtag }, blobHTTPHeaders: { blobContentType: "application/json" }
    });
  } catch (error) {
    if ([409, 412].includes(error?.statusCode)) return { status: "CLAIM_LOST", modelInvocationAttempts: calls };
    throw error;
  }
  return { ...result, modelInvocationAttempts: calls, automaticRetryAuthorized: false };
}
module.exports = { runGloryNextAssessmentRecovery, VERSION };
