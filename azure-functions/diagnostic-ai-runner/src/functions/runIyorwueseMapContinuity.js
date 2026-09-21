"use strict";

const { app } = require("@azure/functions");
const { executeIyorwueseMapContinuity } = require("../mail/inbound/iyorwueseMapContinuity");

function authorized(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

app.http("run-iyorwuese-map-continuity", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/iyorwuese-map-continuity",
  handler: async (request, context) => {
    if (!authorized(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!body) return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    try {
      const result = await executeIyorwueseMapContinuity(body);
      context.info(`Iyorwuese map continuity completed; artifact=${result.artifactId}; acknowledgment=${result.acknowledgment.status}`);
      return { status: 200, jsonBody: { status: "ok", ...result } };
    } catch (error) {
      context.warn(`Iyorwuese map continuity denied; code=${error.safeCode || "IYORWUESE_MAP_CONTINUITY_FAILED"}`);
      return { status: Number(error.httpStatus) || 500, jsonBody: { status: "error", code: error.safeCode || "IYORWUESE_MAP_CONTINUITY_FAILED" } };
    }
  }
});

module.exports = {};
