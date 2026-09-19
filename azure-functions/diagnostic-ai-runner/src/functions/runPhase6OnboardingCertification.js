"use strict";

const { app } = require("@azure/functions");
const { invokePhase6Certification } = require("../onboarding/phase6OnboardingCertificationClient");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function authorized(request) {
  const expected = clean(process.env.JM1_DIAGNOSTIC_RUNNER_KEY);
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

app.http("phase6-onboarding-certification", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "phase6/onboarding/certification-command",
  handler: async (request, context) => {
    if (!authorized(request)) return { status: 401, jsonBody: { ok: false, code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    try {
      const result = await invokePhase6Certification(body);
      return { status: result.status, jsonBody: result };
    } catch (error) {
      context.error(`Phase 6 certification invocation failed: ${clean(error?.code) || "INTERNAL_ERROR"}`);
      return { status: 500, jsonBody: { ok: false, code: "PHASE6_CERTIFICATION_FAILED" } };
    }
  },
});

module.exports = { authorized };
