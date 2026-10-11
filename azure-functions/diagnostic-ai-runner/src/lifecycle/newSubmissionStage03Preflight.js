"use strict";
const stage01 = require("./newSubmissionStage01");
const stage02 = require("./newSubmissionStage02");
const fresh = require("./freshTitleIntake");
const { consumeWorkingSource } = require("./newSubmissionStage03Source");
const MODE = "SUBMISSION_03_SOURCE_PREFLIGHT";
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (body?.mode !== MODE || !Object.hasOwn(fresh.POLICIES, body.titleId || "") ||
      Object.keys(body).some(k => !["titleId", "mode"].includes(k))) {
    return { status: 400, jsonBody: { code: "COMMISSIONING_STAGE03_SCOPE_DENIED", effects: 0 } };
  }
  if (["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"].some(k => env[k] !== "false")) {
    return { status: 403, jsonBody: { code: "COMMISSIONING_STAGE03_BROAD_RUNTIME_MUST_BE_DISABLED", effects: 0 } };
  }
  try {
    const context = await (deps.native || stage01.native)(deps);
    const prior = await (deps.stage02Readback || stage02.handler)({ titleId: body.titleId, mode: "SUBMISSION_02_READBACK" }, context);
    const receipt = prior.jsonBody?.receipt;
    if (prior.status !== 200 || receipt?.titleId !== body.titleId || receipt.status !== "COMPLETED" || receipt.stage03 !== "NOT_STARTED" || !Array.isArray(receipt.outputs) || !receipt.outputs.length) {
      throw Object.assign(new Error("COMMISSIONING_STAGE03_STAGE02_REQUIRED"), { safeCode: "COMMISSIONING_STAGE03_STAGE02_REQUIRED" });
    }
    const components = [];
    for (const output of receipt.outputs) {
      const result = await (deps.consumeWorkingSource || consumeWorkingSource)(output, context);
      components.push(result.provenance);
    }
    return { status: 200, jsonBody: {
      titleId: body.titleId, intakeId: receipt.intakeId, sourceFingerprint: receipt.sourceFingerprint,
      proofLevel: "NATIVE_WORKING_SOURCE_CONSUMPTION_ONLY", components,
      sourceAssembly: "SEPARATE_COMPONENTS_NO_ORDER_INFERRED", stage03: "NOT_STARTED", stage04: "NOT_STARTED",
      editorialAssessment: "NOT_EXECUTED", financialApprovalInferred: false,
      modelCalls: 0, communications: 0, effects: 0,
    } };
  } catch (error) {
    return { status: 409, jsonBody: {
      code: /^(COMMISSIONING_|STAGE03_)[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "COMMISSIONING_STAGE03_SOURCE_READ_FAILED",
      providerStatus: error.statusCode || null, stage03: "NOT_STARTED", stage04: "NOT_STARTED",
      modelCalls: 0, communications: 0, effects: 0,
    } };
  }
}
module.exports = { MODE, handler };
