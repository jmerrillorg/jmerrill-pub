"use strict";

/**
 * HTTP wiring for the Milestone #6 continuation author-facing send:
 * package-selection confirmation + payment options + agreement/onboarding
 * next steps.
 *
 * Thin wrapper only. All gate enforcement, recipient confirmation, content
 * building, and send/evidence logic lives in milestone6ContinuationCommunication.js.
 *
 * Payment-option amounts are hardcoded here for this controlled activation
 * (JMP-PKG-PRO only) — the request body cannot supply or override them.
 */

const { app } = require("@azure/functions");
const { sendMilestone6ContinuationCommunication } = require("../author/milestone6ContinuationCommunication");

const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const PROJECT_TITLE = "Establishing Glory: The Library";
const SELECTED_PACKAGE_CODE = "JMP-PKG-PRO";

// Fixed for this controlled activation — confirmed amounts, 4% processing
// fee already applied. Not caller-supplied.
const PAYMENT_OPTIONS = Object.freeze([
  { payments: 1, totalPerInstallmentUsd: 4680.00 },
  { payments: 2, totalPerInstallmentUsd: 2340.00 },
  { payments: 4, totalPerInstallmentUsd: 1170.00 },
  { payments: 8, totalPerInstallmentUsd: 585.00 },
  { payments: 12, totalPerInstallmentUsd: 390.00 }
]);

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
  return { status: 403, jsonBody: { status: "error", code: "MILESTONE_6_RECORD_NOT_AUTHORIZED" } };
}

function confirmationRequired() {
  return {
    status: 400,
    jsonBody: { status: "error", code: "CONFIRM_MILESTONE_6_CONTINUATION_SEND_FLAG_REQUIRED" }
  };
}

app.http("run-milestone6-continuation-communication", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-milestone6-continuation-communication",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Milestone 6 continuation communication rejected: invalid or missing runner key.");
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
    const approvedBy = safeTrim(body.approvedBy);
    const confirmContinuationSend = body.confirmContinuationSend === true;

    if (!confirmContinuationSend) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Milestone 6 continuation communication rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    if (!approvedBy) {
      return { status: 400, jsonBody: { status: "error", code: "APPROVED_BY_MISSING" } };
    }

    const result = await sendMilestone6ContinuationCommunication({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      projectTitle: PROJECT_TITLE,
      selectedPackageCode: SELECTED_PACKAGE_CODE,
      paymentOptions: PAYMENT_OPTIONS,
      approvedBy
    });

    context.info(
      `Milestone 6 continuation communication attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
