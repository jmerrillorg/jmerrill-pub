"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyPublishingReply,
  getPaymentOptionDetails,
  CLASSIFICATION
} = require("../src/mail/publishingReplyClassifier");

describe("classifyPublishingReply — payment-option selections", () => {
  test('"8 payments" classifies as EIGHT_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("I'd like to do 8 payments please.").classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test('"single payment" classifies as SINGLE', () => {
    assert.equal(classifyPublishingReply("Let's go with the single payment option.").classification, CLASSIFICATION.SINGLE);
  });

  test('"2 payments" classifies as TWO_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("I'll take 2 payments.").classification, CLASSIFICATION.TWO_PAYMENTS);
  });

  test('"4 payments" classifies as FOUR_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("4 payments works for me.").classification, CLASSIFICATION.FOUR_PAYMENTS);
  });

  test('"12 payments" classifies as TWELVE_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("Can I do 12 payments?").classification, CLASSIFICATION.TWELVE_PAYMENTS);
  });

  test('"eight payments" (spelled out) classifies as EIGHT_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("eight payments sounds good").classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test('"one payment" classifies as SINGLE', () => {
    assert.equal(classifyPublishingReply("one payment works").classification, CLASSIFICATION.SINGLE);
  });

  test('"pay in full" classifies as SINGLE', () => {
    assert.equal(classifyPublishingReply("I'd rather pay in full.").classification, CLASSIFICATION.SINGLE);
  });

  test("12 is not misclassified as 2 (word-boundary correctness)", () => {
    assert.equal(classifyPublishingReply("12 payments please").classification, CLASSIFICATION.TWELVE_PAYMENTS);
    assert.notEqual(classifyPublishingReply("12 payments please").classification, CLASSIFICATION.TWO_PAYMENTS);
  });
});

describe("classifyPublishingReply — call/question/hold", () => {
  test("call request classifies as CALL_REQUESTED", () => {
    assert.equal(classifyPublishingReply("Could we schedule a call to discuss this?").classification, CLASSIFICATION.CALL_REQUESTED);
  });

  test('"let\'s talk" classifies as CALL_REQUESTED', () => {
    assert.equal(classifyPublishingReply("Let's talk before I decide.").classification, CLASSIFICATION.CALL_REQUESTED);
  });

  test("a genuine question (no call/payment keywords) classifies as QUESTION", () => {
    assert.equal(classifyPublishingReply("What happens if I miss a payment deadline?").classification, CLASSIFICATION.QUESTION);
  });

  test("hold/pause language classifies as HOLD", () => {
    assert.equal(classifyPublishingReply("I need to hold off on this for now.").classification, CLASSIFICATION.HOLD);
  });

  test('"not ready" classifies as HOLD', () => {
    assert.equal(classifyPublishingReply("I'm not ready to decide yet.").classification, CLASSIFICATION.HOLD);
  });
});

describe("classifyPublishingReply — unclear / fallback", () => {
  test("an unclear reply with no recognizable signal classifies as UNCLASSIFIED", () => {
    assert.equal(classifyPublishingReply("Thanks for the info!").classification, CLASSIFICATION.UNCLASSIFIED);
  });

  test("empty string classifies as UNCLASSIFIED", () => {
    assert.equal(classifyPublishingReply("").classification, CLASSIFICATION.UNCLASSIFIED);
  });

  test("non-string input classifies as UNCLASSIFIED", () => {
    assert.equal(classifyPublishingReply(null).classification, CLASSIFICATION.UNCLASSIFIED);
    assert.equal(classifyPublishingReply(undefined).classification, CLASSIFICATION.UNCLASSIFIED);
  });
});

describe("classifyPublishingReply — precedence", () => {
  test("an explicit payment selection takes precedence over a question mark in the same message", () => {
    assert.equal(classifyPublishingReply("Can I do 8 payments?").classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });
});

describe("getPaymentOptionDetails — governed JMP-PKG-PRO amounts", () => {
  test("SINGLE has no processing fee", () => {
    const d = getPaymentOptionDetails(CLASSIFICATION.SINGLE);
    assert.equal(d.installments, 1);
    assert.equal(d.perInstallmentUsd, 4500.00);
    assert.equal(d.feeApplies, false);
  });

  test("EIGHT_PAYMENTS matches the approved amount and has the fee applied", () => {
    const d = getPaymentOptionDetails(CLASSIFICATION.EIGHT_PAYMENTS);
    assert.equal(d.installments, 8);
    assert.equal(d.perInstallmentUsd, 585.00);
    assert.equal(d.feeApplies, true);
  });

  test("TWO_PAYMENTS, FOUR_PAYMENTS, TWELVE_PAYMENTS all have the fee applied", () => {
    for (const c of [CLASSIFICATION.TWO_PAYMENTS, CLASSIFICATION.FOUR_PAYMENTS, CLASSIFICATION.TWELVE_PAYMENTS]) {
      assert.equal(getPaymentOptionDetails(c).feeApplies, true);
    }
  });

  test("non-payment-option classifications return null", () => {
    assert.equal(getPaymentOptionDetails(CLASSIFICATION.CALL_REQUESTED), null);
    assert.equal(getPaymentOptionDetails(CLASSIFICATION.QUESTION), null);
    assert.equal(getPaymentOptionDetails(CLASSIFICATION.HOLD), null);
    assert.equal(getPaymentOptionDetails(CLASSIFICATION.UNCLASSIFIED), null);
    assert.equal(getPaymentOptionDetails(null), null);
  });
});

describe("classifyPublishingReply — purity and safety", () => {
  test("does not mutate or echo back the input text in the result", () => {
    const sensitive = "8 payments — also here is my SSN 123-45-6789";
    const result = classifyPublishingReply(sensitive);
    assert.deepEqual(Object.keys(result), ["classification"]);
    assert.ok(!JSON.stringify(result).includes("SSN"));
    assert.ok(!JSON.stringify(result).includes("123-45-6789"));
  });
});
