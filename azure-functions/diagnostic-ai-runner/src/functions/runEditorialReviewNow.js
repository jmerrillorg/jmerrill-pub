"use strict";

/**
 * Governed internal action: Run Editorial Review Now.
 *
 * This is the run-control surface for PROGRAM-002. It evaluates the
 * caller-supplied Dataverse readiness snapshot, prevents duplicate runs,
 * and dispatches the JM Editorial Doctrine runner from the intake/title/
 * manuscript context before package selection. It never sends author
 * recommendations automatically.
 */

const { app } = require("@azure/functions");
const { runPrePackageEditorialReview } = require("../editorial/preContractEditorialReviewRunner");
const {
  REVIEW_RUN_STATUS,
  evaluateRunNowRequest
} = require("../editorial/editorialReviewRunControl");

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

app.http("run-editorial-review-now", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-editorial-review-now",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Run Editorial Review Now rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    if (body.confirmRunNow !== true) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_RUN_NOW_REQUIRED" } };
    }

    const readinessRecord = body.readinessRecord || body;
    const runNow = evaluateRunNowRequest(readinessRecord);
    if (!runNow.accepted) {
      return {
        status: 422,
        jsonBody: {
          status: "blocked",
          code: "EDITORIAL_REVIEW_NOT_READY",
          runControlStatus: runNow.status,
          reason: runNow.reason,
          readiness: runNow.readiness
        }
      };
    }

    const diagnosticId = safeTrim(body.diagnosticId || readinessRecord.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode || readinessRecord.intakeReferenceCode);
    const opportunityId = safeTrim(body.opportunityId);

    const result = await runPrePackageEditorialReview({
      diagnosticId,
      intakeReferenceCode,
      opportunityId
    });

    context.info(
      `Run Editorial Review Now attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    return {
      status: result.ok ? 202 : 422,
      jsonBody: {
        ...result,
        runControlStatus: result.ok ? REVIEW_RUN_STATUS.PUBLISHER_APPROVAL_REQUIRED : REVIEW_RUN_STATUS.HOLD_EXCEPTION,
        authorRecommendationSent: false
      }
    };
  }
});

module.exports = {};
