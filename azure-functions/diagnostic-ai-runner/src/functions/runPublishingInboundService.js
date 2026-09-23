"use strict";

const { app } = require("@azure/functions");
const { diagnoseMailboxCopy, runInboundService } = require("../mail/inbound/serviceRunner");

function authorized(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

app.timer("run-publishing-inbound-service", {
  schedule: "0 * * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_PUBLISHING_INBOUND_SERVICE_ENABLED !== "true") return;
    const result = await runInboundService();
    context.info(`Publishing inbound service: selected=${result.selected}; sent=${result.results.filter((row) => row.outcome === "SENT").length}; held=${result.results.filter((row) => row.outcome.startsWith("HELD_")).length}`);
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

app.http("run-publishing-inbound-service-copy-diagnostic", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/service/copy-diagnostic",
  handler: async (request) => {
    if (!authorized(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!body?.targetEventId) return { status: 400, jsonBody: { status: "error", code: "EVENT_ID_REQUIRED" } };
    return { status: 200, jsonBody: await diagnoseMailboxCopy(body.targetEventId) };
  }
});

module.exports = {};
