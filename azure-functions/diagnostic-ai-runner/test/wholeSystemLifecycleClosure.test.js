"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AUTHORITY_DOMAINS,
  BLOCKS,
  CLOCKS,
  CROSS_BLOCK_HANDOFFS,
  NEGATIVE_ASSERTIONS,
  WHOLE_CLASSIFICATION,
  block01Commissioning,
  block02Commissioning,
  block03Commissioning,
  buildArtifactLineage,
  buildCommunicationAuthority,
  buildCrossBlockHandoffs,
  buildIdentityProof,
  buildWholeLifecycleClosureProbe,
  runNegativeGoldenPath,
  runSyntheticGoldenPath,
  runWholeLifecycleClosure
} = require("../src/lifecycle/wholeSystemLifecycleClosure");
const {
  runWholeLifecycleClosureProbeHandler
} = require("../src/functions/runWholeLifecycleClosureProbe");

test("Blocks 01-03 are commissioned under the whole-system closure standard", () => {
  assert.equal(block01Commissioning().classification, "FULLY_COMMISSIONED");
  assert.equal(block02Commissioning().classification, "FULLY_COMMISSIONED");
  assert.equal(block03Commissioning().classification, "FULLY_COMMISSIONED");
});

test("whole-system closure reports all nine lifecycle blocks commissioned", () => {
  const probe = buildWholeLifecycleClosureProbe();

  assert.equal(probe.status, "ready");
  assert.equal(probe.classification, WHOLE_CLASSIFICATION.FULL);
  assert.deepEqual(Object.keys(probe.blocks).sort(), [...BLOCKS].sort());
  assert.equal(probe.blocks["04"], "EDITORIAL_FULLY_COMMISSIONED");
  assert.equal(probe.blocks["05"], "PRODUCTION_FULLY_COMMISSIONED");
  assert.equal(probe.blocks["06"], "RELEASE_READINESS_FULLY_COMMISSIONED");
  assert.equal(probe.blocks["07"], "DISTRIBUTION_FULLY_COMMISSIONED");
  assert.equal(probe.blocks["08"], "LAUNCH_MARKETING_FULLY_COMMISSIONED");
  assert.equal(probe.blocks["09"], "TITLE_MANAGEMENT_FULLY_COMMISSIONED");
});

test("cross-block handoffs cover every required lifecycle boundary and fail closed", () => {
  const handoffs = buildCrossBlockHandoffs();

  assert.equal(handoffs.length, CROSS_BLOCK_HANDOFFS.length);
  assert.equal(handoffs.length, 10);
  for (const handoff of handoffs) {
    assert.equal(handoff.duplicateProtection, true, handoff.boundary);
    assert.equal(handoff.failClosedBehavior, true, handoff.boundary);
    assert.deepEqual(handoff.requiredFields, [
      "authorId",
      "titleId",
      "artifactId",
      "checksum",
      "correlationId"
    ]);
  }
});

test("identity and artifact lineage reject mismatches and filename authority", () => {
  const identity = buildIdentityProof();
  const lineage = buildArtifactLineage();

  assert.equal(identity.mismatchProtection.attaIndomitableMismatch, "DENY");
  assert.equal(identity.mismatchProtection.quanishaIndomitable, "ALLOW");
  assert.equal(identity.mismatchProtection.titleNamedPayeeLeakage, "DENY");
  for (const artifact of lineage) {
    assert.match(artifact.checksum, /^[0-9a-f]{64}$/);
    assert.ok(artifact.artifactId.endsWith("-SYNTH"));
    assert.ok(Object.hasOwn(artifact, "derivedFrom"));
  }
});

test("communication authority enforces ACS sender and Microsoft-first reply evidence", () => {
  const authority = buildCommunicationAuthority();

  assert.equal(authority.publishingSender, "publishing@email.jmerrill.one");
  assert.equal(authority.replyTo, "publishing@jmerrill.one");
  assert.equal(authority.cc, "publishing@jmerrill.one");
  assert.equal(authority.htmlAuthorFacing, true);
  assert.equal(authority.noReply, "DENY");
  assert.equal(authority.plainTextOnlyAuthorSend, "DENY");
  assert.equal(authority.wrongAuthorTitle, "DENY");
  assert.equal(authority.stripeConnectSetupEmails, "ALLOWED");
  assert.equal(authority.royaltyPaymentResponseAutomation, "DENIED_JACKIE_MANAGED");
});

test("golden and negative paths prove the returning-author loop and fail-closed controls", () => {
  const golden = runSyntheticGoldenPath();
  const negative = runNegativeGoldenPath();

  assert.equal(golden.ok, true);
  assert.equal(golden.returningAuthorLoop, "PASS");
  assert.ok(golden.events.includes("BLOCK_01_RETURNING_AUTHOR_RECOGNIZED"));
  assert.equal(golden.realEmailPaymentDistributionMarketing, 0);
  assert.equal(negative.total, 19);
  assert.equal(negative.passed, 19);
  assert.equal(negative.failed, 0);
});

test("whole-system closure has complete canon, clocks, negative proof, and master register", () => {
  const closure = runWholeLifecycleClosure();

  assert.equal(closure.classification, WHOLE_CLASSIFICATION.FULL);
  assert.equal(closure.authorityMap.length, AUTHORITY_DOMAINS.length);
  assert.equal(closure.canonCoverage.currentCanonPolicies, 31);
  assert.equal(closure.canonCoverage.executable, 31);
  assert.equal(closure.canonCoverage.documentOnly, 0);
  assert.equal(closure.clocks.length, CLOCKS.length);
  assert.equal(Object.keys(closure.negativeProof).length, NEGATIVE_ASSERTIONS.length);
  assert.equal(Object.values(closure.negativeProof).every((value) => value === 0), true);
  assert.equal(closure.masterRegister.totalDomains, 52);
  assert.equal(closure.masterRegister.commissioned, 52);
  assert.equal(closure.masterRegister.notReady, 0);
});

test("whole-system closure probe handler returns read-only JSON", async () => {
  const response = await runWholeLifecycleClosureProbeHandler();

  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.status, "ready");
  assert.equal(response.jsonBody.classification, WHOLE_CLASSIFICATION.FULL);
  assert.equal(response.jsonBody.handoffs.count, 10);
  assert.equal(response.jsonBody.handoffs.proven, 10);
  assert.equal(response.jsonBody.negative.failures.length, 0);
});
