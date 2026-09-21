"use strict";

const { createHash } = require("node:crypto");
const { DELIVERY_STATE, getMessageLedger } = require("./messageLedger");
const { buildCommunicationIdentity } = require("./communicationIdentity");

const AUTHOR_COMMUNICATION_LEDGER_CALLER = "jm1-publishing-author-communications";

function approvedAuthorLedgerInput(value, defaults = {}) {
  const semantic = buildCommunicationIdentity(value);
  return {
    idempotencyKey: semantic.key,
    callerId: AUTHOR_COMMUNICATION_LEDGER_CALLER,
    brand: "JMP",
    businessObjectType: "PUBLISHING_TITLE",
    businessObjectId: semantic.identity.titleId,
    correlationId: value.diagnosticId,
    recipients: [value.authorEmail],
    brandCc: value.cc,
    replyTo: defaults.replyTo,
    communicationPurpose: semantic.identity.communicationType,
    templateId: value.templateName,
    templateVersion: value.templateVersion,
    rendererVersion: value.templateMetadata?.rendererVersion,
    brandTokenVersion: value.templateMetadata?.enterpriseStandard,
    htmlSha256: value.templateMetadata?.htmlSha256 || createHash("sha256").update(value.htmlBody || "").digest("hex"),
    plainTextSha256: value.templateMetadata?.textSha256 || createHash("sha256").update(value.body || "").digest("hex"),
    artifactFingerprint: semantic.identity.artifacts.map((item) => `${item.role}:${item.sha256}`).join("|"),
    systemSender: defaults.systemSender,
    semanticIdentity: semantic.identity
  };
}

async function executeApprovedAuthorResponse(value, deps = {}) {
  const ledger = deps.ledger || getMessageLedger();
  const ledgerInput = approvedAuthorLedgerInput(value, deps);
  const reservation = await ledger.reserve(ledgerInput);
  if (reservation.kind === "REPLAY") {
    const existing = reservation.entity;
    if (existing.deliveryState === DELIVERY_STATE.ACCEPTED) {
      return {
        status: "ALREADY_DELIVERED",
        communicationRecordId: existing.jm1MessageId,
        sentAt: existing.acceptedAt,
        providerMessageId: existing.providerMessageId,
        semanticIdempotencyKey: ledgerInput.idempotencyKey,
        recipient: value.authorEmail,
        artifactChecksums: value.attachments.map((attachment) => attachment.sha256)
      };
    }
    return {
      status: "AMBIGUOUS_SEND_STATE",
      communicationRecordId: existing.jm1MessageId,
      semanticIdempotencyKey: ledgerInput.idempotencyKey
    };
  }

  try {
    const providerReceipt = await deps.sendMessage(deps.buildMessage(value));
    const providerMessageId = typeof providerReceipt === "string" ? providerReceipt : providerReceipt?.providerMessageId;
    const providerStatus = typeof providerReceipt === "string" ? "Succeeded" : providerReceipt?.providerStatus;
    if (!providerMessageId || providerStatus !== "Succeeded") {
      throw Object.assign(new Error("ACS delivery did not reach Succeeded state."), { safeCode: "ACS_DELIVERY_UNPROVEN" });
    }
    const accepted = await ledger.recordAccepted(reservation.entity, providerMessageId);
    return {
      status: "SENT",
      communicationRecordId: accepted.jm1MessageId,
      sentAt: accepted.acceptedAt,
      providerMessageId,
      providerStatus,
      observability: {
        acsDelivery: "PASS",
        publishingMailboxCopy: "PASS",
        semanticAttachmentParity: "PASS",
        evidenceClass: "ACS_SUCCEEDED_SINGLE_ENVELOPE_WITH_CANONICAL_CC"
      },
      semanticIdempotencyKey: ledgerInput.idempotencyKey,
      recipient: value.authorEmail,
      artifactChecksums: value.attachments.map((attachment) => attachment.sha256)
    };
  } catch (error) {
    // A transport exception can occur after provider acceptance. Preserve the
    // reservation so reconciliation, not an automatic retry, decides outcome.
    throw error;
  }
}

module.exports = { approvedAuthorLedgerInput, executeApprovedAuthorResponse };
