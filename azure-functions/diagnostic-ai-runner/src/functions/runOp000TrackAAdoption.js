"use strict";

/**
 * HTTP wiring for OP-000 Track A pilot adoption certification.
 *
 * This endpoint is intentionally narrow: it accepts only the authorized
 * Establishing Glory: The Library commissioning record and writes safe
 * historical execution-log evidence only when JM1_OP000_ADOPTION_ENABLED
 * is open. It does not create or update Contact, Lead, Opportunity,
 * Contract, payment, workspace, production, distribution, royalty, or
 * communication records.
 */

const { app } = require("@azure/functions");
const { TRACK_A_PILOT, runTrackAAdoption } = require("../adoption/op000TrackAAdoption");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized() {
  return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
}

function confirmationRequired() {
  return {
    status: 400,
    jsonBody: { status: "error", code: "CONFIRM_OP000_TRACK_A_ADOPTION_FLAG_REQUIRED" }
  };
}

app.http("run-op000-track-a-adoption", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-op000-track-a-adoption",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("OP-000 Track A adoption rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    if (body.confirmOp000TrackAAdoption !== true) {
      return confirmationRequired();
    }

    const result = await runTrackAAdoption({
      title: safeTrim(body.title) || TRACK_A_PILOT.title,
      diagnosticId: safeTrim(body.diagnosticId),
      intakeReferenceCode: safeTrim(body.intakeReferenceCode),
      opportunityId: safeTrim(body.opportunityId),
      completedAt: safeTrim(body.completedAt) || undefined
    });

    context.info(
      `OP-000 Track A adoption attempted; intake=${safeTrim(body.intakeReferenceCode)}; ok=${result.ok}; code=${result.code}; reason=${result.reason || "none"}`
    );

    let status = 200;
    if (!result.ok && result.reason === "PILOT_RECORD_NOT_AUTHORIZED") status = 403;
    else if (!result.ok && result.reason === "GATE_CLOSED") status = 503;
    else if (!result.ok) status = 422;

    return { status, jsonBody: result };
  }
});

module.exports = {};
