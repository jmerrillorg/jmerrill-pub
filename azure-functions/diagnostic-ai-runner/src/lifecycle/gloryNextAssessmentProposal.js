"use strict";

const c = require("./gloryReviewRecoveryCandidate");
const readers = require("./gloryReviewRecoveryReaders");
const provider = require("../model/providers/microsoftFoundryClaudeProvider");
const HELD_ETAG = '"0x8DF261FD73B0F6A"';
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Proposal only: no authority writer, execution claim, inference or timer binding.
async function prepareGloryNextAssessmentProposal(deps) {
  const env = deps.env || process.env;
  if (!/^[a-f0-9]{40}$/.test(env.JM1_RELEASE_SHA || "") ||
      env.JM1_TITLE_COMMISSIONING_REVIEW_ENABLED !== "false" ||
      env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED !== "false" ||
      env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED !== "false") deny("REVIEW_RECOVERY_PROPOSAL_ISOLATION_REQUIRED");
  const container = deps.containerClient;
  if ((await container.getProperties()).blobPublicAccess) deny("REVIEW_RECOVERY_STORAGE_NOT_PRIVATE");
  const path = `commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`;
  const execution = await readers.readVersioned(container, path);
  const state = execution.value;
  if (execution.etag !== HELD_ETAG || state.status !== "HELD" || state.attempts !== 6 ||
      state.causeCode !== "REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH" || state.titleId !== c.TITLE_ID ||
      state.executionId !== c.EXECUTION_ID || state.bindingHash !== c.BINDING_HASH || state.receiptReference ||
      state.additionalRecovery?.version !== "GLORY_STRICT_TOOL_SINGLE_RECOVERY_V1" ||
      state.additionalRecovery.previousState?.attempts !== 5 ||
      state.additionalRecovery.previousState?.executionId !== c.EXECUTION_ID ||
      typeof state.additionalRecovery.approvalRecordId !== "string" ||
      !state.additionalRecovery.approvalRecordId) deny("REVIEW_RECOVERY_PROPOSAL_PREIMAGE_CHANGED");
  const deployment = await (deps.readDeployment || readers.readDeployment)(deps);
  const request = require("./titleCommissioningOwnerBindings").ownerBinding(c.TITLE_ID).request;
  const prepared = await (deps.prepareReview || require("../editorial/commissioningEditorialReviewAdapter").prepareCommissioningEditorialReview)(request, deps);
  if (`${prepared.run.executionId}:editorial-review:v1` !== c.EXECUTION_ID ||
      prepared.run.source.sha256 !== c.SOURCE_HASH ||
      prepared.binding.authority.find(s => s.role === "EDITORIAL_REVIEW_CANON")?.sha256 !== c.CANON_HASH) {
    deny("REVIEW_RECOVERY_AUTHORITY_DRIFT");
  }
  const tariff = await readers.readVersioned(container, `commissioning-recovery-tariffs/${c.TITLE_ID}.json`);
  const count = await (deps.countRequest || readers.countRequest)(prepared.assembled.prompt, { ...deps, env });
  if (count.requestSha256 !== readers.sha(JSON.stringify(provider.buildRequestBody(prepared.assembled.prompt, readers.route)))) {
    deny("REVIEW_RECOVERY_REQUEST_DRIFT");
  }
  // A calculation ceiling is not an approval. Validate the existing tariff and
  // native count without promoting a prior decision into a new attempt grant.
  const ceilingUsd = 0.33192;
  const budget = readers.validateBudget(tariff.value, count, { maxCostUsd: ceilingUsd },
    (deps.now || (() => new Date()))());
  const after = await readers.readVersioned(container, path);
  if (after.etag !== execution.etag || after.sha256 !== execution.sha256) deny("REVIEW_RECOVERY_PROPOSAL_PREIMAGE_CHANGED");
  return { status: "DECISION_REQUIRED_NOT_EXECUTABLE", titleId: c.TITLE_ID, executionId: c.EXECUTION_ID,
    release: env.JM1_RELEASE_SHA, expectedEtag: execution.etag, preimageSha256: c.digest(state),
    sourceSha256: c.SOURCE_HASH, canonSha256: c.CANON_HASH, requestSha256: count.requestSha256,
    priorApprovalRecordId: state.additionalRecovery.approvalRecordId, priorApprovalConsumed: true,
    proposedAttempt: 7, limits: c.LIMITS, planningCeilingUsd: ceilingUsd, budget,
    tariff: { reference: `commissioning-recovery-tariffs/${c.TITLE_ID}.json`, sha256: tariff.sha256,
      etag: tariff.etag, verifiedAt: tariff.value.verifiedAt, expiresAt: tariff.value.expiresAt }, deployment,
    approvalRequired: "NEW_EXACT_ONE_ATTEMPT_INTERNAL_ASSESSMENT_DECISION",
    executionPathStatus: "ADAPTER_PREPARED_DISABLED_PENDING_NEW_AUTHORITY",
    automaticRetryAuthorized: false, businessEffects: 0, executionEffects: 0, authorityWrites: 0,
    modelInvocationAttempts: 0, providerCountRequests: 1 };
}
module.exports = { prepareGloryNextAssessmentProposal, HELD_ETAG };
