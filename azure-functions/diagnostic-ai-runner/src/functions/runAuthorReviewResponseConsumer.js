"use strict";

/**
 * Engine: Inbound Communications Engine
 * Reusable? Y
 * Stage-specific exception? N
 */

const { app } = require("@azure/functions");
const { runAuthorReviewResponseConsumer } = require("../orchestration/authorReviewResponseConsumer");

app.timer("run-author-review-response-consumer", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    const result = await runAuthorReviewResponseConsumer({
      triggerSource: "SCHEDULED_WORKER",
      maxGates: Number(process.env.JM1_AUTHOR_RESPONSE_CONSUMER_MAX_GATES || 10)
    });
    context.info(
      `Author review response consumer completed; processed=${result.processed}; idempotent=${result.idempotent}; checked=${result.results.length}`
    );
  }
});

app.http("run-author-review-response-consumer-admin-replay", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-author-review-response-consumer-admin-replay",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Author review response consumer admin replay rejected: invalid runner key.");
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

    const result = await runAuthorReviewResponseConsumer({
      triggerSource: "ADMIN_RETRY",
      maxGates: Math.min(Math.max(Number(body.maxGates || 10), 1), 25)
    });
    return { status: 200, jsonBody: { ...result, administrativeReplay: true } };
  }
});

module.exports = {};
