"use strict";

const { app } = require("@azure/functions");
const { timingSafeEqual } = require("node:crypto");
const { exportStage07Receipts } = require("../author/stage07ReceiptExport");

async function handleStage07ReceiptExport(request, deps = {}) {
  const headers = { "Cache-Control": "no-store, private", "Pragma": "no-cache" };
  const expected = deps.expectedKey ?? process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  if (!expected || !actual || Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    return { status: 401, headers, jsonBody: { error: "UNAUTHORIZED" } };
  }
  if (request.method !== "GET" || new URL(request.url).search) {
    return { status: 400, headers, jsonBody: { error: "FIXED_READ_SCOPE_REQUIRED" } };
  }
  try {
    return { status: 200, headers, jsonBody: await exportStage07Receipts(deps.container) };
  } catch {
    // Never log receipt contents, credentials, or storage error payloads.
    return { status: 503, headers, jsonBody: { error: "EXACT_RECEIPT_READ_FAILED" } };
  }
}

app.http("publishing-stage07-receipt-export", {
  methods: ["GET"], authLevel: "anonymous",
  route: "publishing/authority/stage07-receipts",
  handler: (request) => handleStage07ReceiptExport(request),
});

module.exports = { handleStage07ReceiptExport };
