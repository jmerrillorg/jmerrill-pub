"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyPackageReply,
  PACKAGE_REPLY_CLASSIFICATION
} = require("../src/mail/publishingPackageReplyClassifier");

describe("classifyPackageReply", () => {
  test("classifies Professional package selection", () => {
    const result = classifyPackageReply("I would like to move forward with the Professional Publishing Package.");
    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL);
    assert.equal(result.selectedPackage.code, "JMP-PKG-PRO");
    assert.equal(result.selectedPackage.name, "Professional Publishing Package");
  });

  test("classifies Starter package selection", () => {
    const result = classifyPackageReply("Let's start with Starter.");
    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.STARTER);
    assert.equal(result.selectedPackage.code, "JMP-PKG-STARTER");
  });

  test("classifies Premier package selection", () => {
    const result = classifyPackageReply("Premier Publishing Package is the right fit for this project.");
    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.PREMIER);
    assert.equal(result.selectedPackage.code, "JMP-PKG-PREMIER");
    assert.equal(result.selectedPackage.name, "Premier Publishing Package");
    assert.equal(result.selectedPackage.price, "$7,500");
  });

  test("quoted original recommendation does not select multiple packages", () => {
    const result = classifyPackageReply([
      "Professional works for me.",
      "",
      "From: J Merrill Publishing",
      "Professional Publishing Package",
      "Premier Publishing Package",
      "Starter Publishing Package"
    ].join("\n"));

    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL);
    assert.equal(result.selectedPackage.code, "JMP-PKG-PRO");
  });

  test("ambiguous current reply fails closed", () => {
    const result = classifyPackageReply("I am deciding between Professional and Premier.");
    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.UNCLASSIFIED);
    assert.equal(result.selectedPackage, null);
  });

  test("classifies call and question responses without selecting a package", () => {
    assert.equal(classifyPackageReply("Can we schedule a call?").classification, PACKAGE_REPLY_CLASSIFICATION.CALL_REQUESTED);
    assert.equal(classifyPackageReply("What happens next?").classification, PACKAGE_REPLY_CLASSIFICATION.QUESTION);
  });
});
