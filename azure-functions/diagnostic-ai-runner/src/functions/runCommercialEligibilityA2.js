"use strict";

const { app } = require("@azure/functions");
const { createCommercialEligibilityProductionBinding } = require("../agent/commercialEligibilityProductionBinding");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function authorized(request) {
  const expected = clean(process.env.JM1_DIAGNOSTIC_RUNNER_KEY);
  return Boolean(expected && request.headers.get("x-jm1-diagnostic-runner-key") === expected);
}

function responseForError(error, context) {
  const code = clean(error?.safeCode) || clean(error?.code) || "A2_OPERATION_FAILED";
  context.error(`Commercial eligibility A2 failed: ${code}`);
  return { status: code === "A2_BINDING_DISABLED" ? 503 : 422, jsonBody: { ok: false, code } };
}

app.http("commercial-eligibility-a2", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "commercial-eligibility-a2/{action}",
  handler: async (request, context) => {
    if (!authorized(request)) return { status: 401, jsonBody: { ok: false, code: "UNAUTHORIZED" } };
    const action = clean(request.params.action).toLowerCase();
    const binding = createCommercialEligibilityProductionBinding();
    try {
      if (request.method === "GET" && action === "supervision") {
        return { status: 200, jsonBody: { ok: true, supervision: await binding.supervision() } };
      }
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { status: 400, jsonBody: { ok: false, code: "INVALID_JSON" } };
      }
      if (request.method === "POST" && action === "prepare") {
        return { status: 200, jsonBody: { ok: true, result: await binding.prepare(body) } };
      }
      if (request.method === "POST" && action === "review") {
        return { status: 200, jsonBody: { ok: true, result: await binding.review(body) } };
      }
      if (request.method === "POST" && action === "stale-proof") {
        return { status: 200, jsonBody: { ok: true, result: await binding.proveStaleReview(body) } };
      }
      return { status: 404, jsonBody: { ok: false, code: "A2_ACTION_NOT_FOUND" } };
    } catch (error) {
      return responseForError(error, context);
    }
  }
});

module.exports = {};
