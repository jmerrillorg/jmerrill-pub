"use strict";

const { app } = require("@azure/functions");
const { runTargetedEditorialExecution } = require("../editorial/editorialExecutionRuntime");

app.http("run-targeted-editorial-execution", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-targeted-editorial-execution",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Targeted editorial execution rejected: invalid runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    const body = await request.json().catch(() => ({}));
    const result = await runTargetedEditorialExecution(body);
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
