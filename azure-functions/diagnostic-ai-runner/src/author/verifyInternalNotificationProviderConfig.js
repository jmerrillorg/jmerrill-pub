"use strict";

/**
 * No-send readiness verification for Azure/internal notification settings.
 *
 * This module validates the governed internal notification configuration path
 * without creating mail, calling providers, running diagnostics, or opening the
 * AI execution gate.
 */

const {
  getInternalNotificationProviderConfig,
  ENV_VARS,
  CONFIG_ERROR_CODE
} = require("./internalAuthorDraftReviewNotificationProviderConfig");
const {
  INTERNAL_VISIBILITY_MAILBOX
} = require("./authorResponseDraftBuilder");

const READY_STATUS = "READY_FOR_INTERNAL_NOTIFICATION_TEST";
const INCOMPLETE_STATUS = "INTERNAL_NOTIFICATION_CONFIG_INCOMPLETE";
const AI_GATE_REASON = "AI_EXECUTION_GATE_MUST_REMAIN_CLOSED";
const RECIPIENT_REASON = "INTERNAL_NOTIFICATION_RECIPIENT_INVALID";
const AUTHOR_RECIPIENT_REASON = "AUTHOR_RECIPIENT_BLOCKED";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRecipients(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(normalizeString).filter(Boolean);
  const single = normalizeString(value);
  return single ? [single] : [];
}

function safeFailure(reason, config = {}) {
  return {
    ok: false,
    code: CONFIG_ERROR_CODE,
    status: INCOMPLETE_STATUS,
    reason,
    enabled: config.enabled === true,
    providerName: config.providerName || null,
    recipient: INTERNAL_VISIBILITY_MAILBOX
  };
}

function intendedRecipientsValid({ to, cc, bcc, authorEmail }) {
  const normalizedTo = normalizeRecipients(to === undefined ? INTERNAL_VISIBILITY_MAILBOX : to);
  const normalizedCc = normalizeRecipients(cc);
  const normalizedBcc = normalizeRecipients(bcc);
  const allRecipients = [...normalizedTo, ...normalizedCc, ...normalizedBcc].map((recipient) => recipient.toLowerCase());
  const normalizedAuthor = normalizeString(authorEmail).toLowerCase();

  if (normalizedAuthor && allRecipients.includes(normalizedAuthor)) {
    return { ok: false, reason: AUTHOR_RECIPIENT_REASON };
  }
  if (normalizedTo.length !== 1 || normalizedTo[0] !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: RECIPIENT_REASON };
  }
  if (normalizedCc.length > 0 || normalizedBcc.length > 0) {
    return { ok: false, reason: RECIPIENT_REASON };
  }
  if (allRecipients.some((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: RECIPIENT_REASON };
  }

  return { ok: true };
}

function verifyInternalNotificationProviderConfig({
  env = process.env,
  to = INTERNAL_VISIBILITY_MAILBOX,
  cc = [],
  bcc = [],
  authorEmail = ""
} = {}) {
  if (normalizeString(env.JM1_AI_EXECUTION_ENABLED) === "true") {
    return safeFailure(AI_GATE_REASON);
  }

  const recipientValidation = intendedRecipientsValid({ to, cc, bcc, authorEmail });
  if (!recipientValidation.ok) {
    return safeFailure(recipientValidation.reason);
  }

  const config = getInternalNotificationProviderConfig(env);
  if (!config.ok) {
    return safeFailure(config.reason || "INTERNAL_NOTIFICATION_CONFIG_INVALID", config);
  }
  if (!config.enabled) {
    return safeFailure("INTERNAL_NOTIFICATIONS_DISABLED", config);
  }

  return {
    ok: true,
    code: null,
    status: READY_STATUS,
    enabled: true,
    providerName: config.providerName,
    fromConfigured: true,
    replyToConfigured: true,
    recipient: INTERNAL_VISIBILITY_MAILBOX,
    providerCalled: false,
    sendsEmail: false
  };
}

module.exports = {
  verifyInternalNotificationProviderConfig,
  intendedRecipientsValid,
  READY_STATUS,
  INCOMPLETE_STATUS,
  AI_GATE_REASON,
  RECIPIENT_REASON,
  AUTHOR_RECIPIENT_REASON,
  ENV_VARS
};
