"use strict";

const { app } = require("@azure/functions");
const { runAuthorFollowupCadence } = require("../author/authorFollowupRuntime");

app.timer("run-author-followup-cadence", {
  schedule: "0 0 * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_AUTHOR_FOLLOWUP_ENABLED !== "true") return;
    const result = await runAuthorFollowupCadence();
    context.info(`Author follow-up cadence: scanned=${result.activeTitlesScanned}; ` +
      `sent=${result.results.filter((row) => row.status === "SENT").length}; ` +
      `held=${result.results.filter((row) => row.status === "HELD").length}; ` +
      `newReview=${result.reviewQueue.filter((row) => row.recordStatus === "RECORDED").length}`);
    const escalations = result.results.filter((row) => row.day20Escalation === "RECORDED");
    if (escalations.length) {
      context.warn(`AUTHOR_FOLLOWUP_DAY20_ESCALATION: count=${escalations.length}; Publishing review required.`);
    }
    if (result.results.some((row) => row.status === "HELD" || row.status === "MAILBOX_VERIFICATION_PENDING") ||
        result.reviewQueue.some((row) => row.recordStatus === "FAILED")) {
      context.error("AUTHOR_FOLLOWUP_MATERIAL_FAILURE: system reconciliation required; do not resend manually.");
    }
  }
});

app.http("preview-author-followup-cadence", {
  methods: ["GET"], authLevel: "anonymous", route: "publishing/author-followup/preview",
  handler: async (request) => {
    const key = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!key || request.headers.get("x-jm1-diagnostic-runner-key") !== key) {
      return { status: 401, jsonBody: { code: "UNAUTHORIZED" } };
    }
    try {
      const result = await runAuthorFollowupCadence({ preview: true });
      return { status: 200, jsonBody: result };
    } catch (error) {
      return { status: 503, jsonBody: { code: error.safeCode || "AUTHOR_FOLLOWUP_PREVIEW_FAILED" } };
    }
  }
});

module.exports = {};
