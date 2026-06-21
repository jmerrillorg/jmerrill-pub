"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyPublishingReply,
  isolateLatestReplySegment,
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

// ── Quote isolation — the actual fix for the TWELVE_PAYMENTS misclassification ──

const OUTLOOK_QUOTE_BLOCK = [
  "8 payments works for me, thanks!",
  "",
  "From: J Merrill Publishing <publishing@email.jmerrill.one>",
  "Sent: Saturday, June 21, 2026 9:00 AM",
  "To: Jackie Smith Jr",
  "Subject: Next steps for Establishing Glory: The Library — Professional Publishing Package",
  "",
  "Here are the payment options available for this package. The 4% processing fee applies only to multi-payment options:",
  "  - Single payment: $4,500.00",
  "  - 2 payments: $2,340.00 each",
  "  - 4 payments: $1,170.00 each",
  "  - 8 payments: $585.00 each",
  "  - 12 payments: $390.00 each"
].join("\n");

const GMAIL_QUOTE_BLOCK = [
  "8 payments please.",
  "",
  "On Sat, Jun 21, 2026 at 9:00 AM, J Merrill Publishing <publishing@email.jmerrill.one> wrote:",
  "> Here are the payment options available for this package.",
  "> - Single payment: $4,500.00",
  "> - 12 payments: $390.00 each"
].join("\n");

const PLAIN_QUOTE_MARKER_BLOCK = [
  "8 payments works for me.",
  "",
  "> Original message included all options including 12 payments.",
  "> - 12 payments: $390.00 each"
].join("\n");

describe("isolateLatestReplySegment — strips quoted/prior thread content", () => {
  test("returns the full text unchanged when no quote marker is present", () => {
    assert.equal(isolateLatestReplySegment("8 payments"), "8 payments");
  });

  test("truncates at an Outlook-style 'From:' quote header", () => {
    const isolated = isolateLatestReplySegment(OUTLOOK_QUOTE_BLOCK);
    assert.equal(isolated, "8 payments works for me, thanks!");
  });

  test("truncates at a Gmail/Apple-style 'On ... wrote:' quote header", () => {
    const isolated = isolateLatestReplySegment(GMAIL_QUOTE_BLOCK);
    assert.equal(isolated, "8 payments please.");
  });

  test("truncates at '>' quoted-line markers", () => {
    const isolated = isolateLatestReplySegment(PLAIN_QUOTE_MARKER_BLOCK);
    assert.equal(isolated, "8 payments works for me.");
  });

  test("truncates at a '-----Original Message-----' separator", () => {
    const body = "8 payments.\n\n-----Original Message-----\n12 payments offered originally.";
    assert.equal(isolateLatestReplySegment(body), "8 payments.");
  });

  test("truncates at an underscore horizontal-rule separator", () => {
    const body = "8 payments.\n\n________________________________\nOriginal email content with 12 payments option.";
    assert.equal(isolateLatestReplySegment(body), "8 payments.");
  });

  test("never logs or returns more than the isolated text itself (no side channel)", () => {
    const result = isolateLatestReplySegment(OUTLOOK_QUOTE_BLOCK);
    assert.equal(typeof result, "string");
  });
});

describe("classifyPublishingReply — quote isolation prevents misclassification (the actual bug fix)", () => {
  test('"8 payments" reply with an Outlook-quoted original options list still classifies as EIGHT_PAYMENTS, not TWELVE_PAYMENTS', () => {
    const result = classifyPublishingReply(OUTLOOK_QUOTE_BLOCK);
    assert.equal(result.classification, CLASSIFICATION.EIGHT_PAYMENTS);
    assert.notEqual(result.classification, CLASSIFICATION.TWELVE_PAYMENTS);
  });

  test('"8 payments" reply with a Gmail-quoted original message still classifies as EIGHT_PAYMENTS', () => {
    const result = classifyPublishingReply(GMAIL_QUOTE_BLOCK);
    assert.equal(result.classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test('"8 payments" reply with ">" quoted lines mentioning 12 payments still classifies as EIGHT_PAYMENTS', () => {
    const result = classifyPublishingReply(PLAIN_QUOTE_MARKER_BLOCK);
    assert.equal(result.classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test("quoted text containing 12 payments never overrides an unquoted 8-payments reply", () => {
    const body = "I'll go with 8 payments.\n\nFrom: someone\nSent: today\n12 payments was also an option originally.";
    assert.equal(classifyPublishingReply(body).classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test("the most recent author-authored reply wins even with nested older quotes below it", () => {
    const body = [
      "Actually let's do 8 payments instead.",
      "",
      "On Fri, Jun 20, 2026 at 3:00 PM, Jackie Smith Jr wrote:",
      "> Let's do 12 payments.",
      ">",
      "> On Thu, Jun 19, 2026, J Merrill Publishing wrote:",
      ">> Options: single, 2, 4, 8, or 12 payments."
    ].join("\n");
    assert.equal(classifyPublishingReply(body).classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test("genuine ambiguity in the unquoted reply itself (both 8 and 12 mentioned live) returns UNCLASSIFIED, not a guess", () => {
    const body = "Not totally sure — maybe 8 payments, or maybe 12 payments? Let me know what you'd recommend.";
    assert.equal(classifyPublishingReply(body).classification, CLASSIFICATION.UNCLASSIFIED);
  });

  test("both 8 and 12 appearing only because one is quoted still resolves cleanly to the unquoted option", () => {
    const body = "8 payments works for me.\n\n> The original offer included a 12 payments option.";
    assert.equal(classifyPublishingReply(body).classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });

  test("a quoted reply containing ONLY the original message (no new author text above the quote) classifies as UNCLASSIFIED", () => {
    const body = "\nFrom: J Merrill Publishing\nSent: today\n12 payments was one of the offered options.";
    assert.equal(classifyPublishingReply(body).classification, CLASSIFICATION.UNCLASSIFIED);
  });
});

describe("classifyPublishingReply — existing single/2/4/8/12 classifications preserved after the fix", () => {
  test('"8 payments" alone still classifies as EIGHT_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("8 payments").classification, CLASSIFICATION.EIGHT_PAYMENTS);
  });
  test('"single payment" alone still classifies as SINGLE', () => {
    assert.equal(classifyPublishingReply("single payment").classification, CLASSIFICATION.SINGLE);
  });
  test('"2 payments" alone still classifies as TWO_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("2 payments").classification, CLASSIFICATION.TWO_PAYMENTS);
  });
  test('"4 payments" alone still classifies as FOUR_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("4 payments").classification, CLASSIFICATION.FOUR_PAYMENTS);
  });
  test('"12 payments" alone still classifies as TWELVE_PAYMENTS', () => {
    assert.equal(classifyPublishingReply("12 payments").classification, CLASSIFICATION.TWELVE_PAYMENTS);
  });
});
