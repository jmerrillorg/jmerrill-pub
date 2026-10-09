"use strict";

const { createHash } = require("node:crypto");
const { resolveSenderProfile } = require("../policy/acsSenderRegistry");

const CALLER_ID = "one-bp09-productions-prod";
const TEMPLATE_ID = "PRODUCTIONS.BP09_NOTICE";
const TEMPLATE_VERSION = "1.0.0";
const REVIEW_TEMPLATES = Object.freeze({
  "PRODUCTIONS.BP09_REVIEW_OVERDUE": "overdue",
  "PRODUCTIONS.BP09_REVIEW_RESOLVED": "resolved"
});
const TOP_FIELDS = ["brand", "to", "templateId", "templateVersion", "templateData"];
const DATA_FIELDS = ["referenceId", "leadId"];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function renderProductionsBp09Notice(payload) {
  const deny = (reason) => ({ ok: false, reason });
  // This internal-only template cannot accept arbitrary content, links, recipients,
  // or correlation/idempotency overrides, including fields the generic route ignores.
  if (!exactKeys(payload, TOP_FIELDS)) return deny("BP09_REFERENCE_ENVELOPE_REQUIRED");
  if (payload.brand !== "JMPRODUCTIONS") return deny("BP09_BRAND_MISMATCH");
  if (payload.to !== "productions@jmerrill.one") return deny("BP09_DESTINATION_MISMATCH");
  const phase = Object.hasOwn(REVIEW_TEMPLATES, payload.templateId || "") ? REVIEW_TEMPLATES[payload.templateId] : undefined;
  if ((!phase && payload.templateId !== TEMPLATE_ID) || payload.templateVersion !== TEMPLATE_VERSION) {
    return deny("BP09_TEMPLATE_MISMATCH");
  }
  const fields = phase ? [...DATA_FIELDS, "transitionId"] : DATA_FIELDS;
  if (!exactKeys(payload.templateData, fields)
      || !fields.every((field) => typeof payload.templateData[field] === "string"
        && GUID.test(payload.templateData[field])
        && payload.templateData[field] !== "00000000-0000-0000-0000-000000000000")) {
    return deny("BP09_REFERENCE_IDS_REQUIRED");
  }
  const { referenceId, leadId, transitionId } = payload.templateData;
  const profile = resolveSenderProfile("JMPRODUCTIONS");
  const recordLink = `https://jm1hq.crm.dynamics.com/main.aspx?pagetype=entityrecord&etn=lead&id=${leadId}`;
  const subject = phase === "overdue" ? "Productions inquiry review overdue"
    : phase === "resolved" ? "Productions inquiry review resolved" : "Productions inquiry ready for review";
  const intro = phase === "overdue" ? "A Productions inquiry has passed its internal review deadline."
    : phase === "resolved" ? "A Productions inquiry review checkpoint has been resolved."
      : "A Productions inquiry is ready for internal review.";
  const plainText = `${intro}\n\nReference: ${referenceId}\nOpen the secure record: ${recordLink}\n\nJ Merrill Productions`;
  const html = `<!doctype html><html><body><p>${intro}</p><p>Reference: ${referenceId}</p><p><a href="${recordLink.replaceAll("&", "&amp;")}">Open the secure record</a></p><p>J Merrill Productions</p></body></html>`;
  const sha256 = (text) => createHash("sha256").update(text).digest("hex");
  return { ok: true, value: {
    brand: "JMPRODUCTIONS", profile,
    senderAddress: profile.acsFrom, replyTo: profile.replyTo,
    to: [{ address: "productions@jmerrill.one", displayName: profile.organizationDisplayName }],
    cc: [{ address: profile.ccAddress, displayName: profile.organizationDisplayName }],
    subject, plainText, html,
    messageType: phase ? `INTERNAL_REVIEW_${phase.toUpperCase()}` : "INTERNAL_INQUIRY_NOTICE", riskClassification: "ROUTINE",
    sourceRecord: referenceId, businessObjectType: "BP09_INTAKE_RECEIPT",
    businessObjectId: referenceId, correlationId: transitionId || referenceId,
    templateId: payload.templateId, templateVersion: TEMPLATE_VERSION,
    idempotencyKey: phase ? `bp09:productions:review:${phase}:${referenceId}:${transitionId}` : `bp09:productions:notice:${referenceId}`,
    renderMetadata: {
      audience: "INTERNAL_OPERATIONS", rendererVersion: "PRODUCTIONS-BP09-v1.0.0",
      brandTokenVersion: profile.policyId,
      htmlSha256: sha256(html), plainTextSha256: sha256(plainText)
    }
  } };
}

module.exports = { CALLER_ID, TEMPLATE_ID, TEMPLATE_VERSION, REVIEW_TEMPLATES, renderProductionsBp09Notice };
