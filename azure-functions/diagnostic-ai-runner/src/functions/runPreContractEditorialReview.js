"use strict";

/**
 * HTTP wiring for the pre-contract editorial review runner.
 *
 * Thin wrapper only. All gate enforcement, manuscript extraction,
 * content-aware AI review, schema/no-quotation validation, and
 * Dataverse write logic lives in preContractEditorialReviewRunner.js
 * (independently tested).
 *
 * The caller supplies diagnosticId/intakeReferenceCode/opportunityId/
 * selectedPackageCode and the request is validated against the one
 * authorized controlled record before any review is attempted.
 */

const { app } = require("@azure/functions");
const { runPreContractEditorialReview } = require("../editorial/preContractEditorialReviewRunner");

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
  return { status: 403, jsonBody: { status: "error", code: "PRE_CONTRACT_EDITORIAL_REVIEW_RECORD_NOT_AUTHORIZED" } };
}

function confirmationRequired() {
  return { status: 400, jsonBody: { status: "error", code: "CONFIRM_PRE_CONTRACT_EDITORIAL_REVIEW_FLAG_REQUIRED" } };
}

app.http("run-precontract-editorial-review", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-precontract-editorial-review",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Pre-contract editorial review rejected: invalid or missing runner key.");
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
    const selectedPackageCode = safeTrim(body.selectedPackageCode);
    const confirmReview = body.confirmReview === true;

    if (!confirmReview) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Pre-contract editorial review rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const result = await runPreContractEditorialReview({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      selectedPackageCode
    });

    context.info(
      `Pre-contract editorial review attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
