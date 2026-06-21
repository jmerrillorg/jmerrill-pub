"use strict";

/**
 * HTTP wiring for the Milestone #6 payment-option capture.
 *
 * Thin wrapper only. All allowlisting, type validation, gate enforcement,
 * and Dataverse write logic lives in milestone6PaymentOptionCaptureWriter.js
 * (independently tested).
 *
 * The caller supplies the classification result (from the mailbox reply
 * check) and the request is validated against the one authorized
 * controlled record before any write is attempted.
 */

const { app } = require("@azure/functions");
const { writeMilestone6PaymentOptionCapture, ALLOWED_ENTITY_SET } = require("../author/milestone6PaymentOptionCaptureWriter");
const { getPaymentOptionDetails } = require("../mail/publishingReplyClassifier");

const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const THREAD_SUBJECT = "Next steps for Establishing Glory: The Library — Professional Publishing Package";
const SELECTION_SOURCE = "PUBLISHING_MAILBOX_REPLY";

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
  return { status: 400, jsonBody: { status: "error", code: "CONFIRM_PAYMENT_OPTION_CAPTURE_FLAG_REQUIRED" } };
}

app.http("run-milestone6-payment-option-capture", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-milestone6-payment-option-capture",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Milestone 6 payment-option capture rejected: invalid or missing runner key.");
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
    const classification = safeTrim(body.classification);
    const receivedDateTime = safeTrim(body.receivedDateTime);
    const evidenceLogId = safeTrim(body.evidenceLogId);
    const confirmCapture = body.confirmCapture === true;

    if (!confirmCapture) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Milestone 6 payment-option capture rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const details = getPaymentOptionDetails(classification);
    if (!details) {
      return {
        status: 422,
        jsonBody: { status: "error", code: "CLASSIFICATION_NOT_A_PAYMENT_OPTION", classification }
      };
    }

    const opportunityPayload = {
      jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_SELECTED",
      jm1_m6selectedpaymentoption: classification,
      jm1_m6selectedinstallmentcount: details.installments,
      jm1_m6selectedpaymentamount: details.perInstallmentUsd,
      jm1_m6selectedpaymenttotal: Math.round(details.installments * details.perInstallmentUsd * 100) / 100,
      jm1_m6paymentselectionsource: SELECTION_SOURCE,
      jm1_m6paymentselectionthreadsubject: THREAD_SUBJECT
    };

    if (receivedDateTime && !Number.isNaN(Date.parse(receivedDateTime))) {
      opportunityPayload.jm1_m6paymentselectionreceivedon = receivedDateTime;
    }
    if (evidenceLogId) {
      opportunityPayload.jm1_m6paymentselectionevidencelog = evidenceLogId;
    }

    const result = await writeMilestone6PaymentOptionCapture({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      entitySet: ALLOWED_ENTITY_SET,
      opportunityPayload
    });

    context.info(
      `Milestone 6 payment-option capture attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
