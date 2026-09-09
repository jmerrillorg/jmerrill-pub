"use strict";

/**
 * Recurring Graph delta reconciliation for publishing@jmerrill.one. This is
 * the recovery path for missed notifications, webhook outages, and deployment
 * gaps. It is evidence-only and fail-visible.
 */

const { app } = require("@azure/functions");
const {
  createDefaultInboundEvidenceStore,
  PublishingMailboxGraphClient,
  reconcileDelta
} = require("../mail/inbound");

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

async function runReconciliation(context) {
  const graphClient = new PublishingMailboxGraphClient();
  const result = await reconcileDelta({ graphClient, store: createDefaultInboundEvidenceStore() });
  context.info(`Publishing inbound delta reconciliation completed; detected=${result.messagesDetected}; ingested=${result.messagesIngested}; failed=${result.failed}`);
  return result;
}

app.timer("run-publishing-inbound-delta-reconciliation", {
  schedule: process.env.JM1_PUBLISHING_INBOUND_DELTA_CRON || "0 */5 * * * *",
  handler: async (_timer, context) => {
    if (String(process.env.JM1_PUBLISHING_INBOUND_DELTA_ENABLED || "").toLowerCase() !== "true") {
      context.info("Publishing inbound delta reconciliation skipped: gate closed.");
      return;
    }
    await runReconciliation(context);
  }
});

app.http("run-publishing-inbound-delta-reconciliation-manual", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/delta-reconciliation",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }
    if (body.confirmDeltaReconciliation !== true) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_DELTA_RECONCILIATION_REQUIRED" } };
    }
    const result = await runReconciliation(context);
    return { status: 200, jsonBody: result };
  }
});

module.exports = {};
