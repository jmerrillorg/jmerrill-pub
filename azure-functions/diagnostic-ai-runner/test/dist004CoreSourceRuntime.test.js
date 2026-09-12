"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CHANNEL_HEALTH_STATES,
  CORESOURCE_TEMPLATE,
  CoreSourceMachineAdapter,
  CoreSourceUiAssistedAdapter,
  FORMAT_CODES,
  INGESTION_STATES,
  PROVIDERS,
  buildChannelOwnershipMatrix,
  buildDist004FinalReadiness,
  buildIngestionJobRecord,
  buildProviderHealthRoutingDecision,
  buildRoutingRecommendation,
  classifyChannelHealth,
  generateCoreSourceWorkbook,
  getTemplateSchemaContract,
  normalizeCoreSourceJobState,
  prepareCanaryWorkflow,
  reconcileJobReadback,
  revalidateOrch012Actions,
  validateCoreSourceWorkbook
} = require("../src/distribution/dist004CoreSourceRuntime");

const checksum = "a".repeat(64);
const coverChecksum = "b".repeat(64);

function metadata(overrides = {}) {
  return {
    enterpriseWorkId: "EW-001",
    workProjectionId: "WP-001",
    publishingTitleId: "PT-001",
    title: "Canary Title",
    subtitle: "",
    authorDisplayName: "J Merrill",
    imprint: "J Merrill Publishing",
    language: "en",
    description: "Governed metadata generated from JM1 state.",
    bisacSubject: "REL000000",
    keywords: ["faith", "publishing"],
    accessibilitySummary: "Accessibility summary authority pending.",
    ...overrides
  };
}

function product(overrides = {}) {
  return {
    formatId: "FMT-EBOOK-001",
    format: FORMAT_CODES.EBOOK,
    isbn: "9781954414990",
    price: "9.99",
    currency: "USD",
    territory: "WORLD",
    rights: "WORLD",
    publicationDate: "2026-09-12",
    onSaleDate: "2026-12-31",
    primaryContentAsset: "canary.epub",
    primaryContentChecksum: checksum,
    frontCoverAsset: "canary.jpg",
    frontCoverChecksum: coverChecksum,
    currentProvider: PROVIDERS.CORESOURCE,
    downstreamChannels: ["NONE"],
    distributable: "NO",
    availability: "HOLD",
    channelEnabled: "NO",
    ...overrides
  };
}

function generated(overrides = {}) {
  return generateCoreSourceWorkbook({
    generationId: "DIST004-GEN-001",
    metadata: metadata(overrides.metadata),
    formatProducts: overrides.formatProducts || [product(overrides.product)]
  });
}

describe("DIST-004 CoreSource template contract", () => {
  test("preserves workbook format, worksheet order, column order, and required mappings", () => {
    const contract = getTemplateSchemaContract();

    assert.equal(contract.workbookFormat, "XLSX");
    assert.deepEqual(contract.worksheetNames, [
      "Title Metadata",
      "Commercial Rights",
      "Assets",
      "Distribution Controls"
    ]);
    assert.equal(contract.unmappedRequiredCoreSourceColumns.length, 0);
    assert.equal(contract.unauthorizedProviderDefaults.length, 0);
    assert.equal(contract.columns.every((column) => column.sourceAuthority), true);
    assert.equal(contract.columns.every((column) => column.defaultAllowed === false), true);
  });

  test("keeps distribution-control fields explicit and unproven for canary authority", () => {
    const controls = CORESOURCE_TEMPLATE.worksheets.find((sheet) => sheet.name === "Distribution Controls").columns;

    assert.equal(controls.some((column) => column.coresourceColumn === "Distributable"), true);
    assert.equal(controls.some((column) => column.coresourceColumn === "Channel Enabled"), true);
    assert.equal(controls.filter((column) => column.conditionalRule === "PROVIDER_FIELD_UNPROVEN_FOR_CANARY").length, 3);
  });
});

describe("DIST-004 deterministic workbook generator and validator", () => {
  test("generates idempotent provider-workbook output from governed JM1 metadata", () => {
    const first = generated();
    const second = generated();

    assert.deepEqual(first, second);
    assert.equal(first.workbook.format, "XLSX");
    assert.equal(first.workbook.rowCount, 1);
    assert.equal(first.workbook.rowIdentities[0], "EW-001|WP-001|PT-001|FMT-EBOOK-001|EBOOK|9781954414990");
    assert.equal(validateCoreSourceWorkbook(first).ok, true);
  });

  test("sorts title-format rows deterministically", () => {
    const result = generated({
      formatProducts: [
        product({ formatId: "FMT-PB-002", format: FORMAT_CODES.PAPERBACK, isbn: "9781954414334" }),
        product({ formatId: "FMT-EBOOK-001", format: FORMAT_CODES.EBOOK, isbn: "9781954414327" })
      ]
    });

    assert.deepEqual(result.workbook.rowIdentities, [
      "EW-001|WP-001|PT-001|FMT-EBOOK-001|EBOOK|9781954414327",
      "EW-001|WP-001|PT-001|FMT-PB-002|PAPERBACK|9781954414334"
    ]);
  });

  test("rejects missing required fields, invalid ISBNs, invalid enums, bad checksums, and bad dates", () => {
    const result = generated({
      metadata: { title: "" },
      product: {
        isbn: "bad",
        rights: "MAYBE",
        publicationDate: "09/12/2026",
        primaryContentChecksum: "not-a-checksum"
      }
    });
    const validation = validateCoreSourceWorkbook(result);

    assert.equal(validation.ok, false);
    assert.equal(validation.errors.some((error) => error.includes("Title:REQUIRED_MISSING")), true);
    assert.equal(validation.errors.some((error) => error.includes("ISBN:INVALID_isbn13")), true);
    assert.equal(validation.errors.some((error) => error.includes("Rights:INVALID_enum")), true);
    assert.equal(validation.errors.some((error) => error.includes("Publication Date:INVALID_date")), true);
    assert.equal(validation.errors.some((error) => error.includes("Primary Content Checksum:INVALID_sha256")), true);
  });

  test("rejects duplicate title-format rows and column-order drift", () => {
    const duplicate = generated({ formatProducts: [product(), product()] });
    const duplicateValidation = validateCoreSourceWorkbook(duplicate);

    assert.equal(duplicateValidation.ok, false);
    assert.equal(duplicateValidation.errors.includes("DUPLICATE_TITLE_FORMAT_ROW"), true);

    const drifted = structuredClone(generated().workbook);
    drifted.sheets["Title Metadata"].columns.reverse();
    const driftValidation = validateCoreSourceWorkbook(drifted);
    assert.equal(driftValidation.ok, false);
    assert.equal(driftValidation.errors.includes("COLUMN_ORDER_MISMATCH:Title Metadata"), true);
  });
});

describe("DIST-004 canary firewall", () => {
  test("fails closed when CoreSource safe nondistributable field authority is not proven", () => {
    const canary = prepareCanaryWorkflow(generated(), { safeNondistributableStateProven: false, currentDate: "2026-09-12" });

    assert.equal(canary.workflowPrepared, true);
    assert.equal(canary.canaryReady, false);
    assert.equal(canary.blocker, "PROVIDER_PUBLIC_EFFECT_BOUNDARY");
    assert.equal(canary.validation.errors.includes("SAFE_NONDISTRIBUTABLE_FIELDS_NOT_PROVEN"), true);
    assert.equal(canary.realPublicProducts, 0);
    assert.equal(canary.realOnSaleProducts, 0);
  });

  test("passes only when safe authority and all no-distribution flags are present", () => {
    const canary = prepareCanaryWorkflow(generated(), { safeNondistributableStateProven: true, currentDate: "2026-09-12" });

    assert.equal(canary.canaryReady, true);
    assert.equal(canary.validation.ok, true);
  });

  test("rejects unsafe distributable defaults even when authority is otherwise present", () => {
    const unsafe = generated({ product: { distributable: "YES" } });
    const canary = prepareCanaryWorkflow(unsafe, { safeNondistributableStateProven: true, currentDate: "2026-09-12" });

    assert.equal(canary.canaryReady, false);
    assert.equal(canary.validation.errors.some((error) => error.includes("DISTRIBUTABLE_NOT_NO")), true);
  });

  test("rejects unknown distribution state, active channels, LSI leakage, and on-sale canary products", () => {
    const unsafe = generated({
      product: {
        availability: "",
        downstreamChannels: ["LSI", "APPLE"],
        onSaleDate: "2026-09-12"
      }
    });
    const canary = prepareCanaryWorkflow(unsafe, { safeNondistributableStateProven: true, currentDate: "2026-09-12" });

    assert.equal(canary.canaryReady, false);
    assert.equal(canary.validation.errors.includes("ROW_1:Distribution Controls:Availability:REQUIRED_MISSING"), true);
    assert.equal(canary.validation.errors.includes("ROW_1:UNKNOWN_DISTRIBUTION_STATE"), true);
    assert.equal(canary.validation.errors.includes("ROW_1:ACTIVE_CHANNEL_DURING_CANARY"), true);
    assert.equal(canary.validation.errors.includes("ROW_1:LSI_CHANNEL_ENABLED_DURING_CORESOURCE_ONLY_CANARY"), true);
    assert.equal(canary.validation.errors.includes("ROW_1:ON_SALE_CONDITION_DURING_CANARY"), true);
  });

  test("rejects a canary workbook without commercial release controls", () => {
    const prepared = structuredClone(generated());
    prepared.workbook.sheets["Commercial Rights"].rows = [];
    const canary = prepareCanaryWorkflow(prepared, { safeNondistributableStateProven: true, currentDate: "2026-09-12" });

    assert.equal(canary.canaryReady, false);
    assert.equal(canary.validation.errors.includes("ROW_1:MISSING_RELEASE_DISTRIBUTION_CONTROL"), true);
  });
});

describe("DIST-004 job model and readback reconciliation", () => {
  test("normalizes CoreSource job states and fails closed on unknown jobs", () => {
    assert.equal(normalizeCoreSourceJobState({ status: "Completed" }), INGESTION_STATES.COMPLETED);
    assert.equal(normalizeCoreSourceJobState({ status: "Completed with Errors" }), INGESTION_STATES.COMPLETED_WITH_WARNINGS);
    assert.equal(normalizeCoreSourceJobState({ status: "Validation Failed" }), INGESTION_STATES.FAILED_VALIDATION);
    assert.equal(normalizeCoreSourceJobState({ status: "Processing" }), INGESTION_STATES.PROCESSING);
    assert.equal(normalizeCoreSourceJobState({ status: "" }), INGESTION_STATES.UNKNOWN);

    const record = buildIngestionJobRecord({ status: "Completed" });
    assert.equal(record.unknownJobFailClosed, true);
  });

  test("reconciles upload checksum, row count, and job identity", () => {
    const prepared = generated();
    const pass = reconcileJobReadback(prepared, {
      jobId: "375260283",
      status: "Completed",
      workbookChecksum: prepared.checksum,
      rowCount: 1
    });

    assert.equal(pass.ok, true);
    assert.equal(pass.job.normalizedState, INGESTION_STATES.COMPLETED);

    const fail = reconcileJobReadback(prepared, {
      status: "Completed",
      workbookChecksum: "different",
      rowCount: 2
    });
    assert.equal(fail.ok, false);
    assert.deepEqual(fail.errors.sort(), ["ROW_COUNT_MISMATCH", "UNKNOWN_JOB", "WORKBOOK_CHECKSUM_MISMATCH"].sort());
  });
});

describe("DIST-004 provider health and routing ownership", () => {
  test("classifies provider/channel health without collapsing a channel failure into whole-provider failure", () => {
    assert.equal(classifyChannelHealth({ lastSuccessAt: "2026-09-12T01:00:00Z" }), CHANNEL_HEALTH_STATES.HEALTHY);
    assert.equal(classifyChannelHealth({ financeRestricted: true }), CHANNEL_HEALTH_STATES.FINANCE_RESTRICTED);
    assert.equal(classifyChannelHealth({ distributionRestricted: true }), CHANNEL_HEALTH_STATES.DISTRIBUTION_RESTRICTED);
    assert.equal(classifyChannelHealth({ providerError: true }), CHANNEL_HEALTH_STATES.PROVIDER_ERROR);
    assert.equal(classifyChannelHealth({}), CHANNEL_HEALTH_STATES.UNKNOWN);
  });

  test("prevents uncontrolled duplicate upstream authorities per title-format-retailer", () => {
    const pass = buildChannelOwnershipMatrix([
      { title: "Book", format: FORMAT_CODES.EBOOK, isbn: "9781954414327", retailer: "AMAZON", upstreamAuthority: PROVIDERS.CORESOURCE },
      { title: "Book", format: FORMAT_CODES.EBOOK, isbn: "9781954414327", retailer: "APPLE", upstreamAuthority: PROVIDERS.CORESOURCE }
    ]);
    assert.equal(pass.uncontrolledDuplicateChannelAuthorities, 0);

    const fail = buildChannelOwnershipMatrix([
      { title: "Book", format: FORMAT_CODES.EBOOK, isbn: "9781954414327", retailer: "AMAZON", upstreamAuthority: PROVIDERS.CORESOURCE },
      { title: "Book", format: FORMAT_CODES.EBOOK, isbn: "9781954414327", retailer: "AMAZON", upstreamAuthority: PROVIDERS.AMAZON_DIRECT }
    ]);
    assert.equal(fail.uncontrolledDuplicateChannelAuthorities, 1);
  });

  test("returns the current CoreSource-centered routing recommendation as non-immutable until health proof passes", () => {
    const recommendation = buildRoutingRecommendation({ coreSourceTemplate: true, lightningSourceReadback: false });

    assert.equal(recommendation.PRINT_PRIMARY, "CORESOURCE_TO_LIGHTNING_SOURCE_DIRECT_POD_CHANNELS");
    assert.equal(recommendation.PRINT_CONTINGENCY, "INGRAMSPARK");
    assert.equal(recommendation.EBOOK_PRIMARY, "CORESOURCE");
    assert.equal(recommendation.AMAZON_DIRECT, "STRATEGIC_EXCEPTION_DO_NOT_ACTIVATE");
    assert.equal(recommendation.BARNES_AND_NOBLE_DIRECT, "STRATEGIC_EXCEPTION_DO_NOT_ACTIVATE");
    assert.equal(recommendation.proven, false);
    assert.equal(recommendation.immutableCanon, false);
  });

  test("chooses provider routes only after health, fallback authority, and duplicate-risk gates pass", () => {
    const primary = buildProviderHealthRoutingDecision({
      primaryHealth: CHANNEL_HEALTH_STATES.HEALTHY,
      fallbackHealth: CHANNEL_HEALTH_STATES.UNKNOWN,
      duplicateRiskCleared: true
    });
    assert.equal(primary.status, "PRIMARY_READY");
    assert.equal(primary.route, "CORESOURCE_TO_LIGHTNING_SOURCE_DIRECT_POD_CHANNELS");

    const fallback = buildProviderHealthRoutingDecision({
      primaryHealth: CHANNEL_HEALTH_STATES.DISTRIBUTION_RESTRICTED,
      fallbackHealth: CHANNEL_HEALTH_STATES.HEALTHY,
      fallbackAllowed: true,
      duplicateRiskCleared: true
    });
    assert.equal(fallback.status, "FALLBACK_READY_WITH_AUTHORITY");
    assert.equal(fallback.route, "INGRAMSPARK");

    const blocked = buildProviderHealthRoutingDecision({
      primaryHealth: CHANNEL_HEALTH_STATES.UNKNOWN,
      fallbackHealth: CHANNEL_HEALTH_STATES.HEALTHY,
      fallbackAllowed: true,
      duplicateRiskCleared: false
    });
    assert.equal(blocked.status, "ROUTING_BLOCKED");
    assert.equal(blocked.route, null);
    assert.equal(blocked.reason, "DUPLICATE_ROUTE_RISK_UNCLEARED");
  });
});

describe("DIST-004 ingestion adapters and closure readiness", () => {
  test("creates a UI-assisted upload work item without provider mutation", () => {
    const adapter = new CoreSourceUiAssistedAdapter();
    const prepared = generated();
    const result = adapter.submitMetadataPackage(prepared);

    assert.equal(result.submitted, false);
    assert.equal(result.adapter, "UI_ASSISTED");
    assert.equal(result.humanUploadTask, "SYSTEM_GENERATED");
    assert.equal(result.manualSpreadsheetAuthoringRequired, false);
    assert.equal(result.uploadWorkItem.rowCount, 1);
    assert.equal(result.uploadWorkItem.provider, PROVIDERS.CORESOURCE);
    assert.equal(result.uploadWorkItem.prohibitedActions.includes("DO_NOT_ACTIVATE_LSI_OR_RETAIL_CHANNELS"), true);
    assert.equal(result.realProviderActions, 0);
  });

  test("keeps machine adapter support-pending behind the same submission contract", () => {
    const adapter = new CoreSourceMachineAdapter();
    const result = adapter.submitMetadataPackage(generated());

    assert.equal(result.submitted, false);
    assert.equal(result.adapter, "MACHINE");
    assert.equal(result.reason, "MACHINE_INGESTION_SUPPORT_PENDING");
    assert.equal(result.realProviderActions, 0);
  });

  test("revalidates all ORCH-012 actions against the current architecture", () => {
    const result = revalidateOrch012Actions();

    assert.equal(result.total, 18);
    assert.equal(result.unaccounted, 0);
    assert.equal(result.actions.every((action) => action.certificationStillValid === true), true);
  });

  test("returns open/advanced readiness until provider health and canary proof are complete", () => {
    const readiness = buildDist004FinalReadiness({ generatedWorkbook: generated() });

    assert.equal(readiness.status, "OPEN_ADVANCED");
    assert.equal(readiness.templateContract, "PASS");
    assert.equal(readiness.workbookGenerator, "PASS");
    assert.equal(readiness.workbookValidator, "PASS");
    assert.equal(readiness.safeNondistributableCanaryState, "FAIL");
    assert.equal(readiness.coresourceIngestionAdapter, "UI_ASSISTED");
    assert.equal(readiness.coresourceMachineIngestion, "SUPPORT_PENDING");
    assert.equal(readiness.orch012ActionsRevalidated, 18);
    assert.equal(readiness.realProviderActions, 0);
    assert.equal(readiness.realPublicProducts, 0);
    assert.equal(readiness.realOnSaleProducts, 0);
    assert.equal(readiness.dist004CleanClosureReady, false);
  });
});
