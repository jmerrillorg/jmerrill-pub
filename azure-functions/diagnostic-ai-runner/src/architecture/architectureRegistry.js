"use strict";

const ARCHITECTURE_REGISTRY_VERSION = "JM1_ARCHITECTURE_REGISTRY_V1_0";

const GOVERNANCE_STATES = Object.freeze(["BACKLOG", "HELD", "APPROVED", "ACTIVE", "RETIRED"]);

const ARCHITECTURE_CATEGORIES = Object.freeze([
  "ARCHITECTURE_PATTERN",
  "PRODUCT_FORM",
  "PUBLISHING_PROGRAM",
  "PRODUCT_FORM_ATTRIBUTE",
  "RELEASE_MODEL",
  "DATA_RELATIONSHIP",
  "PRICING_RULE",
  "COMMERCIAL_LICENSING_ARCHITECTURE",
  "CONTRACT_GOVERNANCE",
  "CATALOG_RECONCILIATION",
  "BUSINESS_AND_RIGHTS_GOVERNANCE"
]);

const REGISTRY_FIELDS = Object.freeze([
  "architectureRegistryId",
  "capabilityCode",
  "canonicalName",
  "description",
  "architectureCategory",
  "tier",
  "governanceStatus",
  "publicAvailability",
  "source",
  "sourceDate",
  "decisionOwner",
  "councilReviewStatus",
  "JackieRulingStatus",
  "implementationAuthorization",
  "runtimeStatus",
  "commercialStatus",
  "policyVersion",
  "dependencies",
  "relatedCapabilities",
  "nextDecision",
  "nextAutomaticOrGovernedAction",
  "notes"
]);

const PROGRAM_OBJECT_SHAPE = Object.freeze([
  "programFamilyCode",
  "canonicalName",
  "programClassification",
  "governanceStatus",
  "publicAvailability",
  "scopeDefinition",
  "scopeUnit",
  "productionObligations",
  "commercialRules",
  "rightsRequirements",
  "approvalRequirements",
  "pricingMethod",
  "runtimeCommissioningStatus",
  "deliverables",
  "supportedProductForms",
  "activationGate",
  "decisionOwner",
  "policyVersion"
]);

const NO_BUILD_CONTROLS = Object.freeze({
  implementationAuthorization: "NOT_AUTHORIZED",
  schemaAuthorization: "NOT_AUTHORIZED",
  commercialAuthorization: "NOT_AUTHORIZED",
  publicExposure: "PROHIBITED",
  pricingStatus: "NOT_APPROVED"
});

const TRANSITIONS = Object.freeze([
  { from: "BACKLOG", to: "APPROVED", authority: "Jackie approval after Council recommendation where applicable" },
  { from: "BACKLOG", to: "HELD", authority: "Jackie approval or governed hold decision" },
  { from: "HELD", to: "BACKLOG", authority: "Jackie approval to resume definition" },
  { from: "APPROVED", to: "ACTIVE", authority: "Jackie implementation authorization after evidence readiness" },
  { from: "APPROVED", to: "HELD", authority: "Jackie hold decision" },
  { from: "ACTIVE", to: "RETIRED", authority: "Jackie retirement approval" }
]);

function registryEntry(overrides) {
  return Object.freeze({
    architectureRegistryId: overrides.architectureRegistryId,
    capabilityCode: overrides.capabilityCode,
    canonicalName: overrides.canonicalName,
    description: overrides.description,
    architectureCategory: overrides.architectureCategory,
    tier: overrides.tier || "",
    governanceStatus: overrides.governanceStatus,
    publicAvailability: overrides.publicAvailability || "NOT_PUBLIC",
    source: overrides.source || "JM1 architecture scan",
    sourceDate: overrides.sourceDate || "2026-07-22",
    decisionOwner: overrides.decisionOwner || "Jackie Smith, Jr.",
    councilReviewStatus: overrides.councilReviewStatus || "NOT_REVIEWED",
    JackieRulingStatus: overrides.JackieRulingStatus || "NOT_RULED",
    implementationAuthorization: overrides.implementationAuthorization || "NOT_AUTHORIZED",
    schemaAuthorization: overrides.schemaAuthorization || "NOT_AUTHORIZED",
    commercialAuthorization: overrides.commercialAuthorization || "NOT_AUTHORIZED",
    publicExposure: overrides.publicExposure || "PROHIBITED",
    pricingStatus: overrides.pricingStatus || "NOT_APPROVED",
    runtimeStatus: overrides.runtimeStatus || "NOT_COMMISSIONED",
    commercialStatus: overrides.commercialStatus || "NOT_ACTIVE",
    policyVersion: overrides.policyVersion || ARCHITECTURE_REGISTRY_VERSION,
    dependencies: Object.freeze(overrides.dependencies || []),
    relatedCapabilities: Object.freeze(overrides.relatedCapabilities || []),
    nextDecision: overrides.nextDecision || "",
    nextAutomaticOrGovernedAction: overrides.nextAutomaticOrGovernedAction || "Await Jackie-authorized governance progression.",
    notes: overrides.notes || "",
    transitionHistory: Object.freeze(overrides.transitionHistory || [
      {
        from: "",
        to: overrides.governanceStatus,
        authority: "Cody records under Jackie instruction",
        evidence: overrides.source || "JM1 architecture scan",
        recordedAt: "2026-07-22"
      }
    ])
  });
}

const PUBLISHING_PROGRAM_REGISTRY = registryEntry({
  architectureRegistryId: "ARCH-REG-PUB-PROGRAM-001",
  capabilityCode: "PUBLISHING_PROGRAM_REGISTRY",
  canonicalName: "Publishing Program Registry",
  description: "Canonical architecture pattern for non-product-form publishing programs.",
  architectureCategory: "ARCHITECTURE_PATTERN",
  governanceStatus: "APPROVED",
  JackieRulingStatus: "APPROVED_FOR_GOVERNANCE_DEFINITION",
  implementationAuthorization: "REGISTRY_ONLY",
  schemaAuthorization: "NOT_AUTHORIZED",
  commercialAuthorization: "NOT_AUTHORIZED",
  publicExposure: "PROHIBITED",
  pricingStatus: "NOT_APPROVED",
  nextDecision: "Authorize schema/runtime implementation only through a separate Jackie ruling.",
  notes: "APPROVED does not imply implementation complete, runtime commissioned, commercial activation, or public availability."
});

const PUBLISHING_PROGRAMS = Object.freeze({
  SUP: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-SUP",
    capabilityCode: "SUP",
    canonicalName: "Companion/Supplementary Materials Program",
    description: "Program family for governed supplementary materials related to title production.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "BACKLOG",
    notes: "Commercial disposition unresolved: BUNDLED, STANDALONE, or BOTH_PER_TITLE."
  }),
  ILL: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-ILL",
    capabilityCode: "ILL",
    canonicalName: "Interior Illustration Program",
    description: "Governed production program for per-illustration title assets.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "CANON_CANDIDATE",
    JackieRulingStatus: "CANON_CANDIDATE",
    implementationAuthorization: "CONTROLLED_ARCHITECTURE_ONLY",
    pricingStatus: "NOT_APPROVED",
    runtimeStatus: "NOT_COMMISSIONED_FOR_LIVE_CLIENT",
    commercialStatus: "NOT_ACTIVE",
    publicAvailability: "PROHIBITED",
    dependencies: [
      "PF-01-PF-08 Title Edition Plan",
      "Pricing ruling",
      "Author-facing disclosure policy",
      "Human-illustrator agreement standard",
      "Controlled title proof",
      "Final canon ratification"
    ],
    relatedCapabilities: ["ARCH-GAP-009"],
    notes: "ILL_IMPLEMENTATION_FROZEN_PENDING_POLICY_RULING; architecture implemented, commercial activation withheld, controlled proof not completed, not final CANON."
  }),
  TRANS: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-TRANS",
    capabilityCode: "TRANS",
    canonicalName: "Translation Production Program",
    description: "Program family for JMP-produced translations, distinct from external foreign-rights licensing.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "BACKLOG",
    notes: "Outcome may generate new title editions; pricing and translated edition records are not authorized."
  }),
  GFX: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-GFX",
    capabilityCode: "GFX",
    canonicalName: "Graphic/Visual Production Program",
    description: "Pre-registry program family requiring normalization review.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "BACKLOG",
    nextDecision: "Normalize current definition to the Program object shape.",
    notes: "NORMALIZATION_REQUIRED"
  }),
  INT: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-INT",
    capabilityCode: "INT",
    canonicalName: "Interactive Production Program",
    description: "Pre-registry program family requiring normalization review.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "BACKLOG",
    nextDecision: "Normalize against PF-08 program-only boundary without creating public availability.",
    notes: "NORMALIZATION_REQUIRED"
  }),
  SER: registryEntry({
    architectureRegistryId: "ARCH-REG-PROGRAM-SER",
    capabilityCode: "SER",
    canonicalName: "Serialized/Episodic Program",
    description: "Pre-registry program family requiring normalization review.",
    architectureCategory: "PUBLISHING_PROGRAM",
    governanceStatus: "BACKLOG",
    nextDecision: "Normalize release-model and program boundaries.",
    notes: "NORMALIZATION_REQUIRED"
  })
});

const ARCHITECTURE_GAPS = Object.freeze([
  registryEntry({
    architectureRegistryId: "ARCH-GAP-001",
    capabilityCode: "SUP",
    canonicalName: "Companion/Supplementary Materials",
    description: "Register production relationships for supplementary materials while preserving unresolved commercial disposition.",
    architectureCategory: "PUBLISHING_PROGRAM",
    tier: "Tier 1",
    governanceStatus: "BACKLOG",
    relatedCapabilities: ["SUP"],
    nextDecision: "Resolve commercial model: BUNDLED, STANDALONE, or BOTH_PER_TITLE.",
    notes: "BACKLOG — NOT AUTHORIZED FOR BUILD."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-002",
    capabilityCode: "SERIES_MULTI_BOOK_MANAGEMENT",
    canonicalName: "Series & Multi-Book Management",
    description: "Future relationship architecture for SERIES, VOLUME, COLLECTION, BUNDLE, and READING_ORDER.",
    architectureCategory: "DATA_RELATIONSHIP",
    tier: "Tier 1",
    governanceStatus: "BACKLOG",
    nextDecision: "Authorize schema design for series and multi-book relationships.",
    notes: "Do not create jm1pub_series or fields in this slice."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-003",
    capabilityCode: "TRANS",
    canonicalName: "Translation Production",
    description: "JMP-produced translation program distinct from external foreign-rights licensing.",
    architectureCategory: "PUBLISHING_PROGRAM",
    tier: "Tier 1",
    governanceStatus: "BACKLOG",
    relatedCapabilities: ["TRANS"],
    nextDecision: "Define translation scope, pricing, edition outcome, and foreign-rights separation.",
    notes: "Outcome: MAY_GENERATE_NEW_TITLE_EDITIONS."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-004",
    capabilityCode: "INSTITUTIONAL_LICENSING",
    canonicalName: "Institutional Licensing",
    description: "License-based commercial architecture for school, district, university, library, corporate, government, and ministry variants.",
    architectureCategory: "COMMERCIAL_LICENSING_ARCHITECTURE",
    tier: "Tier 1",
    governanceStatus: "BACKLOG",
    nextDecision: "Define license architecture and pricing governance.",
    notes: "No price rules, contracts, license templates, or products authorized."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-005",
    capabilityCode: "SPECIAL_COLLECTOR_EDITIONS",
    canonicalName: "Special/Collector Editions",
    description: "Future attribute model for special or collector treatment on PF-01 and PF-02.",
    architectureCategory: "PRODUCT_FORM_ATTRIBUTE",
    tier: "Tier 2",
    governanceStatus: "BACKLOG",
    relatedCapabilities: ["PF-01", "PF-02"],
    notes: "Do not create another Product Form."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-006",
    capabilityCode: "NEW_REVISED_EDITION_VERSIONING",
    canonicalName: "New/Revised Edition Versioning",
    description: "Future title edition lineage architecture for editionNumber, revisionStatus, supersedesEdition, and supersededByEdition.",
    architectureCategory: "TITLE_EDITION_LINEAGE",
    tier: "Tier 2",
    governanceStatus: "BACKLOG",
    nextDecision: "Authorize lineage schema design if required.",
    notes: "No fields or relationships authorized now."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-007",
    capabilityCode: "PRINT_EBOOK_BUNDLING",
    canonicalName: "Print + Ebook Bundling",
    description: "Future cross-edition pricing rule for bundled print and ebook offer behavior.",
    architectureCategory: "PRICING_RULE",
    tier: "Tier 2",
    governanceStatus: "BACKLOG",
    notes: "No Product Form, bundle SKU, checkout behavior, or discount rule authorized."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-008",
    capabilityCode: "MERCHANDISING_RIGHTS",
    canonicalName: "Merchandising Rights",
    description: "Held business question: whether JMP facilitates merchandising production, licensing, or rights exploitation.",
    architectureCategory: "BUSINESS_AND_RIGHTS_GOVERNANCE",
    tier: "Tier 3",
    governanceStatus: "HELD",
    nextDecision: "Does JMP facilitate merchandising production, licensing, or rights exploitation?",
    notes: "No architecture drafting beyond this question is authorized."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-009",
    capabilityCode: "ILLUSTRATION_RIGHTS_GOVERNANCE",
    canonicalName: "Illustration Rights Governance",
    description: "Contract governance for author-owned, author-supplied, JMP-commissioned, licensed, and AI-assisted illustrations.",
    architectureCategory: "CONTRACT_GOVERNANCE",
    tier: "Tier 3",
    governanceStatus: "HELD",
    dependencies: ["ILL"],
    notes: "This is not the Interior Illustration Program itself. Do not draft or modify contract language."
  }),
  registryEntry({
    architectureRegistryId: "ARCH-GAP-010",
    capabilityCode: "LEGACY_CATALOG_ORPHANED_SKUS",
    canonicalName: "Legacy Catalog Orphaned SKUs",
    description: "Catalog reconciliation for orphaned legacy candidates.",
    architectureCategory: "CATALOG_RECONCILIATION",
    tier: "Tier 3",
    governanceStatus: "HELD",
    relatedCapabilities: ["AI Publishing Agent", "Intelligence Dashboard", "Predictive Positioning", "Patron Membership", "TikTok Shop"],
    nextDecision: "Route disposition through the governed Catalog Reconciliation Worksheet.",
    notes: "Do not activate, merge, rename, retire, price, or delete any SKU."
  })
]);

function buildArchitectureRegistry() {
  return {
    version: ARCHITECTURE_REGISTRY_VERSION,
    fields: REGISTRY_FIELDS,
    governanceStates: GOVERNANCE_STATES,
    categories: ARCHITECTURE_CATEGORIES,
    noBuildControls: NO_BUILD_CONTROLS,
    transitionModel: TRANSITIONS,
    publishingProgramObjectShape: PROGRAM_OBJECT_SHAPE,
    foundationalEntries: [PUBLISHING_PROGRAM_REGISTRY],
    programs: Object.values(PUBLISHING_PROGRAMS),
    gaps: ARCHITECTURE_GAPS
  };
}

function buildRegistryViews(registry = buildArchitectureRegistry()) {
  const entries = [...registry.foundationalEntries, ...registry.programs, ...registry.gaps];
  return {
    byGovernanceState: GOVERNANCE_STATES.reduce((acc, state) => {
      acc[state] = entries.filter((entry) => entry.governanceStatus === state).map((entry) => entry.architectureRegistryId);
      return acc;
    }, {}),
    byArchitecturalCategory: ARCHITECTURE_CATEGORIES.reduce((acc, category) => {
      acc[category] = entries.filter((entry) => entry.architectureCategory === category).map((entry) => entry.architectureRegistryId);
      return acc;
    }, {}),
    byDecisionReadiness: {
      READY_FOR_POLICY_DEFINITION: entries.filter((entry) => /policy|scope|commercial model|license/i.test(`${entry.nextDecision} ${entry.notes}`)).map((entry) => entry.architectureRegistryId),
      READY_FOR_PRICING_RULING: entries.filter((entry) => /pricing|price|commercial model/i.test(`${entry.nextDecision} ${entry.notes}`)).map((entry) => entry.architectureRegistryId),
      READY_FOR_SCHEMA_DESIGN: entries.filter((entry) => /schema|relationship|lineage/i.test(`${entry.nextDecision} ${entry.description}`)).map((entry) => entry.architectureRegistryId),
      DEPENDENCY_BLOCKED: entries.filter((entry) => entry.dependencies.length > 0).map((entry) => entry.architectureRegistryId),
      HELD_BUSINESS_QUESTION: entries.filter((entry) => entry.governanceStatus === "HELD").map((entry) => entry.architectureRegistryId),
      NOT_AUTHORIZED: entries.filter((entry) => entry.implementationAuthorization === "NOT_AUTHORIZED").map((entry) => entry.architectureRegistryId)
    }
  };
}

function buildProgramNormalizationFindings() {
  return ["GFX", "INT", "SER"].map((code) => ({
    programFamilyCode: code,
    currentDefinition: PUBLISHING_PROGRAMS[code].description,
    missingProgramObjectFields: ["scopeDefinition", "scopeUnit", "productionObligations", "commercialRules", "rightsRequirements", "approvalRequirements", "pricingMethod", "deliverables", "supportedProductForms", "activationGate"],
    governanceInconsistencies: "Pre-registry definition has not been normalized to the common Program object.",
    commercialInconsistencies: "Commercial availability and pricing treatment are not governed in this slice.",
    rightsGaps: "Rights requirements are not yet defined.",
    runtimeStateAmbiguity: "Runtime commissioning state is registry-only and not implementation evidence.",
    recommendedFutureNormalization: "Return a separate Jackie-approved normalization package before schema, runtime, SKU, pricing, or public copy changes.",
    JackieDecisionRequired: true
  }));
}

function validateArchitectureRegistry(registry = buildArchitectureRegistry()) {
  const gapIds = registry.gaps.map((gap) => gap.architectureRegistryId);
  const duplicateGapIds = gapIds.filter((id, index) => gapIds.indexOf(id) !== index);
  const noBuildViolations = registry.gaps.filter((gap) =>
    gap.implementationAuthorization !== "NOT_AUTHORIZED" ||
    gap.schemaAuthorization !== "NOT_AUTHORIZED" ||
    gap.commercialAuthorization !== "NOT_AUTHORIZED" ||
    gap.publicExposure !== "PROHIBITED" ||
    gap.pricingStatus !== "NOT_APPROVED"
  );
  const collapsedClassifications = registry.gaps.filter((gap) => !ARCHITECTURE_CATEGORIES.includes(gap.architectureCategory) && gap.architectureCategory !== "TITLE_EDITION_LINEAGE");
  return {
    ok:
      registry.gaps.length === 10 &&
      new Set(gapIds).size === 10 &&
      duplicateGapIds.length === 0 &&
      noBuildViolations.length === 0 &&
      collapsedClassifications.length === 0 &&
      registry.programs.some((program) => program.capabilityCode === "ILL") &&
      !registry.gaps.some((gap) => gap.architectureRegistryId === "ILL") &&
      ["GFX", "INT", "SER"].every((code) => registry.programs.some((program) => program.capabilityCode === code && program.notes.includes("NORMALIZATION_REQUIRED"))),
    gapCount: registry.gaps.length,
    duplicateGapIds,
    noBuildViolations: noBuildViolations.map((gap) => gap.architectureRegistryId),
    collapsedClassifications: collapsedClassifications.map((gap) => gap.architectureRegistryId),
    tierCounts: registry.gaps.reduce((acc, gap) => {
      acc[gap.tier] = (acc[gap.tier] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = {
  ARCHITECTURE_REGISTRY_VERSION,
  GOVERNANCE_STATES,
  ARCHITECTURE_CATEGORIES,
  REGISTRY_FIELDS,
  PROGRAM_OBJECT_SHAPE,
  NO_BUILD_CONTROLS,
  TRANSITIONS,
  PUBLISHING_PROGRAM_REGISTRY,
  PUBLISHING_PROGRAMS,
  ARCHITECTURE_GAPS,
  buildArchitectureRegistry,
  buildRegistryViews,
  buildProgramNormalizationFindings,
  validateArchitectureRegistry
};
