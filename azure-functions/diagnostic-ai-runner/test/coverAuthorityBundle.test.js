"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { AUTHORITY, resolveCoverAuthorityBundle, projectCoverAuthority } = require("../src/production/coverAuthorityBundle");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const authorId = "d60b4f5c-f823-4a84-ae3e-115428cff204";
const now = "2026-09-30T12:00:00Z";
const values = {
  authorId, title: "Before You Were Born", subtitle: "Discovering God's Plan for Your Life",
  authorDisplay: "Sean Arron Crowley", genre: "Christian living", audience: "Adult Christian readers",
  bookDescription: "Governed internal summary", positioning: "Purpose and faith", titleThemes: ["purpose"],
  package: "STARTER", formatEntitlements: ["PAPERBACK", "EBOOK"], trimSize: "6 x 9", pageCount: 102,
  isbn: { paperback: "9781961475861", ebook: "9781961475878" }, imprint: "J Merrill Publishing",
  marketContext: "Christian living", preferences: [], titleRulings: ["No hardcover"],
  prohibitedVisuals: [], approvedBrandAssets: []
};

function records() {
  return Object.keys(AUTHORITY).map((field) => ({
    field, value: values[field], titleId, sourceType: AUTHORITY[field][0], sourceId: `source-${field}`,
    sourceVersion: "v1", authorityClass: "PUBLISHER_APPROVED", current: true, lastVerified: now,
    ...(["pageCount", "approvedBrandAssets"].includes(field) ? { sourceChecksum: "a".repeat(64) } : {})
  }));
}

test("field provenance produces a stable title-bound bundle", () => {
  const first = resolveCoverAuthorityBundle(titleId, records(), { now });
  assert.equal(first.ok, true);
  assert.equal(first.bundle.fields.pageCount.sourceType, "CURRENT_INTERIOR_PROOF");
  assert.equal(projectCoverAuthority(first.bundle).authorDisplay, "Sean Arron Crowley");
  const later = resolveCoverAuthorityBundle(titleId, records().map((record) => ({ ...record, lastVerified: "2026-09-30T12:05:00Z" })),
    { now: "2026-09-30T12:05:00Z" });
  assert.equal(first.bundle.sha256, later.bundle.sha256);
});

test("missing, stale, and cross-title source records fail before a brief", () => {
  assert.ok(resolveCoverAuthorityBundle(titleId, records().filter((record) => record.field !== "genre"), { now }).missing.includes("genre"));
  assert.ok(resolveCoverAuthorityBundle(titleId, records().map((record) =>
    record.field === "pageCount" ? { ...record, lastVerified: "2026-09-29T12:00:00Z" } : record), { now }).missing.includes("pageCount"));
  assert.ok(resolveCoverAuthorityBundle(titleId, records().map((record) =>
    record.field === "isbn" ? { ...record, titleId: authorId } : record), { now }).missing.includes("isbn"));
});

test("conflicting approved values and unapproved category fail closed", () => {
  const duplicate = { ...records().find((record) => record.field === "genre"), value: "Memoir", sourceId: "other-category" };
  assert.ok(resolveCoverAuthorityBundle(titleId, [...records(), duplicate], { now }).conflicts.includes("genre"));
  const derived = records().map((record) => record.field === "genre"
    ? { ...record, authorityClass: "SYSTEM_DERIVED_GOVERNED" } : record);
  assert.ok(resolveCoverAuthorityBundle(titleId, derived, { now }).missing.includes("genre"));
  const merelyCanonical = records().map((record) => record.field === "genre"
    ? { ...record, authorityClass: "CANONICAL_RECORD" } : record);
  assert.ok(resolveCoverAuthorityBundle(titleId, merelyCanonical, { now }).missing.includes("genre"));
});

test("provenance-backed internal category is usable only for internal concepts", () => {
  const category = {
    ...records().find((record) => record.field === "genre"),
    sourceType: "SYSTEM_DERIVED_INTERNAL_COVER_CATEGORY",
    authorityClass: "SYSTEM_DERIVED_GOVERNED_INTERNAL",
    sourceId: "derived-category-1",
    sourceVersion: "v1",
    sourceChecksum: "b".repeat(64),
    sourceIds: ["editorial-review-1"],
    sourceVersions: ["v2"],
    sourceChecksums: ["a".repeat(64)],
    derivationRule: "COVER_CATEGORY_RULE_1",
    confidence: 0.9
  };
  const inputs = records().filter((record) => record.field !== "genre").concat(category);
  const internal = resolveCoverAuthorityBundle(titleId, inputs, { now, executionMode: "INTERNAL_CONCEPT" });
  assert.equal(internal.ok, true);
  assert.equal(internal.bundle.fields.genre.authorityClass, "SYSTEM_DERIVED_GOVERNED_INTERNAL");
  assert.equal(internal.bundle.fields.genre.derivationRule, "COVER_CATEGORY_RULE_1");
  assert.deepEqual(internal.bundle.fields.genre.sourceIds, ["editorial-review-1"]);
  for (const executionMode of ["PROVIDER_SUBMISSION", "PUBLIC_METADATA"]) {
    const result = resolveCoverAuthorityBundle(titleId, inputs, { now, executionMode });
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes("genre"));
  }
  const incomplete = resolveCoverAuthorityBundle(titleId, inputs.map((record) => record === category
    ? { ...category, sourceChecksums: [] } : record), { now });
  assert.ok(incomplete.missing.includes("genre"));
});

test("print page count needs current artifact checksum and ISBN follows entitlements", () => {
  const missingChecksum = records().map((record) => record.field === "pageCount"
    ? { ...record, sourceChecksum: null } : record);
  assert.ok(resolveCoverAuthorityBundle(titleId, missingChecksum, { now }).missing.includes("pageCount"));
  const missingEbook = records().map((record) => record.field === "isbn"
    ? { ...record, value: { paperback: "9781961475861" } } : record);
  assert.equal(resolveCoverAuthorityBundle(titleId, missingEbook, { now }).code, "COVER_FORMAT_IDENTIFIER_CONFLICT");
  const invalidBrandAsset = records().map((record) => record.field === "approvedBrandAssets"
    ? { ...record, value: [{ id: "asset", sha256: "not-a-checksum" }] } : record);
  assert.ok(resolveCoverAuthorityBundle(titleId, invalidBrandAsset, { now }).missing.includes("approvedBrandAssets"));
});
