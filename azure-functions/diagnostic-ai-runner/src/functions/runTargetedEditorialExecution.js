"use strict";

const { app } = require("@azure/functions");
const {
  evaluateTargetedEditorialExecution,
  runTargetedEditorialExecution
} = require("../editorial/editorialExecutionRuntime");
const { enqueueTargetedEditorialExecution } = require("../editorial/targetedEditorialExecutionQueue");

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
    if (String(body.executionMode || "").trim().toUpperCase() === "EXECUTE_ASYNC") {
      const evaluated = await evaluateTargetedEditorialExecution(body);
      if (!evaluated.ok) return { status: 422, jsonBody: evaluated };
      const queued = await enqueueTargetedEditorialExecution(body, evaluated);
      return {
        status: 202,
        jsonBody: {
          ...evaluated,
          ...queued,
          executionMode: "EXECUTE_ASYNC",
          mutationsPerformedInline: 0,
          externalSends: 0
        }
      };
    }
    const result = await runTargetedEditorialExecution(body);
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
