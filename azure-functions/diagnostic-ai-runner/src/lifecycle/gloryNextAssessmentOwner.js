"use strict";
const c = require("./gloryReviewRecoveryCandidate");
const r = require("./gloryReviewRecoveryReaders");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
async function executeGloryNextAssessment(deps) {
  const env = deps.env || process.env, now = deps.now || (() => new Date());
  if (env.JM1_GLORY_NEXT_ASSESSMENT_ENABLED !== "true") deny("REVIEW_RECOVERY_NEXT_DISABLED");
  if (!/^[a-f0-9-]{36}$/.test(env.JM1_GLORY_NEXT_APPROVAL_ID || "") ||
      !/^[a-f0-9]{64}$/.test(env.JM1_GLORY_NEXT_APPROVAL_SHA256 || "")) deny("REVIEW_RECOVERY_NEXT_PINS_MISSING");
  const proposal = await require("./gloryNextAssessmentProposal").prepareGloryNextAssessmentProposal(deps);
  const path = `commissioning-recovery-approvals/${c.TITLE_ID}/${env.JM1_GLORY_NEXT_APPROVAL_ID}.json`;
  const approvalRecord = await r.readVersioned(deps.containerClient, path, env.JM1_GLORY_NEXT_APPROVAL_SHA256);
  const approval = approvalRecord.value;
  const founder = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const validate = record => {
    const a = record.value;
    if (a.recordId !== env.JM1_GLORY_NEXT_APPROVAL_ID || a.approvedByContactId !== founder || a.status !== "APPROVED" ||
        a.purpose !== "ONE_ADDITIONAL_GLORY_INTERNAL_ASSESSMENT" || !Number.isFinite(Date.parse(a.approvedAt)) ||
        Date.parse(a.approvedAt) > now().getTime() || !Number.isFinite(Date.parse(a.expiresAt)) ||
        Date.parse(a.expiresAt) <= now().getTime() || Date.parse(a.expiresAt) - Date.parse(a.approvedAt) > 86400000 ||
        a.proposedAttempt !== 7 || a.expectedEtag !== proposal.expectedEtag || a.preimageSha256 !== proposal.preimageSha256 ||
        a.recoveryRelease !== env.JM1_RELEASE_SHA || a.requestSha256 !== proposal.requestSha256 ||
        a.tariffSha256 !== proposal.tariff.sha256 || a.sourceSha256 !== c.SOURCE_HASH || a.canonSha256 !== c.CANON_HASH) {
      deny("REVIEW_RECOVERY_NEXT_AUTHORITY_REQUIRED");
    }
  };
  validate(approvalRecord);
  const decision = await r.readDecisionEvidence(deps.containerClient, approval);
  const bound = ["proposedAttempt", "expectedEtag", "preimageSha256", "requestSha256", "tariffSha256", "sourceSha256", "canonSha256"];
  if (bound.some(key => decision.value[key] !== approval[key])) deny("REVIEW_RECOVERY_DECISION_EVIDENCE_DENIED");
  const execution = await r.readVersioned(deps.containerClient, `commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`);
  const tariff = await r.readVersioned(deps.containerClient, proposal.tariff.reference, approval.tariffSha256);
  const request = require("./titleCommissioningOwnerBindings").ownerBinding(c.TITLE_ID).request;
  const verifyApproval = async () => {
    const latest = await r.readVersioned(deps.containerClient, path, env.JM1_GLORY_NEXT_APPROVAL_SHA256);
    validate(latest);
    const latestDecision = await r.readDecisionEvidence(deps.containerClient, latest.value);
    return latest.etag === approvalRecord.etag && latestDecision.etag === decision.etag;
  };
  const verifyCurrentAuthority = async () => {
    await (deps.readDeployment || r.readDeployment)(deps);
    const prepared = await (deps.prepareReview || require("../editorial/commissioningEditorialReviewAdapter").prepareCommissioningEditorialReview)(request, deps);
    return prepared.run.source.sha256 === c.SOURCE_HASH && `${prepared.run.executionId}:editorial-review:v1` === c.EXECUTION_ID &&
      prepared.binding.authority.find(s => s.role === "EDITORIAL_REVIEW_CANON")?.sha256 === c.CANON_HASH &&
      r.sha(JSON.stringify(require("../model/providers/microsoftFoundryClaudeProvider").buildRequestBody(prepared.assembled.prompt, r.route))) === approval.requestSha256;
  };
  const verifyProviderBudget = async () => {
    const latest = await r.readVersioned(deps.containerClient, proposal.tariff.reference, approval.tariffSha256);
    r.validateBudget(latest.value, proposal.budget, approval, now());
    return latest.etag === tariff.etag;
  };
  return require("./gloryNextAssessmentRecovery").runGloryNextAssessmentRecovery({ state: execution.value, etag: execution.etag,
    approval, reviewInput: request, current: { release: env.JM1_RELEASE_SHA, sourceSha256: c.SOURCE_HASH,
      canonSha256: c.CANON_HASH, jackieAuthorshipVerified: true, scopeEnabled: true,
      verifiedAt: proposal.budget.verifiedAt, requestSha256: proposal.requestSha256, tariffSha256: tariff.sha256 } },
  { ...deps, env, blob: execution.blob, verifyApproval, verifyCurrentAuthority, verifyProviderBudget,
    executeReview: deps.executeReview || require("../editorial/commissioningEditorialReviewAdapter").executeCommissioningEditorialReview,
    callModel: async modelRequest => {
      const response = await (deps.callModel || require("../model/modelCaller").callModel)(modelRequest);
      if (!response?.ok) return response;
      const input = response.tokenCounts?.input, output = response.tokenCounts?.output;
      const actualMicroUsd = Number.isSafeInteger(input) && Number.isSafeInteger(output)
        ? input * tariff.value.inputMicroUsdPerToken + output * tariff.value.outputMicroUsdPerToken : null;
      return { ...response, recoveryBudgetVerified: Number.isSafeInteger(input) && input > 0 && input <= c.LIMITS.maxInputTokens &&
        Number.isSafeInteger(output) && output > 0 && output <= c.LIMITS.maxOutputTokens && Number.isSafeInteger(actualMicroUsd) &&
        actualMicroUsd <= Math.floor(approval.maxCostUsd * 1000000), recoveryCostProof: {
          requestSha256: approval.requestSha256, tariffSha256: tariff.sha256, actualMicroUsd, beforeTax: true } };
    } });
}
module.exports = { executeGloryNextAssessment };
