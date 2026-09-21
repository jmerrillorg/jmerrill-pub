"use strict";

const { app } = require("@azure/functions");
const { executeOverdueCadenceRecovery } = require("../editorial/overdueCadenceRecovery");

function authorized(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

app.http("run-overdue-cadence-recovery", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/editorial/overdue-cadence-recovery",
  handler: async (request, context) => {
    if (!authorized(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!body) return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    try {
      const result = await executeOverdueCadenceRecovery(body);
      context.info(`Overdue cadence recovery completed; repaired=${result.repaired.length}; sent=${result.cadence.packageSent}; correlation=${result.cadence.correlationId}`);
      return { status: 200, jsonBody: { status: "ok", ...result } };
    } catch (error) {
      context.warn(`Overdue cadence recovery denied; code=${error.safeCode || "OVERDUE_CADENCE_RECOVERY_FAILED"}`);
      return { status: Number(error.httpStatus) || 500, jsonBody: { status: "error", code: error.safeCode || "OVERDUE_CADENCE_RECOVERY_FAILED" } };
    }
  }
});

module.exports = {};
