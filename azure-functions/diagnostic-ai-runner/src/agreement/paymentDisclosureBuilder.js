"use strict";

/**
 * Builds the concise payment disclosure / Stripe payment summary that
 * replaces the manual Schedule A payment instrument. Pure — no I/O.
 *
 * This is a disclosure, not a manual instrument: it tells the author
 * how payments work (administered through Stripe) rather than
 * providing fields for the Publisher to fill in by hand.
 */

function formatUsd(amount) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * @param {{ installments: number, perInstallmentUsd: number, totalUsd: number }} paymentSchedule
 * @returns {{ title: string, lines: string[], acknowledgementText: string }}
 */
function buildPaymentDisclosureContent(paymentSchedule = {}) {
  const installments = paymentSchedule.installments;
  const perInstallmentUsd = paymentSchedule.perInstallmentUsd;
  const totalUsd = paymentSchedule.totalUsd;

  const paymentLine = installments === 1
    ? `One payment of ${formatUsd(perInstallmentUsd)}.`
    : `${installments} payments of ${formatUsd(perInstallmentUsd)} each. Total: ${formatUsd(totalUsd)}.`;

  const lines = [
    paymentLine,
    "Payments are administered through Stripe.",
    "The first payment establishes the payment start date.",
    "Each following payment processes on the same calendar day as the first payment.",
    "Production begins after agreement completion and receipt of the first payment.",
    "The release date is not locked until full payment is received."
  ];

  const acknowledgementText = "Author acknowledges and agrees to the payment structure described in this disclosure.";

  return { title: "Payment Disclosure", lines, acknowledgementText };
}

module.exports = { buildPaymentDisclosureContent, formatUsd };
