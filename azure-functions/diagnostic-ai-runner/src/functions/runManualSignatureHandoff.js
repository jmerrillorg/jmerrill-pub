"use strict";

const { app } = require("@azure/functions");
const {
  markAgreementReadyForManualSignatureSend,
  recordAgreementSentManually
} = require("../agreement/manualSignatureHandoff");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function cleanArtifact(artifact) {
  return {
    name: safeTrim(artifact?.name),
    location: safeTrim(artifact?.location),
    sha256: safeTrim(artifact?.sha256)
  };
}

app.http("run-manual-signature-handoff", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-manual-signature-handoff",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Manual signature handoff rejected: invalid or missing runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const input = {
      opportunityId: safeTrim(body.opportunityId),
      intakeReferenceCode: safeTrim(body.intakeReferenceCode),
      authorName: safeTrim(body.authorName),
      authorEmail: safeTrim(body.authorEmail),
      title: safeTrim(body.title),
      documentLocation: safeTrim(body.documentLocation),
      artifacts: Array.isArray(body.artifacts) ? body.artifacts.map(cleanArtifact) : [],
      confirmManualSignatureHandoff: body.confirmManualSignatureHandoff === true
    };
    const action = safeTrim(body.action).toUpperCase();
    const result = action === "RECORD_SENT_MANUALLY"
      ? await recordAgreementSentManually(input)
      : await markAgreementReadyForManualSignatureSend(input);

    context.info(
      `Manual signature handoff attempted; opportunityId=${input.opportunityId}; action=${action || "MARK_READY"}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
