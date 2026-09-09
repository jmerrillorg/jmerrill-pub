"use strict";

/**
 * Governed subscription manager for publishing@jmerrill.one. The HTTP route
 * creates or renews Graph subscriptions when explicitly called with the
 * diagnostic runner key; the timer renews only when enabled. No mailbox
 * content is read from this module.
 */

const { app } = require("@azure/functions");
const {
  createDefaultInboundEvidenceStore,
  PublishingMailboxGraphClient,
  createSubscription,
  renewSubscription,
  shouldRenewSubscription
} = require("../mail/inbound");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

async function readSubscription(store) {
  return store.getCheckpoint("publishing-inbound-graph-subscription");
}

async function writeSubscription(store, subscription) {
  await store.setCheckpoint("publishing-inbound-graph-subscription", subscription);
  return subscription;
}

async function ensureSubscription(graphClient, store) {
  const notificationUrl = process.env.JM1_PUBLISHING_INBOUND_NOTIFICATION_URL;
  const clientState = process.env.JM1_PUBLISHING_INBOUND_GRAPH_CLIENT_STATE;
  if (!notificationUrl || !clientState) {
    return { ok: false, code: "SUBSCRIPTION_CONFIG_MISSING" };
  }
  const current = await readSubscription(store);
  if (!current) {
    const subscription = await writeSubscription(store, await createSubscription(graphClient, { notificationUrl, clientState }));
    return { ok: true, action: "CREATED", subscription };
  }
  if (shouldRenewSubscription(current)) {
    const subscription = await writeSubscription(store, await renewSubscription(graphClient, current));
    return { ok: true, action: "RENEWED", subscription };
  }
  return { ok: true, action: "UNCHANGED", subscription: current };
}

app.http("run-publishing-inbound-subscription-manager", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/subscription-manager",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }
    if (body.confirmSubscriptionManagement !== true) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_SUBSCRIPTION_MANAGEMENT_REQUIRED" } };
    }
    const action = safeTrim(body.action) || "ensure";
    const graphClient = new PublishingMailboxGraphClient();
    const store = createDefaultInboundEvidenceStore();
    const current = await readSubscription(store);
    const result = action === "renew" && current
      ? { ok: true, action: "RENEWED", subscription: await writeSubscription(store, await renewSubscription(graphClient, current)) }
      : await ensureSubscription(graphClient, store);
    context.info(`Publishing inbound subscription manager action=${result.action || action}; ok=${result.ok}`);
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

app.timer("run-publishing-inbound-subscription-renewal", {
  schedule: process.env.JM1_PUBLISHING_INBOUND_SUBSCRIPTION_RENEWAL_CRON || "0 0 */6 * * *",
  handler: async (_timer, context) => {
    if (String(process.env.JM1_PUBLISHING_INBOUND_SUBSCRIPTION_RENEWAL_ENABLED || "").toLowerCase() !== "true") {
      context.info("Publishing inbound subscription renewal skipped: gate closed.");
      return;
    }
    const graphClient = new PublishingMailboxGraphClient();
    const result = await ensureSubscription(graphClient, createDefaultInboundEvidenceStore());
    context.info(`Publishing inbound subscription renewal completed; action=${result.action}; ok=${result.ok}`);
  }
});

module.exports = {};
