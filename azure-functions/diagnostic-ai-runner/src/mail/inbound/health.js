"use strict";

function computeMailboxHealth({ subscription = null, storeHealth = {}, now = new Date() } = {}) {
  const expiresAt = subscription?.expiresAt || subscription?.expirationDateTime || null;
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const subscriptionHealthy = subscription?.status === "ACTIVE" && !Number.isNaN(expiresMs) && expiresMs > now.getTime();
  const failed = Number(storeHealth.failedMessageCount || 0);
  const unclassified = Number(storeHealth.unclassifiedCount || 0);
  const attachmentFailures = Number(storeHealth.attachmentFailureCount || 0);

  return {
    mailboxMonitorStatus: subscriptionHealthy ? "HEALTHY" : "PHASE1_SHADOW_READY",
    graphSubscriptionStatus: subscriptionHealthy ? "ACTIVE" : "NOT_ACTIVE",
    subscriptionExpiresAt: expiresAt,
    lastNotificationAt: storeHealth.lastNotificationAt || null,
    lastDeltaReconciliationAt: storeHealth.lastDeltaReconciliationAt || null,
    deltaTokenStatus: storeHealth.deltaTokenStatus || "UNKNOWN",
    lastMessageDetectedAt: storeHealth.lastMessageDetectedAt || null,
    lastMessageProcessedAt: storeHealth.lastMessageProcessedAt || null,
    processingBacklog: Number(storeHealth.processingBacklog || 0),
    failedMessageCount: failed,
    unclassifiedCount: unclassified,
    attachmentFailureCount: attachmentFailures,
    noSilentDropStatus: failed > 0 ? "VISIBLE_FAILURES_PRESENT" : "PASS"
  };
}

module.exports = {
  computeMailboxHealth
};
