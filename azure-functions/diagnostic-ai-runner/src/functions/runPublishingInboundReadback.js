"use strict";

/**
 * Read-only commissioning surfaces for the Phase 1 inbound mailbox monitor.
 * These endpoints expose queue, health, and bounded shadow-read evidence only;
 * they do not mutate mailbox state or trigger downstream lifecycle actions.
 */

const { app } = require("@azure/functions");
const {
  computeMailboxHealth,
  createDefaultInboundEvidenceStore,
  PublishingMailboxGraphClient,
  runShadowWindow
} = require("../mail/inbound");

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

app.http("run-publishing-inbound-queue-readback", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/queue",
  handler: async (request) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const store = createDefaultInboundEvidenceStore();
    const limit = Number(request.query.get("limit") || 100);
    const items = typeof store.listQueueItems === "function" ? await store.listQueueItems(limit) : [...store.queue.values()].slice(0, limit);
    return {
      status: 200,
      jsonBody: {
        status: "ok",
        count: items.length,
        rows: items,
        lifecycleActionsAvailable: false
      }
    };
  }
});

app.http("run-publishing-inbound-health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "publishing/inbound/health",
  handler: async (request) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const store = createDefaultInboundEvidenceStore();
    const subscription = await store.getCheckpoint("publishing-inbound-graph-subscription");
    const health = computeMailboxHealth({
      subscription,
      storeHealth: await store.getHealthSnapshot()
    });
    return {
      status: 200,
      jsonBody: {
        status: "ok",
        ...health,
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

app.http("run-publishing-inbound-shadow-run", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/shadow-run",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await readJsonBody(request);
    if (!body) return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    if (body.confirmShadowRead !== true) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_SHADOW_READ_REQUIRED" } };
    }
    const top = Math.min(Math.max(Number(body.top || 50), 1), 100);
    const graphClient = new PublishingMailboxGraphClient();
    const result = await runShadowWindow({
      graphClient,
      store: createDefaultInboundEvidenceStore(),
      afterIso: body.afterIso || null,
      top
    });
    context.info(`Publishing inbound shadow run completed; detected=${result.messagesDetected}; failed=${result.messagesFailed}`);
    return { status: 200, jsonBody: result };
  }
});

module.exports = {};
