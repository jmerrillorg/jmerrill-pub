"use strict";

const LEGACY_PAYMENT_POLICY_VERSION = "JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0";
// v1.1: standard financing ladder extended to include 12/18/24-month
// extended-financing terms alongside the existing 2/4/8-month standard
// flexible plans. Economics (6% annual simple plan charge, no penalty,
// unearned future charge waived) are unchanged from v1.0 — this is an
// availability change, not an economic-rule change, so it is versioned
// rather than silently mutating v1.0's semantics in place.
const NEW_FINANCING_POLICY_VERSION = "JMP_FINANCING_EARLY_PAYOFF_v1.1";
const NEW_FINANCING_POLICY_VERSION_v1_0 = "JMP_FINANCING_EARLY_PAYOFF_v1.0";
const DEFAULT_PAYMENT_POLICY_VERSION = LEGACY_PAYMENT_POLICY_VERSION;
const LEGACY_TRANSACTION_FEE_RATE = 0.04;
const NEW_FINANCING_ANNUAL_SIMPLE_RATE = 0.06;

const PLAN_CONFIGS = Object.freeze([
  Object.freeze({ planCode: "FULL_PAY", paymentCount: 1, cadence: "single payment", financedMonths: 0 }),
  Object.freeze({ planCode: "2_PAY", paymentCount: 2, cadence: "monthly after first payment", financedMonths: 1 }),
  Object.freeze({ planCode: "4_PAY", paymentCount: 4, cadence: "monthly after first payment", financedMonths: 3 }),
  Object.freeze({ planCode: "8_PAY", paymentCount: 8, cadence: "monthly after first payment", financedMonths: 7 }),
  Object.freeze({ planCode: "12_PAY", paymentCount: 12, cadence: "monthly after first payment", financedMonths: 11 }),
  Object.freeze({ planCode: "18_PAY", paymentCount: 18, cadence: "monthly after first payment", financedMonths: 17 }),
  Object.freeze({ planCode: "24_PAY", paymentCount: 24, cadence: "monthly after first payment", financedMonths: 23 })
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function usdFromCents(cents) {
  return Math.round(cents) / 100;
}

function formatUsd(amountUsd) {
  return `$${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function allocateCents(totalCents, paymentCount) {
  if (paymentCount <= 0) return [];
  if (paymentCount === 1) return [totalCents];
  const nominal = Math.round(totalCents / paymentCount);
  const rows = Array.from({ length: paymentCount - 1 }, () => nominal);
  rows.push(totalCents - nominal * (paymentCount - 1));
  return rows;
}

// v1.0 snapshots/records already locked before the 12/18/24 availability
// change must keep resolving to the new-financing math family (same 6%
// simple-plan-charge economics as v1.1 — only plan *availability* changed,
// not the formula) rather than silently downgrading to legacy 4% because
// the exact version string no longer matches the current constant.
function isNewFinancingPolicyVersion(normalized) {
  return normalized === NEW_FINANCING_POLICY_VERSION || normalized === NEW_FINANCING_POLICY_VERSION_v1_0;
}

function resolvePaymentPolicyVersion(version) {
  const normalized = normalizeString(version);
  if (!normalized) return DEFAULT_PAYMENT_POLICY_VERSION;
  if (normalized === LEGACY_PAYMENT_POLICY_VERSION) return normalized;
  if (isNewFinancingPolicyVersion(normalized)) return normalized;
  return DEFAULT_PAYMENT_POLICY_VERSION;
}

function legacyChargeCents(principalCents, plan) {
  return plan.planCode === "FULL_PAY" ? 0 : Math.round(principalCents * LEGACY_TRANSACTION_FEE_RATE);
}

function newFinanceChargeTotalCents(adjustedPrincipalCents, plan) {
  if (plan.financedMonths <= 0) return 0;
  return Math.round(adjustedPrincipalCents * NEW_FINANCING_ANNUAL_SIMPLE_RATE * plan.financedMonths / 12);
}

function buildLegacyPlan(adjustedPrincipalCents, plan) {
  const principalRows = allocateCents(adjustedPrincipalCents, plan.paymentCount);
  const installments = principalRows.map((principalCents, index) => {
    const chargeCents = legacyChargeCents(principalCents, plan);
    const totalDueCents = principalCents + chargeCents;
    return Object.freeze({
      installmentNumber: index + 1,
      principalCents,
      principal: usdFromCents(principalCents),
      principalFormatted: formatUsd(usdFromCents(principalCents)),
      multiPayFeeCents: chargeCents,
      multiPayFee: usdFromCents(chargeCents),
      multiPayFeeFormatted: formatUsd(usdFromCents(chargeCents)),
      planChargeCents: chargeCents,
      planCharge: usdFromCents(chargeCents),
      planChargeFormatted: formatUsd(usdFromCents(chargeCents)),
      taxStatus: "EXTERNAL",
      taxCents: null,
      tax: null,
      totalDueCents,
      totalDue: usdFromCents(totalDueCents),
      totalDueFormatted: formatUsd(usdFromCents(totalDueCents))
    });
  });
  const chargeTotalCents = installments.reduce((sum, item) => sum + item.planChargeCents, 0);
  return Object.freeze({
    planCode: plan.planCode,
    paymentCount: plan.paymentCount,
    cadence: plan.cadence,
    financedMonths: plan.financedMonths,
    paymentPolicyVersion: LEGACY_PAYMENT_POLICY_VERSION,
    paymentPolicyKind: "LEGACY_4_PERCENT_TRANSACTION_FEE",
    authorFacingChargeLabel: plan.planCode === "FULL_PAY" ? "No multi-pay transaction fee" : "Multi-pay transaction fee",
    planChargeRate: plan.planCode === "FULL_PAY" ? 0 : LEGACY_TRANSACTION_FEE_RATE,
    multiPayFeePolicyVersion: LEGACY_PAYMENT_POLICY_VERSION,
    multiPayFeeRate: plan.planCode === "FULL_PAY" ? 0 : LEGACY_TRANSACTION_FEE_RATE,
    principalTotalCents: adjustedPrincipalCents,
    principalTotal: usdFromCents(adjustedPrincipalCents),
    principalTotalFormatted: formatUsd(usdFromCents(adjustedPrincipalCents)),
    planChargeTotalCents: chargeTotalCents,
    planChargeTotal: usdFromCents(chargeTotalCents),
    planChargeTotalFormatted: formatUsd(usdFromCents(chargeTotalCents)),
    financeChargeTotalCents: 0,
    financeChargeTotal: 0,
    financeChargeTotalFormatted: "$0.00",
    multiPayFeeTotalCents: chargeTotalCents,
    multiPayFeeTotal: usdFromCents(chargeTotalCents),
    multiPayFeeTotalFormatted: formatUsd(usdFromCents(chargeTotalCents)),
    earlyPayoff: Object.freeze({
      available: plan.planCode !== "FULL_PAY",
      noPenalty: true,
      unearnedFutureChargeWaived: true,
      formula: "remaining principal plus actual incurred fees/tax; future unincurred transaction fees are not collected"
    }),
    taxTreatment: "PENDING_EXTERNAL",
    totalDueCents: adjustedPrincipalCents + chargeTotalCents,
    totalDue: usdFromCents(adjustedPrincipalCents + chargeTotalCents),
    totalDueFormatted: formatUsd(usdFromCents(adjustedPrincipalCents + chargeTotalCents)),
    installments
  });
}

function buildNewFinancingPlan(adjustedPrincipalCents, plan, resolvedPolicyVersion) {
  const principalRows = allocateCents(adjustedPrincipalCents, plan.paymentCount);
  const financeChargeTotalCents = newFinanceChargeTotalCents(adjustedPrincipalCents, plan);
  const chargeRows = allocateCents(financeChargeTotalCents, plan.paymentCount);
  const installments = principalRows.map((principalCents, index) => {
    const chargeCents = chargeRows[index] || 0;
    const totalDueCents = principalCents + chargeCents;
    return Object.freeze({
      installmentNumber: index + 1,
      principalCents,
      principal: usdFromCents(principalCents),
      principalFormatted: formatUsd(usdFromCents(principalCents)),
      multiPayFeeCents: 0,
      multiPayFee: 0,
      multiPayFeeFormatted: "$0.00",
      planChargeCents: chargeCents,
      planCharge: usdFromCents(chargeCents),
      planChargeFormatted: formatUsd(usdFromCents(chargeCents)),
      financeChargeCents: chargeCents,
      financeCharge: usdFromCents(chargeCents),
      financeChargeFormatted: formatUsd(usdFromCents(chargeCents)),
      taxStatus: "EXTERNAL",
      taxCents: null,
      tax: null,
      totalDueCents,
      totalDue: usdFromCents(totalDueCents),
      totalDueFormatted: formatUsd(usdFromCents(totalDueCents))
    });
  });
  return Object.freeze({
    planCode: plan.planCode,
    paymentCount: plan.paymentCount,
    cadence: plan.cadence,
    financedMonths: plan.financedMonths,
    paymentPolicyVersion: resolvedPolicyVersion || NEW_FINANCING_POLICY_VERSION,
    paymentPolicyKind: "SIMPLE_PLAN_CHARGE_EARLY_PAYOFF",
    authorFacingChargeLabel: plan.planCode === "FULL_PAY" ? "No payment-plan charge" : "Payment-plan charge",
    planChargeRate: plan.planCode === "FULL_PAY" ? 0 : NEW_FINANCING_ANNUAL_SIMPLE_RATE,
    calculationMethod: "6% annual simple plan charge prorated by financed months; no compounding",
    multiPayFeePolicyVersion: NEW_FINANCING_POLICY_VERSION,
    multiPayFeeRate: 0,
    principalTotalCents: adjustedPrincipalCents,
    principalTotal: usdFromCents(adjustedPrincipalCents),
    principalTotalFormatted: formatUsd(usdFromCents(adjustedPrincipalCents)),
    planChargeTotalCents: financeChargeTotalCents,
    planChargeTotal: usdFromCents(financeChargeTotalCents),
    planChargeTotalFormatted: formatUsd(usdFromCents(financeChargeTotalCents)),
    financeChargeTotalCents,
    financeChargeTotal: usdFromCents(financeChargeTotalCents),
    financeChargeTotalFormatted: formatUsd(usdFromCents(financeChargeTotalCents)),
    multiPayFeeTotalCents: 0,
    multiPayFeeTotal: 0,
    multiPayFeeTotalFormatted: "$0.00",
    earlyPayoff: Object.freeze({
      available: plan.planCode !== "FULL_PAY",
      noPenalty: true,
      unearnedFutureChargeWaived: true,
      formula: "remaining principal plus earned payment-plan charge; unearned future payment-plan charge is waived"
    }),
    taxTreatment: "PENDING_EXTERNAL",
    totalDueCents: adjustedPrincipalCents + financeChargeTotalCents,
    totalDue: usdFromCents(adjustedPrincipalCents + financeChargeTotalCents),
    totalDueFormatted: formatUsd(usdFromCents(adjustedPrincipalCents + financeChargeTotalCents)),
    installments
  });
}

function buildPaymentPlans(adjustedPrincipalCents, paymentPolicyVersion) {
  const resolved = resolvePaymentPolicyVersion(paymentPolicyVersion);
  if (isNewFinancingPolicyVersion(resolved)) {
    return PLAN_CONFIGS.map((plan) => buildNewFinancingPlan(adjustedPrincipalCents, plan, resolved));
  }
  return PLAN_CONFIGS.map((plan) => buildLegacyPlan(adjustedPrincipalCents, plan));
}

function earnedPlanChargeCents({ originalFinanceChargeCents, selectedPlan, paymentsMade, payoffDate, elapsedFinancedMonths: elapsedFinancedMonthsInput }) {
  const plan = typeof selectedPlan === "string"
    ? PLAN_CONFIGS.find((item) => item.planCode === selectedPlan)
    : selectedPlan;
  const totalCharge = Math.max(0, Math.round(Number(originalFinanceChargeCents) || 0));
  const financedMonths = Math.max(0, Math.floor(Number(plan?.financedMonths) || 0));
  if (totalCharge === 0 || financedMonths === 0) return 0;

  const completedPayments = Math.max(0, Math.floor(Number(paymentsMade) || 0));
  let elapsedFinancedMonths = Math.max(0, Math.min(financedMonths, completedPayments - 1));
  if (inputHasFiniteNumber(elapsedFinancedMonthsInput)) {
    elapsedFinancedMonths = Math.max(0, Math.min(financedMonths, Number(elapsedFinancedMonthsInput)));
  }
  if (payoffDate && plan?.startDate) {
    const start = new Date(plan.startDate);
    const payoff = new Date(payoffDate);
    if (!Number.isNaN(start.valueOf()) && !Number.isNaN(payoff.valueOf())) {
      const months = (payoff.getUTCFullYear() - start.getUTCFullYear()) * 12 + (payoff.getUTCMonth() - start.getUTCMonth());
      elapsedFinancedMonths = Math.max(0, Math.min(financedMonths, months));
    }
  }
  return Math.round(totalCharge * elapsedFinancedMonths / financedMonths);
}

function inputHasFiniteNumber(value) {
  return value !== undefined && value !== null && Number.isFinite(Number(value));
}

function calculateEarlyPayoff(input = {}) {
  const paymentPolicyVersion = resolvePaymentPolicyVersion(input.paymentPolicyVersion);
  const selectedPlan = typeof input.selectedPlan === "string"
    ? PLAN_CONFIGS.find((item) => item.planCode === input.selectedPlan)
    : input.selectedPlan;
  const originalPrincipalCents = Math.max(0, Math.round(Number(input.originalPrincipalCents ?? input.originalPrincipal) || 0));
  const originalFinanceChargeCents = Math.max(0, Math.round(Number(input.originalFinanceChargeCents ?? input.originalFinanceCharge) || 0));
  const principalPaidCents = Math.max(0, Math.round(Number(input.principalPaidCents ?? input.principalPaid) || 0));
  const principalRemainingCents = Math.max(0, originalPrincipalCents - principalPaidCents);
  const earnedChargeCents = isNewFinancingPolicyVersion(paymentPolicyVersion)
    ? earnedPlanChargeCents({
      originalFinanceChargeCents,
      selectedPlan,
      paymentsMade: input.paymentsMade,
      payoffDate: input.payoffDate,
      elapsedFinancedMonths: input.elapsedFinancedMonths
    })
    : Math.max(0, Math.round(Number(input.financeChargeEarnedCents ?? input.financeChargeEarned) || 0));
  const unearnedChargeWaivedCents = Math.max(0, originalFinanceChargeCents - earnedChargeCents);
  const payoffAmountCents = principalRemainingCents + earnedChargeCents;
  return Object.freeze({
    ok: true,
    paymentPolicyVersion,
    selectedPlan: selectedPlan?.planCode || normalizeString(input.selectedPlan),
    principalRemainingCents,
    principalRemaining: usdFromCents(principalRemainingCents),
    principalRemainingFormatted: formatUsd(usdFromCents(principalRemainingCents)),
    earnedChargeCents,
    earnedCharge: usdFromCents(earnedChargeCents),
    earnedChargeFormatted: formatUsd(usdFromCents(earnedChargeCents)),
    unearnedChargeWaivedCents,
    unearnedChargeWaived: usdFromCents(unearnedChargeWaivedCents),
    unearnedChargeWaivedFormatted: formatUsd(usdFromCents(unearnedChargeWaivedCents)),
    earlyPayoffPenaltyCents: 0,
    earlyPayoffPenaltyFormatted: "$0.00",
    taxAdjustment: input.taxAdjustment || "PENDING_EXTERNAL",
    payoffAmountCents,
    payoffAmount: usdFromCents(payoffAmountCents),
    payoffAmountFormatted: formatUsd(usdFromCents(payoffAmountCents)),
    formula: "principalRemaining + earnedCharge - earlyPayoffPenalty(0); unearned future charge is waived"
  });
}

module.exports = {
  LEGACY_PAYMENT_POLICY_VERSION,
  NEW_FINANCING_POLICY_VERSION,
  NEW_FINANCING_POLICY_VERSION_v1_0,
  DEFAULT_PAYMENT_POLICY_VERSION,
  LEGACY_TRANSACTION_FEE_RATE,
  NEW_FINANCING_ANNUAL_SIMPLE_RATE,
  PLAN_CONFIGS,
  allocateCents,
  buildPaymentPlans,
  calculateEarlyPayoff,
  formatUsd,
  resolvePaymentPolicyVersion,
  isNewFinancingPolicyVersion
};
