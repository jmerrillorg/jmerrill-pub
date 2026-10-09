"use strict";
const { ownerBinding, resolveOwnerBinding } = require("./titleCommissioningOwnerBindings");
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { createTitleCommissioningRuntimeReaders } = require("./titleCommissioningRuntimeReaders");
const { readTitleCommissioningAuthority } = require("./titleCommissioningAuthority");

async function titleCommissioningReadback(body, deps = {}) {
  if (!body || Object.keys(body).some(k => !["mode", "titleId"].includes(k)) ||
      !["COMMISSIONING_INTAKE_READ_ONLY", "COMMISSIONING_REVIEW_READ_ONLY", "COMMISSIONING_IDENTITY_READ_ONLY"].includes(body.mode)) {
    return { status: 400, jsonBody: { code: "COMMISSIONING_READBACK_SCOPE_DENIED", effects: 0 } };
  }
  if (body.mode === "COMMISSIONING_IDENTITY_READ_ONLY") {
    const authorizedSourceIds = ["f1908dc9-5775-f111-ab0f-6045bdd69435", "e797232b-da7a-f111-ab0f-00224820105b",
      "f79006b7-f595-f111-8076-00224820105b", "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2"];
    if (!authorizedSourceIds.includes(body.titleId)) return { status: 400, jsonBody: { code: "COMMISSIONING_READBACK_SCOPE_DENIED", effects: 0 } };
    const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
      apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL
    });
    const title = await client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${body.titleId}` });
    if (title?.jm1pub_titleid !== body.titleId) return { status: 409, jsonBody: { code: "COMMISSIONING_AUTHOR_AUTHORITY_CHANGED", effects: 0 } };
    // This scope authorizes a fixed-source identity read, never execution.
    const proof = await require("../author/jackieCommissioningIdentityReader").readJackieCommissioningIdentity(title,
      { enabled: true, titleId: body.titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }, client);
    return { status: 200, jsonBody: { mode: body.mode, titleId: body.titleId, titleVersion: String(title.versionnumber),
      identityBinding: proof ? "PASS" : "HELD", commissioningIdentity: proof, effects: 0,
      scopeStatus: "READ_ONLY_IDENTITY_PREFLIGHT_NOT_EXECUTION_AUTHORITY" } };
  }
  if (!ownerBinding(body.titleId) && !require("./titleCommissioningReceivedSources").policyForTitle(body.titleId)) {
    return { status: 400, jsonBody: { code: "COMMISSIONING_READBACK_SCOPE_DENIED", effects: 0 } };
  }
  const containerClient = deps.containerClient || require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(process.env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL
  });
  const binding = await resolveOwnerBinding(body.titleId, { ...deps, client });
  if (!binding) return { status: 400, jsonBody: { code: "COMMISSIONING_READBACK_SCOPE_DENIED", effects: 0 } };
  const plan = planTitleCommissioningRun(binding.request);
  if (body.mode === "COMMISSIONING_REVIEW_READ_ONLY" && plan.source.role === "RECEIVED_ORIGINAL") {
    return { status: 409, jsonBody: { code: "REVIEW_RECEIVED_SOURCE_NOT_APPROVED_CONTROLLING", effects: 0 } };
  }
  const readers = deps.readers || createTitleCommissioningRuntimeReaders({ ...deps, client, containerClient });
  let scope = binding.scope; let scopePersisted = false;
  try { scope = await readers.readScope(body.titleId); scopePersisted = true; }
  catch (error) { if (error?.statusCode !== 404) throw error; }
  const authority = await readTitleCommissioningAuthority(binding.request, { ...deps, client, ...readers, readScope: async () => scope });
  let reviewAuthority = null;
  if (body.mode === "COMMISSIONING_REVIEW_READ_ONLY") {
    const reviewReaders = require("../editorial/commissioningEditorialReviewReaders")
      .createCommissioningEditorialReviewReaders({ ...deps, client });
    const current = await reviewReaders.readReviewAuthority(plan.titleId, plan.source.sha256);
    const sources = require("../editorial/commissioningEditorialReviewContract")
      .verifyReviewAuthority(current, plan.titleId, plan.source.sha256);
    reviewAuthority = { sources, missingContext: current.missingContext,
      assessmentBoundary: current.assessmentBoundary };
  }
  async function read(path) {
    const blob = containerClient.getBlockBlobClient(path);
    try {
      const { etag } = await blob.getProperties();
      if (!etag) throw new Error("COMMISSIONING_READBACK_VERSION_MISSING");
      const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } });
      return { etag, sha256: require("node:crypto").createHash("sha256").update(bytes).digest("hex"), value: JSON.parse(bytes.toString("utf8")) };
    } catch (error) { if (error?.statusCode === 404) return null; throw error; }
  }
  const execution = await read(`commissioning-executions/${plan.titleId}/${plan.bindingHash}.json`);
  const receipt = await read(`commissioning-intake/${plan.titleId}/${plan.bindingHash}.json`);
  const reviewExecution = await read(`commissioning-review-executions/${plan.titleId}/${plan.bindingHash}.json`);
  let reviewReceipt = null;
  let reviewRejection = null;
  if (reviewExecution) {
    if (reviewExecution.value.executionId !== `${plan.executionId}:editorial-review:v1` ||
        reviewExecution.value.titleId !== plan.titleId || reviewExecution.value.bindingHash !== plan.bindingHash) {
      throw new Error("COMMISSIONING_REVIEW_READBACK_IDENTITY_CONFLICT");
    }
    if (reviewExecution.value.status === "COMPLETED") {
      const reference = reviewExecution.value.receiptReference;
      const prefix = `commissioning-editorial-review/${plan.titleId}/${plan.bindingHash}/`;
      if (typeof reference !== "string" || !reference.startsWith(prefix) ||
          !/^[a-f0-9]{64}\.json$/.test(reference.slice(prefix.length))) throw new Error("COMMISSIONING_REVIEW_RECEIPT_PATH_INVALID");
      reviewReceipt = await read(reference);
      if (!reviewReceipt || reviewReceipt.value.binding?.parentExecutionId !== plan.executionId ||
          reviewReceipt.value.binding.titleId !== plan.titleId || reviewReceipt.value.productionStageChanged !== false ||
          reviewReceipt.value.status !== "EDITORIAL_REVIEW_READY_FOR_PUBLISHER" ||
          require("node:crypto").createHash("sha256").update(JSON.stringify(reviewReceipt.value.report)).digest("hex") !== reviewReceipt.value.reportSha256) {
        throw new Error("COMMISSIONING_REVIEW_RECEIPT_INVALID");
      }
      require("../editorial/commissioningEditorialReviewContract").validateEditorialReview(reviewReceipt.value.report);
      if (reviewReceipt.value.documentReference !== reference.replace(/\.json$/, ".md")) throw new Error("COMMISSIONING_REVIEW_DOCUMENT_PATH_INVALID");
      const documentBlob = containerClient.getBlockBlobClient(reviewReceipt.value.documentReference);
      const documentProperties = await documentBlob.getProperties();
      if (!documentProperties.etag || require("node:crypto").createHash("sha256").update(
        await documentBlob.downloadToBuffer(0, undefined, { conditions: { ifMatch: documentProperties.etag } })
      ).digest("hex") !== reviewReceipt.value.documentSha256) throw new Error("COMMISSIONING_REVIEW_DOCUMENT_CUSTODY_INVALID");
    }
    if (reviewExecution.value.status === "HELD" && reviewExecution.value.quarantineReference) {
      const reference = reviewExecution.value.quarantineReference;
      const prefix = `commissioning-review-quarantine/${plan.titleId}/${plan.bindingHash}/`;
      if (typeof reference !== "string" || !reference.startsWith(prefix) ||
          !/^[a-f0-9]{64}\.json$/.test(reference.slice(prefix.length))) throw new Error("REVIEW_QUARANTINE_PATH_INVALID");
      const candidate = await read(reference);
      if (!candidate || `${candidate.sha256}.json` !== reference.slice(prefix.length) ||
          candidate.value.status !== "QUARANTINED_INVALID_ASSESSMENT" ||
          candidate.value.binding?.titleId !== plan.titleId || candidate.value.binding.parentExecutionId !== plan.executionId ||
          JSON.stringify(candidate.value.binding.source) !== JSON.stringify(plan.source)) throw new Error("REVIEW_QUARANTINE_CUSTODY_INVALID");
      const { SECTIONS, CATEGORIES, validateEditorialReview } = require("../editorial/commissioningEditorialReviewContract");
      const output = candidate.value.output;
      const notes = output?.categoryNotes;
      const shape = value => ({ type: Array.isArray(value) ? "array" : value === null ? "null" : typeof value,
        ...(typeof value === "string" ? { length: value.length, nonempty: value.trim().length > 0 } : {}),
        ...(value && typeof value === "object" ? { count: Object.keys(value).length } : {}) });
      let categoryNotesJson = null;
      if (typeof notes === "string" && notes.length <= 120000) {
        // Inspect a representation defect without exposing or accepting the candidate.
        try {
          const decoded = JSON.parse(notes);
          let fullContractValid = false;
          try { validateEditorialReview({ ...output, categoryNotes: decoded }); fullContractValid = true; } catch {}
          categoryNotesJson = { decodable: true, decodedShape: shape(decoded),
            presentCategories: CATEGORIES.filter(key => Object.hasOwn(decoded || {}, key)), fullContractValid };
        } catch { categoryNotesJson = { decodable: false, fullContractValid: false }; }
      }
      reviewRejection = { reference, etag: candidate.etag, sha256: candidate.sha256,
        safeCode: /^(?:REVIEW|COMMISSIONING)_[A-Z_]{1,100}$/.test(candidate.value.safeCode || "") ? candidate.value.safeCode : "REVIEW_REJECTED",
        tokenCounts: Object.fromEntries(["input", "output", "total"].map(key => [key,
          Number.isSafeInteger(candidate.value.tokenCounts?.[key]) && candidate.value.tokenCounts[key] >= 0 ? candidate.value.tokenCounts[key] : null])),
        outputShape: shape(output), presentSections: SECTIONS.filter(key => Object.hasOwn(output || {}, key)),
        categoryNotesShape: shape(notes), presentCategories: CATEGORIES.filter(key => Object.hasOwn(notes || {}, key)),
        categoryNotesJson,
        categoryNoteShapes: Object.fromEntries(CATEGORIES.filter(key => Object.hasOwn(notes || {}, key)).map(key => [key, shape(notes[key])])),
        contentReturned: false };
    }
  }
  for (const record of [execution, receipt].filter(Boolean)) {
    if (record.value.executionId !== plan.executionId || record.value.titleId !== plan.titleId || record.value.bindingHash !== plan.bindingHash) {
      throw Object.assign(new Error("COMMISSIONING_READBACK_IDENTITY_CONFLICT"), { safeCode: "COMMISSIONING_READBACK_IDENTITY_CONFLICT" });
    }
  }
  return { status: 200, jsonBody: { mode: body.mode, effects: 0, observedAt: new Date().toISOString(),
    titleId: plan.titleId, executionId: plan.executionId, bindingHash: plan.bindingHash,
    nativeAuthorityAndBytes: "PASS", artifactBindings: authority.artifacts, scopePersisted, reviewAuthority,
    commissioningIdentity: authority.identityProof,
    reviewRejection,
    reviewExecution: reviewExecution ? { etag: reviewExecution.etag, status: reviewExecution.value.status,
      attempts: reviewExecution.value.attempts, failureCode: reviewExecution.value.failureCode, causeCode: reviewExecution.value.causeCode,
      quarantineReference: reviewExecution.value.quarantineReference,
      claimedAt: reviewExecution.value.claimedAt, leaseUntil: reviewExecution.value.leaseUntil,
      nextAttemptAt: reviewExecution.value.nextAttemptAt, completedAt: reviewExecution.value.completedAt } : null,
    reviewReceipt: reviewReceipt ? { etag: reviewReceipt.etag, status: reviewReceipt.value.status,
      binding: reviewReceipt.value.binding, reportSha256: reviewReceipt.value.reportSha256,
      documentReference: reviewReceipt.value.documentReference, documentSha256: reviewReceipt.value.documentSha256,
      completedAt: reviewReceipt.value.completedAt, productionStageChanged: false,
      ...(body.mode === "COMMISSIONING_REVIEW_READ_ONLY" ? { report: reviewReceipt.value.report } : {}) } : null,
    execution: execution ? { etag: execution.etag, status: execution.value.status, attempts: execution.value.attempts,
      claimedAt: execution.value.claimedAt, leaseUntil: execution.value.leaseUntil, completedAt: execution.value.completedAt,
      nextAttemptAt: execution.value.nextAttemptAt, failureCode: execution.value.failureCode } : null,
    receipt: receipt ? { etag: receipt.etag, status: receipt.value.status, productionStageChanged: receipt.value.productionStageChanged,
      historyTreatment: receipt.value.historyTreatment, source: receipt.value.source, retainedWork: receipt.value.retainedWork } : null } };
}
module.exports = { titleCommissioningReadback };
