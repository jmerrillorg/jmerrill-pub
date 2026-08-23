"use strict";

const { createHash } = require("node:crypto");
const {
  PRICING_STATES
} = require("./packageAcceptancePaymentOptions");

const TEMPLATE_NAME = "PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1";
const TEMPLATE_VERSION = "1.0.0";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const CANONICAL_RENDERER = "JM1 Enterprise Communication Renderer";
const CANONICAL_RENDER_MODE = "CANONICAL_HTML";

const PLAN_LABELS = Object.freeze({
  FULL_PAY: "Pay in Full",
  "2_PAY": "2 months",
  "4_PAY": "4 months",
  "8_PAY": "8 months",
  "12_PAY": "12 months",
  "18_PAY": "18 months",
  "24_PAY": "24 months"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function required(value, reason) {
  const normalized = normalizeString(value);
  if (!normalized) throw new Error(reason);
  return normalized;
}

function escapeHtml(value) {
  return normalizeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isHttpsUrl(value) {
  return /^https:\/\/[^\s]+$/i.test(normalizeString(value));
}

function formatPercent(value) {
  return `${Math.max(0, Math.floor(Number(value) || 0))}%`;
}

// Author-facing primary surface is Term / Payment / Total Before Tax only
// (see JMP-EXTENDED-FINANCING-12-18-24-2026-08-22 canon). Principal and
// plan-charge remain computed and available here for internal use and
// required disclosures, but are not the primary display columns.
function paymentOptionRows(offer) {
  return offer.paymentOptions.map((plan) => {
    const installments = plan.installments.map((row) => ({
      number: row.installmentNumber,
      principal: row.principalFormatted,
      fee: row.planChargeFormatted || row.multiPayFeeFormatted,
      total: row.totalDueFormatted
    }));
    const isMultiPay = plan.planCode !== "FULL_PAY";
    const firstAmount = installments[0]?.total || plan.totalDueFormatted;
    const hasFinalAdjustment = isMultiPay && installments.some((row) => row.total !== firstAmount);
    return {
      label: PLAN_LABELS[plan.planCode] || plan.planCode,
      principal: plan.principalTotalFormatted,
      fee: plan.planChargeTotalFormatted || plan.multiPayFeeTotalFormatted,
      total: plan.totalDueFormatted,
      // Primary author-facing fields:
      payment: isMultiPay ? `${firstAmount}/month${hasFinalAdjustment ? "*" : ""}` : `${plan.totalDueFormatted} one-time`,
      totalBeforeTax: plan.totalDueFormatted,
      hasFinalAdjustment,
      feeLabel: plan.authorFacingChargeLabel || "Payment-plan charge",
      feeNote: plan.planCode === "FULL_PAY"
        ? (plan.authorFacingChargeLabel || "No payment-plan charge")
        : `${plan.authorFacingChargeLabel || "Payment-plan charge"} included in the scheduled payments`,
      installments
    };
  });
}

function buildPaymentOptionsText(rows) {
  const header = "Term | Payment | Total Before Tax";
  const table = rows.map((row) => `${row.label} | ${row.payment} | ${row.total} + applicable tax`);
  const disclosure = rows.flatMap((row) => {
    const lines = [
      `${row.label} detail: Principal ${row.principal}; ${row.feeLabel} ${row.fee}; ${row.feeNote}.`
    ];
    if (row.installments.length > 1) {
      lines.push("  Installments:");
      for (const installment of row.installments) {
        lines.push(`    ${installment.number}. ${installment.principal} principal + ${installment.fee} ${row.feeLabel.toLowerCase()} = ${installment.total} + applicable tax`);
      }
    }
    return lines;
  });
  return [header, ...table, "", "Detail (for your records):", ...disclosure].join("\n");
}

function buildPaymentOptionsHtml(rows) {
  return rows.map((row) => `
                  <tr>
                    <td style="border:1px solid #d8dee9;padding:10px;font-weight:700;">${escapeHtml(row.label)}</td>
                    <td style="border:1px solid #d8dee9;padding:10px;">${escapeHtml(row.payment)}</td>
                    <td style="border:1px solid #d8dee9;padding:10px;">${escapeHtml(row.totalBeforeTax)}</td>
                  </tr>`).join("");
}

// Internal/disclosure detail (principal, plan-charge, per-installment
// breakdown) — not part of the primary Term/Payment/Total Before Tax
// surface, but preserved for required disclosures per canon.
function buildPaymentOptionsDisclosureHtml(rows) {
  const installmentLinesHtml = (row) => {
    if (row.installments.length <= 1) return "";
    const lines = row.installments
      .map((installment) => `Payment ${escapeHtml(String(installment.number))}: ${escapeHtml(installment.total)} + applicable tax`)
      .join("<br>");
    return `<br><span style="display:block;color:#111827;font-size:12px;margin-top:6px;font-weight:700;">Scheduled payments</span><span style="display:block;color:#374151;font-size:12px;margin-top:2px;">${lines}</span>`;
  };
  return rows.map((row) => `<p style="margin:0 0 10px;font-size:12px;color:#4b5563;"><strong>${escapeHtml(row.label)}:</strong> Principal ${escapeHtml(row.principal)}; ${escapeHtml(row.feeLabel)} ${escapeHtml(row.fee)}; ${escapeHtml(row.feeNote)}.${installmentLinesHtml(row)}</p>`).join("");
}

function buildReferralCopy(preview) {
  const offer = preview.offer;
  if (preview.referralSelectionRequired) {
    return {
      text: [
        `Referral credit available: ${formatPercent(offer.referralCreditsAvailablePercent)}`,
        `Selectable now: ${offer.referralCreditChoicesPercent.map(formatPercent).join(" / ")}`,
        "Please choose how much referral credit you would like to apply before payment options are locked. Unused eligible credit remains banked for a future project."
      ].join("\n"),
      html: [
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">You have referral credit available. You can choose how much you would like to apply to this project before final payment options are locked.</p>`,
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;"><strong>Available referral credit:</strong> ${escapeHtml(formatPercent(offer.referralCreditsAvailablePercent))}<br><strong>Selectable now:</strong> ${escapeHtml(offer.referralCreditChoicesPercent.map(formatPercent).join(" / "))}</p>`,
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Any unused eligible credit remains banked for a future project.</p>`
      ].join("")
    };
  }
  if (offer.referralCreditsAppliedPercent > 0) {
    return {
      text: [
        `Referral credit selected for preview: ${formatPercent(offer.referralCreditsAppliedPercent)}`,
        `Referral credit remaining: ${formatPercent(offer.referralCreditsRemainingPercent)}`
      ].join("\n"),
      html: `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;"><strong>Referral credit selected for preview:</strong> ${escapeHtml(formatPercent(offer.referralCreditsAppliedPercent))}<br><strong>Referral credit remaining:</strong> ${escapeHtml(formatPercent(offer.referralCreditsRemainingPercent))}</p>`
    };
  }
  return {
    text: "No referral credit is being applied in this preview.",
    html: `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">No referral credit is being applied in this preview.</p>`
  };
}

function validatePackageAcceptanceCommunication(rendered, preview) {
  const subject = normalizeString(rendered.subject);
  const html = normalizeString(rendered.html);
  const text = normalizeString(rendered.text);
  const offer = preview?.offer;
  const combined = `${subject}\n${html}\n${text}`;
  const blockers = [];

  if (!offer?.ok) blockers.push("OFFER_ENGINE_OUTPUT_REQUIRED");
  if (!subject) blockers.push("SUBJECT_MISSING");
  if (/^JMP-INT-|^[0-9a-f]{8}-[0-9a-f]{4}/i.test(subject)) blockers.push("SUBJECT_LEADS_WITH_INTERNAL_REFERENCE");
  if (offer?.title && !subject.includes(offer.title)) blockers.push("SUBJECT_TITLE_MISSING");
  if (!html || !/^<!doctype html>/i.test(html)) blockers.push("HTML_SHELL_MISSING");
  if (!text) blockers.push("PLAIN_TEXT_FALLBACK_MISSING");
  if (/\{\{[^}]+\}\}|<<[^>]+>>/.test(combined)) blockers.push("UNRESOLVED_TEMPLATE_VARIABLE");
  if (!html.includes("J MERRILL PUBLISHING") || !html.includes("A Division of J Merrill One")) blockers.push("BRAND_HEADER_MISSING");
  for (const fragment of ["Why you are receiving this", "What JMP has prepared", "What we need from you", "Payment Options", "What happens next", "Support"]) {
    if (!html.includes(fragment) || !text.includes(fragment)) blockers.push(`${fragment.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`);
  }
  if (/\b(Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file|PACKAGE_ACCEPTED|OFFER_PREVIEW|pricing rule version|opportunity ID)\b/i.test(combined)) {
    blockers.push("INTERNAL_LANGUAGE_EXPOSED");
  }
  if (/\bJOINED_THE_FAMILY|fully enrolled|production has started|welcome to the family\b/i.test(combined)) blockers.push("PREMATURE_JOINED_THE_FAMILY_LANGUAGE");
  if (/\btax\s+(is|will be)\s+\$?\d/i.test(combined)) blockers.push("TAX_FABRICATED");
  if (offer && offer.combinedBenefitPercent > 50) blockers.push("COMBINED_BENEFIT_OVER_50_PERCENT");
  if (preview?.liveActions?.mutatesReferralBalance !== false) blockers.push("REFERRAL_AUTO_CONSUMED");
  for (const plan of offer?.paymentOptions || []) {
    const chargeTotal = plan.planChargeTotalFormatted || plan.multiPayFeeTotalFormatted;
    if (!combined.includes(plan.totalDueFormatted) || !combined.includes(plan.principalTotalFormatted) || !combined.includes(chargeTotal)) {
      blockers.push(`PAYMENT_OPTION_DIFFERS_FROM_ENGINE_${plan.planCode}`);
    }
    if (plan.planCode !== "FULL_PAY") {
      for (const installment of plan.installments || []) {
        if (!html.includes(installment.totalDueFormatted)) {
          blockers.push(`HTML_INSTALLMENT_AMOUNT_MISSING_${plan.planCode}_${installment.installmentNumber}`);
        }
        if (!text.includes(installment.totalDueFormatted)) {
          blockers.push(`TEXT_INSTALLMENT_AMOUNT_MISSING_${plan.planCode}_${installment.installmentNumber}`);
        }
      }
    }
  }
  if (preview?.pricingState === PRICING_STATES.PRICING_LOCKED) blockers.push("PRICING_LOCKED_BEFORE_PAYMENT_SELECTION");

  return blockers.length ? { ok: false, blockers } : { ok: true, blockers: [] };
}

function renderPackageAcceptanceCommunication(preview, input = {}) {
  if (!preview?.ok) return { ok: false, reason: "OFFER_PREVIEW_REQUIRED" };
  const offer = preview.offer;
  const authorName = required(input.authorName, "AUTHOR_NAME_MISSING");
  const authorEmail = required(input.authorEmail, "AUTHOR_EMAIL_MISSING").toLowerCase();
  const title = required(input.title || preview.packageAcceptedEvent?.title || offer.titleId, "TITLE_MISSING");
  const intakeReferenceCode = required(input.intakeReferenceCode || preview.packageAcceptedEvent?.intakeReferenceCode, "INTAKE_REFERENCE_CODE_MISSING");
  const diagnosticId = required(input.diagnosticId || preview.packageAcceptedEvent?.titleId, "DIAGNOSTIC_ID_MISSING");
  const actionUrl = required(input.actionUrl, "ACTION_URL_MISSING");
  const approvedBy = normalizeString(input.approvedBy);
  const approvedOn = normalizeString(input.approvedOn) || new Date().toISOString();
  if (!isHttpsUrl(actionUrl)) return { ok: false, reason: "ACTION_URL_INVALID" };

  offer.title = title;
  const rows = paymentOptionRows(offer);
  const referralCopy = buildReferralCopy(preview);
  const subject = normalizeString(input.subjectOverride) || `Your Publishing Payment Options for ${title}`;
  const correctionNotice = normalizeString(input.correctionNotice);
  const returningLine = offer.returningAuthorPercent > 0
    ? `Because of your existing J Merrill Publishing relationship, your Returning Author Benefit of ${formatPercent(offer.returningAuthorPercent)} has already been included below.`
    : "No returning-author benefit applies to this preview.";
  const referralInstruction = preview.referralSelectionRequired
    ? "Choose how much referral credit you would like to apply, then choose your preferred payment option."
    : "Choose your preferred payment option.";
  const text = [
    `Good day ${authorName},`,
    "",
    `Thank you for letting us know you'd like to move forward with ${title}. We've prepared the payment choices for your recommended ${offer.packageName} so you can choose the option that works best for you.`,
    ...(correctionNotice ? ["", correctionNotice] : []),
    "",
    "Why you are receiving this",
    `You accepted the recommended ${offer.packageName} for ${title}.`,
    "",
    "What JMP has prepared",
    `Base package fee: ${offer.basePackagePriceFormatted}`,
    `Returning Author Benefit: ${formatPercent(offer.returningAuthorPercent)}`,
    returningLine,
    referralCopy.text,
    `Combined Benefit: ${formatPercent(offer.combinedBenefitPercent)}`,
    `Adjusted package principal: ${offer.adjustedPackagePrincipalFormatted}`,
    "Tax: plus applicable tax. Tax is not calculated in this preview.",
    "",
    "Payment Options",
    buildPaymentOptionsText(rows),
    "",
    "Pay off early",
    "You may pay the remaining balance early at any time. There is no early-payoff penalty. Any unearned future payment-plan charges are not due after payoff.",
    "",
    "What we need from you",
    referralInstruction,
    `Choose Your Payment Option: ${actionUrl}`,
    "",
    "What happens next",
    "After your payment-plan selection, pricing locks from the same offer snapshot, the agreement/addendum uses that snapshot, and the payment arrangement is prepared. Your publishing engagement is complete only after agreement execution and the required initial payment are complete.",
    "",
    "Support",
    "Reply to this email and the Publishing Team will help.",
    "",
    `Reference for your records: ${intakeReferenceCode}`,
    "",
    "The Publishing Team",
    "J Merrill Publishing, Inc.",
    "A Division of J Merrill One",
    "614.965.6057 · publishing@jmerrill.one · jmerrill.pub",
    "Helping Authors Help Themselves."
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;width:100%;background:#ffffff;border:1px solid #d8dee9;">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:24px 28px;">
                <div style="font-size:13px;letter-spacing:.08em;font-weight:700;">J MERRILL PUBLISHING</div>
                <div style="font-size:12px;color:#d1d5db;margin-top:6px;">A Division of J Merrill One</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Good day ${escapeHtml(authorName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Thank you for letting us know you'd like to move forward with <strong>${escapeHtml(title)}</strong>. We've prepared the payment choices for your recommended <strong>${escapeHtml(offer.packageName)}</strong> so you can choose the option that works best for you.</p>
                ${correctionNotice ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.55;background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 14px;">${escapeHtml(correctionNotice)}</p>` : ""}
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">Why you are receiving this</h2>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">You accepted the recommended ${escapeHtml(offer.packageName)} for ${escapeHtml(title)}.</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">What JMP has prepared</h2>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.55;"><strong>Base package fee:</strong> ${escapeHtml(offer.basePackagePriceFormatted)}<br><strong>Returning Author Benefit:</strong> ${escapeHtml(formatPercent(offer.returningAuthorPercent))}<br><strong>Combined Benefit:</strong> ${escapeHtml(formatPercent(offer.combinedBenefitPercent))}<br><strong>Adjusted package principal:</strong> ${escapeHtml(offer.adjustedPackagePrincipalFormatted)}</p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${escapeHtml(returningLine)}</p>
                ${referralCopy.html}
                <p style="margin:0 0 12px;font-size:15px;line-height:1.55;"><strong>Tax:</strong> plus applicable tax. Tax is not calculated in this preview.</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">Payment Options</h2>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Choose the payment schedule that works best for you.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;line-height:1.45;">
                  <tr>
                    <th align="left" style="border:1px solid #d8dee9;padding:10px;background:#f3f4f6;">Term</th>
                    <th align="left" style="border:1px solid #d8dee9;padding:10px;background:#f3f4f6;">Payment</th>
                    <th align="left" style="border:1px solid #d8dee9;padding:10px;background:#f3f4f6;">Total Before Tax</th>
                  </tr>
                  ${buildPaymentOptionsHtml(rows)}
                </table>
                <p style="margin:10px 0 18px;font-size:12px;line-height:1.5;color:#4b5563;">Payments shown are plus applicable tax. *A final installment may adjust by a few cents so the total is exact. Detail below for your records.</p>
                <div style="margin:0 0 18px;">${buildPaymentOptionsDisclosureHtml(rows)}</div>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">Pay off early</h2>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">You may pay the remaining balance early at any time. There is no early-payoff penalty. Any unearned future payment-plan charges are not due after payoff.</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">What we need from you</h2>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">${escapeHtml(referralInstruction)}</p>
                <p style="margin:20px 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 18px;font-weight:700;">Choose Your Payment Option</a></p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">What happens next</h2>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">After your payment-plan selection, pricing locks from the same offer snapshot, the agreement/addendum uses that snapshot, and the payment arrangement is prepared. Your publishing engagement is complete only after agreement execution and the required initial payment are complete.</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#111827;">Support</h2>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Reply to this email and the Publishing Team will help.</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Reference for your records: <strong>${escapeHtml(intakeReferenceCode)}</strong></p>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.55;">The Publishing Team<br>J Merrill Publishing, Inc.<br>A Division of J Merrill One<br>614.965.6057 · publishing@jmerrill.one · jmerrill.pub<br>Helping Authors Help Themselves.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const metadata = {
    templateName: TEMPLATE_NAME,
    templateVersion: TEMPLATE_VERSION,
    brandSystem: "JM1_AUTHOR_COMMUNICATION",
    enterpriseStandard: "JM1 Enterprise Communication Standard v1.0",
    renderer: CANONICAL_RENDERER,
    rendererVersion: "1.0.0",
    renderMode: CANONICAL_RENDER_MODE,
    renderTemplateGuard: "PASS",
    qualityGate: "PASS",
    htmlSha256: sha256(html),
    textSha256: sha256(text)
  };
  const rendered = { subject, html, text, metadata };
  const validation = validatePackageAcceptanceCommunication(rendered, preview);
  if (!validation.ok) return { ok: false, reason: "PACKAGE_ACCEPTANCE_COMMUNICATION_BLOCKED", blockers: validation.blockers };

  return {
    ok: true,
    rendered,
    sendApproval: {
      messageType: "APPROVED_AUTHOR_RESPONSE",
      diagnosticId,
      intakeReferenceCode,
      authorEmail,
      authorName,
      projectTitle: title,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      subject,
      body: text,
      htmlBody: html,
      draftSubject: subject,
      draftBody: text,
      draftHtmlBody: html,
      templateName: TEMPLATE_NAME,
      templateVersion: TEMPLATE_VERSION,
      templateMetadata: metadata,
      decision: "APPROVE_AUTHOR_SEND",
      sendApproved: true,
      approvedBy,
      approvedOn,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true
    },
    previewState: {
      pricingState: preview.pricingState,
      referralSelectionRequired: preview.referralSelectionRequired,
      pricingLocked: false,
      stripeCreated: false,
      joinedTheFamily: false
    },
    negativeProof: {
      rendererRecalculatesPricing: 0,
      referralAutoConsumed: 0,
      combinedBenefitOver50Percent: 0,
      taxGuessed: 0,
      pricingLockedBeforePaymentSelection: 0,
      stripeCreatedBeforePaymentSelection: 0,
      joinedTheFamilySetBeforeAgreementPlusInitialPayment: 0
    }
  };
}

module.exports = {
  TEMPLATE_NAME,
  TEMPLATE_VERSION,
  INTERNAL_VISIBILITY_MAILBOX,
  renderPackageAcceptanceCommunication,
  validatePackageAcceptanceCommunication,
  paymentOptionRows
};
