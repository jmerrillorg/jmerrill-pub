"use strict";

/**
 * HTTP wiring for recording a Publisher Review Decision.
 *
 * Thin wrapper only. All validation, decision-to-fields mapping, and
 * Dataverse write logic lives in publisherReviewDecision.js
 * (independently tested).
 *
 * The caller supplies diagnosticId/intakeReferenceCode/opportunityId/
 * decisionOption (+ recommendedImprint when required) and the request
 * is validated against the one authorized controlled record before any
 * write is attempted.
 */

const { app } = require("@azure/functions");
const { recordPublisherReviewDecision } = require("../editorial/publisherReviewDecision");

const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

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

function recordNotAuthorized() {
  return { status: 403, jsonBody: { status: "error", code: "PUBLISHER_REVIEW_DECISION_RECORD_NOT_AUTHORIZED" } };
}

function confirmationRequired() {
  return { status: 400, jsonBody: { status: "error", code: "CONFIRM_PUBLISHER_REVIEW_DECISION_FLAG_REQUIRED" } };
}

app.http("run-publisher-review-decision", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-publisher-review-decision",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Publisher review decision rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const diagnosticId = safeTrim(body.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode);
    const opportunityId = safeTrim(body.opportunityId);
    const decisionOption = safeTrim(body.decisionOption);
    const recommendedImprint = typeof body.recommendedImprint === "number" ? body.recommendedImprint : null;
    const lockImprint = body.lockImprint !== false;
    const notes = safeTrim(body.notes) || null;
    const confirmDecision = body.confirmDecision === true;

    if (!confirmDecision) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Publisher review decision rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const result = await recordPublisherReviewDecision({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      decisionOption,
      recommendedImprint,
      lockImprint,
      notes
    });

    context.info(
      `Publisher review decision attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
