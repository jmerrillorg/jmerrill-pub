"use strict";

/**
 * Engine: Notification Engine
 * Reusable? Y
 * Stage-specific exception? N
 */

const crypto = require("node:crypto");

const TEMPLATE_NAME = "EDITORIAL_RECOMMENDATION_LETTER";
const TEMPLATE_VERSION = "1.1.0";
const SUBJECT = "Your Editorial Review & Publishing Recommendation | J Merrill Publishing";
const PREHEADER = "We have completed our initial editorial review and prepared a recommended publishing path for your manuscript.";
const BRAND_ENTITY = "J Merrill Publishing, Inc.";
const BRAND_DESCRIPTOR = "A Division of J Merrill One";
const BRAND_TAGLINE = "Helping Authors Help Themselves.";
const BRAND_SITE = "https://www.jmerrill.pub";
const BRAND_EMAIL = "publishing@jmerrill.one";
const BRAND_PHONE = "614.965.6057";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripTags(value) {
  return normalizeString(value).replace(/<[^>]*>/g, "");
}

function escapeHtml(value) {
  return normalizeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function checksum(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function firstNameFrom(value) {
  const text = normalizeString(value);
  if (!text) return "there";
  return text.split(/\s+/)[0].replace(/[,.]+$/, "") || "there";
}

function formatWordCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-US");
}

function buildReviewSummary(input) {
  const title = normalizeString(input.projectTitle) || "your manuscript";
  const workType = normalizeString(input.workType) || "full-length book";
  const genre = normalizeString(input.genre);
  const wordCount = formatWordCount(input.wordCount);
  const article = /^[aeiou]/i.test(genre) ? "an" : "a";
  const focus = genre ? ` with ${article} ${genre} focus` : "";
  const count = wordCount ? ` at approximately ${wordCount} words` : "";
  return [
    `We reviewed ${title} as a ${workType.toLowerCase()}${focus}${count}.`,
    "The manuscript demonstrates meaningful substance, a clear desire to serve readers, and enough depth to deserve a structured editorial and production path.",
    "The strongest opportunity is to shape that substance with care so the final book feels focused, professionally prepared, and ready for the audience it was written to reach."
  ];
}

function recommendedServices(packageCode) {
  if (packageCode === "JMP-PKG-PRO") {
    return [
      "Developmental editing",
      "Line editing",
      "Copyediting",
      "Professional production and publication preparation",
      "Optional AI-assisted audiobook production, where appropriate and separately approved"
    ];
  }
  return [
    "Editorial planning",
    "Publication preparation",
    "Production path coordination",
    "Author next-step guidance"
  ];
}

function packageWhy({ packageCode, recommendation, projectTitle }) {
  if (packageCode === "JMP-PKG-PRO") {
    return `${recommendation.name} is the strongest fit because ${projectTitle} needs more than a quick publishing setup. It needs a fuller editorial and production path that can help the manuscript mature without losing its message.`;
  }
  return `${recommendation.name} is the strongest fit because it gives this manuscript a governed path from editorial review into the next publishing decision.`;
}

function alternateText({ alternate }) {
  if (!alternate) {
    return "If you would like a different starting point, we can talk through the available scope before you choose.";
  }
  return `${alternate.name} at ${alternate.price} remains available if you would prefer a smaller first step. It is not a dismissal of your manuscript; it is simply a narrower path with less editorial and production scope.`;
}

function imprintText({ projectTitle, imprintLabel }) {
  if (!imprintLabel) {
    return `We will confirm the recommended imprint for ${projectTitle} before any agreement or production movement.`;
  }
  return `${imprintLabel} is the recommended imprint because it gives ${projectTitle} a publishing home aligned with the manuscript's purpose, reader promise, and long-term presentation.`;
}

function paragraph(value) {
  return `<p style="margin:0 0 16px 0;">${escapeHtml(value)}</p>`;
}

function buildHtmlEmail(input) {
  const authorFirstName = firstNameFrom(input.authorName);
  const projectTitle = normalizeString(input.projectTitle) || "your manuscript";
  const recommendation = input.recommendedPackage || { name: "Professional Publishing Package", price: "$4,500" };
  const alternate = input.alternatePackage || { name: "Starter Publishing Package", price: "$1,999" };
  const summary = buildReviewSummary(input);
  const services = recommendedServices(input.packageCode);
  const replyHref = `mailto:${BRAND_EMAIL}?subject=${encodeURIComponent("My Publishing Package Selection")}`;
  const colorText = "#1f2933";
  const mutedText = "#5b6572";

  return `<!doctype html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(SUBJECT)}</title>
</head>
<body style="margin:0; padding:0; background:#eef1f4; color:${colorText}; font-family:Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(PREHEADER)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#eef1f4;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; width:100%; background:#ffffff; border:1px solid #d8dde3;">
          <tr>
            <td style="background:#0b1118; padding:30px 28px; border-top:4px solid #c7a45a;">
              <div style="font-family:Georgia, 'Times New Roman', serif; color:#ffffff; font-size:24px; line-height:30px; letter-spacing:0;">J MERRILL PUBLISHING</div>
              <div style="color:#c7a45a; font-size:14px; line-height:20px; margin-top:8px;">Editorial Review &amp; Publishing Recommendation</div>
              <div style="color:#d7dde5; font-size:13px; line-height:18px; margin-top:4px;">${escapeHtml(BRAND_DESCRIPTOR)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 10px 28px; font-size:16px; line-height:25px; color:${colorText};">
              ${paragraph(`Good day, ${authorFirstName},`)}
              ${paragraph(`Thank you for trusting J Merrill Publishing with your manuscript, ${projectTitle}.`)}
              ${paragraph("Before we ever ask an author to invest in us, we first invest in understanding their manuscript.")}
              ${paragraph("Every book we receive is reviewed with one goal in mind: discovering what it needs to become the strongest version of itself and reach the readers it was written to serve.")}
              ${paragraph("After completing our initial editorial review, we would like to share what we found and the publishing path we believe will best support your book.")}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 18px 28px;">
              <h2 style="font-family:Georgia, 'Times New Roman', serif; color:#0b1118; font-size:22px; line-height:28px; margin:0 0 14px 0;">Editorial Review Summary</h2>
              <div style="font-size:16px; line-height:25px; color:${colorText};">
                ${summary.map(paragraph).join("")}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f4ed; border:1px solid #d7c28b; border-left:5px solid #c7a45a;">
                <tr>
                  <td style="padding:22px;">
                    <div style="font-size:12px; line-height:18px; color:#705c2a; text-transform:uppercase; font-weight:bold;">OUR RECOMMENDATION</div>
                    <h2 style="font-family:Georgia, 'Times New Roman', serif; color:#0b1118; font-size:24px; line-height:30px; margin:6px 0 2px 0;">${escapeHtml(recommendation.name)}</h2>
                    <div style="font-size:24px; line-height:30px; color:#0b1118; font-weight:bold; margin-bottom:14px;">${escapeHtml(recommendation.price)}</div>
                    ${paragraph(packageWhy({ packageCode: input.packageCode, recommendation, projectTitle }))}
                    <ul style="margin:4px 0 0 20px; padding:0; font-size:15px; line-height:24px; color:${colorText};">
                      ${services.map((service) => `<li>${escapeHtml(service)}</li>`).join("")}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb; border:1px solid #d8dde3;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="font-family:Georgia, 'Times New Roman', serif; color:#0b1118; font-size:21px; line-height:27px; margin:0 0 6px 0;">Another Publishing Path</h2>
                    <div style="font-size:18px; line-height:24px; font-weight:bold; color:#0b1118;">${escapeHtml(alternate.name)} · ${escapeHtml(alternate.price)}</div>
                    <p style="margin:10px 0 0 0; font-size:15px; line-height:24px; color:${mutedText};">${escapeHtml(alternateText({ alternate }))}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px 28px;">
              <h2 style="font-family:Georgia, 'Times New Roman', serif; color:#0b1118; font-size:21px; line-height:27px; margin:0 0 8px 0;">Recommended Imprint</h2>
              <p style="margin:0; font-size:16px; line-height:25px; color:${colorText};"><strong>${escapeHtml(input.imprintLabel || "J Merrill Publishing")}</strong></p>
              <p style="margin:8px 0 0 0; font-size:15px; line-height:24px; color:${mutedText};">${escapeHtml(imprintText({ projectTitle, imprintLabel: input.imprintLabel || "J Merrill Publishing" }))}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 28px 30px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1118;">
                <tr>
                  <td style="padding:22px; color:#ffffff;">
                    <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:22px; line-height:28px; margin:0 0 10px 0; color:#ffffff;">Ready to Move Forward?</h2>
                    <p style="margin:0 0 18px 0; font-size:15px; line-height:24px; color:#e4e8ee;">Reply with the package you would like to select. We will prepare your Author Workspace and guide you through the next steps.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background:#c7a45a;">
                          <a href="${replyHref}" style="display:inline-block; padding:12px 18px; color:#0b1118; text-decoration:none; font-weight:bold; font-size:15px;">Reply With My Selection</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0; font-size:13px; line-height:20px; color:#d7dde5;">You can also reply directly to this email at <a href="mailto:${BRAND_EMAIL}" style="color:#f1d68a;">${BRAND_EMAIL}</a>.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px; font-size:16px; line-height:25px; color:${colorText};">
              ${paragraph("Thank you again for inviting us to review your manuscript.")}
              ${paragraph("Whether you choose to move forward today or sometime in the future, we appreciate the opportunity to spend time with your work.")}
              ${paragraph("If you continue this journey with us, we will be honored to welcome you to the J Merrill Publishing family and walk alongside you from manuscript to publication and beyond.")}
              <p style="margin:0 0 4px 0;">With appreciation,</p>
              <p style="margin:0;"><strong>The Publishing Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#111a24; padding:22px 28px; color:#d7dde5; font-size:13px; line-height:20px;">
              <div style="font-weight:bold; color:#ffffff;">The Publishing Team</div>
              <div>${escapeHtml(BRAND_ENTITY)}</div>
              <div>${escapeHtml(BRAND_DESCRIPTOR)}</div>
              <div style="margin-top:8px;">${escapeHtml(BRAND_PHONE)} · <a href="mailto:${BRAND_EMAIL}" style="color:#f1d68a;">${BRAND_EMAIL}</a> · <a href="${BRAND_SITE}" style="color:#f1d68a;">jmerrill.pub</a></div>
              <div style="margin-top:8px; color:#c7a45a;">${escapeHtml(BRAND_TAGLINE)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainTextEmail(input) {
  const authorFirstName = firstNameFrom(input.authorName);
  const projectTitle = normalizeString(input.projectTitle) || "your manuscript";
  const recommendation = input.recommendedPackage || { name: "Professional Publishing Package", price: "$4,500" };
  const alternate = input.alternatePackage || { name: "Starter Publishing Package", price: "$1,999" };
  const summary = buildReviewSummary(input);
  return [
    "J MERRILL PUBLISHING",
    "Editorial Review & Publishing Recommendation",
    BRAND_DESCRIPTOR,
    "",
    `Good day, ${authorFirstName},`,
    "",
    `Thank you for trusting J Merrill Publishing with your manuscript, ${projectTitle}.`,
    "",
    "Before we ever ask an author to invest in us, we first invest in understanding their manuscript.",
    "",
    "Every book we receive is reviewed with one goal in mind: discovering what it needs to become the strongest version of itself and reach the readers it was written to serve.",
    "",
    "After completing our initial editorial review, we would like to share what we found and the publishing path we believe will best support your book.",
    "",
    "Editorial Review Summary",
    "",
    ...summary,
    "",
    "OUR RECOMMENDATION",
    recommendation.name,
    recommendation.price,
    "",
    stripTags(packageWhy({ packageCode: input.packageCode, recommendation, projectTitle })),
    "",
    ...recommendedServices(input.packageCode).map((service) => `- ${service}`),
    "",
    "Another Publishing Path",
    `${alternate.name} - ${alternate.price}`,
    alternateText({ alternate }),
    "",
    "Recommended Imprint",
    input.imprintLabel || "J Merrill Publishing",
    imprintText({ projectTitle, imprintLabel: input.imprintLabel || "J Merrill Publishing" }),
    "",
    "Ready to Move Forward?",
    "Reply with the package you would like to select. We will prepare your Author Workspace and guide you through the next steps.",
    `You can also reply directly to this email at ${BRAND_EMAIL}.`,
    "",
    "Thank you again for inviting us to review your manuscript.",
    "Whether you choose to move forward today or sometime in the future, we appreciate the opportunity to spend time with your work.",
    "If you continue this journey with us, we will be honored to welcome you to the J Merrill Publishing family and walk alongside you from manuscript to publication and beyond.",
    "",
    "With appreciation,",
    "",
    "The Publishing Team",
    BRAND_ENTITY,
    BRAND_DESCRIPTOR,
    `${BRAND_PHONE} · ${BRAND_EMAIL} · jmerrill.pub`,
    BRAND_TAGLINE
  ].join("\n");
}

function validateRenderedEmail({ html, text, subject }) {
  const blockers = [];
  const htmlBody = normalizeString(html);
  const textBody = normalizeString(text);
  if (subject !== SUBJECT) blockers.push("SUBJECT_NOT_CANONICAL");
  if (!htmlBody) blockers.push("HTML_BODY_MISSING");
  if (!textBody) blockers.push("PLAIN_TEXT_BODY_MISSING");
  if (!/<table\b/i.test(htmlBody)) blockers.push("TABLE_LAYOUT_MISSING");
  if (/<script\b|<link\b|<style\b/i.test(htmlBody)) blockers.push("UNSUPPORTED_EMAIL_MARKUP");
  if (!htmlBody.includes(PREHEADER)) blockers.push("PREHEADER_MISSING");
  if (!htmlBody.includes("J MERRILL PUBLISHING")) blockers.push("BRAND_HEADER_MISSING");
  if (!htmlBody.includes("OUR RECOMMENDATION")) blockers.push("RECOMMENDATION_PANEL_MISSING");
  if (!htmlBody.includes("Reply With My Selection")) blockers.push("CTA_MISSING");
  if (/Editorial Recommendation Letter for Untitled/i.test(subject)) blockers.push("PROVISIONAL_TITLE_IN_SUBJECT");
  if (/project fits naturally under/i.test(`${htmlBody}\n${textBody}`)) blockers.push("IMPRINT_LANGUAGE_IN_SUMMARY");
  return blockers.length === 0 ? { ok: true } : { ok: false, blockers };
}

function buildEditorialRecommendationEmail(input = {}) {
  const html = buildHtmlEmail(input);
  const text = buildPlainTextEmail(input);
  const validation = validateRenderedEmail({ html, text, subject: SUBJECT });
  return {
    ok: validation.ok,
    blockers: validation.blockers || [],
    templateName: TEMPLATE_NAME,
    templateVersion: TEMPLATE_VERSION,
    subject: SUBJECT,
    html,
    text,
    preheader: PREHEADER,
    checksums: {
      htmlSha256: checksum(html),
      textSha256: checksum(text)
    }
  };
}

module.exports = {
  TEMPLATE_NAME,
  TEMPLATE_VERSION,
  SUBJECT,
  PREHEADER,
  BRAND_ENTITY,
  BRAND_DESCRIPTOR,
  BRAND_TAGLINE,
  BRAND_SITE,
  BRAND_EMAIL,
  BRAND_PHONE,
  buildEditorialRecommendationEmail,
  validateRenderedEmail
};
