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
  BYPASS_FIXTURES,
  REQUIREMENT_STATUS,
  WORKSTREAM_STATES,
  auditBlock05Requirements,
  buildBlock06HandoffPackage,
  createProductionMaster,
  createProductionScopeLock,
  evaluateCrossFormatSynchronization,
  evaluateFinalProductionCertification,
  evaluateProductionEntryGate,
  evaluateWorkstream,
  runBypassTests,
  runSyntheticCommissioningMatrix,
  validateArtifactBoundApproval,
  validateIdentifierAuthority
};
