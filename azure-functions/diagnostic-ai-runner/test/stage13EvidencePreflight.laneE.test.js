"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CHANGE_EVENT,
  READY_EVENT,
  evaluateStage13Preflight,
  onCanonicalProductionEvidenceChanged,
  validIsbn13
} = require("../src/production/stage13EvidencePreflight");

const titleId = "11111111-1111-4111-8111-111111111111";
const authorId = "22222222-2222-4222-8222-222222222222";
const checksum = "a".repeat(64);

function record(format, evidenceId) {
  return { titleId, productFormCode: format, evidenceId, version: "v1", current: true };
}

function snapshot() {
  const formats = ["PF-01", "PF-03"];
  const roles = { "PF-01": ["PRINT_INTERIOR", "PAPERBACK_FULL_WRAP_COVER"], "PF-03": ["STANDARD_REFLOWABLE_EPUB_3", "EBOOK_COVER"] };
  return {
    titleId,
    authorId,
    stageId: "13_PRODUCTION",
    sourceRevision: "revision-9",
    sourceReadAt: "2026-10-01T16:00:00.000Z",
    entitlementsComplete: true,
    proofApproval: { titleId, evidenceId: "proof-1", version: "v1", current: true, status: "APPROVED" },
    entitlements: formats.map((format) => ({ ...record(format, `entitlement-${format}`), authorId, status: "AUTHORIZED", distributionAuthority: "PASS", qa: { ...record(format, `qa-${format}`), status: "PASS" } })),
    rights: formats.map((format) => ({ ...record(format, `rights-${format}`), authorId, status: "CLEARED", territories: "WORLD" })),
    identifiers: formats.map((format, index) => ({ ...record(format, `isbn-${format}`), authorId, isbn13: index ? "9781950719938" : "9781954414266", sourceAuthority: "BOWKER" })),
    retailMetadata: formats.map((format, index) => ({ ...record(format, `metadata-${format}`), authorId, status: "READY", title: "Example", authorByline: "Example Author", description: "Book description", language: "en", price: 19.99, currency: "USD", subjects: ["RELIGION"], isbn13: index ? "9781950719938" : "9781954414266" })),
    artifacts: formats.flatMap((format) => roles[format].map((role) => ({ ...record(format, `${format}-${role}`), authorId, role, checksum, repositoryPath: `/JM1-PUB/01_Pipeline_A-Z/Example/${role}`, qaStatus: "PASS", qaEvidenceId: `qa-${role}`, qaChecksum: checksum, approvalStatus: "APPROVED", approvalEvidenceId: `approval-${role}`, approvedChecksum: checksum })))
  };
}

test("binds both entitled formats to rights, ISBN, retail metadata, exact assets, and QA", () => {
  const result = evaluateStage13Preflight(snapshot());
  assert.equal(result.ready, true);
  assert.deepEqual(result.formatResults.map((item) => item.productFormCode), ["PF-01", "PF-03"]);
  assert.deepEqual(result.blockers, []);
});

test("fails closed when any format loses governed evidence", () => {
  const input = snapshot();
  input.rights[1].status = "PENDING";
  input.artifacts.find((item) => item.role === "STANDARD_REFLOWABLE_EPUB_3").qaStatus = "FAIL";
  input.retailMetadata[1].subjects = [];
  const result = evaluateStage13Preflight(input);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("PF-03:RIGHTS_AUTHORITY"));
  assert.ok(result.blockers.includes("PF-03:ARTIFACT_STANDARD_REFLOWABLE_EPUB_3"));
  assert.ok(result.blockers.includes("PF-03:RETAIL_METADATA"));
  assert.equal(result.formatResults[0].ready, true);
});

test("does not infer entitlement completeness or allow unknown product contracts", () => {
  const input = snapshot();
  input.entitlementsComplete = false;
  input.entitlements.push({ ...record("PF-04", "audio-entitlement"), authorId, status: "AUTHORIZED", distributionAuthority: "PASS" });
  const result = evaluateStage13Preflight(input);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("ENTITLEMENTS_NOT_CERTIFIED_COMPLETE"));
  assert.ok(result.blockers.includes("PF-04:FORMAT_PRODUCTION_CONTRACT_NOT_IMPLEMENTED"));
});

test("rejects invalid and reused ISBNs", () => {
  assert.equal(validIsbn13("9781954414266"), true);
  assert.equal(validIsbn13("9781954414267"), false);
  const input = snapshot();
  input.identifiers[1].isbn13 = input.identifiers[0].isbn13;
  assert.ok(evaluateStage13Preflight(input).blockers.includes("PF-03:CROSS_FORMAT_ISBN_REUSE"));
});

test("requires exact QA and approval checksum and canonical workspace", () => {
  const input = snapshot();
  const artifact = input.artifacts.find((item) => item.role === "PRINT_INTERIOR");
  artifact.qaChecksum = "b".repeat(64);
  artifact.repositoryPath = "/JM1-PUB/07_Archive/Example/interior.pdf";
  assert.ok(evaluateStage13Preflight(input).blockers.includes("PF-01:ARTIFACT_PRINT_INTERIOR"));
  artifact.qaChecksum = checksum;
  artifact.repositoryPath = "/JM1-PUB/01_Pipeline_A-Z/Example/interior.pdf";
  artifact.approvedChecksum = "b".repeat(64);
  assert.ok(evaluateStage13Preflight(input).blockers.includes("PF-01:ARTIFACT_PRINT_INTERIOR"));
});

test("automatic evidence-change path publishes once through an atomic adapter", async () => {
  const input = snapshot();
  const published = new Map();
  const adapters = {
    loadSnapshot: async () => input,
    publishIfAbsent: async (event) => {
      if (published.has(event.idempotencyKey)) return { duplicate: true };
      published.set(event.idempotencyKey, event);
      return { persisted: true };
    }
  };
  const event = { eventType: CHANGE_EVENT, titleId, sourceRevision: input.sourceRevision };
  const first = await onCanonicalProductionEvidenceChanged(event, adapters);
  const second = await onCanonicalProductionEvidenceChanged(event, adapters);
  assert.equal(first.status, "READY_EVENT_PUBLISHED");
  assert.equal(first.readinessEvent.eventType, READY_EVENT);
  assert.equal(second.status, "ALREADY_PUBLISHED");
  assert.equal(published.size, 1);
});

test("stale, cross-title, blocked, and non-durable events cannot trigger readiness", async () => {
  const input = snapshot();
  let calls = 0;
  const adapters = { loadSnapshot: async () => input, publishIfAbsent: async () => { calls += 1; return { persisted: true }; } };
  const event = { eventType: CHANGE_EVENT, titleId, sourceRevision: "older-revision" };
  assert.equal((await onCanonicalProductionEvidenceChanged(event, adapters)).status, "STALE_OR_CROSS_TITLE_EVENT");
  input.rights[0].status = "PENDING";
  assert.equal((await onCanonicalProductionEvidenceChanged({ ...event, sourceRevision: input.sourceRevision }, adapters)).status, "PREFLIGHT_BLOCKED");
  assert.equal(calls, 0);
  input.rights[0].status = "CLEARED";
  await assert.rejects(() => onCanonicalProductionEvidenceChanged({ ...event, sourceRevision: input.sourceRevision }, { ...adapters, publishIfAbsent: async () => ({}) }), /NOT_DURABLE/);
});
