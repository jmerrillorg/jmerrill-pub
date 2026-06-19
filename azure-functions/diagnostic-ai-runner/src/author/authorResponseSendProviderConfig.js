"use strict";

/**
 * Governed provider boundary for approved author-facing response sends.
 */

const {
  INTERNAL_VISIBILITY_MAILBOX
} = require("./authorResponseDraftBuilder");
const {
  AUTHOR_RESPONSE_SEND_STATUS
} = require("./authorResponseSendApprovalModel");

const ENV_VARS = Object.freeze({
  enabled: "JM1_AUTHOR_RESPONSE_SEND_ENABLED",
  provider: "JM1_AUTHOR_RESPONSE_SEND_PROVIDER",
  from: "JM1_AUTHOR_RESPONSE_SEND_FROM",
  replyTo: "JM1_AUTHOR_RESPONSE_SEND_REPLY_TO",
  relayUrl: "JM1_AUTHOR_RESPONSE_SEND_RELAY_URL",
  relayKey: "JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY"
});

const PROVIDER = Object.freeze({
  INJECTED: "injected",
  ACS_RELAY: "acs-relay"
});

const CONFIG_ERROR_CODE = "AUTHOR_RESPONSE_SEND_PROVIDER_CONFIG_FAILED";
const APPROVED_INTERNAL_DOMAIN = "@jmerrill.one";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isApprovedInternalAddress(value) {
  const address = normalizeString(value).toLowerCase();
  return address.endsWith(APPROVED_INTERNAL_DOMAIN) && !address.endsWith("@jmerrill.pub");
}

function emailLooksValid(value) {
  const email = normalizeString(value);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function safeFailure(reason, input = null) {
  const approval = input?.sendApproval || input;
  return {
    ok: false,
    code: CONFIG_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(approval?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(approval?.intakeReferenceCode) || null
  };
}

function getAuthorResponseSendProviderConfig(env = process.env) {
  const enabled = normalizeString(env[ENV_VARS.enabled]) === "true";
  const providerName = normalizeString(env[ENV_VARS.provider]).toLowerCase();
  const from = normalizeString(env[ENV_VARS.from]);
  const replyTo = normalizeString(env[ENV_VARS.replyTo]);
  const relayUrl = normalizeString(env[ENV_VARS.relayUrl]);
  const relayKeyConfigured = Boolean(normalizeString(env[ENV_VARS.relayKey]));

  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.DISABLED,
      providerName: providerName || null,
      from: null,
      replyTo: null
    };
  }
  if (!providerName) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_PROVIDER_MISSING" };
  if (!Object.values(PROVIDER).includes(providerName)) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_PROVIDER_UNSUPPORTED" };
  if (!from || !isApprovedInternalAddress(from)) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_FROM_INVALID" };
  if (!replyTo || !isApprovedInternalAddress(replyTo)) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_REPLY_TO_INVALID" };
  if (providerName === PROVIDER.ACS_RELAY && !relayUrl) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_RELAY_URL_MISSING" };
  if (providerName === PROVIDER.ACS_RELAY && !relayKeyConfigured) return { ok: false, enabled: true, reason: "AUTHOR_RESPONSE_SEND_RELAY_KEY_MISSING" };

  return {
    ok: true,
    enabled: true,
    deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.PREPARED,
    providerName,
    from,
    replyTo,
    relayUrl,
    relayKeyConfigured
  };
}

function buildRelayUrl(baseUrl, route) {
  const value = normalizeString(baseUrl).replace(/\/+$/, "");
  if (value.endsWith(route)) return value;
  return `${value}/${route}`;
}

async function postRelayJson(url, relayKey, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-jm1-relay-key": relayKey
    },
    body: JSON.stringify(payload)
  });

  let body = {};
  try {
    body = await response.json();
  } catch (_err) {
    body = {};
  }

  if (!response.ok || body.accepted !== true) {
    throw new Error("ACS_RELAY_REJECTED");
  }

  return body;
}

function buildAuthorResponseRelayPayload(email) {
  const approval = email.sendApproval || {};
  return {
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId: approval.diagnosticId,
    intakeReferenceCode: approval.intakeReferenceCode,
    authorEmail: approval.authorEmail,
    authorName: approval.authorName,
    projectTitle: approval.projectTitle,
    subject: approval.draftSubject,
    body: approval.draftBody,
    templateName: approval.templateName,
    approvedBy: approval.approvedBy,
    approvedOn: approval.approvedOn,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    cc: [INTERNAL_VISIBILITY_MAILBOX]
  };
}

function resolveAuthorResponseSendProvider(config, providers = {}, env = process.env) {
  if (!config?.enabled) return { ok: false, reason: "AUTHOR_RESPONSE_SEND_DISABLED" };
  if (config.providerName === PROVIDER.INJECTED) {
    const provider = providers[PROVIDER.INJECTED] || providers.injected || null;
    if (!provider || typeof provider.send !== "function") {
      return { ok: false, reason: "AUTHOR_RESPONSE_SEND_PROVIDER_MISSING" };
    }
    return { ok: true, provider };
  }
  if (config.providerName === PROVIDER.ACS_RELAY) {
    return {
      ok: true,
      provider: {
        async send(email) {
          const result = await postRelayJson(
            buildRelayUrl(config.relayUrl, "api/send-approved-author-response"),
            env[ENV_VARS.relayKey],
            buildAuthorResponseRelayPayload(email)
          );
          return { messageId: result.providerMessageId };
        }
      }
    };
  }
  return { ok: false, reason: "AUTHOR_RESPONSE_SEND_PROVIDER_UNSUPPORTED" };
}

function validateAuthorResponseSendInput(input = {}) {
  if (!isPlainObject(input) || !isPlainObject(input.sendApproval)) {
    return { ok: false, reason: "MISSING_AUTHOR_SEND_APPROVAL" };
  }
  const approval = input.sendApproval;
  const authorEmail = normalizeString(approval.authorEmail);
  const to = Array.isArray(input.to) ? input.to.map(normalizeString).filter(Boolean) : [normalizeString(input.to || authorEmail)].filter(Boolean);
  const cc = Array.isArray(input.cc) ? input.cc.map(normalizeString).filter(Boolean) : [normalizeString(input.cc || INTERNAL_VISIBILITY_MAILBOX)].filter(Boolean);
  const bcc = Array.isArray(input.bcc) ? input.bcc.map(normalizeString).filter(Boolean) : [normalizeString(input.bcc)].filter(Boolean);

  if (approval.sendApproved !== true || normalizeString(approval.decision) !== "APPROVE_AUTHOR_SEND") {
    return { ok: false, reason: "AUTHOR_SEND_NOT_APPROVED" };
  }
  if (!emailLooksValid(authorEmail)) return { ok: false, reason: "AUTHOR_EMAIL_INVALID" };
  if (to.length !== 1 || to[0].toLowerCase() !== authorEmail.toLowerCase()) {
    return { ok: false, reason: "AUTHOR_RECIPIENT_INVALID" };
  }
  if (!cc.includes(INTERNAL_VISIBILITY_MAILBOX) || bcc.length > 0) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_REQUIRED" };
  }
  if (cc.some((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: "UNAPPROVED_RECIPIENT_PRESENT" };
  }
  if (to.concat(cc, bcc).some((recipient) => recipient.toLowerCase().endsWith("@jmerrill.pub"))) {
    return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED" };
  }
  if (!normalizeString(approval.draftSubject)) return { ok: false, reason: "AUTHOR_RESPONSE_SUBJECT_MISSING" };
  if (!normalizeString(approval.draftBody)) return { ok: false, reason: "AUTHOR_RESPONSE_BODY_MISSING" };
  if (approval.internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  if (approval.futureSendRequiresInternalCopy !== true) return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  if (approval.futureSendRequiresDataverseLog !== true) return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };

  return { ok: true, to, cc, bcc };
}

function buildAuthorResponseEmail(input = {}, config = getAuthorResponseSendProviderConfig()) {
  const validation = validateAuthorResponseSendInput(input);
  if (!validation.ok) return safeFailure(validation.reason, input);
  if (!config?.enabled) {
    return {
      ok: true,
      disabled: true,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.DISABLED,
      email: null
    };
  }
  if (!config.ok) return safeFailure(config.reason || "AUTHOR_RESPONSE_SEND_CONFIG_INVALID", input);

  return {
    ok: true,
    disabled: false,
    deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.PREPARED,
    email: {
      to: validation.to,
      cc: validation.cc,
      bcc: [],
      from: config.from,
      replyTo: config.replyTo,
      subject: input.sendApproval.draftSubject,
      body: input.sendApproval.draftBody,
      templateName: input.sendApproval.templateName,
      providerName: config.providerName,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      sendApproval: input.sendApproval
    }
  };
}

async function sendConfiguredAuthorResponse({
  input = {},
  env = process.env,
  providers = {}
} = {}) {
  const config = getAuthorResponseSendProviderConfig(env);
  const emailResult = buildAuthorResponseEmail(input, config);
  if (!emailResult.ok) return emailResult;
  if (!config.enabled) {
    return {
      ok: true,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.DISABLED,
      authorEmailStatus: AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT,
      providerCalled: false,
      diagnosticId: input.sendApproval?.diagnosticId || null,
      intakeReferenceCode: input.sendApproval?.intakeReferenceCode || null
    };
  }
  const providerResolution = resolveAuthorResponseSendProvider(config, providers, env);
  if (!providerResolution.ok) return safeFailure(providerResolution.reason, input);

  try {
    const result = await providerResolution.provider.send(emailResult.email);
    return {
      ok: true,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
      authorEmailStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
      internalVisibilityStatus: AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED,
      providerName: config.providerName,
      providerMessageId: normalizeString(result?.messageId || result?.operationId) || null,
      providerCalled: true,
      diagnosticId: input.sendApproval.diagnosticId,
      intakeReferenceCode: input.sendApproval.intakeReferenceCode
    };
  } catch (_err) {
    return {
      ...safeFailure("AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED", input),
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.FAILED,
      authorEmailStatus: AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT
    };
  }
}

module.exports = {
  getAuthorResponseSendProviderConfig,
  resolveAuthorResponseSendProvider,
  validateAuthorResponseSendInput,
  buildAuthorResponseEmail,
  sendConfiguredAuthorResponse,
  ENV_VARS,
  PROVIDER,
  CONFIG_ERROR_CODE,
  APPROVED_INTERNAL_DOMAIN
};
