"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BLOCK04_STAGE_SEQUENCE,
  buildEditorialScopeLock,
  buildProductionHandoffPackage,
  classifyAuthorResponse,
  evaluateBlock04StageTransition,
  resolveAuthorApprovalGate,
  resolveAuthorReviewRelease,
  resolveBlock04EntryGate,
  resolveFinalEditorialCertification,
  resolveNextStageSourceAuthority,
  resolveScopeChangeAuthority,
  resolveSourceChangeImpact,
  resolveWaitingOnTruth,
  runSyntheticBlock04Commissioning
} = require("../src/editorial/block04EditorialPolicy");

function proScope() {
  const scope = buildEditorialScopeLock({
    packageCode: "JMP-PKG-PRO",
    sourceArtifactId: "artifact-source",
    sourceChecksum: "sha-source",
    scopeVersion: "1.0"
  });
  assert.equal(scope.ok, true);
  return scope;
}

function finalCertificationInput(overrides = {}) {
  return {
    stages: BLOCK04_STAGE_SEQUENCE.map((stageType) => ({ stageType, applicable: true, status: "COMPLETE" })),
    approvals: BLOCK04_STAGE_SEQUENCE.map((stageType) => ({
      stageType,
      response: "APPROVED",
      artifactId: `${stageType}-artifact`,
      artifactChecksum: `${stageType}-sha`,
      currentArtifactId: `${stageType}-artifact`,
      currentArtifactChecksum: `${stageType}-sha`
    })),
    finalArtifactId: "PROOFREADING-artifact",
    finalChecksum: "PROOFREADING-sha",
    expectedFinalChecksum: "PROOFREADING-sha",
    styleSheetCurrent: true,
    openCorrections: 0,
    internalQaComplete: true,
    productionNotes: "Final editorial handoff notes.",
    ...overrides
  };
}

test("Block 04 entry gate excludes repeated Block 02 package recommendation review", () => {
  const result = resolveBlock04EntryGate({
    upstreamEditorialReviewStatus: "COMPLETE",
    joinedTheFamily: true,
    activeTitleProject: true,
    certifiedSourceArtifactId: "source-1",
    certifiedSourceChecksum: "sha-1",
    packageCode: "JMP-PKG-PRO",
    repeatsBlock02EditorialReview: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.blockers.includes("BLOCK_04_MUST_NOT_REPEAT_BLOCK_02_EDITORIAL_REVIEW"), true);
});

test("scope lock follows package entitlement and does not expand Starter into developmental editing", () => {
  const result = buildEditorialScopeLock({
    packageCode: "JMP-PKG-STARTER",
    sourceArtifactId: "source-1",
    sourceChecksum: "sha-1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.stages.find((stage) => stage.stageType === "DEVELOPMENTAL_EDITING").applicable, false);
  assert.equal(result.stages.find((stage) => stage.stageType === "LINE_EDITING").applicable, true);
});

test("Line cannot start before applicable Developmental approval is complete", () => {
  const result = evaluateBlock04StageTransition({
    toStage: "LINE_EDITING",
    scopeStages: proScope().stages,
    completedStages: []
  });

  assert.equal(result.ok, false);
  assert.equal(result.missing.includes("DEVELOPMENTAL_EDITING"), true);
});

test("Copy cannot start before Line approval is complete", () => {
  const result = evaluateBlock04StageTransition({
    toStage: "COPYEDITING",
    scopeStages: proScope().stages,
    completedStages: ["DEVELOPMENTAL_EDITING"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.missing.includes("LINE_EDITING"), true);
});

test("changes requested, approved with corrections, and silence are not final approval", () => {
  for (const response of ["CHANGES_REQUESTED", "APPROVED_WITH_CORRECTIONS", "SILENCE"]) {
    const result = resolveAuthorApprovalGate({ response, artifactId: "artifact-a", artifactChecksum: "sha-a" });
    assert.equal(result.ok, false, response);
    assert.equal(classifyAuthorResponse({ response }).finalApproval, false, response);
  }
});

test("author approval must bind to the exact current artifact and checksum", () => {
  const wrongArtifact = resolveAuthorApprovalGate({
    response: "APPROVED",
    artifactId: "artifact-a",
    artifactChecksum: "sha-a",
    currentArtifactId: "artifact-b",
    currentArtifactChecksum: "sha-b"
  });
  const wrongChecksum = resolveAuthorApprovalGate({
    response: "APPROVED",
    artifactId: "artifact-a",
    artifactChecksum: "sha-a",
    currentArtifactId: "artifact-a",
    currentArtifactChecksum: "sha-b"
  });

  assert.equal(wrongArtifact.ok, false);
  assert.equal(wrongChecksum.ok, false);
});

test("next editorial stage cannot consume an unapproved or changed source artifact", () => {
  const missingApproval = resolveNextStageSourceAuthority({
    nextSourceArtifactId: "artifact-b",
    nextSourceChecksum: "sha-b"
  });
  const changedSource = resolveNextStageSourceAuthority({
    previousApprovedArtifactId: "artifact-a",
    previousApprovedChecksum: "sha-a",
    nextSourceArtifactId: "artifact-b",
    nextSourceChecksum: "sha-b"
  });

  assert.equal(missingApproval.ok, false);
  assert.equal(changedSource.ok, false);
});

test("governed source transformation requires derived-from and validation evidence", () => {
  const blocked = resolveNextStageSourceAuthority({
    previousApprovedArtifactId: "artifact-a",
    previousApprovedChecksum: "sha-a",
    nextSourceArtifactId: "artifact-b",
    nextSourceChecksum: "sha-b",
    transformed: true,
    derivedFromArtifactId: "artifact-a",
    derivedFromChecksum: "sha-a",
    transformationValidated: false
  });
  const allowed = resolveNextStageSourceAuthority({
    previousApprovedArtifactId: "artifact-a",
    previousApprovedChecksum: "sha-a",
    nextSourceArtifactId: "artifact-b",
    nextSourceChecksum: "sha-b",
    transformed: true,
    derivedFromArtifactId: "artifact-a",
    derivedFromChecksum: "sha-a",
    transformationValidated: true
  });

  assert.equal(blocked.ok, false);
  assert.equal(allowed.ok, true);
});

test("author-facing release blocks before internal QA and raw AI output QA", () => {
  const beforeQa = resolveAuthorReviewRelease({
    workComplete: true,
    internalQaPassed: false,
    artifactId: "artifact-a",
    artifactChecksum: "sha-a",
    authorFacingText: "Author-safe package."
  });
  const rawAi = resolveAuthorReviewRelease({
    workComplete: true,
    internalQaPassed: true,
    aiOutput: true,
    humanQaCertified: false,
    artifactId: "artifact-a",
    artifactChecksum: "sha-a",
    authorFacingText: "Author-safe package."
  });

  assert.equal(beforeQa.ok, false);
  assert.equal(rawAi.ok, false);
});

test("author-facing release blocks internal metadata leakage", () => {
  const result = resolveAuthorReviewRelease({
    workComplete: true,
    internalQaPassed: true,
    artifactId: "artifact-a",
    artifactChecksum: "sha-a",
    authorFacingText: "Execution log: jm1_executionlogid=abc"
  });

  assert.equal(result.ok, false);
});

test("cadence hold blocks direct editorial worker execution", () => {
  const result = evaluateBlock04StageTransition({
    toStage: "LINE_EDITING",
    scopeStages: proScope().stages,
    completedStages: ["DEVELOPMENTAL_EDITING"],
    cadenceEligible: false
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "CADENCE_HOLD_BLOCKED");
});

test("source manuscript replacement cannot be silently merged", () => {
  const result = resolveSourceChangeImpact({
    sourceReplacementReceived: true,
    silentlyMerged: true,
    impact: "MINOR"
  });

  assert.equal(result.ok, false);
});

test("scope expansion requires commercial authority and an updated scope lock", () => {
  const noAuthority = resolveScopeChangeAuthority({ needExceedsEntitlement: true });
  const noScopeLock = resolveScopeChangeAuthority({ needExceedsEntitlement: true, commercialAuthorityApproved: true });

  assert.equal(noAuthority.ok, false);
  assert.equal(noScopeLock.ok, false);
});

test("system failure cannot be mislabeled as Waiting On Author", () => {
  const result = resolveWaitingOnTruth({
    waitingOn: "WAITING_ON_AUTHOR",
    systemFailurePresent: true,
    currentAuthorRequestDelivered: true
  });

  assert.equal(result.ok, false);
});

test("Production Ready requires Final Editorial Certification", () => {
  const result = evaluateBlock04StageTransition({
    toStage: "PRODUCTION_READY",
    finalEditorialCertified: false
  });

  assert.equal(result.ok, false);
});

test("Final Editorial Certification blocks missing approvals, checksum mismatch, unresolved corrections, and ambiguous final files", () => {
  const missingApproval = resolveFinalEditorialCertification(finalCertificationInput({ approvals: [] }));
  const checksumMismatch = resolveFinalEditorialCertification(finalCertificationInput({ finalChecksum: "sha-wrong" }));
  const unresolvedCorrection = resolveFinalEditorialCertification(finalCertificationInput({ openCorrections: 1 }));
  const ambiguousFinalFile = resolveFinalEditorialCertification(finalCertificationInput({ ambiguousFinalFile: true }));

  assert.equal(missingApproval.ok, false);
  assert.equal(checksumMismatch.ok, false);
  assert.equal(unresolvedCorrection.ok, false);
  assert.equal(ambiguousFinalFile.ok, false);
});

test("Production handoff passes only after final editorial certification", () => {
  const result = buildProductionHandoffPackage({
    titleId: "title-1",
    authorId: "author-1",
    styleSheetReference: "style-sheet-1",
    ...finalCertificationInput()
  });

  assert.equal(result.ok, true);
  assert.equal(result.productionReady, true);
  assert.equal(result.handoff.finalApprovedManuscriptArtifactId, "PROOFREADING-artifact");
});

test("synthetic Block 04 commissioning covers the canonical editorial path", () => {
  const result = runSyntheticBlock04Commissioning();

  assert.equal(result.ok, true);
  assert.equal(result.standardPath, true);
  assert.equal(result.changesLoop, true);
  assert.equal(result.conditionalApprovalRejected, true);
  assert.equal(result.silenceRejected, true);
  assert.equal(result.productionHandoff, true);
});
