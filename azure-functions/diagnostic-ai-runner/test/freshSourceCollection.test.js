"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { bindSourceCollection } = require("../src/lifecycle/freshSourceCollection");
const part = itemId => ({ driveId: "drive", itemId, eTag: "v1", bytes: 100,
  path: `/01_Pipeline_A-Z/02 - Intake/Title/_ORIGINAL/${itemId}.docx`, sha256: "a".repeat(64) });

test("collection custody is stable without granting substantive order authority", () => {
  const first = bindSourceCollection([part("b"), part("a")]);
  assert.deepEqual(first, bindSourceCollection([part("a"), part("b")]));
  assert.equal(first.contentOrderAuthority, "UNRESOLVED");
  assert.equal(first.concatenationAuthorized, false);
  assert.equal(first.editorialExecutionAuthorized, false);
});

test("duplicate identity, traversal, non-original and changed versions fail safely", () => {
  for (const invalid of [part("a"), { ...part("b"), path: "/01_Pipeline_A-Z/Title/current.docx" },
    { ...part("b"), path: "/01_Pipeline_A-Z/Title/_ORIGINAL/../b.docx" }]) {
    assert.throws(() => bindSourceCollection([part("a"), invalid]), /FRESH_SOURCE_COLLECTION_INVALID/);
  }
  const before = bindSourceCollection([part("a"), part("b")]);
  const after = bindSourceCollection([part("a"), { ...part("b"), eTag: "v2" }]);
  assert.notEqual(before.custodyHash, after.custodyHash);
});
