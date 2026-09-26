"use strict";

const { app } = require("@azure/functions");
const { runInboundService } = require("../mail/inbound/serviceRunner");
const { runObservedPaymentConsumer } = require("../payment/observedPaymentServiceConsumer");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { BlobInboundEvidenceStore } = require("../mail/inbound/blobEvidenceStore");

function authorized(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

app.timer("run-publishing-inbound-service", {
  schedule: "0 * * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_PUBLISHING_INBOUND_SERVICE_ENABLED !== "true") return;
    const client = createDataverseClient({ apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL });
    try { await runObservedPaymentConsumer({ client }); }
    catch { context.warn("Publishing payment reconciliation retry required; other author service continues."); }
    const result = await runInboundService();
    context.info(`Publishing inbound service: selected=${result.selected}; sent=${result.results.filter((row) => row.outcome === "SENT").length}; held=${result.results.filter((row) => row.outcome.startsWith("HELD_")).length}`);
  }
});

app.http("publishing-payment-service-health", {
  methods: ["GET"], authLevel: "anonymous", route: "publishing/payment-service/health",
  handler: async request => {
    if (!authorized(request)) return { status: 401, jsonBody: { code: "UNAUTHORIZED" } };
    const store = new BlobInboundEvidenceStore();
    return { status: 200, jsonBody: { health: await store.get("payment-service/health.json"),
      requests: await store.listPrefix("payment-service/requests/"), tail: await store.listPrefix("payment-service/tail/") } };
  }
});

app.http("run-publishing-inbound-service-preview", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/service/preview",
  handler: async (request) => {
    if (!authorized(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!body?.targetEventId) return { status: 400, jsonBody: { status: "error", code: "EVENT_ID_REQUIRED" } };
    return { status: 200, jsonBody: await runInboundService({ targetEventId: body.targetEventId, preview: true }) };
  }
});

app.http("run-publishing-inbound-service-replay", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/service/replay",
  handler: async (request) => {
    if (!authorized(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!body?.targetEventId || body.confirmSystemService !== true) {
      return { status: 400, jsonBody: { status: "error", code: "EVENT_ID_AND_CONFIRMATION_REQUIRED" } };
    }
    return { status: 200, jsonBody: await runInboundService({ targetEventId: body.targetEventId }) };
  }
});

module.exports = {};
