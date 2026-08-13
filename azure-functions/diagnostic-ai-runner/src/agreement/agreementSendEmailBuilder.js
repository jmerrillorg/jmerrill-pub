"use strict";

/**
 * Builds the author-facing agreement-package send email. Pure — no I/O.
 *
 * Content rules (per the manual standard for this send):
 *   - Warm, professional tone.
 *   - Explains the attached package is for review and signature.
 *   - Names the selected package and the payment plan in plain terms.
 *   - States production begins after the first payment AND
 *     agreement/onboarding completion — never implies production has
 *     already started.
 *   - Never includes a payment link (a separate, not-yet-built and not
 *     approved gated step governs that).
 *   - Never includes raw editorial scoring, raw manuscript text, or raw
 *     AI/model output — this builder has no access to any of those in
 *     the first place; it only receives already-confirmed commercial
 *     facts (title, package label, payment schedule).
 */

function formatUsd(amount) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * @param {{
 *   authorFirstName: string, title: string, packageLabel: string,
 *   paymentSchedule: { installments: number, perInstallmentUsd: number, totalUsd: number, internalCommissioning?: boolean },
 *   attachmentLabels?: string[]
 * }} input
 * @returns {{ subject: string, bodyText: string }}
 */
function buildAgreementSendEmailContent(input = {}) {
  const authorFirstName = (input.authorFirstName || "").trim() || "there";
  const title = (input.title || "").trim();
  const packageLabel = (input.packageLabel || "").trim();
  const schedule = input.paymentSchedule || {};
  const attachmentLabels = Array.isArray(input.attachmentLabels) && input.attachmentLabels.length > 0
    ? input.attachmentLabels.map((label) => String(label || "").trim()).filter(Boolean)
    : ["Publishing Agreement", "Publishing Package Addendum", "Audiobook Addendum", "Schedule A / Payment Schedule"];

  const subject = `Agreement package for ${title}`;

  const paymentLine = schedule.internalCommissioning === true || schedule.disposition === "INTERNAL_COMMISSIONING"
    ? "internal commissioning; no author payment is due for this commissioning record"
    : schedule.installments === 1
    ? `a single payment of ${formatUsd(schedule.perInstallmentUsd)}`
    : `${schedule.installments} payments of ${formatUsd(schedule.perInstallmentUsd)} each (total ${formatUsd(schedule.totalUsd)})`;
  const productionStartLine = schedule.internalCommissioning === true || schedule.disposition === "INTERNAL_COMMISSIONING"
    ? "Once the agreement is signed and onboarding is complete, we'll continue the governed commissioning process."
    : "Once the agreement is signed and your first payment is received, we'll begin production — production has not started yet.";

  const bodyText = [
    `Hi ${authorFirstName},`,
    "",
    `We're excited to move forward with ${title}. Attached is your agreement package for review and signature:`,
    "",
    ...attachmentLabels.map((label) => `- ${label}`),
    "",
    `This reflects the ${packageLabel} and the payment plan you selected: ${paymentLine}.`,
    "",
    `Please take your time reviewing each document. ${productionStartLine}`,
    "",
    "If you have any questions before signing, just reply to this email and we'll be glad to help.",
    "",
    "Warmly,",
    "J Merrill Publishing"
  ].join("\n");

  return { subject, bodyText };
}

module.exports = { buildAgreementSendEmailContent, formatUsd };
