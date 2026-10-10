"use strict";

const { createHash } = require("node:crypto");
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { STAGE_CODES } = require("./stageRuntimeJournal");
const exact = value => typeof value === "string" && value.length > 0 && value === value.trim() && !/[\r\n]/.test(value);
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Reuses the existing plan/journal owner. Historical work stays evidence-only.
function planFreshTitleRun(input) {
  const { authorityReference, sourceCustody, handoff } = input || {};
  if (!exact(authorityReference) || handoff?.state !== "READY" || !exact(handoff.reference)) {
    deny("FRESH_RUN_STABLE_SOURCE_HANDOFF_REQUIRED");
  }
  if (!exact(sourceCustody?.driveId) || !exact(sourceCustody.itemId) || !exact(sourceCustody.eTag) ||
      !Number.isSafeInteger(sourceCustody.bytes) || sourceCustody.bytes <= 0 ||
      !exact(sourceCustody.path) || !/^\/01_Pipeline_A-Z\/.+\/_original\//i.test(sourceCustody.path) ||
      sourceCustody.sha256 !== input.source?.sha256 || input.source?.role !== "RECEIVED_ORIGINAL") {
    deny("FRESH_RUN_ORIGINAL_SOURCE_CUSTODY_REQUIRED");
  }
  const plan = planTitleCommissioningRun(input);
  const custody = { driveId: sourceCustody.driveId, itemId: sourceCustody.itemId,
    eTag: sourceCustody.eTag, bytes: sourceCustody.bytes, path: sourceCustody.path, sha256: sourceCustody.sha256 };
  const identity = { purpose: "FRESH_ALL_16_STAGES", authorityReference, titleId: plan.titleId,
    revision: plan.revision, source: plan.source, custody, handoffReference: handoff.reference };
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

module.exports = { planFreshTitleRun, assertFreshStageReceipt };
