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

  test("quoted original recommendation does not select both packages", () => {
    const result = classifyPackageReply([
      "Professional works for me.",
      "",
      "From: J Merrill Publishing",
      "Professional Publishing Package",
      "Starter Publishing Package"
    ].join("\n"));

    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.PROFESSIONAL);
    assert.equal(result.selectedPackage.code, "JMP-PKG-PRO");
  });

  test("ambiguous current reply fails closed", () => {
    const result = classifyPackageReply("I am deciding between Professional and Starter.");
    assert.equal(result.classification, PACKAGE_REPLY_CLASSIFICATION.UNCLASSIFIED);
    assert.equal(result.selectedPackage, null);
  });

  test("classifies call and question responses without selecting a package", () => {
    assert.equal(classifyPackageReply("Can we schedule a call?").classification, PACKAGE_REPLY_CLASSIFICATION.CALL_REQUESTED);
    assert.equal(classifyPackageReply("What happens next?").classification, PACKAGE_REPLY_CLASSIFICATION.QUESTION);
  });
});
