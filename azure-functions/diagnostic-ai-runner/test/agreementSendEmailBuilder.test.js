"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildAgreementSendEmailContent } = require("../src/agreement/agreementSendEmailBuilder");

function baseInput(overrides = {}) {
  return {
    authorFirstName: "Jackie",
    title: "Establishing Glory: The Library",
    packageLabel: "Professional Publishing Package (JMP-PKG-PRO)",
    paymentSchedule: { installments: 8, perInstallmentUsd: 585.00, totalUsd: 4680.00 },
    ...overrides
  };
}

describe("buildAgreementSendEmailContent", () => {
  test("subject matches the suggested format", () => {
    const { subject } = buildAgreementSendEmailContent(baseInput());
    assert.equal(subject, "Agreement package for Establishing Glory: The Library");
  });

  test("mentions the Professional Package and the eight-payment option", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    assert.ok(bodyText.includes("Professional Publishing Package"));
    assert.ok(bodyText.includes("8 payments of $585.00 each"));
    assert.ok(bodyText.includes("$4,680.00"));
  });

  test("explains the package is for review and signature", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    assert.ok(bodyText.toLowerCase().includes("review and signature"));
  });

  test("lists all four documents", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    assert.ok(bodyText.includes("Publishing Agreement"));
    assert.ok(bodyText.includes("Publishing Package Addendum"));
    assert.ok(bodyText.includes("Audiobook Addendum"));
    assert.ok(bodyText.includes("Schedule A"));
  });

  test("clarifies production has not started and begins only after signature + first payment", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    const lower = bodyText.toLowerCase();
    assert.ok(lower.includes("production has not started"));
    assert.ok(lower.includes("signed") && lower.includes("first payment"));
  });

  test("never includes a payment link or any URL", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    assert.ok(!/https?:\/\//i.test(bodyText));
    assert.ok(!bodyText.toLowerCase().includes("stripe"));
    assert.ok(!bodyText.toLowerCase().includes("pay now"));
  });

  test("never includes editorial scoring, manuscript text, or AI output language", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput());
    const lower = bodyText.toLowerCase();
    assert.ok(!lower.includes("score"));
    assert.ok(!lower.includes("manuscript"));
    assert.ok(!lower.includes("risk flag"));
  });

  test("a single-payment plan describes one payment, not a per-installment list", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput({
      paymentSchedule: { installments: 1, perInstallmentUsd: 4500.00, totalUsd: 4500.00 }
    }));
    assert.ok(bodyText.includes("a single payment of $4,500.00"));
  });

  test("falls back to a generic greeting when no author first name is available", () => {
    const { bodyText } = buildAgreementSendEmailContent(baseInput({ authorFirstName: "" }));
    assert.ok(bodyText.startsWith("Hi there,"));
  });
});
