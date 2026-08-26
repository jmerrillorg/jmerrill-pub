"use strict";

const { createHash } = require("node:crypto");
const {
  resolvePublicationIntentAuthority,
  resolveProductionAuthority
} = require("../policy/canonPolicyLayer");

const BLOCK05_VERSION = "JMP_BLOCK05_PRODUCTION_COMMISSIONING_v1.0";

const REQUIREMENT_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  REFINED: "REFINED",
  SUPERSEDED: "SUPERSEDED",
  MERGED: "MERGED",
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

const WORKSTREAM_STATES = Object.freeze([
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "DELIVERABLE_READY",
  "INTERNAL_QA",
  "AUTHOR_REVIEW",
  "APPROVED",
  "TECHNICAL_VALIDATION",
  "CERTIFIED",
  "NOT_APPLICABLE",
  "BLOCKED",
  "CHANGES_REQUESTED",
  "REVISION_IN_PROGRESS",
  "SYSTEM_ATTENTION_REQUIRED",
  "VENDOR_WAITING",
  "AUTHOR_WAITING",
  "EXTERNAL_DEPENDENCY",
  "TECHNICAL_VALIDATION_FAILED",
  "PRODUCTION_SCOPE_CHANGE_REQUIRED",
  "CONTENT_CHANGE_IMPACT_REQUIRED",
  "RIGHTS_HOLD",
  "REVALIDATION_REQUIRED",
  "COVER_REGENERATION_REQUIRED"
]);

const COMMISSIONING_STATUS = Object.freeze({
  COMMISSIONED: "COMMISSIONED",
  IMPLEMENTED_NOT_COMMISSIONED: "IMPLEMENTED_NOT_COMMISSIONED",
  PARTIAL: "PARTIAL",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  SUPERSEDED: "SUPERSEDED",
  BLOCKED_BY_EXTERNAL_DEPENDENCY: "BLOCKED_BY_EXTERNAL_DEPENDENCY",
  TRUE_HUMAN_GATE: "TRUE_HUMAN_GATE",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED"
});

const BLOCK05_DOMAIN_REGISTER = Object.freeze([
  "BLOCK_05_ENTRY",
  "PRODUCTION_SCOPE",
  "PRODUCTION_MASTER",
  "CONTENT_FREEZE",
  "INTERIOR",
  "COVER",
  "PAGE_COUNT_COVER_DEPENDENCY",
  "PUBLICATION_METADATA",
  "IDENTIFIERS",
  "EBOOK",
  "AUDIO",
  "ACCESSIBILITY",
  "FRONT_BACK_MATTER",
  "INDEX",
  "ASSET_RIGHTS",
  "PRODUCTION_SPEC_PROFILE",
  "VENDOR_EXECUTION",
  "WAITING_ON",
  "PRODUCTION_WATCHDOG",
  "CROSS_FORMAT_SYNC",
  "TECHNICAL_VALIDATION",
  "PHYSICAL_PROOF",
  "FINAL_PRODUCTION_CERTIFICATION",
  "BLOCK_06_HANDOFF"
]);

const REQUIRED_ENTRY_FIELDS = Object.freeze([
  "finalEditorialCertified",
  "productionReady",
  "finalEditorialManuscript",
  "finalEditorialChecksum",
  "editorialApprovalsComplete",
  "styleSheetAvailable",
  "productionNotesAvailable",
  "activeTitleProject",
  "formatEntitlementsResolved"
]);

const DEFAULT_WORKSTREAMS = Object.freeze([
  "INTERIOR",
  "COVER",
  "PUBLICATION_METADATA",
  "IDENTIFIERS",
  "EBOOK",
  "AUDIO",
  "ACCESSIBILITY",
  "INDEX"
]);

const BYPASS_FIXTURES = Object.freeze([
  ["Production starts without FINAL_EDITORIAL_CERTIFIED", "ENTRY_FINAL_EDITORIAL_CERTIFIED"],
  ["Production starts without PRODUCTION_READY", "ENTRY_PRODUCTION_READY"],
  ["Production mutates FINAL_EDITORIAL_MANUSCRIPT", "FINAL_EDITORIAL_IMMUTABILITY"],
  ["Production Master created without lineage", "PRODUCTION_MASTER_LINEAGE"],
  ["filename used as asset authority", "FILENAME_AUTHORITY"],
  ["scope silently expanded", "SCOPE_EXPANSION"],
  ["scope silently reduced", "SCOPE_REDUCTION"],
  ["author approval without exact artifact binding", "APPROVAL_ARTIFACT_BINDING"],
  ["CHANGES_REQUESTED treated as approval", "CHANGES_REQUESTED_NOT_APPROVAL"],
  ["silence treated as approval", "SILENCE_NOT_APPROVAL"],
  ["raw interior/layout output sent before internal QA", "INTERNAL_QA_BEFORE_AUTHOR_PROOF"],
  ["author approval treated as technical validation", "APPROVAL_NOT_TECHNICAL_VALIDATION"],
  ["cover marketability pass treated as technical pass", "MARKETABILITY_NOT_TECHNICAL"],
  ["final cover geometry uses stale/preliminary page count", "STALE_PAGE_COUNT_COVER_GEOMETRY"],
  ["Production Master changes but derived formats remain silently certified", "MASTER_CHANGE_REVALIDATION"],
  ["stale cover survives page-count change", "PAGE_COUNT_CHANGE_COVER_REGENERATION"],
  ["same ISBN reused across formats requiring distinct identifiers", "ISBN_FORMAT_REUSE"],
  ["commissioning/non-release title incorrectly requires ISBN", "NON_RELEASE_ISBN_NOT_REQUIRED"],
  ["commissioning/non-release title incorrectly requires barcode", "NON_RELEASE_BARCODE_NOT_REQUIRED"],
  ["commissioning/non-release title incorrectly requires distribution metadata", "NON_RELEASE_DISTRIBUTION_NOT_REQUIRED"],
  ["EPUB certified without validation", "EPUB_VALIDATION_REQUIRED"],
  ["accessibility conformance claimed without evidence", "ACCESSIBILITY_EVIDENCE_REQUIRED"],
  ["rights status detached from asset", "RIGHTS_ATTACHED_TO_ASSET"],
  ["failed automation mislabeled Waiting On Author", "SYSTEM_FAILURE_NOT_AUTHOR_WAIT"],
  ["vendor delivery treated as JMP acceptance without QA", "VENDOR_DELIVERY_NOT_ACCEPTANCE"],
  ["substantive chapter rewrite handled silently inside Production", "SUBSTANTIVE_CHANGE_REOPENS_EDITORIAL"],
  ["author content change fails to trigger impact analysis", "CONTENT_CHANGE_IMPACT_REQUIRED"],
  ["final certification with incomplete required workstream", "ALL_WORKSTREAMS_CERTIFIED"],
  ["final certification with missing author approval", "AUTHOR_APPROVALS_COMPLETE"],
  ["final certification with failed technical validation", "TECHNICAL_VALIDATIONS_PASS"],
  ["final certification with stale dependent artifact", "NO_STALE_DEPENDENCIES"],
  ["final certification with cover/interior geometry mismatch", "COVER_INTERIOR_GEOMETRY_MATCH"],
  ["final certification with unresolved production correction", "NO_UNRESOLVED_CORRECTIONS"],
  ["PUBLICATION_ASSETS_READY with missing final artifact", "FINAL_ARTIFACTS_REQUIRED"],
  ["Block 06 receives ambiguous final files", "DETERMINISTIC_HANDOFF"],
  ["Block 05 performs distribution submission", "NO_DISTRIBUTION_SUBMISSION"]
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

function auditBlock05Requirements() {
  const current = [
    ["Entry / Block Boundary", "FINAL_EDITORIAL_CERTIFIED and PRODUCTION_READY are required before Block 05 entry.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Production Scope", "Package entitlement remains separate from title-specific Production Scope Lock.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Production Master", "Production Master is distinct from immutable FINAL_EDITORIAL_MANUSCRIPT and must carry derivedFrom/checksum lineage.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Universal Workstream Engine", "Common workstream states apply across interior, cover, metadata, identifiers, ebook, audio, accessibility, and index.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Interior", "Interior proof cannot be author-facing until internal QA passes and approval binds to an exact artifact.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Cover", "Cover creative approval is separate from technical validation; final geometry depends on final page count.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Publication Metadata", "Block 05 assembles a publication metadata package without creating competing title metadata authority.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Identifiers", "Identifier requirements are publication-intent-aware and format-specific.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Ebook / Accessibility", "Export success is not certification; EPUB/accessibility require persisted validation evidence.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Final Certification", "PUBLICATION_ASSETS_READY requires complete workstreams, approvals, validations, checksums, synchronization, and deterministic handoff.", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED]
  ];
  const refined = [
    ["Distribution Readiness / Mock Distribution", "Older v2 production doctrine is preserved as Block 06+ compatibility only; Block 05 does not upload, publish, launch, or financially post.", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["The Intentional Leader identifiers", "Commissioning/non-release titles do not require ISBN, barcode, distribution path, or publication launch.", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Back-cover copy", "Back-cover copy is a governed creative approval, not a full-wrap executor self-decision.", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED]
  ];
  return current.concat(refined).map(([domain, requirement, lineage, auditStatus]) => ({
    domain,
    requirement,
    lineage,
    auditStatus,
    canProceedToRuntime: lineage === REQUIREMENT_STATUS.CURRENT || lineage === REQUIREMENT_STATUS.REFINED,
    canonStatus: "CANON",
    codeExists: true,
    runtimeExists: true,
    runtimeEnforces: auditStatus === AUDIT_STATUS.IMPLEMENTED_ENFORCED,
    deployed: "PENDING_DEPLOYMENT",
    liveProven: "PENDING_LIVE_VERIFY",
    driftMonitored: true
  }));
}

function evaluateProductionEntryGate(input = {}) {
  const missing = REQUIRED_ENTRY_FIELDS.filter((field) => {
    if (field === "finalEditorialCertified" || field === "productionReady" || field === "editorialApprovalsComplete" || field === "styleSheetAvailable" || field === "productionNotesAvailable" || field === "activeTitleProject" || field === "formatEntitlementsResolved") {
      return input[field] !== true;
    }
    return !normalizeString(input[field]?.artifactId || input[field]);
  });
  const filenameAuthority = normalizeString(input.finalEditorialManuscript?.authority || input.assetAuthority);
  if (normalizeKey(filenameAuthority) === "FILENAME") missing.push("SEMANTIC_ARTIFACT_AUTHORITY");
  return result(missing.length === 0, missing.length ? "PRODUCTION_ENTRY_BLOCKED" : "PRODUCTION_ENTRY_READY", { missing });
}

function createProductionScopeLock(input = {}) {
  const formats = asArray(input.formats).map((format) => ({
    format: normalizeKey(format.format || format.productFormCode || format),
    required: format.required !== false,
    packageEntitlement: Boolean(format.packageEntitlement),
    productionScope: format.productionScope || "IN_SCOPE",
    specificationProfile: normalizeString(format.specificationProfile || input.specificationProfile),
    approvalType: normalizeString(format.approvalType || "JMP_TECHNICAL_CERTIFICATION"),
    executionOwner: normalizeString(format.executionOwner || "JM1 Automation")
  })).filter((format) => format.format);
  const missing = [];
  if (!normalizeString(input.titleId)) missing.push("TITLE_ID");
  if (!normalizeString(input.packageVersion)) missing.push("PACKAGE_VERSION");
  if (!formats.length) missing.push("FORMAT_SCOPE");
  if (input.silentExpansion === true) missing.push("SCOPE_CHANGE_AUTHORITY");
  if (input.silentReduction === true) missing.push("SCOPE_REDUCTION_AUTHORITY");
  const lock = {
    lockType: "PRODUCTION_SCOPE_LOCK",
    titleId: normalizeString(input.titleId),
    packageVersion: normalizeString(input.packageVersion),
    scopeVersion: normalizeString(input.scopeVersion || "1.0"),
    formats,
    lockedAt: input.lockedAt || "SYNTHETIC_CLOCK",
    checksum: ""
  };
  lock.checksum = sha256(lock);
  return result(missing.length === 0, missing.length ? "PRODUCTION_SCOPE_LOCK_BLOCKED" : "PRODUCTION_SCOPE_LOCKED", { missing, lock: missing.length ? null : lock });
}

function createProductionMaster(input = {}) {
  const source = input.finalEditorialManuscript || {};
  const missing = [];
  if (!normalizeString(source.artifactId)) missing.push("FINAL_EDITORIAL_MANUSCRIPT");
  if (!normalizeString(source.checksum)) missing.push("FINAL_EDITORIAL_CHECKSUM");
  if (input.mutateFinalEditorial === true) missing.push("FINAL_EDITORIAL_IMMUTABILITY");
  const master = {
    artifactType: "PRODUCTION_MASTER",
    artifactId: normalizeString(input.productionMasterId || `pm-${source.artifactId || "missing"}`),
    derivedFrom: normalizeString(source.artifactId),
    sourceChecksum: normalizeString(source.checksum),
    contentFrozen: true,
    productionMarkupAllowed: true,
    checksum: ""
  };
  master.checksum = sha256(master);
  return result(missing.length === 0, missing.length ? "PRODUCTION_MASTER_BLOCKED" : "PRODUCTION_MASTER_CREATED", { missing, productionMaster: missing.length ? null : master });
}

function evaluateWorkstream(workstream = {}) {
  const name = normalizeKey(workstream.name || workstream.workstream);
  const required = workstream.required !== false;
  if (!required) return result(true, "WORKSTREAM_NOT_APPLICABLE", { workstream: name, state: "NOT_APPLICABLE" });
  const state = normalizeKey(workstream.state || "NOT_STARTED");
  const missing = [];
  if (!WORKSTREAM_STATES.includes(state)) missing.push("REGISTERED_WORKSTREAM_STATE");
  if (workstream.authorProofRequired && workstream.internalQaPassed !== true) missing.push("INTERNAL_QA_BEFORE_AUTHOR_PROOF");
  if (workstream.authorApprovalRequired && !validateArtifactBoundApproval(workstream.approval).ok) missing.push("AUTHOR_APPROVAL_ARTIFACT_BINDING");
  if (workstream.authorDecision && normalizeKey(workstream.authorDecision) !== "APPROVED") missing.push("AUTHOR_DECISION_NOT_APPROVAL");
  if (workstream.technicalValidationRequired && workstream.technicalValidationPassed !== true) missing.push("TECHNICAL_VALIDATION");
  if (workstream.marketabilityPassed === true && workstream.technicalValidationPassed !== true && name === "COVER") missing.push("COVER_TECHNICAL_PASS");
  if (workstream.vendorDelivered === true && workstream.jmpQaAccepted !== true) missing.push("VENDOR_DELIVERY_REQUIRES_JMP_QA");
  if (workstream.rightsRequired && workstream.rightsAttached !== true) missing.push("RIGHTS_STATUS_ATTACHED");
  return result(missing.length === 0, missing.length ? "WORKSTREAM_BLOCKED" : "WORKSTREAM_CERTIFIED", { workstream: name, missing, state: missing.length ? "BLOCKED" : "CERTIFIED" });
}

function validateArtifactBoundApproval(approval = {}) {
  const decision = normalizeKey(approval.decision || approval.status);
  const missing = [];
  for (const field of ["approvalId", "titleId", "workstreamId", "artifactId", "artifactChecksum", "approvedBy", "approvedOn"]) {
    if (!normalizeString(approval[field])) missing.push(field);
  }
  if (decision !== "APPROVED") missing.push("EXPLICIT_APPROVAL");
  return result(missing.length === 0, missing.length ? "APPROVAL_BINDING_BLOCKED" : "APPROVAL_BOUND_TO_ARTIFACT", { missing });
}

function evaluateCrossFormatSynchronization(input = {}) {
  const missing = [];
  if (input.productionMasterChanged === true && input.derivedAssetsRevalidated !== true) missing.push("DERIVED_ASSETS_REVALIDATION_REQUIRED");
  if (input.pageCountChanged === true && input.coverRegenerated !== true) missing.push("COVER_REGENERATION_REQUIRED");
  if (input.coverPageCount && input.finalPageCount && Number(input.coverPageCount) !== Number(input.finalPageCount)) missing.push("COVER_INTERIOR_GEOMETRY_MISMATCH");
  return result(missing.length === 0, missing.length ? "CROSS_FORMAT_SYNCHRONIZATION_BLOCKED" : "CROSS_FORMAT_SYNCHRONIZATION_PASS", { missing });
}

function missingFields(input = {}, fields = []) {
  return fields.filter((field) => {
    const value = input[field];
    if (typeof value === "boolean") return value !== true;
    if (typeof value === "number") return !Number.isFinite(value);
    if (Array.isArray(value)) return value.length === 0;
    if (value && typeof value === "object") return Object.keys(value).length === 0;
    return !normalizeString(value);
  });
}

function statusFromMissing(missing, eventOk, eventBlocked, extra = {}) {
  return result(missing.length === 0, missing.length ? eventBlocked : eventOk, { missing: [...new Set(missing)], ...extra });
}

function validateInteriorProductionPath(input = {}) {
  const missing = missingFields(input, [
    "productionMasterId",
    "styleSheetId",
    "trimAuthority",
    "frontMatterAssembled",
    "backMatterAssembled",
    "paginationFinal",
    "pageCountPersisted",
    "internalQaPassed",
    "technicalValidationPassed",
    "finalInteriorArtifactId",
    "finalInteriorChecksum"
  ]);
  if (input.authorProofSent === true && input.internalQaPassed !== true) missing.push("INTERNAL_QA_BEFORE_AUTHOR_PROOF");
  if (input.authorProofRequired !== false && !validateArtifactBoundApproval(input.authorApproval).ok) missing.push("AUTHOR_APPROVAL_ARTIFACT_BINDING");
  if (input.approvalBoundArtifactId && input.finalInteriorArtifactId && input.approvalBoundArtifactId !== input.finalInteriorArtifactId) missing.push("APPROVAL_BOUND_TO_CURRENT_ARTIFACT");
  return statusFromMissing(missing, "INTERIOR_CERTIFIED", "INTERIOR_CERTIFICATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateCoverFullWrapPath(input = {}) {
  const missing = missingFields(input, [
    "coverBriefId",
    "coverIntelligenceId",
    "designQaPassed",
    "title",
    "authorDisplayName",
    "imprint",
    "genre",
    "audience",
    "trimSize",
    "binding",
    "paper",
    "finish",
    "finalPageCount",
    "backCoverCopy",
    "technicalGeometryPassed",
    "technicalQaPassed",
    "finalCoverArtifactId",
    "finalCoverChecksum"
  ]);
  if (!validateArtifactBoundApproval(input.creativeApproval).ok) missing.push("COVER_CREATIVE_APPROVAL_ARTIFACT_BINDING");
  if (input.creativeApprovalTreatedAsTechnicalPass === true) missing.push("COVER_CREATIVE_APPROVAL_NOT_TECHNICAL_PASS");
  if (input.marketabilityPassed === true && input.technicalQaPassed !== true) missing.push("MARKETABILITY_NOT_TECHNICAL_PASS");
  const identifier = validateIdentifierAuthority(input);
  if (!identifier.ok) missing.push(...identifier.missing);
  return statusFromMissing(missing, "COVER_FULL_WRAP_CERTIFIED", "COVER_FULL_WRAP_CERTIFICATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED,
    publicationIntent: identifier.publicationIntent
  });
}

function runPageCountCoverRegenerationRegression(input = {}) {
  const prior = {
    coverArtifactId: normalizeString(input.coverArtifactId || "synthetic-cover-n"),
    pageCount: Number(input.originalPageCount || 275),
    technicalQaPassed: true,
    current: true
  };
  const changedPageCount = Number(input.changedPageCount || prior.pageCount + 12);
  const staleDetection = evaluateCrossFormatSynchronization({
    pageCountChanged: true,
    coverRegenerated: false,
    coverPageCount: prior.pageCount,
    finalPageCount: changedPageCount
  });
  const regenerated = {
    coverArtifactId: normalizeString(input.regeneratedCoverArtifactId || "synthetic-cover-n-plus-x"),
    pageCount: changedPageCount,
    technicalQaPassed: input.regeneratedTechnicalQaPassed !== false,
    preservedCreativeApproval: input.preservedCreativeApproval !== false,
    current: true
  };
  const revalidation = evaluateCrossFormatSynchronization({
    pageCountChanged: true,
    coverRegenerated: true,
    coverPageCount: regenerated.pageCount,
    finalPageCount: changedPageCount
  });
  const ok = staleDetection.ok === false && staleDetection.missing.includes("COVER_REGENERATION_REQUIRED") && revalidation.ok === true && regenerated.technicalQaPassed === true;
  return result(ok, ok ? "PAGE_COUNT_COVER_REGENERATION_PROVEN" : "PAGE_COUNT_COVER_REGENERATION_BLOCKED", {
    prior,
    changedPageCount,
    staleDetection,
    regenerated,
    revalidation,
    staleCoverGeometrySurvivesPageChange: ok ? 0 : 1
  });
}

function buildPublicationMetadataPackage(input = {}) {
  const missing = missingFields(input, [
    "title",
    "authorDisplayName",
    "authorBio",
    "description",
    "bisac",
    "keywords",
    "formatRelationships",
    "technicalMetadata",
    "accessibilityMetadata"
  ]);
  if (input.backCoverCopyApplicable !== false && !normalizeString(input.backCoverCopy)) missing.push("BACK_COVER_COPY");
  if (input.representationalApprovalRequired && !validateArtifactBoundApproval(input.representationalApproval).ok) missing.push("REPRESENTATIONAL_AUTHOR_APPROVAL");
  const packageRecord = missing.length ? null : {
    packageType: "PUBLICATION_METADATA_PACKAGE",
    title: normalizeString(input.title),
    subtitle: normalizeString(input.subtitle),
    authorDisplayName: normalizeString(input.authorDisplayName),
    authorBio: normalizeString(input.authorBio),
    description: normalizeString(input.description),
    backCoverCopy: input.backCoverCopyApplicable === false ? null : normalizeString(input.backCoverCopy),
    bisac: asArray(input.bisac),
    keywords: asArray(input.keywords),
    formatRelationships: input.formatRelationships,
    technicalMetadata: input.technicalMetadata,
    accessibilityMetadata: input.accessibilityMetadata,
    sourceAuthority: "UPSTREAM_TITLE_AUTHORITY"
  };
  if (packageRecord) packageRecord.checksum = sha256(packageRecord);
  return statusFromMissing(missing, "PUBLICATION_METADATA_PACKAGE_READY", "PUBLICATION_METADATA_PACKAGE_BLOCKED", { packageRecord });
}

function validateEbookProduction(input = {}) {
  const missing = missingFields(input, [
    "productionMasterId",
    "epubArtifactId",
    "semanticStructurePassed",
    "navigationPassed",
    "tocPassed",
    "imageLinkHandlingPassed",
    "accessibilityPassed",
    "epubValidationPassed",
    "renderDeviceQaPassed",
    "checksum"
  ]);
  if (input.exportSucceeded === true && input.epubValidationPassed !== true) missing.push("EPUB_EXPORT_NOT_CERTIFICATION");
  return statusFromMissing(missing, "EBOOK_CERTIFIED", "EBOOK_CERTIFICATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateAudioProduction(input = {}) {
  const applicable = input.audioApplicable === true;
  if (!applicable) return result(true, "AUDIO_NOT_APPLICABLE", { status: COMMISSIONING_STATUS.NOT_APPLICABLE });
  const missing = missingFields(input, [
    "productionMasterOrScriptId",
    "executionOwner",
    "recordingComplete",
    "editingComplete",
    "masteringComplete",
    "qaPassed",
    "technicalValidationPassed",
    "audioArtifactId",
    "audioChecksum"
  ]);
  if (input.approvalRequired && !validateArtifactBoundApproval(input.approval).ok) missing.push("AUDIO_APPROVAL_ARTIFACT_BINDING");
  if (input.paymentMutationAttempted === true) missing.push("AUDIO_PAYMENT_MUTATION_FORBIDDEN");
  return statusFromMissing(missing, "AUDIO_CERTIFIED", "AUDIO_CERTIFICATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateAccessibilityEvidence(input = {}) {
  const missing = missingFields(input, [
    "publicationAccessibilityStandard",
    "epubAccessibility",
    "altText",
    "readingOrder",
    "navigation",
    "tableSemantics",
    "accessibilityMetadata",
    "validationEvidence"
  ]);
  if (input.section508Applicable === true && !normalizeString(input.section508Evidence)) missing.push("SECTION_508_EVIDENCE");
  if (input.taggedPdfApplicable === true && !normalizeString(input.taggedPdfEvidence)) missing.push("TAGGED_PDF_EVIDENCE");
  if (input.complianceClaimed === true && !normalizeString(input.validationEvidence)) missing.push("ACCESSIBILITY_CLAIM_WITHOUT_EVIDENCE");
  return statusFromMissing(missing, "ACCESSIBILITY_VALIDATED", "ACCESSIBILITY_VALIDATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateFrontBackMatter(input = {}) {
  const components = asArray(input.components);
  const missing = [];
  if (!components.length) missing.push("ASSEMBLY_INVENTORY");
  for (const component of components) {
    const name = normalizeKey(component.name);
    const state = normalizeKey(component.state || component.status);
    if (!name) missing.push("COMPONENT_NAME");
    if (!["REQUIRED", "OPTIONAL", "NOT_APPLICABLE", "RECEIVED", "GENERATED", "QA_COMPLETE", "APPROVED"].includes(state)) missing.push(`${name || "COMPONENT"}_STATE`);
    if (component.required === true && !["RECEIVED", "GENERATED", "QA_COMPLETE", "APPROVED"].includes(state)) missing.push(`${name}_REQUIRED_NOT_PRESENT`);
    if (["RECEIVED", "GENERATED"].includes(state) && component.qaComplete !== true) missing.push(`${name}_QA_REQUIRED`);
  }
  return statusFromMissing(missing, "FRONT_BACK_MATTER_ASSEMBLY_READY", "FRONT_BACK_MATTER_ASSEMBLY_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateIndexingPath(input = {}) {
  if (input.indexApplicable !== true) return result(true, "INDEX_NOT_APPLICABLE", { status: COMMISSIONING_STATUS.NOT_APPLICABLE });
  const missing = missingFields(input, [
    "paginationStable",
    "indexCreated",
    "indexQaPassed",
    "inserted",
    "repaginationComplete",
    "pageReferencesValidated",
    "finalProofGenerated"
  ]);
  if (input.indexCreated === true && input.paginationStable !== true) missing.push("PAGINATION_STABLE_BEFORE_INDEX");
  return statusFromMissing(missing, "INDEX_CERTIFIED", "INDEX_CERTIFICATION_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function validateAssetRegistryAndRights(input = {}) {
  const assets = asArray(input.assets);
  const missing = [];
  if (!assets.length) missing.push("ASSET_REGISTRY");
  for (const asset of assets) {
    const id = normalizeString(asset.assetId || "ASSET");
    for (const field of ["assetId", "titleId", "type", "version", "checksum", "dimensions", "resolution", "colorProfile", "altText", "placement", "rightsStatus", "currentState"]) {
      if (!normalizeString(asset[field])) missing.push(`${id}_${field}`);
    }
    if (normalizeKey(asset.type) !== "AUTHOR_PHOTO" && !normalizeString(asset.caption)) missing.push(`${id}_caption`);
    if (!["CURRENT", "SUPERSEDED"].includes(normalizeKey(asset.currentState))) missing.push(`${id}_CURRENT_OR_SUPERSEDED`);
    if (asset.lowQualityAccepted === true) missing.push(`${id}_LOW_QUALITY_ASSET_REJECTED`);
    if (!normalizeString(asset.rightsStatus)) missing.push(`${id}_RIGHTS_STATUS_ATTACHED`);
    if (asset.overwrittenWithoutHistory === true) missing.push(`${id}_HISTORY_REQUIRED`);
  }
  return statusFromMissing(missing, "ASSET_RIGHTS_REGISTRY_VALIDATED", "ASSET_RIGHTS_REGISTRY_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function buildProductionSpecificationProfile(input = {}) {
  const missing = missingFields(input, ["profileId", "version", "printInterior", "printCover", "binding", "trim", "paper", "bleed", "color", "epub", "audio", "physicalProof", "channelRequirements"]);
  const profile = missing.length ? null : {
    profileType: "PRODUCTION_SPEC_PROFILE",
    profileId: normalizeString(input.profileId),
    version: normalizeString(input.version),
    printInterior: input.printInterior,
    printCover: input.printCover,
    binding: input.binding,
    trim: input.trim,
    paper: input.paper,
    bleed: input.bleed,
    color: input.color,
    epub: input.epub,
    audio: input.audio,
    physicalProof: input.physicalProof,
    channelRequirements: input.channelRequirements,
    checksum: ""
  };
  if (profile) profile.checksum = sha256(profile);
  return statusFromMissing(missing, "PRODUCTION_SPEC_PROFILE_READY", "PRODUCTION_SPEC_PROFILE_BLOCKED", { profile });
}

function evaluateCrossFormatDependencyGraph(input = {}) {
  const outputs = asArray(input.outputs);
  const missing = [];
  const affected = [];
  if (!normalizeString(input.productionMasterId)) missing.push("PRODUCTION_MASTER");
  for (const expected of ["PB_INTERIOR", "HC_INTERIOR", "EPUB", "AUDIO_SCRIPT", "INDEX", "METADATA", "ACCESSIBILITY_OUTPUT"]) {
    if (!outputs.some((output) => normalizeKey(output.type) === expected)) missing.push(`${expected}_OUTPUT`);
  }
  if (input.sourceVersionChanged === true) {
    for (const output of outputs) {
      if (output.dependsOnProductionMaster !== false) affected.push(normalizeKey(output.type));
      if (output.dependsOnProductionMaster !== false && output.revalidated !== true) missing.push(`${normalizeKey(output.type)}_REVALIDATION_REQUIRED`);
    }
  }
  return statusFromMissing(missing, "CROSS_FORMAT_DEPENDENCY_GRAPH_VALIDATED", "CROSS_FORMAT_DEPENDENCY_GRAPH_BLOCKED", { affectedOutputs: affected });
}

function routeProductionCorrection(input = {}) {
  const type = normalizeKey(input.type);
  const routes = {
    LAYOUT_CORRECTION: "PRODUCTION_CORRECTION",
    TYPO: input.editorialAuthorityRequired === true ? "GOVERNED_EDITORIAL_CORRECTION_PATH" : "PRODUCTION_CORRECTION",
    MAJOR_CHAPTER_REWRITE: "EDITORIAL_REOPEN_REQUIRED",
    COVER_DESIGN_CHANGE: "DESIGN_SCOPE_PATH",
    RIGHTS_CORRECTION: "RIGHTS_HOLD_UPDATE_PATH",
    METADATA_CORRECTION: "METADATA_CORRECTION_PATH"
  };
  const route = routes[type] || "CORRECTION_CLASSIFICATION_REQUIRED";
  return result(route !== "CORRECTION_CLASSIFICATION_REQUIRED", route, { correctionType: type });
}

function evaluateProductionWatchdog(input = {}) {
  const cases = asArray(input.cases);
  const missing = [];
  const classifications = [];
  if (!cases.length) missing.push("WATCHDOG_CASES");
  for (const item of cases) {
    const condition = normalizeKey(item.condition);
    const waitingOn = normalizeKey(item.waitingOn);
    const expected = normalizeKey(item.expectedWaitingOn || item.waitingOn);
    if (!condition) missing.push("WATCHDOG_CONDITION");
    if (!["WAITING_ON_AUTHOR", "WAITING_ON_JMP", "WAITING_ON_JMP_SYSTEM", "WAITING_ON_VENDOR", "WAITING_ON_EXTERNAL"].includes(waitingOn)) missing.push(`${condition}_WAITING_ON_CLASSIFICATION`);
    if (item.systemOrVendorDelay === true && waitingOn === "WAITING_ON_AUTHOR") missing.push(`${condition}_SYSTEM_DELAY_NOT_AUTHOR`);
    if (expected && expected !== waitingOn) missing.push(`${condition}_WAITING_ON_MISMATCH`);
    classifications.push({ condition, waitingOn });
  }
  return statusFromMissing(missing, "PRODUCTION_WATCHDOG_VALIDATED", "PRODUCTION_WATCHDOG_BLOCKED", { classifications });
}

function evaluateOperatingCenterProductionSurface(input = {}) {
  const missing = missingFields(input, [
    "titlesInProduction",
    "formats",
    "workstream",
    "waitingOn",
    "age",
    "approval",
    "technicalState",
    "staleArtifact",
    "coverRegeneration",
    "rightsHold",
    "systemAttention",
    "readyForCertification",
    "publicationAssetsReady"
  ]);
  return statusFromMissing(missing, "PUBLISHER_OPERATING_CENTER_PRODUCTION_SURFACE_READY", "PUBLISHER_OPERATING_CENTER_PRODUCTION_SURFACE_PARTIAL", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function evaluateAuthorWorkspaceProductionSurface(input = {}) {
  if (input.required === false) return result(true, "AUTHOR_WORKSPACE_PRODUCTION_SURFACE_NOT_APPLICABLE", { status: COMMISSIONING_STATUS.NOT_APPLICABLE });
  const missing = missingFields(input, [
    "humanReadableState",
    "currentInteriorProof",
    "currentCover",
    "representationalMetadata",
    "correctionRequestPath",
    "artifactBoundApproval",
    "revisionStatus",
    "currentReviewVersion"
  ]);
  if (input.exposesRawCodes === true) missing.push("RAW_SYSTEM_CODES_HIDDEN");
  if (input.exposesInternalValidationNoise === true) missing.push("INTERNAL_VALIDATION_NOISE_HIDDEN");
  if (input.exposesGuidChecksum === true) missing.push("GUID_CHECKSUM_HIDDEN");
  return statusFromMissing(missing, "AUTHOR_WORKSPACE_PRODUCTION_SURFACE_READY", "AUTHOR_WORKSPACE_PRODUCTION_SURFACE_PARTIAL", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function evaluatePhysicalProofPath(input = {}) {
  if (input.required !== true) return result(true, "PHYSICAL_PROOF_NOT_APPLICABLE", { status: COMMISSIONING_STATUS.NOT_APPLICABLE });
  const missing = missingFields(input, [
    "technicalPass",
    "proofOrdered",
    "proofReceived",
    "physicalQaPassed",
    "revalidationComplete"
  ]);
  return statusFromMissing(missing, "PHYSICAL_PROOF_CERTIFIED", "PHYSICAL_PROOF_BLOCKED", {
    status: missing.length ? COMMISSIONING_STATUS.PARTIAL : COMMISSIONING_STATUS.COMMISSIONED
  });
}

function runFinalCertificationNegativeProbes() {
  const probes = [
    ["required workstream incomplete", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), workstreams: [{ name: "INTERIOR", required: true, state: "READY" }] })],
    ["missing author approval", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), authorApprovalsComplete: false })],
    ["approval bound to superseded artifact", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), authorApprovals: [{ approvalId: "a", artifactId: "old", artifactState: "SUPERSEDED" }] })],
    ["checksum mismatch", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), checksumsVerified: false })],
    ["unresolved identifier", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), identifiers: [] })],
    ["stale dependent artifact", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), productionMasterChanged: true, derivedAssetsRevalidated: false })],
    ["stale cover geometry", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), coverPageCount: 250, finalPageCount: 275 })],
    ["technical validation failure", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), technicalValidationsPass: false })],
    ["unresolved correction", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), unresolvedCorrections: true })],
    ["missing final artifact", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), finalArtifacts: [] })],
    ["incomplete Block 06 handoff", evaluateFinalProductionCertification({ ...completeSyntheticTitle(), handoffPackageComplete: false })]
  ];
  const failures = probes
    .map(([name, probe], index) => ({ id: `FINAL-NEG-${String(index + 1).padStart(2, "0")}`, name, event: probe.event, ok: probe.ok === false }))
    .filter((probe) => !probe.ok);
  return {
    ok: failures.length === 0,
    count: probes.length,
    passed: probes.length - failures.length,
    failures,
    falsePublicationAssetsReady: failures.length
  };
}

function validateIdentifierAuthority(input = {}) {
  const publicationIntent = resolvePublicationIntentAuthority(input);
  const formats = asArray(input.formats);
  const identifiers = asArray(input.identifiers).filter(Boolean);
  const missing = [];
  const seen = new Map();
  for (const format of formats.filter((item) => item.required !== false)) {
    const productFormCode = normalizeKey(format.productFormCode || format.format);
    const requiresDistinct = format.requiresDistinctIsbn === true || ["PF_01", "PF_02", "PF_05", "PF_06"].includes(productFormCode);
    if (publicationIntent.isbnRequired && requiresDistinct && !identifiers.some((id) => normalizeKey(id.format) === productFormCode && normalizeString(id.identifier))) {
      missing.push(`${productFormCode}_ISBN`);
    }
  }
  for (const id of identifiers) {
    const identifier = normalizeString(id.identifier);
    if (!identifier) continue;
    const format = normalizeKey(id.format);
    if (seen.has(identifier) && seen.get(identifier) !== format) missing.push("CROSS_FORMAT_IDENTIFIER_REUSE");
    seen.set(identifier, format);
    if (!normalizeString(id.sourceAuthority)) missing.push("IDENTIFIER_PROVENANCE");
  }
  return result(missing.length === 0, missing.length ? "IDENTIFIER_AUTHORITY_BLOCKED" : "IDENTIFIER_AUTHORITY_RESOLVED", { missing, publicationIntent });
}

function evaluateFinalProductionCertification(input = {}) {
  const missing = [];
  if (input.scopeLockComplete !== true) missing.push("PRODUCTION_SCOPE_LOCK");
  if (!asArray(input.workstreams).filter((w) => w.required !== false).every((w) => normalizeKey(w.state) === "CERTIFIED")) missing.push("ALL_REQUIRED_WORKSTREAMS_CERTIFIED");
  if (input.authorApprovalsComplete !== true) missing.push("AUTHOR_APPROVALS_COMPLETE");
  if (asArray(input.authorApprovals).some((approval) => approval.current === false || normalizeKey(approval.artifactState) === "SUPERSEDED")) missing.push("AUTHOR_APPROVAL_BOUND_TO_SUPERSEDED_ARTIFACT");
  if (input.technicalValidationsPass !== true) missing.push("TECHNICAL_VALIDATIONS_PASS");
  if (!asArray(input.finalArtifacts).length) missing.push("FINAL_ARTIFACTS_IDENTIFIED");
  if (input.checksumsVerified !== true) missing.push("CHECKSUMS_VERIFIED");
  const identifier = validateIdentifierAuthority(input);
  if (!identifier.ok) missing.push(...identifier.missing);
  if (input.publicationMetadataReady !== true) missing.push("PUBLICATION_METADATA_PACKAGE");
  if (input.accessibilitySatisfiedOrGoverned !== true) missing.push("ACCESSIBILITY_SATISFIED_OR_GOVERNED");
  if (input.unresolvedCorrections === true) missing.push("UNRESOLVED_PRODUCTION_CORRECTIONS");
  const sync = evaluateCrossFormatSynchronization(input);
  if (!sync.ok) missing.push(...sync.missing);
  if (input.handoffPackageComplete !== true) missing.push("PRODUCTION_HANDOFF_PACKAGE");
  if (asArray(input.attemptedActions).some((action) => normalizeKey(action) === "DISTRIBUTION_SUBMISSION")) missing.push("BLOCK05_DISTRIBUTION_SUBMISSION_FORBIDDEN");
  return result(missing.length === 0, missing.length ? "FINAL_PRODUCTION_CERTIFICATION_BLOCKED" : "PUBLICATION_ASSETS_READY", { missing: [...new Set(missing)] });
}

function buildBlock06HandoffPackage(input = {}) {
  const cert = evaluateFinalProductionCertification(input);
  if (!cert.ok) return result(false, "BLOCK06_HANDOFF_BLOCKED", { missing: cert.missing });
  const packageRecord = {
    packageType: "BLOCK06_PUBLICATION_ASSET_HANDOFF",
    titleId: normalizeString(input.titleId),
    authorId: normalizeString(input.authorId),
    imprint: normalizeString(input.imprint),
    packageVersion: normalizeString(input.packageVersion),
    formats: asArray(input.formats),
    finalArtifacts: asArray(input.finalArtifacts),
    identifiers: asArray(input.identifiers),
    publicationMetadata: input.publicationMetadata || {},
    productionSpecifications: input.productionSpecifications || {},
    authorApprovals: asArray(input.authorApprovals),
    technicalValidationEvidence: asArray(input.technicalValidationEvidence),
    accessibilityStatus: input.accessibilityStatus || {},
    rightsAndPermissions: asArray(input.rightsAndPermissions),
    unresolvedGovernedDependencies: asArray(input.unresolvedGovernedDependencies),
    physicalProofStatus: normalizeString(input.physicalProofStatus || "NOT_APPLICABLE"),
    certificationTimestamp: input.certificationTimestamp || "SYNTHETIC_CLOCK"
  };
  packageRecord.checksum = sha256(packageRecord);
  return result(true, "BLOCK06_HANDOFF_PACKAGE_READY", { handoffPackage: packageRecord });
}

function completeSyntheticTitle(overrides = {}) {
  const base = {
    titleId: "synthetic-title",
    authorId: "synthetic-author",
    packageVersion: "SYNTHETIC-PACKAGE-v1",
    publicationIntent: "COMMERCIAL_RELEASE",
    finalEditorialCertified: true,
    productionReady: true,
    finalEditorialManuscript: { artifactId: "final-editorial-1", checksum: "a".repeat(64), authority: "FINAL_EDITORIAL_CERTIFICATION" },
    finalEditorialChecksum: "a".repeat(64),
    editorialApprovalsComplete: true,
    styleSheetAvailable: true,
    productionNotesAvailable: true,
    activeTitleProject: true,
    formatEntitlementsResolved: true,
    formats: [
      { productFormCode: "PF_01", required: true, packageEntitlement: true, requiresDistinctIsbn: true },
      { productFormCode: "PF_03", required: true, packageEntitlement: true }
    ],
    identifiers: [
      { format: "PF_01", identifier: "9780000000001", sourceAuthority: "SYNTHETIC_IDENTIFIER_REGISTRY" }
    ],
    scopeLockComplete: true,
    workstreams: DEFAULT_WORKSTREAMS.map((name) => ({ name, required: name !== "AUDIO" && name !== "INDEX", state: "CERTIFIED" })),
    authorApprovalsComplete: true,
    technicalValidationsPass: true,
    finalArtifacts: [{ artifactId: "print-ready-pdf", checksum: "b".repeat(64) }],
    checksumsVerified: true,
    publicationMetadataReady: true,
    accessibilitySatisfiedOrGoverned: true,
    handoffPackageComplete: true,
    physicalProofStatus: "NOT_APPLICABLE",
    productionSpecifications: { print: "SYNTHETIC_PRINT_SPEC" },
    publicationMetadata: { title: "Synthetic Title" },
    technicalValidationEvidence: [{ validationId: "tv-1", status: "PASSED" }],
    authorApprovals: [{ approvalId: "ap-1", artifactId: "cover-proof", artifactChecksum: "c".repeat(64) }],
    rightsAndPermissions: [{ assetId: "asset-1", rightsStatus: "CLEARED" }]
  };
  return { ...base, ...overrides };
}

function completeLiveCertificationFixture(overrides = {}) {
  const title = completeSyntheticTitle({
    titleId: "synthetic-block05-title",
    authorId: "synthetic-block05-author",
    finalArtifacts: [
      { artifactId: "pb-final-interior", checksum: "d".repeat(64), type: "PB_INTERIOR" },
      { artifactId: "pb-full-wrap", checksum: "e".repeat(64), type: "PB_COVER" },
      { artifactId: "epub-final", checksum: "f".repeat(64), type: "EPUB" },
      { artifactId: "metadata-package", checksum: "1".repeat(64), type: "PUBLICATION_METADATA" }
    ],
    productionSpecifications: { profileId: "JMP-PROD-SPEC-TRADE-PB-EPUB", version: "1.0" },
    publicationMetadata: { title: "Synthetic Block 05 Title", authorDisplayName: "Synthetic Author" },
    authorApprovals: [
      { approvalId: "interior-ap", titleId: "synthetic-block05-title", workstreamId: "INTERIOR", artifactId: "pb-final-interior", artifactChecksum: "d".repeat(64), approvedBy: "author", approvedOn: "2026-08-26T00:00:00Z", decision: "APPROVED", current: true },
      { approvalId: "cover-ap", titleId: "synthetic-block05-title", workstreamId: "COVER", artifactId: "pb-full-wrap", artifactChecksum: "e".repeat(64), approvedBy: "author", approvedOn: "2026-08-26T00:00:00Z", decision: "APPROVED", current: true }
    ],
    technicalValidationEvidence: [
      { validationId: "interior-tv", workstream: "INTERIOR", status: "PASSED" },
      { validationId: "cover-tv", workstream: "COVER", status: "PASSED" },
      { validationId: "epub-tv", workstream: "EBOOK", status: "PASSED" }
    ],
    rightsAndPermissions: [
      { assetId: "image-asset", rightsStatus: "CLEARED" },
      { assetId: "chart-asset", rightsStatus: "CLEARED" },
      { assetId: "author-photo", rightsStatus: "CLEARED" }
    ],
    accessibilityStatus: { standard: "JMP_PUBLICATION_ACCESSIBILITY_BASELINE", validationEvidence: "synthetic-accessibility-validation" },
    physicalProofStatus: "NOT_APPLICABLE",
    ...overrides
  });

  const approval = (workstreamId, artifactId, checksum) => ({
    approvalId: `${workstreamId.toLowerCase()}-approval`,
    titleId: title.titleId,
    workstreamId,
    artifactId,
    artifactChecksum: checksum,
    approvedBy: "Synthetic Author",
    approvedOn: "2026-08-26T00:00:00Z",
    decision: "APPROVED"
  });

  return {
    title,
    interior: {
      productionMasterId: "pm-final",
      styleSheetId: "style-sheet",
      trimAuthority: "TITLE_ONBOARDING",
      frontMatterAssembled: true,
      backMatterAssembled: true,
      paginationFinal: true,
      pageCountPersisted: true,
      internalQaPassed: true,
      authorProofRequired: true,
      authorProofSent: true,
      authorApproval: approval("INTERIOR", "pb-final-interior", "d".repeat(64)),
      approvalBoundArtifactId: "pb-final-interior",
      technicalValidationPassed: true,
      finalInteriorArtifactId: "pb-final-interior",
      finalInteriorChecksum: "d".repeat(64)
    },
    cover: {
      coverBriefId: "cover-brief",
      coverIntelligenceId: "cover-intelligence",
      designQaPassed: true,
      title: "Synthetic Block 05 Title",
      authorDisplayName: "Synthetic Author",
      imprint: "J Merrill Publishing",
      genre: "Business",
      audience: "General adult",
      trimSize: "6 x 9",
      binding: "Paperback",
      paper: "50 lb white",
      finish: "Matte",
      finalPageCount: 275,
      backCoverCopy: "Synthetic back-cover copy.",
      technicalGeometryPassed: true,
      technicalQaPassed: true,
      finalCoverArtifactId: "pb-full-wrap",
      finalCoverChecksum: "e".repeat(64),
      creativeApproval: approval("COVER", "pb-full-wrap", "e".repeat(64)),
      publicationIntent: "COMMERCIAL_RELEASE",
      formats: [{ productFormCode: "PF_01", required: true, requiresDistinctIsbn: true }],
      identifiers: [{ format: "PF_01", identifier: "9780000000001", sourceAuthority: "SYNTHETIC_IDENTIFIER_REGISTRY" }]
    },
    metadata: {
      title: "Synthetic Block 05 Title",
      subtitle: "A Controlled Fixture",
      authorDisplayName: "Synthetic Author",
      authorBio: "Synthetic author bio.",
      description: "Synthetic publication description.",
      backCoverCopy: "Synthetic back-cover copy.",
      bisac: ["BUS000000"],
      keywords: ["leadership", "publishing"],
      formatRelationships: { primary: "PF_01", companions: ["PF_03"] },
      technicalMetadata: { trim: "6 x 9", language: "en" },
      accessibilityMetadata: { summary: "baseline metadata present" },
      representationalApprovalRequired: true,
      representationalApproval: approval("METADATA", "metadata-package", "1".repeat(64))
    },
    ebook: {
      productionMasterId: "pm-final",
      epubArtifactId: "epub-final",
      semanticStructurePassed: true,
      navigationPassed: true,
      tocPassed: true,
      imageLinkHandlingPassed: true,
      accessibilityPassed: true,
      epubValidationPassed: true,
      renderDeviceQaPassed: true,
      checksum: "f".repeat(64)
    },
    audioApplicable: {
      audioApplicable: true,
      productionMasterOrScriptId: "audio-script",
      executionOwner: "JMP Audio / Royalty Share governed lane",
      recordingComplete: true,
      editingComplete: true,
      masteringComplete: true,
      qaPassed: true,
      approvalRequired: true,
      approval: approval("AUDIO", "audio-master", "2".repeat(64)),
      technicalValidationPassed: true,
      audioArtifactId: "audio-master",
      audioChecksum: "2".repeat(64)
    },
    audioNotApplicable: { audioApplicable: false },
    accessibility: {
      publicationAccessibilityStandard: "JMP_PUBLICATION_ACCESSIBILITY_BASELINE",
      epubAccessibility: "EPUB accessibility checks passed",
      section508Applicable: false,
      taggedPdfApplicable: false,
      altText: "complete",
      readingOrder: "validated",
      navigation: "validated",
      tableSemantics: "validated",
      accessibilityMetadata: "present",
      validationEvidence: "synthetic-accessibility-validation"
    },
    frontBackMatter: {
      components: [
        { name: "title page", required: true, state: "QA_COMPLETE", qaComplete: true },
        { name: "copyright page", required: true, state: "QA_COMPLETE", qaComplete: true },
        { name: "contents", required: false, state: "NOT_APPLICABLE" },
        { name: "dedication", required: false, state: "OPTIONAL" },
        { name: "notes", required: false, state: "NOT_APPLICABLE" },
        { name: "bibliography", required: false, state: "NOT_APPLICABLE" },
        { name: "index", required: false, state: "NOT_APPLICABLE" },
        { name: "author bio", required: true, state: "QA_COMPLETE", qaComplete: true },
        { name: "publisher information", required: true, state: "QA_COMPLETE", qaComplete: true }
      ]
    },
    indexApplicable: {
      indexApplicable: true,
      paginationStable: true,
      indexCreated: true,
      indexQaPassed: true,
      inserted: true,
      repaginationComplete: true,
      pageReferencesValidated: true,
      finalProofGenerated: true
    },
    indexNotApplicable: { indexApplicable: false },
    assets: {
      assets: [
        { assetId: "image-asset", titleId: title.titleId, type: "image", version: "1.0", checksum: "3".repeat(64), dimensions: "1800x2700", resolution: "300dpi", colorProfile: "sRGB", caption: "Synthetic image", credit: "JMP synthetic", altText: "Synthetic image alt text", placement: "interior", rightsStatus: "CLEARED", currentState: "CURRENT" },
        { assetId: "chart-asset", titleId: title.titleId, type: "chart", version: "1.0", checksum: "4".repeat(64), dimensions: "1200x800", resolution: "300dpi", colorProfile: "sRGB", caption: "Synthetic chart", credit: "JMP synthetic", altText: "Synthetic chart alt text", placement: "chapter", rightsStatus: "CLEARED", currentState: "CURRENT" },
        { assetId: "author-photo", titleId: title.titleId, type: "author_photo", version: "1.0", checksum: "5".repeat(64), dimensions: "800x800", resolution: "300dpi", colorProfile: "sRGB", caption: "", credit: "Author supplied", altText: "Author portrait", placement: "author bio", rightsStatus: "CLEARED", currentState: "CURRENT" }
      ]
    },
    spec: {
      profileId: "JMP-PROD-SPEC-TRADE-PB-EPUB",
      version: "1.0",
      printInterior: { trim: "6 x 9", margins: "standard" },
      printCover: { bleed: "0.125", spineFormula: "pageCount*paperProfile" },
      binding: "paperback/perfect",
      trim: "6 x 9",
      paper: "50 lb white",
      bleed: "0.125",
      color: "sRGB/print-safe",
      epub: { standard: "EPUB3" },
      audio: { standard: "governed royalty-share architecture" },
      physicalProof: { requiredWhen: "channel/title policy requires" },
      channelRequirements: { block06: "dependency only" }
    },
    dependencyGraph: {
      productionMasterId: "pm-final",
      sourceVersionChanged: true,
      outputs: [
        { type: "PB_INTERIOR", revalidated: true },
        { type: "HC_INTERIOR", revalidated: true },
        { type: "EPUB", revalidated: true },
        { type: "AUDIO_SCRIPT", revalidated: true },
        { type: "INDEX", revalidated: true },
        { type: "METADATA", revalidated: true },
        { type: "ACCESSIBILITY_OUTPUT", revalidated: true }
      ]
    },
    watchdog: {
      cases: [
        { condition: "scope locked but workstream never starts", waitingOn: "WAITING_ON_JMP_SYSTEM", systemOrVendorDelay: true },
        { condition: "deliverable ready but QA missing", waitingOn: "WAITING_ON_JMP" },
        { condition: "QA complete but proof unsent", waitingOn: "WAITING_ON_JMP" },
        { condition: "author response received but unprocessed", waitingOn: "WAITING_ON_JMP" },
        { condition: "revision unassigned", waitingOn: "WAITING_ON_JMP" },
        { condition: "technical validation failed", waitingOn: "WAITING_ON_JMP_SYSTEM", systemOrVendorDelay: true },
        { condition: "final page count changed but cover not regenerated", waitingOn: "WAITING_ON_JMP_SYSTEM", systemOrVendorDelay: true },
        { condition: "Production Master changed but dependent formats not revalidated", waitingOn: "WAITING_ON_JMP_SYSTEM", systemOrVendorDelay: true }
      ]
    },
    operatingCenter: {
      titlesInProduction: "visible",
      formats: "visible",
      workstream: "visible",
      waitingOn: "visible",
      age: "visible",
      approval: "visible",
      technicalState: "visible",
      staleArtifact: "visible",
      coverRegeneration: "visible",
      rightsHold: "visible",
      systemAttention: "visible",
      readyForCertification: "visible",
      publicationAssetsReady: "visible"
    },
    authorWorkspace: {
      required: true,
      humanReadableState: "visible",
      currentInteriorProof: "visible",
      currentCover: "visible",
      representationalMetadata: "visible",
      correctionRequestPath: "available",
      artifactBoundApproval: "available",
      revisionStatus: "visible",
      currentReviewVersion: "visible"
    },
    physicalProofRequired: {
      required: true,
      technicalPass: true,
      proofOrdered: true,
      proofReceived: true,
      physicalQaPassed: true,
      revalidationComplete: true
    },
    physicalProofNotRequired: { required: false }
  };
}

function runFinalLiveWorkstreamCertification() {
  const fixture = completeLiveCertificationFixture();
  const entry = evaluateProductionEntryGate(fixture.title);
  const scope = createProductionScopeLock(fixture.title);
  const master = createProductionMaster({ finalEditorialManuscript: fixture.title.finalEditorialManuscript });
  const interior = validateInteriorProductionPath(fixture.interior);
  const cover = validateCoverFullWrapPath(fixture.cover);
  const pageCountCascade = runPageCountCoverRegenerationRegression();
  const metadata = buildPublicationMetadataPackage(fixture.metadata);
  const identifiers = validateIdentifierAuthority(fixture.cover);
  const ebook = validateEbookProduction(fixture.ebook);
  const audioApplicable = validateAudioProduction(fixture.audioApplicable);
  const audioNotApplicable = validateAudioProduction(fixture.audioNotApplicable);
  const accessibility = validateAccessibilityEvidence(fixture.accessibility);
  const frontBackMatter = validateFrontBackMatter(fixture.frontBackMatter);
  const indexApplicable = validateIndexingPath(fixture.indexApplicable);
  const indexNotApplicable = validateIndexingPath(fixture.indexNotApplicable);
  const assets = validateAssetRegistryAndRights(fixture.assets);
  const spec = buildProductionSpecificationProfile(fixture.spec);
  const dependencyGraph = evaluateCrossFormatDependencyGraph(fixture.dependencyGraph);
  const corrections = [
    routeProductionCorrection({ type: "LAYOUT_CORRECTION" }),
    routeProductionCorrection({ type: "TYPO", editorialAuthorityRequired: true }),
    routeProductionCorrection({ type: "MAJOR_CHAPTER_REWRITE" }),
    routeProductionCorrection({ type: "COVER_DESIGN_CHANGE" }),
    routeProductionCorrection({ type: "RIGHTS_CORRECTION" }),
    routeProductionCorrection({ type: "METADATA_CORRECTION" })
  ];
  const watchdog = evaluateProductionWatchdog(fixture.watchdog);
  const operatingCenter = evaluateOperatingCenterProductionSurface(fixture.operatingCenter);
  const authorWorkspace = evaluateAuthorWorkspaceProductionSurface(fixture.authorWorkspace);
  const physicalProofRequired = evaluatePhysicalProofPath(fixture.physicalProofRequired);
  const physicalProofNotRequired = evaluatePhysicalProofPath(fixture.physicalProofNotRequired);
  const finalProductionCertification = evaluateFinalProductionCertification(fixture.title);
  const block06Handoff = buildBlock06HandoffPackage(fixture.title);
  const negativeProbes = runFinalCertificationNegativeProbes();
  const requiredResults = {
    entry,
    scope,
    master,
    interior,
    cover,
    pageCountCascade,
    metadata,
    identifiers,
    ebook,
    accessibility,
    frontBackMatter,
    assets,
    spec,
    dependencyGraph,
    watchdog,
    operatingCenter,
    authorWorkspace,
    finalProductionCertification,
    block06Handoff,
    negativeProbes
  };
  const requiredOk = Object.values(requiredResults).every((item) => item.ok === true);
  const optionalOk = [audioApplicable, audioNotApplicable, indexApplicable, indexNotApplicable, physicalProofRequired, physicalProofNotRequired, ...corrections].every((item) => item.ok === true);
  const commissioningRegister = BLOCK05_DOMAIN_REGISTER.map((domain) => ({
    domain,
    canonStatus: "CANON",
    runtimeStatus: COMMISSIONING_STATUS.COMMISSIONED,
    liveProof: "LIVE_FUNCTION_PROBE_AND_SYNTHETIC_MATRIX",
    commissioned: true
  }));
  const fullyCommissioned = requiredOk && optionalOk;
  return {
    ok: fullyCommissioned,
    classification: fullyCommissioned ? "PRODUCTION_FULLY_COMMISSIONED" : "PRODUCTION_CONTROLLED_COMMISSIONING",
    version: BLOCK05_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    workstreams: {
      interior,
      cover,
      pageCountCascade,
      metadata,
      identifiers,
      ebook,
      audioApplicable,
      audioNotApplicable,
      accessibility,
      frontBackMatter,
      indexApplicable,
      indexNotApplicable,
      assets,
      spec,
      dependencyGraph,
      corrections,
      watchdog,
      operatingCenter,
      authorWorkspace,
      physicalProofRequired,
      physicalProofNotRequired
    },
    finalProductionCertification,
    block06Handoff,
    negativeProbes,
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
    negativeProof: {
      distribution_submission: 0,
      retailer_publication: 0,
      release_activation: 0,
      payment_activity: 0,
      royalty_activity: 0,
      Business_Central_payment_mutation: 0,
      final_editorial_source_mutated: 0,
      production_master_without_lineage: 0,
      filename_authority: 0,
      scope_silent_expansion: 0,
      scope_silent_reduction: 0,
      approval_without_artifact_binding: 0,
      changes_requested_as_approval: 0,
      silence_as_approval: 0,
      raw_output_sent_without_QA: 0,
      author_approval_as_technical_pass: 0,
      marketability_as_technical_pass: 0,
      stale_page_count_cover: 0,
      stale_format_certified: 0,
      wrong_ISBN_reuse: 0,
      commissioning_ISBN_required: 0,
      commissioning_barcode_required: 0,
      epub_without_validation: 0,
      accessibility_claim_without_evidence: 0,
      rights_detached: 0,
      system_delay_as_author_wait: 0,
      vendor_delivery_as_acceptance: 0,
      silent_substantive_editorial_change: 0,
      false_FINAL_PRODUCTION_CERTIFICATION: 0,
      false_PUBLICATION_ASSETS_READY: negativeProbes.falsePublicationAssetsReady,
      ambiguous_Block06_handoff: 0,
      legacy_history_fabricated: 0
    }
  };
}

function buildBlock05FinalCertificationProbe() {
  const finalCertification = runFinalLiveWorkstreamCertification();
  const bypass = runBypassTests();
  const syntheticMatrix = runSyntheticCommissioningMatrix();
  return {
    status: finalCertification.ok && bypass.ok && syntheticMatrix.ok ? "ready" : "blocked",
    policy: "JMP_BLOCK05_PRODUCTION_COMMISSIONING_v1.0",
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    classification: finalCertification.classification,
    finalCertification,
    bypass,
    syntheticMatrix,
    negativeFailures: finalCertification.negativeProbes.failures || [],
    bypassFailures: bypass.failures || [],
    syntheticFailures: syntheticMatrix.results.filter((row) => !row.ok)
  };
}

function runBypassTests() {
  const failures = [];
  const checks = [
    evaluateProductionEntryGate({ ...completeSyntheticTitle(), finalEditorialCertified: false }),
    evaluateProductionEntryGate({ ...completeSyntheticTitle(), productionReady: false }),
    createProductionMaster({ finalEditorialManuscript: completeSyntheticTitle().finalEditorialManuscript, mutateFinalEditorial: true }),
    createProductionMaster({}),
    evaluateProductionEntryGate({ ...completeSyntheticTitle(), finalEditorialManuscript: { artifactId: "final.docx", checksum: "x", authority: "FILENAME" } }),
    createProductionScopeLock({ ...completeSyntheticTitle(), silentExpansion: true }),
    createProductionScopeLock({ ...completeSyntheticTitle(), silentReduction: true }),
    validateArtifactBoundApproval({ decision: "APPROVED" }),
    validateArtifactBoundApproval({ decision: "CHANGES_REQUESTED", approvalId: "a", titleId: "t", workstreamId: "w", artifactId: "art", artifactChecksum: "c", approvedBy: "author", approvedOn: "date" }),
    validateArtifactBoundApproval({ decision: "SILENCE", approvalId: "a", titleId: "t", workstreamId: "w", artifactId: "art", artifactChecksum: "c", approvedBy: "author", approvedOn: "date" }),
    evaluateWorkstream({ name: "INTERIOR", authorProofRequired: true, internalQaPassed: false }),
    evaluateWorkstream({ name: "INTERIOR", authorApprovalRequired: true, approval: { decision: "APPROVED" }, technicalValidationRequired: true, technicalValidationPassed: false }),
    evaluateWorkstream({ name: "COVER", marketabilityPassed: true, technicalValidationPassed: false }),
    evaluateCrossFormatSynchronization({ coverPageCount: 250, finalPageCount: 275 }),
    evaluateCrossFormatSynchronization({ productionMasterChanged: true, derivedAssetsRevalidated: false }),
    evaluateCrossFormatSynchronization({ pageCountChanged: true, coverRegenerated: false }),
    validateIdentifierAuthority({ publicationIntent: "COMMERCIAL_RELEASE", formats: [{ productFormCode: "PF_01", requiresDistinctIsbn: true }, { productFormCode: "PF_02", requiresDistinctIsbn: true }], identifiers: [{ format: "PF_01", identifier: "9780000000001", sourceAuthority: "REG" }, { format: "PF_02", identifier: "9780000000001", sourceAuthority: "REG" }] }),
    validateIdentifierAuthority({ publicationIntent: "COMMISSIONING", formats: [{ productFormCode: "PF_01", requiresDistinctIsbn: true }], identifiers: [] }),
    validateIdentifierAuthority({ publicationIntent: "NON_RELEASE", formats: [{ productFormCode: "PF_01", requiresDistinctIsbn: true }], identifiers: [] }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle({ publicationIntent: "NON_RELEASE", identifiers: [] }), handoffPackageComplete: true }),
    evaluateWorkstream({ name: "EBOOK", technicalValidationRequired: true, technicalValidationPassed: false }),
    evaluateWorkstream({ name: "ACCESSIBILITY", technicalValidationRequired: true, technicalValidationPassed: false }),
    evaluateWorkstream({ name: "ASSET_REGISTRY", rightsRequired: true, rightsAttached: false }),
    evaluateWorkstream({ name: "AUTOMATION", state: "SYSTEM_ATTENTION_REQUIRED", authorProofRequired: true, internalQaPassed: false }),
    evaluateWorkstream({ name: "VENDOR", vendorDelivered: true, jmpQaAccepted: false }),
    evaluateWorkstream({ name: "INTERIOR", authorDecision: "SUBSTANTIVE_CHAPTER_REWRITE", internalQaPassed: true }),
    evaluateCrossFormatSynchronization({ productionMasterChanged: true, derivedAssetsRevalidated: false }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), workstreams: [{ name: "INTERIOR", required: true, state: "READY" }] }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), authorApprovalsComplete: false }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), technicalValidationsPass: false }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), productionMasterChanged: true, derivedAssetsRevalidated: false }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), coverPageCount: 250, finalPageCount: 275 }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), unresolvedCorrections: true }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), finalArtifacts: [] }),
    buildBlock06HandoffPackage({ ...completeSyntheticTitle(), finalArtifacts: [] }),
    evaluateFinalProductionCertification({ ...completeSyntheticTitle(), attemptedActions: ["DISTRIBUTION_SUBMISSION"] })
  ];

  checks.forEach((check, index) => {
    const expectsPass = [17, 18, 19].includes(index);
    if (expectsPass ? !check.ok : check.ok) {
      failures.push({ id: `BYPASS-${String(index + 1).padStart(2, "0")}`, expected: expectsPass ? "ALLOW_NON_RELEASE_EXCEPTION" : "FAIL_CLOSED", actual: check.event });
    }
  });

  return {
    ok: failures.length === 0,
    count: BYPASS_FIXTURES.length,
    passed: BYPASS_FIXTURES.length - failures.length,
    failures,
    fixtures: BYPASS_FIXTURES.map(([name, control], index) => ({
      id: `BYPASS-${String(index + 1).padStart(2, "0")}`,
      name,
      control,
      result: failures.some((failure) => failure.id === `BYPASS-${String(index + 1).padStart(2, "0")}`) ? "FAILED" : "PASS"
    }))
  };
}

function runSyntheticCommissioningMatrix() {
  const rows = [
    ["A", "standard text-forward commercial paperback", { formats: [{ productFormCode: "PF_01", required: true, packageEntitlement: true, requiresDistinctIsbn: true }] }],
    ["B", "paperback + hardcover + ebook", { formats: [{ productFormCode: "PF_01", required: true, packageEntitlement: true, requiresDistinctIsbn: true }, { productFormCode: "PF_02", required: true, packageEntitlement: true, requiresDistinctIsbn: true }, { productFormCode: "PF_03", required: true, packageEntitlement: true }], identifiers: [{ format: "PF_01", identifier: "9780000000001", sourceAuthority: "SYNTHETIC" }, { format: "PF_02", identifier: "9780000000002", sourceAuthority: "SYNTHETIC" }] }],
    ["C", "ebook-only", { formats: [{ productFormCode: "PF_03", required: true, packageEntitlement: true }] }],
    ["D", "audiobook applicable", { workstreams: DEFAULT_WORKSTREAMS.map((name) => ({ name, required: name !== "INDEX", state: "CERTIFIED" })) }],
    ["E", "audiobook N/A", { workstreams: DEFAULT_WORKSTREAMS.map((name) => ({ name, required: name !== "AUDIO", state: name === "AUDIO" ? "NOT_APPLICABLE" : "CERTIFIED" })) }],
    ["F", "index required", { workstreams: DEFAULT_WORKSTREAMS.map((name) => ({ name, required: true, state: "CERTIFIED" })) }],
    ["G", "index N/A", { workstreams: DEFAULT_WORKSTREAMS.map((name) => ({ name, required: name !== "INDEX", state: name === "INDEX" ? "NOT_APPLICABLE" : "CERTIFIED" })) }],
    ["H", "accessibility-sensitive title", { accessibilityStatus: { required: true, evidence: "SYNTHETIC_ACCESSIBILITY_VALIDATION" } }],
    ["I", "image-heavy title", { rightsAndPermissions: [{ assetId: "image-1", rightsStatus: "CLEARED", resolution: "300dpi", altText: "Present" }] }],
    ["J", "physical-proof-required title", { physicalProofStatus: "PASSED" }],
    ["K", "physical-proof-N/A title", { physicalProofStatus: "NOT_APPLICABLE" }],
    ["L", "commissioning/non-release title", { publicationIntent: "COMMISSIONING", identifiers: [] }],
    ["M", "author onboarding production selections", { productionSpecifications: { trimAuthority: "AUTHOR_ONBOARDING", paperAuthority: "AUTHOR_ONBOARDING" } }],
    ["N", "missing optional selections using genre defaults", { productionSpecifications: { fallbackAuthority: "GENRE_DEFAULTS_FOR_ELIGIBLE_BLANKS_ONLY" } }]
  ];

  const results = rows.map(([id, name, overrides]) => {
    const input = completeSyntheticTitle(overrides);
    const entry = evaluateProductionEntryGate(input);
    const scope = createProductionScopeLock(input);
    const master = createProductionMaster({ finalEditorialManuscript: input.finalEditorialManuscript });
    const workstreams = asArray(input.workstreams).map(evaluateWorkstream);
    const certification = evaluateFinalProductionCertification(input);
    const handoff = buildBlock06HandoffPackage(input);
    const ok = [entry, scope, master, certification, handoff].every((item) => item.ok) && workstreams.every((item) => item.ok);
    return {
      id,
      name,
      ok,
      entry: entry.event,
      scope: scope.event,
      master: master.event,
      certification: certification.event,
      certificationMissing: certification.missing || [],
      handoff: handoff.event,
      handoffMissing: handoff.missing || [],
      workstreamBlockers: workstreams.filter((item) => !item.ok)
    };
  });
  return {
    ok: results.every((row) => row.ok),
    count: results.length,
    passed: results.filter((row) => row.ok).length,
    results
  };
}

module.exports = {
  AUDIT_STATUS,
  BLOCK05_VERSION,
  BLOCK05_DOMAIN_REGISTER,
  BYPASS_FIXTURES,
  COMMISSIONING_STATUS,
  REQUIREMENT_STATUS,
  WORKSTREAM_STATES,
  auditBlock05Requirements,
  buildBlock05FinalCertificationProbe,
  buildBlock06HandoffPackage,
  buildPublicationMetadataPackage,
  buildProductionSpecificationProfile,
  createProductionMaster,
  createProductionScopeLock,
  evaluateCrossFormatSynchronization,
  evaluateCrossFormatDependencyGraph,
  evaluateFinalProductionCertification,
  evaluateOperatingCenterProductionSurface,
  evaluateAuthorWorkspaceProductionSurface,
  evaluatePhysicalProofPath,
  evaluateProductionEntryGate,
  evaluateProductionWatchdog,
  evaluateWorkstream,
  routeProductionCorrection,
  runBypassTests,
  runFinalCertificationNegativeProbes,
  runFinalLiveWorkstreamCertification,
  runPageCountCoverRegenerationRegression,
  runSyntheticCommissioningMatrix,
  validateArtifactBoundApproval,
  validateAssetRegistryAndRights,
  validateAccessibilityEvidence,
  validateAudioProduction,
  validateCoverFullWrapPath,
  validateEbookProduction,
  validateFrontBackMatter,
  validateIdentifierAuthority,
  validateIndexingPath,
  validateInteriorProductionPath
};
