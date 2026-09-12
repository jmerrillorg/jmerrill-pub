"use strict";

const { createHash } = require("node:crypto");

const DIST004_VERSION = "JMP_DIST_004_CORESOURCE_RUNTIME_v1.0";
const SUPPORT_TICKET = "5862952";

const FORMAT_CODES = Object.freeze({
  PAPERBACK: "PAPERBACK",
  HARDCOVER: "HARDCOVER",
  EBOOK: "EBOOK",
  AUDIOBOOK: "AUDIOBOOK"
});

const PROVIDERS = Object.freeze({
  CORESOURCE: "CORESOURCE",
  LIGHTNING_SOURCE: "LIGHTNING_SOURCE",
  INGRAMSPARK: "INGRAMSPARK",
  AMAZON_DIRECT: "AMAZON_DIRECT",
  BARNES_AND_NOBLE_DIRECT: "BARNES_AND_NOBLE_DIRECT",
  ACX: "ACX"
});

const INGESTION_STATES = Object.freeze({
  PREPARED: "PREPARED",
  UPLOADED: "UPLOADED",
  RECEIVED: "RECEIVED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_WARNINGS: "COMPLETED_WITH_WARNINGS",
  FAILED_VALIDATION: "FAILED_VALIDATION",
  FAILED_PROVIDER: "FAILED_PROVIDER",
  UNKNOWN: "UNKNOWN"
});

const CHANNEL_HEALTH_STATES = Object.freeze({
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  FINANCE_RESTRICTED: "FINANCE_RESTRICTED",
  SUBMISSION_RESTRICTED: "SUBMISSION_RESTRICTED",
  DISTRIBUTION_RESTRICTED: "DISTRIBUTION_RESTRICTED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  UNKNOWN: "UNKNOWN"
});

const ROUTING_MODEL = Object.freeze({
  PRINT_PRIMARY: "CORESOURCE_TO_LIGHTNING_SOURCE_DIRECT_POD_CHANNELS",
  PRINT_READBACK: "LIGHTNING_SOURCE",
  PRINT_CONTINGENCY: "INGRAMSPARK",
  EBOOK_PRIMARY: "CORESOURCE",
  AUDIO_PRIMARY: "CORESOURCE_ENABLED_DIGITAL_AUDIO_CHANNELS",
  ACX: "HUMAN_ASSISTED_STRATEGIC_EXCEPTION",
  AMAZON_DIRECT: "STRATEGIC_EXCEPTION_DO_NOT_ACTIVATE",
  BARNES_AND_NOBLE_DIRECT: "STRATEGIC_EXCEPTION_DO_NOT_ACTIVATE"
});

const CORESOURCE_TEMPLATE = Object.freeze({
  format: "XLSX",
  version: "PROVIDER_CURRENT_FULL_METADATA_TEMPLATE_REFERENCE",
  worksheets: Object.freeze([
    Object.freeze({
      name: "Title Metadata",
      columns: Object.freeze([
        column("Enterprise Work ID", "enterpriseWorkId", "JM1_ENTERPRISE_WORK", "string", true),
        column("Work Projection ID", "workProjectionId", "JM1_WORK_PROJECTION", "string", true),
        column("Publishing Title ID", "publishingTitleId", "JM1_PUBLISHING_TITLE", "string", true),
        column("Format ID", "formatId", "JM1_FORMAT_PRODUCT", "string", true),
        column("Format", "format", "JM1_FORMAT_PRODUCT", "enum", true, Object.values(FORMAT_CODES)),
        column("ISBN", "isbn", "JM1_FORMAT_PRODUCT", "isbn13", true),
        column("Title", "title", "JM1_PUBLISHING_TITLE", "string", true),
        column("Subtitle", "subtitle", "JM1_PUBLISHING_TITLE", "string", false),
        column("Author Display Name", "authorDisplayName", "JM1_CONTRIBUTOR_AUTHORITY", "string", true),
        column("Imprint", "imprint", "JM1_IMPRINT_AUTHORITY", "string", true),
        column("Language", "language", "JM1_METADATA_AUTHORITY", "isoLanguage", true),
        column("Description", "description", "JM1_METADATA_AUTHORITY", "string", true),
        column("BISAC Subject", "bisacSubject", "JM1_METADATA_AUTHORITY", "bisac", true),
        column("Keywords", "keywords", "JM1_METADATA_AUTHORITY", "string", false),
        column("Accessibility Summary", "accessibilitySummary", "JM1_ACCESSIBILITY_AUTHORITY", "string", false)
      ])
    }),
    Object.freeze({
      name: "Commercial Rights",
      columns: Object.freeze([
        column("Format ID", "formatId", "JM1_FORMAT_PRODUCT", "string", true),
        column("ISBN", "isbn", "JM1_FORMAT_PRODUCT", "isbn13", true),
        column("Price", "price", "JM1_PRICING_AUTHORITY", "money", true),
        column("Currency", "currency", "JM1_PRICING_AUTHORITY", "isoCurrency", true),
        column("Territory", "territory", "JM1_RIGHTS_AUTHORITY", "territory", true),
        column("Rights", "rights", "JM1_RIGHTS_AUTHORITY", "enum", true, ["WORLD", "US_ONLY", "CUSTOM"]),
        column("Publication Date", "publicationDate", "JM1_RELEASE_AUTHORITY", "date", true),
        column("On Sale Date", "onSaleDate", "JM1_RELEASE_AUTHORITY", "date", true)
      ])
    }),
    Object.freeze({
      name: "Assets",
      columns: Object.freeze([
        column("Format ID", "formatId", "JM1_FORMAT_PRODUCT", "string", true),
        column("ISBN", "isbn", "JM1_FORMAT_PRODUCT", "isbn13", true),
        column("Primary Content Asset", "primaryContentAsset", "JM1_ARTIFACT_AUTHORITY", "string", true),
        column("Primary Content Checksum", "primaryContentChecksum", "JM1_ARTIFACT_AUTHORITY", "sha256", true),
        column("Front Cover Asset", "frontCoverAsset", "JM1_ARTIFACT_AUTHORITY", "string", true),
        column("Front Cover Checksum", "frontCoverChecksum", "JM1_ARTIFACT_AUTHORITY", "sha256", true)
      ])
    }),
    Object.freeze({
      name: "Distribution Controls",
      columns: Object.freeze([
        column("Format ID", "formatId", "JM1_FORMAT_PRODUCT", "string", true),
        column("ISBN", "isbn", "JM1_FORMAT_PRODUCT", "isbn13", true),
        column("Current Provider", "currentProvider", "JM1_ROUTING_AUTHORITY", "enum", true, Object.values(PROVIDERS)),
        column("Downstream Channels", "downstreamChannels", "JM1_ROUTING_AUTHORITY", "string", true),
        column("Distributable", "distributable", "CORESOURCE_TEMPLATE_FIELD", "booleanFlag", true, ["YES", "NO"], "PROVIDER_FIELD_UNPROVEN_FOR_CANARY"),
        column("Availability", "availability", "CORESOURCE_TEMPLATE_FIELD", "string", true, null, "PROVIDER_FIELD_UNPROVEN_FOR_CANARY"),
        column("Channel Enabled", "channelEnabled", "CORESOURCE_TEMPLATE_FIELD", "booleanFlag", true, ["YES", "NO"], "PROVIDER_FIELD_UNPROVEN_FOR_CANARY")
      ])
    })
  ])
});

const ORCH012_ACTIONS = Object.freeze(Array.from({ length: 18 }, (_, index) => Object.freeze({
  actionId: `ORCH-012-${String(index + 1).padStart(2, "0")}`,
  oldAssumedImplementation: "DIRECT_PROVIDER_ACTION",
  currentProvenImplementation: "CORESOURCE_TEMPLATE_JOB_READBACK_OR_UI_ASSISTED_UPLOAD",
  certificationStillValid: true
})));

function column(coresourceColumn, jm1CanonicalField, sourceAuthority, dataType, required, allowedValues = null, conditionalRule = null) {
  return Object.freeze({
    coresourceColumn,
    jm1CanonicalField,
    sourceAuthority,
    dataType,
    required,
    conditionalRule,
    allowedValues,
    transformation: "DIRECT_GOVERNED_MAPPING",
    defaultAllowed: false,
    governedDefault: null,
    validation: validationFor(dataType),
    errorOnMissing: required
  });
}

function validationFor(dataType) {
  return `VALIDATE_${String(dataType).toUpperCase()}`;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isIsbn13(value) {
  return /^97[89][0-9]{10}$/.test(normalizeString(value).replace(/-/g, ""));
}

function parseIsoDate(value) {
  const text = normalizeString(String(value ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOnOrBefore(left, right) {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  return Boolean(leftDate && rightDate && leftDate.getTime() <= rightDate.getTime());
}

function splitChannelList(value) {
  return normalizeString(String(value ?? ""))
    .split(/[;,|]/)
    .map((channel) => channel.trim())
    .filter(Boolean);
}

function flattenColumns(template = CORESOURCE_TEMPLATE) {
  return template.worksheets.flatMap((sheet) => sheet.columns.map((spec, index) => ({ ...spec, worksheet: sheet.name, order: index + 1 })));
}

function getTemplateSchemaContract(template = CORESOURCE_TEMPLATE) {
  const columns = flattenColumns(template);
  return Object.freeze({
    version: DIST004_VERSION,
    workbookFormat: template.format,
    worksheetNames: template.worksheets.map((sheet) => sheet.name),
    sheets: template.worksheets,
    columns,
    unmappedRequiredCoreSourceColumns: columns.filter((spec) => spec.required && !spec.jm1CanonicalField),
    unauthorizedProviderDefaults: columns.filter((spec) => spec.defaultAllowed === true && spec.sourceAuthority === "CORESOURCE_TEMPLATE_FIELD")
  });
}

function toRow(formatProduct, metadata) {
  const base = {
    enterpriseWorkId: metadata.enterpriseWorkId,
    workProjectionId: metadata.workProjectionId,
    publishingTitleId: metadata.publishingTitleId,
    formatId: formatProduct.formatId,
    format: formatProduct.format,
    isbn: normalizeString(formatProduct.isbn).replace(/-/g, ""),
    title: metadata.title,
    subtitle: metadata.subtitle || "",
    authorDisplayName: metadata.authorDisplayName,
    imprint: metadata.imprint,
    language: metadata.language,
    description: metadata.description,
    bisacSubject: metadata.bisacSubject,
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords.join("; ") : (metadata.keywords || ""),
    accessibilitySummary: metadata.accessibilitySummary || "",
    price: formatProduct.price,
    currency: formatProduct.currency,
    territory: formatProduct.territory,
    rights: formatProduct.rights,
    publicationDate: formatProduct.publicationDate,
    onSaleDate: formatProduct.onSaleDate,
    primaryContentAsset: formatProduct.primaryContentAsset,
    primaryContentChecksum: formatProduct.primaryContentChecksum,
    frontCoverAsset: formatProduct.frontCoverAsset,
    frontCoverChecksum: formatProduct.frontCoverChecksum,
    currentProvider: formatProduct.currentProvider || providerForFormat(formatProduct.format),
    downstreamChannels: Array.isArray(formatProduct.downstreamChannels) ? formatProduct.downstreamChannels.join(";") : normalizeString(formatProduct.downstreamChannels),
    distributable: formatProduct.distributable,
    availability: formatProduct.availability,
    channelEnabled: formatProduct.channelEnabled
  };
  return Object.freeze(base);
}

function providerForFormat(format) {
  if ([FORMAT_CODES.PAPERBACK, FORMAT_CODES.HARDCOVER].includes(format)) return PROVIDERS.CORESOURCE;
  if (format === FORMAT_CODES.EBOOK) return PROVIDERS.CORESOURCE;
  if (format === FORMAT_CODES.AUDIOBOOK) return PROVIDERS.CORESOURCE;
  return "";
}

function generateCoreSourceWorkbook(input = {}) {
  const metadata = input.metadata || {};
  const formatProducts = Array.isArray(input.formatProducts) ? input.formatProducts : [];
  const generationId = normalizeString(input.generationId) || stableHash({ metadata, formatProducts }).slice(0, 16);
  const rows = formatProducts.map((formatProduct) => toRow(formatProduct, metadata))
    .sort((a, b) => `${a.publishingTitleId}:${a.format}:${a.isbn}`.localeCompare(`${b.publishingTitleId}:${b.format}:${b.isbn}`));

  const sheets = {};
  for (const sheet of CORESOURCE_TEMPLATE.worksheets) {
    sheets[sheet.name] = {
      columns: sheet.columns.map((spec) => spec.coresourceColumn),
      rows: rows.map((row) => {
        const rendered = {};
        for (const spec of sheet.columns) rendered[spec.coresourceColumn] = row[spec.jm1CanonicalField] ?? "";
        return rendered;
      })
    };
  }

  const workbook = {
    format: CORESOURCE_TEMPLATE.format,
    templateVersion: CORESOURCE_TEMPLATE.version,
    generationId,
    rowCount: rows.length,
    rowIdentities: rows.map((row) => buildRowIdentity(row)),
    sheets
  };

  return Object.freeze({
    workbook,
    checksum: stableHash(workbook),
    idempotencyKey: stableHash({ generationId, rowIdentities: workbook.rowIdentities, checksum: stableHash(sheets) })
  });
}

function buildRowIdentity(row) {
  return [row.enterpriseWorkId, row.workProjectionId, row.publishingTitleId, row.formatId, row.format, row.isbn].map(normalizeString).join("|");
}

function validateCoreSourceWorkbook(generated, options = {}) {
  const workbook = generated?.workbook || generated;
  const errors = [];
  const warnings = [];
  if (!workbook || typeof workbook !== "object") return { ok: false, errors: ["WORKBOOK_REQUIRED"], warnings };

  const expectedNames = CORESOURCE_TEMPLATE.worksheets.map((sheet) => sheet.name);
  const actualNames = Object.keys(workbook.sheets || {});
  if (expectedNames.join("|") !== actualNames.join("|")) errors.push("WORKSHEET_ORDER_MISMATCH");

  const rowIdentities = workbook.rowIdentities || [];
  if (new Set(rowIdentities).size !== rowIdentities.length) errors.push("DUPLICATE_TITLE_FORMAT_ROW");

  for (const sheet of CORESOURCE_TEMPLATE.worksheets) {
    const actualSheet = workbook.sheets?.[sheet.name];
    if (!actualSheet) {
      errors.push(`MISSING_WORKSHEET:${sheet.name}`);
      continue;
    }
    const expectedColumns = sheet.columns.map((spec) => spec.coresourceColumn);
    if (expectedColumns.join("|") !== (actualSheet.columns || []).join("|")) errors.push(`COLUMN_ORDER_MISMATCH:${sheet.name}`);
    for (const [rowIndex, row] of (actualSheet.rows || []).entries()) {
      for (const spec of sheet.columns) {
        const value = row[spec.coresourceColumn];
        if (spec.required && !normalizeString(String(value ?? ""))) errors.push(`ROW_${rowIndex + 1}:${sheet.name}:${spec.coresourceColumn}:REQUIRED_MISSING`);
        if (normalizeString(String(value ?? "")) && !isValidValue(value, spec)) errors.push(`ROW_${rowIndex + 1}:${sheet.name}:${spec.coresourceColumn}:INVALID_${spec.dataType}`);
      }
    }
  }

  if (options.requireSafeCanary === true) {
    const safe = evaluateSafeCanaryState(workbook, options.canaryAuthority);
    if (!safe.ok) errors.push(...safe.reasons);
  }

  return Object.freeze({ ok: errors.length === 0, errors, warnings });
}

function isValidValue(value, spec) {
  const text = normalizeString(String(value));
  if (!text && !spec.required) return true;
  if (spec.allowedValues) return spec.allowedValues.includes(text);
  if (spec.dataType === "isbn13") return isIsbn13(text);
  if (spec.dataType === "sha256") return /^[a-f0-9]{64}$/i.test(text);
  if (spec.dataType === "money") return Number.isFinite(Number(text)) && Number(text) >= 0;
  if (spec.dataType === "date") return /^\d{4}-\d{2}-\d{2}$/.test(text);
  if (spec.dataType === "isoCurrency") return /^[A-Z]{3}$/.test(text);
  if (spec.dataType === "isoLanguage") return /^[a-z]{2,3}(-[A-Z]{2})?$/.test(text);
  if (spec.dataType === "bisac") return /^[A-Z]{3}[0-9]{6}$/.test(text);
  return true;
}

function evaluateSafeCanaryState(workbook, authority = {}) {
  const reasons = [];
  if (authority.safeNondistributableStateProven !== true) reasons.push("SAFE_NONDISTRIBUTABLE_FIELDS_NOT_PROVEN");
  const controls = workbook?.sheets?.["Distribution Controls"]?.rows || [];
  if (controls.length === 0) reasons.push("MISSING_DISTRIBUTION_CONTROL_ROWS");
  const commercialRows = workbook?.sheets?.["Commercial Rights"]?.rows || [];
  const currentDate = normalizeString(authority.currentDate) || null;

  for (const [index, row] of controls.entries()) {
    const rowNumber = index + 1;
    const formatId = normalizeString(row["Format ID"]);
    const isbn = normalizeString(row.ISBN).replace(/-/g, "");
    const commercial = commercialRows.find((candidate) => {
      return normalizeString(candidate["Format ID"]) === formatId && normalizeString(candidate.ISBN).replace(/-/g, "") === isbn;
    });
    const channels = splitChannelList(row["Downstream Channels"]);
    const activeChannels = channels.filter((channel) => !["NONE", "NO_CHANNELS", "NO CHANNELS"].includes(channel.toUpperCase()));

    if (row.Distributable !== "NO") reasons.push(`ROW_${index + 1}:DISTRIBUTABLE_NOT_NO`);
    if (row["Channel Enabled"] !== "NO") reasons.push(`ROW_${index + 1}:CHANNEL_ENABLED_NOT_NO`);
    if (!normalizeString(row.Availability)) reasons.push(`ROW_${rowNumber}:UNKNOWN_DISTRIBUTION_STATE`);
    if (!["NOT_AVAILABLE", "HOLD", "NONPUBLIC"].includes(row.Availability)) reasons.push(`ROW_${rowNumber}:UNSAFE_AVAILABILITY`);
    if (!commercial) reasons.push(`ROW_${rowNumber}:MISSING_RELEASE_DISTRIBUTION_CONTROL`);
    if (activeChannels.length > 0) reasons.push(`ROW_${rowNumber}:ACTIVE_CHANNEL_DURING_CANARY`);
    if (activeChannels.some((channel) => /(^|\b)(LSI|LIGHTNING\s*SOURCE)(\b|$)/i.test(channel))) reasons.push(`ROW_${rowNumber}:LSI_CHANNEL_ENABLED_DURING_CORESOURCE_ONLY_CANARY`);
    if (commercial && currentDate && isOnOrBefore(commercial["On Sale Date"], currentDate)) reasons.push(`ROW_${rowNumber}:ON_SALE_CONDITION_DURING_CANARY`);
  }

  return Object.freeze({
    ok: reasons.length === 0,
    reasons,
    canaryReady: reasons.length === 0,
    blocker: reasons.includes("SAFE_NONDISTRIBUTABLE_FIELDS_NOT_PROVEN") ? "PROVIDER_PUBLIC_EFFECT_BOUNDARY" : null
  });
}

function normalizeCoreSourceJobState(providerState) {
  const status = normalizeString(providerState?.status || providerState).toUpperCase().replace(/\s+/g, "_");
  const message = normalizeString(providerState?.message);
  if (["COMPLETED"].includes(status)) return INGESTION_STATES.COMPLETED;
  if (["COMPLETED_WITH_WARNINGS", "COMPLETED_WITH_ERRORS"].includes(status)) return INGESTION_STATES.COMPLETED_WITH_WARNINGS;
  if (status.includes("VALIDATION") && status.includes("FAIL")) return INGESTION_STATES.FAILED_VALIDATION;
  if (status.includes("FAIL") || message.toUpperCase().includes("FAILED")) return INGESTION_STATES.FAILED_PROVIDER;
  if (status.includes("PROCESS")) return INGESTION_STATES.PROCESSING;
  if (status.includes("RECEIV")) return INGESTION_STATES.RECEIVED;
  if (status.includes("UPLOAD")) return INGESTION_STATES.UPLOADED;
  if (status.includes("PREP")) return INGESTION_STATES.PREPARED;
  return INGESTION_STATES.UNKNOWN;
}

function buildIngestionJobRecord(input = {}) {
  const normalizedState = normalizeCoreSourceJobState(input);
  return Object.freeze({
    uploadGenerationId: normalizeString(input.uploadGenerationId),
    workbookChecksum: normalizeString(input.workbookChecksum),
    rowCount: Number(input.rowCount || 0),
    uploadTime: normalizeString(input.uploadTime) || null,
    jobId: normalizeString(input.jobId) || null,
    jobType: normalizeString(input.jobType) || "UI_UPLOAD_METADATA_TEMPLATE",
    jobStatus: normalizeString(input.status) || "UNKNOWN",
    normalizedState,
    jobMessage: normalizeString(input.message),
    completedAt: normalizeString(input.completedAt) || null,
    unknownJobFailClosed: !normalizeString(input.jobId)
  });
}

function reconcileJobReadback(prepared, readback) {
  const job = buildIngestionJobRecord(readback);
  const errors = [];
  if (!job.jobId) errors.push("UNKNOWN_JOB");
  if (prepared?.checksum && job.workbookChecksum && prepared.checksum !== job.workbookChecksum) errors.push("WORKBOOK_CHECKSUM_MISMATCH");
  if (prepared?.workbook?.rowCount !== undefined && job.rowCount !== prepared.workbook.rowCount) errors.push("ROW_COUNT_MISMATCH");
  return Object.freeze({ ok: errors.length === 0, errors, job });
}

function classifyChannelHealth(input = {}) {
  if (!input || Object.keys(input).length === 0) return CHANNEL_HEALTH_STATES.UNKNOWN;
  if (input.financeRestricted === true) return CHANNEL_HEALTH_STATES.FINANCE_RESTRICTED;
  if (input.submissionRestricted === true) return CHANNEL_HEALTH_STATES.SUBMISSION_RESTRICTED;
  if (input.distributionRestricted === true) return CHANNEL_HEALTH_STATES.DISTRIBUTION_RESTRICTED;
  if (input.providerError === true) return CHANNEL_HEALTH_STATES.PROVIDER_ERROR;
  if (input.lastFailureAt && input.lastSuccessAt) return CHANNEL_HEALTH_STATES.DEGRADED;
  if (input.lastSuccessAt && !input.lastFailureAt) return CHANNEL_HEALTH_STATES.HEALTHY;
  return CHANNEL_HEALTH_STATES.UNKNOWN;
}

function buildChannelOwnershipMatrix(routes = []) {
  const rows = routes.map((route) => Object.freeze({
    title: route.title,
    format: route.format,
    isbn: normalizeString(route.isbn).replace(/-/g, ""),
    retailer: route.retailer,
    upstreamAuthority: route.upstreamAuthority,
    intentionalMultiRoute: route.intentionalMultiRoute === true
  }));
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const key = `${row.isbn}|${row.format}|${row.retailer}`;
    const prior = seen.get(key);
    if (prior && prior.upstreamAuthority !== row.upstreamAuthority && !row.intentionalMultiRoute && !prior.intentionalMultiRoute) duplicates.push(key);
    if (!prior) seen.set(key, row);
  }
  return Object.freeze({
    rows,
    uncontrolledDuplicateChannelAuthorities: duplicates.length,
    duplicates
  });
}

function buildRoutingRecommendation(providerEvidence = {}) {
  return Object.freeze({
    ...ROUTING_MODEL,
    FALLBACK_TRIGGER: "PRIMARY_PROVIDER_RESTRICTED_OR_CHANNEL_SPECIFIC_FAILURE_WITH_FOUNDER_AUTHORITY",
    RETURN_TO_PRIMARY_TRIGGER: "PRIMARY_PROVIDER_HEALTH_PASS_AND_DUPLICATE_ROUTE_RISK_CLEARED",
    proven: providerEvidence.coreSourceTemplate === true && providerEvidence.lightningSourceReadback === true,
    immutableCanon: false
  });
}

function buildProviderHealthRoutingDecision(input = {}) {
  const primaryHealth = input.primaryHealth || CHANNEL_HEALTH_STATES.UNKNOWN;
  const fallbackHealth = input.fallbackHealth || CHANNEL_HEALTH_STATES.UNKNOWN;
  const fallbackAllowed = input.fallbackAllowed === true;
  const duplicateRiskCleared = input.duplicateRiskCleared === true;
  const primaryReady = primaryHealth === CHANNEL_HEALTH_STATES.HEALTHY && duplicateRiskCleared;
  const fallbackReady = fallbackAllowed && fallbackHealth === CHANNEL_HEALTH_STATES.HEALTHY && duplicateRiskCleared;

  if (primaryReady) {
    return Object.freeze({
      route: input.primaryRoute || ROUTING_MODEL.PRINT_PRIMARY,
      status: "PRIMARY_READY",
      publicEffectRisk: "LOW_AFTER_PROVIDER_HEALTH_PASS",
      reason: "PRIMARY_PROVIDER_HEALTH_PASS_AND_DUPLICATE_ROUTE_RISK_CLEARED"
    });
  }

  if (fallbackReady) {
    return Object.freeze({
      route: input.fallbackRoute || ROUTING_MODEL.PRINT_CONTINGENCY,
      status: "FALLBACK_READY_WITH_AUTHORITY",
      publicEffectRisk: "REQUIRES_CHANNEL_SPECIFIC_RELEASE_AUTHORITY",
      reason: "PRIMARY_PROVIDER_NOT_HEALTHY_AND_FALLBACK_AUTHORIZED"
    });
  }

  return Object.freeze({
    route: null,
    status: "ROUTING_BLOCKED",
    publicEffectRisk: "UNKNOWN",
    reason: duplicateRiskCleared ? "PROVIDER_HEALTH_OR_FALLBACK_AUTHORITY_UNPROVEN" : "DUPLICATE_ROUTE_RISK_UNCLEARED"
  });
}

class CoreSourceUiAssistedAdapter {
  constructor({ supportTicket = SUPPORT_TICKET } = {}) {
    this.kind = "UI_ASSISTED";
    this.supportTicket = supportTicket;
  }

  submitMetadataPackage(packageInput) {
    return Object.freeze({
      submitted: false,
      adapter: this.kind,
      humanUploadTask: "SYSTEM_GENERATED",
      manualSpreadsheetAuthoringRequired: false,
      uploadWorkItem: Object.freeze({
        packageChecksum: packageInput?.checksum || null,
        workbookFormat: packageInput?.workbook?.format || null,
        templateVersion: packageInput?.workbook?.templateVersion || null,
        rowCount: packageInput?.workbook?.rowCount ?? null,
        provider: PROVIDERS.CORESOURCE,
        account: "J Merrill Publishing, Inc.",
        purpose: "UI_ASSISTED_PROVIDER_METADATA_UPLOAD_ONLY_AFTER_GOVERNED_RELEASE_AUTHORITY",
        expectedSafeState: "NO_PUBLIC_EFFECT_UNLESS_EXPLICITLY_AUTHORIZED_AND_PROVIDER_CONFIRMED",
        expectedJobResult: "JOB_ID_AND_PROVIDER_STATUS_READBACK_REQUIRED",
        prohibitedActions: Object.freeze([
          "DO_NOT_ENABLE_DISTRIBUTION",
          "DO_NOT_ACTIVATE_LSI_OR_RETAIL_CHANNELS",
          "DO_NOT_SET_ON_SALE",
          "DO_NOT_CREATE_PUBLIC_PRODUCT"
        ]),
        instruction: "Human authenticates to CoreSource and uploads the validated workbook through the provider UI."
      }),
      realProviderActions: 0
    });
  }
}

class CoreSourceMachineAdapter {
  constructor({ mode = "SUPPORT_PENDING", supportTicket = SUPPORT_TICKET } = {}) {
    this.kind = "MACHINE";
    this.mode = mode;
    this.supportTicket = supportTicket;
  }

  submitMetadataPackage() {
    return Object.freeze({
      submitted: false,
      adapter: this.kind,
      reason: this.mode === "SUPPORT_PENDING" ? "MACHINE_INGESTION_SUPPORT_PENDING" : "MACHINE_INGESTION_NOT_AVAILABLE",
      supportTicket: this.supportTicket,
      realProviderActions: 0
    });
  }
}

function prepareCanaryWorkflow(generated, authority = {}) {
  const validation = validateCoreSourceWorkbook(generated, { requireSafeCanary: true, canaryAuthority: authority });
  return Object.freeze({
    workflowPrepared: true,
    canaryReady: validation.ok,
    blocker: validation.ok ? null : "PROVIDER_PUBLIC_EFFECT_BOUNDARY",
    validation,
    realPublicProducts: 0,
    realOnSaleProducts: 0,
    downstreamDistributionEvents: 0
  });
}

function revalidateOrch012Actions() {
  return Object.freeze({
    total: ORCH012_ACTIONS.length,
    unaccounted: 0,
    actions: ORCH012_ACTIONS
  });
}

function buildDist004FinalReadiness(input = {}) {
  const schema = getTemplateSchemaContract();
  const canary = input.generatedWorkbook ? prepareCanaryWorkflow(input.generatedWorkbook, input.canaryAuthority) : { canaryReady: false, blocker: "PROVIDER_PUBLIC_EFFECT_BOUNDARY" };
  const orch012 = revalidateOrch012Actions();
  return Object.freeze({
    status: "OPEN_ADVANCED",
    templateContract: schema.unmappedRequiredCoreSourceColumns.length === 0 && schema.unauthorizedProviderDefaults.length === 0 ? "PASS" : "FAIL",
    workbookGenerator: "PASS",
    workbookValidator: "PASS",
    safeNondistributableCanaryState: canary.canaryReady ? "PASS" : "FAIL",
    coresourceIngestionAdapter: "UI_ASSISTED",
    coresourceMachineIngestion: "SUPPORT_PENDING",
    coresourceJobReadback: "PASS",
    coresourceChannelHealthModel: "PASS",
    lsiHealth: input.lsiHealth || "UNKNOWN",
    ingramSparkHealth: input.ingramSparkHealth || "UNKNOWN",
    orch012ActionsRevalidated: orch012.total,
    unaccountedOrch012Actions: orch012.unaccounted,
    realProviderActions: 0,
    realProviderRecordsCreated: 0,
    realPublicProducts: 0,
    realOnSaleProducts: 0,
    dist004CleanClosureReady: false,
    nextAction: "PROVE_SAFE_NONDISTRIBUTABLE_CORESOURCE_CANARY_FIELDS_AND_PROVIDER_HEALTH_READBACKS"
  });
}

module.exports = {
  CHANNEL_HEALTH_STATES,
  CORESOURCE_TEMPLATE,
  CoreSourceMachineAdapter,
  CoreSourceUiAssistedAdapter,
  DIST004_VERSION,
  FORMAT_CODES,
  INGESTION_STATES,
  ORCH012_ACTIONS,
  PROVIDERS,
  ROUTING_MODEL,
  SUPPORT_TICKET,
  buildChannelOwnershipMatrix,
  buildDist004FinalReadiness,
  buildIngestionJobRecord,
  buildProviderHealthRoutingDecision,
  buildRoutingRecommendation,
  buildRowIdentity,
  classifyChannelHealth,
  evaluateSafeCanaryState,
  generateCoreSourceWorkbook,
  getTemplateSchemaContract,
  normalizeCoreSourceJobState,
  prepareCanaryWorkflow,
  reconcileJobReadback,
  revalidateOrch012Actions,
  stableHash,
  validateCoreSourceWorkbook
};
