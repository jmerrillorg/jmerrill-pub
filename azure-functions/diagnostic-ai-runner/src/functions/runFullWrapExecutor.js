"use strict";

const { app } = require("@azure/functions");
const { executeFullWrapPreparation } = require("../production/fullWrapExecutor");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function cleanAsset(asset) {
  return {
    type: safeTrim(asset?.type),
    location: safeTrim(asset?.location),
    sha256: safeTrim(asset?.sha256),
    authority: safeTrim(asset?.authority)
  };
}

app.http("run-full-wrap-executor", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-full-wrap-executor",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Full Wrap executor rejected: invalid or missing runner key.");
      return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const input = {
      taskId: safeTrim(body.taskId),
      titleId: safeTrim(body.titleId),
      title: safeTrim(body.title),
      author: safeTrim(body.author),
      trimSize: safeTrim(body.trimSize),
      paperStock: safeTrim(body.paperStock),
      pageCount: body.pageCount,
      isbn: safeTrim(body.isbn),
      barcode: safeTrim(body.barcode),
      imprint: safeTrim(body.imprint),
      distributionPath: safeTrim(body.distributionPath),
      backCoverCopy: safeTrim(body.backCoverCopy),
      sourceAssets: Array.isArray(body.sourceAssets) ? body.sourceAssets.map(cleanAsset) : [],
      confirmFullWrapExecution: body.confirmFullWrapExecution === true
    };

    const result = await executeFullWrapPreparation(input);
    context.info(
      `Full Wrap executor attempted; taskId=${input.taskId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    const status = result.ok ? 200 : (
      result.reason === "GATE_CLOSED" ? 503 :
      result.reason === "DATAVERSE_CONFIG_MISSING" ? 503 :
      422
    );
    return { status, jsonBody: result };
  }
});

module.exports = {};
