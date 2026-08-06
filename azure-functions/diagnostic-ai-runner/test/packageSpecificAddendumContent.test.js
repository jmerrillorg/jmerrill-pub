"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPackageSpecificAddendumSections, EXCLUDED_PACKAGE_LABELS } = require("../src/agreement/packageSpecificAddendumContent");

describe("buildPackageSpecificAddendumSections — JMP-PKG-PRO", () => {
  test("returns the Professional package label, services, complimentary copies, and audiobook inclusion", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO", { electedProductForms: ["PF-01", "PF-02", "PF-03"] });
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Professional Publishing Package (JMP-PKG-PRO)");
    assert.ok(result.includedServices.length > 0);
    assert.deepEqual(result.complimentaryEntitlements.map((e) => e.label), [
      "Paperback: 10 copies",
      "Hardcover: 10 copies",
      "Standard Ebook: 1 digital entitlement"
    ]);
    assert.equal(result.audiobookIncluded, true);
  });

  test("excludes the Starter, Premier, and Children's package sections", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO", { electedProductForms: ["PF-01", "PF-02", "PF-03"] });
    for (const label of EXCLUDED_PACKAGE_LABELS) {
      assert.ok(result.excludedSections.includes(label));
    }
  });

  test("excludes unrelated add-on tables and empty unselected checkboxes", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PRO", { electedProductForms: ["PF-01", "PF-02", "PF-03"] });
    assert.ok(result.excludedSections.includes("unrelated add-on tables"));
    assert.ok(result.excludedSections.includes("empty unselected package checkboxes"));
  });

  test("is case-insensitive", () => {
    const result = buildPackageSpecificAddendumSections("jmp-pkg-pro", { electedProductForms: ["PF-01", "PF-02", "PF-03"] });
    assert.equal(result.ok, true);
  });
});

describe("buildPackageSpecificAddendumSections — undefined content", () => {
  test("returns Starter content with the governed complimentary-copy policy", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-STARTER", { electedProductForms: ["PF-01", "PF-03"] });
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Starter Publishing Package (JMP-PKG-STARTER)");
    assert.deepEqual(result.complimentaryEntitlements.map((e) => e.label), [
      "Paperback: 5 copies",
      "Standard Ebook: 1 digital entitlement"
    ]);
    assert.equal(result.audiobookIncluded, false);
  });

  test("returns Premier content for the restored third package", () => {
    const result = buildPackageSpecificAddendumSections("JMP-PKG-PREMIER", { electedProductForms: ["PF-01", "PF-02", "PF-03"] });
    assert.equal(result.ok, true);
    assert.equal(result.packageLabel, "Premier Publishing Package (JMP-PKG-PREMIER)");
    assert.ok(result.includedServices.some((service) => service.includes("large or complex manuscripts")));
    assert.deepEqual(result.complimentaryEntitlements.map((e) => e.label), [
      "Paperback: 15 copies",
      "Hardcover: 15 copies",
      "Standard Ebook: 1 digital entitlement"
    ]);
  });

  test("returns ok:false for an unrecognized package code", () => {
    const result = buildPackageSpecificAddendumSections("NOT_REAL");
    assert.equal(result.ok, false);
  });
});
