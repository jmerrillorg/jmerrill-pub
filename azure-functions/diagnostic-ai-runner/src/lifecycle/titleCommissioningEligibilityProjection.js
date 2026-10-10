"use strict";

// Observes owner state; never grants execution or substitutes for author review.
function projectCommissioningEligibility({ source, scopePersisted, execution, receipt, reviewExecution, reviewReceipt }) {
  let action;
  if (!scopePersisted) action = "OWNER_SCOPE_BINDING_REQUIRED";
  else if (execution?.status !== "COMPLETED" || !receipt) action = "INTAKE_OWNER_RECONCILIATION_REQUIRED";
  else if (source?.role === "RECEIVED_ORIGINAL") action = "CONTROLLING_SOURCE_REVIEW_REQUIRED";
  else if (reviewExecution?.status === "HELD") action = "EXACT_REVIEW_OWNER_RECOVERY_REQUIRED";
  else if (reviewExecution?.status === "RETRY_PENDING") action = "WAIT_FOR_OWNER_RETRY";
  else if (reviewExecution?.status === "CLAIMED") action = "WAIT_FOR_OWNER_CLAIM_RECONCILIATION";
  else if (reviewReceipt) action = "PUBLISHER_REVIEW_REQUIRED";
  else action = "REVIEW_AUTHORITY_AND_ENABLEMENT_REQUIRED";
  return { action, executionAuthorized: false, authorApprovalInferred: false,
    productionStageChanged: false, proofLevel: "READ_ONLY_OWNER_STATE_NOT_STAGE_ELIGIBILITY" };
}

module.exports = { projectCommissioningEligibility };
