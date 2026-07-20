"use strict";

const { app } = require("@azure/functions");
const { runEditorialExecutionRuntime } = require("../editorial/editorialExecutionRuntime");

app.timer("run-editorial-execution-runtime", {
  schedule: "0 */10 * * * *",
  handler: async (_timer, context) => {
    const result = await runEditorialExecutionRuntime({
      correlationId: `EDITORIAL-RUNTIME-TIMER-${new Date().toISOString()}`,
      maxTasks: Number(process.env.JM1_EDITORIAL_RUNTIME_MAX_TASKS || 10)
    });
    context.info(
      `Editorial execution runtime completed; processed=${result.processed}; executors=${result.executorCount}; correlation=${result.correlationId}`
    );
  }
});

app.http("run-editorial-execution-runtime-admin-replay", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-editorial-execution-runtime-admin-replay",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Editorial execution runtime admin replay rejected: invalid runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    const body = await request.json().catch(() => ({}));
    if (!body.reason) {
      return {
        status: 400,
        jsonBody: {
          status: "error",
          code: "ADMIN_REPLAY_REQUIRES_REASON"
        }
      };
    }

    const result = await runEditorialExecutionRuntime({
      correlationId: `EDITORIAL-RUNTIME-ADMIN-${new Date().toISOString()}`,
      maxTasks: Math.min(Math.max(Number(body.maxTasks || 10), 1), 25)
    });
    return { status: 200, jsonBody: { ...result, administrativeReplay: true } };
  }
});

module.exports = {};
