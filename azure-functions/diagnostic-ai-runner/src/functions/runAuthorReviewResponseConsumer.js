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
    try {
      const funded = await require("../lifecycle/publisherFundedStage04").monitor();
      for (const result of funded) {
        if (result.status !== 200) context.error(`Stage04 funded response monitor: title=${result.titleId}; code=${result.code}`);
        else context.info(`Stage04 funded response monitor: title=${result.titleId}; status=${result.stage04}`);
      }
      const result = await runAuthorReviewResponseConsumer({
        triggerSource: "SCHEDULED_WORKER",
        maxGates: Number(process.env.JM1_AUTHOR_RESPONSE_CONSUMER_MAX_GATES || 10)
      });
      context.info(
        `Author review response consumer completed; processed=${result.processed}; idempotent=${result.idempotent}; checked=${result.results.length}`
      );
    } finally {
      const consultations = await require("../lifecycle/stage07AuthorCorrespondence").monitor();
      for (const result of consultations) {
        if (result.status !== 200) context.error(`Stage07 consultation: title=${result.jsonBody.titleId}; code=${result.jsonBody.code}`);
        else context.info(`Stage07 consultation: title=${result.jsonBody.titleId}; status=${result.jsonBody.status}`);
      }
      const agreements = await require("../lifecycle/publisherFundedSignedFolder").monitor();
      for (const agreement of agreements) {
        if (["HELD", "EXECUTION_REVIEW_REQUIRED"].includes(agreement.status)) context.error(`Stage05 execution review: title=${agreement.titleId}; status=${agreement.status}; code=${agreement.code || "SIGNED_EVIDENCE_REVIEW_REQUIRED"}`);
        else context.info(`Stage05 execution review: title=${agreement.titleId}; status=${agreement.status}`);
      }
      const placements = await require("../lifecycle/pipelineFolderRuntime").monitor();
      for (const placement of placements) {
        if (["FAILED", "HELD", "RETRY_PENDING"].includes(placement.status)) context.error(`Pipeline folder projection: title=${placement.titleId}; status=${placement.status}; code=${placement.code || placement.reason}`);
        else context.info(`Pipeline folder projection: title=${placement.titleId}; status=${placement.status}`);
      }
    }
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
      maxGates: Math.min(Math.max(Number(body.maxGates || 10), 1), 25),
      targetDiagnosticId: body.targetDiagnosticId
    });
    return { status: 200, jsonBody: { ...result, administrativeReplay: true } };
  }
});

module.exports = {};
