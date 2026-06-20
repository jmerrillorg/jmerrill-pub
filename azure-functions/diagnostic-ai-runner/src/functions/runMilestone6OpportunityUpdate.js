"use strict";

/**
 * HTTP wiring for the Milestone #6 controlled Opportunity update.
 *
 * This is a thin wrapper. All allowlisting, gate enforcement, and
 * Dataverse write logic lives in milestone6OpportunityWriter.js, which
 * is independently tested. This file only:
 *   1. Verifies the runner key (same header/env check as the diagnostic
 *      runner).
 *   2. Confirms the request matches the one authorized controlled record
 *      (diagnosticId + intakeReferenceCode + opportunityId) — any
 *      mismatch is rejected with 403, regardless of caller intent.
 *   3. Calls writeMilestone6OpportunityUpdate with a FIXED, hardcoded
 *      Milestone 6 field payload for this controlled activation — the
 *      request body cannot supply or override field values. This removes
 *      any path for a caller to PATCH different values onto the
 *      Opportunity even with a valid runner key.
 *
 * Does not send author email, create payment links, create Opportunities,
 * activate Flow D, start production, or touch any other milestone.
 */

const { app } = require("@azure/functions");
const { writeMilestone6OpportunityUpdate, ALLOWED_ENTITY_SET } = require("../author/milestone6OpportunityWriter");

// Approval — Jackie, 2026-06-20. One controlled Opportunity update only.
// All three identifiers must match exactly. Any mismatch rejects with 403.
const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

// Fixed payload for this controlled activation — not caller-supplied.
const MILESTONE6_CONTROLLED_OPPORTUNITY_PAYLOAD = Object.freeze({
  jm1pub_packagerecommended: "JMP-PKG-PRO",
  jm1_m6packageselectionstatus: "PACKAGE_SELECTED",
  jm1_m6authorselectedpackagecode: "JMP-PKG-PRO",
  jm1_m6stripeproductmappingstatus: "STRIPE_MAPPING_CONFIRMED",
  jm1_m6stripepricemappingstatus: "STRIPE_MAPPING_CONFIRMED",
  jm1_m6paymentoptionpreparationstatus: "PAYMENT_OPTIONS_READY_AFTER_PACKAGE_SELECTION",
  jm1_m6agreementpreparationstatus: "AGREEMENT_PREPARATION_READY",
  jm1_m6onboardingstatus: "ONBOARDING_READY",
  jm1_m6businesshandoffstatus: "BUSINESS_HANDOFF_READY"
});

const SELECTED_PACKAGE_CODE = "JMP-PKG-PRO";
const RECOMMENDED_PACKAGE_CODE = "JMP-PKG-PRO";
const ALTERNATE_PACKAGE_CODE = "JMP-PKG-STARTER";

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
    jsonBody: {
      status: "error",
      code: "CONFIRM_MILESTONE_6_OPPORTUNITY_UPDATE_FLAG_REQUIRED"
    }
  };
}

app.http("run-milestone6-opportunity-update", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-milestone6-opportunity-update",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Milestone 6 Opportunity update rejected: invalid or missing runner key.");
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
    const confirmMilestone6OpportunityUpdate = body.confirmMilestone6OpportunityUpdate === true;

    if (!confirmMilestone6OpportunityUpdate) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Milestone 6 Opportunity update rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const result = await writeMilestone6OpportunityUpdate({
      diagnosticId,
      intakeReferenceCode,
      entitySet: ALLOWED_ENTITY_SET,
      opportunityId,
      opportunityPayload: MILESTONE6_CONTROLLED_OPPORTUNITY_PAYLOAD,
      selectedPackageCode: SELECTED_PACKAGE_CODE,
      recommendedPackageCode: RECOMMENDED_PACKAGE_CODE,
      alternatePackageCode: ALTERNATE_PACKAGE_CODE,
      correlationId: safeTrim(body.correlationId) || null
    });

    context.info(
      `Milestone 6 Opportunity update attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
