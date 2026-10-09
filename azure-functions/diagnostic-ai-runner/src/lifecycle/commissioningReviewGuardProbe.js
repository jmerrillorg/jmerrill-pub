"use strict";

// Fixed, effect-free runtime proof. No caller fixture, identity, source or policy
// can enter this probe. It does not read or claim a real title execution.
async function verifyCommissioningReviewGuards() {
  const adapter = require("../editorial/commissioningEditorialReviewAdapter");
  const checks = {};
  try {
    await adapter.prepareCommissioningEditorialReview({ source: { role: "RECEIVED_ORIGINAL" } });
    throw Error("PROBE_GUARD_MISSING");
  } catch (error) {
    if (error.safeCode !== "REVIEW_RECEIVED_SOURCE_NOT_APPROVED_CONTROLLING") throw error;
    checks.receivedOriginalDenied = true;
  }
  try {
    await require("./gloryNextAssessmentRecovery").runGloryNextAssessmentRecovery({}, { env: {} });
    throw Error("PROBE_GUARD_MISSING");
  } catch (error) {
    if (error.safeCode !== "REVIEW_RECOVERY_NEXT_DISABLED") throw error;
    checks.nextRecoveryDefaultDisabled = true;
  }
  const extract = require("../editorial/commissioningSourceText").extractCommissioningSourceText;
  const fixture = "# Internal format fixture\n\nLiteral manuscript data.\n";
  if (await extract(Buffer.from(fixture), { repositoryPath: "synthetic/fixture.md" }) !== fixture) throw Error("PROBE_FORMAT_MISSING");
  checks.markdownLiteralPreserved = true;
  if (await extract(Buffer.from(fixture), { repositoryPath: "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?file=fixture.md" }) !== fixture) throw Error("PROBE_FORMAT_MISSING");
  checks.sharepointDocumentUrlResolved = true;
  try {
    await extract(Buffer.from("fixed fixture"), { repositoryPath: "synthetic/fixture.vellum" });
    throw Error("PROBE_FORMAT_MISSING");
  } catch (error) {
    if (error.safeCode !== "REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED") throw error;
    checks.vellumHandoffRequired = true;
  }
  return { status: "SYNTHETIC_RUNTIME_GUARDS_VERIFIED", checks, proofLevel: "EFFECT_FREE_SYNTHETIC_NOT_TITLE_ACCEPTANCE",
    businessEffects: 0, executionEffects: 0, authorityWrites: 0, modelInvocationAttempts: 0 };
}
module.exports = { verifyCommissioningReviewGuards };
