"use strict";

const { app } = require("@azure/functions");
const { runEditorialNextStageMaterialization } = require("../editorial/editorialNextStageMaterialization");

app.http("run-editorial-next-stage-materialization", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-editorial-next-stage-materialization",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Editorial next-stage materialization rejected: invalid runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    const body = await request.json().catch(() => ({}));
    const result = await runEditorialNextStageMaterialization(body);
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
