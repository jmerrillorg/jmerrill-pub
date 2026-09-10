"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  ENTERPRISE_WORK_TABLE,
  NEGATIVE_CASES,
  PROHIBITED_PARALLEL_TITLE_TABLE,
  PUBLISHING_TITLE_TABLE,
  WORK_PROJECTION_TABLE,
  buildAuthorityPreflight,
  buildSyntheticContext,
  evaluateEnterpriseWorkTitleIntegration,
  runJ7J8ProvingGround
} = require("../src/production/j7j8ProvingGround");

describe("JMP J7/J8 bounded proving ground", () => {
  test("states the exact bounded J7 and J8 canon scope before runtime proof", () => {
    const preflight = buildAuthorityPreflight();

    assert.equal(preflight.j7CanonScope, "PROVEN");
    assert.equal(preflight.j8CanonScope, "PROVEN");
    assert.equal(preflight.commandCenterAuthority, "PROVEN");
    assert.equal(preflight.unresolvedScopeSemantics, 0);
    assert.match(preflight.exactJ7Scope, /production-readiness preparation only/);
    assert.match(preflight.exactJ8Scope, /distribution-setup readiness only/);
    assert.equal(preflight.nonAuthorizedLiveActions.submitsToDistributionPlatforms, false);
    assert.equal(preflight.nonAuthorizedLiveActions.createsRoyaltySetup, false);
  });

  test("preserves Option C enterprise work projection into jm1pub_title", () => {
    const context = buildSyntheticContext();
    const integration = evaluateEnterpriseWorkTitleIntegration(context);

    assert.equal(context.enterpriseWork.table, ENTERPRISE_WORK_TABLE);
    assert.equal(context.projection.table, WORK_PROJECTION_TABLE);
    assert.equal(context.projection.domainTable, PUBLISHING_TITLE_TABLE);
    assert.equal(context.title.prohibitedParallelTable, PROHIBITED_PARALLEL_TITLE_TABLE);
    assert.equal(integration.ok, true);
    assert.equal(integration.domainStateRemainsPublishingOwned, true);
    assert.equal(integration.legacyIdentifierPreservation, "PASS");
  });

  test("passes J7/J8 proof without external, real-author, or financial effects", () => {
    const proof = runJ7J8ProvingGround();

    assert.equal(proof.finalDecision.JMP_J7J8_001_STATUS, "JMP_J7J8_001_PROVING_PASS");
    assert.equal(proof.finalDecision.J7_PROVING_STATUS, "PASS");
    assert.equal(proof.finalDecision.J8_PROVING_STATUS, "PASS");
    assert.equal(proof.finalDecision.ENTERPRISE_WORK_TITLE_INTEGRATION, "PASS");
    assert.equal(proof.finalDecision.SECRETLESS_EXECUTION, "PASS");
    assert.equal(proof.finalDecision.SUPERVISED_BAND2_PROVING, "PASS");
    assert.equal(proof.finalDecision.REAL_AUTHOR_TITLE_MUTATIONS, 0);
    assert.equal(proof.finalDecision.REAL_AUTHOR_COMMUNICATIONS, 0);
    assert.equal(proof.finalDecision.REAL_TITLE_MIGRATIONS, 0);
    assert.equal(proof.finalDecision.FINANCIAL_MUTATIONS, 0);
    assert.equal(proof.j7Proof.readiness.liveActions.startsProductionWork, false);
    assert.equal(proof.j8Proof.readiness.liveActions.submitsToIngram, false);
    assert.equal(proof.j8Proof.readiness.liveActions.publishesRetailListing, false);
  });

  test("proves all required fail-closed cases with no partial effects", () => {
    const proof = runJ7J8ProvingGround();
    const cases = proof.negativeProof.map((item) => item.capability).sort();

    assert.deepEqual(cases, [...NEGATIVE_CASES].sort());
    assert.equal(proof.negativeProof.every((item) => item.result === "DENIED"), true);
    assert.equal(proof.negativeProof.every((item) => item.partialAuthorityEffects === 0), true);
    assert.equal(proof.negativeProof.every((item) => item.unauthorizedExternalEffects === 0), true);
    assert.equal(proof.negativeProof.every((item) => item.realAuthorEffects === 0), true);
    assert.equal(proof.finalDecision.FAIL_CLOSED, "PASS");
  });

  test("replays the identical proving execution without duplicate work", () => {
    const proof = runJ7J8ProvingGround({ completedAt: "2026-09-09T12:00:00.000Z" });

    assert.equal(proof.idempotencyProof.pass, true);
    assert.equal(proof.idempotencyProof.duplicateWorks, 0);
    assert.equal(proof.idempotencyProof.duplicateProjections, 0);
    assert.equal(proof.idempotencyProof.duplicateProductionRecords, 0);
    assert.equal(proof.idempotencyProof.duplicateDistributionRecords, 0);
    assert.equal(proof.idempotencyProof.duplicateCommunications, 0);
    assert.equal(proof.idempotencyProof.sameExecutionReplay, "SAME_AUTHORITY / NO NEW EFFECT");
  });

  test("creates the required proof matrix columns and terminal autonomy boundaries", () => {
    const proof = runJ7J8ProvingGround();
    const columns = [
      "CAPABILITY",
      "J7_OR_J8",
      "AUTHORITY_SOURCE",
      "TEST_TYPE",
      "IDENTITY",
      "INPUT",
      "EXPECTED_RESULT",
      "ACTUAL_RESULT",
      "EXTERNAL_EFFECT",
      "ROLLBACK_CLASS",
      "EVIDENCE",
      "STATUS"
    ];

    assert.deepEqual(Object.keys(proof.proofMatrix[0]), columns);
    assert.equal(proof.proofMatrix.every((row) => ["PASS", "FAIL", "BLOCKED", "NOT_REQUIRED"].includes(row.STATUS)), true);
    assert.equal(proof.proofMatrix.every((row) => row.EXTERNAL_EFFECT === 0), true);
    assert.equal(proof.finalDecision.PRODUCTION_AUTONOMY, "NO");
    assert.equal(proof.finalDecision.CLIENT_TITLE_AUTONOMY, "FROZEN");
    assert.equal(proof.finalDecision.BAND2_AUTONOMOUS_CERTIFICATION, "NO");
  });
});
