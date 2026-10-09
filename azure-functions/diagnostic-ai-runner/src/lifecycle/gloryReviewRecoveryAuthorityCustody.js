"use strict";
const c = require("./gloryReviewRecoveryCandidate");
const readers = require("./gloryReviewRecoveryReaders");

// Exact direct human approval, independently read in the primary chat. This is
// a bounded custody repair, not a general approval or tariff authoring API.
const DECISION = Object.freeze({
  recordId: "862f8848-2783-4fdb-82d7-e37a8a2a3992",
  approvalRecordId: "d07562b1-2472-43af-9083-85c9963e9123",
  decidedAt: "2026-10-09T15:43:05.000Z",
  expiresAt: "2026-10-09T16:43:05.000Z",
  originalHumanEvidenceReference: "codex://threads/01a10bb0-3832-7e03-b3a7-2cc488694143/messages/01a12155-116f-7c30-b120-478bf3ab357e",
  precedingScopeReference: "codex://threads/01a10bb0-3832-7e03-b3a7-2cc488694143/turns/01a12154-c976-7b73-9377-79d18db8b4dc",
  approvedCodeBase: "445d2c68921b9317aa3f09fc4d0770097c31ba2e",
  maxCostUsd: 1
});
const TARIFF = Object.freeze({ status: "APPROVED_CURRENT", currency: "USD", model: "claude-sonnet-5",
  modelVersion: "2", sku: "GlobalStandard", caching: "NONE", additionalCharges: "NONE",
  inputMicroUsdPerToken: 2, outputMicroUsdPerToken: 10,
  sourceReference: "https://platform.claude.com/docs/en/about-claude/pricing#claude-in-microsoft-foundry-pricing",
  pricingEvidence: "Sonnet 5 standard USD2/MTok input and USD10/MTok output; Azure Marketplace CCU conversion at standard model rates. No US Data Zone multiplier or optional feature in this request. Actual tenant settlement remains separate.",
  verifiedAt: "2026-10-09T15:47:36.000Z", expiresAt: "2026-10-10T15:47:36.000Z" });
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

async function createExact(container, path, value) {
  const bytes = Buffer.from(JSON.stringify(value)); const sha256 = readers.sha(bytes);
  const blob = container.getBlockBlobClient(path);
  let created = true;
  try {
    await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } });
  } catch (error) {
    if (![409, 412].includes(error?.statusCode)) throw error;
    created = false;
  }
  const saved = await readers.readVersioned(container, path, sha256);
  return { reference: path, sha256, etag: saved.etag, created };
}

async function registerApprovedRecoveryAuthority(deps) {
  const env = deps.env || process.env; const now = (deps.now || (() => new Date()))();
  if (env.JM1_GLORY_RECOVERY_CUSTODY_ENABLED !== "true" ||
      !/^[a-f0-9]{40}$/.test(env.JM1_RELEASE_SHA || "") ||
      now.getTime() < Date.parse(TARIFF.verifiedAt) || now.getTime() >= Date.parse(DECISION.expiresAt)) {
    deny("REVIEW_RECOVERY_CUSTODY_AUTHORITY_UNAVAILABLE");
  }
  const container = deps.containerClient;
  if ((await container.getProperties()).blobPublicAccess) deny("REVIEW_RECOVERY_STORAGE_NOT_PRIVATE");
  const state = await readers.readVersioned(container, `commissioning-review-executions/${c.TITLE_ID}/${c.BINDING_HASH}.json`);
  if (state.etag !== c.HELD_ETAG || state.value.status !== "HELD" || state.value.attempts !== 5 ||
      state.value.titleId !== c.TITLE_ID || state.value.executionId !== c.EXECUTION_ID ||
      state.value.bindingHash !== c.BINDING_HASH || state.value.causeCode !== "REVIEW_CATEGORY_NOTES_INVALID" ||
      state.value.quarantineReference !== `commissioning-review-quarantine/${c.TITLE_ID}/${c.BINDING_HASH}/${c.CANDIDATE_HASH}.json`) {
    deny("REVIEW_RECOVERY_PREIMAGE_CHANGED");
  }
  const request = require("./titleCommissioningOwnerBindings").ownerBinding(c.TITLE_ID).request;
  const prepared = await (deps.prepareReview || require("../editorial/commissioningEditorialReviewAdapter").prepareCommissioningEditorialReview)(request, deps);
  if (`${prepared.run.executionId}:editorial-review:v1` !== c.EXECUTION_ID || prepared.run.source.sha256 !== c.SOURCE_HASH ||
      prepared.binding.authority.find(s => s.role === "EDITORIAL_REVIEW_CANON")?.sha256 !== c.CANON_HASH) {
    deny("REVIEW_RECOVERY_AUTHORITY_DRIFT");
  }
  const founder = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const decisionValue = { status: "APPROVED", decisionType: "APPROVE_ONE_ADDITIONAL_INTERNAL_ASSESSMENT",
    actorContactId: founder, decidedAt: DECISION.decidedAt, executionId: c.EXECUTION_ID,
    recoveryRelease: env.JM1_RELEASE_SHA, approvedCodeBase: DECISION.approvedCodeBase,
    maxCostUsd: DECISION.maxCostUsd, limits: c.LIMITS, originalHumanEvidenceReference: DECISION.originalHumanEvidenceReference,
    precedingScopeReference: DECISION.precedingScopeReference, releaseRepairAuthority: "EXISTING_BOUNDED_TECHNICAL_COMMISSIONING_NO_SCOPE_EXPANSION" };
  const decision = await createExact(container, `commissioning-recovery-decisions/${c.TITLE_ID}/${DECISION.recordId}.json`, decisionValue);
  const tariff = await createExact(container, `commissioning-recovery-tariffs/${c.TITLE_ID}.json`, TARIFF);
  const approvalValue = { recordId: DECISION.approvalRecordId, approvedByContactId: founder, status: "APPROVED",
    purpose: "ONE_ADDITIONAL_GLORY_INTERNAL_ASSESSMENT", decisionEvidenceReference: decision.reference,
    decisionEvidenceSha256: decision.sha256, approvedAt: DECISION.decidedAt, expiresAt: DECISION.expiresAt,
    executionId: c.EXECUTION_ID, release: c.RELEASE, recoveryRelease: env.JM1_RELEASE_SHA,
    expectedEtag: state.etag, preimageSha256: c.digest(state.value), limits: c.LIMITS, maxCostUsd: DECISION.maxCostUsd };
  const approval = await createExact(container, `commissioning-recovery-approvals/${c.TITLE_ID}/${DECISION.approvalRecordId}.json`, approvalValue);
  return { status: "APPROVED_AUTHORITY_CUSTODY_READY_NOT_DISPATCHED", approvalRecordId: DECISION.approvalRecordId,
    approval, decision, tariff, heldEtag: state.etag, preimageSha256: approvalValue.preimageSha256,
    release: env.JM1_RELEASE_SHA, approvedCodeBase: DECISION.approvedCodeBase,
    businessEffects: 0, executionEffects: 0, authorityCustodyWrites: [approval, decision, tariff].filter(r => r.created).length,
    modelInvocationAttempts: 0 };
}
module.exports = { registerApprovedRecoveryAuthority, DECISION, TARIFF };
