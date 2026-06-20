"use strict";

/**
 * HTTP wiring for the Milestone #6 evidence-only recovery log.
 *
 * Used only when a prior controlled Opportunity update PATCH already
 * succeeded but the execution-log evidence write failed at that time
 * (e.g. due to a missing Create privilege on jm1_executionlog). This
 * endpoint writes ONE safe jm1_executionlogs evidence record documenting
 * that prior success — it never PATCHes the Opportunity.
 *
 * This file delegates entirely to writeMilestone6EvidenceOnlyLog, whose
 * own source never references the Opportunity PATCH function — there is
 * no Opportunity-write code path reachable from this endpoint at all,
 * not merely a gated one.
 */

const { app } = require("@azure/functions");
const { writeMilestone6EvidenceOnlyLog } = require("../author/milestone6OpportunityWriter");

// Same one authorized controlled record as the original activation.
const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

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
    jsonBody: { status: "error", code: "CONFIRM_MILESTONE_6_EVIDENCE_RECOVERY_FLAG_REQUIRED" }
  };
}

app.http("run-milestone6-evidence-recovery-log", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-milestone6-evidence-recovery-log",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Milestone 6 evidence recovery rejected: invalid or missing runner key.");
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
    const confirmEvidenceOnlyRecovery = body.confirmEvidenceOnlyRecovery === true;

    if (!confirmEvidenceOnlyRecovery) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Milestone 6 evidence recovery rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const result = await writeMilestone6EvidenceOnlyLog({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      selectedPackageCode: SELECTED_PACKAGE_CODE,
      recommendedPackageCode: RECOMMENDED_PACKAGE_CODE,
      alternatePackageCode: ALTERNATE_PACKAGE_CODE,
      correlationId: safeTrim(body.correlationId) || null
    });

    context.info(
      `Milestone 6 evidence recovery attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
