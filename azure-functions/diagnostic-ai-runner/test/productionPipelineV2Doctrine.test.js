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
});
