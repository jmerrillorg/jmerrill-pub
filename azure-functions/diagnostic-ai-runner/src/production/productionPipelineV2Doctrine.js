"use strict";

// Engine: Production Engine
// Reusable? Y
// Stage-specific exception? N

const PIPELINE_VERSION = "JM1_PRODUCTION_PIPELINE_V2_0";

const PRODUCTION_TAXONOMY = Object.freeze([
  "PRODUCTION_START",
  "INTERIOR_LAYOUT",
  "COVER_DESIGN",
  "INTERIOR_QA",
  "COVER_QA",
  "PRODUCTION_REVIEW_PACKAGE",
  "AUTHOR_PRODUCTION_REVIEW",
  "PRODUCTION_ASSEMBLY",
  "EPUB_GENERATION",
  "ACCESSIBILITY_QA",
  "METADATA_VALIDATION",
  "DISTRIBUTION_READINESS",
  "MOCK_DISTRIBUTION",
  "PUBLISHER_VALIDATION",
  "LIVE_DISTRIBUTION",
  "POST_RELEASE_VERIFICATION"
]);

const TIMING_GOVERNANCE = Object.freeze({
  PRODUCTION_START: "IMMEDIATE_AUTOMATED_TRANSITION",
  INTERIOR_LAYOUT: "INTERNAL_SERVICE_LEVEL_TARGET",
  COVER_DESIGN: "INTERNAL_SERVICE_LEVEL_TARGET",
  INTERIOR_QA: "INTERNAL_SERVICE_LEVEL_TARGET",
  COVER_QA: "INTERNAL_SERVICE_LEVEL_TARGET",
  PRODUCTION_REVIEW_PACKAGE: "TIME_BASED_AUTHOR_RELEASE_CADENCE",
  AUTHOR_PRODUCTION_REVIEW: "AUTHOR_RESPONSE_CLOCK",
  PRODUCTION_ASSEMBLY: "INTERNAL_SERVICE_LEVEL_TARGET",
  EPUB_GENERATION: "INTERNAL_SERVICE_LEVEL_TARGET",
  ACCESSIBILITY_QA: "INTERNAL_SERVICE_LEVEL_TARGET",
  METADATA_VALIDATION: "INTERNAL_SERVICE_LEVEL_TARGET",
  DISTRIBUTION_READINESS: "INTERNAL_SERVICE_LEVEL_TARGET",
  MOCK_DISTRIBUTION: "EXTERNAL_DEPENDENCY_WINDOW",
  PUBLISHER_VALIDATION: "PUBLISHER_DECISION_HOLD",
  LIVE_DISTRIBUTION: "EXTERNAL_DEPENDENCY_WINDOW",
  POST_RELEASE_VERIFICATION: "INTERNAL_SERVICE_LEVEL_TARGET"
});

const AUTHOR_REVIEW_PACKAGE = Object.freeze({
  stage: "PRODUCTION_REVIEW_PACKAGE",
  label: "Production Review Package",
  replaces: Object.freeze(["Interior Review", "Cover Review"]),
  requiredArtifacts: Object.freeze([
    "INTERIOR_PROOF_PDF",
    "COVER_PROOF",
    "PRODUCTION_NOTES",
    "REVIEW_INSTRUCTIONS",
    "PUBLISHER_COMMUNICATION"
  ])
});

const PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS = Object.freeze([
  "APPROVED_INTERIOR",
  "APPROVED_COVER",
  "PRINT_READY_PDF",
  "EPUB",
  "METADATA",
  "ACCESSIBILITY_ASSETS",
  "ISBN_RELATIONSHIPS",
  "PRICING",
  "BISAC_BIC",
  "KEYWORDS",
  "DISTRIBUTION_PAYLOADS"
]);

const MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS = Object.freeze([
  "PUBLISH",
  "CREATE_RETAILER_LISTING",
  "NOTIFY_RETAILER",
  "GENERATE_ROYALTY",
  "CREATE_FINANCIAL_POSTING"
]);

const PRODUCTION_WORK_EVENTS = Object.freeze({
  PRODUCTION_START_CREATED: "PRODUCTION_START_CREATED",
  INTERIOR_LAYOUT_WORK_CREATED: "INTERIOR_LAYOUT_WORK_CREATED",
  COVER_DESIGN_WORK_CREATED: "COVER_DESIGN_WORK_CREATED",
  EPUB_GENERATED: "EPUB_GENERATED",
  EPUB_VALIDATED: "EPUB_VALIDATED",
  ACCESSIBILITY_VALIDATED: "ACCESSIBILITY_VALIDATED",
  METADATA_VALIDATED: "METADATA_VALIDATED",
  DISTRIBUTOR_VALIDATION_PASSED: "DISTRIBUTOR_VALIDATION_PASSED",
  DISTRIBUTOR_VALIDATION_FAILED: "DISTRIBUTOR_VALIDATION_FAILED",
  LIVE_DISTRIBUTION_APPROVED: "LIVE_DISTRIBUTION_APPROVED"
});

const EDITION_SELECTION_STATES = Object.freeze([
  "SELECTED_INCLUDED_SLOT",
  "SELECTED_PREMIUM_SLOT",
  "SELECTED_ADD_ON",
  "SELECTED_PROGRAM_ONLY",
  "OPTIONAL_NOT_SELECTED",
  "PROVISIONAL_NOT_AVAILABLE",
  "SELECTED_BLOCKED",
  "SELECTED_READY",
  "RETIRED_OR_WITHDRAWN"
]);

const RELEASE_MODELS = Object.freeze([
  "STANDARD_RELEASE",
  "SIMULTANEOUS_MULTI_FORMAT",
  "STAGGERED_FORMAT_RELEASE",
  "SERIALIZED_OR_EPISODIC",
  "AUDIO_FIRST",
  "PREORDER",
  "PILOT"
]);

const PRODUCTION_MODES = Object.freeze([
  "AI_ASSISTED",
  "HUMAN_PRODUCED",
  "HYBRID",
  "EXTERNAL_PARTNER"
]);

const PRODUCT_FORM_REGISTRY = Object.freeze({
  "PF-01": Object.freeze({
    productFormCode: "PF-01",
    canonicalName: "Paperback",
    productionMethod: "IngramSpark print",
    isbnPolicy: "DISTINCT_EDITION_ISBN_REQUIRED",
    slotEligibility: "STANDARD_EQUAL_VALUE",
    standardPrice: 350,
    distributionRail: "INGRAM_CONTENT",
    requiredProductionObligations: Object.freeze([
      "PRINT_INTERIOR",
      "PAPERBACK_FULL_WRAP_COVER",
      "TRIM",
      "PAGE_COUNT",
      "SPINE",
      "PAPERBACK_ISBN",
      "PRINT_QA",
      "RETAIL_AND_AUTHOR_PRICING",
      "DISTRIBUTOR_PAYLOAD"
    ])
  }),
  "PF-02": Object.freeze({
    productFormCode: "PF-02",
    canonicalName: "Hardcover",
    productionMethod: "IngramSpark print",
    isbnPolicy: "DISTINCT_EDITION_ISBN_REQUIRED",
    slotEligibility: "STANDARD_EQUAL_VALUE",
    standardPrice: 350,
    distributionRail: "INGRAM_CONTENT",
    requiredProductionObligations: Object.freeze([
      "HARDCOVER_COMPATIBLE_INTERIOR",
      "CASE_LAMINATE_OR_DUST_JACKET_SPECIFICATION",
      "HARDCOVER_SPECIFIC_COVER",
      "HARDCOVER_SPINE",
      "DISTINCT_ISBN",
      "BINDING_AND_TRIM_METADATA",
      "HARDCOVER_QA",
      "PRICING",
      "DISTRIBUTOR_PAYLOAD"
    ]),
    prohibitedReuse: Object.freeze(["PF-01_ISBN", "PF-01_COVER_SPECIFICATION"])
  }),
  "PF-03": Object.freeze({
    productFormCode: "PF-03",
    canonicalName: "Standard Ebook",
    technicalProfile: "STANDARD_REFLOWABLE_EPUB_3",
    accessibilityStandard: "BORN_ACCESSIBLE_REQUIRED",
    slotEligibility: "STANDARD_EQUAL_VALUE",
    standardPrice: 350,
    isbnPolicy: "ONE_EDITION_ISBN",
    distributionRails: Object.freeze(["CORESOURCE_BACKLIST", "PUBLISHDRIVE_NEW_TITLE_DUAL_RAIL"]),
    retailerSpecificEditionsAllowed: false,
    accessibilityCreatesSlot: false,
    requiredProductionObligations: Object.freeze([
      "STANDARD_REFLOWABLE_EPUB_3",
      "EBOOK_COVER",
      "ONE_EBOOK_ISBN",
      "BASELINE_ACCESSIBILITY_QA",
      "EDITION_METADATA",
      "DISTRIBUTOR_PRODUCT_IDS"
    ])
  }),
  "PF-04": Object.freeze({
    productFormCode: "PF-04",
    canonicalName: "Audiobook",
    slotEligibility: "NEVER",
    commercialTreatment: "SEPARATE_LINE_ITEM",
    isbnPolicy: "AUDIO_EDITION_IDENTIFIER_POLICY",
    narrationMethods: Object.freeze(["AI", "HUMAN_SINGLE_VOICE", "HUMAN_MULTI_VOICE"]),
    aiNarration: Object.freeze({
      basePrice: 500,
      includedFinishedHours: 8,
      estimatedIncludedWordCount: 74000,
      overagePricePerFinishedHour: 50,
      premierIncludedPathway: true
    }),
    humanSingleVoice: Object.freeze({
      pricingType: "QUOTE_REQUIRED",
      startingRatePerFinishedHour: 400,
      fixedFinalSalePriceAllowed: false
    }),
    humanMultiVoice: Object.freeze({
      pricingType: "CUSTOM_SOW"
    }),
    premierSwapRule: Object.freeze({
      selectingHumanNarrationRemovesAiNarration: true,
      creditOrDiscountApplies: false,
      humanNarrationBilling: "FULL_QUOTED_PRICE"
    }),
    productionPosture: "AZURE_FOUNDRY_AI_DEFAULT_ACX_HUMAN_EXCEPTION"
  }),
  "PF-05": Object.freeze({
    productFormCode: "PF-05",
    canonicalName: "Large Print",
    isbnPolicy: "DISTINCT_EDITION_ISBN_REQUIRED",
    complexityValues: Object.freeze(["STANDARD", "COMPLEX"]),
    standardPrice: 350,
    complexInSlotPremiumUpcharge: 250,
    complexBeyondSlotAddOnPrice: 600,
    complexityCreatesProductForm: false,
    requiredProductionObligations: Object.freeze([
      "SEPARATELY_DESIGNED_INTERIOR",
      "FONT_SIZE_SPECIFICATION",
      "TRIM_AND_PAGE_ARCHITECTURE",
      "EDITION_SPECIFIC_COVER",
      "DISTINCT_ISBN",
      "EDITION_METADATA",
      "LARGE_PRINT_QA"
    ])
  }),
  "PF-06": Object.freeze({
    productFormCode: "PF-06",
    canonicalName: "Complex-Content Accessibility Edition",
    isbnPolicy: "DISTINCT_EDITION_ISBN_REQUIRED",
    commercialTreatment: "PREMIUM",
    inSlotPremiumUpcharge: 650,
    beyondSlotAddOnPrice: 1000,
    pf03RemainsAccessibleByDefault: true,
    triggerConditions: Object.freeze([
      "EQUATIONS_OR_MATHML",
      "COMPLEX_TABLES",
      "CHARTS_OR_DIAGRAMS",
      "EXTENDED_IMAGE_DESCRIPTIONS",
      "SYNCHRONIZED_TEXT_AND_AUDIO",
      "SPECIALIZED_NAVIGATION",
      "ASSISTIVE_TECHNOLOGY_TESTING",
      "FORMAL_CONFORMANCE_EVIDENCE"
    ])
  }),
  "PF-07": Object.freeze({
    productFormCode: "PF-07",
    canonicalName: "Vertical Graphic Edition",
    publicQualifier: "Webtoon",
    status: "PROVISIONAL_NON_PUBLIC",
    slotEligibility: "NEVER",
    commercialAvailability: "NONE",
    authorSelectionExposure: false,
    publicPricingExposure: false,
    catalogMerchandisingExposure: false,
    pilotPlanningAmount: 1200,
    episodePlanningAmount: 850,
    planningAmountsAreCommercialPrices: false,
    imprintPriorities: Object.freeze(["JM Little", "JM Verse"]),
    activationRequirement: "JACKIE_APPROVAL_AFTER_PRODUCTION_PARTNER_VALIDATION"
  }),
  "PF-08": Object.freeze({
    productFormCode: "PF-08",
    canonicalName: "Interactive/Multimedia Edition",
    slotEligibility: "NEVER",
    commercialTreatment: "PROGRAM_ONLY",
    startingPrice: 1500,
    priceRequiresApprovedScopeCap: true,
    requiredScopeCap: Object.freeze([
      "MAXIMUM_MEDIA_ASSETS",
      "MAXIMUM_INTERACTIVE_COMPONENTS",
      "NO_CUSTOM_APPLICATION_LOGIC",
      "PRODUCTION_READY_SUPPLIED_MEDIA",
      "ONE_VALIDATION_REVISION_CYCLE",
      "CUSTOM_SOW_THRESHOLD"
    ]),
    imprintPriority: "JM Works",
    publicSaleAllowedBeforeScopeCap: false
  })
});

const PRODUCT_FORM_CODES = Object.freeze(Object.keys(PRODUCT_FORM_REGISTRY));

const TITLE_EDITION_PLAN_SCHEMA = Object.freeze([
  "titleEditionId",
  "titleId",
  "editionPlanId",
  "productFormCode",
  "productFormName",
  "editionStatus",
  "selectionStatus",
  "packageSlotStatus",
  "commercialEligibility",
  "runtimeCommissioningStatus",
  "isbnRequirement",
  "isbn",
  "productionAttributes",
  "releaseModel",
  "productionMode",
  "productionStatus",
  "qaStatus",
  "commercialStatus",
  "distributionStatus",
  "blocker",
  "blockerOwner",
  "nextAutomaticAction"
]);

function buildProductionPipelineV2Doctrine() {
  return {
    version: PIPELINE_VERSION,
    approvedBy: "Jackie Smith, Jr.",
    decisions: {
      coverBeginsAfterProofreadingApproval: true,
      interiorAndCoverExecuteInParallel: true,
      unifiedProductionReviewPackage: true,
      epubRequiredBeforeDistributionReadiness: true,
      titleEditionPlanReplacesGenericFormatPlan: true,
      productFormCodeIsCommercialIdentity: true
    },
    trigger: "PROOFREADING_APPROVED",
    branches: [
      {
        branch: "INTERIOR",
        startsAt: "PRODUCTION_START",
        stages: ["INTERIOR_LAYOUT", "INTERIOR_QA"],
        deliverables: ["INTERIOR_PDF", "INTERIOR_PRODUCTION_PACKAGE", "INTERIOR_QA"]
      },
      {
        branch: "COVER",
        startsAt: "PRODUCTION_START",
        stages: ["COVER_DESIGN", "COVER_QA"],
        deliverables: ["PRINT_WRAP", "EBOOK_COVER", "PRODUCTION_ARTWORK", "COVER_QA"]
      }
    ],
    convergence: AUTHOR_REVIEW_PACKAGE,
    postAuthorApproval: [
      "PRODUCTION_ASSEMBLY",
      "EPUB_GENERATION",
      "ACCESSIBILITY_QA",
      "METADATA_VALIDATION",
      "DISTRIBUTION_READINESS",
      "MOCK_DISTRIBUTION",
      "PUBLISHER_VALIDATION",
      "LIVE_DISTRIBUTION",
      "POST_RELEASE_VERIFICATION"
    ],
    productionAssembly: {
      stage: "PRODUCTION_ASSEMBLY",
      failsClosed: true,
      requiredArtifacts: PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS,
      editionAware: true
    },
    epubGeneration: {
      stage: "EPUB_GENERATION",
      before: "DISTRIBUTION_READINESS",
      failureEvent: "PRODUCTION_ASSEMBLY_BLOCKED",
      requiredEvidence: ["VALIDATED_EPUB", "NAVIGATION", "METADATA", "ACCESSIBILITY_TAGGING", "QA_EVIDENCE"]
    },
    mockDistribution: {
      stage: "MOCK_DISTRIBUTION",
      requiredEvidence: [
        "DISTRIBUTOR_PAYLOADS",
        "METADATA",
        "ISBN_MAPPING",
        "PRICING",
        "TERRITORIES",
        "TITLE_EDITION_PLAN",
        "ACCESSIBILITY_ASSETS",
        "RETAILER_COMPATIBILITY",
        "EXECUTION_LOGGING"
      ],
      forbiddenActions: MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS
    },
    publisherValidation: {
      stage: "PUBLISHER_VALIDATION",
      requiredDecision: "PUBLISHER_PUBLICATION_READINESS_APPROVAL",
      authorFacing: false
    },
    taxonomy: PRODUCTION_TAXONOMY,
    timingGovernance: TIMING_GOVERNANCE,
    titleEditionPlan: {
      eventName: "TITLE_EDITION_PLAN",
      recordName: "TITLE_EDITION_RECORD",
      productFormIdentity: "PRODUCT_FORM_CODE",
      attributeName: "EDITION_ATTRIBUTE",
      releaseModelName: "RELEASE_MODEL",
      schema: TITLE_EDITION_PLAN_SCHEMA,
      productForms: PRODUCT_FORM_REGISTRY,
      releaseModels: RELEASE_MODELS,
      productionModes: PRODUCTION_MODES,
      defaultReleaseSetPolicy: "ALL_SELECTED_EDITIONS_RELEASE_TOGETHER"
    },
    activeTitleMigration: {
      "The Intentional Leader": "Continue current live-release certification; apply v2.0 to future editions or production revisions after the current path completes."
    },
    backwardCompatibility: {
      rewriteHistoricalStages: false,
      supportedAliases: {
        INTERIOR_REVIEW: "PRODUCTION_REVIEW_PACKAGE",
        COVER_REVIEW: "PRODUCTION_REVIEW_PACKAGE",
        PRODUCTION_PROOF: "DISTRIBUTION_READINESS",
        TITLE_FORMAT_PLAN: "TITLE_EDITION_PLAN",
        TITLE_FORMAT_RECORD: "TITLE_EDITION_RECORD",
        formatCode: "productFormCode"
      }
    }
  };
}

function getProductForm(productFormCode) {
  return PRODUCT_FORM_REGISTRY[productFormCode] || null;
}

function createTitleEditionRecord({
  titleEditionId,
  titleId,
  editionPlanId,
  productFormCode,
  editionStatus = "PLANNED",
  selectionStatus = "OPTIONAL_NOT_SELECTED",
  packageSlotStatus,
  commercialEligibility,
  runtimeCommissioningStatus = "NOT_STARTED",
  isbn = "",
  productionAttributes = {},
  releaseModel = "STANDARD_RELEASE",
  productionMode = "HYBRID",
  productionStatus = "NOT_STARTED",
  qaStatus = "NOT_STARTED",
  commercialStatus = "NOT_STARTED",
  distributionStatus = "NOT_STARTED",
  blocker = "",
  blockerOwner = "",
  nextAutomaticAction = ""
}) {
  const productForm = getProductForm(productFormCode);
  if (!productForm) {
    return { ok: false, error: "PRODUCT_FORM_CODE_NOT_REGISTERED", productFormCode };
  }
  if (!RELEASE_MODELS.includes(releaseModel)) {
    return { ok: false, error: "RELEASE_MODEL_NOT_REGISTERED", releaseModel };
  }
  if (!PRODUCTION_MODES.includes(productionMode)) {
    return { ok: false, error: "PRODUCTION_MODE_NOT_REGISTERED", productionMode };
  }

  return {
    ok: true,
    record: {
      titleEditionId,
      titleId,
      editionPlanId,
      productFormCode,
      productFormName: productForm.canonicalName,
      editionStatus,
      selectionStatus,
      packageSlotStatus: packageSlotStatus || resolvePackageSlotEligibility(productFormCode, productionAttributes).slotEligibility,
      commercialEligibility: commercialEligibility || resolveCommercialEligibility(productFormCode, productionAttributes),
      runtimeCommissioningStatus,
      isbnRequirement: productForm.isbnPolicy,
      isbn,
      productionAttributes,
      releaseModel,
      productionMode,
      productionStatus,
      qaStatus,
      commercialStatus,
      distributionStatus,
      blocker,
      blockerOwner,
      nextAutomaticAction
    }
  };
}

function resolvePackageSlotEligibility(productFormCode, attributes = {}) {
  if (productFormCode === "PF-04") return { slotEligible: false, slotEligibility: "NEVER", premiumRequired: false };
  if (productFormCode === "PF-07") return { slotEligible: false, slotEligibility: "NEVER", premiumRequired: false };
  if (productFormCode === "PF-08") return { slotEligible: false, slotEligibility: "NEVER", premiumRequired: false };
  if (productFormCode === "PF-06") return { slotEligible: true, slotEligibility: "PREMIUM_SLOT_ONLY", premiumRequired: true, inSlotPremiumUpcharge: 650, beyondSlotAddOnPrice: 1000 };
  if (productFormCode === "PF-05" && attributes.complexity === "COMPLEX") {
    return { slotEligible: true, slotEligibility: "STANDARD_SLOT_WITH_PREMIUM_UPCHARGE", premiumRequired: true, inSlotPremiumUpcharge: 250, beyondSlotAddOnPrice: 600 };
  }
  const productForm = getProductForm(productFormCode);
  return {
    slotEligible: productForm ? productForm.slotEligibility !== "NEVER" : false,
    slotEligibility: productForm?.slotEligibility || "UNKNOWN_PRODUCT_FORM",
    premiumRequired: false
  };
}

function resolveCommercialEligibility(productFormCode, attributes = {}) {
  if (productFormCode === "PF-07") return "PROVISIONAL_NOT_AVAILABLE";
  if (productFormCode === "PF-08" && !attributes.scopeCapApproved) return "PROGRAM_ONLY_SCOPE_CAP_REQUIRED";
  return "ELIGIBLE_SUBJECT_TO_PACKAGE_POLICY";
}

function buildStandardEbookEdition({ titleId, editionPlanId, isbn, retailerProducts = [] }) {
  const edition = createTitleEditionRecord({
    titleEditionId: `${titleId}-PF-03`,
    titleId,
    editionPlanId,
    productFormCode: "PF-03",
    selectionStatus: "SELECTED_INCLUDED_SLOT",
    isbn,
    productionAttributes: {
      accessibilityProfile: "BORN_ACCESSIBLE_REQUIRED",
      technicalProfile: "STANDARD_REFLOWABLE_EPUB_3",
      retailerProducts
    }
  });
  return {
    ...edition,
    editionCount: edition.ok ? 1 : 0,
    isbnCount: isbn ? 1 : 0,
    retailerEditionRecordsCreated: 0,
    accessibilityCreatesSeparateEdition: false,
    accessibilityConsumesPackageSlot: false
  };
}

function resolveAudiobookCommercials({ narrationMethod = "AI", packageName = "", selected = true }) {
  const form = PRODUCT_FORM_REGISTRY["PF-04"];
  const validMethod = form.narrationMethods.includes(narrationMethod);
  const humanNarration = narrationMethod === "HUMAN_SINGLE_VOICE" || narrationMethod === "HUMAN_MULTI_VOICE";
  return {
    ok: validMethod,
    productFormCode: "PF-04",
    narrationMethod,
    selected,
    slotEligible: false,
    consumesPackageSlot: false,
    pricing:
      narrationMethod === "AI"
        ? form.aiNarration
        : narrationMethod === "HUMAN_SINGLE_VOICE"
          ? form.humanSingleVoice
          : form.humanMultiVoice,
    premierSwap:
      packageName === "Premier" && humanNarration
        ? form.premierSwapRule
        : null,
    error: validMethod ? "" : "NARRATION_METHOD_NOT_REGISTERED"
  };
}

function resolveLargePrintCommercials({ complexity = "STANDARD", selectedBeyondSlot = false }) {
  const form = PRODUCT_FORM_REGISTRY["PF-05"];
  if (!form.complexityValues.includes(complexity)) {
    return { ok: false, error: "LARGE_PRINT_COMPLEXITY_NOT_REGISTERED", complexity };
  }
  return {
    ok: true,
    productFormCode: "PF-05",
    complexity,
    complexityCreatesProductForm: false,
    productFormCount: 1,
    price: complexity === "STANDARD" ? form.standardPrice : selectedBeyondSlot ? form.complexBeyondSlotAddOnPrice : form.complexInSlotPremiumUpcharge,
    slotEligibility: resolvePackageSlotEligibility("PF-05", { complexity })
  };
}

function evaluateComplexAccessibilityEdition({ triggerConditions = [], selectedBeyondSlot = false }) {
  const form = PRODUCT_FORM_REGISTRY["PF-06"];
  const validTriggers = triggerConditions.filter((trigger) => form.triggerConditions.includes(trigger));
  const required = validTriggers.length > 0;
  return {
    productFormCode: "PF-06",
    required,
    validTriggers,
    pf03RemainsAccessibleByDefault: true,
    purpose: "COMPLEX_CONTENT_REMEDIATION",
    price: selectedBeyondSlot ? form.beyondSlotAddOnPrice : form.inSlotPremiumUpcharge,
    slotEligibility: resolvePackageSlotEligibility("PF-06")
  };
}

function validateProvisionalProductFormExposure(productFormCode, exposure = {}) {
  const form = getProductForm(productFormCode);
  if (!form) return { ok: false, error: "PRODUCT_FORM_CODE_NOT_REGISTERED" };
  if (productFormCode === "PF-07") {
    const exposureKeys = ["public", "sellable", "inquiryOnly", "authorSelection", "publicPricing", "catalogMerchandising"];
    const violations = exposureKeys.filter((key) => Boolean(exposure[key]));
    return {
      ok: violations.length === 0,
      productFormCode,
      violations,
      status: form.status
    };
  }
  return { ok: true, productFormCode, violations: [] };
}

function validateInteractiveScopeCap(attributes = {}) {
  const missing = PRODUCT_FORM_REGISTRY["PF-08"].requiredScopeCap.filter((key) => !attributes[key]);
  return {
    ok: missing.length === 0 && attributes.scopeCapApproved === true,
    productFormCode: "PF-08",
    commercialTreatment: "PROGRAM_ONLY",
    startingPriceActive: missing.length === 0 && attributes.scopeCapApproved === true,
    missingScopeCapItems: missing,
    blocker: missing.length > 0 || attributes.scopeCapApproved !== true ? "CUSTOM_SOW_REQUIRED" : ""
  };
}

function deriveProductionObligations(editionRecords) {
  const selected = (editionRecords || []).filter((record) => String(record.selectionStatus || "").startsWith("SELECTED"));
  const obligations = new Set(["SHARED_MANUSCRIPT_SOURCE"]);
  const blockers = [];

  selected.forEach((record) => {
    const form = getProductForm(record.productFormCode);
    if (!form) {
      blockers.push({ productFormCode: record.productFormCode, blocker: "PRODUCT_FORM_CODE_NOT_REGISTERED" });
      return;
    }
    (form.requiredProductionObligations || []).forEach((obligation) => obligations.add(obligation));
    if (record.productFormCode === "PF-03") obligations.add("BASELINE_ACCESSIBILITY_QA");
    if (record.productFormCode === "PF-04") obligations.add("AUDIO_PRODUCTION_PATH");
    if (record.productFormCode === "PF-05" && record.productionAttributes?.complexity === "COMPLEX") obligations.add("LARGE_PRINT_COMPLEX_LAYOUT_TREATMENT");
    if (record.productFormCode === "PF-06") obligations.add("COMPLEX_ACCESSIBILITY_REMEDIATION_EVIDENCE");
  });

  return {
    selectedEditionCount: selected.length,
    obligations: [...obligations],
    blockers
  };
}

function validateEditionAwareAssembly(editionRecords) {
  const results = (editionRecords || []).map((edition) => {
    const selected = String(edition.selectionStatus || "").startsWith("SELECTED");
    if (!selected) {
      return {
        productFormCode: edition.productFormCode,
        blocksTitleReadiness: false,
        status: "UNSELECTED_EDITION_DOES_NOT_BLOCK"
      };
    }
    if (edition.productFormCode === "PF-07") {
      return {
        productFormCode: edition.productFormCode,
        blocksTitleReadiness: true,
        status: "PROVISIONAL_PRODUCT_FORM_BLOCKED",
        blocker: "PF-07 requires separate Jackie approval after production-partner validation."
      };
    }
    if (edition.productFormCode === "PF-08" && !edition.productionAttributes?.scopeCapApproved) {
      return {
        productFormCode: edition.productFormCode,
        blocksTitleReadiness: true,
        status: "PROGRAM_ONLY_SCOPE_CAP_REQUIRED",
        blocker: "PF-08 requires approved scope cap before ordinary Production Assembly."
      };
    }
    const missing = ["productionEvidence", "qaEvidence", "isbnStatus", "commercialMetadata", "pricingStatus", "distributionPayload"]
      .filter((field) => !edition[field]);
    return {
      productFormCode: edition.productFormCode,
      blocksTitleReadiness: missing.length > 0,
      status: missing.length > 0 ? "EDITION_ASSEMBLY_BLOCKED" : "EDITION_ASSEMBLY_READY",
      missing
    };
  });
  return {
    ok: results.every((result) => !result.blocksTitleReadiness),
    results
  };
}

function resolveReleaseSetPolicy(editionRecords, policy = "ALL_SELECTED_EDITIONS_RELEASE_TOGETHER") {
  const selected = (editionRecords || []).filter((record) => String(record.selectionStatus || "").startsWith("SELECTED"));
  const blocked = selected.filter((record) => record.productionStatus !== "READY" || record.qaStatus !== "PASSED" || record.distributionStatus === "BLOCKED");
  if (policy === "READY_EDITIONS_MAY_RELEASE_INDEPENDENTLY") {
    return { ok: selected.some((record) => !blocked.includes(record)), policy, blockedProductForms: blocked.map((record) => record.productFormCode) };
  }
  if (policy === "PUBLISHER_DECISION_REQUIRED_FOR_PARTIAL_RELEASE") {
    return { ok: blocked.length === 0, policy, publisherDecisionRequired: blocked.length > 0, blockedProductForms: blocked.map((record) => record.productFormCode) };
  }
  return { ok: blocked.length === 0, policy, blockedProductForms: blocked.map((record) => record.productFormCode) };
}

function reconcileLegacyCatalogOverlap(legacyRecord) {
  const name = String(legacyRecord?.name || legacyRecord || "");
  if (/dyslexia-friendly/i.test(name)) {
    return {
      legacyRecord: name,
      canonicalMapping: "REQUIRES_JACKIE_DECISION_PF03_ATTRIBUTE_PF05_TREATMENT_PF06_PROFILE_OR_SERVICE",
      recommendedDisposition: "JACKIE_REVIEW_REQUIRED",
      commercialImpact: "Prevent duplicate active commercial product until mapped.",
      migrationRequired: false,
      JackieDecisionRequired: true
    };
  }
  if (/interactive ebook/i.test(name)) {
    return {
      legacyRecord: name,
      canonicalMapping: "PF-08",
      recommendedDisposition: "PRESERVE_HISTORY_PREVENT_DUPLICATE_ACTIVE_SKU",
      commercialImpact: "Program-only product must remain inactive until scope cap approval.",
      migrationRequired: true,
      JackieDecisionRequired: true
    };
  }
  return {
    legacyRecord: name,
    canonicalMapping: "NO_CANONICAL_OVERLAP_IDENTIFIED",
    recommendedDisposition: "NO_ACTION",
    commercialImpact: "None identified.",
    migrationRequired: false,
    JackieDecisionRequired: false
  };
}

function createParallelProductionWork({ titleId, stageId, approvedSourceArtifactId, sourceChecksum, correlationId }) {
  const missing = [];
  if (!titleId) missing.push("titleId");
  if (!stageId) missing.push("stageId");
  if (!approvedSourceArtifactId) missing.push("approvedSourceArtifactId");
  if (!sourceChecksum) missing.push("sourceChecksum");
  if (missing.length > 0) {
    return {
      ok: false,
      event: "PRODUCTION_START_BLOCKED",
      missing
    };
  }

  const base = {
    titleId,
    sourceStageId: stageId,
    approvedSourceArtifactId,
    sourceChecksum,
    correlationId: correlationId || `production-start-${titleId}-${stageId}`
  };

  return {
    ok: true,
    events: [
      { eventType: PRODUCTION_WORK_EVENTS.PRODUCTION_START_CREATED, scope: { titleId, stageId } },
      { eventType: PRODUCTION_WORK_EVENTS.INTERIOR_LAYOUT_WORK_CREATED, scope: { titleId, stageId: "INTERIOR_LAYOUT" } },
      { eventType: PRODUCTION_WORK_EVENTS.COVER_DESIGN_WORK_CREATED, scope: { titleId, stageId: "COVER_DESIGN" } }
    ],
    workItems: [
      {
        ...base,
        workstream: "INTERIOR_LAYOUT",
        owner: "JM1 Automation",
        status: "QUEUED",
        retryable: true,
        dependsOn: []
      },
      {
        ...base,
        workstream: "COVER_DESIGN",
        owner: "JM1 Automation",
        status: "QUEUED",
        retryable: true,
        dependsOn: []
      }
    ]
  };
}

function validateProductionAssembly(artifacts) {
  const available = new Set((artifacts || []).map((artifact) => typeof artifact === "string" ? artifact : artifact.artifactType));
  const missing = PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS
    .filter((artifact) => !available.has(artifact))
    .map((artifact) => ({
      missingArtifact: artifact,
      owner: artifact === "PRICING" || artifact === "BISAC_BIC" || artifact === "KEYWORDS" ? "Publisher" : "JM1 Automation",
      blockingReason: `${artifact} is required before distribution activity begins.`,
      nextAutomaticAction: artifact === "EPUB" ? "Run EPUB_GENERATION workflow after approved interior is available." : "Requeue Production Assembly after the artifact is registered."
    }));
  return {
    ok: missing.length === 0,
    missing,
    event: missing.length === 0 ? "PRODUCTION_ASSEMBLY_READY" : "PRODUCTION_ASSEMBLY_BLOCKED"
  };
}

function canEnterDistributionReadiness(completedStages) {
  const completed = new Set(completedStages || []);
  return {
    ok: completed.has("EPUB_GENERATION") && completed.has("ACCESSIBILITY_QA") && completed.has("METADATA_VALIDATION"),
    blockers: [
      !completed.has("EPUB_GENERATION") ? "EPUB_GENERATION_REQUIRED" : null,
      !completed.has("ACCESSIBILITY_QA") ? "ACCESSIBILITY_QA_REQUIRED" : null,
      !completed.has("METADATA_VALIDATION") ? "METADATA_VALIDATION_REQUIRED" : null
    ].filter(Boolean)
  };
}

function validateEpubWorkflow({ epubArtifact, accessibilityEvidence, metadataEvidence }) {
  const failures = [];
  if (!epubArtifact?.structureValid) failures.push("EPUB_STRUCTURE_INVALID");
  if (!epubArtifact?.navigationValid) failures.push("EPUB_NAVIGATION_INVALID");
  if (!epubArtifact?.tableOfContentsValid) failures.push("EPUB_TOC_INVALID");
  if (!epubArtifact?.metadataValid) failures.push("EPUB_METADATA_INVALID");
  if (!accessibilityEvidence?.taggingValid) failures.push("ACCESSIBILITY_TAGGING_INVALID");
  if (!metadataEvidence?.complete) failures.push("METADATA_INCOMPLETE");

  return {
    ok: failures.length === 0,
    events: failures.length === 0
      ? [
          PRODUCTION_WORK_EVENTS.EPUB_GENERATED,
          PRODUCTION_WORK_EVENTS.EPUB_VALIDATED,
          PRODUCTION_WORK_EVENTS.ACCESSIBILITY_VALIDATED,
          PRODUCTION_WORK_EVENTS.METADATA_VALIDATED
        ]
      : failures.map((failure) => {
          if (failure.startsWith("ACCESSIBILITY")) return "ACCESSIBILITY_VALIDATION_FAILED";
          if (failure.startsWith("METADATA")) return "METADATA_VALIDATION_FAILED";
          return "EPUB_GENERATION_FAILED";
        }),
    failures
  };
}

function buildProductionReviewPackageManifest(artifacts) {
  const required = AUTHOR_REVIEW_PACKAGE.requiredArtifacts;
  const available = new Set((artifacts || []).map((artifact) => artifact.role));
  const missing = required.filter((role) => !available.has(role));
  return {
    packageType: "PRODUCTION_REVIEW_PACKAGE",
    authorFacingLabel: "Production Review Package",
    separateInteriorReviewAllowed: false,
    separateCoverReviewAllowed: false,
    requiredArtifacts: required,
    missingArtifacts: missing,
    ok: missing.length === 0
  };
}

function validateMockDistribution(inputs) {
  const required = [
    "printPackage",
    "epub",
    "accessibility",
    "isbn",
    "pricing",
    "territories",
    "bisac",
    "keywords",
    "metadata",
    "cover",
    "spine",
    "trim",
    "distributorPayloads"
  ];
  const failures = required.filter((key) => !inputs?.[key]).map((key) => `${key.toUpperCase()}_MISSING`);
  const forbidden = MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS.filter((action) => (inputs?.attemptedActions || []).includes(action));
  return {
    ok: failures.length === 0 && forbidden.length === 0,
    event: failures.length === 0 && forbidden.length === 0
      ? PRODUCTION_WORK_EVENTS.DISTRIBUTOR_VALIDATION_PASSED
      : PRODUCTION_WORK_EVENTS.DISTRIBUTOR_VALIDATION_FAILED,
    failures,
    forbiddenActionsDetected: forbidden
  };
}

function buildPublisherValidationChecklist(evidence) {
  const checks = [
    ["interiorApproved", "Interior approved"],
    ["coverApproved", "Cover approved"],
    ["epubApproved", "EPUB approved"],
    ["accessibilityApproved", "Accessibility approved"],
    ["metadataComplete", "Metadata complete"],
    ["pricingApproved", "Pricing approved"],
    ["bisacApproved", "BISAC approved"],
    ["keywordsApproved", "Keywords approved"],
    ["mockDistributionPassed", "Mock Distribution passed"],
    ["productionPackageFrozen", "Production package frozen"],
    ["publicationDateApproved", "Publication date approved"]
  ].map(([key, label]) => ({
    key,
    label,
    passed: Boolean(evidence?.[key])
  }));
  const missing = checks.filter((check) => !check.passed);
  return {
    stage: "PUBLISHER_VALIDATION",
    ok: missing.length === 0,
    checks,
    missing: missing.map((check) => check.key),
    availableDecision: missing.length === 0 ? "LIVE_DISTRIBUTION_APPROVED" : "PUBLISHER_VALIDATION_BLOCKED"
  };
}

const ILL_PROGRAM_DEFINITION = Object.freeze({
  programFamilyCode: "ILL",
  programName: "Interior Illustration Program",
  classification: "PRODUCTION_PROGRAM",
  isbnBearing: false,
  createsTitleEdition: false,
  scopeUnit: "PER_ILLUSTRATION",
  architectureStatus: "IMPLEMENTED",
  technicalValidationStatus: "PASSED",
  schemaStatus: "CODE_OR_DOCUMENT_MODEL_ONLY",
  policyStatus: "CANON_CANDIDATE",
  pricingStatus: "NOT_APPROVED",
  runtimeCommissioningStatus: "NOT_COMMISSIONED_FOR_LIVE_CLIENT",
  commercialAvailability: "NOT_ACTIVE",
  publicStatus: "PROHIBITED",
  publicAvailability: "PROHIBITED",
  controlledTitleProofStatus: "NOT_COMPLETED",
  controlledProofStatus: "NOT_COMPLETED",
  canonStatus: "CANON_CANDIDATE",
  events: Object.freeze(["ILL_UNAPPROVED_PRICING_NEUTRALIZED", "ILL_COMMERCIAL_ACTIVATION_WITHHELD"])
});

const ILLUSTRATION_PRICING_CONFIG = Object.freeze({
  "JMP-ILL-AI-STD": Object.freeze({
    code: "JMP-ILL-AI-STD",
    method: "AI",
    pricingMethod: "PENDING_JACKIE_UNIT_PRICE",
    configuredAmount: "PENDING_JACKIE_UNIT_PRICE",
    currency: "USD",
    formerConfiguredAmount: 75,
    formerAmountSource: "NON_GOVERNING_REFERENCE_NOT_FOR_QUOTE_NOT_FOR_INVOICE_NOT_FOR_PUBLICATION",
    approvalSource: "NONE_FOUND",
    JackieRulingReference: "",
    governanceStatus: "CANON_CANDIDATE",
    commercialStatus: "NOT_ACTIVE",
    publicExposure: "PROHIBITED",
    runtimeUsage: "CONTROLLED_VALIDATION_ONLY"
  }),
  "JMP-ILL-HUMAN-STD": Object.freeze({
    code: "JMP-ILL-HUMAN-STD",
    method: "HUMAN",
    pricingMethod: "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED",
    configuredAmount: "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED",
    currency: "USD",
    formerConfiguredAmount: 250,
    formerAmountSource: "NON_GOVERNING_REFERENCE_NOT_FOR_QUOTE_NOT_FOR_INVOICE_NOT_FOR_PUBLICATION",
    approvalSource: "NONE_FOUND",
    JackieRulingReference: "",
    governanceStatus: "CANON_CANDIDATE",
    commercialStatus: "NOT_ACTIVE",
    publicExposure: "PROHIBITED",
    runtimeUsage: "CONTROLLED_VALIDATION_ONLY"
  }),
  "JMP-ILL-HYBRID": Object.freeze({
    code: "JMP-ILL-HYBRID",
    method: "HYBRID",
    pricingMethod: "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED",
    configuredAmount: "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED",
    currency: "USD",
    formerConfiguredAmount: 175,
    formerAmountSource: "NON_GOVERNING_REFERENCE_NOT_FOR_QUOTE_NOT_FOR_INVOICE_NOT_FOR_PUBLICATION",
    approvalSource: "NONE_FOUND",
    JackieRulingReference: "",
    governanceStatus: "CANON_CANDIDATE",
    commercialStatus: "NOT_ACTIVE",
    publicExposure: "PROHIBITED",
    runtimeUsage: "CONTROLLED_VALIDATION_ONLY"
  }),
  "JMP-ILL-COVER-ADD": Object.freeze({
    code: "JMP-ILL-COVER-ADD",
    method: "COVER_ADD_ON",
    pricingMethod: "PENDING_JACKIE_PRICING_METHOD_AND_AMOUNT",
    configuredAmount: "PENDING_JACKIE_PRICING_METHOD_AND_AMOUNT",
    currency: "USD",
    formerConfiguredAmount: 350,
    formerAmountSource: "NON_GOVERNING_REFERENCE_NOT_FOR_QUOTE_NOT_FOR_INVOICE_NOT_FOR_PUBLICATION",
    approvalSource: "NONE_FOUND",
    JackieRulingReference: "",
    governanceStatus: "CANON_CANDIDATE",
    commercialStatus: "NOT_ACTIVE",
    publicExposure: "PROHIBITED",
    runtimeUsage: "CONTROLLED_VALIDATION_ONLY"
  }),
  "JMP-ILL-CUSTOM": Object.freeze({
    code: "JMP-ILL-CUSTOM",
    method: "CUSTOM",
    pricingMethod: "CUSTOM_SOW",
    configuredAmount: "CUSTOM_SOW",
    currency: "USD",
    formerConfiguredAmount: "",
    formerAmountSource: "NOT_APPLICABLE",
    approvalSource: "CUSTOM_SOW_REQUIRED",
    JackieRulingReference: "",
    governanceStatus: "CANON_CANDIDATE",
    commercialStatus: "NOT_ACTIVE",
    publicExposure: "PROHIBITED",
    runtimeUsage: "CONTROLLED_VALIDATION_ONLY"
  })
});

const ILLUSTRATION_ASSET_SCHEMA = Object.freeze([
  "illustrationAssetId",
  "titleId",
  "programFamilyCode",
  "productionMethod",
  "brief",
  "sourceArtifactId",
  "finalArtifactId",
  "provenance",
  "rightsClearanceStatus",
  "authorApprovalStatus",
  "publisherApprovalStatus",
  "editionMappings",
  "accessibilityTreatment",
  "creditRequirement"
]);

function getIllustrationPricingConfig(code) {
  return ILLUSTRATION_PRICING_CONFIG[code] || null;
}

function auditIllustrationPricingAuthority() {
  return Object.values(ILLUSTRATION_PRICING_CONFIG).map((record) => ({
    record: record.code,
    configuredPricingMethod: record.pricingMethod,
    configuredAmount: record.configuredAmount,
    currency: record.currency,
    approvalSource: record.approvalSource,
    JackieRulingReference: record.JackieRulingReference,
    governanceStatus: record.governanceStatus,
    commercialStatus: record.commercialStatus,
    publicExposure: record.publicExposure,
    runtimeUsage: record.runtimeUsage,
    formerConfiguredAmount: record.formerConfiguredAmount,
    formerAmountSource: record.formerAmountSource
  }));
}

function validateIllustrationCommercialBoundary() {
  return {
    ok: Object.values(ILLUSTRATION_PRICING_CONFIG).every((record) =>
      record.commercialStatus === "NOT_ACTIVE" &&
      record.publicExposure === "PROHIBITED" &&
      record.runtimeUsage === "CONTROLLED_VALIDATION_ONLY" &&
      (record.configuredAmount === "PENDING_JACKIE_UNIT_PRICE" ||
        record.configuredAmount === "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED" ||
        record.configuredAmount === "PENDING_JACKIE_PRICING_METHOD_AND_AMOUNT" ||
        record.configuredAmount === "CUSTOM_SOW")
    ),
    events: ["ILL_UNAPPROVED_PRICING_NEUTRALIZED", "ILL_COMMERCIAL_ACTIVATION_WITHHELD"],
    prohibitedUses: [
      "PUBLIC_WEBSITE_COPY",
      "AUTHOR_SELECTION_OPTIONS",
      "PACKAGE_ENTITLEMENTS",
      "ACTIVE_SKUS",
      "ACTIVE_PRICE_RULES",
      "CONTRACTS",
      "INVOICES",
      "BUSINESS_CENTRAL_ITEMS",
      "FINANCIAL_POSTINGS",
      "ROYALTY_LOGIC",
      "LIVE_CLIENT_COMMITMENTS"
    ]
  };
}

function validateIllustrationScope(scope = {}) {
  const required = [
    "illustrationCount",
    "illustrationTypes",
    "standardOrCustomComplexity",
    "productionMethod",
    "revisionRounds",
    "editionUsage",
    "deliverySpecifications",
    "pricingMethod",
    "rightsTreatment",
    "creditTreatment",
    "targetCompletion"
  ];
  const missing = required.filter((key) => scope[key] === undefined || scope[key] === null || scope[key] === "");
  const pricing = getIllustrationPricingConfig(scope.pricingMethod);
  if (!pricing) missing.push("pricingAuthority");
  if (pricing && pricing.configuredAmount !== "CUSTOM_SOW" && pricing.JackieRulingReference === "") missing.push("pricingAuthority");
  if (pricing?.configuredAmount === "QUOTE_REQUIRED — STARTING_PRICE_NOT_APPROVED" && !scope.quotedAmount) missing.push("quotedAmount");
  if (pricing?.configuredAmount === "CUSTOM_SOW" && !scope.customSowId) missing.push("customSowId");
  return {
    ok: missing.length === 0,
    programFamilyCode: "ILL",
    event: missing.length === 0 ? "ILLUSTRATION_SCOPE_APPROVED" : "ILLUSTRATION_SCOPE_BLOCKED",
    pricing,
    missing,
    createsTitleEdition: false,
    isbnBearing: false
  };
}

function validateIllustrationRights(asset = {}) {
  const blockers = [];
  if (asset.productionMethod === "AI" && !asset.aiDisclosure) blockers.push("AI_DISCLOSURE_REQUIRED");
  if (asset.productionMethod === "AI" && !asset.toolModelRecord) blockers.push("TOOL_MODEL_RECORD_REQUIRED");
  if (asset.referenceAssetsUsed && !asset.referenceAssetClearance) blockers.push("REFERENCE_ASSET_CLEARANCE_REQUIRED");
  if (asset.livingArtistImitation === true) blockers.push("LIVING_ARTIST_IMITATION_PROHIBITED");
  if (asset.thirdPartyContentUsed && !asset.thirdPartyContentClearance) blockers.push("THIRD_PARTY_CONTENT_CLEARANCE_REQUIRED");
  if ((asset.productionMethod === "HUMAN" || asset.productionMethod === "HYBRID") && !asset.humanIllustratorAgreement) {
    blockers.push("HUMAN_ILLUSTRATOR_AGREEMENT_REQUIRED");
  }
  if (!asset.licenseOrOwnershipTreatment) blockers.push("LICENSE_OR_OWNERSHIP_TREATMENT_REQUIRED");
  if (!asset.editionAndMarketingUsage) blockers.push("EDITION_AND_MARKETING_USAGE_REQUIRED");
  if (asset.creditRequired && !asset.creditText) blockers.push("CREDIT_TEXT_REQUIRED");
  return {
    ok: blockers.length === 0,
    rightsClearanceStatus: blockers.length === 0 ? "RIGHTS_CLEARANCE_PASSED" : "RIGHTS_CLEARANCE_BLOCKED",
    aiProvenanceStatus: asset.productionMethod === "AI" && (!asset.aiDisclosure || !asset.toolModelRecord) ? "AI_PROVENANCE_INCOMPLETE" : "AI_PROVENANCE_COMPLETE",
    humanAgreementStatus: asset.humanIllustratorAgreement ? "HUMAN_ILLUSTRATOR_AGREEMENT_COMPLETE" : "",
    blocksInteriorLayout: blockers.length > 0,
    blockers
  };
}

function requiresIllustrationStyleGuide(scope = {}) {
  const reasons = [];
  if ((scope.illustrationCount || 0) > 4) reasons.push("ILLUSTRATION_COUNT_EXCEEDS_FOUR");
  if (scope.recurringCharacters) reasons.push("RECURRING_CHARACTERS");
  if (scope.pictureBook) reasons.push("PICTURE_BOOK");
  if (scope.seriesTitle) reasons.push("SERIES_TITLE");
  if ((scope.creatorCount || 0) > 1 || (scope.methodCount || 0) > 1) reasons.push("MULTIPLE_CREATORS_OR_METHODS");
  if (scope.imprintPolicyRequiresStyleGuide) reasons.push("IMPRINT_POLICY_REQUIRES_STYLE_GUIDE");
  return {
    required: reasons.length > 0,
    reasons,
    rosterPolicy: "JM Little preferred-illustrator roster is nonexclusive and does not create permanent exclusivity."
  };
}

function mapIllustrationAssetToEditions(asset = {}, editionRecords = []) {
  const selectedCodes = new Set((editionRecords || []).filter((record) => String(record.selectionStatus || "").startsWith("SELECTED")).map((record) => record.productFormCode));
  const mappings = (asset.editionMappings || [])
    .filter((mapping) => selectedCodes.has(mapping.productFormCode))
    .map((mapping) => ({
      illustrationAssetId: asset.illustrationAssetId,
      productFormCode: mapping.productFormCode,
      printResolution: mapping.printResolution || "",
      colorProfile: mapping.colorProfile || "",
      ebookDimensions: mapping.ebookDimensions || "",
      altText: mapping.altText || "",
      extendedDescription: mapping.extendedDescription || "",
      cropping: mapping.cropping || "",
      placement: mapping.placement || "",
      createsProductForm: false,
      createsIsbn: false
    }));
  return {
    mappings,
    skippedUnselectedEditionMappings: (asset.editionMappings || []).filter((mapping) => !selectedCodes.has(mapping.productFormCode)).map((mapping) => mapping.productFormCode)
  };
}

function validateIllustrationPipelineStatus({ scope, assets = [] } = {}) {
  const scopeResult = validateIllustrationScope(scope);
  if (!scopeResult.ok) return { ok: false, event: "ILLUSTRATION_SCOPE_BLOCKED", blockers: scopeResult.missing };
  const incomplete = assets.filter((asset) => {
    const rights = validateIllustrationRights(asset);
    return asset.qaStatus !== "PASSED" || rights.blocksInteriorLayout || asset.authorApprovalStatus !== "APPROVED";
  });
  return {
    ok: incomplete.length === 0,
    event: incomplete.length === 0 ? "INTERIOR_LAYOUT_ASSETS_READY" : "ILLUSTRATION_ASSETS_BLOCK_INTERIOR_LAYOUT",
    blockers: incomplete.map((asset) => ({
      illustrationAssetId: asset.illustrationAssetId,
      owner: asset.blockerOwner || "JM1 Automation",
      reason: asset.qaStatus !== "PASSED" ? "ILLUSTRATION_QA_NOT_COMPLETED" : validateIllustrationRights(asset).blockers.join(",") || "AUTHOR_ILLUSTRATION_APPROVAL_REQUIRED"
    }))
  };
}

function validateProductionAssemblyIllustrations(editionRecords = [], illustrationAssets = []) {
  const titleUsesIllustrations = illustrationAssets.length > 0;
  if (!titleUsesIllustrations) return { ok: true, missing: [] };
  const missing = illustrationAssets
    .filter((asset) => asset.qaStatus !== "PASSED" || validateIllustrationRights(asset).blocksInteriorLayout || asset.publisherApprovalStatus !== "APPROVED")
    .map((asset) => ({
      illustrationAssetId: asset.illustrationAssetId,
      missingArtifact: "ILLUSTRATION_COMPLETION_EVIDENCE",
      owner: asset.blockerOwner || "JM1 Automation",
      blockingReason: "Illustration asset must pass QA, rights clearance, and publisher approval before Production Assembly.",
      nextAutomaticAction: "Requeue Production Assembly after illustration evidence is complete."
    }));
  return {
    ok: missing.length === 0,
    missing,
    editionMappings: illustrationAssets.flatMap((asset) => mapIllustrationAssetToEditions(asset, editionRecords).mappings)
  };
}

function reconcileIllustrationLegacyOffering(legacyRecord) {
  const name = String(legacyRecord?.name || legacyRecord || "");
  const matches = /interior illustration|children.?s illustration|ai illustration|custom artwork|cover-art|cover art|diagram production/i.test(name);
  return {
    legacyRecord: name,
    canonicalMapping: matches ? "ILL" : "NO_ILL_OVERLAP_IDENTIFIED",
    recommendedDisposition: matches ? "PRESERVE_HISTORY_PREVENT_DUPLICATE_ACTIVE_COMMERCIAL_RECORD" : "NO_ACTION",
    duplicationRisk: matches,
    JackieDecisionRequired: matches
  };
}

function buildEditionReadiness(editionEvidence) {
  return PRODUCT_FORM_CODES.map((productFormCode) => {
    const evidence = editionEvidence?.[productFormCode] || {};
    const productForm = PRODUCT_FORM_REGISTRY[productFormCode];
    return {
      productFormCode,
      productFormName: productForm.canonicalName,
      productionStatus: evidence.productionStatus || "NOT_STARTED",
      qaStatus: evidence.qaStatus || "NOT_STARTED",
      readiness: evidence.readiness || "NOT_READY",
      distributionEligibility: evidence.distributionEligibility || "NOT_ELIGIBLE",
      blocksOtherEditions: Boolean(evidence.blocksOtherEditions)
    };
  });
}

const buildFormatReadiness = buildEditionReadiness;

module.exports = {
  PIPELINE_VERSION,
  PRODUCTION_TAXONOMY,
  TIMING_GOVERNANCE,
  AUTHOR_REVIEW_PACKAGE,
  PRODUCTION_ASSEMBLY_REQUIRED_ARTIFACTS,
  MOCK_DISTRIBUTION_FORBIDDEN_ACTIONS,
  PRODUCTION_WORK_EVENTS,
  PRODUCT_FORM_REGISTRY,
  PRODUCT_FORM_CODES,
  TITLE_EDITION_PLAN_SCHEMA,
  EDITION_SELECTION_STATES,
  RELEASE_MODELS,
  PRODUCTION_MODES,
  ILL_PROGRAM_DEFINITION,
  ILLUSTRATION_PRICING_CONFIG,
  ILLUSTRATION_ASSET_SCHEMA,
  buildProductionPipelineV2Doctrine,
  getProductForm,
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
  getIllustrationPricingConfig,
  auditIllustrationPricingAuthority,
  validateIllustrationCommercialBoundary,
  validateIllustrationScope,
  validateIllustrationRights,
  requiresIllustrationStyleGuide,
  mapIllustrationAssetToEditions,
  validateIllustrationPipelineStatus,
  validateProductionAssemblyIllustrations,
  reconcileIllustrationLegacyOffering,
  buildEditionReadiness,
  buildFormatReadiness
};
