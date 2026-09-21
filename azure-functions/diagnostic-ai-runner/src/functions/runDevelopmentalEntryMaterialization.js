"use strict";

const { app } = require("@azure/functions");
const { runDevelopmentalEntryMaterialization } = require("../editorial/developmentalEntryMaterialization");

app.http("run-developmental-entry-materialization", {
  methods: ["POST"], authLevel: "anonymous", route: "run-developmental-entry-materialization",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    const actual = request.headers.get("x-jm1-diagnostic-runner-key");
    if (!expected || actual !== expected) {
      context.warn("Developmental entry materialization rejected: invalid runner key.");
      return { status: 401, jsonBody: { ok: false, status: "BLOCKED", code: "UNAUTHORIZED" } };
    }
    const result = await runDevelopmentalEntryMaterialization(await request.json().catch(() => ({})));
    return { status: result.ok ? (result.status === "MATERIALIZED" ? 201 : 200) : 422, jsonBody: result };
  }
});

module.exports = {};
