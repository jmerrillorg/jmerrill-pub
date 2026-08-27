"use strict";

const { app } = require("@azure/functions");
const { runEnterpriseMailboxReadbackHealth } = require("../mail/enterpriseMailboxReadbackHealth");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

app.http("run-enterprise-mailbox-readback-health", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-enterprise-mailbox-readback-health",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Enterprise mailbox readback health rejected: invalid or missing runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    if (body.confirmEnterpriseMailboxReadbackHealth !== true) {
      return {
        status: 400,
        jsonBody: { status: "error", code: "CONFIRM_ENTERPRISE_MAILBOX_READBACK_HEALTH_REQUIRED" }
      };
    }

    const result = await runEnterpriseMailboxReadbackHealth({
      brand: safeTrim(body.brand || "AIC"),
      subjectContains: safeTrim(body.subjectContains),
      afterIso: safeTrim(body.afterIso)
    });

    context.info(
      `Enterprise mailbox readback health attempted; brand=${result.brand || safeTrim(body.brand)}; ok=${result.ok}; code=${result.code}`
    );

    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
