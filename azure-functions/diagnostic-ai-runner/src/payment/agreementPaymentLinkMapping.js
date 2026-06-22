"use strict";

/**
 * Pure Stripe payment-link mapping for the governed payment-link path.
 *
 * Reuses the ALREADY-confirmed package/Stripe data from
 * milestone6BusinessSourceLayer.js — never invents a product ID, price
 * ID, or amount. Computes the per-installment amount a payment plan
 * requires (e.g. 8 payments of $585.00 for JMP-PKG-PRO) from that
 * existing one-time base price plus the existing processing-fee rate,
 * and cross-validates it against the figures already captured on the
 * Opportunity (jm1_m6selectedinstallmentcount /
 * jm1_m6selectedpaymentamount / jm1_m6selectedpaymenttotal) — never
 * silently uses a different number than what was already confirmed.
 */

const {
  STRIPE_PACKAGE_MAPPINGS,
  PACKAGE_CODES,
  PAYMENT_OPTIONS,
  PROCESSING_FEE_RATE,
  GATES
} = require("../author/milestone6BusinessSourceLayer");

const GATE_NAME = GATES.authorPaymentLinkSend; // "JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED"

function resolvePaymentOptionConfig(paymentOptionCode) {
  return PAYMENT_OPTIONS.find((o) => o.code === paymentOptionCode) || null;
}

/**
 * Computes the Stripe payment-link amount required for a given package
 * + payment-option combination, using only the already-confirmed
 * one-time base price and the already-confirmed processing-fee rate.
 *
 * @param {{ packageCode: string, paymentOptionCode: string }} input
 * @returns {{
 *   ok: boolean, error: string|null,
 *   mapping: object|null, option: object|null,
 *   baseFeeUsd: number|null, totalUsd: number|null,
 *   perInstallmentUsd: number|null,
 *   perInstallmentCents: number|null, totalCents: number|null,
 *   feeApplied: boolean|null
 * }}
 */
function computeInstallmentStripeAmount(input = {}) {
  const packageCode = typeof input.packageCode === "string" ? input.packageCode.trim().toUpperCase() : "";
  const paymentOptionCode = typeof input.paymentOptionCode === "string" ? input.paymentOptionCode.trim().toUpperCase() : "";

  const mapping = STRIPE_PACKAGE_MAPPINGS[packageCode];
  if (!mapping) {
    return { ok: false, error: "STRIPE_MAPPING_NOT_FOUND", mapping: null, option: null, baseFeeUsd: null, totalUsd: null, perInstallmentUsd: null, perInstallmentCents: null, totalCents: null, feeApplied: null };
  }

  const option = resolvePaymentOptionConfig(paymentOptionCode);
  if (!option) {
    return { ok: false, error: "PAYMENT_OPTION_NOT_FOUND", mapping, option: null, baseFeeUsd: null, totalUsd: null, perInstallmentUsd: null, perInstallmentCents: null, totalCents: null, feeApplied: null };
  }

  const baseFeeUsd = Math.round(mapping.unitAmount) / 100;
  const feeApplied = option.payments > 1;
  const feeMultiplier = feeApplied ? 1 + PROCESSING_FEE_RATE : 1;
  const totalUsd = Math.round(baseFeeUsd * feeMultiplier * 100) / 100;
  const perInstallmentUsd = Math.round((totalUsd / option.payments) * 100) / 100;

  return {
    ok: true,
    error: null,
    mapping,
    option,
    baseFeeUsd,
    totalUsd,
    perInstallmentUsd,
    perInstallmentCents: Math.round(perInstallmentUsd * 100),
    totalCents: Math.round(totalUsd * 100),
    feeApplied
  };
}

/**
 * Cross-validates a computed mapping against figures already confirmed
 * elsewhere (e.g. on the Opportunity) — returns ok:false rather than
 * silently proceeding on a mismatch.
 *
 * @param {object} computed — output of computeInstallmentStripeAmount
 * @param {{ installments: number, perInstallmentUsd: number, totalUsd: number }} confirmed
 * @returns {{ ok: boolean, mismatches: string[] }}
 */
function crossValidateAgainstConfirmedFigures(computed, confirmed = {}) {
  if (!computed || !computed.ok) return { ok: false, mismatches: ["COMPUTATION_FAILED"] };

  const mismatches = [];
  if (computed.option.payments !== confirmed.installments) mismatches.push("INSTALLMENT_COUNT_MISMATCH");
  if (computed.perInstallmentUsd !== confirmed.perInstallmentUsd) mismatches.push("PER_INSTALLMENT_AMOUNT_MISMATCH");
  if (computed.totalUsd !== confirmed.totalUsd) mismatches.push("TOTAL_AMOUNT_MISMATCH");

  return { ok: mismatches.length === 0, mismatches };
}

module.exports = {
  computeInstallmentStripeAmount,
  crossValidateAgainstConfirmedFigures,
  resolvePaymentOptionConfig,
  GATE_NAME,
  PACKAGE_CODES
};
