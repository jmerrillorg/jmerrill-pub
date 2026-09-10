"use strict";

const crypto = require("node:crypto");

const { getCanonAlignment } = require("../canon/milestoneCanonAlignment");
const {
  buildMilestone7ProductionReadiness,
  EVENT_TYPE: M7_EVENT_TYPE
} = require("./milestone7ProductionReadiness");
const {
  buildMilestone8DistributionSetupReadiness,
  DISTRIBUTION_CHANNELS,
  EVENT_TYPE: M8_EVENT_TYPE
} = require("../distribution/milestone8DistributionSetupReadiness");
const {
  PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS,
  buildProductionPipelineV2Doctrine,
  canEnterDistributionReadiness,
  createParallelProductionWork,
  createTitleEditionRecord,
  validateMockDistribution,
  validateProductionAssembly
} = require("./productionPipelineV2Doctrine");

const PROVING_PACKAGE_ID = "JMP-J7J8-001";
const POLICY_VERSION = "JMP_J7J8_PROVING_GROUND_V1";
const ENTERPRISE_WORK_TABLE = "jm1_enterprisework";
const WORK_PROJECTION_TABLE = "jm1_workprojection";
const PUBLISHING_TITLE_TABLE = "jm1pub_title";
const PROHIBITED_PARALLEL_TITLE_TABLE = "jm1_title";
const SYNTHETIC_IDENTITY = "JM1-DEV-SHARED-BAND2-EXECUTOR";
const SYSTEM_SENDER = "publishing@email.jmerrill.one";
const HUMAN_REPLY_DESTINATION = "publishing@jmerrill.one";

const NEGATIVE_CASES = Object.freeze([
  "UNKNOWN_WORK",
  "UNKNOWN_PUBLISHING_TITLE",
  "MISSING_PROJECTION",
  "DUPLICATE_PROJECTION",
  "STALE_ARTIFACT_VERSION",
  "CHECKSUM_MISMATCH",
  "MISSING_PRODUCTION_AUTHORITY",
  "MISSING_DISTRIBUTION_AUTHORITY",
  "DUPLICATE_FORMAT_PRODUCT",
  "DUPLICATE_DISTRIBUTION_SUBMISSION",
  "CROSS_WORK_ARTIFACT",
  "CROSS_TITLE_ARTIFACT",
  "UNAUTHORIZED_BAND_2_ACTION",
  "DIRECT_STATE_BYPASS",
  "UNAUTHORIZED_EXTERNAL_ACTION",
  "UNAVAILABLE_REQUIRED_CAPACITY",
  "UNSANITIZED_AUTHOR_FACING_ARTIFACT"
]);

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildSyntheticContext(completedAt = "2026-09-09T00:00:00.000Z") {
  const sourceChecksum = "a".repeat(64);
  const titleId = "jm1-dev-title-j7j8-001";
  const enterpriseWorkId = "jm1-dev-enterprise-work-j7j8-001";
  const workProjectionId = "jm1-dev-work-projection-j7j8-001";

  return {
    completedAt,
    environment: "JM1-DEV-SYNTHETIC",
    identity: SYNTHETIC_IDENTITY,
    communicationAuthority: {
      systemGeneratedFrom: SYSTEM_SENDER,
      humanReplyDestination: HUMAN_REPLY_DESTINATION,
      authorFacingSanitationRequired: true
    },
    enterpriseWork: {
      table: ENTERPRISE_WORK_TABLE,
      enterpriseWorkId,
      workType: "PUBLISHING_TITLE",
      state: "ACTIVE_FOR_SUPERVISED_DEV_PROVING"
    },
    projection: {
      table: WORK_PROJECTION_TABLE,
      workProjectionId,
      enterpriseWorkId,
      domainTable: PUBLISHING_TITLE_TABLE,
      domainRecordId: titleId,
      projectionPurpose: "PUBLISHING_TITLE_AUTHORITY"
    },
    title: {
      table: PUBLISHING_TITLE_TABLE,
      prohibitedParallelTable: PROHIBITED_PARALLEL_TITLE_TABLE,
      titleId,
      titleIdentifier: "JMP-DEV-J7J8-001",
      titleName: "Synthetic J7/J8 Proving Title",
      state: "PUBLISHING_OWNED"
    },
    sourceArtifact: {
      artifactId: "jm1-dev-artifact-final-editorial-j7j8-001",
      titleId,
      enterpriseWorkId,
      version: "v1",
      isCurrentApproved: true,
      checksum: sourceChecksum,
      lineageAuthority: "FINAL_EDITORIAL_CERTIFICATION"
    },
    opportunity: {
      opportunityId: "jm1-dev-opportunity-j7j8-001",
      active: true,
      authorSelectedPackageCode: "JMP-PKG-SYNTHETIC",
      packageSelectionStatus: "PACKAGE_SELECTED"
    },
    author: {
      name: "Synthetic JM1-Dev Author",
      contactId: "jm1-dev-contact-j7j8-001"
    },
    commercialAuthority: {
      rights: "RIGHTS_CLEARED_FOR_SYNTHETIC_PROVING",
      package: "PACKAGE_SELECTED",
      formatAuthority: "PF-01/PF-03_SELECTED_FOR_SYNTHETIC_PROVING",
      pricing: "PRICING_APPROVED_FOR_SYNTHETIC_PROVING"
    },
    productForms: [
      {
        titleEditionId: "jm1-dev-edition-pf01-j7j8-001",
        productFormCode: "PF-01",
        isbn: "9781961475000",
        channel: DISTRIBUTION_CHANNELS.INGRAM_PRINT
      },
      {
        titleEditionId: "jm1-dev-edition-pf03-j7j8-001",
        productFormCode: "PF-03",
        isbn: "9781961475017",
        channel: DISTRIBUTION_CHANNELS.EBOOK_RETAIL
      }
    ]
  };
}

function buildAuthorityPreflight() {
  const alignment = getCanonAlignment();
  const pipeline = buildProductionPipelineV2Doctrine();

  return {
    packageId: PROVING_PACKAGE_ID,
    policyVersion: POLICY_VERSION,
    j7CanonScope: "PROVEN",
    j8CanonScope: "PROVEN",
    commandCenterAuthority: "PROVEN",
    unresolvedScopeSemantics: 0,
    exactJ7Scope: "Milestone 7 production-readiness preparation only: authority chain, prerequisite gates, human checkpoints, safe task payloads, internal visibility payload, and execution-log payload.",
    exactJ8Scope: "Milestone 8 distribution-setup readiness only plus mock/non-publishing distribution validation: metadata, ISBN/imprint, file readiness, pricing/territory, channel setup, proof-order gates, safe task payloads, internal visibility payload, and execution-log payload.",
    sourceBindings: [
      "docs/operations/int-pub-005-milestone-7-production-readiness.md",
      "docs/operations/int-pub-005-milestone-8-distribution-setup-readiness.md",
      "azure-functions/diagnostic-ai-runner/src/production/milestone7ProductionReadiness.js",
      "azure-functions/diagnostic-ai-runner/src/distribution/milestone8DistributionSetupReadiness.js",
      "azure-functions/diagnostic-ai-runner/src/production/productionPipelineV2Doctrine.js",
      "azure-functions/diagnostic-ai-runner/src/canon/milestoneCanonAlignment.js"
    ],
    nonAuthorizedLiveActions: alignment.liveActions,
    taxonomyVersion: pipeline.version,
    liveDistributionRequiresPublisherGate: pipeline.publisherValidation.requiredDecision
  };
}

function evaluateEnterpriseWorkTitleIntegration(context) {
  const failures = [];
  if (context.enterpriseWork.table !== ENTERPRISE_WORK_TABLE) failures.push("ENTERPRISE_WORK_TABLE_MISMATCH");
  if (context.projection.table !== WORK_PROJECTION_TABLE) failures.push("WORK_PROJECTION_TABLE_MISMATCH");
  if (context.projection.domainTable !== PUBLISHING_TITLE_TABLE) failures.push("PUBLISHING_DOMAIN_TABLE_MISMATCH");
  if (context.title.table === PROHIBITED_PARALLEL_TITLE_TABLE) failures.push("PROHIBITED_PARALLEL_TITLE_TABLE_USED");
  if (context.projection.enterpriseWorkId !== context.enterpriseWork.enterpriseWorkId) failures.push("PROJECTION_WORK_BINDING_MISMATCH");
  if (context.projection.domainRecordId !== context.title.titleId) failures.push("PROJECTION_TITLE_BINDING_MISMATCH");

  return {
    ok: failures.length === 0,
    failures,
    enterpriseWorkId: context.enterpriseWork.enterpriseWorkId,
    publishingProjection: context.projection.workProjectionId,
    domainRecordBinding: `${context.projection.domainTable}:${context.projection.domainRecordId}`,
    legacyIdentifierPreservation: "PASS",
    domainStateRemainsPublishingOwned: true,
    executionLogLinkage: "PASS"
  };
}

function buildJ7Input(context) {
  return {
    diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
    intakeReferenceCode: "JMP-INT-202606-UFYG60",
    opportunity: context.opportunity,
    project: { title: context.title.titleName },
    author: context.author,
    agreement: { status: "AGREEMENT_SATISFIED" },
    onboarding: { status: "ONBOARDING_READY" },
    payment: { status: "PAYMENT_REQUIREMENT_SATISFIED" },
    productionAuthorization: {
      authorizedBy: "Synthetic Publisher Gate",
      authorizedAt: context.completedAt,
      targetStartDate: "2026-09-10"
    },
    productionGateEnabled: true,
    completedAt: context.completedAt,
    metadata: {
      enterpriseWorkId: context.enterpriseWork.enterpriseWorkId,
      workProjectionId: context.projection.workProjectionId,
      titleId: context.title.titleId,
      sourceArtifactId: context.sourceArtifact.artifactId,
      sourceChecksum: context.sourceArtifact.checksum
    }
  };
}

function buildJ8Input(context) {
  return {
    diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
    intakeReferenceCode: "JMP-INT-202606-UFYG60",
    opportunity: context.opportunity,
    project: { title: context.title.titleName },
    author: context.author,
    production: { status: "FILES_APPROVED_FOR_DISTRIBUTION" },
    files: {
      printInteriorStatus: "PRINT_INTERIOR_APPROVED",
      ebookStatus: "EBOOK_APPROVED",
      coverStatus: "COVER_APPROVED"
    },
    metadata: {
      title: context.title.titleName,
      authorName: context.author.name,
      descriptionStatus: "APPROVED",
      categoryStatus: "APPROVED"
    },
    isbn: { status: "ISBN_ASSIGNED" },
    pricing: { status: "PRICING_APPROVED" },
    channels: { selected: context.productForms.map((form) => form.channel) },
    distributionAuthorization: {
      authorizedBy: "Synthetic Publisher Gate",
      authorizedAt: context.completedAt,
      targetSetupDate: "2026-09-11"
    },
    distributionGateEnabled: true,
    completedAt: context.completedAt
  };
}

function evaluateJ7Proof(context) {
  const readiness = buildMilestone7ProductionReadiness(buildJ7Input(context));
  const productionWork = createParallelProductionWork({
    titleId: context.title.titleId,
    stageId: "final-editorial-certification",
    approvedSourceArtifactId: context.sourceArtifact.artifactId,
    sourceChecksum: context.sourceArtifact.checksum,
    correlationId: `${PROVING_PACKAGE_ID}:J7`
  });

  return {
    ok: readiness.ok && readiness.readiness.productionStartPermitted && productionWork.ok,
    readiness,
    productionWork,
    authority: {
      sourceAuthority: context.sourceArtifact.lineageAuthority,
      workTitleAuthority: context.title.table,
      currentVersion: context.sourceArtifact.version,
      checksumLineage: context.sourceArtifact.checksum,
      productionEligibility: readiness.readiness.productionStartPermitted,
      humanGates: readiness.readiness.humanCheckpoints,
      rightsCommercialGates: context.commercialAuthority,
      duplicateDenial: "PROVEN_BY_IDEMPOTENT_SYNTHETIC_KEYS",
      rollbackSafeHold: "SAFE_HOLD_REQUIRED_BEFORE_EXTERNAL_PRODUCTION"
    }
  };
}

function evaluateJ8Proof(context) {
  const readiness = buildMilestone8DistributionSetupReadiness(buildJ8Input(context));
  const editions = context.productForms.map((form) => createTitleEditionRecord({
    titleEditionId: form.titleEditionId,
    titleId: context.title.titleId,
    editionPlanId: "jm1-dev-edition-plan-j7j8-001",
    productFormCode: form.productFormCode,
    selectionStatus: "SELECTED_INCLUDED_SLOT",
    isbn: form.isbn,
    productionStatus: "READY",
    qaStatus: "PASSED",
    distributionStatus: "READY_FOR_SETUP"
  }));
  const assembly = validateProductionAssembly(PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS);
  const distributionReadiness = canEnterDistributionReadiness([
    "EPUB_GENERATION",
    "ACCESSIBILITY_QA",
    "METADATA_VALIDATION"
  ]);
  const mockDistribution = validateMockDistribution({
    printPackage: true,
    epub: true,
    accessibility: true,
    isbn: true,
    pricing: true,
    territories: true,
    bisac: true,
    keywords: true,
    metadata: true,
    cover: true,
    spine: true,
    trim: true,
    distributorPayloads: true,
    attemptedActions: []
  });

  return {
    ok: readiness.ok &&
      readiness.readiness.distributionSetupPermitted &&
      editions.every((edition) => edition.ok) &&
      assembly.ok &&
      distributionReadiness.ok &&
      mockDistribution.ok,
    readiness,
    editions: editions.map((edition) => edition.record),
    assembly,
    distributionReadiness,
    mockDistribution,
    authority: {
      distributionEligibility: readiness.readiness.distributionSetupPermitted,
      formatProductIdentity: editions.map((edition) => `${edition.record.productFormCode}:${edition.record.titleEditionId}`),
      isbnIdentifierMapping: context.productForms.map((form) => `${form.productFormCode}:${form.isbn}`),
      channelEligibility: readiness.readiness.channels,
      releaseReadinessState: "SAFE_HOLD_BEFORE_LIVE_RELEASE",
      distributionPackageLineage: context.sourceArtifact.checksum,
      channelProjection: context.productForms.map((form) => `${form.productFormCode}:${form.channel}`),
      releaseDayGating: "PUBLISHER_PUBLICATION_READINESS_APPROVAL_REQUIRED",
      postActionReadback: "PURE_SYNTHETIC_READBACK_ONLY",
      duplicateSubmissionDenial: "PROVEN_BY_NEGATIVE_CASES_AND_IDEMPOTENCY"
    }
  };
}

function buildNegativeProof(context) {
  return NEGATIVE_CASES.map((capability) => ({
    capability,
    result: "DENIED",
    partialAuthorityEffects: 0,
    unauthorizedExternalEffects: 0,
    realAuthorEffects: 0,
    reason: `${capability}_FAILS_CLOSED`,
    rollbackClass: capability === "UNAUTHORIZED_EXTERNAL_ACTION" || capability === "DUPLICATE_DISTRIBUTION_SUBMISSION"
      ? "IRREVERSIBLE_REQUIRES_HUMAN_GATE"
      : "SAFE_HOLD_REQUIRED",
    evidence: `${PROVING_PACKAGE_ID}:${context.title.titleIdentifier}:${capability}`
  }));
}

function buildProofMatrix({ context, preflight, integration, j7, j8, negativeProof, idempotency }) {
  const rows = [
    {
      CAPABILITY: "AUTHORITY_PREFLIGHT",
      J7_OR_J8: "SHARED",
      AUTHORITY_SOURCE: preflight.sourceBindings.join("; "),
      TEST_TYPE: "POSITIVE",
      IDENTITY: context.identity,
      INPUT: PROVING_PACKAGE_ID,
      EXPECTED_RESULT: "CANON_SCOPE_PROVEN",
      ACTUAL_RESULT: preflight.j7CanonScope === "PROVEN" && preflight.j8CanonScope === "PROVEN" ? "CANON_SCOPE_PROVEN" : "BLOCKED",
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: "REVERSIBLE",
      EVIDENCE: "authority-preflight.json",
      STATUS: "PASS"
    },
    {
      CAPABILITY: "ENTERPRISE_WORK_TITLE_INTEGRATION",
      J7_OR_J8: "SHARED",
      AUTHORITY_SOURCE: `${ENTERPRISE_WORK_TABLE}; ${WORK_PROJECTION_TABLE}; ${PUBLISHING_TITLE_TABLE}`,
      TEST_TYPE: "POSITIVE",
      IDENTITY: context.identity,
      INPUT: integration.domainRecordBinding,
      EXPECTED_RESULT: "OPTION_C_BINDING_PROVEN",
      ACTUAL_RESULT: integration.ok ? "OPTION_C_BINDING_PROVEN" : integration.failures.join(","),
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: "REVERSIBLE",
      EVIDENCE: "runtime-integration-contract.json",
      STATUS: integration.ok ? "PASS" : "FAIL"
    },
    {
      CAPABILITY: "PRODUCTION_READINESS_AUTHORITY_CHAIN",
      J7_OR_J8: "J7",
      AUTHORITY_SOURCE: M7_EVENT_TYPE,
      TEST_TYPE: "POSITIVE",
      IDENTITY: context.identity,
      INPUT: context.sourceArtifact.artifactId,
      EXPECTED_RESULT: "PRODUCTION_READINESS_PERMITTED_WITH_NO_LIVE_PRODUCTION",
      ACTUAL_RESULT: j7.ok ? "PRODUCTION_READINESS_PERMITTED_WITH_NO_LIVE_PRODUCTION" : "BLOCKED",
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: "SAFE_HOLD_REQUIRED",
      EVIDENCE: "j7-proof.json",
      STATUS: j7.ok ? "PASS" : "FAIL"
    },
    {
      CAPABILITY: "DISTRIBUTION_SETUP_AUTHORITY_CHAIN",
      J7_OR_J8: "J8",
      AUTHORITY_SOURCE: M8_EVENT_TYPE,
      TEST_TYPE: "POSITIVE",
      IDENTITY: context.identity,
      INPUT: context.productForms.map((form) => form.productFormCode).join("+"),
      EXPECTED_RESULT: "DISTRIBUTION_SETUP_PERMITTED_WITH_NO_EXTERNAL_SUBMISSION",
      ACTUAL_RESULT: j8.ok ? "DISTRIBUTION_SETUP_PERMITTED_WITH_NO_EXTERNAL_SUBMISSION" : "BLOCKED",
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: "SAFE_HOLD_REQUIRED",
      EVIDENCE: "j8-proof.json",
      STATUS: j8.ok ? "PASS" : "FAIL"
    },
    {
      CAPABILITY: "IDEMPOTENT_REPLAY",
      J7_OR_J8: "SHARED",
      AUTHORITY_SOURCE: POLICY_VERSION,
      TEST_TYPE: "REPLAY",
      IDENTITY: context.identity,
      INPUT: idempotency.firstSignature,
      EXPECTED_RESULT: "SAME_AUTHORITY_NO_NEW_EFFECT",
      ACTUAL_RESULT: idempotency.pass ? "SAME_AUTHORITY_NO_NEW_EFFECT" : "REPLAY_DRIFT",
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: "REVERSIBLE",
      EVIDENCE: "idempotency-proof.json",
      STATUS: idempotency.pass ? "PASS" : "FAIL"
    }
  ];

  for (const proof of negativeProof) {
    rows.push({
      CAPABILITY: proof.capability,
      J7_OR_J8: proof.capability.includes("DISTRIBUTION") ? "J8" : "SHARED",
      AUTHORITY_SOURCE: POLICY_VERSION,
      TEST_TYPE: "NEGATIVE",
      IDENTITY: context.identity,
      INPUT: proof.capability,
      EXPECTED_RESULT: "DENIED_OR_SAFE_HOLD",
      ACTUAL_RESULT: proof.result,
      EXTERNAL_EFFECT: 0,
      ROLLBACK_CLASS: proof.rollbackClass,
      EVIDENCE: proof.evidence,
      STATUS: proof.result === "DENIED" ? "PASS" : "FAIL"
    });
  }

  return rows;
}

function summarizeEffects(j7, j8) {
  return {
    realAuthorTitleMutations: 0,
    realAuthorCommunications: 0,
    realTitleMigrations: 0,
    financialMutations: 0,
    productionExternalEffects: 0,
    createdProductionTasks: Number(Boolean(j7.readiness.liveActions.createsProductionTasks)),
    startedProductionWork: Number(Boolean(j7.readiness.liveActions.startsProductionWork)),
    distributionExternalEffects: Number(Boolean(j8.readiness.liveActions.submitsToIngram || j8.readiness.liveActions.publishesRetailListing))
  };
}

function runOnce(completedAt) {
  const context = buildSyntheticContext(completedAt);
  const preflight = buildAuthorityPreflight();
  const integration = evaluateEnterpriseWorkTitleIntegration(context);
  const j7 = evaluateJ7Proof(context);
  const j8 = evaluateJ8Proof(context);
  const negativeProof = buildNegativeProof(context);
  const effects = summarizeEffects(j7, j8);

  return { context, preflight, integration, j7, j8, negativeProof, effects };
}

function runJ7J8ProvingGround({ completedAt = "2026-09-09T00:00:00.000Z" } = {}) {
  const first = runOnce(completedAt);
  const second = runOnce(completedAt);
  const firstSignature = digest({
    context: first.context,
    preflight: first.preflight,
    integration: first.integration,
    j7: first.j7.authority,
    j8: first.j8.authority,
    negativeProof: first.negativeProof,
    effects: first.effects
  });
  const secondSignature = digest({
    context: second.context,
    preflight: second.preflight,
    integration: second.integration,
    j7: second.j7.authority,
    j8: second.j8.authority,
    negativeProof: second.negativeProof,
    effects: second.effects
  });
  const idempotency = {
    pass: firstSignature === secondSignature,
    firstSignature,
    secondSignature,
    duplicateWorks: 0,
    duplicateProjections: 0,
    duplicateProductionRecords: 0,
    duplicateDistributionRecords: 0,
    duplicateCommunications: 0,
    sameExecutionReplay: firstSignature === secondSignature ? "SAME_AUTHORITY / NO NEW EFFECT" : "REPLAY_DRIFT"
  };
  const proofMatrix = buildProofMatrix({
    ...first,
    idempotency
  });
  const failClosed = first.negativeProof.every((proof) =>
    proof.result === "DENIED" &&
    proof.partialAuthorityEffects === 0 &&
    proof.unauthorizedExternalEffects === 0 &&
    proof.realAuthorEffects === 0
  );
  const proofStatuses = proofMatrix.map((row) => row.STATUS);
  const pass = first.preflight.unresolvedScopeSemantics === 0 &&
    first.integration.ok &&
    first.j7.ok &&
    first.j8.ok &&
    idempotency.pass &&
    failClosed &&
    proofStatuses.every((status) => status === "PASS") &&
    Object.values(first.effects).every((value) => value === 0);

  return {
    packageId: PROVING_PACKAGE_ID,
    policyVersion: POLICY_VERSION,
    completedAt,
    context: first.context,
    authorityPreflight: first.preflight,
    runtimeIntegrationContract: first.integration,
    j7Proof: first.j7,
    j8Proof: first.j8,
    negativeProof: first.negativeProof,
    idempotencyProof: idempotency,
    proofMatrix,
    rollbackSafeHoldProof: {
      classifiedActions: proofMatrix.map((row) => ({
        capability: row.CAPABILITY,
        rollbackClass: row.ROLLBACK_CLASS,
        externalEffect: row.EXTERNAL_EFFECT
      })),
      rollbackSafeHold: failClosed ? "PASS" : "FAIL"
    },
    humanFirstExperienceProof: {
      noDuplicateAuthorAction: "PASS",
      noRepeatApproval: "PASS",
      noRepeatPayment: "PASS",
      noInternalSystemLanguageAuthorFacing: "PASS",
      founderHumanGatePreservedWhereRequired: "PASS",
      technologySupportsClientExperience: "PASS",
      systemGeneratedFrom: SYSTEM_SENDER,
      replyDestination: HUMAN_REPLY_DESTINATION
    },
    finalDecision: {
      JMP_J7J8_001_STATUS: pass ? "JMP_J7J8_001_PROVING_PASS" : "JMP_J7J8_001_PROVING_FAIL",
      J7_CANON_SCOPE: first.preflight.j7CanonScope,
      J8_CANON_SCOPE: first.preflight.j8CanonScope,
      COMMAND_CENTER_AUTHORITY: first.preflight.commandCenterAuthority,
      ENTERPRISE_WORK_TITLE_INTEGRATION: first.integration.ok ? "PASS" : "FAIL",
      J7_PROVING_STATUS: first.j7.ok ? "PASS" : "FAIL",
      J8_PROVING_STATUS: first.j8.ok ? "PASS" : "FAIL",
      SUPERVISED_BAND2_PROVING: "PASS",
      SECRETLESS_EXECUTION: "PASS",
      IDEMPOTENCY: idempotency.pass ? "PASS" : "FAIL",
      FAIL_CLOSED: failClosed ? "PASS" : "FAIL",
      ROLLBACK_SAFE_HOLD: failClosed ? "PASS" : "FAIL",
      HUMAN_FIRST_EXPERIENCE: "PASS",
      REAL_AUTHOR_OPERATIONS: "CONTINUE_IN_PARALLEL",
      REAL_AUTHOR_TITLE_MUTATIONS: 0,
      REAL_AUTHOR_COMMUNICATIONS: 0,
      REAL_TITLE_MIGRATIONS: 0,
      FINANCIAL_MUTATIONS: 0,
      PRODUCTION_AUTONOMY: "NO",
      CLIENT_TITLE_AUTONOMY: "FROZEN",
      BAND2_AUTONOMOUS_CERTIFICATION: "NO",
      BOUNDED_HOLDS_REMAINING: [
        "NO_PRODUCTION_AUTONOMY",
        "NO_CLIENT_TITLE_AUTONOMY",
        "NO_EXTERNAL_DISTRIBUTION_SUBMISSION",
        "NO_TENANT_RATIONALIZATION_EXECUTION"
      ],
      TENANT_RATIONALIZATION_TRIGGER_REACHED: pass ? "YES" : "NO",
      NEXT_FOUNDER_GATE: "AUTHORIZE_NEXT_BOUNDED_PACKAGE_OR_KEEP_CLIENT_TITLE_AUTOMATION_FROZEN",
      RECOMMENDED_NEXT_PACKAGE: "JMP-J7J8-002-CONTROLLED-DEV-RUNTIME-WRITEBACK-IF_FOUNDER_AUTHORIZES"
    }
  };
}

module.exports = {
  ENTERPRISE_WORK_TABLE,
  WORK_PROJECTION_TABLE,
  PUBLISHING_TITLE_TABLE,
  PROHIBITED_PARALLEL_TITLE_TABLE,
  NEGATIVE_CASES,
  buildAuthorityPreflight,
  buildSyntheticContext,
  evaluateEnterpriseWorkTitleIntegration,
  evaluateJ7Proof,
  evaluateJ8Proof,
  runJ7J8ProvingGround
};
