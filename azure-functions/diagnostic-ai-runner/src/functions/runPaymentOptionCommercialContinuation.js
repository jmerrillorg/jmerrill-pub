"use strict";

const { app } = require("@azure/functions");
const { continuePaymentOptionCommercialPath } = require("../author/paymentOptionCommercialContinuation");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

app.http("run-payment-option-commercial-continuation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-payment-option-commercial-continuation",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Payment-option commercial continuation rejected: invalid or missing runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const result = await continuePaymentOptionCommercialPath({
      opportunityId: safeTrim(body.opportunityId),
      correlationId: safeTrim(body.correlationId),
      paymentPolicyVersion: safeTrim(body.paymentPolicyVersion),
      confirmPaymentOptionCommercialContinuation: body.confirmPaymentOptionCommercialContinuation === true
    });

    context.info(
      `Payment-option commercial continuation attempted; opportunityId=${safeTrim(body.opportunityId)}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
