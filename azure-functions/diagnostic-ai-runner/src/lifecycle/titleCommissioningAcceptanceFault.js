"use strict";
const { planTitleCommissioningRun } = require("./titleCommissioningRun");
const { executeTitleCommissioningIntake } = require("./titleCommissioningIntake");
const { ownerBinding } = require("./titleCommissioningOwnerBindings");
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function acceptanceFaultDeps(input, deps, env) {
  const mode = env.JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT;
  if (!mode || mode === "NONE") return deps;
  const exerciseId = env.JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID;
  if (!ownerBinding(input.title?.jm1pub_titleid) || !GUID.test(exerciseId || "") ||
      !["RECEIPT_WRITE_TRANSIENT", "AFTER_CLAIM_PAUSE"].includes(mode)) {
    throw Object.assign(new Error("COMMISSIONING_ACCEPTANCE_SCOPE_DENIED"), { safeCode: "COMMISSIONING_ACCEPTANCE_SCOPE_DENIED" });
  }
  const plan = planTitleCommissioningRun(input);
  const receiptPath = `commissioning-intake/${plan.titleId}/${plan.bindingHash}.json`;
  async function record() {
    const body = Buffer.from(JSON.stringify({ schemaVersion: 1, exerciseId, mode, executionId: plan.executionId,
      titleId: plan.titleId, businessEffects: 0 }));
    const blob = deps.containerClient.getBlockBlobClient(`commissioning-acceptance/${plan.bindingHash}/${exerciseId}/${mode}.json`);
    try { await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } }); }
    catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      if (!(await blob.downloadToBuffer()).equals(body)) throw new Error("COMMISSIONING_ACCEPTANCE_RECORD_CONFLICT");
    }
  }
  return { ...deps, executeIntake: async (request, workerDeps) => {
    await record();
    if (mode === "AFTER_CLAIM_PAUSE") {
      // Controlled restart exercise only. No source or receipt mutation occurs
      // during this pause; restart/disable preserves the durable claim.
      await (deps.pause || (ms => new Promise(resolve => setTimeout(resolve, ms))))(6 * 60 * 1000);
      throw Object.assign(new Error("COMMISSIONING_DEPENDENCY_UNAVAILABLE"), { statusCode: 503 });
    }
    const containerClient = { getBlockBlobClient(path) {
      const blob = deps.containerClient.getBlockBlobClient(path);
      if (path !== receiptPath) return blob;
      return {
        uploadData: async () => { throw Object.assign(new Error("COMMISSIONING_DEPENDENCY_UNAVAILABLE"), { statusCode: 503 }); },
        downloadToBuffer: (...args) => blob.downloadToBuffer(...args)
      };
    } };
    return executeTitleCommissioningIntake(request, { ...workerDeps, containerClient });
  } };
}
module.exports = { acceptanceFaultDeps };
