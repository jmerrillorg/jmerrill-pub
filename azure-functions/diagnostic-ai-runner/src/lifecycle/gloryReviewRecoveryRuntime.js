"use strict";

const c = require("./gloryReviewRecoveryCandidate");
const readers = require("./gloryReviewRecoveryReaders");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

function nativeDependencies(env) {
  const containerClient = require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
  const client = require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL
  });
  const deps = { env, client, containerClient };
  return { ...deps, ...require("./titleCommissioningRuntimeReaders").createTitleCommissioningRuntimeReaders(deps),
    ...require("../editorial/commissioningEditorialReviewReaders").createCommissioningEditorialReviewReaders(deps) };
}

async function gloryRecovery(body, supplied = {}) {
  const env = supplied.env || process.env;
  if (!body || Object.keys(body).length !== 1 || !["PREFLIGHT", "EXECUTE", "REGISTER_APPROVED_AUTHORITY", "PREPARE_NEXT_ASSESSMENT"].includes(body.mode)) {
    return { status: 400, jsonBody: { code: "REVIEW_RECOVERY_REQUEST_DENIED", businessEffects: 0 } };
  }
  if (body.mode === "PREPARE_NEXT_ASSESSMENT") {
    const deps = supplied.containerClient ? supplied : { ...nativeDependencies(env), ...supplied };
    return { status: 200, jsonBody: await require("./gloryNextAssessmentProposal").prepareGloryNextAssessmentProposal(deps) };
  }
  const enabled = body.mode === "REGISTER_APPROVED_AUTHORITY" ? env.JM1_GLORY_RECOVERY_CUSTODY_ENABLED :
    body.mode === "EXECUTE" ? env.JM1_GLORY_RECOVERY_DISPATCH_ENABLED : env.JM1_GLORY_RECOVERY_PREFLIGHT_ENABLED;
  if (enabled !== "true") {
    return { status: 403, jsonBody: { code: "REVIEW_RECOVERY_DISABLED", businessEffects: 0, executionEffects: 0, modelInvocationAttempts: 0 } };
  }
  if (["EXECUTE", "REGISTER_APPROVED_AUTHORITY"].includes(body.mode) && (env.JM1_TITLE_COMMISSIONING_REVIEW_ENABLED !== "false" ||
      env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED !== "false" || env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED !== "false")) {
    return { status: 409, jsonBody: { code: "REVIEW_RECOVERY_WORKER_ISOLATION_REQUIRED",
      businessEffects: 0, executionEffects: 0, modelInvocationAttempts: 0 } };
  }
  const deps = supplied.containerClient ? supplied : { ...nativeDependencies(env), ...supplied };
  if (body.mode === "REGISTER_APPROVED_AUTHORITY") return { status: 200,
    jsonBody: await require("./gloryReviewRecoveryAuthorityCustody").registerApprovedRecoveryAuthority(deps) };
  const prepared = await readers.prepareRecovery(deps);
  if (body.mode === "PREFLIGHT") return { status: 200, jsonBody: { status: "PREFLIGHT_READY_NOT_DISPATCHED",
    executionId: c.EXECUTION_ID, heldEtag: prepared.input.etag,
    preimageSha256: c.digest(prepared.input.state), approvalSha256: prepared.approvalRecord.sha256,
    tariffSha256: prepared.tariffRecord.sha256, budget: prepared.budget,
    businessEffects: 0, executionEffects: 0, modelInvocationAttempts: 0, providerCountRequests: 1 } };

  const now = deps.now || (() => new Date());
  const verifyApproval = async approval => {
    const current = await readers.readVersioned(deps.containerClient, prepared.approvalPath, env.JM1_GLORY_RECOVERY_APPROVAL_SHA256);
    readers.validateApproval(current, env, now());
    const decision = await readers.readDecisionEvidence(deps.containerClient, current.value);
    if (decision.etag !== prepared.decisionRecord.etag) deny("REVIEW_RECOVERY_DECISION_EVIDENCE_CHANGED");
    return current.etag === prepared.approvalRecord.etag && c.digest(current.value) === c.digest(approval);
  };
  const verifyAuthority = async () => {
    await (deps.readDeployment || readers.readDeployment)(deps);
    const latest = await (deps.prepareReview || require("../editorial/commissioningEditorialReviewAdapter").prepareCommissioningEditorialReview)(prepared.input.reviewInput, deps);
    if (`${latest.run.executionId}:editorial-review:v1` !== c.EXECUTION_ID ||
        latest.run.source.sha256 !== c.SOURCE_HASH ||
        latest.binding.authority.find(source => source.role === "EDITORIAL_REVIEW_CANON")?.sha256 !== c.CANON_HASH ||
        readers.sha(JSON.stringify(require("../model/providers/microsoftFoundryClaudeProvider").buildRequestBody(latest.assembled.prompt, readers.route))) !== prepared.budget.requestSha256) {
      deny("REVIEW_RECOVERY_AUTHORITY_DRIFT");
    }
    return true;
  };
  const verifyBudget = async approval => {
    const current = await readers.readVersioned(deps.containerClient, `commissioning-recovery-tariffs/${c.TITLE_ID}.json`, env.JM1_GLORY_RECOVERY_TARIFF_SHA256);
    if (current.etag !== prepared.tariffRecord.etag) deny("REVIEW_RECOVERY_TARIFF_CHANGED");
    readers.validateBudget(current.value, prepared.budget, approval, now());
    return true;
  };
  let calls = 0;
  const result = await c.runGloryRecovery(prepared.input, { ...deps, blob: prepared.blob,
    verifyApproval, verifyCurrentAuthority: verifyAuthority, verifyProviderBudget: verifyBudget,
    executeReview: deps.executeReview || require("../editorial/commissioningEditorialReviewAdapter").executeCommissioningEditorialReview,
    callModel: async request => {
      if (env.JM1_GLORY_RECOVERY_DISPATCH_ENABLED !== "true" || !await verifyApproval(prepared.input.approval)) deny("REVIEW_RECOVERY_APPROVAL_DENIED");
      await verifyAuthority(); await verifyBudget(prepared.input.approval);
      if (readers.sha(JSON.stringify(require("../model/providers/microsoftFoundryClaudeProvider").buildRequestBody(request.promptBody, readers.route))) !== prepared.budget.requestSha256) deny("REVIEW_RECOVERY_REQUEST_DRIFT");
      calls++;
      const result = await (deps.callModel || require("../model/modelCaller").callModel)(request);
      if (!result?.ok) return result;
      const input = result.tokenCounts?.input; const output = result.tokenCounts?.output;
      const tariff = prepared.tariffRecord.value;
      const actualMicroUsd = Number.isSafeInteger(input) && Number.isSafeInteger(output)
        ? input * tariff.inputMicroUsdPerToken + output * tariff.outputMicroUsdPerToken : null;
      const withinBudget = Number.isSafeInteger(input) && input > 0 && input <= c.LIMITS.maxInputTokens &&
        Number.isSafeInteger(output) && output > 0 && output <= c.LIMITS.maxOutputTokens &&
        Number.isSafeInteger(actualMicroUsd) && actualMicroUsd <= Math.floor(prepared.input.approval.maxCostUsd * 1000000);
      return { ...result, recoveryBudgetVerified: withinBudget,
        recoveryCostProof: { requestSha256: prepared.budget.requestSha256,
          tariffSha256: prepared.tariffRecord.sha256, actualMicroUsd, beforeTax: true } };
    } });
  return { status: 200, jsonBody: { status: result.status, executionId: c.EXECUTION_ID,
    attempts: result.attempts, receiptReference: result.receiptReference,
    businessEffects: 0, executionEffects: ["CLAIM_CONFLICT"].includes(result.status) ? 0 : 1,
    modelInvocationAttempts: calls, automaticRetryAuthorized: false } };
}

async function gloryRecoveryHandler(request, deps = {}) {
  const env = deps.env || process.env;
  if (!env.JM1_DIAGNOSTIC_RUNNER_KEY || request.headers.get("x-jm1-diagnostic-runner-key") !== env.JM1_DIAGNOSTIC_RUNNER_KEY) {
    return { status: 401, jsonBody: { code: "UNAUTHORIZED", businessEffects: 0 } };
  }
  let body;
  try { body = await request.json(); } catch { return { status: 400, jsonBody: { code: "INVALID_JSON", businessEffects: 0 } }; }
  try { return await gloryRecovery(body, deps); }
  catch (error) {
    return { status: 409, jsonBody: { code: /^REVIEW_RECOVERY_[A-Z_]{1,100}$/.test(error?.safeCode || "") ? error.safeCode : "REVIEW_RECOVERY_PREFLIGHT_OR_RECEIPT_RECONCILIATION_REQUIRED",
      businessEffects: 0, automaticRetryAuthorized: false } };
  }
}

module.exports = { gloryRecovery, gloryRecoveryHandler };
