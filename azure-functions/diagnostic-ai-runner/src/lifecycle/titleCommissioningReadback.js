"use strict";
const { ownerBinding } = require("./titleCommissioningOwnerBindings");
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { createTitleCommissioningRuntimeReaders } = require("./titleCommissioningRuntimeReaders");
const { readTitleCommissioningAuthority } = require("./titleCommissioningAuthority");

async function titleCommissioningReadback(body, deps = {}) {
  if (!body || Object.keys(body).some(k => !["mode", "titleId"].includes(k)) ||
      body.mode !== "COMMISSIONING_INTAKE_READ_ONLY" || !ownerBinding(body.titleId)) {
    return { status: 400, jsonBody: { code: "COMMISSIONING_READBACK_SCOPE_DENIED", effects: 0 } };
  }
  const binding = ownerBinding(body.titleId); const plan = planTitleCommissioningRun(binding.request);
  const containerClient = deps.containerClient || require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(process.env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL
  });
  const readers = deps.readers || createTitleCommissioningRuntimeReaders({ ...deps, containerClient });
  let scope = binding.scope; let scopePersisted = false;
  try { scope = await readers.readScope(body.titleId); scopePersisted = true; }
  catch (error) { if (error?.statusCode !== 404) throw error; }
  const authority = await readTitleCommissioningAuthority(binding.request, { ...deps, client, ...readers, readScope: async () => scope });
  async function read(path) {
    const blob = containerClient.getBlockBlobClient(path);
    try {
      const { etag } = await blob.getProperties();
      if (!etag) throw new Error("COMMISSIONING_READBACK_VERSION_MISSING");
      return { etag, value: JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } })).toString("utf8")) };
    } catch (error) { if (error?.statusCode === 404) return null; throw error; }
  }
  const execution = await read(`commissioning-executions/${plan.titleId}/${plan.bindingHash}.json`);
  const receipt = await read(`commissioning-intake/${plan.titleId}/${plan.bindingHash}.json`);
  for (const record of [execution, receipt].filter(Boolean)) {
    if (record.value.executionId !== plan.executionId || record.value.titleId !== plan.titleId || record.value.bindingHash !== plan.bindingHash) {
      throw Object.assign(new Error("COMMISSIONING_READBACK_IDENTITY_CONFLICT"), { safeCode: "COMMISSIONING_READBACK_IDENTITY_CONFLICT" });
    }
  }
  return { status: 200, jsonBody: { mode: body.mode, effects: 0, observedAt: new Date().toISOString(),
    titleId: plan.titleId, executionId: plan.executionId, bindingHash: plan.bindingHash,
    nativeAuthorityAndBytes: "PASS", artifactBindings: authority.artifacts, scopePersisted,
    execution: execution ? { etag: execution.etag, status: execution.value.status, attempts: execution.value.attempts,
      claimedAt: execution.value.claimedAt, leaseUntil: execution.value.leaseUntil, completedAt: execution.value.completedAt,
      nextAttemptAt: execution.value.nextAttemptAt, failureCode: execution.value.failureCode } : null,
    receipt: receipt ? { etag: receipt.etag, status: receipt.value.status, productionStageChanged: receipt.value.productionStageChanged,
      historyTreatment: receipt.value.historyTreatment, source: receipt.value.source, retainedWork: receipt.value.retainedWork } : null } };
}
module.exports = { titleCommissioningReadback };
