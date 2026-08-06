"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPackageSpecificAddendumSections, EXCLUDED_PACKAGE_LABELS } = require("../src/agreement/packageSpecificAddendumContent");

describe("buildPackageSpecificAddendumSections — JMP-PKG-PRO", () => {
  test("returns the Professional package label, services, complimentary copies, and audiobook inclusion", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO");
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Professional Publishing Package (JMP-PKG-PRO)");
    assert.ok(result.includedServices.length > 0);
    assert.deepEqual(result.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
    assert.equal(result.audiobookIncluded, true);
  });

  test("excludes the Starter, Premier, and Children's package sections", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO");
    for (const label of EXCLUDED_PACKAGE_LABELS) {
      assert.ok(result.excludedSections.includes(label));
    }
  });

  test("excludes unrelated add-on tables and empty unselected checkboxes", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO");
    assert.ok(result.excludedSections.includes("unrelated add-on tables"));
    assert.ok(result.excludedSections.includes("empty unselected package checkboxes"));
  });

  test("is case-insensitive", () => {
    const result = buildPackageSpecificAddendumSections("jmp-pkg-pro");
    assert.equal(result.ok, true);
  });
});

describe("buildPackageSpecificAddendumSections — undefined content", () => {
  test("returns Starter content with the governed complimentary-copy policy", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-STARTER");
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Starter Publishing Package (JMP-PKG-STARTER)");
    assert.deepEqual(result.complimentaryCopies, { paperback: 5, hardcover: 0, ebook: 1 });
    assert.equal(result.audiobookIncluded, false);
  });

  test("returns Premier content for the restored third package", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PREMIER");
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Premier Publishing Package (JMP-PKG-PREMIER)");
    assert.ok(result.includedServices.some((service) => service.includes("large or complex manuscripts")));
    assert.deepEqual(result.complimentaryCopies, { paperback: 15, hardcover: 5, ebook: 1 });
  });

  test("returns ok:false for an unrecognized package code", () => {
    const result = buildPackageSpecificAddendumSections("NOT_REAL");
    assert.equal(result.ok, false);
  });
});
