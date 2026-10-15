"use strict";
const { createHash } = require("node:crypto");
const budget = require("./stage07BatchBudget");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { safeCode: code }); };
const natural = value => Number.isSafeInteger(value) && value >= 0;

// The owning runtime supplies verified source/approval authority and private,
// write-once receipt storage. No HTTP or stage mutation is exposed by this module.
async function executeAttempt(input, deps) {
  for (const key of ["verifyAuthority", "readReceipt", "writeReceipt", "callOnce", "validateOutput"]) {
    if (typeof deps[key] !== "function") fail("STAGE07_OWNER_DEPENDENCY_MISSING");
  }
  const authority = await deps.verifyAuthority(input);
  if (authority?.planSha256 !== input.planSha256 || authority.requestSha256 !== hash(input.request) ||
      authority.model !== "claude-sonnet-5" || authority.modelVersion !== "2" ||
      authority.deploymentName !== "jm1-editorial-devline-primary" || authority.maxProviderRetries !== 0 ||
      authority.allowFallback !== false || authority.sourceAndStageVerified !== true ||
      authority.tariffVerified !== true || authority.current !== true ||
      !natural(authority.estimatedInputTokens) || authority.estimatedInputTokens < 1 || authority.estimatedInputTokens > 32000 ||
      !natural(authority.maxOutputTokens) || authority.maxOutputTokens < 1 || authority.maxOutputTokens > 8192 ||
      !natural(authority.inputMicroUsdPerToken) || authority.inputMicroUsdPerToken < 1 ||
      !natural(authority.outputMicroUsdPerToken) || authority.outputMicroUsdPerToken < 1) fail("STAGE07_PREFLIGHT_HOLD");
  const bound = require("./stage07CostBound").quote(input.request, authority);
  if (bound.maxOutputTokens !== authority.maxOutputTokens) fail("STAGE07_PREFLIGHT_HOLD");
  const maximum = bound.maximumMicroUsd;
  if (!Number.isSafeInteger(maximum)) fail("STAGE07_COST_BOUND_INVALID");
  const requestSha256 = authority.requestSha256;
  const reservation = await budget.reserve(deps.store, { id: input.attemptId, taskId: input.taskId,
    planSha256: input.planSha256, requestSha256, maxMicroUsd: maximum,
    capacityTokens: authority.estimatedInputTokens + authority.maxOutputTokens, bound, requireVerifiedBounds: true });
  let receipt;
  if (!reservation.dispatch) {
    receipt = await deps.readReceipt(input.attemptId);
    if (!receipt) return { status: "UNRESOLVED_PROVIDER_ATTEMPT", dispatch: false, reservationRetained: true };
  } else {
    let result;
    try { result = await deps.callOnce(input.request); }
    catch (_) { return { status: "UNRESOLVED_PROVIDER_ATTEMPT", dispatch: true, reservationRetained: true }; }
    let accepted = false, sourceRestoration = null;
    if (result?.ok && result.stopReason !== "max_tokens") {
      try {
        sourceRestoration = deps.restoreSource ? await deps.restoreSource(result.output) : null;
        accepted = await deps.validateOutput(sourceRestoration?.output || result.output, input) === true;
      } catch (_) { accepted = false; }
    }
    receipt = { schemaVersion: 1, attemptId: input.attemptId, taskId: input.taskId,
      planSha256: input.planSha256, requestSha256, result, accepted,
      ...(sourceRestoration ? { sourceRestoration } : {}) };
    // Persist the provider result before releasing any reservation. If this
    // fails, restart holds the unknown attempt instead of calling the model.
    await deps.writeReceipt(input.attemptId, receipt);
  }
  if (receipt.attemptId !== input.attemptId || receipt.taskId !== input.taskId ||
      receipt.planSha256 !== input.planSha256 || receipt.requestSha256 !== requestSha256 ||
      typeof receipt.accepted !== "boolean") fail("STAGE07_RECEIPT_BINDING_CONFLICT");
  const result = receipt.result;
  if (result?.usageVerified !== true || !result.providerRequestId ||
      !natural(result.inputTokens) || !natural(result.outputTokens) ||
      result.model !== authority.model || result.modelVersion !== authority.modelVersion) {
    return { status: "USAGE_RECONCILIATION_REQUIRED", dispatch: reservation.dispatch, reservationRetained: true };
  }
  const actual = result.inputTokens * authority.inputMicroUsdPerToken + result.outputTokens * authority.outputMicroUsdPerToken;
  const settled = await budget.settle(deps.store, { id: input.attemptId, actualMicroUsd: actual,
    receiptReference: `stage07-attempt:${input.attemptId}:${hash(receipt)}`,
    outcome: receipt.accepted ? "SUCCESS" : "FAILED" });
  return { status: settled.hold ? "TARIFF_OR_USAGE_HOLD" : receipt.accepted ? "OUTPUT_VALIDATED" : "OUTPUT_REJECTED",
    dispatch: reservation.dispatch, replay: !reservation.dispatch, actualMicroUsd: actual,
    receiptSha256: hash(receipt), stageAdvanced: false };
}
module.exports = { executeAttempt };
