"use strict";

/**
 * Governed internal notification provider configuration.
 *
 * This module gates live internal notification delivery separately from the AI
 * execution gate. It does not create author-facing mail, Opportunities, Flow D
 * activation, diagnostic runs, or production activation.
 */

const {
  INTERNAL_VISIBILITY_MAILBOX
} = require("./authorResponseDraftBuilder");
const {
  buildInternalAuthorDraftReviewNotificationEmail,
  sendInternalAuthorDraftReviewNotification,
  INTERNAL_MAIL_ERROR_CODE
} = require("./internalAuthorDraftReviewNotificationMailer");
const {
  buildAuthorDraftReviewNotificationPersistenceRecord,
  persistAuthorDraftReviewNotification,
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS
} = require("./authorDraftReviewNotificationPersister");

const ENV_VARS = Object.freeze({
  enabled: "JM1_INTERNAL_NOTIFICATIONS_ENABLED",
  provider: "JM1_INTERNAL_NOTIFICATION_PROVIDER",
  from: "JM1_INTERNAL_NOTIFICATION_FROM",
  replyTo: "JM1_INTERNAL_NOTIFICATION_REPLY_TO"
});

const PROVIDER = Object.freeze({
  INJECTED: "injected"
});

const CONFIG_ERROR_CODE = "INTERNAL_NOTIFICATION_PROVIDER_CONFIG_FAILED";
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

function safeFailure(reason, input = null) {
  const notification = input?.notification || input;
  return {
    ok: false,
    code: CONFIG_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(notification?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(notification?.intakeReferenceCode) || null
  };
}

function getInternalNotificationProviderConfig(env = process.env) {
  const enabled = normalizeString(env[ENV_VARS.enabled]) === "true";
  const providerName = normalizeString(env[ENV_VARS.provider]).toLowerCase();
  const from = normalizeString(env[ENV_VARS.from]);
  const replyTo = normalizeString(env[ENV_VARS.replyTo]);

  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.DISABLED,
      providerName: providerName || null,
      from: null,
      replyTo: null
    };
  }

  if (!providerName) {
    return { ok: false, enabled: true, reason: "INTERNAL_NOTIFICATION_PROVIDER_MISSING" };
  }
  if (!Object.values(PROVIDER).includes(providerName)) {
    return { ok: false, enabled: true, reason: "INTERNAL_NOTIFICATION_PROVIDER_UNSUPPORTED" };
  }
  if (!from || !isApprovedInternalAddress(from)) {
    return { ok: false, enabled: true, reason: "INTERNAL_NOTIFICATION_FROM_INVALID" };
  }
  if (!replyTo || !isApprovedInternalAddress(replyTo)) {
    return { ok: false, enabled: true, reason: "INTERNAL_NOTIFICATION_REPLY_TO_INVALID" };
  }

  return {
    ok: true,
    enabled: true,
    deliveryStatus: INTERNAL_NOTIFICATION_STATUS.PREPARED,
    providerName,
    from,
    replyTo
  };
}

function resolveInternalNotificationProvider(config, providers = {}) {
  if (!config?.enabled) return { ok: false, reason: "INTERNAL_NOTIFICATIONS_DISABLED" };
  if (config.providerName === PROVIDER.INJECTED) {
    const provider = providers[PROVIDER.INJECTED] || providers.injected || null;
    if (!provider || typeof provider.send !== "function") {
      return { ok: false, reason: "INTERNAL_MAIL_PROVIDER_MISSING" };
    }
    return { ok: true, provider };
  }
  return { ok: false, reason: "INTERNAL_NOTIFICATION_PROVIDER_UNSUPPORTED" };
}

function buildConfiguredInternalNotificationEmail(input = {}, config = getInternalNotificationProviderConfig()) {
  const emailResult = buildInternalAuthorDraftReviewNotificationEmail(input);
  if (!emailResult.ok) return emailResult;

  if (!config?.enabled) {
    return {
      ok: true,
      disabled: true,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.DISABLED,
      authorEmailStatus: AUTHOR_EMAIL_STATUS,
      email: {
        ...emailResult.email,
        from: null,
        replyTo: null
      }
    };
  }

  if (!config.ok) {
    return safeFailure(config.reason || "INTERNAL_NOTIFICATION_CONFIG_INVALID", input);
  }

  return {
    ok: true,
    disabled: false,
    deliveryStatus: INTERNAL_NOTIFICATION_STATUS.PREPARED,
    authorEmailStatus: AUTHOR_EMAIL_STATUS,
    email: {
      ...emailResult.email,
      from: config.from,
      replyTo: config.replyTo,
      providerName: config.providerName
    }
  };
}

async function deliverConfiguredInternalAuthorDraftReviewNotification({
  input = {},
  env = process.env,
  providers = {},
  dataverseClient = null,
  requireDataverseLog = false
} = {}) {
  if (!isPlainObject(input) || !isPlainObject(input.notification)) {
    return safeFailure("MISSING_NOTIFICATION", input);
  }

  const config = getInternalNotificationProviderConfig(env);
  const emailResult = buildConfiguredInternalNotificationEmail(input, config);
  if (!emailResult.ok) return emailResult;

  if (!config.enabled) {
    const disabledRecord = buildAuthorDraftReviewNotificationPersistenceRecord({
      notification: input.notification,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.DISABLED,
      messageSubject: emailResult.email.subject,
      providerName: "disabled"
    });
    return {
      ok: true,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.DISABLED,
      authorEmailStatus: AUTHOR_EMAIL_STATUS,
      notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
      providerCalled: false,
      persistenceRecord: disabledRecord.ok ? disabledRecord.persistenceRecord : null,
      diagnosticId: input.notification.diagnosticId,
      intakeReferenceCode: input.notification.intakeReferenceCode
    };
  }

  const providerResolution = resolveInternalNotificationProvider(config, providers);
  if (!providerResolution.ok) {
    const failedRecord = buildAuthorDraftReviewNotificationPersistenceRecord({
      notification: input.notification,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.FAILED,
      messageSubject: emailResult.email.subject,
      providerName: config.providerName || "missing"
    });
    return {
      ...safeFailure(providerResolution.reason, input),
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.FAILED,
      persistenceRecord: failedRecord.ok ? failedRecord.persistenceRecord : null
    };
  }

  const sendResult = await sendInternalAuthorDraftReviewNotification(input, {
    async send(email) {
      return providerResolution.provider.send({
        ...email,
        from: config.from,
        replyTo: config.replyTo,
        providerName: config.providerName
      });
    }
  });

  const deliveryStatus = sendResult.ok ? INTERNAL_NOTIFICATION_STATUS.SENT : INTERNAL_NOTIFICATION_STATUS.FAILED;
  const logInput = {
    notification: input.notification,
    deliveryStatus,
    messageSubject: emailResult.email.subject,
    providerName: config.providerName,
    internalProviderMessageId: sendResult.ok ? sendResult.providerMessageId : null
  };

  if (requireDataverseLog || dataverseClient) {
    const persistResult = await persistAuthorDraftReviewNotification(logInput, dataverseClient);
    if (!persistResult.ok) {
      return {
        ...safeFailure(persistResult.reason || "DATAVERSE_WRITE_FAILED", input),
        deliveryStatus: INTERNAL_NOTIFICATION_STATUS.FAILED
      };
    }
  }

  const persistenceRecord = buildAuthorDraftReviewNotificationPersistenceRecord(logInput);
  if (!sendResult.ok) {
    return {
      ...sendResult,
      deliveryStatus: INTERNAL_NOTIFICATION_STATUS.FAILED,
      persistenceRecord: persistenceRecord.ok ? persistenceRecord.persistenceRecord : null
    };
  }

  return {
    ok: true,
    deliveryStatus: INTERNAL_NOTIFICATION_STATUS.SENT,
    authorEmailStatus: AUTHOR_EMAIL_STATUS,
    notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
    providerName: config.providerName,
    providerMessageId: sendResult.providerMessageId,
    providerCalled: true,
    persistenceRecord: persistenceRecord.ok ? persistenceRecord.persistenceRecord : null,
    diagnosticId: sendResult.diagnosticId,
    intakeReferenceCode: sendResult.intakeReferenceCode
  };
}

module.exports = {
  getInternalNotificationProviderConfig,
  resolveInternalNotificationProvider,
  buildConfiguredInternalNotificationEmail,
  deliverConfiguredInternalAuthorDraftReviewNotification,
  ENV_VARS,
  PROVIDER,
  CONFIG_ERROR_CODE,
  APPROVED_INTERNAL_DOMAIN
};
