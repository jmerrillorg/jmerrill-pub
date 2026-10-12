"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const p = require("../src/lifecycle/jackieInternalTitlePolicy");
function acceptance() {
  return { actorContactId: p.CONTACT, actorCapacity: "PUBLISHER_ONLY",
    packetSha256: "dfccdea117f0c126f7c5e5008e1eafcb40e614e526f6726a3c2a0b787495c202",
    reference: "private/publisher-review.json", authorElection: "NOT_CAPTURED", stage05: "NOT_STARTED",
    gloryScope: "FOCUSED_DEVELOPMENTAL", gloryPresentation: "UNRESOLVED_NO_SPLIT_AUTHORIZED",
    intentionalComponents: "SEPARATE", chadAndMe: "NO_INVENTION",
    titles: Object.entries(p.TITLES).map(([titleId, sources]) => ({ titleId,
      scopeDecision: "ACCEPTED_AS_PUBLISHER", safeguards: "ALL_STATED_PACKET_SAFEGUARDS_PRESERVED",
      acceptanceReceiptSha256: "a".repeat(64), components: sources.map(sourceSha256 => ({ sourceSha256,
        assessmentSha256: "b".repeat(64), assessment: { sha256: "b".repeat(64) }, pathway: "DEVELOPMENTAL" })) })) };
}
test("publisher-funded route is distinct from rights, imprint, scope and spending", () => {
  const f = require("../src/lifecycle/publisherFundedPolicy"), a = acceptance();
  const selection = f.authorizeFreshTitles(a);
  assert.equal(selection.titles.length, 5);
  assert.equal(f.POLICY.authorFeeCents, 0);
  assert.equal(f.POLICY.authorPaymentStatus, "NOT_APPLICABLE_PUBLISHER_FUNDED");
  for (const key of ["determinesImprint", "determinesEditorialScope", "conveysCopyright", "changesRoyaltyTerms", "unlimitedSpendAuthorized", "providerCommitmentAuthorized", "publicationAuthorized", "skipsStages", "changesAuthorFundedPrices"]) assert.equal(f.POLICY[key], false);
  const titleId = a.titles[0].titleId;
  assert.equal(f.validateFunding(f.POLICY, selection, titleId, a).titleId, titleId);
  assert.throws(() => f.validateFunding(f.POLICY, selection, "other", a));
  assert.throws(() => f.paymentProjection(f.POLICY, selection, titleId, a));
  const election = { titleId, decision: "ACCEPT", offerSha256: "c".repeat(64) };
  const execution = { titleId, offerSha256: election.offerSha256, agreementSha256: "d".repeat(64), status: "EXECUTED_BY_REQUIRED_PARTIES" };
  const budget = { titleId, status: "APPROVED", maximumSpendCents: 0, approvalReference: "approved-no-cost-work" };
  const result = f.paymentProjection(f.POLICY, selection, titleId, a, election, execution, budget);
  assert.equal(result.authorDueCents, 0); assert.equal(result.paymentCreated, false); assert.equal(result.invoiceMarkedPaid, false);
  for (const bad of [{ ...budget, maximumSpendCents: -1 }, { ...budget, status: "PENDING" }]) assert.throws(() => f.paymentProjection(f.POLICY, selection, titleId, a, election, execution, bad));
});
test("five exact internal submissions preserve six scopes, no retail fees or downstream authority", () => {
  const a = acceptance(), policy = p.createPolicy(a);
  assert.equal(policy.titles.length, 5);
  assert.equal(policy.titles.reduce((n,t) => n+t.components.length,0), 6);
  assert.equal(policy.retailPackage, null); assert.equal(policy.retailPackageFee, null);
  for (const key of ["additionalSpendAuthorized", "providerCommitmentAuthorized", "rightsTransferAuthorized", "publicationAuthorized", "otherAuthorPricingChanged"]) assert.equal(policy[key], false);
  assert.equal(policy.authorElection, "SEPARATE_VERSION_BOUND_RESPONSE_REQUIRED");
  assert.equal(policy.stage05, "NOT_STARTED");
  assert.deepEqual(p.validatePolicy(policy, a), policy);
  assert.equal(p.sha(JSON.stringify(policy)), p.sha(JSON.stringify(p.createPolicy(a))));
});
test("five-title cost ruling binds identical offer and agreement terms without new debt or spend", () => {
  const f = require("../src/lifecycle/publisherFundedPolicy"), a = acceptance();
  const selection = f.authorizeFreshTitles(a);
  assert.equal(f.POLICY.version, "1.1.0");
  assert.equal(selection.costTreatment.titleIds.length, 5);
  assert.equal(selection.costTreatment.voluntaryWithdrawalOrdinaryDocumentedProductionCosts, "PUBLISHER_ABSORBS");
  for (const key of ["automaticRoyaltyRecoupment", "automaticWithdrawalReimbursementDebt",
    "manuscriptOrDisclosureFailureAutomaticallyCreatesDebt", "rightsChanged", "royaltyTermsChanged", "additionalSpendAuthorized"]) {
    assert.equal(selection.costTreatment[key], false);
  }
  for (const t of a.titles) {
    const terms = f.fundedAgreementTerms(f.POLICY, selection, t.titleId, a);
    assert.equal(terms.authorFeeCents, 0);
    assert.deepEqual(f.validateFundedAgreementTerms(terms, f.POLICY, selection, t.titleId, a), terms);
    for (const bad of [{ ...terms, authorFeeCents: 50000 }, { ...terms, clause: "Author reimburses all costs" },
      { ...terms, costTreatment: { ...terms.costTreatment, automaticRoyaltyRecoupment: true } }]) {
      assert.throws(() => f.validateFundedAgreementTerms(bad, f.POLICY, selection, t.titleId, a));
    }
  }
  assert.throws(() => f.fundedAgreementTerms(f.POLICY, selection, "future-title", a));
  const bad = structuredClone(selection);
  bad.costTreatment.manuscriptOrDisclosureFailureAutomaticallyCreatesDebt = true;
  assert.throws(() => f.validateFunding(f.POLICY, bad, a.titles[0].titleId, a));
});
test("policy cannot extend to another author, title, source, or publisher scope", () => {
  for (const alter of [a => a.actorContactId = "other", a => a.titles[0].titleId = "other",
    a => a.titles[0].components[0].sourceSha256 = "c".repeat(64),
    a => a.titles[0].scopeDecision = "AUTHOR_ACCEPTED", a => a.gloryPresentation = "SPLIT",
    a => a.intentionalComponents = "MERGED", a => a.chadAndMe = "INVENTION_ALLOWED",
    a => a.authorElection = "ACCEPTED", a => a.stage05 = "STARTED",
    a => a.titles[4] = a.titles[0]]) {
    const a = acceptance(); alter(a); assert.throws(() => p.createPolicy(a));
  }
});
test("price, fee, spend, rights, publication and election overrides fail closed", () => {
  const a = acceptance();
  for (const [key, value] of [["retailPackage", "Premier"], ["retailPackageFee", 0],
    ["additionalSpendAuthorized", true], ["rightsTransferAuthorized", true], ["publicationAuthorized", true],
    ["authorElection", "ACCEPTED"]]) {
    const policy = p.createPolicy(a); policy[key] = value;
    assert.throws(() => p.validatePolicy(policy, a));
  }
});
