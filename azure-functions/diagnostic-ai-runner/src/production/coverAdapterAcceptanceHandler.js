"use strict";

const { runCoverAdapterAcceptance, readCoverAdapterAcceptance } = require("./coverAdapterAcceptance");

function acceptanceContainer(env) {
  return require("@azure/storage-blob").BlobServiceClient.fromConnectionString(env.AzureWebJobsStorage)
    .getContainerClient("jm1-publishing-stage-runtime");
}

async function coverAdapterAcceptanceHandler(request, deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED !== "true") {
    return { status: 403, jsonBody: { code: "COVER_ADAPTER_ACCEPTANCE_DISABLED" } };
  }
  if (!env.JM1_DIAGNOSTIC_RUNNER_KEY || request.headers?.get?.("x-jm1-diagnostic-runner-key") !== env.JM1_DIAGNOSTIC_RUNNER_KEY) {
    return { status: 403, jsonBody: { code: "COVER_ACCEPTANCE_AUTHORIZATION_DENIED" } };
  }
  let body;
  try { body = await request.json(); } catch { return { status: 400, jsonBody: { code: "COVER_ACCEPTANCE_REQUEST_INVALID" } }; }
  if (!body || Object.keys(body).length !== 1 || !["READ", "SEED", "DISPATCH"].includes(body.action)) {
    return { status: 400, jsonBody: { code: "COVER_ACCEPTANCE_REQUEST_INVALID" } };
  }
  try {
    const container = deps.containerClient || acceptanceContainer(env);
    const result = body.action === "READ" ? await readCoverAdapterAcceptance(container) :
      await runCoverAdapterAcceptance(container, { seed: body.action === "SEED" });
    return { status: 200, jsonBody: result };
  } catch {
    return { status: 503, jsonBody: { code: "COVER_ACCEPTANCE_NATIVE_ADAPTER_FAILED", retryRequiresReadback: true } };
  }
}

async function runScheduledCoverAdapterAcceptance(deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED !== "true") return { enabled: false, results: [] };
  const container = deps.containerClient || acceptanceContainer(env);
  // The scheduler never provisions fixtures. Explicit bounded seeding is separate.
  return { enabled: true, ...await runCoverAdapterAcceptance(container) };
}

module.exports = { coverAdapterAcceptanceHandler, runScheduledCoverAdapterAcceptance };
