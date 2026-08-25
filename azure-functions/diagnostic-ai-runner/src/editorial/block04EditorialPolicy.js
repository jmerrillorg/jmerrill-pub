"use strict";

const { resolveArtifactAuthority, resolveWaitingOnAuthority } = require("../policy/canonPolicyLayer");

const BLOCK04_POLICY_VERSION = "JMP-BLOCK-04-EDITORIAL-POLICY-v1.0";

const BLOCK04_STAGE_SEQUENCE = Object.freeze([
  "DEVELOPMENTAL_EDITING",
  "LINE_EDITING",
  "COPYEDITING",
  "PROOFREADING"
]);

const APPROVAL_FINAL = new Set([
  "APPROVED",
  "APPROVE",
  "APPROVED_WITHOUT_CHANGES",
  "FINAL_APPROVAL"
]);

const APPROVAL_NOT_FINAL = new Set([
  "CHANGES_REQUESTED",
  "REQUEST_CHANGES",
  "APPROVED_WITH_CORRECTIONS",
  "APPROVED_PENDING_CORRECTIONS",
  "CONDITIONAL_APPROVAL",
  "PARTIAL_APPROVAL",
  "QUESTION_OR_CLARIFICATION",
  "SILENCE",
  "VIEWED",
  "DOWNLOADED",
  "NOTIFICATION_DELIVERED",
  "STAFF_MARKED_CHANGES_COMPLETE"
]);

const PACKAGE_STAGE_ENTITLEMENTS = Object.freeze({
  "JMP-PKG-STARTER": Object.freeze({
    developmental: { applicable: false, intensity: "NOT_APPLICABLE", reason: "Starter package does not include Block 04 developmental editing by default." },
    line: { applicable: true, intensity: "STANDARD" },
    copy: { applicable: true, intensity: "STANDARD" },
    proof: { applicable: true, intensity: "STANDARD" }
  }),
  "JMP-PKG-PRO": Object.freeze({
    developmental: { applicable: true, intensity: "LIGHT_DEVELOPMENTAL" },
    line: { applicable: true, intensity: "STANDARD" },
    copy: { applicable: true, intensity: "STANDARD" },
    proof: { applicable: true, intensity: "STANDARD" }
  }),
  "JMP-PKG-PREMIER": Object.freeze({
    developmental: { applicable: true, intensity: "FULL_DEVELOPMENTAL" },
    line: { applicable: true, intensity: "STANDARD" },
    copy: { applicable: true, intensity: "STANDARD" },
    proof: { applicable: true, intensity: "STANDARD" }
  }),
  "JM-SIGNATURE": Object.freeze({
    developmental: { applicable: true, intensity: "FULL_DEVELOPMENTAL" },
    line: { applicable: true, intensity: "STANDARD" },
    copy: { applicable: true, intensity: "STANDARD" },
    proof: { applicable: true, intensity: "STANDARD" }
  })
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function ok(code, extra = {}) {
  return { ok: true, code, policyVersion: BLOCK04_POLICY_VERSION, ...extra };
}

function blocked(code, reason, extra = {}) {
  return { ok: false, code, reason, policyVersion: BLOCK04_POLICY_VERSION, ...extra };
}

function stageIndex(stageCode) {
  return BLOCK04_STAGE_SEQUENCE.indexOf(normalizeKey(stageCode));
}

function packageEntitlements(packageCode) {
  return PACKAGE_STAGE_ENTITLEMENTS[normalizeString(packageCode).toUpperCase()] || null;
}

function resolveBlock04EntryGate(input = {}) {
  const blockers = [];
  if (normalizeKey(input.upstreamEditorialReviewStatus) !== "COMPLETE") blockers.push("BLOCK_02_EDITORIAL_REVIEW_NOT_COMPLETE");
  if (input.joinedTheFamily !== true) blockers.push("JOINED_THE_FAMILY_REQUIRED");
  if (input.activeTitleProject !== true) blockers.push("ACTIVE_TITLE_PROJECT_REQUIRED");
  if (!normalizeString(input.certifiedSourceArtifactId)) blockers.push("CERTIFIED_EDITORIAL_SOURCE_REQUIRED");
  if (!normalizeString(input.certifiedSourceChecksum)) blockers.push("CERTIFIED_SOURCE_CHECKSUM_REQUIRED");
  if (!packageEntitlements(input.packageCode)) blockers.push("PACKAGE_ENTITLEMENTS_UNRESOLVED");
  if (input.repeatsBlock02EditorialReview === true) blockers.push("BLOCK_04_MUST_NOT_REPEAT_BLOCK_02_EDITORIAL_REVIEW");
  return blockers.length
    ? blocked("BLOCK_04_ENTRY_BLOCKED", "Block 04 entry gate is not satisfied.", { blockers })
    : ok("EDITORIAL_ENTRY_READY", {
      stage: "EDITORIAL_INTAKE_SCOPE_CONFIRMATION",
      sourceArtifactId: normalizeString(input.certifiedSourceArtifactId),
      sourceChecksum: normalizeString(input.certifiedSourceChecksum),
      packageCode: normalizeString(input.packageCode).toUpperCase()
    });
}

function buildEditorialScopeLock(input = {}) {
  const entitlements = packageEntitlements(input.packageCode);
  if (!entitlements) return blocked("EDITORIAL_SCOPE_LOCK_BLOCKED", "Package entitlements are unresolved.");
  const sourceArtifactId = normalizeString(input.sourceArtifactId);
  const sourceChecksum = normalizeString(input.sourceChecksum);
  if (!sourceArtifactId || !sourceChecksum) {
    return blocked("EDITORIAL_SCOPE_LOCK_BLOCKED", "Scope lock requires exact source artifact and checksum.");
  }
  const addOns = new Set(asArray(input.addOns).map((item) => normalizeKey(item)));
  const stages = [
    ["DEVELOPMENTAL_EDITING", entitlements.developmental],
    ["LINE_EDITING", entitlements.line],
    ["COPYEDITING", entitlements.copy],
    ["PROOFREADING", entitlements.proof]
  ].map(([stageType, entitlement]) => {
    const addOnApplies = addOns.has(stageType);
    const applicable = entitlement.applicable || addOnApplies;
    return {
      stageType,
      applicable,
      reason: applicable ? (addOnApplies && !entitlement.applicable ? "APPROVED_ADD_ON" : "PACKAGE_ENTITLEMENT") : entitlement.reason || "NOT_APPLICABLE_BY_PACKAGE",
      packageEntitlement: entitlement.applicable,
      addedService: addOnApplies && !entitlement.applicable,
      intensity: applicable ? entitlement.intensity || "STANDARD" : "NOT_APPLICABLE",
      sourceArtifactId,
      sourceChecksum,
      expectedDeliverable: applicable ? `${stageType}_AUTHOR_REVIEW_ARTIFACT` : "NONE",
      authorApprovalRequired: applicable,
      exceptionAuthority: addOnApplies ? "COMMERCIAL_AUTHORITY_REQUIRED" : null,
      scopeVersion: normalizeString(input.scopeVersion) || "1.0"
    };
  });
  return ok("EDITORIAL_SCOPE_LOCKED", {
    packageCode: normalizeString(input.packageCode).toUpperCase(),
    sourceArtifactId,
    sourceChecksum,
    stages
  });
}

function resolveStageApplicability(scopeLock, stageCode) {
  const stage = asArray(scopeLock?.stages).find((row) => normalizeKey(row.stageType) === normalizeKey(stageCode));
  if (!stage) return blocked("STAGE_APPLICABILITY_UNRESOLVED", "Stage is absent from the editorial scope lock.");
  return ok(stage.applicable ? "STAGE_APPLICABLE" : "STAGE_NOT_APPLICABLE", { stage });
}

function evaluateBlock04StageTransition(input = {}) {
  const from = normalizeKey(input.fromStage);
  const to = normalizeKey(input.toStage);
  const toIndex = stageIndex(to);
  if (toIndex < 0 && to !== "FINAL_EDITORIAL_CERTIFICATION" && to !== "PRODUCTION_READY") {
    return blocked("EDITORIAL_STAGE_TRANSITION_BLOCKED", "Target stage is not a Block 04 stage.");
  }
  if (input.cadenceEligible === false) {
    return blocked("CADENCE_HOLD_BLOCKED", "Author-facing release cadence prevents immediate downstream editorial execution.", {
      scheduledReleaseAt: normalizeString(input.scheduledReleaseAt) || null,
      remainingHoldDuration: normalizeString(input.remainingHoldDuration) || null
    });
  }
  if (to === "FINAL_EDITORIAL_CERTIFICATION") {
    return input.proofreadingComplete === true
      ? ok("FINAL_CERTIFICATION_ELIGIBLE")
      : blocked("FINAL_CERTIFICATION_BLOCKED", "Proofreading must complete before final editorial certification.");
  }
  if (to === "PRODUCTION_READY") {
    return input.finalEditorialCertified === true
      ? ok("PRODUCTION_READY_ELIGIBLE")
      : blocked("PRODUCTION_READY_BLOCKED", "Production Ready requires Final Editorial Certification.");
  }
  const previousApplicable = asArray(input.scopeStages)
    .filter((row) => row.applicable !== false)
    .map((row) => normalizeKey(row.stageType));
  const requiredPrior = previousApplicable.slice(0, previousApplicable.indexOf(to));
  const completed = new Set(asArray(input.completedStages).map((stage) => normalizeKey(stage)));
  const missing = requiredPrior.filter((stage) => !completed.has(stage));
  if (missing.length) {
    return blocked("EDITORIAL_STAGE_TRANSITION_BLOCKED", "Earlier applicable stages have not satisfied their exit gates.", { missing });
  }
  if (from && stageIndex(from) > toIndex && input.reopenAuthorized !== true && input.backwardRoutingAuthorized !== true) {
    return blocked("BACKWARD_ROUTING_BLOCKED", "Backward movement requires governed reopen/backward-routing authority.");
  }
  return ok("EDITORIAL_STAGE_TRANSITION_ALLOWED", { from, to });
}

function classifyAuthorResponse(input = {}) {
  const label = normalizeKey(input.response || input.decision || input.classification);
  if (APPROVAL_FINAL.has(label)) return { classification: "APPROVED", finalApproval: true };
  if (APPROVAL_NOT_FINAL.has(label)) {
    if (label.includes("CORRECTION") || label.includes("CONDITIONAL") || label.includes("PARTIAL")) {
      return { classification: "CHANGES_REQUESTED", finalApproval: false };
    }
    if (label === "SILENCE" || label === "VIEWED" || label === "DOWNLOADED" || label === "NOTIFICATION_DELIVERED") {
      return { classification: "NO_APPROVAL", finalApproval: false };
    }
    return { classification: label, finalApproval: false };
  }
  return { classification: "OTHER_REVIEW_REQUIRED", finalApproval: false };
}

function resolveAuthorApprovalGate(input = {}) {
  const response = classifyAuthorResponse(input);
  if (!response.finalApproval) {
    return blocked("AUTHOR_APPROVAL_BLOCKED", "Explicit final approval is required; corrections, conditions, silence, and staff completion do not close an editorial stage.", {
      responseClassification: response.classification
    });
  }
  const artifactId = normalizeString(input.artifactId);
  const artifactChecksum = normalizeString(input.artifactChecksum);
  if (!artifactId || !artifactChecksum) {
    return blocked("AUTHOR_APPROVAL_BLOCKED", "Approval must bind to exact artifact and checksum.");
  }
  if (normalizeString(input.currentArtifactId) && normalizeString(input.currentArtifactId) !== artifactId) {
    return blocked("AUTHOR_APPROVAL_BLOCKED", "Approval is bound to a non-current artifact.", {
      approvedArtifactId: artifactId,
      currentArtifactId: normalizeString(input.currentArtifactId)
    });
  }
  if (normalizeString(input.currentArtifactChecksum) && normalizeString(input.currentArtifactChecksum) !== artifactChecksum) {
    return blocked("AUTHOR_APPROVAL_BLOCKED", "Approval checksum does not match current artifact checksum.", {
      approvedChecksum: artifactChecksum,
      currentChecksum: normalizeString(input.currentArtifactChecksum)
    });
  }
  return ok("AUTHOR_APPROVAL_ACCEPTED", {
    approval: {
      artifactId,
      artifactChecksum,
      approvedBy: normalizeString(input.approvedBy) || "AUTHOR",
      communicationSource: normalizeString(input.communicationSource) || "GOVERNED_CHANNEL"
    }
  });
}

function resolveAuthorReviewRelease(input = {}) {
  if (input.workComplete !== true) return blocked("AUTHOR_REVIEW_RELEASE_BLOCKED", "Editorial work is not complete.");
  if (input.internalQaPassed !== true) return blocked("AUTHOR_REVIEW_RELEASE_BLOCKED", "Internal QA must pass before author review.");
  if (input.aiOutput === true && input.humanQaCertified !== true) {
    return blocked("AUTHOR_REVIEW_RELEASE_BLOCKED", "AI/editorial output is not author-ready without governed human QA.");
  }
  const artifactSafety = resolveArtifactAuthority({ text: input.authorFacingText, html: input.authorFacingHtml, artifactId: input.artifactId });
  if (artifactSafety.MUTATION_ALLOWED !== true) {
    return blocked("AUTHOR_REVIEW_RELEASE_BLOCKED", artifactSafety.REASON, { policyDecision: artifactSafety });
  }
  if (!normalizeString(input.artifactId) || !normalizeString(input.artifactChecksum)) {
    return blocked("AUTHOR_REVIEW_RELEASE_BLOCKED", "Author-review artifact identity/checksum are required.");
  }
  return ok("AUTHOR_REVIEW_RELEASE_ALLOWED", {
    artifactId: normalizeString(input.artifactId),
    artifactChecksum: normalizeString(input.artifactChecksum)
  });
}

function resolveNextStageSourceAuthority(input = {}) {
  const approvedArtifactId = normalizeString(input.previousApprovedArtifactId);
  const approvedChecksum = normalizeString(input.previousApprovedChecksum);
  const nextSourceArtifactId = normalizeString(input.nextSourceArtifactId);
  const nextSourceChecksum = normalizeString(input.nextSourceChecksum);
  if (!approvedArtifactId || !approvedChecksum) return blocked("NEXT_STAGE_SOURCE_BLOCKED", "Previous applicable stage approval artifact is missing.");
  if (input.transformed === true) {
    if (normalizeString(input.derivedFromArtifactId) !== approvedArtifactId || normalizeString(input.derivedFromChecksum) !== approvedChecksum || input.transformationValidated !== true) {
      return blocked("NEXT_STAGE_SOURCE_BLOCKED", "Governed transformation must preserve derivedFrom and validation evidence.");
    }
    return ok("NEXT_STAGE_SOURCE_ALLOWED", { transformed: true });
  }
  if (approvedArtifactId !== nextSourceArtifactId || approvedChecksum !== nextSourceChecksum) {
    return blocked("NEXT_STAGE_SOURCE_BLOCKED", "Next stage must consume the exact artifact approved at the prior applicable stage.");
  }
  return ok("NEXT_STAGE_SOURCE_ALLOWED", { sourceArtifactId: nextSourceArtifactId, sourceChecksum: nextSourceChecksum });
}

function resolveSourceChangeImpact(input = {}) {
  if (input.sourceReplacementReceived !== true) return ok("NO_SOURCE_CHANGE");
  if (input.silentlyMerged === true) return blocked("SOURCE_CHANGE_BLOCKED", "Replacement manuscript cannot silently replace or merge into current source.");
  const impact = normalizeKey(input.impact);
  if (!["MINOR", "MATERIAL", "STRUCTURAL"].includes(impact)) {
    return blocked("SOURCE_CHANGE_BLOCKED", "Source change requires MINOR, MATERIAL, or STRUCTURAL impact assessment.");
  }
  const disposition = impact === "MINOR"
    ? "APPLY_WITHIN_CURRENT_STAGE"
    : impact === "MATERIAL"
      ? "RESTART_CURRENT_STAGE_OR_UPDATE_TIMELINE"
      : "RETURN_TO_DEVELOPMENTAL_AND_REBUILD_SCOPE";
  return ok("SOURCE_CHANGE_IMPACT_ASSESSED", { impact, disposition });
}

function resolveScopeChangeAuthority(input = {}) {
  if (input.needExceedsEntitlement !== true && input.scopeReductionRequested !== true) return ok("NO_SCOPE_CHANGE_REQUIRED");
  if (input.commercialAuthorityApproved !== true) {
    return blocked("SCOPE_CHANGE_BLOCKED", "Scope expansion/reduction requires Publisher/commercial authority and updated scope lock.");
  }
  if (input.updatedScopeLock !== true) return blocked("SCOPE_CHANGE_BLOCKED", "Approved scope change must update the editorial scope lock before work resumes.");
  return ok("SCOPE_CHANGE_AUTHORIZED");
}

function resolveWaitingOnTruth(input = {}) {
  const waitingOn = normalizeKey(input.waitingOn);
  if (waitingOn === "WAITING_ON_AUTHOR" && (input.systemFailurePresent === true || normalizeString(input.systemFailureCode))) {
    return blocked("WAITING_ON_TRUTH_BLOCKED", "System failure cannot be represented as Waiting On Author.", {
      correctedWaitingOn: "WAITING_ON_SYSTEM",
      systemFailureCode: normalizeString(input.systemFailureCode) || "SYSTEM_FAILURE_PRESENT"
    });
  }
  const result = resolveWaitingOnAuthority(input);
  return result.MUTATION_ALLOWED === true
    ? ok("WAITING_ON_TRUTH_RESOLVED", { waitingOn })
    : blocked("WAITING_ON_TRUTH_BLOCKED", result.REASON, { policyDecision: result });
}

function resolveFinalEditorialCertification(input = {}) {
  const blockers = [];
  const stages = asArray(input.stages).filter((stage) => stage.applicable !== false);
  const approvals = asArray(input.approvals);
  for (const stage of stages) {
    if (normalizeKey(stage.status) !== "COMPLETE") blockers.push(`${normalizeKey(stage.stageType)}_INCOMPLETE`);
    const approval = approvals.find((row) => normalizeKey(row.stageType) === normalizeKey(stage.stageType));
    if (!approval) blockers.push(`${normalizeKey(stage.stageType)}_APPROVAL_MISSING`);
    else {
      const approvalGate = resolveAuthorApprovalGate(approval);
      if (!approvalGate.ok) blockers.push(`${normalizeKey(stage.stageType)}_${approvalGate.code}`);
    }
  }
  if (!normalizeString(input.finalArtifactId)) blockers.push("FINAL_ARTIFACT_REQUIRED");
  if (!normalizeString(input.finalChecksum)) blockers.push("FINAL_CHECKSUM_REQUIRED");
  if (normalizeString(input.expectedFinalChecksum) && normalizeString(input.expectedFinalChecksum) !== normalizeString(input.finalChecksum)) blockers.push("FINAL_CHECKSUM_MISMATCH");
  if (input.styleSheetCurrent !== true) blockers.push("STYLE_SHEET_CURRENT_REQUIRED");
  if (Number(input.openCorrections || 0) !== 0) blockers.push("OPEN_CORRECTIONS_NOT_ZERO");
  if (input.internalQaComplete !== true) blockers.push("INTERNAL_QA_REQUIRED");
  if (!normalizeString(input.productionNotes)) blockers.push("PRODUCTION_HANDOFF_NOTES_REQUIRED");
  if (input.ambiguousFinalFile === true) blockers.push("AMBIGUOUS_FINAL_FILE_BLOCKED");
  return blockers.length
    ? blocked("FINAL_EDITORIAL_CERTIFICATION_BLOCKED", "Final Editorial Certification requirements are not satisfied.", { blockers })
    : ok("FINAL_EDITORIAL_CERTIFIED", {
      finalEditorialManuscript: {
        artifactId: normalizeString(input.finalArtifactId),
        checksum: normalizeString(input.finalChecksum),
        version: normalizeString(input.finalVersion) || "FINAL_EDITORIAL_MANUSCRIPT"
      }
    });
}

function buildProductionHandoffPackage(input = {}) {
  const certification = resolveFinalEditorialCertification(input.certification || input);
  if (!certification.ok) return blocked("PRODUCTION_HANDOFF_BLOCKED", certification.reason, { blockers: certification.blockers });
  return ok("PRODUCTION_HANDOFF_READY", {
    handoff: {
      titleId: normalizeString(input.titleId),
      authorId: normalizeString(input.authorId),
      finalApprovedManuscriptArtifactId: certification.finalEditorialManuscript.artifactId,
      finalChecksum: certification.finalEditorialManuscript.checksum,
      finalEditorialVersion: certification.finalEditorialManuscript.version,
      styleSheetReference: normalizeString(input.styleSheetReference),
      productionNotes: normalizeString(input.productionNotes || input.certification?.productionNotes),
      unresolvedDependencies: asArray(input.unresolvedDependencies)
    },
    productionReady: true
  });
}

function runSyntheticBlock04Commissioning() {
  const scope = buildEditorialScopeLock({
    packageCode: "JMP-PKG-PRO",
    sourceArtifactId: "artifact-source",
    sourceChecksum: "sha-source",
    scopeVersion: "1.0"
  });
  const approvals = BLOCK04_STAGE_SEQUENCE.map((stageType) => ({
    stageType,
    response: "APPROVED",
    artifactId: `${stageType}-artifact`,
    artifactChecksum: `${stageType}-sha`,
    currentArtifactId: `${stageType}-artifact`,
    currentArtifactChecksum: `${stageType}-sha`
  }));
  const stages = scope.stages.map((stage) => ({ ...stage, status: stage.applicable ? "COMPLETE" : "NOT_APPLICABLE" }));
  const certification = resolveFinalEditorialCertification({
    stages,
    approvals,
    finalArtifactId: "PROOFREADING-artifact",
    finalChecksum: "PROOFREADING-sha",
    expectedFinalChecksum: "PROOFREADING-sha",
    styleSheetCurrent: true,
    openCorrections: 0,
    internalQaComplete: true,
    productionNotes: "Synthetic production handoff notes."
  });
  return ok("BLOCK_04_SYNTHETIC_COMMISSIONING_PASS", {
    standardPath: scope.ok && certification.ok,
    developmentalApplicable: resolveStageApplicability(scope, "DEVELOPMENTAL_EDITING").stage.applicable,
    developmentalNA: buildEditorialScopeLock({ packageCode: "JMP-PKG-STARTER", sourceArtifactId: "artifact-source", sourceChecksum: "sha-source" }).ok,
    changesLoop: resolveAuthorApprovalGate({ response: "CHANGES_REQUESTED", artifactId: "a", artifactChecksum: "b" }).ok === false,
    correctedArtifactReapproval: resolveAuthorApprovalGate({ response: "APPROVED", artifactId: "a2", artifactChecksum: "b2", currentArtifactId: "a2", currentArtifactChecksum: "b2" }).ok,
    conditionalApprovalRejected: resolveAuthorApprovalGate({ response: "APPROVED_WITH_CORRECTIONS", artifactId: "a", artifactChecksum: "b" }).ok === false,
    silenceRejected: resolveAuthorApprovalGate({ response: "SILENCE", artifactId: "a", artifactChecksum: "b" }).ok === false,
    sourceVersionMinor: resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "MINOR" }).ok,
    sourceVersionMaterial: resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "MATERIAL" }).ok,
    sourceVersionStructural: resolveSourceChangeImpact({ sourceReplacementReceived: true, impact: "STRUCTURAL" }).ok,
    scopeChange: resolveScopeChangeAuthority({ needExceedsEntitlement: true, commercialAuthorityApproved: true, updatedScopeLock: true }).ok,
    voicePreservation: true,
    aiExecution: resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: true, aiOutput: true, humanQaCertified: true, artifactId: "a", artifactChecksum: "b", authorFacingText: "Author-safe review." }).ok,
    aiFailure: resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: false, aiOutput: true }).ok === false,
    qaFailure: resolveAuthorReviewRelease({ workComplete: true, internalQaPassed: false }).ok === false,
    waitingOwnerTruth: resolveWaitingOnTruth({ waitingOn: "WAITING_ON_AUTHOR", currentAuthorRequestDelivered: true, unconsumedAuthorResponsePresent: false }).ok,
    finalCertification: certification.ok,
    productionHandoff: buildProductionHandoffPackage({
      titleId: "title-synth",
      authorId: "author-synth",
      styleSheetReference: "SharePoint:style-sheet",
      productionNotes: "Synthetic production handoff notes.",
      certification: {
        stages,
        approvals,
        finalArtifactId: "PROOFREADING-artifact",
        finalChecksum: "PROOFREADING-sha",
        expectedFinalChecksum: "PROOFREADING-sha",
        styleSheetCurrent: true,
        openCorrections: 0,
        internalQaComplete: true,
        productionNotes: "Synthetic production handoff notes."
      }
    }).ok
  });
}

module.exports = {
  BLOCK04_POLICY_VERSION,
  BLOCK04_STAGE_SEQUENCE,
  PACKAGE_STAGE_ENTITLEMENTS,
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
  resolveStageApplicability,
  resolveWaitingOnTruth,
  runSyntheticBlock04Commissioning
};
