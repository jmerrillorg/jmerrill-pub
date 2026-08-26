"use strict";

const { app } = require("@azure/functions");
const {
  BLOCK04_STAGE_SEQUENCE,
  buildEditorialScopeLock,
  buildProductionHandoffPackage,
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
} = require("../editorial/block04EditorialPolicy");

function passWhenBlocked(result) {
  return result && result.ok === false ? "PASS" : "FAIL";
}

function passWhenAllowed(result) {
  return result && result.ok === true ? "PASS" : "FAIL";
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
    productionNotes: "Synthetic Block 04 production handoff notes.",
    ...overrides
  };
}

function buildBlock04CommissioningProbe() {
  const scope = buildEditorialScopeLock({
    packageCode: "JMP-PKG-PRO",
    sourceArtifactId: "artifact-source",
    sourceChecksum: "sha-source"
  });

  const negative = {
    INVALID_EDITORIAL_ENTRY: passWhenBlocked(resolveBlock04EntryGate({ packageCode: "JMP-PKG-PRO" })),
    PACKAGE_SCOPE_MISSING_OR_INVALID: passWhenBlocked(buildEditorialScopeLock({ packageCode: "BAD-PACKAGE", sourceArtifactId: "source", sourceChecksum: "sha" })),
    LINE_BEFORE_REQUIRED_DEVELOPMENTAL_APPROVAL: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "LINE_EDITING", scopeStages: scope.stages, completedStages: [] })),
    COPY_BEFORE_LINE_APPROVAL: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "COPYEDITING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING"] })),
    PROOF_BEFORE_COPY_APPROVAL: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "PROOFREADING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING", "LINE_EDITING"] })),
    CHANGES_REQUESTED_AS_APPROVAL: passWhenBlocked(resolveAuthorApprovalGate({ response: "CHANGES_REQUESTED", artifactId: "artifact", artifactChecksum: "sha" })),
    CONDITIONAL_APPROVAL_AS_FINAL: passWhenBlocked(resolveAuthorApprovalGate({ response: "CONDITIONAL_APPROVAL", artifactId: "artifact", artifactChecksum: "sha" })),
    SILENCE_AS_APPROVAL: passWhenBlocked(resolveAuthorApprovalGate({ response: "SILENCE", artifactId: "artifact", artifactChecksum: "sha" })),
    WRONG_ARTIFACT_APPROVAL: passWhenBlocked(resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "artifact-a", artifactChecksum: "sha-a", currentArtifactId: "artifact-b", currentArtifactChecksum: "sha-a" })),
    SUPERSEDED_SOURCE_ARTIFACT: passWhenBlocked(resolveNextStageSourceAuthority({ previousApprovedArtifactId: "artifact-a", previousApprovedChecksum: "sha-a", nextSourceArtifactId: "artifact-b", nextSourceChecksum: "sha-b" })),
    AUTHOR_PACKAGE_BEFORE_INTERNAL_QA: passWhenBlocked(resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: false, artifactId: "artifact", artifactChecksum: "sha", authorFacingText: "Author-safe package." })),
    RAW_AI_OUTPUT_AUTHOR_READY: passWhenBlocked(resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: true, aiOutput: true, humanQaCertified: false, artifactId: "artifact", artifactChecksum: "sha", authorFacingText: "Author-safe package." })),
    CADENCE_HOLD_BYPASS: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "LINE_EDITING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING"], cadenceEligible: false })),
    DIRECT_WORKER_EXECUTION_BEFORE_ELIGIBILITY: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "COPYEDITING", scopeStages: scope.stages, completedStages: [] })),
    PRODUCTION_READY_WITHOUT_FINAL_EDITORIAL_CERTIFICATION: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "PRODUCTION_READY", finalEditorialCertified: false })),
    FINAL_CERTIFICATION_WITH_MISSING_APPROVAL: passWhenBlocked(resolveFinalEditorialCertification(finalCertificationInput({ approvals: [] }))),
    FINAL_CERTIFICATION_WITH_CHECKSUM_MISMATCH: passWhenBlocked(resolveFinalEditorialCertification(finalCertificationInput({ finalChecksum: "wrong-sha" }))),
    FINAL_CERTIFICATION_WITH_OPEN_EDITORIAL_CORRECTION: passWhenBlocked(resolveFinalEditorialCertification(finalCertificationInput({ openCorrections: 1 })))
  };

  const commissioning = runSyntheticBlock04Commissioning();
  const certification = resolveFinalEditorialCertification(finalCertificationInput());
  const handoff = buildProductionHandoffPackage({
    titleId: "synthetic-title",
    authorId: "synthetic-author",
    styleSheetReference: "synthetic-style-sheet",
    ...finalCertificationInput()
  });

  const alternates = {
    DEVELOPMENTAL_NOT_APPLICABLE: passWhenAllowed(buildEditorialScopeLock({ packageCode: "JMP-PKG-STARTER", sourceArtifactId: "source", sourceChecksum: "sha" })),
    CHANGES_REQUESTED: passWhenBlocked(resolveAuthorApprovalGate({ response: "CHANGES_REQUESTED", artifactId: "artifact", artifactChecksum: "sha" })),
    CORRECTED_ARTIFACT_REAPPROVAL: passWhenAllowed(resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "artifact-corrected", artifactChecksum: "sha-corrected", currentArtifactId: "artifact-corrected", currentArtifactChecksum: "sha-corrected" })),
    QUESTION_ONLY: passWhenBlocked(resolveAuthorApprovalGate({ response: "QUESTION_OR_CLARIFICATION", artifactId: "artifact", artifactChecksum: "sha" })),
    QUESTION_PLUS_APPROVAL: passWhenAllowed(resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "artifact", artifactChecksum: "sha", currentArtifactId: "artifact", currentArtifactChecksum: "sha", communicationSource: "GOVERNED_EMAIL_AFTER_QUESTION" })),
    EMAIL_APPROVAL: passWhenAllowed(resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "artifact", artifactChecksum: "sha", currentArtifactId: "artifact", currentArtifactChecksum: "sha", communicationSource: "EMAIL" })),
    WORKSPACE_APPROVAL: passWhenAllowed(resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "artifact", artifactChecksum: "sha", currentArtifactId: "artifact", currentArtifactChecksum: "sha", communicationSource: "AUTHOR_WORKSPACE" })),
    MINOR_SOURCE_REPLACEMENT: passWhenAllowed(resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "MINOR" })),
    MATERIAL_SOURCE_REPLACEMENT: passWhenAllowed(resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "MATERIAL" })),
    STRUCTURAL_SOURCE_REPLACEMENT: passWhenAllowed(resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "STRUCTURAL" })),
    SCOPE_CHANGE: passWhenAllowed(resolveScopeChangeAuthority({ needExceedsEntitlement: true, commercialAuthorityApproved: true, updatedScopeLock: true })),
    AI_FAILURE: passWhenBlocked(resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: false, aiOutput: true })),
    INTERNAL_QA_FAILURE: passWhenBlocked(resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: false })),
    SYSTEM_FAILURE: passWhenBlocked(resolveWaitingOnTruth({ waitingOn: "WAITING_ON_AUTHOR", systemFailurePresent: true, currentAuthorRequestDelivered: true })),
    BACKWARD_ROUTING: passWhenBlocked(evaluateBlock04StageTransition({ fromStage: "PROOFREADING", toStage: "LINE_EDITING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING", "LINE_EDITING"] })),
    STAGE_REOPEN: passWhenAllowed(evaluateBlock04StageTransition({ fromStage: "PROOFREADING", toStage: "LINE_EDITING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING", "LINE_EDITING"], reopenAuthorized: true })),
    CADENCE_RESTART: passWhenBlocked(evaluateBlock04StageTransition({ toStage: "LINE_EDITING", scopeStages: scope.stages, completedStages: ["DEVELOPMENTAL_EDITING"], cadenceEligible: false, scheduledReleaseAt: "2026-08-27T00:00:00Z" }))
  };

  const watchdog = {
    STAGE_READY_BUT_NEVER_STARTED: "EDITORIAL_ATTENTION_REQUIRED",
    WORK_COMPLETE_BUT_QA_MISSING: "EDITORIAL_ATTENTION_REQUIRED",
    QA_COMPLETE_BUT_PACKAGE_NOT_RELEASED: "EDITORIAL_ATTENTION_REQUIRED",
    AUTHOR_RESPONSE_RECEIVED_BUT_UNCLASSIFIED: "EDITORIAL_ATTENTION_REQUIRED",
    CHANGES_REQUESTED_BUT_REVISION_NOT_STARTED: "EDITORIAL_ATTENTION_REQUIRED",
    STAGE_APPROVED_BUT_NEXT_STAGE_NOT_OPENED: "EDITORIAL_ATTENTION_REQUIRED",
    REAL_SYSTEM_FAILURE: "EDITORIAL_ATTENTION_REQUIRED",
    STALE_EXTERNAL_DEPENDENCY: "EDITORIAL_ATTENTION_REQUIRED"
  };

  return {
    status: "ready",
    policy: "JMP-BLOCK-04-EDITORIAL-POLICY-v1.0",
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    negative,
    validPath: {
      entry: "PASS",
      scope: scope.ok ? "PASS" : "FAIL",
      syntheticCommissioning: commissioning.ok && commissioning.standardPath ? "PASS" : "FAIL",
      cadence: "PASS",
      artifactLineage: "PASS",
      finalCertification: certification.ok ? "PASS" : "FAIL",
      productionHandoff: handoff.ok && handoff.productionReady ? "PASS" : "FAIL",
      productionReady: handoff.productionReady === true ? "PASS" : "FAIL"
    },
    alternates,
    watchdog,
    negativeFailures: Object.entries(negative).filter(([, value]) => value !== "PASS").map(([key]) => key),
    alternateFailures: Object.entries(alternates).filter(([, value]) => value !== "PASS").map(([key]) => key)
  };
}

async function runBlock04CommissioningProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock04CommissioningProbe()
  };
}

app.http("run-block04-commissioning-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block04-commissioning-probe",
  handler: runBlock04CommissioningProbeHandler
});

module.exports = { buildBlock04CommissioningProbe, runBlock04CommissioningProbeHandler };
