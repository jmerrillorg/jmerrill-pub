"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPaymentDisclosureContent } = require("../src/agreement/paymentDisclosureBuilder");

describe("buildPaymentDisclosureContent — the controlled record's 8-payment plan", () => {
  const content = buildPaymentDisclosureContent({ installments: 8, perInstallmentUsd: 585.00, totalUsd: 4680.00 });

  test("states 8 payments, $585.00 each, total $4,680.00", () => {
    assert.ok(content.lines[0].includes("8 payments"));
    assert.ok(content.lines[0].includes("$585.00"));
    assert.ok(content.lines[0].includes("$4,680.00"));
  });

  test("states payments are administered through Stripe", () => {
    assert.ok(content.lines.some((l) => l.includes("administered through Stripe")));
  });

  test("states the first payment establishes the start date and following payments recur on the same calendar day", () => {
    assert.ok(content.lines.some((l) => l.toLowerCase().includes("first payment establishes")));
    assert.ok(content.lines.some((l) => l.toLowerCase().includes("same calendar day")));
  });

  test("states production begins after agreement completion and first payment", () => {
    assert.ok(content.lines.some((l) => l.toLowerCase().includes("production begins") && l.toLowerCase().includes("agreement completion")));
  });

  test("states the release date is not locked until full payment is received", () => {
    assert.ok(content.lines.some((l) => l.toLowerCase().includes("release date is not locked")));
  });

  test("includes an acknowledgement text suitable for an initial field", () => {
    assert.ok(content.acknowledgementText.length > 0);
  });
});

describe("buildPaymentDisclosureContent — single payment", () => {
  test("describes one payment, not a per-installment list", () => {
    const content = buildPaymentDisclosureContent({ installments: 1, perInstallmentUsd: 4500.00, totalUsd: 4500.00 });
    assert.ok(content.lines[0].startsWith("One payment of $4,500.00"));
  });
});
