"use strict";

const { app } = require("@azure/functions");
const { runSharePointArtifactReconciliation } = require("../editorial/sharePointArtifactReconciliation");

app.http("run-sharepoint-artifact-reconciliation", {
  methods: ["POST"], authLevel: "anonymous", route: "run-sharepoint-artifact-reconciliation",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!expected || request.headers.get("x-jm1-diagnostic-runner-key") !== expected) {
      context.warn("SharePoint artifact reconciliation rejected: invalid runner key.");
      return { status: 401, jsonBody: { ok: false, status: "BLOCKED", code: "UNAUTHORIZED" } };
    }
    const result = await runSharePointArtifactReconciliation(await request.json().catch(() => ({})));
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
