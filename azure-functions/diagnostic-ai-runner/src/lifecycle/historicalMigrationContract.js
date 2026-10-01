"use strict";

const { createHash } = require("node:crypto");

const STAGES = [
  "01_INQUIRY", "02_INTAKE", "03_EDITORIAL_REVIEW", "04_AUTHOR_DECISION",
  "05_AGREEMENT_PAYMENT", "06_ONBOARDING", "07_DEVELOPMENTAL_EDITING",
  "08_LINE_EDITING", "09_COPYEDITING", "10_PROOFREADING",
  "11_INTERIOR_LAYOUT", "12_COVER_DESIGN", "13_PRODUCTION",
  "14_DISTRIBUTION", "15_PUBLICATION", "16_POST_PUBLICATION"
];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

function deny(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function id(value) {
  return GUID.test(value || "") ? value.toLowerCase() : deny("HISTORICAL_MIGRATION_ID_INVALID");
}

function required(value, code) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || /[\r\n]/.test(value)) deny(code);
  return value;
}

function timestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) deny("HISTORICAL_MIGRATION_COMPLETION_TIME_INVALID");
  return value;
}

function buildHistoricalMigrationPlan(input) {
  if (!input || typeof input !== "object") deny("HISTORICAL_MIGRATION_INPUT_MISSING");
  const titleId = id(input.titleId);
  const authorId = id(input.authorId);
  const contactId = id(input.contactId);
  const binding = input.identityBinding;
  if (!binding || id(binding.titleId) !== titleId || id(binding.authorId) !== authorId ||
      id(binding.contactId) !== contactId ||
      !required(binding.sourceRecordId, "HISTORICAL_MIGRATION_IDENTITY_BINDING_MISSING")) {
    deny("HISTORICAL_MIGRATION_IDENTITY_BINDING_MISMATCH");
  }
  const currentStage = required(input.currentStage, "HISTORICAL_MIGRATION_STAGE_MISSING");
  const currentIndex = STAGES.indexOf(currentStage);
  if (currentIndex < 0) deny("HISTORICAL_MIGRATION_STAGE_UNKNOWN");
  const packageCode = required(input.packageCode, "HISTORICAL_MIGRATION_PACKAGE_MISSING");
  const formats = input.formatEntitlements;
  if (!Array.isArray(formats) || formats.length === 0 ||
      formats.some((format) => !["PAPERBACK", "EBOOK", "HARDCOVER"].includes(format)) ||
      new Set(formats).size !== formats.length) deny("HISTORICAL_MIGRATION_FORMATS_INVALID");
  const workspace = input.workspace;
  if (!workspace || !required(workspace.siteId, "HISTORICAL_MIGRATION_WORKSPACE_INVALID") ||
      !required(workspace.driveId, "HISTORICAL_MIGRATION_WORKSPACE_INVALID") ||
      !required(workspace.itemId, "HISTORICAL_MIGRATION_WORKSPACE_INVALID") ||
      !required(workspace.path, "HISTORICAL_MIGRATION_WORKSPACE_INVALID").includes("/01_Pipeline_A-Z/")) {
    deny("HISTORICAL_MIGRATION_WORKSPACE_INVALID");
  }
  if (!["SIGNED", "PARALLEL_PENDING"].includes(input.agreementStatus) ||
      !["VERIFIED", "HELD_AUTHORITY"].includes(input.commercialStatus)) {
    deny("HISTORICAL_MIGRATION_COMMERCIAL_AUTHORITY_INVALID");
  }
  if (!Array.isArray(input.historicalStageEvidence)) deny("HISTORICAL_MIGRATION_EVIDENCE_MISSING");
  const seen = new Set();
  const records = input.historicalStageEvidence.map((evidence) => {
    const stageCode = required(evidence?.stageCode, "HISTORICAL_MIGRATION_EVIDENCE_STAGE_INVALID");
    const index = STAGES.indexOf(stageCode);
    if (index < 0 || index >= currentIndex || seen.has(stageCode)) {
      deny("HISTORICAL_MIGRATION_EVIDENCE_STAGE_INVALID");
    }
    seen.add(stageCode);
    if (evidence.titleId && id(evidence.titleId) !== titleId) deny("HISTORICAL_MIGRATION_EVIDENCE_TITLE_MISMATCH");
    if (evidence.authorId && id(evidence.authorId) !== authorId) deny("HISTORICAL_MIGRATION_EVIDENCE_AUTHOR_MISMATCH");
    const sourceSystem = required(evidence.sourceSystem, "HISTORICAL_MIGRATION_EVIDENCE_SOURCE_INVALID");
    const sourceRecordId = required(evidence.sourceRecordId, "HISTORICAL_MIGRATION_EVIDENCE_SOURCE_INVALID");
    const sourceArtifactId = evidence.sourceArtifactId ?
      required(evidence.sourceArtifactId, "HISTORICAL_MIGRATION_EVIDENCE_SOURCE_INVALID") : null;
    if (evidence.sourceChecksum && !SHA256.test(evidence.sourceChecksum)) {
      deny("HISTORICAL_MIGRATION_EVIDENCE_CHECKSUM_INVALID");
    }
    return {
      recordType: "MIGRATED_HISTORICAL_STAGE_EVIDENCE",
      stageCode, sourceSystem, sourceRecordId, sourceArtifactId,
      sourceChecksum: evidence.sourceChecksum?.toLowerCase() || null,
      authorApprovalEvidence: evidence.authorApprovalEvidence || null,
      completedAt: timestamp(evidence.completedAt)
    };
  }).sort((a, b) => STAGES.indexOf(a.stageCode) - STAGES.indexOf(b.stageCode));
  const migrationKey = createHash("sha256").update(JSON.stringify({
    titleId, authorId, contactId, identitySourceRecordId: binding.sourceRecordId,
    packageCode, formats: [...formats].sort(), currentStage,
    workspace: { siteId: workspace.siteId, driveId: workspace.driveId,
      itemId: workspace.itemId, path: workspace.path }, records
  })).digest("hex");
  return {
    schemaVersion: 1, migrationKey, titleId, authorId, contactId,
    identitySourceRecordId: binding.sourceRecordId, packageCode,
    formatEntitlements: [...formats].sort(), currentStage,
    workspace: { siteId: workspace.siteId, driveId: workspace.driveId,
      itemId: workspace.itemId, path: workspace.path },
    agreementGate: input.agreementStatus, commercialStatus: input.commercialStatus,
    historicalEvidenceRecords: records,
    syntheticStageEvents: []
  };
}

module.exports = { buildHistoricalMigrationPlan };
