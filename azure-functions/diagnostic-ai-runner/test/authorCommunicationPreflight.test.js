"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PURPOSE,
  AUTHOR_REQUEST_BLOCKER,
  catalogPackage,
  evaluateTruthBeforeRequest,
  evaluateCadence,
  resolveSupersession,
  validatePackageRecommendation,
  evaluateCommunicationPreflight,
  evaluateJackulineRegressionScenario
} = require("../src/author/authorCommunicationPreflight");

test("truth-before-request blocks asking an author for a recoverable manuscript", () => {
  const result = evaluateTruthBeforeRequest({
    requestedItems: ["manuscript"],
    custodyEvidence: [{ key: "manuscript", present: false, recoverable: true, source: "artifact registry" }]
  });

  assert.equal(result.ok, false);
  assert.equal(result.blocker, AUTHOR_REQUEST_BLOCKER);
  assert.equal(result.checks[0].requestedItemNotRecoverable, false);
  assert.deepEqual(result.blockers[0].reasons, ["REQUESTED_ITEM_RECOVERABLE"]);
});

test("truth-before-request allows an author request only when custody and processing checks are clear", () => {
  const result = evaluateTruthBeforeRequest({
    requestedItems: ["rights attestation"],
    custodyEvidence: [],
    answeredItems: [],
    pendingProcessingItems: [],
    authorCanResolve: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.blocker, null);
});

test("cadence holds non-emergency related sends inside the 24-hour rhythm", () => {
  const result = evaluateCadence({
    now: "2026-08-29T12:00:00Z",
    lastAuthorFacingSendAt: "2026-08-29T07:45:00Z"
  });

  assert.equal(result.ok, false);
  assert.equal(result.blocker, "AUTHOR_RELEASE_24_HOUR_RHYTHM");
  assert.equal(result.earliestReleaseAt, "2026-08-30T07:45:00.000Z");
});

test("cadence allows an immediate material correction exception", () => {
  const result = evaluateCadence({
    now: "2026-08-29T12:00:00Z",
    lastAuthorFacingSendAt: "2026-08-29T07:45:00Z",
    exceptionPurpose: "MATERIAL_CORRECTION"
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "IMMEDIATE_EXCEPTION");
});

test("supersession consolidates recovered intake and review-started messages into the recommendation", () => {
  const result = resolveSupersession({
    newPurpose: PURPOSE.EDITORIAL_REVIEW_RECOMMENDATION,
    manuscriptRecovered: true,
    pendingMessages: [
      { id: "missing", purpose: PURPOSE.MISSING_MANUSCRIPT_REQUEST },
      { id: "started", purpose: PURPOSE.EDITORIAL_REVIEW_STARTED },
      { id: "recovered", purpose: PURPOSE.INTAKE_RECOVERY_CONFIRMATION }
    ]
  });

  assert.equal(result.consolidationRecommended, true);
  assert.deepEqual(result.superseded.map((item) => item.id).sort(), ["missing", "recovered", "started"]);
});

test("package recommendation requires catalog-backed prices and author-facing rationale", () => {
  const starter = catalogPackage("JMP-PKG-STARTER");
  const professional = catalogPackage("JMP-PKG-PRO");
  assert.equal(starter.price, "$1,999");
  assert.equal(professional.price, "$4,500");

  const result = validatePackageRecommendation({
    primaryPackageCode: "JMP-PKG-STARTER",
    alternatePackageCode: "JMP-PKG-PRO",
    rationale: "Starter provides the right level of editorial and production support for the manuscript."
  });

  assert.equal(result.ok, true);
  assert.equal(result.priceAuthority, "milestone6BusinessSourceLayer.PACKAGE_CATALOG");
});

test("package recommendation blocks internal routing language and raw scores", () => {
  const result = validatePackageRecommendation({
    primaryPackageCode: "JMP-PKG-STARTER",
    alternatePackageCode: "JMP-PKG-PRO",
    rationale: "The manuscript is short enough for Starter because the routing score is 7/10."
  });

  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("INTERNAL_PACKAGE_ROUTING_LANGUAGE"));
  assert.ok(result.blockers.includes("RAW_INTERNAL_SCORE_EXPOSED"));
});

test("full communication preflight blocks stale internal author-facing copy", () => {
  const result = evaluateCommunicationPreflight({
    authorFacingCopy: "Dataverse binding failed. Workflow scorecard 7/10.",
    authorRequest: {
      requestedItems: ["manuscript"],
      custodyEvidence: [{ key: "manuscript", present: true }]
    },
    cadence: {
      now: "2026-08-29T12:00:00Z",
      lastAuthorFacingSendAt: "2026-08-29T07:45:00Z"
    },
    packageRecommendation: {
      primaryPackageCode: "JMP-PKG-STARTER",
      rationale: "The manuscript is short enough for Starter."
    }
  });

  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes(AUTHOR_REQUEST_BLOCKER));
  assert.ok(result.blockers.includes("AUTHOR_RELEASE_24_HOUR_RHYTHM"));
  assert.ok(result.blockers.includes("AUTHOR_FACING_INTERNAL_LANGUAGE"));
});

test("Jackuline regression resolves to no fourth email and no future false manuscript request", () => {
  const result = evaluateJackulineRegressionScenario();

  assert.equal(result.truthCheck.ok, false);
  assert.equal(result.truthCheck.blocker, AUTHOR_REQUEST_BLOCKER);
  assert.equal(result.packageCheck.ok, true);
  assert.equal(result.sendFourthEmailNow, false);
  assert.equal(result.priceOmissionDisposition, "AWAIT_REPLY_NATURAL_FOLLOWUP");
  assert.equal(result.negativeProof.false_manuscript_request_sent, 0);
  assert.equal(result.negativeProof.package_recommendation_without_price, 0);
});
