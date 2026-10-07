"use strict";

const { renderPublishingServiceCorrespondence } = require("../generated/communications/jm1-enterprise-communication-renderer");
const { executeRenderedPublishingDelivery } = require("./renderedPublishingDelivery");

function validateIntakeOperationalAlert(value) {
  const keys = ["reference", "recordId", "status", "failureCode", "firstObservedAt"];
  if (!value || Object.keys(value).some(key => !keys.includes(key))) return { ok: false, reason: "UNEXPECTED_ALERT_FIELD" };
  if (!/^JMP-INT-\d{6}-[A-Z0-9]{6}$/.test(value.reference || "") ||
      !/^[a-f0-9-]{36}$/i.test(value.recordId || "") ||
      !["FAILED", "RESOLVED"].includes(value.status) ||
      !/^[A-Z_]{3,80}$/.test(value.failureCode || "") ||
      !/^\d{4}-\d{2}-\d{2}T/.test(value.firstObservedAt || "") ||
      !Number.isFinite(Date.parse(value.firstObservedAt))) return { ok: false, reason: "INVALID_ALERT_IDENTITY" };
  return { ok: true, value };
}

async function sendIntakeOperationalAlert(value, deps) {
  const validation = validateIntakeOperationalAlert(value);
  if (!validation.ok) throw Object.assign(new Error(validation.reason), { safeCode: validation.reason });
  const body = ["Internal operational notification. No inquiry or manuscript content is included.",
    `Receipt: ${value.reference}`, `Intake record: ${value.recordId}`, `State: ${value.status}`,
    `Classification: ${value.failureCode}`, `First observed: ${value.firstObservedAt}`,
    value.status === "RESOLVED" ? "Durable intake acceptance recovered. Manual Publishing review remains required."
      : "Incomplete receipt requires Publishing operations attention. The receipt owner applies bounded recovery; no author resubmission or title processing is authorized."].join("\n\n");
  const subject = `Publishing intake ${value.status} - ${value.reference}`;
  const rendered = renderPublishingServiceCorrespondence({ subject, body, authorName: "Publishing Operations",
    templateName: "INTAKE_OPERATIONAL_ALERT_V1", templateVersion: "1" });
  return executeRenderedPublishingDelivery({ reference: value.reference, purpose: `INTAKE_OPERATIONAL_${value.status}`,
    metadata: { ...rendered.metadata, templateName: "INTAKE_OPERATIONAL_ALERT_V1", templateVersion: "1" },
    message: { senderAddress: deps.senderAddress, content: { subject, html: rendered.html, plainText: rendered.text },
      recipients: { to: [{ address: "jm1-admin@jmerrill.one" }], cc: [{ address: "publishing@jmerrill.one" }] },
      replyTo: [{ address: "publishing@jmerrill.one" }] } }, deps);
}

module.exports = { validateIntakeOperationalAlert, sendIntakeOperationalAlert };
