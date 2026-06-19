"use strict";

/**
 * Controlled one-record internal author draft review notification test runner.
 *
 * This runner is explicit and bounded: it handles exactly one safe internal
 * notification payload and never scans queues, runs diagnostics, sends author
 * email, creates Opportunities, activates Flow D, or opens production gates.
 */

const {
  buildAuthorDraftReviewNotification,
  NOTIFICATION_ERROR_CODE
} = require("./authorDraftReviewNotificationBuilder");
const {
  deliverConfiguredInternalAuthorDraftReviewNotification
} = require("./internalAuthorDraftReviewNotificationProviderConfig");
const {
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS
} = require("./authorDraftReviewNotificationPersister");
const { INTERNAL_VISIBILITY_MAILBOX } = require("./authorResponseDraftBuilder");

const CONTROLLED_TEST_ERROR_CODE = "CONTROLLED_INTERNAL_NOTIFICATION_TEST_FAILED";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function safeFailure(reason, input = null) {
  const notification = input?.notification || input?.draftPayload || input;
  return {
    ok: false,
    code: CONTROLLED_TEST_ERROR_CODE,
    reason,
    diagnosticId: normalizeString(notification?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(notification?.intakeReferenceCode) || null
  };
}

function normalizeControlledInput(input = {}) {
  if (Array.isArray(input)) {
    return { ok: false, reason: "MULTIPLE_NOTIFICATIONS_NOT_ALLOWED" };
  }
  if (!isPlainObject(input)) {
    return { ok: false, reason: "CONTROLLED_TEST_INPUT_INVALID" };
  }
  if (Array.isArray(input.notifications)) {
    if (input.notifications.length !== 1) {
      return { ok: false, reason: "MULTIPLE_NOTIFICATIONS_NOT_ALLOWED" };
    }
    return { ok: true, input: { notification: input.notifications[0] } };
  }
  if (Array.isArray(input.records)) {
    if (input.records.length !== 1) {
      return { ok: false, reason: "MULTIPLE_NOTIFICATIONS_NOT_ALLOWED" };
    }
    return { ok: true, input: input.records[0] };
  }
  return { ok: true, input };
}

function buildControlledNotification(input = {}) {
  if (isPlainObject(input.notification)) {
    return { ok: true, notification: input.notification };
  }

  const result = buildAuthorDraftReviewNotification({
    diagnosticId: input.diagnosticId,
    intakeReferenceCode: input.intakeReferenceCode,
    notificationRecipient: input.notificationRecipient || INTERNAL_VISIBILITY_MAILBOX,
    draftPayload: input.draftPayload,
    reviewPayload: input.reviewPayload || {},
    metadata: input.metadata || {},
    dataverseRecordReference: input.dataverseRecordReference || null
  });

  if (!result.ok) {
    return {
      ok: false,
      code: NOTIFICATION_ERROR_CODE,
      reason: result.reason,
      diagnosticId: result.diagnosticId,
      intakeReferenceCode: result.intakeReferenceCode
    };
  }

  return { ok: true, notification: result.notification };
}

async function runControlledInternalAuthorDraftNotificationTest({
  input = {},
  env = process.env,
  providers = {},
  dataverseClient = null,
  requireDataverseLog = false
} = {}) {
  if (normalizeString(env.JM1_AI_EXECUTION_ENABLED) === "true") {
    return safeFailure("AI_EXECUTION_GATE_MUST_REMAIN_CLOSED", input);
  }

  const normalized = normalizeControlledInput(input);
  if (!normalized.ok) {
    return safeFailure(normalized.reason, input);
  }

  const notificationResult = buildControlledNotification(normalized.input);
  if (!notificationResult.ok) {
    return {
      ok: false,
      code: notificationResult.code || CONTROLLED_TEST_ERROR_CODE,
      reason: notificationResult.reason,
      diagnosticId: notificationResult.diagnosticId || null,
      intakeReferenceCode: notificationResult.intakeReferenceCode || null
    };
  }

  const deliveryResult = await deliverConfiguredInternalAuthorDraftReviewNotification({
    input: {
      notification: notificationResult.notification,
      to: normalized.input.to,
      cc: normalized.input.cc,
      bcc: normalized.input.bcc
    },
    env,
    providers,
    dataverseClient,
    requireDataverseLog
  });

  if (!deliveryResult.ok) {
    return {
      ...deliveryResult,
      controlledTest: true,
      authorEmailStatus: deliveryResult.authorEmailStatus || AUTHOR_EMAIL_STATUS
    };
  }

  return {
    ok: true,
    controlledTest: true,
    notificationType: notificationResult.notification.notificationType,
    notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
    deliveryStatus: deliveryResult.deliveryStatus || INTERNAL_NOTIFICATION_STATUS.DISABLED,
    authorEmailStatus: AUTHOR_EMAIL_STATUS,
    providerCalled: deliveryResult.providerCalled === true,
    persistenceRecord: deliveryResult.persistenceRecord || null,
    diagnosticId: notificationResult.notification.diagnosticId,
    intakeReferenceCode: notificationResult.notification.intakeReferenceCode,
    providerName: deliveryResult.providerName || null,
    providerMessageId: deliveryResult.providerMessageId || null
  };
}

module.exports = {
  runControlledInternalAuthorDraftNotificationTest,
  buildControlledNotification,
  normalizeControlledInput,
  CONTROLLED_TEST_ERROR_CODE
};
