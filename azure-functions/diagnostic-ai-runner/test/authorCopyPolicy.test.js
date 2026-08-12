"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  AUTHOR_COPY_POLICY,
  PRODUCT_FORM_DELIVERY_CLASS,
  computeComplimentaryEntitlements,
  getComplimentaryAllocation
} = require("../src/agreement/authorCopyPolicy");

function labels(result) {
  return result.entitlements.map((entitlement) => entitlement.label);
}

describe("AUTHOR_COPY_POLICY — elected Product Form entitlement rule", () => {
  test("Starter — PF-01 + PF-03 returns 5 paperback and 1 ebook", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-01", "PF-03"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 5 copies", "Standard Ebook: 1 digital entitlement"]);
  });

  test("Starter — PF-01 + PF-05 returns 5 paperback and 5 large print", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-01", "PF-05"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 5 copies", "Large Print: 5 copies"]);
  });

  test("Starter — PF-05 + PF-03 returns 5 large print and 1 ebook", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-STARTER", ["PF-05", "PF-03"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Large Print: 5 copies", "Standard Ebook: 1 digital entitlement"]);
  });

  test("Professional — PF-01 + PF-02 + PF-04 returns 10 paperback, 10 hardcover, and 1 audio delivery", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-02", "PF-04"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 10 copies", "Hardcover: 10 copies", "Audiobook: 1 author delivery"]);
  });

  test("Professional — PF-01 + PF-05 + PF-03 returns 10 paperback, 10 large print, and 1 ebook", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 10 copies", "Large Print: 10 copies", "Standard Ebook: 1 digital entitlement"]);
  });

  test("Premier — PF-01 + PF-02 + PF-03 + PF-04 returns 15 paperback, 15 hardcover, 1 ebook, and 1 audio delivery", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", ["PF-01", "PF-02", "PF-03", "PF-04"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), [
      "Paperback: 15 copies",
      "Hardcover: 15 copies",
      "Standard Ebook: 1 digital entitlement",
      "Audiobook: 1 author delivery"
    ]);
  });

  test("JM Signature track — PF-01 + PF-05 + PF-03 returns 15 paperback, 15 large print, and 1 ebook", () => {
    const result = computeComplimentaryEntitlements("JM-SIGNATURE-TRACK", ["PF-01", "PF-05", "PF-03"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 15 copies", "Large Print: 15 copies", "Standard Ebook: 1 digital entitlement"]);
  });

  test("PF-07 elected fails closed with no entitlement", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-07"]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.entitlements, []);
    assert.ok(result.errors.includes("PRODUCT_FORM_INACTIVE_NO_ENTITLEMENT:PF-07"));
  });

  test("PF-08 elected with approved digital scope returns 1 digital entitlement", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", [{ productFormCode: "PF-08", scopeApproved: true }]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Interactive / Multimedia: 1 digital entitlement"]);
  });

  test("PF-08 not scope-approved returns no generated entitlement and the scope boundary", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PREMIER", ["PF-08"]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.entitlements, []);
    assert.ok(result.errors.includes("PF08_SCOPE_APPROVAL_REQUIRED:PF-08"));
  });

  test("unelected hardcover has zero hardcover entitlement", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-03"]);
    assert.equal(result.ok, true);
    assert.equal(result.entitlements.some((entitlement) => entitlement.productFormCode === "PF-02"), false);
  });

  test("later-added PF-05 receives entitlement only after approved add-on/election", () => {
    const held = computeComplimentaryEntitlements("JMP-PKG-STARTER", [{ productFormCode: "PF-05", addedLater: true }]);
    assert.equal(held.ok, false);
    assert.ok(held.errors.includes("LATER_ADDED_PRODUCT_FORM_ADD_ON_APPROVAL_REQUIRED:PF-05"));

    const approved = computeComplimentaryEntitlements("JMP-PKG-STARTER", [{ productFormCode: "PF-05", addedLater: true, addOnApproved: true }]);
    assert.equal(approved.ok, true);
    assert.deepEqual(labels(approved), ["Large Print: 5 copies"]);
  });

  test("duplicate Product Form election generates one entitlement only", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-01", "PF-03"]);
    assert.equal(result.ok, true);
    assert.deepEqual(labels(result), ["Paperback: 10 copies", "Standard Ebook: 1 digital entitlement"]);
  });

  test("empty Product Form election set fails closed", () => {
    const result = computeComplimentaryEntitlements("JMP-PKG-PRO", []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("ELECTED_PRODUCT_FORMS_REQUIRED"));
  });

  test("idempotent regeneration returns identical entitlement result with no duplicates", () => {
    const first = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
    const second = computeComplimentaryEntitlements("JMP-PKG-PRO", ["PF-01", "PF-05", "PF-03"]);
    assert.deepEqual(second, first);
  });
});

describe("AUTHOR_COPY_POLICY — authority identity", () => {
  test("keeps Premier package and JM Signature track identities distinct", () => {
    assert.notEqual(AUTHOR_COPY_POLICY["JMP-PKG-PREMIER"], AUTHOR_COPY_POLICY["JM-SIGNATURE-TRACK"]);
    assert.deepEqual(getComplimentaryAllocation("JMP-PKG-PREMIER"), getComplimentaryAllocation("JM-SIGNATURE-TRACK"));
  });

  test("publishes the governed Product Form delivery-class mapping", () => {
    assert.equal(PRODUCT_FORM_DELIVERY_CLASS["PF-07"].deliveryClass, "INACTIVE");
    assert.equal(PRODUCT_FORM_DELIVERY_CLASS["PF-08"].deliveryClass, "DIGITAL");
  });
});
