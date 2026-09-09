"use strict";

/**
 * Source-controlled Graph change-notification receiver for the Publishing
 * Inbound Operations Center. It validates subscription challenge/clientState,
 * retrieves the referenced message, and routes through Phase 1 evidence only.
 * No mailbox mutation, author communication, lifecycle transition, royalty
 * calculation, payment, or production deployment is reachable from this file.
 */

const { app } = require("@azure/functions");
const {
  createDefaultInboundEvidenceStore,
  PublishingMailboxGraphClient,
  ingestNotification,
  validateClientState
} = require("../mail/inbound");

function expectedClientState() {
  return process.env.JM1_PUBLISHING_INBOUND_GRAPH_CLIENT_STATE || "";
}

async function validateSubscriptionAuthority(notification, store) {
  const subscription = await store.getCheckpoint("publishing-inbound-graph-subscription");
  if (!subscription) return { ok: true };
  const actualId = String(notification.subscriptionId || "").trim();
  const expectedId = String(subscription.subscriptionId || subscription.id || "").trim();
  if (expectedId && actualId && actualId !== expectedId) return { ok: false, code: "SUBSCRIPTION_UNKNOWN" };
  const expiresAt = Date.parse(subscription.expiresAt || subscription.expirationDateTime || "");
  if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) return { ok: false, code: "SUBSCRIPTION_EXPIRED" };
  return { ok: true };
}

app.http("run-publishing-inbound-notification", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/graph-notification",
  handler: async (request, context) => {
    const validationToken = request.query.get("validationToken");
    if (validationToken) {
      return { status: 200, body: validationToken, headers: { "Content-Type": "text/plain" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const notifications = Array.isArray(body.value) ? body.value : [];
    const graphClient = new PublishingMailboxGraphClient();
    const store = createDefaultInboundEvidenceStore();
    const results = [];
    for (const notification of notifications) {
      const authority = await validateSubscriptionAuthority(notification, store);
      if (!authority.ok) {
        results.push(authority);
        continue;
      }
      const result = await ingestNotification(notification, {
        graphClient,
        store,
        clientStateValidator: (state) => validateClientState(state, expectedClientState())
      });
      results.push(result);
    }

    context.info(`Publishing inbound notification batch processed; count=${results.length}; failed=${results.filter((r) => !r.ok).length}`);
    return {
      status: 202,
      jsonBody: {
        status: "accepted",
        count: results.length,
        failed: results.filter((r) => !r.ok).length,
        consequentialActions: {
          titleLifecycleTransitions: 0,
          authorDecisionsCreated: 0,
          authorCommunicationsSent: 0,
          royaltyLedgerRecords: 0,
          productionDeployments: 0
        }
      }
    };
  }
});

module.exports = {};
