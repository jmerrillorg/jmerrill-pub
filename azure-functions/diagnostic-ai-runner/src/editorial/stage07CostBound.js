"use strict";
const { createHash } = require("node:crypto");
const METHOD = "SONNET5_CONTEXT_ENVELOPE_V1";
const CONTEXT_TOKENS = 1_000_000;
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const deny = code => { throw Object.assign(new Error(code), { safeCode: code }); };
function valid(bound, requestSha256) {
  return bound?.method === METHOD && bound.requestSha256 === requestSha256 &&
    bound.inputTokenBound === CONTEXT_TOKENS && [4096,8192].includes(bound.maxOutputTokens) &&
    bound.inputMicroUsdPerToken === 2 && bound.outputMicroUsdPerToken === 10 &&
    bound.maximumMicroUsd === CONTEXT_TOKENS * 2 + bound.maxOutputTokens * 10 &&
    bound.evidenceReference === "docs/governance/stage07-context-reservation-v1.md";
}

// Reserve the documented entire context as INPUT, plus the requested output.
// Deliberately do not subtract output from context: this over-reserves safely.
// Estimates are capacity/planning signals only, never monetary authority.
function quote(request, authority) {
  if (authority?.model !== "claude-sonnet-5" || authority.modelVersion !== "2" ||
      authority.deploymentName !== "jm1-editorial-devline-primary" || authority.sku !== "GlobalStandard" ||
      authority.inputMicroUsdPerToken !== 2 || authority.outputMicroUsdPerToken !== 10 ||
      authority.tariffVerified !== true || authority.current !== true ||
      authority.contextTokens !== CONTEXT_TOKENS || authority.maxProviderRetries !== 0 || authority.allowFallback !== false) {
    deny("STAGE07_COST_AUTHORITY_INVALID");
  }
  const provider = require("../model/providers/microsoftFoundryClaudeProvider");
  const prompt = request?.messages?.[0]?.content;
  let pass;
  try { pass = JSON.parse(prompt).pass; } catch { deny("STAGE07_COST_REQUEST_INVALID"); }
  if (!["PLAN_SECTION", "PLAN_SYNTHESIS", "EDIT", "CONSISTENCY_SECTION", "FINAL_SYNTHESIS"].includes(pass)) deny("STAGE07_COST_REQUEST_INVALID");
  const route = { deploymentName: authority.deploymentName, promptVersion: "JMP-STAGE07-BUDGETED-V1" };
  // Exact canonical serialization excludes caching, server tools, multi-turn
  // execution, compaction, media, extra betas, and unpriced request features.
  if (JSON.stringify(request) !== JSON.stringify(provider.buildRequestBody(prompt, route)) ||
      ![4096, 8192].includes(request.max_tokens)) deny("STAGE07_COST_REQUEST_INVALID");
  return { method: METHOD, requestSha256: hash(request), inputTokenBound: CONTEXT_TOKENS,
    maxOutputTokens: request.max_tokens, maximumMicroUsd: CONTEXT_TOKENS * 2 + request.max_tokens * 10,
    inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10,
    evidenceReference: "docs/governance/stage07-context-reservation-v1.md" };
}
module.exports = { METHOD, CONTEXT_TOKENS, quote, valid };
