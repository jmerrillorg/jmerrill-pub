"use strict";
const funding = require("./publisherFundedPolicy");
const internal = require("./jackieInternalTitlePolicy");
const BASE = Object.freeze({ version: "v1.3.1", sha256: "6ee5fb05558b7af755749061034effaecfdccace96b9e9fb6af5b5e769468745" });
function deny() { throw Object.assign(new Error("Publisher-funded offer authority mismatch"), { safeCode: "STAGE04_FUNDED_OFFER_AUTHORITY_DENIED" }); }
function build(policy, selection, titleId, acceptance, agreement) {
  const title = funding.validateFunding(policy, selection, titleId, acceptance);
  if (!agreement || agreement.version !== BASE.version || agreement.sha256 !== BASE.sha256 ||
      agreement.status !== "ACTIVE_AUTHORITATIVE" || !agreement.reference ||
      agreement.verifiedByteSha256 !== BASE.sha256) deny();
  const terms = funding.fundedAgreementTerms(policy, selection, titleId, acceptance);
  const value = { schemaVersion: 1, version: "1.0.0", stageCode: "04_AUTHOR_DECISION", titleId,
    authorContactId: acceptance.actorContactId, policySha256: terms.policySha256,
    selectionSha256: terms.selectionSha256, publisherAcceptanceSha256: internal.sha(JSON.stringify(acceptance)),
    publisherApprovalIsAuthorElection: false, authorFeeCents: 0, retailPackage: null,
    components: title.components, safeguards: selection.safeguards,
    baseAgreement: agreement, fundedTerms: terms,
    responseRequired: "EXACT_VERSION_ACCEPT_DECLINE_OR_HOLD",
    authorElection: "NOT_CAPTURED", authorPaymentStatus: "NOT_APPLICABLE_PUBLISHER_FUNDED",
    authorDueCents: 0, stage05: "NOT_STARTED", approvedNextWorkBudgetRequired: true,
    additionalSpendAuthorized: false, communicationRouting: { to: "jackie@jmerrill.one", cc: ["publishing@jmerrill.one"], replyTo: "publishing@jmerrill.one" } };
  return { ...value, offerSha256: internal.sha(JSON.stringify(value)) };
}
function validate(offer, policy, selection, titleId, acceptance, agreement) {
  if (JSON.stringify(offer) !== JSON.stringify(build(policy, selection, titleId, acceptance, agreement))) deny();
  return offer;
}
module.exports = { BASE, build, validate };
