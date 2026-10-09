"use strict";

const { evaluateStage13Preflight } = require("../production/stage13EvidencePreflight");
const { verifyStage15Publication } = require("../distribution/stage15PublicationReadback");

// Fixed synthetic records only. Provider and public-page reads below are local
// functions: this probe cannot submit, fetch a public URL, or advance a title.
function productionFixture() {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const authorId = "22222222-2222-4222-8222-222222222222";
  const checksum = "a".repeat(64);
  const record = evidenceId => ({ titleId, authorId, current: true, evidenceId, version: "fixture-v1" });
  const productFormCode = "PF-01";
  return {
    titleId, authorId, stageId: "13_PRODUCTION", sourceRevision: "fixed-synthetic-v1",
    sourceReadAt: "2026-10-09T00:00:00Z", entitlementsComplete: true,
    agreementGate: { ...record("fixture-agreement"), status: "SIGNED", sourceRecordId: "fixture-only", sourceAuthority: "SYNTHETIC_NOT_AUTHORITY" },
    proofArtifact: { ...record("fixture-proof"), artifactId: "fixture-proof", checksum, qaStatus: "PASS" },
    proofApproval: { ...record("fixture-approval"), artifactId: "fixture-proof", checksum, status: "APPROVED" },
    entitlements: [{ ...record("fixture-entitlement"), productFormCode, status: "AUTHORIZED", distributionAuthority: "PASS",
      qa: { ...record("fixture-qa"), productFormCode, status: "PASS" } }],
    rights: [{ ...record("fixture-rights"), productFormCode, status: "CLEARED", territories: "WORLD" }],
    identifiers: [{ ...record("fixture-isbn"), productFormCode, isbn13: "9781954414266", sourceAuthority: "SYNTHETIC_NOT_AUTHORITY" }],
    retailMetadata: [{ ...record("fixture-metadata"), productFormCode, status: "READY", isbn13: "9781954414266", title: "Fixed fixture",
      authorByline: "Synthetic", description: "Internal non-business fixture", language: "en", currency: "USD", price: 1, subjects: ["FIXTURE"] }],
    artifacts: ["PRINT_INTERIOR", "PAPERBACK_FULL_WRAP_COVER"].map(role => ({ ...record(`fixture-${role}`), productFormCode, role, checksum,
      repositoryPath: `/JM1-PUB/01_Pipeline_A-Z/Synthetic/${role}`, qaStatus: "PASS", qaEvidenceId: "fixture-qa", qaChecksum: checksum,
      approvalStatus: "APPROVED", approvalEvidenceId: "fixture-approval", approvedChecksum: checksum }))
  };
}

async function verifyCommissioningProductionGuards() {
  const checks = {};
  const valid = productionFixture();
  if (!evaluateStage13Preflight(valid).ready) throw Error("PROBE_STAGE13_VALID_FIXTURE_FAILED");
  checks.stage13SyntheticEvidenceAccepted = true;
  const missing = productionFixture();
  delete missing.proofArtifact.artifactId;
  delete missing.proofApproval.artifactId;
  if (evaluateStage13Preflight(missing).ready) throw Error("PROBE_STAGE13_MISSING_ID_ACCEPTED");
  checks.stage13MissingProofIdentityDenied = true;
  const pending = productionFixture();
  pending.agreementGate.status = "PENDING";
  if (evaluateStage13Preflight(pending).ready) throw Error("PROBE_STAGE13_PENDING_AGREEMENT_ACCEPTED");
  checks.stage13PendingAgreementDenied = true;
  const mismatch = productionFixture();
  mismatch.proofApproval.checksum = "b".repeat(64);
  if (evaluateStage13Preflight(mismatch).ready) throw Error("PROBE_STAGE13_CHECKSUM_MISMATCH_ACCEPTED");
  checks.stage13ProofChecksumMismatchDenied = true;

  const submission = { titleId: valid.titleId, editionId: "fixture-edition", artifactId: "fixture-artifact", provider: "FIXTURE",
    receiptId: "fixture-receipt", providerProductId: "fixture-product", isbn13: "9781954414266", artifactChecksum: "a".repeat(64) };
  const product = { ...submission, status: "LIVE", publicUrl: "https://fixture.invalid/book" };
  const delays = [];
  let receiptReads = 0;
  const deps = {
    allowedPublicHosts: ["fixture.invalid"], delay: async ms => delays.push(ms),
    provider: { readSubmission: async () => {
      receiptReads += 1;
      if (receiptReads === 1) throw Object.assign(Error("fixed transient"), { status: 503 });
      return product;
    }, readPublication: async () => product },
    fetchFn: async () => new Response('<script type="application/ld+json">{"@type":"Book","isbn":"9781954414266","offers":{"availability":"InStock"}}</script>',
      { status: 200, headers: { "content-type": "text/html" } })
  };
  const read = await verifyStage15Publication(submission, deps);
  if (read.status !== "LIVE_VERIFIED" || read.evidence.purchaseTransactionVerified !== false ||
      read.evidence.receiptReadAttempts !== 2 || delays.length !== 1 || delays[0] !== 1000) throw Error("PROBE_STAGE15_RETRY_FAILED");
  checks.stage15SyntheticReadbackAndRetryVerified = true;
  const wrongEdition = await verifyStage15Publication(submission, { ...deps,
    provider: { readSubmission: async () => ({ ...product, editionId: "wrong-edition" }), readPublication: async () => { throw Error("WRONG_EDITION_MUST_NOT_CONTINUE"); } },
    fetchFn: async () => { throw Error("WRONG_EDITION_MUST_NOT_FETCH"); } });
  if (wrongEdition.reason !== "PROVIDER_RECEIPT_IDENTITY_MISMATCH") throw Error("PROBE_STAGE15_EDITION_GUARD_FAILED");
  checks.stage15WrongEditionDenied = true;
  const notLive = await verifyStage15Publication(submission, { ...deps,
    provider: { readSubmission: async () => product, readPublication: async () => ({ ...product, status: "PROPAGATING" }) },
    fetchFn: async () => { throw Error("PENDING_MUST_NOT_FETCH"); } });
  if (notLive.status !== "PENDING" || notLive.publicAvailabilityVerified !== false) throw Error("PROBE_STAGE15_PENDING_GUARD_FAILED");
  checks.stage15PendingIsNotPublication = true;
  return checks;
}

module.exports = { verifyCommissioningProductionGuards };
