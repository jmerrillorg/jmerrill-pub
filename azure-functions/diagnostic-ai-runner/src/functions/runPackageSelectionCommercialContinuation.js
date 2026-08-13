"use strict";

const { app } = require("@azure/functions");
const { continuePackageSelectionCommercialPath } = require("../author/packageSelectionCommercialContinuation");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

app.http("run-package-selection-commercial-continuation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-package-selection-commercial-continuation",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Package-selection commercial continuation rejected: invalid or missing runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const result = await continuePackageSelectionCommercialPath({
      diagnosticId: safeTrim(body.diagnosticId),
      intakeReferenceCode: safeTrim(body.intakeReferenceCode),
      correlationId: safeTrim(body.correlationId),
      confirmPackageSelectionCommercialContinuation: body.confirmPackageSelectionCommercialContinuation === true
    });

    context.info(
      `Package-selection commercial continuation attempted; diagnosticId=${safeTrim(body.diagnosticId)}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
