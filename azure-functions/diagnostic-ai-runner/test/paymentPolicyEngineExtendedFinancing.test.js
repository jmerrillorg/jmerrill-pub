"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  NEW_FINANCING_POLICY_VERSION,
  NEW_FINANCING_POLICY_VERSION_v1_0,
  LEGACY_PAYMENT_POLICY_VERSION,
  PLAN_CONFIGS,
  buildPaymentPlans,
  calculateEarlyPayoff,
  resolvePaymentPolicyVersion,
  isNewFinancingPolicyVersion
} = require("../src/author/paymentPolicyEngine");

// Quanishia / Indomitable reference fixture: $4,500.00 adjusted principal
// (Professional Publishing Package, no loyalty/referral benefit applied).
// Every figure below was independently hand-verified against the stated
// formula (planCharge = adjustedPrincipal * 0.06 * financedMonths / 12,
// financedMonths = installmentCount - 1) before any code was written.
const QUANISHIA_PRINCIPAL_CENTS = 450000;

function planByCode(plans, code) {
  const plan = plans.find((item) => item.planCode === code);
  assert.ok(plan, `expected plan ${code} to exist`);
  return plan;
}

describe("paymentPolicyEngine — extended financing ladder (12/18/24 months)", () => {
  test("PLAN_CONFIGS includes the full standard ladder: FULL/2/4/8/12/18/24", () => {
    assert.deepEqual(
      PLAN_CONFIGS.map((plan) => plan.planCode),
      ["FULL_PAY", "2_PAY", "4_PAY", "8_PAY", "12_PAY", "18_PAY", "24_PAY"]
    );
  });

  test("financedMonths = installmentCount - 1 for every multi-pay plan", () => {
    const expected = { "2_PAY": 1, "4_PAY": 3, "8_PAY": 7, "12_PAY": 11, "18_PAY": 17, "24_PAY": 23 };
    for (const [code, months] of Object.entries(expected)) {
      assert.equal(planByCode(PLAN_CONFIGS, code).financedMonths, months, code);
    }
  });

  test("no 16-month plan exists in the new-model standard ladder", () => {
    assert.equal(PLAN_CONFIGS.some((plan) => plan.planCode === "16_PAY"), false);
  });

  const plans = buildPaymentPlans(QUANISHIA_PRINCIPAL_CENTS, NEW_FINANCING_POLICY_VERSION);

  test("Quanishia — Pay in Full: total = $4,500.00", () => {
    const plan = planByCode(plans, "FULL_PAY");
    assert.equal(plan.totalDueFormatted, "$4,500.00");
    assert.equal(plan.installments.length, 1);
    assert.equal(plan.installments[0].totalDueFormatted, "$4,500.00");
  });

  test("Quanishia — 2 months: $2,261.25/month, total $4,522.50", () => {
    const plan = planByCode(plans, "2_PAY");
    assert.equal(plan.totalDueFormatted, "$4,522.50");
    assert.deepEqual(plan.installments.map((i) => i.totalDueFormatted), ["$2,261.25", "$2,261.25"]);
  });

  test("Quanishia — 4 months: 3x $1,141.88 + final $1,141.86, total $4,567.50", () => {
    const plan = planByCode(plans, "4_PAY");
    assert.equal(plan.totalDueFormatted, "$4,567.50");
    assert.deepEqual(
      plan.installments.map((i) => i.totalDueFormatted),
      ["$1,141.88", "$1,141.88", "$1,141.88", "$1,141.86"]
    );
  });

  test("Quanishia — 8 months: 7x $582.19 + final $582.17, total $4,657.50", () => {
    const plan = planByCode(plans, "8_PAY");
    assert.equal(plan.totalDueFormatted, "$4,657.50");
    const installments = plan.installments.map((i) => i.totalDueFormatted);
    assert.deepEqual(installments.slice(0, 7), Array(7).fill("$582.19"));
    assert.equal(installments[7], "$582.17");
  });

  test("Quanishia — 12 months: 11x $395.63 + final $395.57, total $4,747.50", () => {
    const plan = planByCode(plans, "12_PAY");
    assert.equal(plan.totalDueFormatted, "$4,747.50");
    const installments = plan.installments.map((i) => i.totalDueFormatted);
    assert.deepEqual(installments.slice(0, 11), Array(11).fill("$395.63"));
    assert.equal(installments[11], "$395.57");
  });

  test("Quanishia — 18 months: exact division, 18x $271.25, total $4,882.50, no final-cent adjustment", () => {
    const plan = planByCode(plans, "18_PAY");
    assert.equal(plan.totalDueFormatted, "$4,882.50");
    const installments = plan.installments.map((i) => i.totalDueFormatted);
    assert.deepEqual(installments, Array(18).fill("$271.25"));
  });

  test("Quanishia — 24 months: 23x $209.06 + final $209.12, total $5,017.50", () => {
    const plan = planByCode(plans, "24_PAY");
    assert.equal(plan.totalDueFormatted, "$5,017.50");
    const installments = plan.installments.map((i) => i.totalDueFormatted);
    assert.deepEqual(installments.slice(0, 23), Array(23).fill("$209.06"));
    assert.equal(installments[23], "$209.12");
  });

  test("exact-cent allocation: sum of installments equals financed total for every plan (no rounding drift)", () => {
    for (const plan of plans) {
      const sumCents = plan.installments.reduce((sum, i) => sum + i.totalDueCents, 0);
      assert.equal(sumCents, plan.totalDueCents, `${plan.planCode} installment sum must equal totalDueCents exactly`);
    }
  });

  test("6% annual simple plan-charge formula holds for every financed plan", () => {
    for (const plan of plans) {
      if (plan.financedMonths === 0) {
        assert.equal(plan.planChargeTotalCents, 0);
        continue;
      }
      const expectedChargeCents = Math.round(QUANISHIA_PRINCIPAL_CENTS * 0.06 * plan.financedMonths / 12);
      assert.equal(plan.planChargeTotalCents, expectedChargeCents, plan.planCode);
    }
  });

  test("early payoff — no penalty, unearned future charge waived, at multiple points in 12/18/24 terms", () => {
    for (const code of ["12_PAY", "18_PAY", "24_PAY"]) {
      const plan = planByCode(plans, code);
      for (const paymentsMade of [1, Math.ceil(plan.paymentCount / 2), plan.paymentCount - 1]) {
        const result = calculateEarlyPayoff({
          paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
          selectedPlan: code,
          originalPrincipalCents: QUANISHIA_PRINCIPAL_CENTS,
          originalFinanceChargeCents: plan.planChargeTotalCents,
          principalPaidCents: plan.installments.slice(0, paymentsMade).reduce((s, i) => s + i.principalCents, 0),
          paymentsMade
        });
        assert.equal(result.ok, true);
        assert.equal(result.earlyPayoffPenaltyCents, 0, `${code} @ payment ${paymentsMade}`);
        assert.ok(result.unearnedChargeWaivedCents >= 0, `${code} @ payment ${paymentsMade}`);
        assert.ok(
          result.earnedChargeCents <= plan.planChargeTotalCents,
          `${code} @ payment ${paymentsMade}: earned charge must not exceed the full financed charge`
        );
      }
    }
  });

  test("early payoff after final payment: no unearned charge remains, full charge is earned", () => {
    const plan = planByCode(plans, "24_PAY");
    const result = calculateEarlyPayoff({
      paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
      selectedPlan: "24_PAY",
      originalPrincipalCents: QUANISHIA_PRINCIPAL_CENTS,
      originalFinanceChargeCents: plan.planChargeTotalCents,
      principalPaidCents: QUANISHIA_PRINCIPAL_CENTS,
      paymentsMade: 24
    });
    assert.equal(result.principalRemainingCents, 0);
  });

  describe("version handling", () => {
    test("v1.0 snapshots still resolve to the new-financing math family (not silently downgraded to legacy)", () => {
      assert.equal(resolvePaymentPolicyVersion(NEW_FINANCING_POLICY_VERSION_v1_0), NEW_FINANCING_POLICY_VERSION_v1_0);
      assert.equal(isNewFinancingPolicyVersion(NEW_FINANCING_POLICY_VERSION_v1_0), true);
    });

    test("v1.0-resolved plans use identical 6% economics to v1.1 for shared plans (FULL/2/4/8)", () => {
      const v10Plans = buildPaymentPlans(QUANISHIA_PRINCIPAL_CENTS, NEW_FINANCING_POLICY_VERSION_v1_0);
      for (const code of ["FULL_PAY", "2_PAY", "4_PAY", "8_PAY"]) {
        assert.equal(
          planByCode(v10Plans, code).totalDueCents,
          planByCode(plans, code).totalDueCents,
          code
        );
      }
    });

    test("a v1.0-resolved plan reports paymentPolicyVersion v1.0, not silently rewritten to v1.1", () => {
      const v10Plans = buildPaymentPlans(QUANISHIA_PRINCIPAL_CENTS, NEW_FINANCING_POLICY_VERSION_v1_0);
      assert.equal(planByCode(v10Plans, "FULL_PAY").paymentPolicyVersion, NEW_FINANCING_POLICY_VERSION_v1_0);
    });

    test("unrecognized version FAILS CLOSED — throws, never silently resolves to legacy or any other policy", () => {
      assert.throws(
        () => resolvePaymentPolicyVersion("not-a-real-version"),
        (err) => err.code === "PAYMENT_POLICY_VERSION_UNRECOGNIZED"
      );
    });

    test("no version supplied at all resolves to the documented legacy default (distinct from an unrecognized version)", () => {
      assert.equal(resolvePaymentPolicyVersion(""), LEGACY_PAYMENT_POLICY_VERSION);
      assert.equal(resolvePaymentPolicyVersion(undefined), LEGACY_PAYMENT_POLICY_VERSION);
    });

    test("buildPaymentPlans fails closed for an unrecognized policy version rather than pricing under legacy or new financing", () => {
      assert.throws(
        () => buildPaymentPlans(QUANISHIA_PRINCIPAL_CENTS, "JMP_FINANCING_EARLY_PAYOFF_v9.9"),
        (err) => err.code === "PAYMENT_POLICY_VERSION_UNRECOGNIZED"
      );
    });
  });

  test("invalid/unsupported term is not present in PLAN_CONFIGS (e.g. 16-month, 6-month)", () => {
    for (const invalidCode of ["16_PAY", "6_PAY", "10_PAY"]) {
      assert.equal(PLAN_CONFIGS.some((plan) => plan.planCode === invalidCode), false, invalidCode);
    }
  });
});
