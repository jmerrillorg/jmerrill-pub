"use strict";

const { createHash } = require("node:crypto");
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { STAGE_CODES } = require("./stageRuntimeJournal");
const { bindSourceCollection } = require("./freshSourceCollection");
const exact = value => typeof value === "string" && value.length > 0 && value === value.trim() && !/[\r\n]/.test(value);
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Reuses the existing plan/journal owner. Historical work stays evidence-only.
function planFreshTitleRun(input) {
  const { authorityReference, sourceCustody, handoff } = input || {};
  const collection = input?.sourceComponents === undefined ? null : bindSourceCollection(input.sourceComponents);
  if (!exact(authorityReference) || handoff?.state !== "READY" || !exact(handoff.reference)) {
    deny("FRESH_RUN_STABLE_SOURCE_HANDOFF_REQUIRED");
  }
  if (!exact(sourceCustody?.driveId) || !exact(sourceCustody.itemId) || !exact(sourceCustody.eTag) ||
      !Number.isSafeInteger(sourceCustody.bytes) || sourceCustody.bytes <= 0 ||
      !exact(sourceCustody.path) || !/^\/01_Pipeline_A-Z\/.+\/_original\//i.test(sourceCustody.path) ||
      (collection ? collection.custodyHash !== input.source?.sha256 ||
        !collection.components.some(component => JSON.stringify(component) === JSON.stringify({
          driveId: sourceCustody.driveId, itemId: sourceCustody.itemId, eTag: sourceCustody.eTag,
          path: sourceCustody.path, sha256: sourceCustody.sha256, bytes: sourceCustody.bytes })) :
        sourceCustody.sha256 !== input.source?.sha256) || input.source?.role !== "RECEIVED_ORIGINAL") {
    deny("FRESH_RUN_ORIGINAL_SOURCE_CUSTODY_REQUIRED");
  }
  if (sourceCustody.path.split("/").some(segment => segment === "." || segment === ".." || /%2e|%2f|%5c/i.test(segment))) {
    deny("FRESH_RUN_ORIGINAL_SOURCE_CUSTODY_REQUIRED");
  }
  const plan = planTitleCommissioningRun(input);
  const custody = { driveId: sourceCustody.driveId, itemId: sourceCustody.itemId,
    eTag: sourceCustody.eTag, bytes: sourceCustody.bytes, path: sourceCustody.path, sha256: sourceCustody.sha256 };
  const identity = { purpose: "FRESH_ALL_16_STAGES", authorityReference, titleId: plan.titleId,
    revision: plan.revision, source: plan.source, custody, handoffReference: handoff.reference,
    ...(collection ? { sourceCollection: collection } : {}) };
  const bindingHash = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
  const runId = `commissioning-fresh:${plan.titleId}:v${plan.revision}:${bindingHash}`;
  return { ...plan, ...identity, schemaVersion: 2, bindingHash, executionId: runId, runId,
    historyTreatment: "PRESERVE_HISTORY_EXCLUDE_FROM_FRESH_COMPLETION",
    existingWorkTreatment: "IMPLEMENTATION_REUSE_ONLY_NO_OUTPUT_REUSE",
    stages: STAGE_CODES.map(stageCode => ({ stageCode, status: "NOT_STARTED", outputReference: null,
      executionEvidence: null, completedByHistoricalEvidence: false })), executionAuthorized: false };
}

function assertFreshStageReceipt(run, receipt) {
  if (run?.purpose !== "FRESH_ALL_16_STAGES" || receipt?.runId !== run.runId ||
      receipt.titleId !== run.titleId || receipt.sourceBindingHash !== run.bindingHash ||
      !STAGE_CODES.includes(receipt.stageCode) || receipt.status !== "COMPLETED" ||
      !exact(receipt.executionId) || !exact(receipt.outputReference) || !exact(receipt.evidenceReference) ||
      receipt.historical === true || receipt.proofLevel !== "PRODUCTION_OWNER_READBACK") {
    deny("FRESH_STAGE_COMPLETION_EVIDENCE_DENIED");
  }
  return true;
}

async function persistFreshTitleRun(input, deps = {}) {
  const run = planFreshTitleRun(input);
  if (typeof deps.readCurrentSourceAuthority !== "function" || !deps.containerClient) {
    deny("FRESH_RUN_OWNER_AUTHORITY_READER_REQUIRED");
  }
  const proof = await deps.readCurrentSourceAuthority(run);
  if (proof?.current !== true || proof.titleId !== run.titleId || proof.authorityReference !== run.authorityReference ||
      proof.sourceSha256 !== run.source.sha256 || proof.sourceETag !== run.custody.eTag ||
      proof.sourceItemId !== run.custody.itemId || proof.sourceDriveId !== run.custody.driveId ||
      proof.sourceBytes !== run.custody.bytes || proof.sourcePath !== run.custody.path ||
      (run.sourceCollection && proof.sourceCollectionHash !== run.sourceCollection.custodyHash) ||
      proof.jackieAuthorshipVerified !== true || proof.stableHandoffVerified !== true) {
    deny("FRESH_RUN_OWNER_AUTHORITY_CHANGED");
  }
  const blob = deps.containerClient.getBlockBlobClient(`commissioning-fresh-runs/${run.titleId}/${run.bindingHash}.json`);
  const body = Buffer.from(JSON.stringify(run));
  try {
    await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } });
    return { run, duplicate: false, stagesExecuted: 0 };
  } catch (error) {
    if (![409, 412].includes(error?.statusCode)) throw error;
    const properties = await blob.getProperties();
    if (!properties.etag || !(await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).equals(body)) {
      deny("FRESH_RUN_OWNER_REPLAY_CONFLICT");
    }
    return { run, duplicate: true, stagesExecuted: 0 };
  }
}

module.exports = { planFreshTitleRun, assertFreshStageReceipt, persistFreshTitleRun };
