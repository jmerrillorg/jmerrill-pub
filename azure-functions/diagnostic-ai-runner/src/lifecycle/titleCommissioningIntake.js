"use strict";

const { planTitleCommissioningRun, persistTitleCommissioningPlan } = require("./titleCommissioningRun");
const { readTitleCommissioningAuthority } = require("./titleCommissioningAuthority");

// This adapter assesses existing materials. It cannot complete editorial stages
// or invoke communications, billing, distribution, or live-stage transitions.
async function executeTitleCommissioningIntake(input, deps = {}) {
  const run = planTitleCommissioningRun(input);
  const authority = await readTitleCommissioningAuthority(input, deps);
  await persistTitleCommissioningPlan(input, {
    containerClient: deps.containerClient,
    authorize: async () => (await readTitleCommissioningAuthority(input, deps)).current
  });
  const receipt = {
    schemaVersion: 1, executionId: run.executionId, titleId: run.titleId,
    bindingHash: run.bindingHash, scopeVersion: authority.scopeVersion,
    status: "INTAKE_MATERIALS_VERIFIED", source: run.source,
    retainedWork: authority.artifacts.filter(a => a.role === "RETAINED_WORK"),
    historyTreatment: run.historyTreatment, productionStageChanged: false,
    requirements: ["EDITORIAL_CANON_AND_PREFERENCES_BINDING", "EXACT_APPROVAL_PROVENANCE_REVALIDATION", "LINKED_STAGE_OWNER_DISPATCH"],
    nextAction: "BOUND_EDITORIAL_REVIEW_ADAPTER_REQUIRED",
    forbiddenEffects: run.forbiddenEffects
  };
  const blob = deps.containerClient.getBlockBlobClient(`commissioning-intake/${run.titleId}/${run.bindingHash}.json`);
  const body = Buffer.from(JSON.stringify(receipt));
  try {
    await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } });
    return { receipt, duplicate: false };
  } catch (error) {
    if (![409, 412].includes(error?.statusCode)) throw error;
    const previous = await blob.downloadToBuffer();
    if (!previous.equals(body)) throw Object.assign(new Error("COMMISSIONING_INTAKE_REPLAY_CONFLICT"), { safeCode: "COMMISSIONING_INTAKE_REPLAY_CONFLICT" });
    return { receipt, duplicate: true };
  }
}

module.exports = { executeTitleCommissioningIntake };
