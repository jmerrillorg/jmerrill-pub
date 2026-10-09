"use strict";

const { createHash } = require("node:crypto");
const c = require("./gloryReviewRecoveryCandidate");
const provider = require("../model/providers/microsoftFoundryClaudeProvider");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const route = Object.freeze({ deploymentName: "jm1-editorial-devline-primary", model: "claude-sonnet-5",
  promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" });

async function readVersioned(container, path, expectedHash) {
  const blob = container.getBlockBlobClient(path);
  const props = await blob.getProperties();
  if (!props.etag || props.contentLength > 65536) deny("REVIEW_RECOVERY_RECORD_INVALID");
  const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } });
  if (bytes.length > 65536 || (expectedHash && sha(bytes) !== expectedHash)) deny("REVIEW_RECOVERY_RECORD_INVALID");
  return { blob, etag: props.etag, sha256: sha(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

function validateApproval(record, env, now) {
  const approval = record.value;
  const founder = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  if (record.sha256 !== env.JM1_GLORY_RECOVERY_APPROVAL_SHA256 ||
      approval.recordId !== env.JM1_GLORY_RECOVERY_APPROVAL_ID || approval.approvedByContactId !== founder ||
      approval.status !== "APPROVED" || approval.purpose !== "ONE_ADDITIONAL_GLORY_INTERNAL_ASSESSMENT" ||
      typeof approval.decisionEvidenceReference !== "string" || !approval.decisionEvidenceReference.trim() ||
      !/^[a-f0-9]{64}$/.test(approval.decisionEvidenceSha256 || "") ||
      !Number.isFinite(Date.parse(approval.approvedAt)) || Date.parse(approval.approvedAt) > now.getTime() ||
      !Number.isFinite(Date.parse(approval.expiresAt)) || Date.parse(approval.expiresAt) <= now.getTime() ||
      Date.parse(approval.expiresAt) - Date.parse(approval.approvedAt) > 24 * 60 * 60 * 1000 ||
      approval.executionId !== c.EXECUTION_ID || approval.release !== c.RELEASE ||
      approval.recoveryRelease !== env.JM1_RELEASE_SHA || approval.expectedEtag !== c.HELD_ETAG ||
      !/^[a-f0-9]{64}$/.test(approval.preimageSha256 || "") ||
      JSON.stringify(approval.limits) !== JSON.stringify(c.LIMITS) ||
      !Number.isFinite(approval.maxCostUsd) || approval.maxCostUsd <= 0 || approval.maxCostUsd > 1) {
    deny("REVIEW_RECOVERY_APPROVAL_DENIED");
  }
  return approval;
}

function validateBudget(tariff, count, approval, now) {
  if (tariff.status !== "APPROVED_CURRENT" || tariff.currency !== "USD" ||
      tariff.model !== route.model || tariff.modelVersion !== "2" || tariff.sku !== "GlobalStandard" ||
      tariff.caching !== "NONE" || tariff.additionalCharges !== "NONE" ||
      !Number.isFinite(Date.parse(tariff.verifiedAt)) || Date.parse(tariff.verifiedAt) > now.getTime() ||
      now.getTime() - Date.parse(tariff.verifiedAt) > 24 * 60 * 60 * 1000 ||
      !Number.isFinite(Date.parse(tariff.expiresAt)) || Date.parse(tariff.expiresAt) <= now.getTime() ||
      ![tariff.inputMicroUsdPerToken, tariff.outputMicroUsdPerToken].every(n => Number.isSafeInteger(n) && n > 0 && n <= 1000) ||
      typeof tariff.sourceReference !== "string" || !tariff.sourceReference.trim() ||
      !Number.isSafeInteger(count.inputTokens) || count.inputTokens < 1 ||
      !Number.isFinite(Date.parse(count.verifiedAt)) ||
      now.getTime() - Date.parse(count.verifiedAt) > 5 * 60 * 1000 || Date.parse(count.verifiedAt) > now.getTime()) {
    deny("REVIEW_RECOVERY_BUDGET_UNVERIFIED");
  }
  // Token-count APIs provide estimates: preserve a 5% input safety margin.
  const inputTokenCeiling = Math.ceil(count.inputTokens * 105 / 100);
  const estimatedMaximumMicroUsd = inputTokenCeiling * tariff.inputMicroUsdPerToken +
    c.LIMITS.maxOutputTokens * tariff.outputMicroUsdPerToken;
  if (inputTokenCeiling > c.LIMITS.maxInputTokens || !Number.isSafeInteger(estimatedMaximumMicroUsd) ||
      estimatedMaximumMicroUsd > Math.floor(approval.maxCostUsd * 1000000)) deny("REVIEW_RECOVERY_BUDGET_EXCEEDED");
  return { inputTokens: count.inputTokens, inputTokenCeiling, maxOutputTokens: c.LIMITS.maxOutputTokens,
    estimatedMaximumMicroUsd, requestSha256: count.requestSha256, verifiedAt: count.verifiedAt };
}

async function readDecisionEvidence(container, approval) {
  const prefix = `commissioning-recovery-decisions/${c.TITLE_ID}/`;
  const path = approval.decisionEvidenceReference;
  if (!path.startsWith(prefix) || !GUID.test(path.slice(prefix.length).replace(/\.json$/, "")) ||
      !path.endsWith(".json")) deny("REVIEW_RECOVERY_DECISION_EVIDENCE_DENIED");
  const record = await readVersioned(container, path, approval.decisionEvidenceSha256);
  const value = record.value;
  if (value.status !== "APPROVED" || value.decisionType !== "APPROVE_ONE_ADDITIONAL_INTERNAL_ASSESSMENT" ||
      value.actorContactId !== approval.approvedByContactId || value.decidedAt !== approval.approvedAt ||
      value.executionId !== approval.executionId || value.recoveryRelease !== approval.recoveryRelease ||
      value.maxCostUsd !== approval.maxCostUsd || JSON.stringify(value.limits) !== JSON.stringify(approval.limits) ||
      typeof value.originalHumanEvidenceReference !== "string" || !value.originalHumanEvidenceReference.trim()) {
    deny("REVIEW_RECOVERY_DECISION_EVIDENCE_DENIED");
  }
  return record;
}

async function countRequest(prompt, deps) {
  const body = provider.buildRequestBody(prompt, route);
  if (body.tools[0].strict !== true || body.max_tokens !== c.LIMITS.maxOutputTokens ||
      provider.selectRuntimeOptions(route).maxRetries !== 0 ||
      provider.selectRuntimeOptions(route).timeoutMs !== c.LIMITS.timeoutMs) deny("REVIEW_RECOVERY_PROVIDER_LIMIT_DRIFT");
  const { max_tokens: _max, stream: _stream, ...countBody } = body;
  const endpoint = (deps.env.AZURE_FOUNDRY_ENDPOINT || "").replace(/\/$/, "");
  if (endpoint !== "https://ais-jm1-foundry.services.ai.azure.com") deny("REVIEW_RECOVERY_PROVIDER_SCOPE_DENIED");
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  const token = await credential.getToken(provider.TOKEN_SCOPE);
  const response = await (deps.fetch || fetch)(`${endpoint}/anthropic/v1/messages/count_tokens`, {
    method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token.token}`,
      "anthropic-version": deps.env.AZURE_FOUNDRY_ANTHROPIC_VERSION || provider.DEFAULT_ANTHROPIC_VERSION },
    body: JSON.stringify(countBody), signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) deny("REVIEW_RECOVERY_TOKEN_COUNT_UNAVAILABLE");
  const value = await response.json();
  if (!Number.isSafeInteger(value.input_tokens) || value.input_tokens < 1) deny("REVIEW_RECOVERY_TOKEN_COUNT_INVALID");
  return { inputTokens: value.input_tokens, requestSha256: sha(JSON.stringify(body)),
    verifiedAt: (deps.now || (() => new Date()))().toISOString() };
}

async function readDeployment(deps) {
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  const token = await credential.getToken("https://management.azure.com/.default");
  const url = "https://management.azure.com/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-ai/providers/Microsoft.CognitiveServices/accounts/ais-jm1-foundry/deployments/jm1-editorial-devline-primary?api-version=2024-10-01";
  const response = await (deps.fetch || fetch)(url, { headers: { Authorization: `Bearer ${token.token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) deny("REVIEW_RECOVERY_DEPLOYMENT_READ_UNAVAILABLE");
  const value = await response.json();
  if (value.name !== route.deploymentName || value.properties?.provisioningState !== "Succeeded" ||
      value.properties.model?.name !== route.model || value.properties.model?.version !== "2" ||
      value.sku?.name !== "GlobalStandard") deny("REVIEW_RECOVERY_DEPLOYMENT_DRIFT");
  return { model: value.properties.model.name, modelVersion: value.properties.model.version, sku: value.sku.name };
}

async function prepareRecovery(deps) {
  const env = deps.env || process.env; const now = (deps.now || (() => new Date()))();
  if (!/^[a-f0-9]{40}$/.test(env.JM1_RELEASE_SHA || "") ||
      !GUID.test(env.JM1_GLORY_RECOVERY_APPROVAL_ID || "") ||
      !/^[a-f0-9]{64}$/.test(env.JM1_GLORY_RECOVERY_APPROVAL_SHA256 || "") ||
      !/^[a-f0-9]{64}$/.test(env.JM1_GLORY_RECOVERY_TARIFF_SHA256 || "")) deny("REVIEW_RECOVERY_PINS_MISSING");
  const container = deps.containerClient;
  if ((await container.getProperties()).blobPublicAccess) deny("REVIEW_RECOVERY_STORAGE_NOT_PRIVATE");
  const approvalPath = `commissioning-recovery-approvals/${c.TITLE_ID}/${env.JM1_GLORY_RECOVERY_APPROVAL_ID}.json`;
  const approvalRecord = await readVersioned(container, approvalPath, env.JM1_GLORY_RECOVERY_APPROVAL_SHA256);
  const approval = validateApproval(approvalRecord, env, now);
  const decisionRecord = await readDecisionEvidence(container, approval);
  const execution = await readVersioned(container, `commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`);
  if (execution.value.status !== "HELD" || execution.value.attempts !== 5 || execution.etag !== c.HELD_ETAG ||
      c.digest(execution.value) !== approval.preimageSha256) deny("REVIEW_RECOVERY_PREIMAGE_CHANGED");
  const tariffRecord = await readVersioned(container, `commissioning-recovery-tariffs/${c.TITLE_ID}.json`, env.JM1_GLORY_RECOVERY_TARIFF_SHA256);
  await (deps.readDeployment || readDeployment)({ ...deps, env });
  const binding = require("./titleCommissioningOwnerBindings").ownerBinding(c.TITLE_ID);
  const prepared = await (deps.prepareReview || require("../editorial/commissioningEditorialReviewAdapter").prepareCommissioningEditorialReview)(binding.request, deps);
  const canon = prepared.binding.authority.find(source => source.role === "EDITORIAL_REVIEW_CANON");
  if (`${prepared.run.executionId}:editorial-review:v1` !== c.EXECUTION_ID ||
      prepared.run.source.sha256 !== c.SOURCE_HASH || canon?.sha256 !== c.CANON_HASH) deny("REVIEW_RECOVERY_AUTHORITY_DRIFT");
  const count = await (deps.countRequest || countRequest)(prepared.assembled.prompt, { ...deps, env });
  if (count.requestSha256 !== sha(JSON.stringify(provider.buildRequestBody(prepared.assembled.prompt, route)))) deny("REVIEW_RECOVERY_REQUEST_DRIFT");
  const budget = validateBudget(tariffRecord.value, count, approval, (deps.now || (() => new Date()))());
  return { input: { state: execution.value, etag: execution.etag, approval, reviewInput: binding.request,
    current: { release: env.JM1_RELEASE_SHA, strictProducerRelease: c.RELEASE,
      sourceSha256: c.SOURCE_HASH, canonSha256: c.CANON_HASH, strictTool: true,
      jackieAuthorshipVerified: true, scopeEnabled: true } }, blob: execution.blob,
    approvalRecord, approvalPath, decisionRecord, tariffRecord, budget, prepared };
}

module.exports = { prepareRecovery, readVersioned, validateApproval, validateBudget, countRequest,
  readDeployment, readDecisionEvidence, route, sha };
