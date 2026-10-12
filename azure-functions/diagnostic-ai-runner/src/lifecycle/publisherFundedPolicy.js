"use strict";
const internal = require("./jackieInternalTitlePolicy");
const POLICY = Object.freeze({ schemaVersion: 1, policyId: "JMP-PUBLISHER-FUNDED-ROUTE", version: "1.1.0",
  fundingRoute: "PUBLISHER_FUNDED", authorFeeCents: 0, authorPaymentStatus: "NOT_APPLICABLE_PUBLISHER_FUNDED",
  requiresExplicitPublisherSelection: true, changesAuthorFundedPrices: false,
  determinesImprint: false, determinesEditorialScope: false, conveysCopyright: false,
  changesRoyaltyTerms: false, authorElectionRequired: true, executedAgreementRequired: true,
  approvedNextWorkBudgetRequired: true, unlimitedSpendAuthorized: false,
  providerCommitmentAuthorized: false, publicationAuthorized: false, skipsStages: false,
  automaticProductionCostRoyaltyRecoupment: false,
  authority: "CURRENT_DIRECT_HUMAN_INSTRUCTION_PUBLISHER_FUNDED_ROUTE_APPROVAL" });
function authorizeFreshTitles(acceptance) {
  internal.validateAcceptance(acceptance);
  return { schemaVersion: 1, version: "1.1.0", policyId: POLICY.policyId,
    policySha256: internal.sha(JSON.stringify(POLICY)), actorContactId: acceptance.actorContactId,
    actorCapacity: "PUBLISHER", selectionAuthority: "CURRENT_DIRECT_HUMAN_INSTRUCTION_FIVE_FRESH_SUBMISSIONS",
    publisherAcceptanceReference: acceptance.reference,
    publisherAcceptanceSha256: internal.sha(JSON.stringify(acceptance)), titles: acceptance.titles,
    fundingRoute: POLICY.fundingRoute, authorFeeCents: 0,
    authorPaymentStatus: POLICY.authorPaymentStatus,
    imprint: "INDEPENDENT_GOVERNED_AUTHORITY_REQUIRED", royalty: "EXISTING_TITLE_SPECIFIC_AGREEMENT_AUTHORITY_REQUIRED",
    rights: "NO_TRANSFER_INFERRED", authorElection: "NOT_CAPTURED", nextWorkBudget: "NOT_APPROVED",
    stage05: "NOT_STARTED", safeguards: { gloryScope: acceptance.gloryScope,
      gloryPresentation: acceptance.gloryPresentation, intentionalComponents: acceptance.intentionalComponents,
      chadAndMe: acceptance.chadAndMe },
    costTreatment: fiveTitleCostTreatment(acceptance),
    supersedesPolicyReference: "new-submission-stage04/internal-policy/1.0.0/ef8886913525f2cb4cf1bd4d35f6ef3a590e26535bd95971e86cafe9401e4cbe.json" };
}
function fiveTitleCostTreatment(acceptance) {
  internal.validateAcceptance(acceptance);
  return { version: "1.0.0", authority: "DIRECT_PUBLISHER_FIVE_TITLE_COST_TREATMENT_20261012",
    titleIds: acceptance.titles.map(t => t.titleId).sort(),
    voluntaryWithdrawalOrdinaryDocumentedProductionCosts: "PUBLISHER_ABSORBS",
    automaticRoyaltyRecoupment: false, automaticWithdrawalReimbursementDebt: false,
    manuscriptOrDisclosureFailureAutomaticallyCreatesDebt: false,
    authorWarrantiesPreserved: true, manuscriptAndDisclosureObligationsPreserved: true,
    differentFinancialTreatmentRequiresExactClauseAndConsequenceApprovalBeforeOffer: true,
    authorFeeCents: 0, rightsChanged: false, royaltyTermsChanged: false,
    additionalSpendAuthorized: false };
}
function fundedAgreementTerms(policy, selection, titleId, acceptance) {
  validateFunding(policy, selection, titleId, acceptance);
  return { schemaVersion: 1, version: "1.0.0", titleId,
    policySha256: internal.sha(JSON.stringify(policy)), selectionSha256: internal.sha(JSON.stringify(selection)),
    costTreatmentSha256: internal.sha(JSON.stringify(selection.costTreatment)),
    authorFeeCents: 0, costTreatment: selection.costTreatment,
    clause: "For this Publisher-funded Work, Author owes $0 in author publishing fees. Following Author's voluntary withdrawal, Publisher absorbs ordinary documented production costs. Those costs are not automatically recoverable from Author or deductible from Author's royalties. Existing author warranties and manuscript and disclosure obligations remain in force. Failure to satisfy those requirements does not automatically create a reimbursement debt. Any different financial treatment must be presented as an exact proposed clause with its financial consequence and receive separate Publisher approval before an offer containing that treatment is issued. Funding does not change the applicable agreement's copyright, rights license or royalty terms, and grants no additional spending authority.",
    supersessionScope: "ONLY_CONFLICTING_AUTOMATIC_PRODUCTION_COST_REIMBURSEMENT_AND_AUTHOR_FEE_REQUIREMENTS_FOR_THIS_WORK",
    baseAgreementRequired: true, actualAuthorElectionRequired: true,
    requiredPartyExecutionRequired: true, stage05: "NOT_STARTED" };
}
function validateFundedAgreementTerms(terms, policy, selection, titleId, acceptance) {
  const expected = fundedAgreementTerms(policy, selection, titleId, acceptance);
  if (JSON.stringify(terms) !== JSON.stringify(expected)) {
    throw Object.assign(new Error("Funded offer/agreement cost treatment mismatch"), { safeCode: "STAGE04_FUNDED_TERMS_AUTHORITY_DENIED" });
  }
  return expected;
}
function validateFunding(policy, selection, titleId, acceptance) {
  if (JSON.stringify(policy) !== JSON.stringify(POLICY) ||
      JSON.stringify(selection) !== JSON.stringify(authorizeFreshTitles(acceptance)) ||
      !selection.titles.some(t => t.titleId === titleId)) {
    throw Object.assign(new Error("Publisher funding authority mismatch"), { safeCode: "STAGE04_FUNDING_AUTHORITY_DENIED" });
  }
  return selection.titles.find(t => t.titleId === titleId);
}
function paymentProjection(policy, selection, titleId, acceptance, election, execution, budget) {
  validateFunding(policy, selection, titleId, acceptance);
  if (election?.titleId !== titleId || election?.decision !== "ACCEPT" || !election.offerSha256 ||
      execution?.titleId !== titleId || execution?.offerSha256 !== election.offerSha256 ||
      execution?.status !== "EXECUTED_BY_REQUIRED_PARTIES" || !execution.agreementSha256 ||
      budget?.titleId !== titleId || budget?.status !== "APPROVED" ||
      !Number.isSafeInteger(budget.maximumSpendCents) || budget.maximumSpendCents < 0 || !budget.approvalReference) {
    throw Object.assign(new Error("Executed agreement, author election and next-work budget required"), { safeCode: "STAGE05_PUBLISHER_FUNDED_GATES_PENDING" });
  }
  return { titleId, status: POLICY.authorPaymentStatus, authorDueCents: 0,
    policySha256: internal.sha(JSON.stringify(policy)), selectionSha256: internal.sha(JSON.stringify(selection)),
    agreementSha256: execution.agreementSha256, offerSha256: election.offerSha256,
    budgetApprovalReference: budget.approvalReference, invoiceCreated: false, paymentCreated: false,
    invoiceMarkedPaid: false };
}
module.exports = { POLICY, authorizeFreshTitles, validateFunding, paymentProjection,
  fiveTitleCostTreatment, fundedAgreementTerms, validateFundedAgreementTerms };
