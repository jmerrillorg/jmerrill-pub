"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildHistoricalMigrationPlan } = require("../src/lifecycle/historicalMigrationContract");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const authorId = "11111111-1111-4111-8111-111111111111";
const contactId = "dfb397e7-3b7c-f111-ab0f-6045bdd69435";

function input() {
  return {
    titleId, authorId, contactId,
    identityBinding: { titleId, authorId, contactId, sourceRecordId: "author-profile-1" },
    packageCode: "STARTER", formatEntitlements: ["PAPERBACK", "EBOOK"],
    currentStage: "12_COVER_DESIGN",
    workspace: { siteId: "site-opaque", driveId: "drive-opaque", itemId: "item-opaque",
      path: "/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born" },
    agreementStatus: "PARALLEL_PENDING", commercialStatus: "HELD_AUTHORITY",
    historicalStageEvidence: [
      "01_INQUIRY", "02_INTAKE", "03_EDITORIAL_REVIEW", "04_AUTHOR_DECISION",
      "05_AGREEMENT_PAYMENT", "06_ONBOARDING", "07_DEVELOPMENTAL_EDITING",
      "08_LINE_EDITING", "09_COPYEDITING", "10_PROOFREADING", "11_INTERIOR_LAYOUT"
    ].map((stageCode, index) => ({ stageCode, titleId, authorId, sourceSystem: "SHAREPOINT",
        sourceRecordId: `drive-item-${index}`, sourceArtifactId: `artifact-${index}`,
        sourceChecksum: "a".repeat(64),
        status: stageCode === "05_AGREEMENT_PAYMENT" ? "PARALLEL_PENDING" : "COMPLETED",
        ...(stageCode === "05_AGREEMENT_PAYMENT" ? {} : { completedAt: "2026-09-15T00:00:00.000Z" }) }))
  };
}

test("plans historical evidence without inventing V2 stage execution", () => {
  const plan = buildHistoricalMigrationPlan(input());
  assert.equal(plan.currentStage, "12_COVER_DESIGN");
  assert.equal(plan.agreementGate, "PARALLEL_PENDING");
  assert.deepEqual(plan.stage13BlockedUntil,
    ["STAGE_12_COMPLETED", "AGREEMENT_SIGNED", "EXACT_PROOF_PREFLIGHT_PASS"]);
  assert.deepEqual(plan.syntheticStageEvents, []);
  assert.deepEqual(plan.historicalEvidenceRecords.map((record) => record.stageCode),
    ["01_INQUIRY", "02_INTAKE", "03_EDITORIAL_REVIEW", "04_AUTHOR_DECISION",
      "05_AGREEMENT_PAYMENT", "06_ONBOARDING", "07_DEVELOPMENTAL_EDITING",
      "08_LINE_EDITING", "09_COPYEDITING", "10_PROOFREADING", "11_INTERIOR_LAYOUT"]);
  assert.equal(plan.historicalEvidenceRecords[4].recordType, "MIGRATED_HISTORICAL_GATE");
  assert.equal(plan.historicalEvidenceRecords[4].completedAt, null);
  assert.ok(plan.historicalEvidenceRecords.filter((record) => record.stageCode !== "05_AGREEMENT_PAYMENT")
    .every((record) => record.recordType === "MIGRATED_HISTORICAL_STAGE_EVIDENCE"));
  assert.equal(buildHistoricalMigrationPlan(input()).migrationKey, plan.migrationKey);
});

test("rejects unsupported or duplicate historical stage claims", () => {
  const future = input();
  future.historicalStageEvidence[0].stageCode = "13_PRODUCTION";
  assert.throws(() => buildHistoricalMigrationPlan(future), /EVIDENCE_STAGE_INVALID/);
  const duplicate = input();
  duplicate.historicalStageEvidence[1].stageCode = "01_INQUIRY";
  assert.throws(() => buildHistoricalMigrationPlan(duplicate), /EVIDENCE_STAGE_INVALID/);
});

test("Stage 12 entry holds missing or unsupported prior-stage authority", () => {
  const missing = input();
  missing.historicalStageEvidence = missing.historicalStageEvidence.filter((record) =>
    record.stageCode !== "06_ONBOARDING");
  assert.throws(() => buildHistoricalMigrationPlan(missing), /PRIOR_STAGE_EVIDENCE_MISSING/);
  const unresolved = input();
  unresolved.historicalStageEvidence[6].status = "UNRESOLVED";
  assert.throws(() => buildHistoricalMigrationPlan(unresolved), /PRIOR_STAGE_STATUS_INVALID/);
  const unsigned = input();
  unsigned.historicalStageEvidence[4].status = "COMPLETED";
  unsigned.historicalStageEvidence[4].completedAt = "2026-09-15T00:00:00.000Z";
  assert.throws(() => buildHistoricalMigrationPlan(unsigned), /AGREEMENT_STAGE_MISMATCH/);
  const inventedCompletion = input();
  inventedCompletion.historicalStageEvidence[4].completedAt = "2026-09-15T00:00:00.000Z";
  assert.throws(() => buildHistoricalMigrationPlan(inventedCompletion), /PENDING_STAGE_COMPLETION_INVALID/);
});

test("rejects cross-title evidence and unbound identity", () => {
  const wrongTitle = input();
  wrongTitle.historicalStageEvidence[0].titleId = "22222222-2222-4222-8222-222222222222";
  assert.throws(() => buildHistoricalMigrationPlan(wrongTitle), /EVIDENCE_TITLE_MISMATCH/);
  const wrongContact = input();
  wrongContact.identityBinding.contactId = "22222222-2222-4222-8222-222222222222";
  assert.throws(() => buildHistoricalMigrationPlan(wrongContact), /IDENTITY_BINDING_MISMATCH/);
});

test("holds missing source, completion and workspace authority", () => {
  const missingSource = input();
  missingSource.historicalStageEvidence[0].sourceRecordId = "";
  assert.throws(() => buildHistoricalMigrationPlan(missingSource), /EVIDENCE_SOURCE_INVALID/);
  const badDate = input();
  badDate.historicalStageEvidence[0].completedAt = "2026-09-15";
  assert.throws(() => buildHistoricalMigrationPlan(badDate), /COMPLETION_TIME_INVALID/);
  const wrongWorkspace = input();
  wrongWorkspace.workspace.path = "/07_Archive/Before You Were Born";
  assert.throws(() => buildHistoricalMigrationPlan(wrongWorkspace), /WORKSPACE_INVALID/);
});
