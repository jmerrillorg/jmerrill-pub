"use strict";

const { createHash } = require("node:crypto");
const { planTitleCommissioningRun } = require("../lifecycle/titleCommissioningRun");
const { readTitleCommissioningAuthority } = require("../lifecycle/titleCommissioningAuthority");
const { assembleReviewPrompt, validateEditorialReview } = require("./commissioningEditorialReviewContract");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

// This adapter produces an internal assessment only. Its receipt is linked-run
// evidence, never a Dataverse stage transition or approval authority.
async function executeCommissioningEditorialReview(input, deps = {}) {
  const run = planTitleCommissioningRun(input);
  if (typeof deps.readReviewAuthority !== "function" || typeof deps.downloadSource !== "function") {
    fail("REVIEW_OWNER_READERS_NOT_BOUND");
  }
  await readTitleCommissioningAuthority(input, deps);
  const intakeBlob = deps.containerClient.getBlockBlobClient(`commissioning-intake/${run.titleId}/${run.bindingHash}.json`);
  const intakeProperties = await intakeBlob.getProperties();
  if (!intakeProperties.etag) fail("REVIEW_INTAKE_VERSION_MISSING");
  const intake = JSON.parse((await intakeBlob.downloadToBuffer(0, undefined, { conditions: { ifMatch: intakeProperties.etag } })).toString("utf8"));
  if (intake.executionId !== run.executionId || intake.bindingHash !== run.bindingHash ||
      intake.titleId !== run.titleId || intake.status !== "INTAKE_MATERIALS_VERIFIED" ||
      intake.productionStageChanged !== false) fail("REVIEW_INTAKE_BINDING_INVALID");
  const authority = await deps.readReviewAuthority(run.titleId, run.source.sha256);
  const bytes = await deps.downloadSource(run.source);
  if (!Buffer.isBuffer(bytes) || sha(bytes) !== run.source.sha256) fail("REVIEW_SOURCE_BYTES_CHANGED");
  const extracted = await (deps.extractText || (async buffer =>
    (await require("mammoth").extractRawText({ buffer })).value))(bytes);
  const assembled = assembleReviewPrompt({ titleId: run.titleId, sourceSha256: run.source.sha256,
    sourceVersion: run.source.version, manuscript: extracted, authority });
  const binding = { parentExecutionId: run.executionId, titleId: run.titleId, stage: "EDITORIAL_REVIEW",
    source: run.source, promptSha256: assembled.promptSha256,
    authority: assembled.provenance.map(({ verifiedAt, ...source }) => source), contractVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" };
  const bindingHash = sha(JSON.stringify(binding));
  const reference = `commissioning-editorial-review/${run.titleId}/${run.bindingHash}/${bindingHash}.json`;
  const resultBlob = deps.containerClient.getBlockBlobClient(reference);
  const ensureDocument = async receipt => {
    const document = Buffer.from(require("./commissioningEditorialReviewRenderer")
      .renderCommissioningEditorialReview(receipt.report, receipt.binding));
    if (receipt.documentReference !== reference.replace(/\.json$/, ".md") || receipt.documentSha256 !== sha(document)) {
      fail("REVIEW_DOCUMENT_BINDING_INVALID");
    }
    const blob = deps.containerClient.getBlockBlobClient(receipt.documentReference);
    try {
      await blob.uploadData(document, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "text/markdown; charset=utf-8" } });
    } catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      const properties = await blob.getProperties();
      if (!properties.etag || !(await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).equals(document)) {
        fail("REVIEW_DOCUMENT_REPLAY_CONFLICT");
      }
    }
  };
  const readExisting = async () => {
    const properties = await resultBlob.getProperties();
    if (!properties.etag) fail("REVIEW_RESULT_VERSION_MISSING");
    const saved = JSON.parse((await resultBlob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
    if (saved.bindingHash !== bindingHash || JSON.stringify(saved.binding) !== JSON.stringify(binding) ||
        saved.status !== "EDITORIAL_REVIEW_READY_FOR_PUBLISHER" || saved.productionStageChanged !== false ||
        saved.reportSha256 !== sha(JSON.stringify(saved.report))) fail("REVIEW_RESULT_REPLAY_CONFLICT");
    validateEditorialReview(saved.report);
    await ensureDocument(saved);
    return { receipt: saved, reference, duplicate: true };
  };
  try { return await readExisting(); }
  catch (error) { if (error?.statusCode !== 404) throw error; }
  const limits = require("../model/providerSupport").getProviderRuntimeOptions("AZURE_FOUNDRY");
  const maximumProviderTime = (limits.maxRetries + 1) * limits.timeoutMs +
    limits.maxRetries * limits.maxRetryDelayMs * (1 + limits.jitterRatio);
  if (!Number.isFinite(maximumProviderTime) || maximumProviderTime > 10 * 60 * 1000) fail("REVIEW_MODEL_RETRY_BUDGET_EXCEEDED");
  const model = await (deps.callModel || require("../model/modelCaller").callModel)({
    contractTestMode: false, promptBody: assembled.prompt, diagnosticId: run.executionId,
    executionType: "REAL_MANUSCRIPT_PILOT", editorialTransaction: "GPAT-001",
    modelDeploymentAlias: "jm1-editorial-devline-primary",
    promptKey: "jm1-prompt-pub-editorial-review-assessment", promptVersion: binding.contractVersion,
    allowFallback: false
  });
  if (!model?.ok || model.provider !== "microsoft-foundry-claude" ||
      model.route?.deploymentAlias !== "jm1-editorial-devline-primary") {
    if (model?.gateBlocked) fail("REVIEW_MODEL_GATE_CLOSED");
    if ([400, 401, 403, 404].includes(model?.httpStatus) || model?.configMissing?.length ||
        (model?.ok && model.provider !== "microsoft-foundry-claude")) fail("REVIEW_MODEL_AUTHORITY_OR_CONFIGURATION_REQUIRED");
    fail("COMMISSIONING_DEPENDENCY_UNAVAILABLE");
  }
  const report = validateEditorialReview(model.output);
  if (report.intakeSummary.sourceVersion !== run.source.version) fail("REVIEW_OUTPUT_SOURCE_VERSION_MISMATCH");
  if (report.intakeSummary.wordCount !== extracted.trim().split(/\s+/u).length ||
      (authority.titleName && report.intakeSummary.title !== authority.titleName)) fail("REVIEW_OUTPUT_SOURCE_CONTEXT_MISMATCH");
  if (report.imprintAlignment.authority !== "SUGGESTED_ONLY") fail("REVIEW_OFFICIAL_IMPRINT_ASSIGNMENT_NOT_BOUND");
  // Recheck authority after inference; no result is published from stale scope.
  await readTitleCommissioningAuthority(input, deps);
  const refreshed = await deps.readReviewAuthority(run.titleId, run.source.sha256);
  const rebound = assembleReviewPrompt({ titleId: run.titleId, sourceSha256: run.source.sha256,
    sourceVersion: run.source.version, manuscript: extracted, authority: refreshed });
  if (rebound.promptSha256 !== assembled.promptSha256) fail("REVIEW_AUTHORITY_CHANGED_DURING_EXECUTION");
  const receipt = { schemaVersion: 1, bindingHash, binding, report, reportSha256: sha(JSON.stringify(report)),
    status: "EDITORIAL_REVIEW_READY_FOR_PUBLISHER", completedAt: (deps.now || (() => new Date()))().toISOString(),
    provider: model.provider, deploymentAlias: model.route.deploymentAlias,
    tokenCounts: model.tokenCounts, productionStageChanged: false, authorDecisionInferred: false,
    forbiddenEffects: run.forbiddenEffects,
    documentReference: reference.replace(/\.json$/, ".md"),
    documentSha256: sha(require("./commissioningEditorialReviewRenderer").renderCommissioningEditorialReview(report, binding)) };
  try {
    await resultBlob.uploadData(Buffer.from(JSON.stringify(receipt)), { conditions: { ifNoneMatch: "*" },
      blobHTTPHeaders: { blobContentType: "application/json" } });
    await ensureDocument(receipt);
    return { receipt, reference, duplicate: false };
  } catch (error) {
    if (![409, 412].includes(error?.statusCode)) throw error;
    return readExisting();
  }
}

module.exports = { executeCommissioningEditorialReview };
