"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeInstallmentStripeAmount,
  crossValidateAgainstConfirmedFigures,
  resolvePaymentOptionConfig,
  GATE_NAME,
  PACKAGE_CODES
} = require("../src/payment/agreementPaymentLinkMapping");

describe("GATE_NAME — reuses the existing dedicated gate", () => {
  test("matches JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED", () => {
    assert.equal(GATE_NAME, "JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED");
  });
});

describe("computeInstallmentStripeAmount — JMP-PKG-PRO / EIGHT_PAYMENTS (the controlled record)", () => {
  test("computes exactly $585.00 per installment x 8 = $4,680.00, using the already-confirmed mapping", () => {
    const result = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "EIGHT_PAYMENTS" });
    assert.equal(result.ok, true);
    assert.equal(result.mapping.priceId, "price_1TjyuZJCiOVFpgYur0FWmcj7");
    assert.equal(result.mapping.productId, "prod_UjRnnUiTQgHlrm");
    assert.equal(result.baseFeeUsd, 4500);
    assert.equal(result.totalUsd, 4680);
    assert.equal(result.perInstallmentUsd, 585);
    assert.equal(result.perInstallmentCents, 58500);
    assert.equal(result.totalCents, 468000);
    assert.equal(result.feeApplied, true);
  });

  test("is case-insensitive on package/payment-option codes", () => {
    const result = computeInstallmentStripeAmount({ packageCode: "jmp-pkg-pro", paymentOptionCode: "eight_payments" });
    assert.equal(result.ok, true);
    assert.equal(result.perInstallmentUsd, 585);
  });
});

describe("computeInstallmentStripeAmount — single payment carries no processing fee", () => {
  test("SINGLE_PAYMENT totals exactly the base package fee", () => {
    const result = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "SINGLE_PAYMENT" });
    assert.equal(result.feeApplied, false);
    assert.equal(result.totalUsd, 4500);
    assert.equal(result.perInstallmentUsd, 4500);
  });
});

describe("computeInstallmentStripeAmount — multi-payment options all carry the fee", () => {
  test("TWO/FOUR/TWELVE payments all apply the processing fee", () => {
    for (const code of ["TWO_PAYMENTS", "FOUR_PAYMENTS", "TWELVE_PAYMENTS"]) {
      const result = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: code });
      assert.equal(result.feeApplied, true);
      assert.equal(result.totalUsd, 4680);
    }
  });
});

describe("computeInstallmentStripeAmount — never invents a mapping for an unrecognized input", () => {
  test("rejects an unrecognized package code", () => {
    const result = computeInstallmentStripeAmount({ packageCode: "NOT_REAL", paymentOptionCode: "EIGHT_PAYMENTS" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "STRIPE_MAPPING_NOT_FOUND");
  });

  test("rejects an unrecognized payment option code", () => {
    const result = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "NOT_REAL" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "PAYMENT_OPTION_NOT_FOUND");
  });
});

describe("computeInstallmentStripeAmount — all four packages resolve to their already-confirmed mapping", () => {
  test("STARTER, SIGNATURE, CHILD all resolve without modification", () => {
    for (const code of Object.values(PACKAGE_CODES)) {
      const result = computeInstallmentStripeAmount({ packageCode: code, paymentOptionCode: "SINGLE_PAYMENT" });
      assert.equal(result.ok, true, `${code} should resolve`);
      assert.ok(result.mapping.priceId.startsWith("price_"));
      assert.ok(result.mapping.productId.startsWith("prod_"));
    }
  });
});

describe("crossValidateAgainstConfirmedFigures", () => {
  test("passes when the computed figures match what was already confirmed", () => {
    const computed = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "EIGHT_PAYMENTS" });
    const result = crossValidateAgainstConfirmedFigures(computed, { installments: 8, perInstallmentUsd: 585.00, totalUsd: 4680.00 });
    assert.equal(result.ok, true);
    assert.deepEqual(result.mismatches, []);
  });

  test("fails when the confirmed installment count differs", () => {
    const computed = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "EIGHT_PAYMENTS" });
    const result = crossValidateAgainstConfirmedFigures(computed, { installments: 4, perInstallmentUsd: 585.00, totalUsd: 4680.00 });
    assert.equal(result.ok, false);
    assert.ok(result.mismatches.includes("INSTALLMENT_COUNT_MISMATCH"));
  });

  test("fails when the confirmed total differs", () => {
    const computed = computeInstallmentStripeAmount({ packageCode: "JMP-PKG-PRO", paymentOptionCode: "EIGHT_PAYMENTS" });
    const result = crossValidateAgainstConfirmedFigures(computed, { installments: 8, perInstallmentUsd: 585.00, totalUsd: 9999.00 });
    assert.equal(result.ok, false);
    assert.ok(result.mismatches.includes("TOTAL_AMOUNT_MISMATCH"));
  });

  test("fails closed when the computation itself failed", () => {
    const result = crossValidateAgainstConfirmedFigures({ ok: false }, { installments: 8 });
    assert.equal(result.ok, false);
    assert.deepEqual(result.mismatches, ["COMPUTATION_FAILED"]);
  });
});

describe("resolvePaymentOptionConfig", () => {
  test("EIGHT_PAYMENTS resolves to 8 payments", () => {
    assert.equal(resolvePaymentOptionConfig("EIGHT_PAYMENTS").payments, 8);
  });

  test("an unknown code resolves to null", () => {
    assert.equal(resolvePaymentOptionConfig("NOT_REAL"), null);
  });
});
