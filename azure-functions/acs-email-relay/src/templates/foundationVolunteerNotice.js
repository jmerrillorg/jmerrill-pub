"use strict";

const { createHash } = require("node:crypto");
const { resolveSenderProfile } = require("../policy/acsSenderRegistry");

const CALLER_ID = "foundation-volunteer-web-prod";
const TEMPLATE_ID = "FOUNDATION.VOLUNTEER_INQUIRY_NOTICE";
const TEMPLATE_VERSION = "1.0.0";
const TOP_FIELDS = ["brand", "to", "templateId", "templateVersion", "templateData"];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function renderFoundationVolunteerNotice(payload) {
  const deny = (reason) => ({ ok: false, reason });
  // The only variable is an internal lookup token. No constituent content or URLs.
  if (!exactKeys(payload, TOP_FIELDS)) return deny("FOUNDATION_REFERENCE_ENVELOPE_REQUIRED");
  if (payload.brand !== "JMFN") return deny("FOUNDATION_BRAND_MISMATCH");
  if (payload.to !== "foundation@jmerrill.one") return deny("FOUNDATION_DESTINATION_MISMATCH");
  if (payload.templateId !== TEMPLATE_ID || payload.templateVersion !== TEMPLATE_VERSION) {
    return deny("FOUNDATION_TEMPLATE_MISMATCH");
  }
  if (!exactKeys(payload.templateData, ["referenceId"]) || typeof payload.templateData.referenceId !== "string"
      || payload.templateData.referenceId.length !== 36
      || !GUID.test(payload.templateData.referenceId)
      || payload.templateData.referenceId === "00000000-0000-0000-0000-000000000000") {
    return deny("FOUNDATION_REFERENCE_ID_REQUIRED");
  }
  const { referenceId } = payload.templateData;
  const profile = resolveSenderProfile("JMFN");
  const subject = "Volunteer inquiry ready for review";
  const plainText = `A volunteer inquiry is ready for internal review.\n\nReference: ${referenceId}\nUse this reference in the Foundation reviewer app.\n\nJ Merrill Foundation`;
  const html = `<!doctype html><html><body><p>A volunteer inquiry is ready for internal review.</p><p>Reference: ${referenceId}</p><p>Use this reference in the Foundation reviewer app.</p><p>J Merrill Foundation</p></body></html>`;
  const sha256 = (text) => createHash("sha256").update(text).digest("hex");
  return { ok: true, value: {
    brand: "JMFN", profile, senderAddress: profile.acsFrom, replyTo: profile.replyTo,
    to: [{ address: "foundation@jmerrill.one", displayName: profile.organizationDisplayName }],
    cc: [{ address: profile.ccAddress, displayName: profile.organizationDisplayName }],
    subject, plainText, html,
    messageType: "INTERNAL_VOLUNTEER_INQUIRY_NOTICE", riskClassification: "ROUTINE",
    sourceRecord: referenceId, businessObjectType: "FOUNDATION_VOLUNTEER_INQUIRY_RECEIPT",
    businessObjectId: referenceId, correlationId: referenceId,
    templateId: TEMPLATE_ID, templateVersion: TEMPLATE_VERSION,
    idempotencyKey: `foundation:volunteer-inquiry:notice:${referenceId}`,
    renderMetadata: { audience: "INTERNAL_OPERATIONS", rendererVersion: "FOUNDATION-VOLUNTEER-NOTICE-v1.0.0",
      brandTokenVersion: profile.policyId, htmlSha256: sha256(html), plainTextSha256: sha256(plainText) }
  } };
}

module.exports = { CALLER_ID, TEMPLATE_ID, TEMPLATE_VERSION, renderFoundationVolunteerNotice };
