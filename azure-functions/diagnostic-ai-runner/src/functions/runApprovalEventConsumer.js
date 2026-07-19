"use strict";

const { app } = require("@azure/functions");
const { runAutomaticApprovalEventConsumer } = require("../orchestration/approvalEventConsumer");

app.timer("run-approval-event-consumer", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    const result = await runAutomaticApprovalEventConsumer({
      triggerSource: "SCHEDULED_WORKER",
      maxEvents: Number(process.env.JM1_APPROVAL_CONSUMER_MAX_EVENTS || 10)
    });
    context.info(
      `Approval event consumer completed; processed=${result.processed}; blocked=${result.blocked}; idempotent=${result.idempotent}`
    );
  }
});

app.http("run-approval-event-consumer-admin-replay", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-approval-event-consumer-admin-replay",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Approval event consumer admin replay rejected: invalid runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    const body = await request.json().catch(() => ({}));
    if (!body.originalEventId || !body.reason) {
      return {
        status: 400,
        jsonBody: {
          status: "error",
          code: "ADMIN_REPLAY_REQUIRES_ORIGINAL_EVENT_ID_AND_REASON"
        }
      };
    }

    const result = await runAutomaticApprovalEventConsumer({
      triggerSource: "ADMIN_RETRY",
      maxEvents: Math.min(Math.max(Number(body.maxEvents || 10), 1), 25)
    });
    return { status: 200, jsonBody: { ...result, administrativeReplay: true } };
  }
});

module.exports = {};
