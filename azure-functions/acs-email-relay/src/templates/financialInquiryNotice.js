"use strict";

const { createHash } = require("node:crypto");
const { resolveSenderProfile } = require("../policy/acsSenderRegistry");

const CALLER_ID = "financial-inquiry-function-prod";
const TEMPLATE_ID = "FINANCIAL.INQUIRY_NOTICE";
const TEMPLATE_VERSION = "1.0.0";
const TOP_FIELDS = ["brand", "to", "templateId", "templateVersion", "templateData"];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function renderFinancialInquiryNotice(payload) {
  const deny = (reason) => ({ ok: false, reason });
  // A receipt reference is the only variable; no client or inquiry content.
  if (!exactKeys(payload, TOP_FIELDS)) return deny("FINANCIAL_REFERENCE_ENVELOPE_REQUIRED");
  if (payload.brand !== "JMF") return deny("FINANCIAL_BRAND_MISMATCH");
  if (payload.to !== "financial@jmerrill.one") return deny("FINANCIAL_DESTINATION_MISMATCH");
  if (payload.templateId !== TEMPLATE_ID || payload.templateVersion !== TEMPLATE_VERSION) {
    return deny("FINANCIAL_TEMPLATE_MISMATCH");
  }
  if (!exactKeys(payload.templateData, ["referenceId"]) || typeof payload.templateData.referenceId !== "string"
      || payload.templateData.referenceId.length !== 36 || !GUID.test(payload.templateData.referenceId)
      || payload.templateData.referenceId === "00000000-0000-0000-0000-000000000000") {
    return deny("FINANCIAL_REFERENCE_ID_REQUIRED");
  }
  const { referenceId } = payload.templateData;
  const profile = resolveSenderProfile("JMF");
  const subject = "Financial inquiry ready for review";
  const plainText = `An inquiry is ready for internal review.\n\nReference: ${referenceId}\nReview the governed Financial inquiry receipt.\n\nJ Merrill Financial`;
  const html = `<!doctype html><html><body><p>An inquiry is ready for internal review.</p><p>Reference: ${referenceId}</p><p>Review the governed Financial inquiry receipt.</p><p>J Merrill Financial</p></body></html>`;
  const sha256 = text => createHash("sha256").update(text).digest("hex");
  return { ok: true, value: {
    brand: "JMF", profile, senderAddress: profile.acsFrom, replyTo: profile.replyTo,
    to: [{ address: "financial@jmerrill.one", displayName: profile.organizationDisplayName }],
    cc: [{ address: profile.ccAddress, displayName: profile.organizationDisplayName }],
    subject, plainText, html,
    messageType: "INTERNAL_INQUIRY_NOTICE", riskClassification: "ROUTINE",
    sourceRecord: referenceId, businessObjectType: "FINANCIAL_INQUIRY_RECEIPT",
    businessObjectId: referenceId, correlationId: referenceId,
    templateId: TEMPLATE_ID, templateVersion: TEMPLATE_VERSION,
    idempotencyKey: `financial:inquiry:notice:${referenceId}`,
    renderMetadata: { audience: "INTERNAL_OPERATIONS", rendererVersion: "FINANCIAL-INQUIRY-NOTICE-v1.0.0",
      brandTokenVersion: profile.policyId, htmlSha256: sha256(html), plainTextSha256: sha256(plainText) }
  } };
}

module.exports = { CALLER_ID, TEMPLATE_ID, TEMPLATE_VERSION, renderFinancialInquiryNotice };
