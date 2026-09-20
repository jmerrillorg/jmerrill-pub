"use strict";

const { app } = require("@azure/functions");
const {
  applyAuthorizedAssetPlacement,
  createDefaultInboundContextProvider,
  createDefaultInboundEvidenceStore
} = require("../mail/inbound");

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

app.http("run-publishing-inbound-asset-placement", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publishing/inbound/asset-placement",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }
    try {
      const result = await applyAuthorizedAssetPlacement(body, {
        store: createDefaultInboundEvidenceStore(),
        contextProvider: createDefaultInboundContextProvider()
      });
      context.info(`Publishing inbound asset placement completed; message=${result.messageEventId}; idempotent=${result.idempotent}`);
      return { status: 200, jsonBody: { status: "ok", ...result } };
    } catch (error) {
      const status = Number(error.httpStatus) || 500;
      context.warn(`Publishing inbound asset placement denied; code=${error.safeCode || "ASSET_PLACEMENT_FAILED"}`);
      return { status, jsonBody: { status: "error", code: error.safeCode || "ASSET_PLACEMENT_FAILED" } };
    }
  }
});

module.exports = {};
