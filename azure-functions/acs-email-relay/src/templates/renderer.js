"use strict";

const { createHash } = require("node:crypto");
const { getBrandProfile } = require("./brandRegistry");
const { ACTIVE, PAYMENT_CODES, findTemplate, isGovernedNamespace } = require("./templateRegistry");

const RENDERER_VERSION = "JM1-EMAIL-RENDERER-v1.0.0";
const SAFE_TEXT = /^[^\r\n<>]{1,200}$/;
const MAX_AMOUNT_CENTS = 100_000_000;
const PAYMENT_LABELS = Object.freeze({
  FULL_PAY: "Full Pay",
  "2_PAY": "2-Pay",
  "4_PAY": "4-Pay",
  "8_PAY": "8-Pay",
  "12_PAY": "12-Pay",
  "18_PAY": "18-Pay",
  "24_PAY": "24-Pay"
});

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value, field, max = 200) {
  if (typeof value !== "string") return { ok: false, reason: `TEMPLATE_DATA_${field.toUpperCase()}_INVALID` };
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !SAFE_TEXT.test(normalized)) {
    return { ok: false, reason: `TEMPLATE_DATA_${field.toUpperCase()}_INVALID` };
  }
  return { ok: true, value: normalized };
}

function safeCents(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT_CENTS) {
    return { ok: false, reason: `TEMPLATE_DATA_${field.toUpperCase()}_INVALID` };
  }
  return { ok: true, value };
}

function validatePaymentElectionData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "TEMPLATE_DATA_INVALID" };
  const allowed = new Set(["authorFirstName", "projectTitle", "packageName", "baseAmountCents", "options"]);
  if (Object.keys(data).some((key) => !allowed.has(key))) return { ok: false, reason: "TEMPLATE_DATA_UNEXPECTED_FIELD" };

  const authorFirstName = safeText(data.authorFirstName, "authorFirstName", 80);
  if (!authorFirstName.ok) return authorFirstName;
  const projectTitle = safeText(data.projectTitle, "projectTitle", 160);
  if (!projectTitle.ok) return projectTitle;
  const packageName = safeText(data.packageName, "packageName", 120);
  if (!packageName.ok) return packageName;
  const baseAmountCents = safeCents(data.baseAmountCents, "baseAmountCents");
  if (!baseAmountCents.ok) return baseAmountCents;

  if (!Array.isArray(data.options) || data.options.length < 1 || data.options.length > PAYMENT_CODES.length) {
    return { ok: false, reason: "TEMPLATE_DATA_OPTIONS_INVALID" };
  }
  const seen = new Set();
  const options = [];
  for (const option of data.options) {
    if (!option || typeof option !== "object" || Array.isArray(option)) return { ok: false, reason: "TEMPLATE_DATA_OPTION_INVALID" };
    const optionAllowed = new Set(["code", "paymentAmountsCents", "totalBeforeTaxCents"]);
    if (Object.keys(option).some((key) => !optionAllowed.has(key))) return { ok: false, reason: "TEMPLATE_DATA_OPTION_UNEXPECTED_FIELD" };
    const code = String(option.code || "").trim().toUpperCase();
    if (!PAYMENT_CODES.includes(code) || seen.has(code)) return { ok: false, reason: "TEMPLATE_DATA_OPTION_CODE_INVALID" };
    if (!Array.isArray(option.paymentAmountsCents) || option.paymentAmountsCents.length < 1 || option.paymentAmountsCents.length > 24) {
      return { ok: false, reason: "TEMPLATE_DATA_OPTION_PAYMENTS_INVALID" };
    }
    const expectedCount = code === "FULL_PAY" ? 1 : Number.parseInt(code, 10);
    if (option.paymentAmountsCents.length !== expectedCount) return { ok: false, reason: "TEMPLATE_DATA_OPTION_PAYMENT_COUNT_MISMATCH" };
    const payments = [];
    for (const amount of option.paymentAmountsCents) {
      const validated = safeCents(amount, "paymentAmountCents");
      if (!validated.ok || amount === 0) return { ok: false, reason: "TEMPLATE_DATA_OPTION_PAYMENT_AMOUNT_INVALID" };
      payments.push(validated.value);
    }
    const total = safeCents(option.totalBeforeTaxCents, "totalBeforeTaxCents");
    if (!total.ok || payments.reduce((sum, amount) => sum + amount, 0) !== total.value) {
      return { ok: false, reason: "TEMPLATE_DATA_OPTION_TOTAL_MISMATCH" };
    }
    seen.add(code);
    options.push({ code, paymentAmountsCents: payments, totalBeforeTaxCents: total.value });
  }

  return {
    ok: true,
    value: {
      authorFirstName: authorFirstName.value,
      projectTitle: projectTitle.value,
      packageName: packageName.value,
      baseAmountCents: baseAmountCents.value,
      options
    }
  };
}

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function paymentSummary(option) {
  const amounts = option.paymentAmountsCents;
  if (option.code === "FULL_PAY") return `${money(amounts[0])} one-time`;
  const unique = [...new Set(amounts)];
  if (unique.length === 1) return `${amounts.length} payments of ${money(amounts[0])}`;
  return amounts.map((amount, index) => `payment ${index + 1}: ${money(amount)}`).join("; ");
}

function renderPaymentElection(template, brand, data) {
  const tokens = brand.tokens;
  const subject = template.subject.replace("{{projectTitle}}", data.projectTitle);
  const optionText = data.options.map((option) => `- ${PAYMENT_LABELS[option.code]}: ${paymentSummary(option)} before applicable tax. Total before tax: ${money(option.totalBeforeTaxCents)}.`).join("\n");
  const text = [
    `Good day, ${data.authorFirstName},`,
    "",
    `Thank you for letting us know you are ready to move forward with ${data.projectTitle}. We have prepared the payment choices for your ${data.packageName} so you can choose the option that works best for you.`,
    "",
    `Your ${data.packageName} has a base package fee of ${money(data.baseAmountCents)}. Tax is not calculated here and remains applicable where required.`,
    "",
    "Your payment choices are:",
    optionText,
    "",
    `Please reply to this email and let us know whether you prefer ${data.options.map((option) => PAYMENT_LABELS[option.code]).join(", ")}.`,
    "",
    "Once you choose your payment option, we will lock the pricing from this offer snapshot and prepare the next commercial step.",
    "",
    "Warm regards,",
    "",
    brand.signatureName,
    brand.footer,
    brand.publicUrl
  ].join("\n");
  const rows = data.options.map((option) => `
                    <tr>
                      <td class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};font-weight:700;color:${tokens["text.primary"]};">${escapeHtml(PAYMENT_LABELS[option.code])}</td>
                      <td class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};color:${tokens["text.primary"]};">${escapeHtml(paymentSummary(option))}</td>
                      <td class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};color:${tokens["text.primary"]};">${escapeHtml(money(option.totalBeforeTaxCents))}</td>
                    </tr>`).join("");
  const optionsLabel = data.options.map((option) => PAYMENT_LABELS[option.code]).join(", ");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .option-table { table-layout: fixed !important; }
      .option-cell { padding: 8px !important; font-size: 12px !important; overflow-wrap: anywhere !important; word-break: break-word !important; }
      .email-footer { overflow-wrap: anywhere !important; word-break: break-word !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${tokens["surface.muted"]};font-family:${tokens["font.stack"]};color:${tokens["text.primary"]};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(template.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${tokens["surface.muted"]};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width:100%;max-width:600px;background:${tokens["surface.background"]};border:1px solid ${tokens["border.subtle"]};">
        <tr><td style="padding:24px 28px;border-top:6px solid ${tokens["brand.primary"]};text-align:center;">
          <a href="${brand.publicUrl}" style="text-decoration:none;"><img src="${brand.logo.url}" width="96" height="96" alt="${escapeHtml(brand.logo.alt)}" style="display:inline-block;width:96px;height:96px;max-width:100%;border:0;object-fit:contain;"></a>
        </td></tr>
        <tr><td class="email-padding" style="padding:4px 28px 28px;">
          <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${tokens["text.primary"]};">Choose Your Payment Option</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Good day, ${escapeHtml(data.authorFirstName)},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thank you for letting us know you are ready to move forward with <strong>${escapeHtml(data.projectTitle)}</strong>. We have prepared the payment choices for your ${escapeHtml(data.packageName)} so you can choose the option that works best for you.</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Your ${escapeHtml(data.packageName)} has a base package fee of <strong>${escapeHtml(money(data.baseAmountCents))}</strong>. Tax is not calculated here and remains applicable where required.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="option-table" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 20px;font-size:14px;">
            <tr>
              <th scope="col" align="left" class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};background:${tokens["brand.secondary"]};color:#FFFFFF;">Option</th>
              <th scope="col" align="left" class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};background:${tokens["brand.secondary"]};color:#FFFFFF;">Payment</th>
              <th scope="col" align="left" class="option-cell" style="padding:12px;border:1px solid ${tokens["border.subtle"]};background:${tokens["brand.secondary"]};color:#FFFFFF;">Total Before Tax</th>
            </tr>${rows}
          </table>
          <div role="group" aria-label="Action required" style="margin:20px 0;padding:18px;border-left:5px solid ${tokens["action.primary.background"]};background:${tokens["surface.muted"]};">
            <p style="margin:0 0 8px;font-size:16px;line-height:1.5;font-weight:700;">Reply with your selection</p>
            <p style="margin:0;font-size:15px;line-height:1.55;">Please reply to this email and let us know whether you prefer ${escapeHtml(optionsLabel)}.</p>
          </div>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Once you choose your payment option, we will lock the pricing from this offer snapshot and prepare the next commercial step.</p>
          <p style="margin:0;font-size:16px;line-height:1.6;">Warm regards,<br><br><strong>${escapeHtml(brand.signatureName)}</strong></p>
        </td></tr>
        <tr><td class="email-footer email-padding" style="padding:20px 28px;background:${tokens["footer.background"]};color:${tokens["footer.text"]};text-align:center;font-size:13px;line-height:1.6;">
          J Merrill Publishing | <a href="${brand.publicUrl}" style="color:${tokens["footer.text"]};">jmerrill.pub</a> | <a href="mailto:publishing@jmerrill.one" style="color:${tokens["footer.text"]};">publishing@jmerrill.one</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, preheader: template.preheader, html, plainText: text };
}

function renderTemplate(input = {}) {
  const template = findTemplate(input.templateId, input.templateVersion);
  if (!template) return { ok: false, reason: isGovernedNamespace(input.templateId) ? "TEMPLATE_VERSION_UNKNOWN" : "TEMPLATE_NOT_GOVERNED" };
  if (template.status !== ACTIVE) return { ok: false, reason: "TEMPLATE_NOT_ACTIVE" };
  const brandResult = getBrandProfile(template.brandId);
  if (!brandResult.ok) return brandResult;
  if (brandResult.profile.tokenVersion !== template.designTokenVersion) return { ok: false, reason: "TEMPLATE_TOKEN_VERSION_MISMATCH" };

  let validated;
  if (template.templateId === "PUBLISHING.PAYMENT_ELECTION_REQUIRED") {
    validated = validatePaymentElectionData(input.data);
  } else {
    return { ok: false, reason: "TEMPLATE_RENDERER_NOT_IMPLEMENTED" };
  }
  if (!validated.ok) return validated;
  const output = renderPaymentElection(template, brandResult.profile, validated.value);
  return {
    ok: true,
    value: {
      ...output,
      metadata: {
        rendererVersion: RENDERER_VERSION,
        templateId: template.templateId,
        templateVersion: template.templateVersion,
        brandId: template.brandId,
        brandTokenVersion: template.designTokenVersion,
        logoAssetId: brandResult.profile.logo.assetId,
        logoSha256: brandResult.profile.logo.sha256,
        htmlSha256: sha256(output.html),
        plainTextSha256: sha256(output.plainText)
      }
    }
  };
}

module.exports = {
  RENDERER_VERSION,
  escapeHtml,
  renderTemplate,
  validatePaymentElectionData
};
