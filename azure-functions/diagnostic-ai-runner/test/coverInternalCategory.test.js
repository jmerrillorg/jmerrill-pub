"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { deriveInternalCoverCategory } = require("../src/production/coverInternalCategory");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const now = "2026-10-01T12:00:00Z";
const manuscript = {
  titleId, sourceType: "CONTROLLING_MANUSCRIPT", sourceId: "interior-artifact-1",
  sourceVersion: "v1.2", sourceChecksum: "a".repeat(64), current: true, lastVerified: now,
  text: "This book is intended for spiritual encouragement and personal reflection. Scripture and Christ guide a life of faith."
};

test("derives an internal-only category with stable governed source lineage", () => {
  const result = deriveInternalCoverCategory(titleId, [manuscript], { now });
  assert.equal(result.ok, true);
  assert.equal(result.candidate.value, "Christian Living / Spiritual Growth");
  assert.equal(result.candidate.authorityClass, "SYSTEM_DERIVED_GOVERNED_INTERNAL");
  assert.deepEqual(result.candidate.sourceIds, ["interior-artifact-1"]);
  assert.deepEqual(result.candidate.sourceChecksums, ["a".repeat(64)]);
  assert.equal(result.candidate.confidence, 0.9);
  assert.equal(deriveInternalCoverCategory(titleId, [manuscript], { now }).candidate.sourceId, result.candidate.sourceId);
});

test("rejects unbound, unversioned, stale, or unsupported evidence", () => {
  for (const change of [
    { titleId: "6bd7e606-cb8d-4aab-a07b-0463536b9869" },
    { sourceChecksum: "invalid" },
    { sourceVersion: "" },
    { sourceType: "REFERENCE_COVER_BRIEF" },
    { lastVerified: "2026-09-30T12:00:00Z" }
  ]) {
    assert.equal(deriveInternalCoverCategory(titleId, [{ ...manuscript, ...change }], { now }).ok, false);
  }
  assert.equal(deriveInternalCoverCategory(titleId, [{ ...manuscript, text: "A novel about a journey." }], { now }).ok, false);
});
