"use strict";

const { app } = require("@azure/functions");
const { runInboundBusinessRouter } = require("../mail/inbound/businessRouter");

app.timer("run-publishing-inbound-business-router", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    const result = await runInboundBusinessRouter();
    context.info(`Publishing inbound business router completed; ready=${result.businessEventsReady}; idempotent=${result.idempotent}; exceptions=${result.exceptions}`);
  }
});

app.http("run-publishing-inbound-business-router-replay", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/business-router/replay",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!expected || request.headers.get("x-jm1-diagnostic-runner-key") !== expected) {
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }
    const body = await request.json().catch(() => null);
    if (!body || body.confirmSystemReplay !== true || !body.targetEventId) {
      return { status: 400, jsonBody: { status: "error", code: "EVENT_ID_AND_CONFIRMATION_REQUIRED" } };
    }
    const result = await runInboundBusinessRouter({ targetEventId: body.targetEventId, limit: 500 });
    context.info(`Publishing inbound business route replay completed; ready=${result.businessEventsReady}; exceptions=${result.exceptions}`);
    return { status: 200, jsonBody: result };
  }
});
