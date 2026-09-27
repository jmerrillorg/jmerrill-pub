"use strict";

const { createHash } = require("node:crypto");
const { getBrandProfile } = require("./brandRegistry");
const { ACTIVE, PAYMENT_CODES, findTemplate, isGovernedNamespace } = require("./templateRegistry");
const { renderPublishingServiceCorrespondence } = require("../generated/communications/jm1-enterprise-communication-renderer");

const RENDERER_VERSION = "1.0.1";
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
  const rendered = renderPublishingServiceCorrespondence({
    subject, authorName: data.authorFirstName,
    body: text.slice(0, text.indexOf("\nWarm regards,")),
    templateName: template.templateId, templateVersion: template.templateVersion
  });
  return { subject, preheader: template.preheader, html: rendered.html, plainText: rendered.text, renderMetadata: rendered.metadata };
}

function validateAuthorOnboardingData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "TEMPLATE_DATA_INVALID" };
  const allowed = new Set(["authorFirstName", "projectTitle", "onboardingUrl"]);
  if (Object.keys(data).some((key) => !allowed.has(key))) return { ok: false, reason: "TEMPLATE_DATA_UNEXPECTED_FIELD" };
  const authorFirstName = safeText(data.authorFirstName, "authorFirstName", 80);
  if (!authorFirstName.ok) return authorFirstName;
  const projectTitle = safeText(data.projectTitle, "projectTitle", 160);
  if (!projectTitle.ok) return projectTitle;
  let onboardingUrl;
  try {
    onboardingUrl = new URL(String(data.onboardingUrl || ""));
  } catch {
    return { ok: false, reason: "TEMPLATE_DATA_ONBOARDINGURL_INVALID" };
  }
  if (onboardingUrl.protocol !== "https:" || onboardingUrl.hostname !== "jmerrill.pub" || onboardingUrl.pathname !== "/author/onboarding") {
    return { ok: false, reason: "TEMPLATE_DATA_ONBOARDINGURL_INVALID" };
  }
  return { ok: true, value: { authorFirstName: authorFirstName.value, projectTitle: projectTitle.value, onboardingUrl: onboardingUrl.toString() } };
}

function renderAuthorOnboarding(template, brand, data) {
  const subject = template.subject.replace("{{projectTitle}}", data.projectTitle);
  const plainText = [
    `Good day, ${data.authorFirstName},`, "",
    `Your publishing agreement and payment for ${data.projectTitle} are complete, so you can now begin author onboarding.`, "",
    "Use the secure onboarding page below. Sign in with the email address that received this invitation, request your one-time code, and complete the form for this title.", "",
    data.onboardingUrl, "",
    "After you submit the form, the Publishing Team will review your information and confirm the next step.", "",
    "If you have any trouble signing in or completing the form, reply to this email and the Publishing Team will help.", "",
    "Warm regards,", "", brand.signatureName, brand.footer, brand.publicUrl
  ].join("\n");
  const rendered = renderPublishingServiceCorrespondence({
    subject, authorName: data.authorFirstName,
    body: plainText.slice(0, plainText.indexOf("\nWarm regards,")),
    templateName: template.templateId, templateVersion: template.templateVersion
  });
  return { subject, preheader: template.preheader, html: rendered.html, plainText: rendered.text, renderMetadata: rendered.metadata };
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
  } else if (template.templateId === "PUBLISHING.AUTHOR_ONBOARDING_V1") {
    validated = validateAuthorOnboardingData(input.data);
  } else {
    return { ok: false, reason: "TEMPLATE_RENDERER_NOT_IMPLEMENTED" };
  }
  if (!validated.ok) return validated;
  const output = template.templateId === "PUBLISHING.AUTHOR_ONBOARDING_V1"
    ? renderAuthorOnboarding(template, brandResult.profile, validated.value)
    : renderPaymentElection(template, brandResult.profile, validated.value);
  return {
    ok: true,
    value: {
      ...output,
      metadata: {
        ...output.renderMetadata,
        rendererVersion: output.renderMetadata.rendererVersion,
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

function renderServiceCorrespondence(body, options = {}) {
  return renderPublishingServiceCorrespondence({ body, subject: options.subject || 'Your Publishing Project',
    authorName: options.authorName || body?.match(/^Good day,\s*([^,\n]+)/i)?.[1] || 'Author',
    templateName: options.templateName || 'PUBLISHING_SERVICE_CORRESPONDENCE',
    templateVersion: options.templateVersion || '1.0' }).html;
}

module.exports = {
  RENDERER_VERSION,
  escapeHtml,
  renderServiceCorrespondence,
  renderTemplate,
  validatePaymentElectionData
};
