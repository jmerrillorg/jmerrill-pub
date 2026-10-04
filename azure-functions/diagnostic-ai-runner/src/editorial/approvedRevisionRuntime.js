"use strict";

const { policy, OWNER, validateInput, readApprovedRevisionAuthority } = require("./approvedRevisionAuthority");
const { hash, fail, deriveApprovedFormattingPlan, produceApprovedFormattingRevision } = require("./approvedRevisionDocument");
const { createApprovedRevisionStore } = require("./approvedRevisionStore");
const { persistVariant, verifyReceipt } = require("./approvedRevisionPersistence");

function enabled(env = process.env) {
  return env.JM1_APPROVED_EDITORIAL_REVISION_ENABLED === "true" && env.JM1_APPROVED_EDITORIAL_REVISION_TASK_ID === policy.taskId;
}
function dependencies(deps) {
  const runtime = require("./editorialExecutionRuntime");
  return { ...deps, client: deps.client || runtime.createDataverseClient(runtime.requireDataverseConfig()),
    graph: deps.graph || runtime.graphRequest };
}
function safeCode(error) { return /^[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "REVISION_DEPENDENCY_FAILED"; }
function retryable(error) {
  return [408, 429].includes(error.status || error.statusCode) || (error.status || error.statusCode) >= 500 ||
    ["AbortError", "TimeoutError", "TypeError"].includes(error.name) || /THROTTL|TIMEOUT/.test(error.safeCode || "");
}

async function runApprovedRevision(input, supplied = {}) {
  validateInput(input);
  if (!["READBACK", "DRY_RUN"].includes(input.executionMode) && !enabled(supplied.env)) return { ok: false, status: "DISABLED", code: "REVISION_OWNER_DISABLED", externalSends: 0 };
  const deps = dependencies(supplied);
  const store = deps.store || createApprovedRevisionStore();
  await store.assertPrivate?.();
  const readAuthority = deps.readAuthority || ((request) => readApprovedRevisionAuthority(request, deps));
  const checkReceipt = deps.verifyReceipt || ((receipt) => verifyReceipt(deps, receipt));
  const receipt = await store.read("receipt.json");
  if (receipt) {
    await checkReceipt(receipt);
    return { ok: true, status: "IDEMPOTENT", receipt, externalSends: 0, artifactWrites: 0 };
  }
  if (input.executionMode === "READBACK") return { ok: true, status: "NOT_COMPLETED", state: await store.read("state.json"), ownerEnabled: enabled(supplied.env), externalSends: 0 };
  if (["DRY_RUN", "EXECUTE_ASYNC"].includes(input.executionMode)) {
    const authority = await readAuthority(input);
    const plan = await deriveApprovedFormattingPlan(authority.sourceBuffer);
    if (input.executionMode === "DRY_RUN") return { ok: true, status: "DRY_RUN_READY", owner: OWNER, taskId: policy.taskId,
      authorityFingerprint: authority.fingerprint, sources: authority.snapshot.sources, editCount: plan.edits.length,
      gridCount: 8, checkboxCount: 8, headingCount: 32, authorDeliveryEligible: false, externalSends: 0, artifactWrites: 0 };
    const { enqueueApprovedRevision } = require("./targetedEditorialExecutionQueue");
    return enqueueApprovedRevision(input, deps);
  }
  return store.withClaim(async (claim) => {
    const completed = await store.read("receipt.json");
    if (completed) { await checkReceipt(completed); return { ok: true, status: "IDEMPOTENT", receipt: completed, artifactWrites: 0, externalSends: 0 }; }
    const prior = await store.read("state.json");
    if (["HELD_AUTHORITY", "RETRY_EXHAUSTED"].includes(prior?.status)) return { ok: false, status: prior.status, code: prior.code, externalSends: 0 };
    if (prior?.nextAttemptAt && Date.parse(prior.nextAttemptAt) > Date.now()) return { ok: true, status: "BACKOFF", nextAttemptAt: prior.nextAttemptAt, externalSends: 0 };
    const attempt = (prior?.attempt || 0) + 1;
    await claim.state({ status: "RUNNING", attempt, startedAt: new Date().toISOString(), owner: OWNER });
    try {
      const authority = await readAuthority(input);
      let intent = await store.read("intent.json");
      if (intent && (intent.authorityFingerprint !== authority.fingerprint || intent.policySha256 !== hash(JSON.stringify(policy)))) fail("REVISION_AUTHORITY_CHANGED_AFTER_INTENT");
      if (!intent) {
        intent = { owner: OWNER, taskId: policy.taskId, recipe: policy.recipeVersion, createdAt: new Date().toISOString(),
          policySha256: hash(JSON.stringify(policy)), authorityFingerprint: authority.fingerprint, authority: authority.snapshot };
        await claim.assertOwned();
        await store.put("intent.json", intent);
      }
      let manifest = await store.read("output-manifest.json");
      let review = await store.readBytes("review.docx"), clean = await store.readBytes("clean.docx");
      if (!manifest) {
        // One immutable envelope prevents a crash between separately stored manuscript variants.
        let saved = await store.read("generated.json");
        if (!saved) {
          if (review || clean) fail("REVISION_INCOMPLETE_GENERATION_RECOVERY_REQUIRED");
          const generated = await (deps.produce || produceApprovedFormattingRevision)(authority.sourceBuffer, {
            sourceSha256: policy.sourceSha256, timestamp: intent.createdAt
          });
          saved = { evidence: generated.evidence, review: generated.review.toString("base64"), clean: generated.clean.toString("base64") };
          await claim.assertOwned();
          await store.put("generated.json", saved);
        }
        review = Buffer.from(saved.review, "base64"); clean = Buffer.from(saved.clean, "base64"); manifest = saved.evidence;
        if (hash(review) !== manifest.reviewSha256 || hash(clean) !== manifest.cleanSha256 || manifest.sourceSha256 !== policy.sourceSha256) fail("REVISION_GENERATED_ENVELOPE_INVALID");
        await store.putBytes("review.docx", review);
        await store.putBytes("clean.docx", clean);
        await store.put("output-manifest.json", manifest);
      }
      if (!review || !clean || hash(review) !== manifest.reviewSha256 || hash(clean) !== manifest.cleanSha256 ||
          manifest.sourceSha256 !== policy.sourceSha256 || manifest.recipe !== policy.recipeVersion ||
          manifest.gridCount !== 8 || manifest.headingFormats !== 32 || manifest.checkboxInsertions !== 8 ||
          manifest.textRetention !== "ALL_SOURCE_TEXT_PRESERVED") fail("REVISION_STORED_OUTPUT_MISMATCH");
      const fresh = await readAuthority(input);
      if (fresh.fingerprint !== intent.authorityFingerprint) fail("REVISION_AUTHORITY_CHANGED_BEFORE_PUBLICATION");
      const save = deps.persistVariant || ((variant, bytes, guard) => persistVariant(deps, variant, bytes, guard));
      const outputs = [];
      for (const [variant, bytes] of [["review", review], ["clean", clean]]) {
        await claim.assertOwned();
        outputs.push(await save(variant, bytes, claim));
      }
      const result = { owner: OWNER, taskId: policy.taskId, recipe: policy.recipeVersion, status: "AWAITING_VISUAL_QA",
        authorityFingerprint: intent.authorityFingerprint, sourceArtifactId: policy.sourceArtifactId, sourceSha256: policy.sourceSha256,
        canonicalSourceItemId: policy.canonicalSourceItemId, outputs, structuralQa: manifest,
        visualQa: "NOT_PERFORMED", taskCompleted: false, authorApproved: false, authorDeliveryEligible: false,
        authorCommunications: 0, stageAdvancements: 0, completedAt: new Date().toISOString() };
      await checkReceipt(result);
      await claim.assertOwned();
      await store.put("receipt.json", result);
      await claim.state({ status: "AWAITING_VISUAL_QA", attempt, taskId: policy.taskId, completedAt: result.completedAt });
      return { ok: true, status: result.status, receipt: result, externalSends: 0 };
    } catch (error) {
      const canRetry = retryable(error) && attempt < 5;
      const failure = { status: canRetry ? "RETRY_WAIT" : retryable(error) ? "RETRY_EXHAUSTED" : "HELD_AUTHORITY", attempt,
        code: safeCode(error), at: new Date().toISOString(), nextAttemptAt: canRetry ? new Date(Date.now() + Math.min(3600000, 120000 * 2 ** (attempt - 1))).toISOString() : null };
      await claim.state(failure);
      await store.put(`failure-${attempt}.json`, failure);
      return { ok: false, ...failure, externalSends: 0 };
    }
  });
}

module.exports = { enabled, runApprovedRevision, safeCode };
