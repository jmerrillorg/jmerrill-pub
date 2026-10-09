"use strict";

const { createTitleCommissioningRuntimeReaders } = require("./titleCommissioningRuntimeReaders");
const { processTitleCommissioningIntake } = require("./titleCommissioningIntakeWorker");
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

async function runTitleCommissioningIntakeRuntime(deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_TITLE_COMMISSIONING_INTAKE_ENABLED !== "true") return { enabled: false, results: [], failures: [] };
  const ids = (env.JM1_TITLE_COMMISSIONING_INTAKE_TITLE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!ids.length || ids.length > 5 || ids.some(id => !GUID.test(id)) || new Set(ids).size !== ids.length) {
    throw Object.assign(new Error("COMMISSIONING_TITLE_ALLOWLIST_INVALID"), { safeCode: "COMMISSIONING_TITLE_ALLOWLIST_INVALID" });
  }
  const containerClient = deps.containerClient || require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL
  });
  const readers = createTitleCommissioningRuntimeReaders({ ...deps, containerClient });
  const results = []; const failures = [];
  for (const titleId of ids) {
    try {
      await require("./titleCommissioningOwnerBindings").ensureTitleCommissioningOwnerBindings(titleId,
        { ...deps, client, containerClient, ...readers });
      // Read a fixed owner-maintained request; never accept an invocation body
      // or list/discover other titles from this timer.
      const blob = containerClient.getBlockBlobClient(`commissioning-requests/${titleId}.json`);
      const { etag } = await blob.getProperties();
      if (!etag) throw new Error("request version missing");
      const request = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } })).toString("utf8"));
      if (request.schemaVersion !== 1 || request.title?.jm1pub_titleid !== titleId ||
          typeof request.authorityReference !== "string" || !request.authorityReference.trim()) throw new Error("request provenance missing");
      const scope = await readers.readScope(titleId);
      if (scope.authorityReference !== request.authorityReference) throw new Error("request authority mismatch");
      const workerDeps = require("./titleCommissioningAcceptanceFault").acceptanceFaultDeps(request,
        { ...deps, client, containerClient, ...readers }, env);
      const result = await processTitleCommissioningIntake(request, workerDeps);
      results.push({ titleId, executionId: result.executionId, status: result.status, receiptReference: result.receiptReference || null });
      if (result.status === "HELD" || result.status === "RETRY_PENDING") failures.push({ titleId, code: result.failureCode, status: result.status });
    } catch (error) {
      failures.push({ titleId, code: error?.statusCode === 404 ? "COMMISSIONING_OWNER_BINDING_MISSING" : "COMMISSIONING_READ_OR_DISPATCH_FAILED" });
    }
  }
  return { enabled: true, results, failures };
}

module.exports = { runTitleCommissioningIntakeRuntime };
