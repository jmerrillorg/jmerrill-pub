"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  GOVERNANCE_STATES,
  PROGRAM_OBJECT_SHAPE,
  PUBLISHING_PROGRAM_REGISTRY,
  PUBLISHING_PROGRAMS,
  ARCHITECTURE_GAPS,
  buildArchitectureRegistry,
  buildRegistryViews,
  buildProgramNormalizationFindings,
  validateArchitectureRegistry
} = require("../src/architecture/architectureRegistry");

describe("JM1 Architecture Registry", () => {
  test("defines canonical governance states and transition-safe approved meaning", () => {
    assert.deepEqual(GOVERNANCE_STATES, ["BACKLOG", "HELD", "APPROVED", "ACTIVE", "RETIRED"]);
    assert.equal(PUBLISHING_PROGRAM_REGISTRY.governanceStatus, "APPROVED");
    assert.equal(PUBLISHING_PROGRAM_REGISTRY.implementationAuthorization, "REGISTRY_ONLY");
    assert.equal(PUBLISHING_PROGRAM_REGISTRY.runtimeStatus, "NOT_COMMISSIONED");
    assert.equal(PUBLISHING_PROGRAM_REGISTRY.publicExposure, "PROHIBITED");
  });

  test("defines the Publishing Program object shape", () => {
    assert.equal(PROGRAM_OBJECT_SHAPE.includes("programFamilyCode"), true);
    assert.equal(PROGRAM_OBJECT_SHAPE.includes("supportedProductForms"), true);
    assert.equal(PROGRAM_OBJECT_SHAPE.includes("activationGate"), true);
  });

  test("registers SUP, ILL, TRANS, GFX, INT, and SER as programs", () => {
    assert.deepEqual(Object.keys(PUBLISHING_PROGRAMS).sort(), ["GFX", "ILL", "INT", "SER", "SUP", "TRANS"]);
    assert.equal(PUBLISHING_PROGRAMS.ILL.architectureCategory, "PUBLISHING_PROGRAM");
    assert.equal(PUBLISHING_PROGRAMS.ILL.governanceStatus, "CANON_CANDIDATE");
    assert.equal(PUBLISHING_PROGRAMS.ILL.JackieRulingStatus, "CANON_CANDIDATE");
    assert.equal(PUBLISHING_PROGRAMS.ILL.implementationAuthorization, "CONTROLLED_ARCHITECTURE_ONLY");
    assert.equal(PUBLISHING_PROGRAMS.ILL.commercialAuthorization, "NOT_AUTHORIZED");
    assert.equal(PUBLISHING_PROGRAMS.ILL.pricingStatus, "NOT_APPROVED");
    assert.equal(PUBLISHING_PROGRAMS.ILL.runtimeStatus, "NOT_COMMISSIONED_FOR_LIVE_CLIENT");
    assert.equal(PUBLISHING_PROGRAMS.ILL.commercialStatus, "NOT_ACTIVE");
    assert.equal(PUBLISHING_PROGRAMS.GFX.notes.includes("NORMALIZATION_REQUIRED"), true);
    assert.equal(PUBLISHING_PROGRAMS.INT.notes.includes("NORMALIZATION_REQUIRED"), true);
    assert.equal(PUBLISHING_PROGRAMS.SER.notes.includes("NORMALIZATION_REQUIRED"), true);
  });

  test("registers the ten architecture gaps once with no-build controls", () => {
    const validation = validateArchitectureRegistry();

    assert.equal(validation.ok, true);
    assert.equal(validation.gapCount, 10);
    assert.deepEqual(validation.duplicateGapIds, []);
    assert.deepEqual(validation.noBuildViolations, []);
    assert.deepEqual(validation.tierCounts, { "Tier 1": 4, "Tier 2": 3, "Tier 3": 3 });
  });

  test("preserves specific architecture classifications", () => {
    const gapById = Object.fromEntries(ARCHITECTURE_GAPS.map((gap) => [gap.architectureRegistryId, gap]));

    assert.equal(gapById["ARCH-GAP-001"].architectureCategory, "PUBLISHING_PROGRAM");
    assert.equal(gapById["ARCH-GAP-002"].architectureCategory, "DATA_RELATIONSHIP");
    assert.equal(gapById["ARCH-GAP-004"].architectureCategory, "COMMERCIAL_LICENSING_ARCHITECTURE");
    assert.equal(gapById["ARCH-GAP-005"].architectureCategory, "PRODUCT_FORM_ATTRIBUTE");
    assert.equal(gapById["ARCH-GAP-006"].architectureCategory, "TITLE_EDITION_LINEAGE");
    assert.equal(gapById["ARCH-GAP-009"].architectureCategory, "CONTRACT_GOVERNANCE");
    assert.equal(gapById["ARCH-GAP-010"].architectureCategory, "CATALOG_RECONCILIATION");
  });

  test("keeps ILL out of the ten gap IDs", () => {
    assert.equal(ARCHITECTURE_GAPS.some((gap) => gap.architectureRegistryId === "ILL"), false);
    assert.equal(ARCHITECTURE_GAPS.some((gap) => gap.capabilityCode === "ILL" && gap.architectureRegistryId !== "ARCH-GAP-009"), false);
  });

  test("builds reporting views without creating implementation configuration", () => {
    const views = buildRegistryViews(buildArchitectureRegistry());

    assert.equal(views.byGovernanceState.BACKLOG.includes("ARCH-GAP-001"), true);
    assert.equal(views.byGovernanceState.HELD.includes("ARCH-GAP-008"), true);
    assert.equal(views.byArchitecturalCategory.PUBLISHING_PROGRAM.includes("ARCH-GAP-001"), true);
    assert.equal(views.byDecisionReadiness.NOT_AUTHORIZED.includes("ARCH-GAP-010"), true);
  });

  test("returns normalization findings for GFX, INT, and SER", () => {
    const findings = buildProgramNormalizationFindings();

    assert.deepEqual(findings.map((finding) => finding.programFamilyCode), ["GFX", "INT", "SER"]);
    assert.equal(findings.every((finding) => finding.JackieDecisionRequired), true);
    assert.equal(findings.every((finding) => finding.missingProgramObjectFields.includes("commercialRules")), true);
  });
});
