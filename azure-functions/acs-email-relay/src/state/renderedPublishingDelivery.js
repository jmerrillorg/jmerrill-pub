"use strict";

const { createHash } = require("node:crypto");
const { DELIVERY_STATE, getMessageLedger } = require("./messageLedger");

async function executeRenderedPublishingDelivery(input, deps) {
  const metadata = input.metadata;
  if (!input.reference || !metadata?.rendererVersion || !metadata?.templateVersion
      || !metadata?.htmlSha256 || !metadata?.textSha256) {
    throw Object.assign(new Error("Rendered communication authority is incomplete."), { safeCode: "RENDER_AUTHORITY_REQUIRED" });
  }
  const ledger = deps.ledger || getMessageLedger();
  const message = input.message;
  const digest = value => createHash("sha256").update(value || "").digest("hex");
  if (digest(message.content.html) !== metadata.htmlSha256
      || digest(message.content.plainText) !== metadata.textSha256) {
    throw Object.assign(new Error("Rendered communication digest mismatch."), { safeCode: "RENDER_DIGEST_MISMATCH" });
  }
  const reservation = await ledger.reserve({
    callerId: "jm1-publishing-rendered-intake",
    brand: "JMP",
    businessObjectType: "PUBLISHING_INTAKE",
    businessObjectId: input.reference,
    correlationId: input.correlationId || input.reference,
    communicationPurpose: input.purpose,
    idempotencyKey: `publishing-rendered-intake:v1:${input.reference}:${input.purpose}`,
    recipients: message.recipients.to.map(item => item.address),
    brandCc: (message.recipients.cc || []).map(item => item.address),
    replyTo: message.replyTo?.[0]?.address,
    systemSender: message.senderAddress,
    templateId: metadata.templateName,
    templateVersion: metadata.templateVersion,
    rendererVersion: metadata.rendererVersion,
    brandTokenVersion: metadata.standard,
    htmlSha256: metadata.htmlSha256,
    plainTextSha256: metadata.textSha256,
    artifactFingerprint: digest(JSON.stringify((message.attachments || []).map(item => ({
      name: item.name, contentType: item.contentType, sha256: digest(item.contentInBase64)
    }))))
  });
  if (reservation.kind === "REPLAY") {
    const prior = reservation.entity;
    if (prior.deliveryState !== DELIVERY_STATE.ACCEPTED || !prior.providerMessageId) {
      throw Object.assign(new Error("Prior transport outcome requires reconciliation."), { safeCode: "AMBIGUOUS_SEND_STATE" });
    }
    return { providerMessageId: prior.providerMessageId, providerStatus: "Succeeded",
      communicationRecordId: prior.jm1MessageId, replay: true };
  }
  // Preserve the reservation on transport/audit ambiguity; never auto-resend.
  const receipt = await deps.sendMessage(message);
  if (receipt?.providerStatus !== "Succeeded" || !receipt?.providerMessageId) {
    throw Object.assign(new Error("Provider completion is unproven."), { safeCode: "ACS_DELIVERY_UNPROVEN" });
  }
  const accepted = await ledger.recordAccepted(reservation.entity, receipt.providerMessageId);
  return { ...receipt, communicationRecordId: accepted.jm1MessageId, replay: false };
}

module.exports = { executeRenderedPublishingDelivery };
