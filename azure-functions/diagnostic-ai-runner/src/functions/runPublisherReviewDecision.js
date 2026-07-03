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
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");

const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const INTAKE_ENTITY_SET = "jm1_publishingintakes";

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

async function getJson(apiBase, token, path) {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error("Dataverse read failed"), {
      safeCode: "DATAVERSE_READ_FAILED",
      httpStatus: response.status,
      dvCode: body?.error?.code || null
    });
  }
  return body;
}

async function validateRecordBinding({ diagnosticId, intakeReferenceCode }) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (!apiBase || !resourceUrl) {
    return { ok: false, status: 503, code: "DATAVERSE_CONFIG_MISSING" };
  }

  const token = await getDataverseToken(resourceUrl);
  const diagnostic = await getJson(
    apiBase,
    token,
    `${DIAGNOSTIC_ENTITY_SET}(${diagnosticId})?$select=jm1pub_diagnosticstatus,_jm1pub_publishingintake_value`
  );
  const intakeId = diagnostic._jm1pub_publishingintake_value;
  if (!intakeId) return { ok: false, status: 403, code: "DIAGNOSTIC_INTAKE_LINK_MISSING" };

  const intake = await getJson(
    apiBase,
    token,
    `${INTAKE_ENTITY_SET}(${intakeId})?$select=jm1_referencecode`
  );
  const actualReference = safeTrim(intake.jm1_referencecode).toUpperCase();
  if (!actualReference || actualReference !== intakeReferenceCode.toUpperCase()) {
    return { ok: false, status: 403, code: "INTAKE_REFERENCE_MISMATCH" };
  }

  return { ok: true };
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

    let binding;
    try {
      binding = await validateRecordBinding({ diagnosticId, intakeReferenceCode });
    } catch (err) {
      context.warn(`Publisher review decision record binding check failed: ${err.safeCode || "DATAVERSE_READ_FAILED"}`);
      return { status: 503, jsonBody: { status: "error", code: err.safeCode || "DATAVERSE_READ_FAILED" } };
    }

    if (!binding.ok) {
      context.warn(`Publisher review decision rejected: ${binding.code}`);
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
