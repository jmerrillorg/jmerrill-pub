"use strict";

const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const { executeCommissioningEditorialReview } = require("../editorial/commissioningEditorialReviewAdapter");

async function processTitleCommissioningEditorialReview(input, deps = {}) {
  return processTitleCommissioningStep(input, deps, {
    namespace: "commissioning-review-executions", executionSuffix: ":editorial-review:v1",
    leaseMs: 20 * 60 * 1000,
    // One reviewed producer repair may recover a structural-output hold; never
    // recover authority, identity, permission or substantive editorial holds.
    repairVersion: "EDITORIAL_REVIEW_EXACT_TOOL_SCHEMA_V1",
    recoverHeld: state => state.causeCode === "REVIEW_SECTIONS_INVALID" && !state.repairRecovery,
    execute: deps.executeReview || executeCommissioningEditorialReview,
    validate: (result, plan) => result?.receipt?.binding?.parentExecutionId ===
      plan.executionId.replace(/:editorial-review:v1$/, "") &&
      result.receipt.binding.titleId === plan.titleId && result.receipt.binding.stage === "EDITORIAL_REVIEW" &&
      result.receipt.status === "EDITORIAL_REVIEW_READY_FOR_PUBLISHER" && result.receipt.productionStageChanged === false &&
      typeof result.reference === "string" && result.reference.startsWith(`commissioning-editorial-review/${plan.titleId}/${plan.bindingHash}/`),
    reference: result => result.reference
  });
}

module.exports = { processTitleCommissioningEditorialReview };
