"use strict";

const { digest, hash, validateOwnerBinding } = require("./coverOwnerStore");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID } = require("../author/jackieTitleSystemCommissioningPolicy");
const { resolveCoverAuthorityBundle, projectCoverAuthority, canonicalJson } = require("./coverAuthorityBundle");
const { prepareCreativeBrief, conceptPrompt, STATES } = require("./coverDesignRuntime");
const { createCoverReviewPackage } = require("./coverReviewPackage");
const LEASE_MS = 5 * 60 * 1000;
const { randomUUID } = require("node:crypto");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

async function readBoundAuthority(request, deps) {
  const binding = validateOwnerBinding(request);
  const stored = await deps.store.read("authority", binding.authorityKey);
  if (!stored || stored.sha256 !== binding.authoritySha256 || stored.value.titleId !== binding.titleId ||
      stored.value.editionId !== binding.editionId || canonicalJson(stored.value.source) !== canonicalJson(binding.source) ||
      stored.value.authorityReference !== binding.authorityReference || stored.value.status !== "READY" ||
      stored.value.held === true || stored.value.authorId !== JACKIE_CANONICAL_AUTHOR_CONTACT_ID) deny("COVER_OWNER_AUTHORITY_DENIED");
  if (stored.value.synthetic === true && deps.store.acceptance !== true) deny("COVER_SYNTHETIC_AUTHORITY_PROMOTION_DENIED");
  if (await deps.verifyCurrentAuthority(request, stored.value) !== true) deny("COVER_OWNER_SOURCE_OR_IDENTITY_DENIED");
  const resolved = resolveCoverAuthorityBundle(binding.titleId, stored.value.candidates,
    { now: (deps.now || (() => new Date()))().toISOString() });
  if (!resolved.ok || resolved.bundle.fields.authorId.value !== JACKIE_CANONICAL_AUTHOR_CONTACT_ID) deny("COVER_OWNER_BUNDLE_INCOMPLETE");
  const prepared = prepareCreativeBrief(projectCoverAuthority(resolved.bundle));
  if (!prepared.ok) deny("COVER_OWNER_BRIEF_INCOMPLETE");
  return { binding, authority: stored, bundle: resolved.bundle, brief: prepared.brief };
}

async function executeCoverOwner(requestKey, deps = {}) {
  if (!deps.store || typeof deps.verifyCurrentAuthority !== "function") deny("COVER_OWNER_ADAPTERS_NOT_BOUND");
  const requestRow = await deps.store.read("requests", requestKey);
  if (!requestRow) return { status: "HELD", code: "COVER_OWNER_REQUEST_MISSING", effects: 0 };
  const request = requestRow.value;
  // Authority denial is deliberately before reservation, persistence or model work.
  const prepared = await readBoundAuthority(request, deps);
  const bindingHash = digest(prepared.binding);
  if (requestKey !== digest({ titleId: request.titleId, editionId: request.editionId })) deny("COVER_OWNER_REQUEST_IDENTITY_CONFLICT");
  const executionKey = digest({ requestKey, bindingHash, briefVersion: prepared.brief.authorityDigest });
  const existing = await deps.store.read("executions", executionKey);
  if (existing?.value.status === "AWAITING_REVIEW") {
    const receipt = await deps.store.read("receipts", existing.value.receiptKey);
    const artifact = receipt && await deps.store.read("packages", receipt.value.packageKey, "html");
    if (!receipt || receipt.value.bindingHash !== bindingHash || !artifact || artifact.sha256 !== receipt.value.packageSha256 ||
        receipt.value.executionKey !== executionKey) deny("COVER_OWNER_COMPLETED_REPLAY_UNBOUND");
    if (deps.store.acceptance !== true && (typeof deps.verifyReviewDelivery !== "function" ||
        !receipt.value.reviewDelivery || await deps.verifyReviewDelivery({ request, receipt: receipt.value, bytes: artifact.bytes }) !== true)) {
      deny("COVER_OWNER_COMPLETED_REVIEW_CUSTODY_FAILED");
    }
    const alertKey = digest({ executionKey, kind: "COVER_OWNER_RECOVERY" });
    const alert = await deps.store.read("alerts", alertKey);
    if (alert?.value.status === "OPEN") await deps.store.writeJson("alerts", alertKey,
      { ...alert.value, status: "RESOLVED", receiptKey: existing.value.receiptKey }, { etag: alert.etag });
    return { status: "AWAITING_REVIEW", replay: true, executionKey, receiptReference: receipt.reference,
      packageReference: artifact.reference, packageSha256: artifact.sha256, providerCalls: 0 };
  }
  const now = (deps.now || (() => new Date()))();
  if (existing?.value.status === "IN_PROGRESS" && Date.parse(existing.value.leaseUntil) > now.getTime()) {
    return { status: "IN_PROGRESS", executionKey, providerCalls: 0 };
  }
  if (existing?.value.attempts >= 3 && existing.value.status === "RECOVERY_REQUIRED") {
    for (let direction = 1; direction <= request.variantCount; direction++) {
      const key = digest({ executionKey, direction });
      const outcome = await deps.store.read("outcomes", key);
      if (outcome?.value.status === "INTENT_PERSISTED" &&
          (!deps.readProviderOutcome || !await deps.readProviderOutcome(key))) {
        return { status: "HELD", code: "COVER_PROVIDER_RECONCILIATION_REQUIRED", executionKey, providerCalls: 0 };
      }
    }
  }
  // A fresh invocation may generate only with native spend verification. Recovery
  // reads stored outcomes; it cannot issue a second call after a lost response.
  if (!existing && deps.generationEnabled !== true) return { status: "HELD", code: "COVER_GENERATION_DISABLED", effects: 0 };
  if (!existing && (typeof deps.verifySpendAuthority !== "function" ||
      await deps.verifySpendAuthority(request, prepared.bundle) !== true)) return { status: "HELD", code: "COVER_PAID_AUTHORITY_MISSING", effects: 0 };
  let execution = existing;
  const claimToken = randomUUID();
  if (!execution) {
    try {
      execution = await deps.store.writeJson("executions", executionKey, { schemaVersion: 1, executionKey, bindingHash,
        titleId: request.titleId, editionId: request.editionId, status: "IN_PROGRESS", attempts: 1, claimToken,
        claimedAt: now.toISOString(), leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString() });
    } catch (error) {
      if ([409, 412].includes(error.statusCode)) return { status: "IN_PROGRESS", executionKey, providerCalls: 0 };
      throw error;
    }
  } else if (execution.value.bindingHash !== bindingHash || !["IN_PROGRESS", "RECOVERY_REQUIRED"].includes(execution.value.status)) {
    deny("COVER_OWNER_EXECUTION_CONFLICT");
  } else {
    if (Number.isFinite(Date.parse(execution.value.nextAttemptAt)) && Date.parse(execution.value.nextAttemptAt) > now.getTime()) {
      return { status: "RETRY_PENDING", executionKey, providerCalls: 0 };
    }
    try {
      execution = await deps.store.writeJson("executions", executionKey, { ...execution.value,
        status: "IN_PROGRESS", claimToken, attempts: execution.value.attempts + 1,
        claimedAt: now.toISOString(), leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString(), nextAttemptAt: null },
      { etag: execution.etag });
    } catch (error) {
      if ([409, 412].includes(error.statusCode)) return { status: "CLAIM_CONFLICT", executionKey, providerCalls: 0 };
      throw error;
    }
  }
  let providerCalls = 0;
  try {
    const concepts = [];
    for (let direction = 1; direction <= request.variantCount; direction++) {
      const outcomeKey = digest({ executionKey, direction });
      let outcome = await deps.store.read("outcomes", outcomeKey);
      if (!outcome) {
        if (deps.generationEnabled !== true || typeof deps.verifySpendAuthority !== "function" ||
            await deps.verifySpendAuthority(request, prepared.bundle) !== true) return await hold("COVER_PAID_AUTHORITY_MISSING");
        if (typeof deps.generateImage !== "function") return await hold("COVER_PROVIDER_NOT_BOUND");
        if (deps.store.acceptance !== true && (typeof deps.reserveSpendAuthority !== "function" ||
            await deps.reserveSpendAuthority(request, prepared.bundle, { executionKey, bindingHash }) !== true)) {
          return await hold("COVER_SPEND_RESERVATION_DENIED");
        }
        const intent = { schemaVersion: 1, executionKey, bindingHash, titleId: request.titleId, editionId: request.editionId,
          direction, status: "INTENT_PERSISTED", providerRequestId: outcomeKey,
          promptSha256: hash(Buffer.from(conceptPrompt(prepared.brief, direction - 1))) };
        await deps.store.writeJson("outcomes", outcomeKey, intent);
        await readBoundAuthority(request, deps);
        await verifyClaim();
        if (deps.generationEnabled !== true || await deps.verifySpendAuthority(request, prepared.bundle) !== true) return await hold("COVER_PAID_AUTHORITY_CHANGED");
        providerCalls++;
        const result = await deps.generateImage({ titleId: request.titleId, editionId: request.editionId, executionKey,
          bindingHash, direction, providerRequestId: outcomeKey, prompt: conceptPrompt(prepared.brief, direction - 1) });
        if (!Buffer.isBuffer(result?.bytes) || result.safetyPassed !== true || !result.safetyEvidenceId ||
            !result.providerReceiptId || result.providerRequestId !== outcomeKey ||
            hash(result.bytes) !== result.sha256) return await hold("COVER_PROVIDER_RESULT_UNBOUND");
        const assetKey = digest({ executionKey, direction, sha256: result.sha256 });
        await deps.store.write("assets", assetKey, result.bytes, { extension: "png", immutable: true });
        await verifyClaim();
        const intentRow = await deps.store.read("outcomes", outcomeKey);
        outcome = await deps.store.writeJson("outcomes", outcomeKey, { ...intent, status: "RESULT_PERSISTED",
          assetKey, sha256: result.sha256, width: result.width, height: result.height,
          safetyEvidenceId: result.safetyEvidenceId, providerReceiptId: result.providerReceiptId,
          synthetic: deps.store.acceptance === true }, { etag: intentRow.etag });
      }
      if (outcome.value.status === "INTENT_PERSISTED" && typeof deps.readProviderOutcome === "function") {
        const recovered = await deps.readProviderOutcome(outcomeKey);
        if (recovered?.executionKey === executionKey && recovered.bindingHash === bindingHash &&
            recovered.providerRequestId === outcomeKey && recovered.titleId === request.titleId &&
            recovered.editionId === request.editionId && recovered.direction === direction &&
            recovered.status === "RESULT_PERSISTED") {
          const recoveredAsset = await deps.store.read("assets", recovered.assetKey, "png");
          if (recoveredAsset?.sha256 === recovered.sha256) {
            await verifyClaim();
            outcome = await deps.store.writeJson("outcomes", outcomeKey, recovered, { etag: outcome.etag });
          }
        }
      }
      const value = outcome.value;
      if (value.status !== "RESULT_PERSISTED" || value.executionKey !== executionKey || value.bindingHash !== bindingHash ||
          value.direction !== direction || value.titleId !== request.titleId || value.editionId !== request.editionId) return await hold("COVER_PROVIDER_OUTCOME_AMBIGUOUS");
      const bytes = await deps.store.read("assets", value.assetKey, "png");
      if (!bytes || bytes.sha256 !== value.sha256) return await hold("COVER_PROVIDER_ASSET_CUSTODY_FAILED");
      concepts.push({ label: String.fromCharCode(64 + direction), assetId: value.assetKey, sha256: value.sha256,
        width: value.width, height: value.height, safetyEvidenceId: value.safetyEvidenceId, direction });
    }
    await readBoundAuthority(request, deps);
    await verifyClaim();
    const packageKey = digest({ executionKey, bindingHash, concepts });
    const composer = createCoverReviewPackage({
      fetchAssetBytes: async concept => (await deps.store.read("assets", concept.assetId, "png"))?.bytes,
      saveReviewArtifact: async artifact => {
        const stored = await deps.store.write("packages", packageKey, artifact.bytes, { extension: "html", immutable: true });
        return { assetId: packageKey, location: stored.reference, sha256: stored.sha256 };
      }
    });
    const record = { state: STATES.CONCEPTS_READY, titleId: request.titleId, brief: prepared.brief, concepts };
    const reviewPackage = await composer.composeReviewPackage(record);
    const preflight = await composer.preflightReviewPackage({ record, reviewPackage });
    if (!preflight.passed) return await hold("COVER_OWNER_REVIEW_PREFLIGHT_FAILED");
    let reviewDelivery;
    if (deps.store.acceptance !== true) {
      if (typeof deps.persistReviewPackage !== "function") return await hold("COVER_REVIEW_DESTINATION_NOT_BOUND");
      reviewDelivery = await deps.persistReviewPackage({ request, executionKey, bindingHash,
        bytes: reviewPackage.bytes, sha256: reviewPackage.sha256, assertClaim: verifyClaim });
      if (!reviewDelivery?.itemId || reviewDelivery.sha256 !== reviewPackage.sha256) {
        return await hold("COVER_REVIEW_DESTINATION_READBACK_FAILED");
      }
    }
    const receipt = { schemaVersion: 1, status: "AWAITING_REVIEW", executionKey, bindingHash,
      titleId: request.titleId, editionId: request.editionId, source: request.source,
      authorityReference: request.authorityReference, authoritySha256: request.authoritySha256,
      coverBundleSha256: prepared.bundle.sha256, briefSha256: prepared.brief.authorityDigest,
      packageKey, packageSha256: reviewPackage.sha256, preflightEvidenceId: preflight.evidenceId,
      concepts, synthetic: deps.store.acceptance === true, stageAdvanced: false,
      authorCommunication: false, creativeApproval: "PENDING", ...(reviewDelivery ? { reviewDelivery } : {}) };
    const receiptKey = digest(receipt);
    const receiptRow = await deps.store.writeJson("receipts", receiptKey, receipt, { immutable: true });
    await verifyClaim();
    await deps.store.writeJson("executions", executionKey, { ...execution.value, status: "AWAITING_REVIEW", receiptKey,
      completedAt: now.toISOString(), leaseUntil: null }, { etag: execution.etag });
    const alertKey = digest({ executionKey, kind: "COVER_OWNER_RECOVERY" });
    const alert = await deps.store.read("alerts", alertKey);
    if (alert?.value.status === "OPEN") await deps.store.writeJson("alerts", alertKey,
      { ...alert.value, status: "RESOLVED", receiptKey }, { etag: alert.etag });
    return { status: "AWAITING_REVIEW", executionKey, receiptReference: receiptRow.reference,
      packageReference: reviewPackage.location, packageSha256: reviewPackage.sha256, providerCalls };
  } catch (error) {
    if (deps.store.acceptance === true && error.safeCode === "COVER_ACCEPTANCE_SIMULATED_CRASH") throw error;
    if ([409, 412].includes(error.statusCode)) return { status: "CLAIM_CONFLICT", executionKey, providerCalls };
    return hold(error.safeCode || "COVER_OWNER_RECOVERY_REQUIRED");
  }
  async function hold(code) {
    const current = await deps.store.read("executions", executionKey);
    if (current?.value.status === "AWAITING_REVIEW") return { status: "RECEIPT_RECONCILIATION_REQUIRED", executionKey, providerCalls };
    if (current && current.value.bindingHash === bindingHash && current.value.claimToken === claimToken) {
      await deps.store.writeJson("executions", executionKey, { ...current.value, status: "RECOVERY_REQUIRED",
        failureCode: /^COVER_[A-Z_]+$/.test(code) ? code : "COVER_OWNER_RECOVERY_REQUIRED", leaseUntil: null,
        nextAttemptAt: new Date(now.getTime() + Math.min(300000, 1000 * 2 ** Math.min(current.value.attempts, 8))).toISOString() }, { etag: current.etag });
      const alertKey = digest({ executionKey, kind: "COVER_OWNER_RECOVERY" });
      if (!await deps.store.read("alerts", alertKey)) await deps.store.writeJson("alerts", alertKey, {
        schemaVersion: 1, kind: "COVER_OWNER_RECOVERY", status: "OPEN", executionKey, bindingHash,
        failureCode: /^COVER_[A-Z_]+$/.test(code) ? code : "COVER_OWNER_RECOVERY_REQUIRED",
        automaticPaidRetry: false, synthetic: deps.store.acceptance === true
      }, { immutable: true });
    }
    return { status: "RECOVERY_REQUIRED", code, executionKey, providerCalls, automaticPaidRetry: false };
  }
  async function verifyClaim() {
    const currentRequest = await deps.store.read("requests", requestKey);
    if (!currentRequest || currentRequest.etag !== requestRow.etag || currentRequest.sha256 !== requestRow.sha256) {
      deny("COVER_OWNER_REQUEST_CHANGED");
    }
    const current = await deps.store.read("executions", executionKey);
    if (current?.value.status !== "IN_PROGRESS" || current.value.claimToken !== claimToken ||
        !Number.isFinite(Date.parse(current.value.leaseUntil)) ||
        Date.parse(current.value.leaseUntil) <= (deps.now || (() => new Date()))().getTime()) deny("COVER_OWNER_CLAIM_LOST");
  }
}

module.exports = { executeCoverOwner, readBoundAuthority };
