"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PRODUCTION_TAXONOMY,
  TIMING_GOVERNANCE,
  AUTHOR_REVIEW_PACKAGE,
  PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS,
  MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS,
  PRODUCT_FORM_CODES,
  PRODUCT_FORM_REGISTRY,
  ILL_PROGRAM_DEFINITION,
  buildProductionPipelineV2Doctrine,
  createTitleEditionRecord,
  resolvePackageSlotEligibility,
  buildStandardEbookEdition,
  resolveAudiobookCommercials,
  resolveLargePrintCommercials,
  evaluateComplexAccessibilityEdition,
  validateProvisionalProductFormExposure,
  validateInteractiveScopeCap,
  deriveProductionObligations,
  validateEditionAwareAssembly,
  resolveReleaseSetPolicy,
  reconcileLegacyCatalogOverlap,
  createParallelProductionWork,
  validateProductionAssembly,
  canEnterDistributionReadiness,
  validateEpubWorkflow,
  buildProductionReviewPackageManifest,
  validateMockDistribution,
  buildPublisherValidationChecklist,
  auditIllustrationPricingAuthority,
  validateIllustrationCommercialBoundary,
  validateIllustrationScope,
  validateIllustrationRights,
  requiresIllustrationStyleGuide,
  mapIllustrationAssetToEditions,
  validateProductionAssemblyIllustrations,
  reconcileIllustrationLegacyOffering,
  buildEditionReadiness
} = require("../src/production/productionPipelineV2Doctrine");
const {
  auditBlock05Requirements,
  buildBlock05FinalCertificationProbe,
  buildBlock06HandoffPackage,
  createProductionMaster,
  createProductionScopeLock,
  evaluateCrossFormatSynchronization,
  evaluateFinalProductionCertification,
  evaluateProductionEntryGate,
  evaluateWorkstream,
  runBypassTests,
  runFinalCertificationNegativeProbes,
  runFinalLiveWorkstreamCertification,
  runSyntheticCommissioningMatrix,
  validateAccessibilityEvidence,
  validateAudioProduction,
  validateEbookProduction,
  validateArtifactBoundApproval,
  validateIdentifierAuthority
} = require("../src/production/block05ProductionCommissioning");
const {
  auditBlock06Requirements,
  buildBlock06FinalCertificationProbe,
  buildBlock07Handoff,
  completeSyntheticRelease,
  createReleaseManifest,
  evaluateAuthorReleaseConfirmation,
  evaluateBlock06EntryGate,
  evaluatePostFreezeChange,
  evaluatePublisherReleaseAuthorization,
  freezeReleasePackage,
  routeReadinessRemediation,
  runBlock06BypassTests,
  runBlock06SyntheticCommissioningMatrix,
  runFinalBlock06Commissioning,
  runFinalReleaseReadinessCertification,
  validateAssetMetadataConsistency,
  validateChannelRoutes,
  validateFormatEditionReconciliation,
  validateIdentifierConsistency,
  validatePublicationDate,
  validateRetailEconomics,
  validateRightsTerritories
} = require("../src/release/releaseReadinessCommissioning");
const {
  CHANNEL_STATES,
  auditBlock07Requirements,
  buildBlock07FinalCertificationProbe,
  buildBlock08Handoff,
  buildBlock09Handoff,
  certifyDistribution,
  completeSyntheticDistribution,
  createChannelDistributionInstance,
  derivePublicationState,
  evaluateDistributionWatchdog,
  evaluatePublicationDate,
  openPublicationIncident,
  registerCanonicalLiveUrl,
  requestEmergencyTakedown,
  routeDistributionRemediation,
  runBlock07BypassTests,
  runBlock07SyntheticCommissioningMatrix,
  runFinalBlock07Commissioning,
  submitDistributionInstance,
  validateBlock07Entry,
  validateLiveListing,
  verifyLiveState
} = require("../src/distribution/block07DistributionCommissioning");
const {
  auditBlock08Requirements,
  buildBlock08FinalCertificationProbe,
  buildBlock09MarketingHandoff,
  buildLaunchPerformanceReview,
  captureCampaignMetrics,
  certifyLaunchCycle,
  completeSyntheticMarketingCampaign,
  createMarketingScopeLock,
  createTitleMarketingCampaign,
  evaluateAttribution,
  evaluateMarketingWatchdog,
  registerMarketingAsset,
  resolveCtaAuthority,
  resolveMarketingEntitlement,
  runBlock08BypassTests,
  runBlock08SyntheticCommissioningMatrix,
  runFinalBlock08Commissioning,
  validateAuthorMarketingApproval,
  validateBlock08Entry,
  validateMarketingConsent,
  validatePreorderMarketing,
  validateReviewArc,
  validateReviewQuoteUsage,
  validateSocialExecution
} = require("../src/marketing/block08LaunchMarketingCommissioning");
const {
  auditBlock09Requirements,
  buildAuthorWorkspacePublishedTitleHome,
  buildBlock09FinalCertificationProbe,
  buildPublishedTitleBaseline,
  buildPublisherOperatingCenterBacklistSurface,
  buildRecurringClocks,
  buildWorkEditionFormatHierarchy,
  calculateRoyalty,
  classifyPostPublicationChange,
  createAnnualDistributionFeeObligations,
  createRoyaltyPayable,
  createRoyaltyPeriod,
  deriveTitleHealth,
  evaluateArchiveReadiness,
  evaluateBlock09Watchdog,
  evaluateContractMilestone,
  fulfillAuthorCopies,
  generateRoyaltyStatement,
  ingestSalesSourceReport,
  mergeEvergreenMarketingHandoff,
  processRoyaltyPaymentAttempt,
  reconcileRemittanceAndCash,
  resolveRoyaltyRuleVersion,
  routePublishedAuthorSupport,
  runBlock09BypassTests,
  runBlock09SyntheticCommissioningMatrix,
  runFinalBlock09Commissioning,
  applyLateAdjustment,
  separateTerminalStates,
  updateAuthorRelationshipLoop,
  validateBlock09Activation
} = require("../src/titleManagement/block09TitleManagementCommissioning");

describe("JM1 Production Pipeline v2.0 doctrine", () => {
  test("starts interior layout and cover design in parallel after proofreading approval", () => {
    const doctrine = buildProductionPipelineV2Doctrine();

    assert.equal(doctrine.trigger, "PROOFREADING_APPROVED");
    assert.equal(doctrine.decisions.coverBeginsAfterProofreadingApproval, true);
    assert.equal(doctrine.decisions.interiorAndCoverExecuteInParallel, true);
    assert.deepEqual(doctrine.branches.map((branch) => branch.branch).sort(), ["COVER", "INTERIOR"]);
    assert.equal(doctrine.branches.every((branch) => branch.startsAt === "PRODUCTION_START"), true);
  });

  test("uses one unified author-facing Production Review Package", () => {
    const doctrine = buildProductionPipelineV2Doctrine();

    assert.equal(doctrine.convergence.label, "Production Review Package");
    assert.equal(doctrine.convergence, AUTHOR_REVIEW_PACKAGE);
    assert.equal(doctrine.convergence.replaces.includes("Interior Review"), true);
    assert.equal(doctrine.convergence.replaces.includes("Cover Review"), true);
    assert.equal(doctrine.convergence.requiredArtifacts.includes("INTERIOR_PROOF_PDF"), true);
    assert.equal(doctrine.convergence.requiredArtifacts.includes("COVER_PROOF"), true);
  });

  test("requires EPUB, accessibility, and metadata before distribution readiness", () => {
    assert.deepEqual(canEnterDistributionReadiness(["ACCESSIBILITY_QA", "METADATA_VALIDATION"]), {
      ok: false,
      blockers: ["EPUB_GENERATION_REQUIRED"]
    });
    assert.deepEqual(canEnterDistributionReadiness(["EPUB_GENERATION", "ACCESSIBILITY_QA", "METADATA_VALIDATION"]), {
      ok: true,
      blockers: []
    });
  });

  test("fails Production Assembly closed until all required artifacts exist", () => {
    const missingOne = PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS.filter((artifact) => artifact !== "EPUB");

    const blocked = validateProductionAssembly(missingOne);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.event, "PRODUCTION_ASSEMBLY_BLOCKED");
    assert.equal(blocked.missing.length, 1);
    assert.equal(blocked.missing[0].missingArtifact, "EPUB");
    assert.equal(blocked.missing[0].owner, "JM1 Automation");
    assert.equal(blocked.missing[0].blockingReason.includes("required before distribution"), true);
    assert.deepEqual(validateProductionAssembly(PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS), {
      ok: true,
      missing: [],
      event: "PRODUCTION_ASSEMBLY_READY"
    });
  });

  test("keeps mock distribution non-publishing and non-financial", () => {
    const doctrine = buildProductionPipelineV2Doctrine();

    assert.deepEqual(doctrine.mockDistribution.forbiddenActions, MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS);
    assert.equal(doctrine.mockDistribution.forbiddenActions.includes("PUBLISH"), true);
    assert.equal(doctrine.mockDistribution.forbiddenActions.includes("CREATE_FINANCIAL_POSTING"), true);
  });

  test("classifies every v2 taxonomy entry with timing governance", () => {
    assert.deepEqual(Object.keys(TIMING_GOVERNANCE).sort(), [...PRODUCTION_TAXONOMY].sort());
    assert.equal(TIMING_GOVERNANCE.PRODUCTION_REVIEW_PACKAGE, "TIME_BASED_AUTHOR_RELEASE_CADENCE");
    assert.equal(TIMING_GOVERNANCE.AUTHOR_PRODUCTION_REVIEW, "AUTHOR_RESPONSE_CLOCK");
    assert.equal(TIMING_GOVERNANCE.PUBLISHER_VALIDATION, "PUBLISHER_DECISION_HOLD");
  });

  test("preserves active live-release path and historical compatibility", () => {
    const doctrine = buildProductionPipelineV2Doctrine();

    assert.equal(doctrine.activeTitleMigration["The Intentional Leader"].includes("Continue current live-release certification"), true);
    assert.equal(doctrine.backwardCompatibility.rewriteHistoricalStages, false);
    assert.equal(doctrine.backwardCompatibility.supportedAliases.PRODUCTION_PROOF, "DISTRIBUTION_READINESS");
  });

  test("creates independent interior and cover work items from proofreading approval", () => {
    const result = createParallelProductionWork({
      titleId: "title-1",
      stageId: "proofreading-stage",
      approvedSourceArtifactId: "artifact-1",
      sourceChecksum: "abc123",
      correlationId: "corr-1"
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.workItems.map((item) => item.workstream).sort(), ["COVER_DESIGN", "INTERIOR_LAYOUT"]);
    assert.equal(result.workItems.every((item) => item.retryable), true);
    assert.equal(result.workItems.every((item) => item.dependsOn.length === 0), true);
    assert.deepEqual(result.events.map((event) => event.eventType), [
      "PRODUCTION_START_CREATED",
      "INTERIOR_LAYOUT_WORK_CREATED",
      "COVER_DESIGN_WORK_CREATED"
    ]);
  });

  test("blocks parallel production work creation when governed source inputs are missing", () => {
    const result = createParallelProductionWork({
      titleId: "title-1",
      stageId: "proofreading-stage",
      approvedSourceArtifactId: "",
      sourceChecksum: ""
    });

    assert.equal(result.ok, false);
    assert.equal(result.event, "PRODUCTION_START_BLOCKED");
    assert.deepEqual(result.missing, ["approvedSourceArtifactId", "sourceChecksum"]);
  });

  test("validates EPUB, accessibility, and metadata as first-class workflow evidence", () => {
    const passed = validateEpubWorkflow({
      epubArtifact: {
        structureValid: true,
        navigationValid: true,
        tableOfContentsValid: true,
        metadataValid: true
      },
      accessibilityEvidence: { taggingValid: true },
      metadataEvidence: { complete: true }
    });

    assert.equal(passed.ok, true);
    assert.deepEqual(passed.events, ["EPUB_GENERATED", "EPUB_VALIDATED", "ACCESSIBILITY_VALIDATED", "METADATA_VALIDATED"]);

    const failed = validateEpubWorkflow({
      epubArtifact: { structureValid: true, navigationValid: false, tableOfContentsValid: true, metadataValid: true },
      accessibilityEvidence: { taggingValid: false },
      metadataEvidence: { complete: false }
    });

    assert.equal(failed.ok, false);
    assert.equal(failed.failures.includes("EPUB_NAVIGATION_INVALID"), true);
    assert.equal(failed.failures.includes("ACCESSIBILITY_TAGGING_INVALID"), true);
    assert.equal(failed.failures.includes("METADATA_INCOMPLETE"), true);
  });

  test("requires one combined production review package manifest", () => {
    const result = buildProductionReviewPackageManifest([
      { role: "INTERIOR_PROOF_PDF" },
      { role: "COVER_PROOF" },
      { role: "PRODUCTION_NOTES" },
      { role: "REVIEW_INSTRUCTIONS" },
      { role: "PUBLISHER_COMMUNICATION" }
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.packageType, "PRODUCTION_REVIEW_PACKAGE");
    assert.equal(result.separateInteriorReviewAllowed, false);
    assert.equal(result.separateCoverReviewAllowed, false);
  });

  test("validates mock distribution without live-publishing side effects", () => {
    const good = validateMockDistribution({
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

    assert.equal(good.ok, true);
    assert.equal(good.event, "DISTRIBUTOR_VALIDATION_PASSED");

    const unsafe = validateMockDistribution({ attemptedActions: ["PUBLISH", "CREATE_FINANCIAL_POSTING"] });
    assert.equal(unsafe.ok, false);
    assert.equal(unsafe.event, "DISTRIBUTOR_VALIDATION_FAILED");
    assert.deepEqual(unsafe.forbiddenActionsDetected, ["PUBLISH", "CREATE_FINANCIAL_POSTING"]);
  });

  test("exposes Publisher Validation as the final gate before live distribution", () => {
    const checklist = buildPublisherValidationChecklist({
      interiorApproved: true,
      coverApproved: true,
      epubApproved: true,
      accessibilityApproved: true,
      metadataComplete: true,
      pricingApproved: true,
      bisacApproved: true,
      keywordsApproved: true,
      mockDistributionPassed: true,
      productionPackageFrozen: true,
      publicationDateApproved: true
    });

    assert.equal(checklist.ok, true);
    assert.equal(checklist.availableDecision, "LIVE_DISTRIBUTION_APPROVED");
    assert.equal(checklist.checks.length, 11);
  });

  test("tracks title edition readiness independently by product form", () => {
    const readiness = buildEditionReadiness({
      "PF-03": {
        productionStatus: "COMPLETE",
        qaStatus: "PASSED",
        readiness: "READY",
        distributionEligibility: "ELIGIBLE"
      },
      "PF-04": {
        productionStatus: "NOT_REQUIRED",
        qaStatus: "NOT_APPLICABLE",
        readiness: "NOT_REQUIRED",
        distributionEligibility: "NOT_ELIGIBLE"
      }
    });

    assert.equal(readiness.length, PRODUCT_FORM_CODES.length);
    assert.equal(readiness.find((edition) => edition.productFormCode === "PF-03").distributionEligibility, "ELIGIBLE");
    assert.equal(readiness.find((edition) => edition.productFormCode === "PF-04").blocksOtherEditions, false);
  });

  test("registers PF-01 through PF-08 as the only governed product form families", () => {
    assert.deepEqual(PRODUCT_FORM_CODES, ["PF-01", "PF-02", "PF-03", "PF-04", "PF-05", "PF-06", "PF-07", "PF-08"]);
    assert.equal(PRODUCT_FORM_REGISTRY["PF-03"].canonicalName, "Standard Ebook");
    assert.equal(PRODUCT_FORM_REGISTRY["PF-06"].canonicalName, "Complex-Content Accessibility Edition");
  });

  test("creates PF-03 as one born-accessible ebook edition across retailer channels", () => {
    const result = buildStandardEbookEdition({
      titleId: "title-ebook",
      editionPlanId: "plan-1",
      isbn: "978-1-961475-00-0",
      retailerProducts: [
        { distributor: "Amazon", retailerProductIdType: "ASIN", retailerProductId: "B000000", status: "ACTIVE" },
        { distributor: "Apple Books", retailerProductIdType: "APPLE_ID", retailerProductId: "123", status: "ACTIVE" }
      ]
    });

    assert.equal(result.ok, true);
    assert.equal(result.editionCount, 1);
    assert.equal(result.isbnCount, 1);
    assert.equal(result.retailerEditionRecordsCreated, 0);
    assert.equal(result.accessibilityCreatesSeparateEdition, false);
    assert.equal(result.accessibilityConsumesPackageSlot, false);
  });

  test("keeps PF-04 narration methods as attributes and never package slots", () => {
    const ai = resolveAudiobookCommercials({ narrationMethod: "AI", packageName: "Premier" });
    const human = resolveAudiobookCommercials({ narrationMethod: "HUMAN_SINGLE_VOICE", packageName: "Premier" });

    assert.equal(ai.ok, true);
    assert.equal(ai.consumesPackageSlot, false);
    assert.equal(human.premierSwap.creditOrDiscountApplies, false);
    assert.equal(human.pricing.fixedFinalSalePriceAllowed, false);
    assert.equal(resolvePackageSlotEligibility("PF-04").slotEligible, false);
  });

  test("keeps PF-05 complexity as an attribute with premium pricing", () => {
    const standard = resolveLargePrintCommercials({ complexity: "STANDARD" });
    const complexInSlot = resolveLargePrintCommercials({ complexity: "COMPLEX" });
    const complexAddOn = resolveLargePrintCommercials({ complexity: "COMPLEX", selectedBeyondSlot: true });

    assert.equal(standard.productFormCount, 1);
    assert.equal(standard.price, 350);
    assert.equal(complexInSlot.price, 250);
    assert.equal(complexAddOn.price, 600);
    assert.equal(complexInSlot.complexityCreatesProductForm, false);
  });

  test("defines PF-06 as complex-content remediation without implying PF-03 is inaccessible", () => {
    const evaluation = evaluateComplexAccessibilityEdition({
      triggerConditions: ["COMPLEX_TABLES", "EXTENDED_IMAGE_DESCRIPTIONS"]
    });

    assert.equal(evaluation.required, true);
    assert.equal(evaluation.pf03RemainsAccessibleByDefault, true);
    assert.equal(evaluation.purpose, "COMPLEX_CONTENT_REMEDIATION");
    assert.equal(evaluation.price, 650);
  });

  test("keeps PF-07 non-public and PF-08 inactive without scope cap", () => {
    const pf07 = validateProvisionalProductFormExposure("PF-07", {
      public: false,
      sellable: false,
      inquiryOnly: false,
      authorSelection: false,
      publicPricing: false,
      catalogMerchandising: false
    });
    const pf08 = validateInteractiveScopeCap({ scopeCapApproved: false });

    assert.equal(pf07.ok, true);
    assert.equal(pf07.status, "PROVISIONAL_NON_PUBLIC");
    assert.equal(pf08.ok, false);
    assert.equal(pf08.blocker, "CUSTOM_SOW_REQUIRED");
  });

  test("release models and retailer IDs do not create product forms", () => {
    const edition = createTitleEditionRecord({
      titleEditionId: "edition-1",
      titleId: "title-1",
      editionPlanId: "plan-1",
      productFormCode: "PF-03",
      releaseModel: "SERIALIZED_OR_EPISODIC",
      productionAttributes: { retailerProducts: [{ distributor: "Kobo", retailerProductId: "kobo-1" }] }
    });

    assert.equal(edition.ok, true);
    assert.equal(edition.record.productFormCode, "PF-03");
    assert.equal(PRODUCT_FORM_CODES.includes(edition.record.releaseModel), false);
  });

  test("derives selected edition obligations and ignores unselected editions", () => {
    const selectedPaperback = createTitleEditionRecord({
      titleEditionId: "pf01",
      titleId: "title-1",
      editionPlanId: "plan-1",
      productFormCode: "PF-01",
      selectionStatus: "SELECTED_INCLUDED_SLOT"
    }).record;
    const unselectedHardcover = createTitleEditionRecord({
      titleEditionId: "pf02",
      titleId: "title-1",
      editionPlanId: "plan-1",
      productFormCode: "PF-02",
      selectionStatus: "OPTIONAL_NOT_SELECTED"
    }).record;
    const obligations = deriveProductionObligations([selectedPaperback, unselectedHardcover]);
    const assembly = validateEditionAwareAssembly([selectedPaperback, unselectedHardcover]);

    assert.equal(obligations.selectedEditionCount, 1);
    assert.equal(obligations.obligations.includes("PAPERBACK_FULL_WRAP_COVER"), true);
    assert.equal(obligations.obligations.includes("HARDCOVER_SPECIFIC_COVER"), false);
    assert.equal(assembly.results.find((result) => result.productFormCode === "PF-02").status, "UNSELECTED_EDITION_DOES_NOT_BLOCK");
  });

  test("all-selected-editions release policy blocks when a selected edition is not ready", () => {
    const ready = { productFormCode: "PF-01", selectionStatus: "SELECTED_READY", productionStatus: "READY", qaStatus: "PASSED" };
    const blocked = { productFormCode: "PF-03", selectionStatus: "SELECTED_INCLUDED_SLOT", productionStatus: "NOT_READY", qaStatus: "PASSED" };
    const result = resolveReleaseSetPolicy([ready, blocked]);

    assert.equal(result.ok, false);
    assert.deepEqual(result.blockedProductForms, ["PF-03"]);
  });

  test("surfaces legacy catalog overlaps without creating duplicate SKUs", () => {
    const dyslexia = reconcileLegacyCatalogOverlap("Dyslexia-Friendly Formatting — Coming Soon");
    const interactive = reconcileLegacyCatalogOverlap("Interactive eBook Production — Coming Soon");

    assert.equal(dyslexia.JackieDecisionRequired, true);
    assert.equal(interactive.canonicalMapping, "PF-08");
    assert.equal(interactive.recommendedDisposition, "PRESERVE_HISTORY_PREVENT_DUPLICATE_ACTIVE_SKU");
  });

  test("registers ILL as a non-ISBN production program rather than a product form", () => {
    assert.equal(ILL_PROGRAM_DEFINITION.programFamilyCode, "ILL");
    assert.equal(ILL_PROGRAM_DEFINITION.isbnBearing, false);
    assert.equal(ILL_PROGRAM_DEFINITION.createsTitleEdition, false);
    assert.equal(ILL_PROGRAM_DEFINITION.technicalValidationStatus, "PASSED");
    assert.equal(ILL_PROGRAM_DEFINITION.schemaStatus, "CODE_OR_DOCUMENT_MODEL_ONLY");
    assert.equal(ILL_PROGRAM_DEFINITION.pricingStatus, "NOT_APPROVED");
    assert.equal(ILL_PROGRAM_DEFINITION.runtimeCommissioningStatus, "NOT_COMMISSIONED_FOR_LIVE_CLIENT");
    assert.equal(ILL_PROGRAM_DEFINITION.commercialAvailability, "NOT_ACTIVE");
    assert.equal(ILL_PROGRAM_DEFINITION.publicStatus, "PROHIBITED");
    assert.equal(ILL_PROGRAM_DEFINITION.controlledTitleProofStatus, "NOT_COMPLETED");
    assert.equal(ILL_PROGRAM_DEFINITION.canonStatus, "CANON_CANDIDATE");
    assert.equal(PRODUCT_FORM_CODES.includes("ILL"), false);
  });

  test("neutralizes unapproved ILL pricing values while preserving audit history", () => {
    const audit = auditIllustrationPricingAuthority();
    const boundary = validateIllustrationCommercialBoundary();

    assert.equal(audit.length, 5);
    assert.equal(audit.find((record) => record.record === "JMP-ILL-AI-STD").configuredAmount, "PENDING_JACKIE_UNIT_PRICE");
    assert.equal(audit.find((record) => record.record === "JMP-ILL-AI-STD").formerConfiguredAmount, 75);
    assert.equal(audit.find((record) => record.record === "JMP-ILL-AI-STD").formerAmountSource, "NON_GOVERNING_REFERENCE_NOT_FOR_QUOTE_NOT_FOR_INVOICE_NOT_FOR_PUBLICATION");
    assert.equal(audit.every((record) => record.publicExposure === "PROHIBITED"), true);
    assert.equal(audit.every((record) => record.commercialStatus === "NOT_ACTIVE"), true);
    assert.equal(boundary.ok, true);
    assert.deepEqual(boundary.events, ["ILL_UNAPPROVED_PRICING_NEUTRALIZED", "ILL_COMMERCIAL_ACTIVATION_WITHHELD"]);
  });

  test("fails ILL scope closed until pricing or quote authority is approved", () => {
    const baseScope = {
      illustrationCount: 3,
      illustrationTypes: ["SPOT"],
      standardOrCustomComplexity: "STANDARD",
      productionMethod: "AI",
      revisionRounds: 1,
      editionUsage: ["PF-01", "PF-03"],
      deliverySpecifications: "print and ebook",
      pricingMethod: "JMP-ILL-AI-STD",
      rightsTreatment: "JM1_LICENSED",
      creditTreatment: "CREDIT_REQUIRED",
      targetCompletion: "2026-08-01"
    };
    const fixed = validateIllustrationScope(baseScope);
    const quote = validateIllustrationScope({
      ...baseScope,
      productionMethod: "HUMAN",
      pricingMethod: "JMP-ILL-HUMAN-STD"
    });

    assert.equal(fixed.ok, false);
    assert.equal(fixed.missing.includes("pricingAuthority"), true);
    assert.equal(quote.ok, false);
    assert.equal(quote.missing.includes("quotedAmount"), true);
  });

  test("routes custom ILL scope to SOW", () => {
    const result = validateIllustrationScope({
      illustrationCount: 1,
      illustrationTypes: ["MAP"],
      standardOrCustomComplexity: "CUSTOM",
      productionMethod: "HYBRID",
      revisionRounds: 2,
      editionUsage: ["PF-01"],
      deliverySpecifications: "print",
      pricingMethod: "JMP-ILL-CUSTOM",
      rightsTreatment: "ASSIGNMENT",
      creditTreatment: "CREDIT_REQUIRED",
      targetCompletion: "2026-08-01"
    });

    assert.equal(result.ok, false);
    assert.equal(result.missing.includes("customSowId"), true);
  });

  test("blocks Interior Layout when illustration rights are incomplete", () => {
    const rights = validateIllustrationRights({
      illustrationAssetId: "ill-1",
      productionMethod: "AI",
      aiDisclosure: false,
      toolModelRecord: "",
      licenseOrOwnershipTreatment: "JM1_LICENSED",
      editionAndMarketingUsage: "PF-01"
    });

    assert.equal(rights.ok, false);
    assert.equal(rights.blocksInteriorLayout, true);
    assert.equal(rights.rightsClearanceStatus, "RIGHTS_CLEARANCE_BLOCKED");
  });

  test("requires an Illustration Style Guide under governed conditions", () => {
    const style = requiresIllustrationStyleGuide({
      illustrationCount: 5,
      recurringCharacters: true,
      pictureBook: true
    });

    assert.equal(style.required, true);
    assert.equal(style.reasons.includes("ILLUSTRATION_COUNT_EXCEEDS_FOUR"), true);
    assert.equal(style.reasons.includes("PICTURE_BOOK"), true);
  });

  test("maps illustration assets to selected editions without creating edition records", () => {
    const selected = [
      { productFormCode: "PF-01", selectionStatus: "SELECTED_INCLUDED_SLOT" },
      { productFormCode: "PF-03", selectionStatus: "SELECTED_INCLUDED_SLOT" },
      { productFormCode: "PF-02", selectionStatus: "OPTIONAL_NOT_SELECTED" }
    ];
    const mapping = mapIllustrationAssetToEditions({
      illustrationAssetId: "ill-1",
      editionMappings: [
        { productFormCode: "PF-01", printResolution: "300dpi", placement: "Chapter opener" },
        { productFormCode: "PF-03", ebookDimensions: "1600px", altText: "Illustration description" },
        { productFormCode: "PF-02", printResolution: "300dpi" }
      ]
    }, selected);

    assert.equal(mapping.mappings.length, 2);
    assert.equal(mapping.mappings.every((item) => item.createsProductForm === false), true);
    assert.deepEqual(mapping.skippedUnselectedEditionMappings, ["PF-02"]);
  });

  test("Production Assembly blocks on incomplete illustration evidence", () => {
    const result = validateProductionAssemblyIllustrations(
      [{ productFormCode: "PF-01", selectionStatus: "SELECTED_INCLUDED_SLOT" }],
      [{
        illustrationAssetId: "ill-1",
        productionMethod: "AI",
        aiDisclosure: true,
        toolModelRecord: "Azure Foundry image model",
        licenseOrOwnershipTreatment: "JM1_LICENSED",
        editionAndMarketingUsage: "PF-01",
        qaStatus: "PASSED",
        publisherApprovalStatus: "PENDING"
      }]
    );

    assert.equal(result.ok, false);
    assert.equal(result.missing[0].missingArtifact, "ILLUSTRATION_COMPLETION_EVIDENCE");
  });

  test("surfaces ILL legacy offerings without activating commercial records", () => {
    const result = reconcileIllustrationLegacyOffering("children's illustration — Coming Soon");

    assert.equal(result.canonicalMapping, "ILL");
    assert.equal(result.duplicationRisk, true);
    assert.equal(result.JackieDecisionRequired, true);
  });

  test("Block 05 requirement lineage separates current/refined canon from superseded distribution activity", () => {
    const audit = auditBlock05Requirements();
    assert.equal(audit.length >= 13, true);
    assert.equal(audit.every((row) => row.canProceedToRuntime === true), true);
    assert.equal(audit.every((row) => row.auditStatus === "IMPLEMENTED_ENFORCED"), true);
    assert.equal(audit.find((row) => row.domain === "Distribution Readiness / Mock Distribution").lineage, "REFINED");
  });

  test("Block 05 entry gate fails closed without semantic editorial handoff authority", () => {
    const blocked = evaluateProductionEntryGate({
      productionReady: true,
      finalEditorialManuscript: { artifactId: "final.docx", checksum: "a".repeat(64), authority: "FILENAME" }
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.missing.includes("finalEditorialCertified"), true);
    assert.equal(blocked.missing.includes("SEMANTIC_ARTIFACT_AUTHORITY"), true);

    const ready = evaluateProductionEntryGate({
      finalEditorialCertified: true,
      productionReady: true,
      finalEditorialManuscript: { artifactId: "artifact-1", checksum: "a".repeat(64), authority: "FINAL_EDITORIAL_CERTIFICATION" },
      finalEditorialChecksum: "a".repeat(64),
      editorialApprovalsComplete: true,
      styleSheetAvailable: true,
      productionNotesAvailable: true,
      activeTitleProject: true,
      formatEntitlementsResolved: true
    });
    assert.equal(ready.event, "PRODUCTION_ENTRY_READY");
  });

  test("Block 05 creates immutable lineage-bound Production Master and scope lock", () => {
    const scope = createProductionScopeLock({
      titleId: "title-1",
      packageVersion: "JMP-PKG-STARTER-v1",
      formats: [{ productFormCode: "PF_01", packageEntitlement: true, required: true }]
    });
    assert.equal(scope.ok, true);
    assert.match(scope.lock.checksum, /^[0-9a-f]{64}$/);

    const blockedScope = createProductionScopeLock({
      titleId: "title-1",
      packageVersion: "JMP-PKG-STARTER-v1",
      formats: [{ productFormCode: "PF_01", packageEntitlement: true, required: true }],
      silentExpansion: true
    });
    assert.equal(blockedScope.ok, false);
    assert.equal(blockedScope.missing.includes("SCOPE_CHANGE_AUTHORITY"), true);

    const master = createProductionMaster({
      finalEditorialManuscript: { artifactId: "final-editorial", checksum: "a".repeat(64) }
    });
    assert.equal(master.ok, true);
    assert.equal(master.productionMaster.derivedFrom, "final-editorial");
    assert.equal(master.productionMaster.contentFrozen, true);

    const mutation = createProductionMaster({
      finalEditorialManuscript: { artifactId: "final-editorial", checksum: "a".repeat(64) },
      mutateFinalEditorial: true
    });
    assert.equal(mutation.ok, false);
    assert.equal(mutation.missing.includes("FINAL_EDITORIAL_IMMUTABILITY"), true);
  });

  test("Block 05 workstream approvals are artifact-bound and do not confuse approval with technical pass", () => {
    const approval = validateArtifactBoundApproval({
      approvalId: "approval-1",
      titleId: "title-1",
      workstreamId: "cover",
      artifactId: "cover-v3",
      artifactChecksum: "a".repeat(64),
      approvedBy: "Author",
      approvedOn: "2026-08-26T00:00:00Z",
      decision: "APPROVED"
    });
    assert.equal(approval.ok, true);

    const changes = validateArtifactBoundApproval({
      approvalId: "approval-1",
      titleId: "title-1",
      workstreamId: "cover",
      artifactId: "cover-v3",
      artifactChecksum: "a".repeat(64),
      approvedBy: "Author",
      approvedOn: "2026-08-26T00:00:00Z",
      decision: "CHANGES_REQUESTED"
    });
    assert.equal(changes.ok, false);

    const cover = evaluateWorkstream({
      name: "COVER",
      marketabilityPassed: true,
      technicalValidationRequired: true,
      technicalValidationPassed: false
    });
    assert.equal(cover.ok, false);
    assert.equal(cover.missing.includes("TECHNICAL_VALIDATION"), true);
    assert.equal(cover.missing.includes("COVER_TECHNICAL_PASS"), true);
  });

  test("Block 05 cross-format synchronization fails stale cover and stale derived assets closed", () => {
    assert.equal(evaluateCrossFormatSynchronization({ pageCountChanged: true, coverRegenerated: false }).event, "CROSS_FORMAT_SYNCHRONIZATION_BLOCKED");
    assert.equal(evaluateCrossFormatSynchronization({ productionMasterChanged: true, derivedAssetsRevalidated: false }).event, "CROSS_FORMAT_SYNCHRONIZATION_BLOCKED");
    assert.equal(evaluateCrossFormatSynchronization({ coverPageCount: 250, finalPageCount: 275 }).event, "CROSS_FORMAT_SYNCHRONIZATION_BLOCKED");
    assert.equal(evaluateCrossFormatSynchronization({ coverPageCount: 275, finalPageCount: 275 }).event, "CROSS_FORMAT_SYNCHRONIZATION_PASS");
  });

  test("Block 05 identifier authority respects publication intent and blocks cross-format ISBN reuse", () => {
    const nonRelease = validateIdentifierAuthority({
      publicationIntent: "COMMISSIONING",
      formats: [{ productFormCode: "PF_01", required: true, requiresDistinctIsbn: true }],
      identifiers: []
    });
    assert.equal(nonRelease.ok, true);
    assert.equal(nonRelease.publicationIntent.isbnRequired, false);

    const reuse = validateIdentifierAuthority({
      publicationIntent: "COMMERCIAL_RELEASE",
      formats: [{ productFormCode: "PF_01", required: true, requiresDistinctIsbn: true }, { productFormCode: "PF_02", required: true, requiresDistinctIsbn: true }],
      identifiers: [{ format: "PF_01", identifier: "9780000000001", sourceAuthority: "REG" }, { format: "PF_02", identifier: "9780000000001", sourceAuthority: "REG" }]
    });
    assert.equal(reuse.ok, false);
    assert.equal(reuse.missing.includes("CROSS_FORMAT_IDENTIFIER_REUSE"), true);
  });

  test("Block 05 final production certification and Block 06 handoff are deterministic and fail closed", () => {
    const base = {
      titleId: "title-1",
      authorId: "author-1",
      imprint: "J Merrill Publishing",
      packageVersion: "pkg-v1",
      publicationIntent: "NON_RELEASE",
      formats: [{ productFormCode: "PF_01", required: true, requiresDistinctIsbn: true }],
      identifiers: [],
      scopeLockComplete: true,
      workstreams: [{ name: "INTERIOR", required: true, state: "CERTIFIED" }, { name: "COVER", required: true, state: "CERTIFIED" }],
      authorApprovalsComplete: true,
      technicalValidationsPass: true,
      finalArtifacts: [{ artifactId: "final-print", checksum: "b".repeat(64) }],
      checksumsVerified: true,
      publicationMetadataReady: true,
      accessibilitySatisfiedOrGoverned: true,
      handoffPackageComplete: true
    };
    assert.equal(evaluateFinalProductionCertification(base).event, "PUBLICATION_ASSETS_READY");
    const handoff = buildBlock06HandoffPackage(base);
    assert.equal(handoff.ok, true);
    assert.match(handoff.handoffPackage.checksum, /^[0-9a-f]{64}$/);

    const forbidden = evaluateFinalProductionCertification({ ...base, attemptedActions: ["DISTRIBUTION_SUBMISSION"] });
    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.missing.includes("BLOCK05_DISTRIBUTION_SUBMISSION_FORBIDDEN"), true);
  });

  test("Block 05 deliberate bypass suite and synthetic commissioning matrix pass", () => {
    const bypass = runBypassTests();
    const synthetic = runSyntheticCommissioningMatrix();
    assert.equal(bypass.ok, true);
    assert.equal(bypass.count, 36);
    assert.equal(synthetic.ok, true);
    assert.equal(synthetic.count, 14);
  });

  test("Block 05 final live workstream certification commissions every required production domain", () => {
    const certification = runFinalLiveWorkstreamCertification();

    assert.equal(certification.ok, true);
    assert.equal(certification.classification, "PRODUCTION_FULLY_COMMISSIONED");
    assert.equal(certification.registerSummary.totalDomains, 24);
    assert.equal(certification.registerSummary.commissioned, 24);
    assert.equal(certification.registerSummary.implementedNotCommissioned, 0);
    assert.equal(certification.registerSummary.partial, 0);
    assert.equal(certification.workstreams.interior.event, "INTERIOR_CERTIFIED");
    assert.equal(certification.workstreams.cover.event, "COVER_FULL_WRAP_CERTIFIED");
    assert.equal(certification.workstreams.pageCountCascade.event, "PAGE_COUNT_COVER_REGENERATION_PROVEN");
    assert.equal(certification.workstreams.metadata.event, "PUBLICATION_METADATA_PACKAGE_READY");
    assert.equal(certification.workstreams.ebook.event, "EBOOK_CERTIFIED");
    assert.equal(certification.workstreams.audioApplicable.event, "AUDIO_CERTIFIED");
    assert.equal(certification.workstreams.audioNotApplicable.event, "AUDIO_NOT_APPLICABLE");
    assert.equal(certification.workstreams.accessibility.event, "ACCESSIBILITY_VALIDATED");
    assert.equal(certification.workstreams.indexApplicable.event, "INDEX_CERTIFIED");
    assert.equal(certification.workstreams.indexNotApplicable.event, "INDEX_NOT_APPLICABLE");
    assert.equal(certification.workstreams.physicalProofRequired.event, "PHYSICAL_PROOF_CERTIFIED");
    assert.equal(certification.workstreams.physicalProofNotRequired.event, "PHYSICAL_PROOF_NOT_APPLICABLE");
    assert.equal(certification.finalProductionCertification.event, "PUBLICATION_ASSETS_READY");
    assert.equal(certification.block06Handoff.event, "BLOCK06_HANDOFF_PACKAGE_READY");
    assert.equal(certification.negativeProof.distribution_submission, 0);
    assert.equal(certification.negativeProof.payment_activity, 0);
    assert.equal(certification.negativeProof.false_PUBLICATION_ASSETS_READY, 0);
  });

  test("Block 05 final certification negative probes fail closed", () => {
    const negatives = runFinalCertificationNegativeProbes();

    assert.equal(negatives.ok, true);
    assert.equal(negatives.count, 11);
    assert.equal(negatives.passed, 11);
    assert.equal(negatives.falsePublicationAssetsReady, 0);
  });

  test("Block 05 eBook, audio, and accessibility validators do not certify raw exports or unsupported claims", () => {
    const ebook = validateEbookProduction({
      productionMasterId: "pm",
      epubArtifactId: "epub",
      semanticStructurePassed: true,
      navigationPassed: true,
      tocPassed: true,
      imageLinkHandlingPassed: true,
      accessibilityPassed: true,
      exportSucceeded: true,
      epubValidationPassed: false,
      renderDeviceQaPassed: true,
      checksum: "a".repeat(64)
    });
    assert.equal(ebook.ok, false);
    assert.equal(ebook.missing.includes("EPUB_EXPORT_NOT_CERTIFICATION"), true);

    const audio = validateAudioProduction({ audioApplicable: true, paymentMutationAttempted: true });
    assert.equal(audio.ok, false);
    assert.equal(audio.missing.includes("AUDIO_PAYMENT_MUTATION_FORBIDDEN"), true);

    const accessibility = validateAccessibilityEvidence({ complianceClaimed: true });
    assert.equal(accessibility.ok, false);
    assert.equal(accessibility.missing.includes("ACCESSIBILITY_CLAIM_WITHOUT_EVIDENCE"), true);
  });

  test("Block 05 final certification Function probe returns production fully commissioned", () => {
    const probe = buildBlock05FinalCertificationProbe();

    assert.equal(probe.status, "ready");
    assert.equal(probe.classification, "PRODUCTION_FULLY_COMMISSIONED");
    assert.equal(probe.finalCertification.registerSummary.totalDomains, 24);
    assert.equal(probe.negativeFailures.length, 0);
    assert.equal(probe.bypassFailures.length, 0);
    assert.equal(probe.syntheticFailures.length, 0);
  });

  test("Block 06 entry starts only from the commissioned Block 05 handoff and respects non-release intent", () => {
    const base = completeSyntheticRelease();
    assert.equal(evaluateBlock06EntryGate(base).event, "RELEASE_READINESS_ENTRY_READY");

    const blocked = evaluateBlock06EntryGate({ ...base, finalProductionCertified: false });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.missing.includes("FINAL_PRODUCTION_CERTIFIED"), true);

    const nonRelease = evaluateBlock06EntryGate({ ...base, publicationIntent: "NON_RELEASE", identifiers: [], pricing: [], routes: [], rights: [] });
    assert.equal(nonRelease.ok, true);
    assert.equal(nonRelease.event, "BLOCK06_NOT_APPLICABLE_FOR_NON_RELEASE");
  });

  test("Block 06 creates an exact versioned Release Manifest with immutable snapshots", () => {
    const manifest = createReleaseManifest(completeSyntheticRelease());

    assert.equal(manifest.ok, true);
    assert.equal(manifest.manifest.status, "RELEASE_CANDIDATE");
    assert.equal(manifest.manifest.formats.length, 1);
    assert.match(manifest.manifest.checksum, /^[0-9a-f]{64}$/);

    const blocked = createReleaseManifest({ titleId: "t" });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.missing.includes("RELEASE_VERSION"), true);
    assert.equal(blocked.missing.includes("RIGHTS_SNAPSHOT"), true);
  });

  test("Block 06 format, asset, metadata, and identifier reconciliation fails closed", () => {
    const base = completeSyntheticRelease();

    assert.equal(validateFormatEditionReconciliation(base).event, "FORMAT_EDITION_RECONCILED");
    assert.equal(validateFormatEditionReconciliation({ ...base, assets: [] }).ok, false);
    assert.equal(validateAssetMetadataConsistency({ ...base, assets: [{ ...base.assets[0], title: "Wrong Title" }] }).ok, false);
    assert.equal(validateIdentifierConsistency({ ...base, identifiers: [{ format: "PAPERBACK", identifier: "1", coverIdentifier: "2", copyrightIdentifier: "1", metadataIdentifier: "1", sourceAuthority: "REG" }] }).ok, false);
  });

  test("Block 06 rights, economics, routes, and publication dates are hard gates", () => {
    const base = completeSyntheticRelease();

    assert.equal(validateRightsTerritories(base).event, "RIGHTS_TERRITORIES_VALID");
    assert.equal(validateRightsTerritories({ ...base, rights: [{ ...base.rights[0], sourceAgreement: "" }] }).ok, false);
    assert.equal(validateRetailEconomics(base).event, "RETAIL_ECONOMICS_VALID");
    assert.equal(validateRetailEconomics({ ...base, pricing: [{ ...base.pricing[0], retailPrice: 5, manufacturingCost: 8 }] }).ok, false);
    assert.equal(validateChannelRoutes(base).event, "CHANNEL_ROUTES_VALID");
    assert.equal(validateChannelRoutes({ ...base, routes: [{ ...base.routes[0], valid: false }] }).ok, false);
    assert.equal(validatePublicationDate(base).event, "PUBLICATION_DATE_LOCKED");
    assert.equal(validatePublicationDate({ ...base, targetPublicationDate: "2026-10-07T00:00:00Z" }).ok, false);
  });

  test("Block 06 author confirmation and Publisher authorization bind to exact manifest versions", () => {
    const base = completeSyntheticRelease();
    const manifest = createReleaseManifest(base).manifest;
    const input = { ...base, releaseManifestId: manifest.releaseManifestId, releaseVersion: manifest.releaseVersion };

    assert.equal(evaluateAuthorReleaseConfirmation(input).event, "AUTHOR_RELEASE_CONFIRMED");
    assert.equal(evaluateAuthorReleaseConfirmation({ ...input, manifestMateriallyChanged: true }).ok, false);
    assert.equal(evaluatePublisherReleaseAuthorization(input, []).event, "PUBLISHER_RELEASE_AUTHORIZED");
    assert.equal(evaluatePublisherReleaseAuthorization(input, [{ domain: "RIGHTS" }]).ok, false);
  });

  test("Block 06 freeze, certificate, and Block 07 handoff preserve frozen manifest authority", () => {
    const final = runFinalReleaseReadinessCertification();

    assert.equal(final.ok, true);
    assert.equal(final.preDistributionCertified, true);
    assert.equal(final.distributionAuthorized, true);
    assert.equal(final.freeze.event, "RELEASE_PACKAGE_FROZEN");
    assert.equal(final.certificate.event, "RELEASE_READINESS_CERTIFICATE_CREATED");
    assert.equal(final.block07Handoff.event, "BLOCK07_HANDOFF_PACKAGE_READY");
    assert.equal(final.block07Handoff.handoff.distributionAuthorized, true);

    const blockedHandoff = buildBlock07Handoff({
      frozenManifest: final.freeze.frozenManifest,
      certificate: final.certificate.certificate,
      preDistributionCertified: true,
      block07ReadsLatestMutableFields: true
    });
    assert.equal(blockedHandoff.ok, false);
    assert.equal(blockedHandoff.missing.includes("BLOCK07_MUTABLE_LATEST_FORBIDDEN"), true);

    assert.equal(freezeReleasePackage({ manifest: final.releaseManifest.manifest, postFreezeMutationAttempted: true }, { blockers: [] }).ok, false);
    assert.equal(evaluatePostFreezeChange({ type: "IDENTIFIER_CHANGE" }).recertificationImpact, "FULL_RECERTIFICATION");
  });

  test("Block 06 deliberate bypass suite and synthetic commissioning matrix pass", () => {
    const bypass = runBlock06BypassTests();
    const synthetic = runBlock06SyntheticCommissioningMatrix();

    assert.equal(bypass.ok, true);
    assert.equal(bypass.count, 37);
    assert.equal(synthetic.ok, true);
    assert.equal(synthetic.count, 33);
  });

  test("Block 06 final commissioning registers every release-readiness domain and forbids downstream mutations", () => {
    const commissioning = runFinalBlock06Commissioning();

    assert.equal(commissioning.ok, true);
    assert.equal(commissioning.classification, "RELEASE_READINESS_FULLY_COMMISSIONED");
    assert.equal(commissioning.registerSummary.totalDomains, 28);
    assert.equal(commissioning.registerSummary.commissioned, 28);
    assert.equal(commissioning.finalCertification.distributionAuthorized, true);
    assert.equal(commissioning.negativeProof.distribution_submission_performed_in_block06, 0);
    assert.equal(commissioning.negativeProof.retailer_activation, 0);
    assert.equal(commissioning.negativeProof.payment_activity, 0);
    assert.equal(commissioning.negativeProof.Business_Central_payment_mutation, 0);
    assert.equal(commissioning.realTitles[0].classification, "COMMISSIONING_NON_RELEASE_BLOCK06_NA");
  });

  test("Block 06 audit and remediation preserve current canon and targeted revalidation", () => {
    const audit = auditBlock06Requirements();
    const remediation = routeReadinessRemediation({ domain: "IDENTIFIER" });

    assert.equal(audit.length >= 18, true);
    assert.equal(audit.filter((row) => row.auditStatus === "IMPLEMENTED_ENFORCED").length >= 14, true);
    assert.equal(remediation.ok, true);
    assert.equal(remediation.resetsUnrelatedPassedDomains, false);
  });

  test("Block 06 final certification Function probe returns release readiness fully commissioned", () => {
    const probe = buildBlock06FinalCertificationProbe();

    assert.equal(probe.status, "ready");
    assert.equal(probe.classification, "RELEASE_READINESS_FULLY_COMMISSIONED");
    assert.equal(probe.domains.totalDomains, 28);
    assert.equal(probe.bypass.failures, 0);
    assert.equal(probe.synthetic.failures, 0);
    assert.equal(probe.negative.failures.length, 0);
    assert.equal(probe.finalEvent, "DISTRIBUTION_AUTHORIZED");
    assert.equal(probe.handoff, "BLOCK07_HANDOFF_PACKAGE_READY");
  });

  test("Block 07 entry gate requires frozen Block 06 authorization and denies mutable-latest execution", () => {
    const fixture = completeSyntheticDistribution();

    assert.equal(validateBlock07Entry(fixture.entry).ok, true);
    assert.equal(validateBlock07Entry({ ...fixture.entry, distributionAuthorized: false }).ok, false);
    assert.equal(validateBlock07Entry({ ...fixture.entry, preDistributionCertified: false }).ok, false);
    assert.equal(validateBlock07Entry({ ...fixture.entry, releasePackageFrozen: false }).ok, false);
    assert.equal(validateBlock07Entry({ ...fixture.entry, releaseManifest: null }).ok, false);
    assert.equal(validateBlock07Entry({ ...fixture.entry, block07ReadsLatestMutableAssets: true }).missing.includes("FROZEN_MANIFEST_ONLY"), true);
  });

  test("Block 07 creates stable channel distribution instance identity and idempotent attempts", () => {
    const fixture = completeSyntheticDistribution();
    const pendingInput = {
      ...fixture.instances[0],
      jmpOperationalState: "NOT_SUBMITTED",
      externalChannelState: "NOT_SUBMITTED",
      verificationState: "NOT_VERIFIED",
      attempts: []
    };
    const instance = createChannelDistributionInstance(pendingInput).instance;
    const duplicate = createChannelDistributionInstance(pendingInput).instance;
    const submitted = submitDistributionInstance(instance);
    const retry = submitDistributionInstance(submitted.instance, { attemptId: "ATTEMPT-RETRY" });

    assert.equal(instance.distributionInstanceId, duplicate.distributionInstanceId);
    assert.equal(submitted.ok, true);
    assert.equal(submitted.instance.jmpOperationalState, "SUBMITTED");
    assert.equal(submitted.instance.verificationState, "NOT_VERIFIED");
    assert.equal(retry.instance.distributionInstanceId, instance.distributionInstanceId);
    assert.equal(retry.instance.attempts.length, 2);
    assert.equal(retry.instance.attempts[0].attempt, 1);
  });

  test("Block 07 live verification requires evidence and manifest comparison before URL registration", () => {
    const fixture = completeSyntheticDistribution();
    const instance = fixture.instances[0];
    const unverified = verifyLiveState({ ...instance, publicUrlVerified: false });
    const verified = verifyLiveState(instance);
    const mismatch = validateLiveListing({
      manifestExpectation: { isbn: "9780000000000", price: "19.99" },
      liveListing: { isbn: "9780000000000", price: "29.99" }
    });

    assert.equal(unverified.ok, false);
    assert.equal(verified.ok, true);
    assert.equal(registerCanonicalLiveUrl({ ...instance, verificationState: "NOT_VERIFIED" }).ok, false);
    assert.equal(registerCanonicalLiveUrl(instance).ok, true);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.result, "BLOCKING_MISMATCH");
  });

  test("Block 07 publication state separates required, optional, title-live, and fully-live states", () => {
    const fixture = completeSyntheticDistribution();
    const partial = derivePublicationState([
      fixture.instances[0],
      { ...fixture.instances[0], formatId: "EBOOK", endpointRequirement: "EXPECTED", verificationState: "NOT_VERIFIED" },
      { ...fixture.instances[2], endpointRequirement: "OPTIONAL", verificationState: "NOT_VERIFIED" }
    ]);
    const full = derivePublicationState(fixture.instances);

    assert.equal(partial.titleLive, true);
    assert.equal(partial.fullyLive, false);
    assert.equal(partial.optionalAbsentBlocksTitle, false);
    assert.equal(full.titleState, "FULLY_LIVE");
    assert.equal(full.releaseHealth, "HEALTHY");
  });

  test("Block 07 remediation, incident, takedown, watchdog, and date controls fail closed", () => {
    const remediation = routeDistributionRemediation({ errorDomain: "PRICE_MISMATCH" });
    const incident = openPublicationIncident({ blocking: true, incidentType: "WRONG_PRICE" });
    const takedownPending = requestEmergencyTakedown({ requested: true, verified: false });
    const watchdog = evaluateDistributionWatchdog({ lastCheckedHoursAgo: 49, slaHours: 24, externalChannelState: CHANNEL_STATES.PROCESSING });
    const date = evaluatePublicationDate({ authorizedDate: "2026-09-15", attemptedDate: "2026-09-16" });

    assert.equal(remediation.reopensBlock06ChangeControl, true);
    assert.equal(remediation.resetsUnaffectedChannels, false);
    assert.equal(incident.blocksCertification, true);
    assert.equal(takedownPending.state, "TAKEDOWN_PENDING");
    assert.equal(takedownPending.takenDownVerified, false);
    assert.equal(watchdog.ok, false);
    assert.equal(watchdog.waitingOn, "SYSTEM_ATTENTION_REQUIRED");
    assert.equal(date.ok, false);
  });

  test("Block 07 handoffs expose only verified publication state to Block 08 and Block 09", () => {
    const fixture = completeSyntheticDistribution();
    const block08 = buildBlock08Handoff(fixture.instances);
    const block09 = buildBlock09Handoff(fixture.instances);

    assert.equal(block08.ok, true);
    assert.equal(block08.handoff.event, "PRIMARY_RELEASE_LIVE");
    assert.equal(block08.handoff.canonicalVerifiedLiveUrls.every((link) => link.verified === true), true);
    assert.equal(block09.ok, true);
    assert.equal(block09.handoff.event, "BLOCK09_DISTRIBUTION_RECORD_HANDOFF_READY");
    assert.equal(block09.handoff.records.length, fixture.instances.length);
  });

  test("Block 07 deliberate bypass suite and synthetic commissioning matrix pass", () => {
    const bypass = runBlock07BypassTests();
    const synthetic = runBlock07SyntheticCommissioningMatrix();

    assert.equal(bypass.ok, true);
    assert.equal(bypass.count, 36);
    assert.equal(bypass.failures.length, 0);
    assert.equal(synthetic.ok, true);
    assert.equal(synthetic.count, 40);
    assert.equal(synthetic.results.filter((row) => !row.ok).length, 0);
  });

  test("Block 07 final commissioning registers every distribution domain and preserves downstream boundaries", () => {
    const commissioning = runFinalBlock07Commissioning();

    assert.equal(commissioning.ok, true);
    assert.equal(commissioning.classification, "DISTRIBUTION_FULLY_COMMISSIONED");
    assert.equal(commissioning.registerSummary.totalDomains, 41);
    assert.equal(commissioning.registerSummary.commissioned, 41);
    assert.equal(commissioning.certification.certified, true);
    assert.equal(commissioning.certification.event, "TITLE_LIVE_AND_VERIFIED");
    assert.equal(commissioning.certification.block08.handoff.event, "PRIMARY_RELEASE_LIVE");
    assert.equal(commissioning.certification.block09.handoff.event, "BLOCK09_DISTRIBUTION_RECORD_HANDOFF_READY");
    assert.equal(Object.values(commissioning.negativeProof).every((value) => value === 0), true);
  });

  test("Block 07 audit and final certification Function probe return distribution fully commissioned", () => {
    const audit = auditBlock07Requirements();
    const certification = certifyDistribution(completeSyntheticDistribution().instances);
    const probe = buildBlock07FinalCertificationProbe();

    assert.equal(audit.length >= 17, true);
    assert.equal(certification.certified, true);
    assert.equal(probe.status, "ready");
    assert.equal(probe.classification, "DISTRIBUTION_FULLY_COMMISSIONED");
    assert.equal(probe.domains.totalDomains, 41);
    assert.equal(probe.bypass.failures, 0);
    assert.equal(probe.synthetic.failures, 0);
    assert.equal(probe.negative.failures.length, 0);
    assert.equal(probe.finalEvent, "TITLE_LIVE_AND_VERIFIED");
    assert.equal(probe.block08Handoff, "PRIMARY_RELEASE_LIVE");
    assert.equal(probe.block09Handoff, "BLOCK09_DISTRIBUTION_RECORD_HANDOFF_READY");
  });

  test("Block 08 entry starts from Block 07 live handoff and refuses unverified CTA activation", () => {
    const fixture = completeSyntheticMarketingCampaign();

    assert.equal(validateBlock08Entry(fixture).ok, true);
    assert.equal(validateBlock08Entry({ ...fixture, primaryReleaseLive: false }).ok, false);
    assert.equal(validateBlock08Entry({ ...fixture, verifiedBuyLinks: [] }).ok, false);
    assert.equal(validateBlock08Entry({ ...fixture, releaseHealth: "INCIDENT" }).ok, false);
    assert.equal(validateBlock08Entry({ ...fixture, unverifiedBuyNowCta: true }).missing.includes("VERIFIED_CTA_REQUIRED"), true);
  });

  test("Block 08 creates a governed campaign object before live launch and never uses package name as workflow", () => {
    const fixture = completeSyntheticMarketingCampaign({ primaryReleaseLive: false });
    const campaign = createTitleMarketingCampaign(fixture);
    const scope = createMarketingScopeLock(fixture);

    assert.equal(campaign.ok, true);
    assert.equal(campaign.campaign.titleId, fixture.titleId);
    assert.equal(campaign.campaign.releaseManifestId, fixture.releaseManifestId);
    assert.equal(campaign.campaign.status, "PLANNING");
    assert.equal(scope.ok, true);
    assert.equal(createMarketingScopeLock({ ...fixture, packageNameAsWorkflow: true }).ok, false);
    assert.equal(resolveMarketingEntitlement("JMP-PKG-PRO").status, "CURRENT");
  });

  test("Block 08 author representation and asset gates separate routine execution from author approval", () => {
    const fixture = completeSyntheticMarketingCampaign();
    const campaignId = fixture.campaign.campaignId;

    assert.equal(validateAuthorMarketingApproval({ campaignId, assetId: "routine", contentType: "ROUTINE_CAPTION" }).ok, true);
    assert.equal(validateAuthorMarketingApproval({ campaignId, assetId: "routine", contentType: "ROUTINE_CAPTION", requiresApprovalForRoutineLowRisk: true }).ok, false);
    assert.equal(validateAuthorMarketingApproval({ campaignId, assetId: "story", contentType: "PERSONAL_STORY", authorApproved: false }).ok, false);
    assert.equal(validateAuthorMarketingApproval({ campaignId, assetId: "story", contentType: "PERSONAL_STORY", authorApproved: true }).ok, true);
    assert.equal(registerMarketingAsset({ campaignId, titleId: fixture.titleId, assetType: "COVER_GRAPHIC", coverApproved: false }).ok, false);
    assert.equal(registerMarketingAsset({ campaignId, titleId: fixture.titleId, assetType: "COVER_GRAPHIC", coverApproved: true }).ok, true);
  });

  test("Block 08 consent, social, preorder, and CTA controls fail closed without blocking service communication", () => {
    const fixture = completeSyntheticMarketingCampaign();

    assert.equal(validateMarketingConsent({ communicationType: "SERVICE", marketingConsent: false }).ok, true);
    assert.equal(validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: false }).ok, false);
    assert.equal(validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: true }).ok, true);
    assert.equal(validateSocialExecution({ accountVerified: false }).ok, false);
    assert.equal(validateSocialExecution({ accountVerified: true, executionSystemBecomesRecord: true }).ok, false);
    assert.equal(validatePreorderMarketing({ preorderAuthorized: true, preorderEndpointLiveVerified: false }).ok, false);
    assert.equal(resolveCtaAuthority({ ...fixture.verifiedBuyLinks[0], verified: true, urlHealthy: false }).event, "CTA_SUPPRESSED");
    assert.equal(resolveCtaAuthority({ ...fixture.verifiedBuyLinks[0], campaignId: fixture.campaign.campaignId, verified: true, urlHealthy: true }).ok, true);
  });

  test("Block 08 review/ARC, quote, attribution, and metrics preserve provenance and confidence", () => {
    const fixture = completeSyntheticMarketingCampaign();
    const campaignId = fixture.campaign.campaignId;

    assert.equal(validateReviewArc({ staleArtifact: true }).ok, false);
    assert.equal(validateReviewArc({}).ok, true);
    assert.equal(validateReviewQuoteUsage({ quote: "Great", permissionStatus: "UNKNOWN" }).ok, false);
    assert.equal(validateReviewQuoteUsage({ quote: "Great", permissionStatus: "APPROVED" }).ok, true);
    assert.equal(evaluateAttribution({ campaignId, fabricateSalesAttribution: true }).ok, false);
    assert.equal(evaluateAttribution({ campaignId, trafficEvidence: true }).confidence, "CORRELATED");
    assert.equal(captureCampaignMetrics({ campaignId, metrics: fixture.metrics }).ok, true);
    assert.equal(captureCampaignMetrics({ metrics: fixture.metrics }).ok, false);
  });

  test("Block 08 launch-cycle close requires full performance review and evergreen handoff, not sales target or launch day", () => {
    const fixture = completeSyntheticMarketingCampaign();
    const required = {
      ...fixture,
      activities: fixture.activities,
      authorParticipation: fixture.authorParticipation,
      launchWindowClosed: true,
      metricsCaptured: true,
      performanceReviewComplete: true,
      evergreenHandoffComplete: true
    };

    assert.equal(certifyLaunchCycle(required).event, "LAUNCH_CYCLE_COMPLETE");
    assert.equal(certifyLaunchCycle({ ...required, salesTargetRequired: true }).ok, false);
    assert.equal(certifyLaunchCycle({ ...required, launchDayOnly: true }).ok, false);
    assert.equal(certifyLaunchCycle({ ...required, performanceReviewComplete: false }).ok, false);
    assert.equal(buildLaunchPerformanceReview({ campaignId: fixture.campaign.campaignId, skipReview: true }).ok, false);
  });

  test("Block 08 watchdog surfaces stale campaign work without converting it into author wait", () => {
    const pass = evaluateMarketingWatchdog({});
    const stale = evaluateMarketingWatchdog({ primaryReleaseLiveBuyNowInactive: true, brokenCtaStillActive: true });

    assert.equal(pass.ok, true);
    assert.equal(stale.ok, false);
    assert.equal(stale.event, "MARKETING_ATTENTION_REQUIRED");
    assert.equal(stale.waitingOn, "JMP_SYSTEM");
  });

  test("Block 08 deliberate bypass suite and synthetic commissioning matrix pass", () => {
    const bypass = runBlock08BypassTests();
    const synthetic = runBlock08SyntheticCommissioningMatrix();

    assert.equal(bypass.ok, true);
    assert.equal(bypass.count, 35);
    assert.equal(bypass.failures.length, 0);
    assert.equal(synthetic.ok, true);
    assert.equal(synthetic.count, 44);
    assert.equal(synthetic.results.filter((row) => !row.ok).length, 0);
  });

  test("Block 08 final commissioning registers every launch-marketing domain and preserves commissioning boundaries", () => {
    const commissioning = runFinalBlock08Commissioning();

    assert.equal(commissioning.ok, true);
    assert.equal(commissioning.classification, "LAUNCH_MARKETING_FULLY_COMMISSIONED");
    assert.equal(commissioning.registerSummary.totalDomains, 55);
    assert.equal(commissioning.registerSummary.commissioned, 55);
    assert.equal(commissioning.certification.event, "LAUNCH_CYCLE_COMPLETE");
    assert.equal(commissioning.block09Handoff.event, "BLOCK09_MARKETING_HANDOFF_READY");
    assert.equal(Object.values(commissioning.negativeProof).every((value) => value === 0), true);
    assert.equal(commissioning.negativeProof.real_promotional_email_sent_for_commissioning, 0);
    assert.equal(commissioning.negativeProof.real_social_post_published_for_commissioning, 0);
    assert.equal(commissioning.negativeProof.real_ad_spend, 0);
  });

  test("Block 08 audit and final certification Function probe return launch marketing fully commissioned", () => {
    const audit = auditBlock08Requirements();
    const fixture = completeSyntheticMarketingCampaign();
    const handoff = buildBlock09MarketingHandoff({ ...fixture, campaignId: fixture.campaign.campaignId, launchCycleComplete: true });
    const probe = buildBlock08FinalCertificationProbe();

    assert.equal(audit.length >= 25, true);
    assert.equal(handoff.ok, true);
    assert.equal(handoff.event, "BLOCK09_MARKETING_HANDOFF_READY");
    assert.equal(probe.status, "ready");
    assert.equal(probe.classification, "LAUNCH_MARKETING_FULLY_COMMISSIONED");
    assert.equal(probe.domains.totalDomains, 55);
    assert.equal(probe.bypass.failures, 0);
    assert.equal(probe.synthetic.failures, 0);
    assert.equal(probe.negative.failures.length, 0);
    assert.equal(probe.finalEvent, "LAUNCH_CYCLE_COMPLETE");
    assert.equal(probe.block09Handoff, "BLOCK09_MARKETING_HANDOFF_READY");
  });

  test("Block 09 activates from Block 07 live verification and does not wait for Block 08 close", () => {
    const distribution = completeSyntheticDistribution();
    const activation = validateBlock09Activation({ titleLiveAndVerified: true, distributionRecords: distribution.instances, block08LaunchCycleComplete: false });
    const blocked = validateBlock09Activation({ titleLiveAndVerified: true, distributionRecords: distribution.instances, block08LaunchCycleCompleteRequired: true });
    const baseline = buildPublishedTitleBaseline({ titleLiveAndVerified: true, distributionRecords: distribution.instances });

    assert.equal(activation.ok, true);
    assert.equal(activation.event, "TITLE_MANAGEMENT_ACTIVE");
    assert.equal(activation.block08MayContinue, true);
    assert.equal(blocked.ok, false);
    assert.equal(baseline.ok, true);
    assert.equal(baseline.baseline.royaltyRuleVersion, "ROYALTY_RULE_STANDARD_70_GOVERNED_NET_v1.0");
  });

  test("Block 09 preserves work, edition, format, and historical edition economics", () => {
    const hierarchy = buildWorkEditionFormatHierarchy();

    assert.equal(hierarchy.editions.length, 2);
    assert.equal(hierarchy.editions[0].preservesHistory, true);
    assert.equal(hierarchy.editions[1].successorTo, "EDITION-1");
    assert.equal(hierarchy.newEditionOverwritesOld, false);
    assert.equal(hierarchy.editions[0].salesLedgerScope, "EDITION_1_ONLY");
  });

  test("Block 09 royalty rule resolution honors executed contract and rejects list-price shortcut", () => {
    const standard = resolveRoyaltyRuleVersion();
    const historical = resolveRoyaltyRuleVersion({ executedContract: { contractId: "OLD", contractVersion: "Historical", rate: 0.5, basis: "GOVERNED_NET" } });
    const override = resolveRoyaltyRuleVersion({ forceCurrentDefaultOverContract: true });
    const listPrice = resolveRoyaltyRuleVersion({ useListPriceAsBasis: true });

    assert.equal(standard.ok, true);
    assert.equal(standard.rule.rate, 0.7);
    assert.equal(historical.rule.rate, 0.5);
    assert.equal(override.ok, false);
    assert.equal(listPrice.ok, false);
  });

  test("Block 09 source ingestion, sales ledger, remittance, and cash stay separate", () => {
    const ingestion = ingestSalesSourceReport();
    const duplicate = ingestSalesSourceReport({ duplicateFile: true });
    const remittance = reconcileRemittanceAndCash();

    assert.equal(ingestion.ok, true);
    assert.equal(ingestion.ledgerEvents.length, 3);
    assert.equal(ingestion.ledgerEvents.every((event) => event.immutableSourceLineage), true);
    assert.equal(duplicate.event, "SALES_DATA_ATTENTION_REQUIRED");
    assert.equal(remittance.saleEqualsRemittance, false);
    assert.equal(remittance.remittanceEqualsCash, false);
  });

  test("Block 09 royalty engine is the only calculation authority and statements consume ledger facts", () => {
    const ingestion = ingestSalesSourceReport();
    const royalty = calculateRoyalty({ salesEvents: ingestion.ledgerEvents });
    const recalculation = calculateRoyalty({ statementTemplateRecalculates: true });
    const statement = generateRoyaltyStatement();
    const recalcStatement = generateRoyaltyStatement({ recalculateInTemplate: true });

    assert.equal(royalty.ok, true);
    assert.equal(royalty.royaltyResults[0].calculationAuthority, "ROYALTY_ENGINE");
    assert.equal(recalculation.ok, false);
    assert.equal(statement.ok, true);
    assert.equal(statement.statement.calculatesRoyalty, false);
    assert.equal(recalcStatement.ok, false);
  });

  test("Block 09 royalty periods, late adjustments, payment clock, and failed-payment liability are governed", () => {
    const period = createRoyaltyPeriod({ period: "2026-09" });
    const adjustment = applyLateAdjustment();
    const rewrite = applyLateAdjustment({ rewriteClosedPeriod: true });
    const payable = createRoyaltyPayable();
    const failed = processRoyaltyPaymentAttempt({ payable: payable.payable, fail: true });
    const realPayment = processRoyaltyPaymentAttempt({ realPayment: true });

    assert.equal(period.statementDue, "2026-10-14");
    assert.equal(period.paymentDue, "2026-12-29");
    assert.equal(adjustment.ok, true);
    assert.equal(rewrite.ok, false);
    assert.equal(failed.liabilityRemains, true);
    assert.equal(failed.reissueRequired, true);
    assert.equal(realPayment.ok, false);
  });

  test("Block 09 annual distribution fees apply only to print formats and real invoices are blocked", () => {
    const fees = createAnnualDistributionFeeObligations();
    const ebook = createAnnualDistributionFeeObligations({ chargeEbookFee: true });
    const realInvoice = createAnnualDistributionFeeObligations({ realInvoice: true });

    assert.equal(fees.ok, true);
    assert.deepEqual(fees.obligations.map((fee) => fee.format).sort(), ["HARDCOVER", "PAPERBACK"]);
    assert.equal(fees.obligations.every((fee) => fee.amount === 30), true);
    assert.equal(ebook.ok, false);
    assert.equal(realInvoice.ok, false);
  });

  test("Block 09 published-author support routes email to Customer Service and keeps royalty/payment replies with Jackie", () => {
    const metadata = routePublishedAuthorSupport({ category: "METADATA_UPDATE" });
    const royalty = routePublishedAuthorSupport({ category: "ROYALTY_QUESTION" });
    const emailOnly = routePublishedAuthorSupport({ emailOnly: true });

    assert.equal(metadata.ok, true);
    assert.equal(metadata.case.system, "DYNAMICS_365_CUSTOMER_SERVICE");
    assert.equal(royalty.case.waitingOn, "JACKIE_REVIEW_REQUIRED");
    assert.equal(royalty.case.autoRoyaltyPaymentResponseSent, false);
    assert.equal(emailOnly.ok, false);
  });

  test("Block 09 Author Workspace, comps, evergreen, and returning-author loop preserve history", () => {
    const workspace = buildAuthorWorkspacePublishedTitleHome();
    const comps = fulfillAuthorCopies();
    const noLedger = fulfillAuthorCopies({ withoutLedger: true });
    const evergreen = mergeEvergreenMarketingHandoff();
    const authorLoop = updateAuthorRelationshipLoop();

    assert.equal(workspace.visibleSections.includes("Royalty Statements"), true);
    assert.equal(workspace.authorForcedToReenterHistory, false);
    assert.equal(comps.ok, true);
    assert.equal(comps.ledger.podIsInventory, false);
    assert.equal(noLedger.ok, false);
    assert.equal(evergreen.ok, true);
    assert.equal(authorLoop.authorRelationship.futureBlock01Recognition, true);
  });

  test("Block 09 post-publication change routing is proportional and re-enters upstream blocks when required", () => {
    const metadata = classifyPostPublicationChange({ type: "METADATA_ONLY" });
    const material = classifyPostPublicationChange({ type: "MATERIAL_CONTENT_REVISION" });
    const format = classifyPostPublicationChange({ type: "FORMAT_EXPANSION" });
    const bypass = classifyPostPublicationChange({ bypassClassification: true });

    assert.equal(metadata.route.includes("BLOCK09_VALIDATE"), true);
    assert.equal(metadata.fullLifecycleForcedForMetadataOnly, false);
    assert.equal(material.route.includes("BLOCK04"), true);
    assert.equal(format.route.includes("BLOCK05"), true);
    assert.equal(format.route.includes("BLOCK08_FORMAT_LAUNCH"), true);
    assert.equal(bypass.ok, false);
  });

  test("Block 09 health, contract rights, terminal states, archive, clocks, and watchdog are explicit", () => {
    const health = deriveTitleHealth({ commercialPerformance: "LOW_SALES" });
    const contract = evaluateContractMilestone({ lowSales: true });
    const automaticReversion = evaluateContractMilestone({ lowSalesAutomaticReversion: true });
    const states = separateTerminalStates();
    const archiveDenied = evaluateArchiveReadiness({ unresolvedFinancialObligation: true });
    const archiveReady = evaluateArchiveReadiness();
    const clocks = buildRecurringClocks();
    const watchdog = evaluateBlock09Watchdog({ statementOverdue: true });
    const surface = buildPublisherOperatingCenterBacklistSurface();

    assert.equal(health.lowSalesAloneUnhealthy, false);
    assert.equal(health.opaqueScore, false);
    assert.equal(contract.milestone.reversionState, "REVERSION_REVIEW_REQUIRED");
    assert.equal(automaticReversion.ok, false);
    assert.equal(states.ok, true);
    assert.equal(archiveDenied.ok, false);
    assert.equal(archiveReady.event, "TITLE_MANAGEMENT_ARCHIVED");
    assert.equal(clocks.eventDrivenMonitoring, true);
    assert.equal(watchdog.event, "TITLE_ATTENTION_REQUIRED");
    assert.equal(surface.views.includes("Royalty Period Due"), true);
  });

  test("Block 09 deliberate bypass suite and synthetic commissioning matrix pass", () => {
    const bypass = runBlock09BypassTests();
    const synthetic = runBlock09SyntheticCommissioningMatrix();

    assert.equal(bypass.ok, true);
    assert.equal(bypass.count, 40);
    assert.equal(bypass.failures.length, 0);
    assert.equal(synthetic.ok, true);
    assert.equal(synthetic.count, 56);
    assert.equal(synthetic.results.filter((row) => !row.ok).length, 0);
  });

  test("Block 09 final commissioning registers every title-management domain and preserves real-financial boundaries", () => {
    const commissioning = runFinalBlock09Commissioning();

    assert.equal(commissioning.ok, true);
    assert.equal(commissioning.classification, "TITLE_MANAGEMENT_FULLY_COMMISSIONED");
    assert.equal(commissioning.registerSummary.totalDomains, 61);
    assert.equal(commissioning.registerSummary.commissioned, 61);
    assert.equal(commissioning.activation.event, "TITLE_MANAGEMENT_ACTIVE");
    assert.equal(commissioning.realFinancialBoundary.royaltyPayments, "DISABLED_FOR_COMMISSIONING");
    assert.equal(commissioning.negativeProof.real_royalty_payment_sent_for_commissioning, 0);
    assert.equal(Object.values(commissioning.negativeProof).every((value) => value === 0), true);
  });

  test("Block 09 audit and final certification Function probe return title management fully commissioned", () => {
    const audit = auditBlock09Requirements();
    const probe = buildBlock09FinalCertificationProbe();

    assert.equal(audit.length >= 33, true);
    assert.equal(probe.status, "ready");
    assert.equal(probe.classification, "TITLE_MANAGEMENT_FULLY_COMMISSIONED");
    assert.equal(probe.domains.totalDomains, 61);
    assert.equal(probe.bypass.failures, 0);
    assert.equal(probe.synthetic.failures, 0);
    assert.equal(probe.negative.failures.length, 0);
    assert.equal(probe.finalEvent, "TITLE_MANAGEMENT_ACTIVE");
    assert.equal(probe.archiveEvent, "TITLE_MANAGEMENT_ARCHIVED");
  });
});
