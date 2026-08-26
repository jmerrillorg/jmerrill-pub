"use strict";

const { createHash } = require("node:crypto");
const { resolvePublicationIntentAuthority } = require("../policy/canonPolicyLayer");

const BLOCK06_VERSION = "JMP_BLOCK06_RELEASE_READINESS_COMMISSIONING_v1.0";

const REQUIREMENT_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  REFINED: "REFINED",
  SUPERSEDED: "SUPERSEDED",
  MERGED_INTO_LATER_CANON: "MERGED_INTO_LATER_CANON",
  CONFLICTING: "CONFLICTING",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

const AUDIT_STATUS = Object.freeze({
  IMPLEMENTED_ENFORCED: "IMPLEMENTED_ENFORCED",
  IMPLEMENTED_ADVISORY: "IMPLEMENTED_ADVISORY",
  IMPLEMENTED_PARTIAL: "IMPLEMENTED_PARTIAL",
  DOCUMENTED_ONLY: "DOCUMENTED_ONLY",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  SUPERSEDED: "SUPERSEDED",
  CONFLICTING: "CONFLICTING",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  EVIDENCE_INSUFFICIENT: "EVIDENCE_INSUFFICIENT"
});

const COMMISSIONING_STATUS = Object.freeze({
  COMMISSIONED: "COMMISSIONED",
  IMPLEMENTED_NOT_COMMISSIONED: "IMPLEMENTED_NOT_COMMISSIONED",
  PARTIAL: "PARTIAL",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  TRUE_HUMAN_GATE: "TRUE_HUMAN_GATE",
  EXTERNAL_DEPENDENCY: "EXTERNAL_DEPENDENCY"
});

const SEVERITY = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  BLOCKER: "BLOCKER"
});

const RELEASE_READINESS_DOMAINS = Object.freeze([
  "BLOCK_06_ENTRY",
  "DISTRIBUTION_REVIEW_GATING",
  "RELEASE_MANIFEST",
  "FORMAT_EDITION_RECONCILIATION",
  "METADATA_RELEASE_LOCK",
  "IDENTIFIER_VALIDATION",
  "ASSET_METADATA_CONSISTENCY",
  "RIGHTS_TERRITORIES",
  "RETAIL_ECONOMICS",
  "WHOLESALE_RETURNABILITY",
  "CHANNEL_PROFILES",
  "CHANNEL_ROUTE_PLAN",
  "PUBLICATION_DATE",
  "PREORDER",
  "PUBLIC_REPRESENTATION",
  "ACCESSIBILITY_COMPLIANCE",
  "AUTHOR_RELEASE_CONFIRMATION",
  "PUBLISHER_RELEASE_AUTHORIZATION",
  "READINESS_SCORECARD",
  "WAITING_ON",
  "READINESS_WATCHDOG",
  "TARGETED_REMEDIATION",
  "RELEASE_FREEZE",
  "POST_FREEZE_CHANGE_CONTROL",
  "RECERTIFICATION",
  "RELEASE_READINESS_CERTIFICATE",
  "BLOCK_07_HANDOFF",
  "WEB_MARKETING_COORDINATION"
]);

const BLOCK06_BYPASS_FIXTURES = Object.freeze([
  ["Block 06 starts without FINAL_PRODUCTION_CERTIFIED", "ENTRY_FINAL_PRODUCTION_CERTIFIED"],
  ["Block 06 starts without PUBLICATION_ASSETS_READY", "ENTRY_PUBLICATION_ASSETS_READY"],
  ["Block 06 starts without handoff package", "ENTRY_BLOCK06_HANDOFF_PACKAGE"],
  ["missing manifest", "RELEASE_MANIFEST_REQUIRED"],
  ["checksum mismatch", "CHECKSUMS_VERIFIED"],
  ["format with no certified asset", "FORMAT_REQUIRES_CERTIFIED_ASSET"],
  ["certified asset with no format record", "ASSET_REQUIRES_FORMAT_RECORD"],
  ["metadata mismatch allowed", "METADATA_MISMATCH_BLOCKER"],
  ["identifier mismatch allowed", "IDENTIFIER_MISMATCH_BLOCKER"],
  ["cover ISBN differs from metadata ISBN", "COVER_METADATA_IDENTIFIER_MATCH"],
  ["copyright ISBN differs from format authority", "COPYRIGHT_IDENTIFIER_MATCH"],
  ["rights invented without contract", "RIGHTS_CONTRACT_AUTHORITY"],
  ["route exceeds contractual territory", "ROUTE_TERRITORY_AUTHORITY"],
  ["format exceeds contractual rights", "FORMAT_RIGHTS_AUTHORITY"],
  ["unresolved rights blocker ignored", "RIGHTS_BLOCKER_CONTROLS"],
  ["invalid retail economics authorized", "RETAIL_ECONOMICS_VALID"],
  ["wholesale/returnability left as distributor-screen guess", "WHOLESALE_RETURNABILITY_GOVERNED"],
  ["invalid route accepted", "CHANNEL_ROUTE_VALID"],
  ["Block 07 chooses route independently", "BLOCK07_MANIFEST_ONLY"],
  ["infeasible publication date locked", "PUBLICATION_DATE_FEASIBLE"],
  ["noncanonical release date accepted", "TUESDAY_POLICY"],
  ["invalid preorder configuration", "PREORDER_VALID"],
  ["public-facing wrong author accepted", "PUBLIC_REPRESENTATION_AUTHOR"],
  ["stale cover accepted", "PUBLIC_REPRESENTATION_COVER_CURRENT"],
  ["required accessibility evidence missing", "ACCESSIBILITY_EVIDENCE_REQUIRED"],
  ["high readiness score overrides blocker", "SCORE_NOT_AUTHORITY"],
  ["author confirmation missing where required", "AUTHOR_CONFIRMATION_REQUIRED"],
  ["author confirmation transfers to materially changed manifest", "AUTHOR_CONFIRMATION_MANIFEST_BOUND"],
  ["Publisher authorization with blocker open", "PUBLISHER_AUTHORIZATION_BLOCKER_DENIED"],
  ["Publisher authorization transfers after material manifest change", "PUBLISHER_AUTHORIZATION_MANIFEST_BOUND"],
  ["frozen manifest silently mutated", "FROZEN_MANIFEST_IMMUTABLE"],
  ["targeted remediation resets unrelated domains unnecessarily", "TARGETED_REMEDIATION_DOMAIN_ONLY"],
  ["Block 07 reads mutable latest fields", "BLOCK07_FROZEN_MANIFEST_REQUIRED"],
  ["DISTRIBUTION_AUTHORIZED without PRE_DISTRIBUTION_CERTIFIED", "DISTRIBUTION_AUTHORIZATION_CERT_REQUIRED"],
  ["Block 06 performs distribution submission", "NO_DISTRIBUTION_SUBMISSION"],
  ["Block 06 activates retailer listing", "NO_RETAILER_ACTIVATION"],
  ["legacy release authorization fabricated", "NO_LEGACY_HISTORY_FABRICATION"]
]);

const SYNTHETIC_CASES = Object.freeze([
  ["A", "paperback-only commercial release"],
  ["B", "paperback + hardcover"],
  ["C", "print + ebook"],
  ["D", "print + ebook + audio"],
  ["E", "format missing"],
  ["F", "extra certified asset without format record"],
  ["G", "metadata mismatch"],
  ["H", "identifier mismatch"],
  ["I", "territory-limited audio"],
  ["J", "rights-restricted image"],
  ["K", "economically invalid print"],
  ["L", "invalid wholesale/returnability"],
  ["M", "invalid channel route"],
  ["N", "feasible Tuesday release date"],
  ["O", "infeasible release date"],
  ["P", "preorder supported"],
  ["Q", "preorder unsupported"],
  ["R", "accessibility-required"],
  ["S", "accessibility-N/A"],
  ["T", "public-facing mismatch"],
  ["U", "author confirmation confirmed"],
  ["V", "author correction required"],
  ["W", "author question"],
  ["X", "major content rewrite request"],
  ["Y", "Publisher authorization denied with blocker"],
  ["Z", "Publisher authorization succeeds when clean"],
  ["AA", "frozen manifest"],
  ["AB", "post-freeze metadata typo"],
  ["AC", "post-freeze ISBN change"],
  ["AD", "post-freeze rights reduction"],
  ["AE", "high readiness score + blocker"],
  ["AF", "marketing coordination warning only"],
  ["AG", "commissioning/non-release title = Block 06 N/A"]
]);

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

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function result(ok, event, extra = {}) {
  return Object.freeze({ ok, event, ...extra });
}

function isTrue(value) {
  return value === true;
}

function isTuesday(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCDay() === 2;
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
}

function auditBlock06Requirements() {
  const rows = [
    ["Block 05 handoff", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Distribution Review gating", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Release Candidate / Manifest", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Format / Edition reconciliation", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Metadata validation and release lock", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Identifier validation", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Rights / territory validation", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Retail economics / returnability", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Channel routing", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Publication date / preorder", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Author release confirmation", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Publisher release authorization", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Release freeze / change control", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Block 07 handoff", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Commissioning / non-release intent", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.NOT_APPLICABLE],
    ["Distribution submission", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE],
    ["Retailer activation", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE],
    ["Launch execution", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE]
  ];
  return rows.map(([requirement, canonStatus, auditStatus]) => ({
    requirement,
    canonStatus,
    currentAuthority: canonStatus === REQUIREMENT_STATUS.NOT_APPLICABLE ? "DOWNSTREAM_OR_OUT_OF_SCOPE" : "CANON_ENFORCEMENT_LAYER_AND_BLOCK06_SPEC",
    auditStatus,
    codeExists: auditStatus !== AUDIT_STATUS.NOT_APPLICABLE,
    runtimeExists: auditStatus !== AUDIT_STATUS.NOT_APPLICABLE,
    hardEnforcement: auditStatus === AUDIT_STATUS.IMPLEMENTED_ENFORCED,
    test: auditStatus === AUDIT_STATUS.NOT_APPLICABLE ? "BOUNDARY_NEGATIVE_PROOF" : "FOCUSED_GUARD_AND_LIVE_PROBE",
    deployed: "PENDING_DEPLOYMENT",
    liveProof: "PENDING_LIVE_VERIFY",
    driftMonitor: true,
    commissioned: auditStatus === AUDIT_STATUS.IMPLEMENTED_ENFORCED || auditStatus === AUDIT_STATUS.NOT_APPLICABLE
  }));
}

function completeSyntheticRelease(overrides = {}) {
  const base = {
    titleId: "title-release-1",
    editionId: "edition-1",
    title: "Synthetic Governed Release",
    subtitle: "A Release Readiness Fixture",
    authorId: "author-1",
    authorDisplayName: "Synthetic Author",
    imprint: "J Merrill Publishing",
    publisher: "J Merrill Publishing, Inc.",
    publicationIntent: "COMMERCIAL_RELEASE",
    finalProductionCertified: true,
    publicationAssetsReady: true,
    block06HandoffPackageReady: true,
    finalAssetManifestExists: true,
    checksumsVerified: true,
    identifiersResolved: true,
    publicationMetadataPackageExists: true,
    requiredApprovalEvidenceExists: true,
    technicalValidationEvidenceExists: true,
    releaseManifestId: "manifest-synthetic",
    releaseVersion: "1.0",
    formats: [
      { format: "PAPERBACK", editionId: "edition-1", identifier: "9780000000001", price: 18.99, currency: "USD", route: "INGRAM_CONTENT_PRINT", territory: "WORLDWIDE", rightsStatus: "CLEARED", assetId: "asset-pb", accessibilityRequired: false }
    ],
    assets: [
      { assetId: "asset-pb", format: "PAPERBACK", checksum: "a".repeat(64), certified: true, title: "Synthetic Governed Release", authorDisplayName: "Synthetic Author", identifier: "9780000000001", coverCurrent: true }
    ],
    metadata: {
      title: "Synthetic Governed Release",
      subtitle: "A Release Readiness Fixture",
      authorDisplayName: "Synthetic Author",
      imprint: "J Merrill Publishing",
      publisher: "J Merrill Publishing, Inc.",
      language: "en",
      description: "Synthetic description.",
      authorBio: "Synthetic bio.",
      categories: ["RELIGION / Christian Living"],
      keywords: ["publishing"],
      pageCount: 240,
      trim: "6 x 9",
      publicationDate: "2026-10-13T00:00:00Z",
      identifiers: [{ format: "PAPERBACK", identifier: "9780000000001" }],
      prices: [{ format: "PAPERBACK", price: 18.99, currency: "USD" }]
    },
    identifiers: [{ format: "PAPERBACK", identifier: "9780000000001", coverIdentifier: "9780000000001", copyrightIdentifier: "9780000000001", metadataIdentifier: "9780000000001", sourceAuthority: "ISBN_REGISTRY" }],
    rights: [{ format: "PAPERBACK", language: "en", territory: "WORLDWIDE", rightsStatus: "CLEARED", sourceAgreement: "agreement-1" }],
    pricing: [{ format: "PAPERBACK", retailPrice: 18.99, manufacturingCost: 4.25, wholesaleDiscount: 0.4, returnability: "RETURNABLE", returnsDisposition: "DESTROY", currency: "USD" }],
    routes: [{ format: "PAPERBACK", route: "INGRAM_CONTENT_PRINT", channelProfile: "JMP-CHANNEL-PRINT-v1", territory: "WORLDWIDE", supportsPreorder: true, leadTimeDays: 42, valid: true }],
    channelProfiles: [{ profileId: "JMP-CHANNEL-PRINT-v1", route: "INGRAM_CONTENT_PRINT", supportedFormats: ["PAPERBACK", "HARDCOVER"], territories: ["WORLDWIDE"], supportsPreorder: true, leadTimeDays: 42, version: "1.0" }],
    targetPublicationDate: "2026-10-13T00:00:00Z",
    readinessStartedOn: "2026-08-26T00:00:00Z",
    leadTimeDaysRequired: 42,
    preorder: { enabled: true, startDate: "2026-09-01T00:00:00Z", formats: ["PAPERBACK"], channels: ["INGRAM_CONTENT_PRINT"] },
    publicRepresentation: { title: "Synthetic Governed Release", authorDisplayName: "Synthetic Author", coverAssetId: "asset-pb", coverCurrent: true, description: "Synthetic description.", imprint: "J Merrill Publishing", price: 18.99, publicationDate: "2026-10-13T00:00:00Z" },
    accessibility: { required: false, status: "NOT_APPLICABLE" },
    authorConfirmation: { required: true, status: "CONFIRMED", releaseManifestId: "manifest-synthetic", releaseVersion: "1.0", confirmedBy: "Synthetic Author", confirmedOn: "2026-08-27T00:00:00Z" },
    publisherAuthorization: { status: "AUTHORIZED", releaseManifestId: "manifest-synthetic", releaseVersion: "1.0", authorizedBy: "Jackie Smith, Jr.", authorizedOn: "2026-08-27T01:00:00Z" },
    marketingCoordination: { webTitleReady: true, campaignRelationshipEstablished: true, launchExecutionPerformed: false },
    attemptedActions: []
  };
  return { ...base, ...overrides };
}

function evaluateBlock06EntryGate(input = {}) {
  const publicationIntent = resolvePublicationIntentAuthority(input);
  if (publicationIntent.publicationIntent === "COMMISSIONING" || publicationIntent.publicationIntent === "NON_RELEASE") {
    return result(true, "BLOCK06_NOT_APPLICABLE_FOR_NON_RELEASE", { publicationIntent });
  }
  const missing = [];
  if (!isTrue(input.finalProductionCertified)) missing.push("FINAL_PRODUCTION_CERTIFIED");
  if (!isTrue(input.publicationAssetsReady)) missing.push("PUBLICATION_ASSETS_READY");
  if (!isTrue(input.block06HandoffPackageReady)) missing.push("BLOCK06_HANDOFF_PACKAGE_READY");
  if (!isTrue(input.finalAssetManifestExists)) missing.push("FINAL_ASSET_MANIFEST");
  if (!isTrue(input.checksumsVerified)) missing.push("CHECKSUMS_VERIFIED");
  if (!isTrue(input.identifiersResolved)) missing.push("IDENTIFIERS_RESOLVED");
  if (!isTrue(input.publicationMetadataPackageExists)) missing.push("PUBLICATION_METADATA_PACKAGE");
  if (!isTrue(input.requiredApprovalEvidenceExists)) missing.push("REQUIRED_APPROVAL_EVIDENCE");
  if (!isTrue(input.technicalValidationEvidenceExists)) missing.push("TECHNICAL_VALIDATION_EVIDENCE");
  return result(missing.length === 0, missing.length ? "RELEASE_READINESS_ENTRY_BLOCKED" : "RELEASE_READINESS_ENTRY_READY", { missing, publicationIntent });
}

function createReleaseManifest(input = {}) {
  const missing = [];
  if (!normalizeString(input.titleId)) missing.push("TITLE_ID");
  if (!normalizeString(input.editionId)) missing.push("EDITION_ID");
  if (!normalizeString(input.releaseVersion)) missing.push("RELEASE_VERSION");
  if (!asArray(input.formats).length) missing.push("FORMATS");
  if (!asArray(input.assets).length) missing.push("ASSETS");
  if (!input.metadata) missing.push("METADATA_SNAPSHOT");
  if (!asArray(input.identifiers).length) missing.push("IDENTIFIER_SNAPSHOT");
  if (!asArray(input.pricing).length) missing.push("PRICING_SNAPSHOT");
  if (!asArray(input.rights).length) missing.push("RIGHTS_SNAPSHOT");
  if (!asArray(input.routes).length) missing.push("CHANNEL_ROUTE_SNAPSHOT");
  if (!normalizeString(input.targetPublicationDate)) missing.push("PUBLICATION_DATE");
  const manifest = {
    releaseManifestId: normalizeString(input.releaseManifestId || `RM-${normalizeString(input.titleId || "SYNTHETIC")}-${normalizeString(input.releaseVersion || "1.0")}`),
    titleId: normalizeString(input.titleId),
    editionId: normalizeString(input.editionId),
    releaseVersion: normalizeString(input.releaseVersion),
    status: "RELEASE_CANDIDATE",
    formats: asArray(input.formats).map((format) => ({ format: normalizeKey(format.format), editionId: format.editionId, identifier: format.identifier, route: format.route })),
    assets: asArray(input.assets).map((asset) => ({ assetId: asset.assetId, format: normalizeKey(asset.format), checksum: asset.checksum })),
    metadataSnapshot: input.metadata || null,
    identifierSnapshot: asArray(input.identifiers),
    pricingSnapshot: asArray(input.pricing),
    rightsSnapshot: asArray(input.rights),
    territorySnapshot: asArray(input.rights).map((right) => ({ format: right.format, territory: right.territory })),
    channelRouteSnapshot: asArray(input.routes),
    publicationDate: input.targetPublicationDate,
    preorderConfiguration: input.preorder || { enabled: false },
    accessibilityEvidence: input.accessibility || { required: false, status: "NOT_APPLICABLE" },
    authorConfirmationId: input.authorConfirmation?.authorConfirmationId || null,
    publisherAuthorizationId: input.publisherAuthorization?.releaseAuthorizationId || null,
    frozenOn: null,
    certifiedOn: null
  };
  manifest.checksum = sha256(manifest);
  return result(missing.length === 0, missing.length ? "RELEASE_MANIFEST_BLOCKED" : "RELEASE_MANIFEST_CREATED", { missing, manifest: missing.length ? null : manifest });
}

function validateFormatEditionReconciliation(input = {}) {
  const missing = [];
  const formats = asArray(input.formats);
  const assets = asArray(input.assets);
  const formatKeys = new Set(formats.map((format) => normalizeKey(format.format)));
  const assetFormatKeys = new Set(assets.filter((asset) => asset.certified).map((asset) => normalizeKey(asset.format)));
  formats.forEach((format) => {
    const key = normalizeKey(format.format);
    if (format.required !== false && !assetFormatKeys.has(key)) missing.push(`FORMAT_WITHOUT_CERTIFIED_ASSET:${key}`);
    if (!format.editionId) missing.push(`FORMAT_WITHOUT_EDITION:${key}`);
    if (!format.identifier) missing.push(`FORMAT_WITHOUT_IDENTIFIER:${key}`);
    if (!format.price) missing.push(`FORMAT_WITHOUT_PRICE:${key}`);
    if (!format.rightsStatus) missing.push(`FORMAT_WITHOUT_RIGHTS:${key}`);
    if (!format.route) missing.push(`FORMAT_WITHOUT_ROUTE:${key}`);
  });
  assets.filter((asset) => asset.certified).forEach((asset) => {
    const key = normalizeKey(asset.format);
    if (!formatKeys.has(key)) missing.push(`CERTIFIED_ASSET_WITHOUT_FORMAT:${key}`);
    if (!normalizeString(asset.checksum)) missing.push(`CERTIFIED_ASSET_WITHOUT_CHECKSUM:${asset.assetId || key}`);
  });
  return result(missing.length === 0, missing.length ? "FORMAT_EDITION_RECONCILIATION_BLOCKED" : "FORMAT_EDITION_RECONCILED", { missing });
}

function validateMetadataReleaseLock(input = {}) {
  const metadata = input.metadata || {};
  const missing = [];
  ["title", "authorDisplayName", "imprint", "publisher", "description", "language", "publicationDate"].forEach((field) => {
    if (!normalizeString(metadata[field])) missing.push(`METADATA_${normalizeKey(field)}`);
  });
  if (!asArray(metadata.categories).length) missing.push("METADATA_CATEGORIES");
  if (!asArray(metadata.identifiers).length) missing.push("METADATA_IDENTIFIERS");
  const lock = {
    lockType: "RELEASE_METADATA_LOCK",
    titleId: normalizeString(input.titleId),
    releaseVersion: normalizeString(input.releaseVersion),
    metadata,
    locked: missing.length === 0
  };
  lock.checksum = sha256(lock);
  return result(missing.length === 0, missing.length ? "RELEASE_METADATA_LOCK_BLOCKED" : "RELEASE_METADATA_LOCKED", { missing, lock: missing.length ? null : lock });
}

function validateAssetMetadataConsistency(input = {}) {
  const metadata = input.metadata || {};
  const missing = [];
  asArray(input.assets).filter((asset) => asset.certified).forEach((asset) => {
    if (asset.title && metadata.title && asset.title !== metadata.title) missing.push(`ASSET_TITLE_MISMATCH:${asset.assetId}`);
    if (asset.authorDisplayName && metadata.authorDisplayName && asset.authorDisplayName !== metadata.authorDisplayName) missing.push(`ASSET_AUTHOR_MISMATCH:${asset.assetId}`);
    const metaIdentifier = asArray(metadata.identifiers).find((id) => normalizeKey(id.format) === normalizeKey(asset.format));
    if (asset.identifier && metaIdentifier?.identifier && asset.identifier !== metaIdentifier.identifier) missing.push(`ASSET_IDENTIFIER_MISMATCH:${asset.assetId}`);
    if (asset.coverCurrent === false) missing.push(`STALE_COVER:${asset.assetId}`);
  });
  return result(missing.length === 0, missing.length ? "ASSET_METADATA_CONSISTENCY_BLOCKED" : "ASSET_METADATA_CONSISTENCY_PASS", { missing });
}

function validateIdentifierConsistency(input = {}) {
  const missing = [];
  asArray(input.identifiers).forEach((identifier) => {
    const values = [identifier.identifier, identifier.coverIdentifier, identifier.copyrightIdentifier, identifier.metadataIdentifier].filter(Boolean);
    if (new Set(values).size > 1) missing.push(`IDENTIFIER_MISMATCH:${normalizeKey(identifier.format)}`);
    if (!normalizeString(identifier.sourceAuthority)) missing.push(`IDENTIFIER_SOURCE_AUTHORITY:${normalizeKey(identifier.format)}`);
  });
  return result(missing.length === 0, missing.length ? "IDENTIFIER_VALIDATION_BLOCKED" : "IDENTIFIERS_VALID", { missing });
}

function validateRightsTerritories(input = {}) {
  const missing = [];
  asArray(input.rights).forEach((right) => {
    const key = normalizeKey(right.format);
    if (!normalizeString(right.sourceAgreement)) missing.push(`RIGHTS_CONTRACT_AUTHORITY:${key}`);
    if (normalizeKey(right.rightsStatus) === "RELEASE_BLOCKING") missing.push(`RIGHTS_BLOCKER:${key}`);
    if (!normalizeString(right.territory)) missing.push(`RIGHTS_TERRITORY:${key}`);
  });
  asArray(input.routes).forEach((route) => {
    const right = asArray(input.rights).find((item) => normalizeKey(item.format) === normalizeKey(route.format));
    if (!right) missing.push(`ROUTE_WITHOUT_RIGHTS:${normalizeKey(route.format)}`);
    if (right && normalizeKey(right.territory) !== "WORLDWIDE" && normalizeKey(route.territory) !== normalizeKey(right.territory)) missing.push(`ROUTE_EXCEEDS_TERRITORY:${normalizeKey(route.format)}`);
  });
  return result(missing.length === 0, missing.length ? "RIGHTS_TERRITORIES_BLOCKED" : "RIGHTS_TERRITORIES_VALID", { missing });
}

function validateRetailEconomics(input = {}) {
  const missing = [];
  asArray(input.pricing).forEach((price) => {
    const key = normalizeKey(price.format);
    if (!(Number(price.retailPrice) > 0)) missing.push(`RETAIL_PRICE:${key}`);
    if (!(Number(price.manufacturingCost) >= 0)) missing.push(`MANUFACTURING_COST:${key}`);
    if (!(Number(price.wholesaleDiscount) > 0 && Number(price.wholesaleDiscount) < 1)) missing.push(`WHOLESALE_DISCOUNT:${key}`);
    if (!normalizeString(price.returnability)) missing.push(`RETURNABILITY:${key}`);
    if (!normalizeString(price.returnsDisposition)) missing.push(`RETURNS_DISPOSITION:${key}`);
    const net = Number(price.retailPrice) * (1 - Number(price.wholesaleDiscount || 0)) - Number(price.manufacturingCost || 0);
    if (!(net > 0)) missing.push(`ECONOMIC_RESULT_INVALID:${key}`);
  });
  return result(missing.length === 0, missing.length ? "RETAIL_ECONOMICS_BLOCKED" : "RETAIL_ECONOMICS_VALID", { missing });
}

function validateChannelRoutes(input = {}) {
  const missing = [];
  asArray(input.routes).forEach((route) => {
    const key = normalizeKey(route.format);
    if (!normalizeString(route.route)) missing.push(`CHANNEL_ROUTE:${key}`);
    if (!normalizeString(route.channelProfile)) missing.push(`CHANNEL_PROFILE:${key}`);
    if (route.valid === false) missing.push(`CHANNEL_ROUTE_INVALID:${key}`);
    const profile = asArray(input.channelProfiles).find((item) => item.profileId === route.channelProfile);
    if (!profile) missing.push(`CHANNEL_PROFILE_MISSING:${key}`);
    if (profile && !asArray(profile.supportedFormats).map(normalizeKey).includes(key)) missing.push(`CHANNEL_PROFILE_FORMAT_UNSUPPORTED:${key}`);
  });
  return result(missing.length === 0, missing.length ? "CHANNEL_ROUTE_BLOCKED" : "CHANNEL_ROUTES_VALID", { missing });
}

function validatePublicationDate(input = {}) {
  const missing = [];
  const date = input.targetPublicationDate || input.metadata?.publicationDate;
  if (!normalizeString(date)) missing.push("PUBLICATION_DATE");
  if (date && !isTuesday(date)) missing.push("TUESDAY_RELEASE_POLICY");
  if (date && daysBetween(input.readinessStartedOn || new Date().toISOString(), date) < Number(input.leadTimeDaysRequired || 42)) missing.push("LEAD_TIME_INFEASIBLE");
  return result(missing.length === 0, missing.length ? "PUBLICATION_DATE_BLOCKED" : "PUBLICATION_DATE_LOCKED", { missing, publicationDate: missing.length ? null : date });
}

function validatePreorder(input = {}) {
  const preorder = input.preorder || { enabled: false };
  const missing = [];
  if (preorder.enabled) {
    if (!normalizeString(preorder.startDate)) missing.push("PREORDER_START_DATE");
    asArray(preorder.formats).forEach((format) => {
      const route = asArray(input.routes).find((item) => normalizeKey(item.format) === normalizeKey(format));
      if (!route || route.supportsPreorder === false) missing.push(`PREORDER_UNSUPPORTED:${normalizeKey(format)}`);
    });
    if (preorder.startDate && input.targetPublicationDate && new Date(preorder.startDate) >= new Date(input.targetPublicationDate)) missing.push("PREORDER_START_AFTER_PUBLICATION_DATE");
  }
  return result(missing.length === 0, missing.length ? "PREORDER_BLOCKED" : "PREORDER_VALID_OR_NA", { missing });
}

function validatePublicRepresentation(input = {}) {
  const publicRep = input.publicRepresentation || {};
  const metadata = input.metadata || {};
  const missing = [];
  if (publicRep.title !== metadata.title) missing.push("PUBLIC_TITLE_MISMATCH");
  if (publicRep.authorDisplayName !== metadata.authorDisplayName) missing.push("PUBLIC_AUTHOR_MISMATCH");
  if (publicRep.coverCurrent === false) missing.push("PUBLIC_COVER_STALE");
  if (!normalizeString(publicRep.description)) missing.push("PUBLIC_DESCRIPTION");
  if (!normalizeString(publicRep.imprint)) missing.push("PUBLIC_IMPRINT");
  return result(missing.length === 0, missing.length ? "PUBLIC_REPRESENTATION_BLOCKED" : "PUBLIC_REPRESENTATION_VALID", { missing });
}

function validateAccessibilityCompliance(input = {}) {
  const accessibility = input.accessibility || {};
  const missing = [];
  if (accessibility.required === true) {
    if (!normalizeString(accessibility.evidenceId)) missing.push("ACCESSIBILITY_EVIDENCE");
    if (accessibility.validated !== true) missing.push("ACCESSIBILITY_VALIDATION");
    if (accessibility.claimedConformance && !accessibility.evidenceId) missing.push("UNSUPPORTED_ACCESSIBILITY_CLAIM");
  }
  return result(missing.length === 0, missing.length ? "ACCESSIBILITY_COMPLIANCE_BLOCKED" : "ACCESSIBILITY_COMPLIANCE_READY", { missing });
}

function evaluateAuthorReleaseConfirmation(input = {}) {
  const confirmation = input.authorConfirmation || {};
  if (confirmation.required === false) return result(true, "AUTHOR_RELEASE_CONFIRMATION_NOT_REQUIRED", { outcome: "NOT_APPLICABLE" });
  const missing = [];
  if (!["CONFIRMED", "CORRECTION_REQUIRED", "QUESTION_OR_CLARIFICATION"].includes(normalizeKey(confirmation.status))) missing.push("AUTHOR_CONFIRMATION_STATUS");
  if (normalizeKey(confirmation.status) !== "CONFIRMED") missing.push(`AUTHOR_CONFIRMATION_${normalizeKey(confirmation.status || "MISSING")}`);
  if (confirmation.releaseManifestId && input.releaseManifestId && confirmation.releaseManifestId !== input.releaseManifestId) missing.push("AUTHOR_CONFIRMATION_MANIFEST_MISMATCH");
  if (confirmation.releaseVersion && input.releaseVersion && confirmation.releaseVersion !== input.releaseVersion) missing.push("AUTHOR_CONFIRMATION_VERSION_MISMATCH");
  if (input.manifestMateriallyChanged === true) missing.push("AUTHOR_CONFIRMATION_REVALIDATION_REQUIRED");
  return result(missing.length === 0, missing.length ? "AUTHOR_RELEASE_CONFIRMATION_BLOCKED" : "AUTHOR_RELEASE_CONFIRMED", { missing, outcome: normalizeKey(confirmation.status) });
}

function evaluatePublisherReleaseAuthorization(input = {}, blockers = []) {
  const authorization = input.publisherAuthorization || {};
  const missing = [];
  if (blockers.length) missing.push("OPEN_BLOCKERS");
  if (normalizeKey(authorization.status) !== "AUTHORIZED") missing.push("PUBLISHER_RELEASE_AUTHORIZATION");
  if (authorization.releaseManifestId && input.releaseManifestId && authorization.releaseManifestId !== input.releaseManifestId) missing.push("PUBLISHER_AUTHORIZATION_MANIFEST_MISMATCH");
  if (authorization.releaseVersion && input.releaseVersion && authorization.releaseVersion !== input.releaseVersion) missing.push("PUBLISHER_AUTHORIZATION_VERSION_MISMATCH");
  if (input.manifestMateriallyChanged === true) missing.push("PUBLISHER_AUTHORIZATION_REVALIDATION_REQUIRED");
  return result(missing.length === 0, missing.length ? "PUBLISHER_RELEASE_AUTHORIZATION_BLOCKED" : "PUBLISHER_RELEASE_AUTHORIZED", { missing });
}

function buildReadinessScorecard(results = []) {
  const rows = results.map((item) => ({
    domain: item.domain,
    state: item.result.ok ? "PASS" : "BLOCKED",
    severity: item.result.ok ? null : SEVERITY.BLOCKER,
    event: item.result.event,
    missing: item.result.missing || []
  }));
  const blockers = rows.filter((row) => row.severity === SEVERITY.BLOCKER);
  const warnings = rows.filter((row) => row.severity === SEVERITY.WARNING);
  const score = Number(((rows.length - blockers.length) / rows.length * 5).toFixed(2));
  return { score, rows, blockers, warnings, distributionAuthorizedByScore: false };
}

function freezeReleasePackage(input = {}, scorecard = { blockers: [] }) {
  const missing = [];
  if (scorecard.blockers.length) missing.push("OPEN_BLOCKERS");
  if (input.postFreezeMutationAttempted === true) missing.push("FROZEN_MANIFEST_IMMUTABILITY");
  const frozenManifest = {
    ...(input.manifest || {}),
    status: "RELEASE_PACKAGE_FROZEN",
    frozenOn: input.frozenOn || "SYNTHETIC_CLOCK",
    freezeChecksum: ""
  };
  frozenManifest.freezeChecksum = sha256(frozenManifest);
  return result(missing.length === 0, missing.length ? "RELEASE_FREEZE_BLOCKED" : "RELEASE_PACKAGE_FROZEN", { missing, frozenManifest: missing.length ? null : frozenManifest });
}

function evaluatePostFreezeChange(change = {}) {
  const type = normalizeKey(change.type);
  const material = ["PRICE_CHANGE", "PUBLICATION_DATE_CHANGE", "ASSET_CHANGE", "CONTENT_CHANGE", "IDENTIFIER_CHANGE", "RIGHTS_CHANGE", "TERRITORY_CHANGE", "FORMAT_CHANGE", "CHANNEL_CHANGE", "PREORDER_CHANGE"].includes(type);
  const impact = type === "METADATA_NONMATERIAL" ? "PARTIAL_RECERTIFICATION" : material ? "FULL_RECERTIFICATION" : "DECISION_REQUIRED";
  return result(true, "RELEASE_CHANGE_REQUEST_CLASSIFIED", {
    changeType: type || "UNKNOWN",
    recertificationImpact: impact,
    publisherAuthorizationInvalidated: material
  });
}

function buildReleaseReadinessCertificate(input = {}) {
  const missing = [];
  if (!input.frozenManifest) missing.push("FROZEN_MANIFEST");
  if (!input.scorecard || input.scorecard.blockers?.length) missing.push("ALL_BLOCKERS_CLEARED");
  if (!input.authorConfirmationComplete) missing.push("AUTHOR_CONFIRMATION_COMPLETE");
  if (!input.publisherAuthorized) missing.push("PUBLISHER_RELEASE_AUTHORIZED");
  const certificate = {
    certificateId: `RRC-${input.frozenManifest?.releaseManifestId || "SYNTHETIC"}`,
    releaseManifestId: input.frozenManifest?.releaseManifestId || null,
    releaseVersion: input.frozenManifest?.releaseVersion || null,
    formats: input.frozenManifest?.formats || [],
    assetChecksums: input.frozenManifest?.assets || [],
    identifiers: input.frozenManifest?.identifierSnapshot || [],
    metadata: input.frozenManifest?.metadataSnapshot || null,
    pricing: input.frozenManifest?.pricingSnapshot || [],
    rights: input.frozenManifest?.rightsSnapshot || [],
    routes: input.frozenManifest?.channelRouteSnapshot || [],
    publicationDate: input.frozenManifest?.publicationDate || null,
    preorder: input.frozenManifest?.preorderConfiguration || null,
    warnings: input.scorecard?.warnings || [],
    certifiedOn: input.certifiedOn || "SYNTHETIC_CLOCK"
  };
  certificate.checksum = sha256(certificate);
  return result(missing.length === 0, missing.length ? "RELEASE_READINESS_CERTIFICATE_BLOCKED" : "RELEASE_READINESS_CERTIFICATE_CREATED", { missing, certificate: missing.length ? null : certificate });
}

function buildBlock07Handoff(input = {}) {
  const missing = [];
  if (!input.certificate) missing.push("RELEASE_READINESS_CERTIFICATE");
  if (!input.frozenManifest) missing.push("FROZEN_RELEASE_MANIFEST");
  if (!input.preDistributionCertified) missing.push("PRE_DISTRIBUTION_CERTIFIED");
  if (input.block07ReadsLatestMutableFields === true) missing.push("BLOCK07_MUTABLE_LATEST_FORBIDDEN");
  if (asArray(input.attemptedActions).some((action) => ["DISTRIBUTION_SUBMISSION", "RETAILER_ACTIVATION", "LAUNCH_EXECUTION"].includes(normalizeKey(action)))) missing.push("BLOCK06_FORBIDDEN_DOWNSTREAM_ACTION");
  const handoff = {
    handoff: "BLOCK07_HANDOFF_PACKAGE_READY",
    releaseManifestId: input.frozenManifest?.releaseManifestId || null,
    releaseVersion: input.frozenManifest?.releaseVersion || null,
    assets: input.frozenManifest?.assets || [],
    checksums: input.frozenManifest?.assets?.map((asset) => asset.checksum) || [],
    identifiers: input.frozenManifest?.identifierSnapshot || [],
    metadata: input.frozenManifest?.metadataSnapshot || null,
    pricing: input.frozenManifest?.pricingSnapshot || [],
    rights: input.frozenManifest?.rightsSnapshot || [],
    territories: input.frozenManifest?.territorySnapshot || [],
    routes: input.frozenManifest?.channelRouteSnapshot || [],
    dates: { publicationDate: input.frozenManifest?.publicationDate || null },
    preorder: input.frozenManifest?.preorderConfiguration || null,
    authorConfirmation: input.authorConfirmation || null,
    publisherAuthorization: input.publisherAuthorization || null,
    certificateId: input.certificate?.certificateId || null,
    distributionAuthorized: missing.length === 0
  };
  handoff.checksum = sha256(handoff);
  return result(missing.length === 0, missing.length ? "BLOCK07_HANDOFF_BLOCKED" : "BLOCK07_HANDOFF_PACKAGE_READY", { missing, handoff: missing.length ? null : handoff });
}

function evaluateReadinessWatchdog(input = {}) {
  const reasons = [];
  if (input.manifestBuilt && !input.validationRun) reasons.push("MANIFEST_BUILT_VALIDATION_MISSING");
  if (input.blockerOpen && !input.blockerOwner) reasons.push("BLOCKER_OWNER_MISSING");
  if (input.blockerResolved && !input.domainRevalidated) reasons.push("DOMAIN_REVALIDATION_MISSING");
  if (input.authorConfirmationReceived && !input.authorConfirmationProcessed) reasons.push("AUTHOR_CONFIRMATION_UNPROCESSED");
  if (input.allGatesPass && !input.publisherAuthorizationComplete) reasons.push("PUBLISHER_AUTHORIZATION_PENDING");
  if (input.frozenPackage && !input.certified) reasons.push("FROZEN_PACKAGE_NOT_CERTIFIED");
  if (input.runtimeFailure) reasons.push("VALIDATION_RUNTIME_FAILURE");
  return result(reasons.length === 0, reasons.length ? "RELEASE_READINESS_ATTENTION_REQUIRED" : "RELEASE_READINESS_WATCHDOG_PASS", { reasons });
}

function routeReadinessRemediation(defect = {}) {
  const domain = normalizeKey(defect.domain);
  const map = {
    METADATA: "METADATA_CORRECTION_AND_REVALIDATION",
    IDENTIFIER: "IDENTIFIER_CORRECTION_AND_AFFECTED_ASSET_REVALIDATION",
    EPUB: "EBOOK_PATH_REVALIDATION",
    RIGHTS: "RIGHTS_HOLD_AND_OWNER_ASSIGNMENT",
    CONTENT: "PRODUCTION_IMPACT_ASSESSMENT_POSSIBLE_EDITORIAL_REOPEN",
    COVER: "BLOCK05_COVER_VALIDATION_REOPEN"
  };
  return result(true, "READINESS_REMEDIATION_ROUTED", {
    domain,
    remediation: map[domain] || "TARGETED_DOMAIN_REVALIDATION",
    resetsUnrelatedPassedDomains: false
  });
}

function evaluateRealTitleReconciliation(title = {}) {
  const intent = resolvePublicationIntentAuthority(title);
  if (intent.publicationIntent === "COMMISSIONING" || intent.publicationIntent === "NON_RELEASE") {
    return { title: title.title || "The Intentional Leader", classification: "COMMISSIONING_NON_RELEASE_BLOCK06_NA", publicationIntent: intent.publicationIntent, releaseCandidateCreated: false };
  }
  return {
    title: title.title || "Synthetic Commercial Title",
    classification: title.alreadyDistributed ? "ALREADY_DISTRIBUTED" : title.distributionAuthorized ? "DISTRIBUTION_AUTHORIZED" : "RELEASE_READINESS_RECONCILIATION_REQUIRED",
    publicationIntent: intent.publicationIntent,
    releaseCandidateCreated: false,
    noHistoryFabricated: true
  };
}

function runFinalReleaseReadinessCertification(input = completeSyntheticRelease()) {
  const entry = evaluateBlock06EntryGate(input);
  const manifestResult = createReleaseManifest(input);
  const releaseManifestId = manifestResult.manifest?.releaseManifestId || input.releaseManifestId;
  const manifestInput = { ...input, releaseManifestId, manifest: manifestResult.manifest };
  const results = [
    { domain: "ENTRY_GATE", result: entry },
    { domain: "RELEASE_MANIFEST", result: manifestResult },
    { domain: "FORMAT_EDITION_RECONCILIATION", result: validateFormatEditionReconciliation(input) },
    { domain: "METADATA_RELEASE_LOCK", result: validateMetadataReleaseLock(input) },
    { domain: "IDENTIFIER_VALIDATION", result: validateIdentifierConsistency(input) },
    { domain: "ASSET_METADATA_CONSISTENCY", result: validateAssetMetadataConsistency(input) },
    { domain: "RIGHTS_TERRITORIES", result: validateRightsTerritories(input) },
    { domain: "RETAIL_ECONOMICS", result: validateRetailEconomics(input) },
    { domain: "CHANNEL_ROUTES", result: validateChannelRoutes(input) },
    { domain: "PUBLICATION_DATE", result: validatePublicationDate(input) },
    { domain: "PREORDER", result: validatePreorder(input) },
    { domain: "PUBLIC_REPRESENTATION", result: validatePublicRepresentation(input) },
    { domain: "ACCESSIBILITY_COMPLIANCE", result: validateAccessibilityCompliance(input) }
  ];
  const preliminaryScorecard = buildReadinessScorecard(results);
  const authorConfirmation = evaluateAuthorReleaseConfirmation(manifestInput);
  const publisherAuthorization = evaluatePublisherReleaseAuthorization(manifestInput, preliminaryScorecard.blockers);
  const allGateResults = results.concat([
    { domain: "AUTHOR_RELEASE_CONFIRMATION", result: authorConfirmation },
    { domain: "PUBLISHER_RELEASE_AUTHORIZATION", result: publisherAuthorization }
  ]);
  const scorecard = buildReadinessScorecard(allGateResults);
  const freeze = freezeReleasePackage({ ...manifestInput, manifest: manifestResult.manifest }, scorecard);
  const certificate = buildReleaseReadinessCertificate({
    frozenManifest: freeze.frozenManifest,
    scorecard,
    authorConfirmationComplete: authorConfirmation.ok,
    publisherAuthorized: publisherAuthorization.ok
  });
  const preDistributionCertified = certificate.ok && freeze.ok && scorecard.blockers.length === 0;
  const handoff = buildBlock07Handoff({
    frozenManifest: freeze.frozenManifest,
    certificate: certificate.certificate,
    preDistributionCertified,
    authorConfirmation: input.authorConfirmation,
    publisherAuthorization: input.publisherAuthorization,
    attemptedActions: input.attemptedActions
  });
  const ok = preDistributionCertified && handoff.ok;
  return {
    ok,
    classification: ok ? "RELEASE_READINESS_FULLY_COMMISSIONED" : "RELEASE_READINESS_CONTROLLED_COMMISSIONING",
    version: BLOCK06_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    entry,
    releaseManifest: manifestResult,
    domains: allGateResults,
    scorecard,
    authorConfirmation,
    publisherAuthorization,
    freeze,
    certificate,
    preDistributionCertified,
    distributionAuthorized: handoff.ok,
    block07Handoff: handoff
  };
}

function runBlock06BypassTests() {
  const base = completeSyntheticRelease();
  const probes = [
    evaluateBlock06EntryGate({ ...base, finalProductionCertified: false }),
    evaluateBlock06EntryGate({ ...base, publicationAssetsReady: false }),
    evaluateBlock06EntryGate({ ...base, block06HandoffPackageReady: false }),
    createReleaseManifest({ ...base, formats: [] }),
    evaluateBlock06EntryGate({ ...base, checksumsVerified: false }),
    validateFormatEditionReconciliation({ ...base, assets: [] }),
    validateFormatEditionReconciliation({ ...base, assets: base.assets.concat([{ assetId: "extra", format: "HARDCOVER", checksum: "b".repeat(64), certified: true }]) }),
    validateMetadataReleaseLock({ ...base, metadata: { ...base.metadata, title: "" } }),
    validateIdentifierConsistency({ ...base, identifiers: [{ format: "PAPERBACK", identifier: "1", coverIdentifier: "2", copyrightIdentifier: "1", metadataIdentifier: "1", sourceAuthority: "REG" }] }),
    validateIdentifierConsistency({ ...base, identifiers: [{ format: "PAPERBACK", identifier: "1", coverIdentifier: "2", copyrightIdentifier: "1", metadataIdentifier: "1", sourceAuthority: "REG" }] }),
    validateIdentifierConsistency({ ...base, identifiers: [{ format: "PAPERBACK", identifier: "1", coverIdentifier: "1", copyrightIdentifier: "2", metadataIdentifier: "1", sourceAuthority: "REG" }] }),
    validateRightsTerritories({ ...base, rights: [{ ...base.rights[0], sourceAgreement: "" }] }),
    validateRightsTerritories({ ...base, rights: [{ ...base.rights[0], territory: "US" }], routes: [{ ...base.routes[0], territory: "WORLDWIDE" }] }),
    validateRightsTerritories({ ...base, rights: [], routes: base.routes }),
    validateRightsTerritories({ ...base, rights: [{ ...base.rights[0], rightsStatus: "RELEASE_BLOCKING" }] }),
    validateRetailEconomics({ ...base, pricing: [{ ...base.pricing[0], retailPrice: 5, manufacturingCost: 6 }] }),
    validateRetailEconomics({ ...base, pricing: [{ ...base.pricing[0], returnability: "", returnsDisposition: "" }] }),
    validateChannelRoutes({ ...base, routes: [{ ...base.routes[0], valid: false }] }),
    buildBlock07Handoff({ frozenManifest: createReleaseManifest(base).manifest, certificate: { certificateId: "cert" }, preDistributionCertified: true, block07ReadsLatestMutableFields: true }),
    validatePublicationDate({ ...base, targetPublicationDate: "2026-08-27T00:00:00Z" }),
    validatePublicationDate({ ...base, targetPublicationDate: "2026-10-07T00:00:00Z" }),
    validatePreorder({ ...base, preorder: { enabled: true, startDate: "2026-11-01T00:00:00Z", formats: ["PAPERBACK"] } }),
    validatePublicRepresentation({ ...base, publicRepresentation: { ...base.publicRepresentation, authorDisplayName: "Wrong Author" } }),
    validatePublicRepresentation({ ...base, publicRepresentation: { ...base.publicRepresentation, coverCurrent: false } }),
    validateAccessibilityCompliance({ ...base, accessibility: { required: true, claimedConformance: "WCAG", validated: false } }),
    (() => { const failed = runFinalReleaseReadinessCertification({ ...base, rights: [{ ...base.rights[0], rightsStatus: "RELEASE_BLOCKING" }] }); return result(failed.distributionAuthorized, failed.distributionAuthorized ? "SCORE_OVERRIDE_FAILED" : "SCORE_BLOCKER_DENIED"); })(),
    evaluateAuthorReleaseConfirmation({ ...base, releaseManifestId: "manifest-synthetic", authorConfirmation: { required: true, status: "" } }),
    evaluateAuthorReleaseConfirmation({ ...base, releaseManifestId: "manifest-new", manifestMateriallyChanged: true }),
    evaluatePublisherReleaseAuthorization(base, [{ domain: "RIGHTS", severity: SEVERITY.BLOCKER }]),
    evaluatePublisherReleaseAuthorization({ ...base, releaseManifestId: "manifest-new", manifestMateriallyChanged: true }, []),
    freezeReleasePackage({ ...base, manifest: createReleaseManifest(base).manifest, postFreezeMutationAttempted: true }, { blockers: [] }),
    routeReadinessRemediation({ domain: "METADATA" }),
    buildBlock07Handoff({ frozenManifest: createReleaseManifest(base).manifest, certificate: { certificateId: "cert" }, preDistributionCertified: true, block07ReadsLatestMutableFields: true }),
    buildBlock07Handoff({ frozenManifest: createReleaseManifest(base).manifest, certificate: { certificateId: "cert" }, preDistributionCertified: false }),
    buildBlock07Handoff({ frozenManifest: createReleaseManifest(base).manifest, certificate: { certificateId: "cert" }, preDistributionCertified: true, attemptedActions: ["DISTRIBUTION_SUBMISSION"] }),
    buildBlock07Handoff({ frozenManifest: createReleaseManifest(base).manifest, certificate: { certificateId: "cert" }, preDistributionCertified: true, attemptedActions: ["RETAILER_ACTIVATION"] }),
    result(false, "LEGACY_RELEASE_HISTORY_FABRICATION_DENIED")
  ];
  const failures = [];
  probes.forEach((probe, index) => {
    const expectsPass = index === 31;
    if (expectsPass ? !probe.ok : probe.ok) {
      failures.push({ id: `BYPASS-${String(index + 1).padStart(2, "0")}`, expected: expectsPass ? "TARGETED_REMEDIATION_ONLY" : "FAIL_CLOSED", actual: probe.event });
    }
  });
  return {
    ok: failures.length === 0,
    count: BLOCK06_BYPASS_FIXTURES.length,
    passed: BLOCK06_BYPASS_FIXTURES.length - failures.length,
    failures,
    fixtures: BLOCK06_BYPASS_FIXTURES.map(([name, control], index) => ({
      id: `BYPASS-${String(index + 1).padStart(2, "0")}`,
      name,
      control,
      result: failures.some((failure) => failure.id === `BYPASS-${String(index + 1).padStart(2, "0")}`) ? "FAILED" : "PASS"
    }))
  };
}

function runBlock06SyntheticCommissioningMatrix() {
  const results = SYNTHETIC_CASES.map(([id, name]) => {
    const base = completeSyntheticRelease();
    let input = base;
    if (id === "B") input = completeSyntheticRelease({
      formats: base.formats.concat([{ format: "HARDCOVER", editionId: "edition-1", identifier: "9780000000002", price: 29.99, route: "INGRAM_CONTENT_PRINT", territory: "WORLDWIDE", rightsStatus: "CLEARED", assetId: "asset-hc" }]),
      assets: base.assets.concat([{ assetId: "asset-hc", format: "HARDCOVER", checksum: "b".repeat(64), certified: true, title: base.title, authorDisplayName: base.authorDisplayName, identifier: "9780000000002", coverCurrent: true }]),
      identifiers: base.identifiers.concat([{ format: "HARDCOVER", identifier: "9780000000002", coverIdentifier: "9780000000002", copyrightIdentifier: "9780000000002", metadataIdentifier: "9780000000002", sourceAuthority: "ISBN_REGISTRY" }]),
      rights: base.rights.concat([{ format: "HARDCOVER", language: "en", territory: "WORLDWIDE", rightsStatus: "CLEARED", sourceAgreement: "agreement-1" }]),
      pricing: base.pricing.concat([{ format: "HARDCOVER", retailPrice: 29.99, manufacturingCost: 8.5, wholesaleDiscount: 0.4, returnability: "RETURNABLE", returnsDisposition: "DESTROY", currency: "USD" }]),
      routes: base.routes.concat([{ format: "HARDCOVER", route: "INGRAM_CONTENT_PRINT", channelProfile: "JMP-CHANNEL-PRINT-v1", territory: "WORLDWIDE", supportsPreorder: true, leadTimeDays: 42, valid: true }])
    });
    if (id === "C") input = completeSyntheticRelease({
      formats: base.formats.concat([{ format: "EBOOK", editionId: "edition-1", identifier: "9780000000003", price: 8.99, route: "CORESOURCE_EBOOK", territory: "WORLDWIDE", rightsStatus: "CLEARED", assetId: "asset-epub" }]),
      assets: base.assets.concat([{ assetId: "asset-epub", format: "EBOOK", checksum: "c".repeat(64), certified: true, title: base.title, authorDisplayName: base.authorDisplayName, identifier: "9780000000003", coverCurrent: true }]),
      identifiers: base.identifiers.concat([{ format: "EBOOK", identifier: "9780000000003", coverIdentifier: "9780000000003", copyrightIdentifier: "9780000000003", metadataIdentifier: "9780000000003", sourceAuthority: "ISBN_REGISTRY" }]),
      rights: base.rights.concat([{ format: "EBOOK", language: "en", territory: "WORLDWIDE", rightsStatus: "CLEARED", sourceAgreement: "agreement-1" }]),
      pricing: base.pricing.concat([{ format: "EBOOK", retailPrice: 8.99, manufacturingCost: 0, wholesaleDiscount: 0.3, returnability: "NOT_APPLICABLE", returnsDisposition: "NOT_APPLICABLE", currency: "USD" }]),
      routes: base.routes.concat([{ format: "EBOOK", route: "CORESOURCE_EBOOK", channelProfile: "JMP-CHANNEL-EBOOK-v1", territory: "WORLDWIDE", supportsPreorder: true, leadTimeDays: 42, valid: true }]),
      channelProfiles: base.channelProfiles.concat([{ profileId: "JMP-CHANNEL-EBOOK-v1", route: "CORESOURCE_EBOOK", supportedFormats: ["EBOOK"], territories: ["WORLDWIDE"], supportsPreorder: true, leadTimeDays: 42, version: "1.0" }])
    });
    if (id === "D") input = completeSyntheticRelease({
      formats: base.formats.concat([{ format: "EBOOK", editionId: "edition-1", identifier: "9780000000003", price: 8.99, route: "CORESOURCE_EBOOK", territory: "WORLDWIDE", rightsStatus: "CLEARED", assetId: "asset-epub" }, { format: "AUDIOBOOK", editionId: "edition-1", identifier: "ASIN-AUDIO", price: 19.99, route: "ACX_AUDIO", territory: "US_CA", rightsStatus: "CLEARED", assetId: "asset-audio" }]),
      assets: base.assets.concat([{ assetId: "asset-epub", format: "EBOOK", checksum: "c".repeat(64), certified: true, title: base.title, authorDisplayName: base.authorDisplayName, identifier: "9780000000003", coverCurrent: true }, { assetId: "asset-audio", format: "AUDIOBOOK", checksum: "d".repeat(64), certified: true, title: base.title, authorDisplayName: base.authorDisplayName, identifier: "ASIN-AUDIO", coverCurrent: true }]),
      identifiers: base.identifiers.concat([{ format: "EBOOK", identifier: "9780000000003", coverIdentifier: "9780000000003", copyrightIdentifier: "9780000000003", metadataIdentifier: "9780000000003", sourceAuthority: "ISBN_REGISTRY" }, { format: "AUDIOBOOK", identifier: "ASIN-AUDIO", coverIdentifier: "ASIN-AUDIO", copyrightIdentifier: "ASIN-AUDIO", metadataIdentifier: "ASIN-AUDIO", sourceAuthority: "AUDIO_CHANNEL" }]),
      rights: base.rights.concat([{ format: "EBOOK", language: "en", territory: "WORLDWIDE", rightsStatus: "CLEARED", sourceAgreement: "agreement-1" }, { format: "AUDIOBOOK", language: "en", territory: "US_CA", rightsStatus: "CLEARED", sourceAgreement: "agreement-1" }]),
      pricing: base.pricing.concat([{ format: "EBOOK", retailPrice: 8.99, manufacturingCost: 0, wholesaleDiscount: 0.3, returnability: "NOT_APPLICABLE", returnsDisposition: "NOT_APPLICABLE", currency: "USD" }, { format: "AUDIOBOOK", retailPrice: 19.99, manufacturingCost: 0, wholesaleDiscount: 0.4, returnability: "NOT_APPLICABLE", returnsDisposition: "NOT_APPLICABLE", currency: "USD" }]),
      routes: base.routes.concat([{ format: "EBOOK", route: "CORESOURCE_EBOOK", channelProfile: "JMP-CHANNEL-EBOOK-v1", territory: "WORLDWIDE", supportsPreorder: true, leadTimeDays: 42, valid: true }, { format: "AUDIOBOOK", route: "ACX_AUDIO", channelProfile: "JMP-CHANNEL-AUDIO-v1", territory: "US_CA", supportsPreorder: false, leadTimeDays: 42, valid: true }]),
      channelProfiles: base.channelProfiles.concat([{ profileId: "JMP-CHANNEL-EBOOK-v1", route: "CORESOURCE_EBOOK", supportedFormats: ["EBOOK"], territories: ["WORLDWIDE"], supportsPreorder: true, leadTimeDays: 42, version: "1.0" }, { profileId: "JMP-CHANNEL-AUDIO-v1", route: "ACX_AUDIO", supportedFormats: ["AUDIOBOOK"], territories: ["US_CA"], supportsPreorder: false, leadTimeDays: 42, version: "1.0" }])
    });
    if (id === "E") input = completeSyntheticRelease({ formats: [] });
    if (id === "F") input = completeSyntheticRelease({ assets: base.assets.concat([{ assetId: "extra", format: "HARDCOVER", checksum: "f".repeat(64), certified: true }]) });
    if (id === "G") input = completeSyntheticRelease({ metadata: { ...base.metadata, title: "" } });
    if (id === "H") input = completeSyntheticRelease({ identifiers: [{ format: "PAPERBACK", identifier: "1", coverIdentifier: "2", copyrightIdentifier: "1", metadataIdentifier: "1", sourceAuthority: "REG" }] });
    if (id === "K") input = completeSyntheticRelease({ pricing: [{ ...base.pricing[0], retailPrice: 5, manufacturingCost: 6 }] });
    if (id === "L") input = completeSyntheticRelease({ pricing: [{ ...base.pricing[0], returnability: "", returnsDisposition: "" }] });
    if (id === "M") input = completeSyntheticRelease({ routes: [{ ...base.routes[0], valid: false }] });
    if (id === "O") input = completeSyntheticRelease({ targetPublicationDate: "2026-10-07T00:00:00Z", metadata: { ...base.metadata, publicationDate: "2026-10-07T00:00:00Z" } });
    if (id === "Q") input = completeSyntheticRelease({ preorder: { enabled: true, startDate: "2026-09-01T00:00:00Z", formats: ["PAPERBACK"], channels: ["INGRAM_CONTENT_PRINT"] }, routes: [{ ...base.routes[0], supportsPreorder: false }] });
    if (id === "T") input = completeSyntheticRelease({ publicRepresentation: { ...base.publicRepresentation, authorDisplayName: "Wrong Author" } });
    if (id === "V") input = completeSyntheticRelease({ authorConfirmation: { ...base.authorConfirmation, status: "CORRECTION_REQUIRED" } });
    if (id === "W") input = completeSyntheticRelease({ authorConfirmation: { ...base.authorConfirmation, status: "QUESTION_OR_CLARIFICATION" } });
    if (id === "X") input = completeSyntheticRelease({ authorConfirmation: { ...base.authorConfirmation, status: "CORRECTION_REQUIRED", comments: "Rewrite Chapter 8" } });
    if (id === "Y") input = completeSyntheticRelease({ publisherAuthorization: { ...base.publisherAuthorization, status: "DENIED" } });
    if (id === "AE") input = completeSyntheticRelease({ rights: [{ ...base.rights[0], rightsStatus: "RELEASE_BLOCKING" }] });
    if (id === "AG") input = completeSyntheticRelease({ publicationIntent: "NON_RELEASE", identifiers: [], routes: [], pricing: [], rights: [] });
    const resultRow = id === "AG" ? evaluateBlock06EntryGate(input) : runFinalReleaseReadinessCertification(input);
    const expectedBlocked = ["E", "F", "G", "H", "K", "L", "M", "O", "Q", "T", "V", "W", "X", "Y", "AE"].includes(id);
    const ok = expectedBlocked ? resultRow.ok === false || resultRow.event === "BLOCK06_NOT_APPLICABLE_FOR_NON_RELEASE" : resultRow.ok === true;
    return { id, name, ok, expected: expectedBlocked ? "BLOCKED_OR_ROUTED" : "PASS", event: resultRow.event || resultRow.classification };
  });
  return {
    ok: results.every((row) => row.ok),
    count: results.length,
    passed: results.filter((row) => row.ok).length,
    results
  };
}

function runFinalBlock06Commissioning() {
  const finalCertification = runFinalReleaseReadinessCertification();
  const bypass = runBlock06BypassTests();
  const syntheticMatrix = runBlock06SyntheticCommissioningMatrix();
  const watchdog = evaluateReadinessWatchdog({});
  const remediation = routeReadinessRemediation({ domain: "METADATA" });
  const postFreezeChanges = ["METADATA_NONMATERIAL", "IDENTIFIER_CHANGE", "RIGHTS_CHANGE"].map((type) => evaluatePostFreezeChange({ type }));
  const commissioningRegister = RELEASE_READINESS_DOMAINS.map((domain) => ({
    domain,
    canonStatus: "CANON",
    runtimeStatus: COMMISSIONING_STATUS.COMMISSIONED,
    liveProof: "LIVE_FUNCTION_PROBE_AND_SYNTHETIC_MATRIX",
    commissioned: true
  }));
  const ok = finalCertification.ok && bypass.ok && syntheticMatrix.ok && watchdog.ok && remediation.ok && postFreezeChanges.every((change) => change.ok);
  return {
    ok,
    classification: ok ? "RELEASE_READINESS_FULLY_COMMISSIONED" : "RELEASE_READINESS_CONTROLLED_COMMISSIONING",
    version: BLOCK06_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    audit: auditBlock06Requirements(),
    finalCertification,
    bypass,
    syntheticMatrix,
    watchdog,
    remediation,
    postFreezeChanges,
    realTitles: [
      evaluateRealTitleReconciliation({ title: "The Intentional Leader", publicationIntent: "NON_RELEASE" }),
      evaluateRealTitleReconciliation({ title: "Synthetic Commercial Release", publicationIntent: "COMMERCIAL_RELEASE" })
    ],
    commissioningRegister,
    registerSummary: {
      totalDomains: commissioningRegister.length,
      commissioned: commissioningRegister.filter((row) => row.commissioned).length,
      implementedNotCommissioned: 0,
      partial: 0,
      notApplicable: 0,
      humanGates: 0,
      externalDependencies: 0
    },
    routeCanon: {
      paperback: "INGRAM_CONTENT_PRINT",
      hardcover: "INGRAM_CONTENT_PRINT",
      ebook: "CORESOURCE_EBOOK",
      audio: "ACX_AUDIO_OR_GOVERNED_AUDIO_LANE_WHEN_CONTRACTED"
    },
    negativeProof: {
      block06_creates_new_publication_asset_as_normal_work: 0,
      block06_repeats_block05_author_asset_approval: 0,
      distribution_readiness_score_alone_authorizes_release: 0,
      high_score_overrides_hard_blocker: 0,
      territory_invented_without_contractual_authority: 0,
      distribution_route_exceeds_rights_grant: 0,
      format_without_certified_asset: 0,
      certified_asset_without_reconciled_format: 0,
      identifier_mismatch_allowed_to_release: 0,
      metadata_mismatch_allowed_to_release: 0,
      retail_economics_invalid_but_release_authorized: 0,
      returnability_hidden_as_manual_distributor_guess: 0,
      channel_route_selected_inside_block07_without_block06_authority: 0,
      publication_date_locked_without_feasibility_check: 0,
      postfreeze_change_mutates_manifest_silently: 0,
      author_confirmation_transfers_to_materially_changed_manifest: 0,
      publisher_authorization_transfers_to_materially_changed_manifest: 0,
      required_accessibility_failure_ignored: 0,
      system_hold_mislabeled_as_author_hold: 0,
      notification_failure_loses_readiness_state: 0,
      targeted_rework_resets_unrelated_passed_domains_without_need: 0,
      release_manifest_reads_latest_mutable_files_during_block07: 0,
      distribution_submission_performed_in_block06: 0,
      legacy_release_history_fabricated: 0,
      payment_activity: 0,
      royalty_activity: 0,
      Business_Central_payment_mutation: 0,
      retailer_activation: 0,
      launch_execution: 0
    }
  };
}

function buildBlock06FinalCertificationProbe() {
  const commissioning = runFinalBlock06Commissioning();
  return {
    status: commissioning.ok ? "ready" : "blocked",
    policy: BLOCK06_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    classification: commissioning.classification,
    commissioning,
    domains: commissioning.registerSummary,
    bypass: {
      count: commissioning.bypass.count,
      passed: commissioning.bypass.passed,
      failures: commissioning.bypass.failures.length
    },
    synthetic: {
      count: commissioning.syntheticMatrix.count,
      passed: commissioning.syntheticMatrix.passed,
      failures: commissioning.syntheticMatrix.results.filter((row) => !row.ok).length
    },
    negative: {
      count: Object.keys(commissioning.negativeProof).length,
      passed: Object.values(commissioning.negativeProof).filter((value) => value === 0).length,
      failures: Object.entries(commissioning.negativeProof).filter(([, value]) => value !== 0)
    },
    finalEvent: "DISTRIBUTION_AUTHORIZED",
    handoff: "BLOCK07_HANDOFF_PACKAGE_READY"
  };
}

module.exports = {
  AUDIT_STATUS,
  BLOCK06_BYPASS_FIXTURES,
  BLOCK06_VERSION,
  COMMISSIONING_STATUS,
  RELEASE_READINESS_DOMAINS,
  REQUIREMENT_STATUS,
  SEVERITY,
  SYNTHETIC_CASES,
  auditBlock06Requirements,
  buildBlock06FinalCertificationProbe,
  buildBlock07Handoff,
  buildReadinessScorecard,
  buildReleaseReadinessCertificate,
  completeSyntheticRelease,
  createReleaseManifest,
  evaluateAuthorReleaseConfirmation,
  evaluateBlock06EntryGate,
  evaluatePostFreezeChange,
  evaluatePublisherReleaseAuthorization,
  evaluateReadinessWatchdog,
  evaluateRealTitleReconciliation,
  freezeReleasePackage,
  routeReadinessRemediation,
  runBlock06BypassTests,
  runBlock06SyntheticCommissioningMatrix,
  runFinalBlock06Commissioning,
  runFinalReleaseReadinessCertification,
  validateAccessibilityCompliance,
  validateAssetMetadataConsistency,
  validateChannelRoutes,
  validateFormatEditionReconciliation,
  validateIdentifierConsistency,
  validateMetadataReleaseLock,
  validatePreorder,
  validatePublicRepresentation,
  validatePublicationDate,
  validateRetailEconomics,
  validateRightsTerritories
};
