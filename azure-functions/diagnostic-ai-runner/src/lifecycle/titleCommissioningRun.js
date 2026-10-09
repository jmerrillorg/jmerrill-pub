"use strict";

const { createHash } = require("node:crypto");
const { isJackieAuthoredTitle } = require("../author/jackieTitleSystemCommissioningPolicy");
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
const FORBIDDEN_EFFECTS = Object.freeze([
  "AUTHOR_COMMUNICATION", "PAYMENT", "FULFILLMENT", "IDENTIFIER_REGISTRATION",
  "DISTRIBUTION_SUBMISSION", "PUBLIC_RELEASE", "LIVE_STAGE_RESET"
]);

function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function hash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function exact(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !/[\r\n]/.test(value); }

// This manifest is an intake plan, not stage completion or permission to execute.
// Its executionId feeds the existing stage journal after owner authority passes.
function planTitleCommissioningRun(input) {
  const { title, source, retainedArtifacts = [], historyReference, revision } = input || {};
  if (!isJackieAuthoredTitle(title)) fail("JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED");
  if (!GUID.test(title?.jm1pub_titleid || "") || !Number.isSafeInteger(revision) || revision < 1 ||
      !exact(historyReference) || !exact(source?.reference) || !exact(source?.version) || !SHA.test(source?.sha256 || "")) {
    fail("COMMISSIONING_SOURCE_OR_HISTORY_UNBOUND");
  }
  if (!Array.isArray(retainedArtifacts)) fail("COMMISSIONING_RETAINED_ARTIFACTS_INVALID");
  const ids = new Set();
  const artifacts = retainedArtifacts.map(artifact => {
    if (!GUID.test(artifact?.artifactId || "") || !SHA.test(artifact.sha256 || "") ||
        !exact(artifact.version) || !exact(artifact.reference) || ids.has(artifact.artifactId.toLowerCase())) {
      fail("COMMISSIONING_RETAINED_ARTIFACTS_INVALID");
    }
    ids.add(artifact.artifactId.toLowerCase());
    return { artifactId: artifact.artifactId.toLowerCase(), sha256: artifact.sha256,
      version: artifact.version, reference: artifact.reference, disposition: "PRESERVE_REVALIDATE" };
  }).sort((a, b) => a.artifactId.localeCompare(b.artifactId));
  const sourceBinding = { reference: source.reference, version: source.version, sha256: source.sha256 };
  if (source.role !== undefined) {
    if (!["RECEIVED_ORIGINAL", "APPROVED_CONTROLLING"].includes(source.role)) fail("COMMISSIONING_SOURCE_ROLE_INVALID");
    sourceBinding.role = source.role;
  }
  const identity = { titleId: title.jm1pub_titleid.toLowerCase(), revision, source: sourceBinding,
    retainedArtifacts: artifacts, historyReference };
  const bindingHash = hash(identity);
  return {
    schemaVersion: 1, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", ...identity,
    executionId: `commissioning:${identity.titleId}:v${revision}:${bindingHash}`,
    bindingHash, entryStage: "01_INQUIRY", state: "PLANNED_NOT_STARTED",
    forbiddenEffects: [...FORBIDDEN_EFFECTS], historyTreatment: "PRESERVE_NO_HISTORICAL_REPLAY",
    existingWorkTreatment: "SOURCE_BOUND_REVALIDATION_NOT_AUTOMATIC_COMPLETION",
    nextAction: "OWNER_INTAKE_AUTHORITY_AND_ADAPTER_BINDING"
  };
}

function assertCommissioningEffectAllowed(run, effect) {
  if (run?.mode !== "JACKIE_TITLE_INTERNAL_COMMISSIONING" || !exact(effect) ||
      FORBIDDEN_EFFECTS.includes(effect) || !["INTERNAL_ARTIFACT", "INTERNAL_APPROVAL_WAIT", "READBACK"].includes(effect)) {
    fail("COMMISSIONING_EFFECT_NOT_AUTHORIZED");
  }
}

// Planning records share the existing stage-runtime container. They do not
// create lifecycle truth, stage events, or permission to dispatch an adapter.
async function persistTitleCommissioningPlan(input, deps = {}) {
  const run = planTitleCommissioningRun(input);
  if (typeof deps.authorize !== "function" || await deps.authorize(input.title, run) !== true) {
    fail("COMMISSIONING_LIVE_AUTHORITY_NOT_VERIFIED");
  }
  if (!deps.containerClient) fail("COMMISSIONING_STAGE_STORAGE_NOT_BOUND");
  const blob = deps.containerClient.getBlockBlobClient(`commissioning-plans/${run.titleId}/${run.bindingHash}.json`);
  const body = Buffer.from(JSON.stringify(run));
  try {
    await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } });
    return { run, duplicate: false };
  } catch (error) {
    if (![409, 412].includes(error?.statusCode)) throw error;
    const previous = await blob.downloadToBuffer();
    if (!previous.equals(body)) fail("COMMISSIONING_PLAN_REPLAY_CONFLICT");
    return { run, duplicate: true };
  }
}

module.exports = { FORBIDDEN_EFFECTS, planTitleCommissioningRun, assertCommissioningEffectAllowed, persistTitleCommissioningPlan };
