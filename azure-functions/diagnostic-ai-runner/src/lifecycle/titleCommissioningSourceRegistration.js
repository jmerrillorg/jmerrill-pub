"use strict";

const received = require("./titleCommissioningReceivedSources");
const bindings = require("./titleCommissioningOwnerBindings");
async function sourceRegistrationHandler(request, deps = {}) {
  const env = deps.env || process.env;
  if (!env.JM1_DIAGNOSTIC_RUNNER_KEY || request.headers.get("x-jm1-diagnostic-runner-key") !== env.JM1_DIAGNOSTIC_RUNNER_KEY) {
    return { status: 401, jsonBody: { code: "UNAUTHORIZED", effects: 0 } };
  }
  let body;
  try { body = await request.json(); } catch { return { status: 400, jsonBody: { code: "INVALID_JSON", effects: 0 } }; }
  const reconciliation = require("./longWatchCommissioningIdentityReconciliation");
  if (body?.titleId === reconciliation.titleId && ["IDENTITY_PREFLIGHT", "RECONCILE_IDENTITY"].includes(body.mode) &&
      !Object.keys(body).some(k => !["titleId", "mode"].includes(k))) {
    return longWatchIdentity(body, deps, env);
  }
  const policy = received.policyForTitle(body?.titleId);
  if (!body || Object.keys(body).some(k => !["titleId", "mode"].includes(k)) || !policy ||
      !["PREFLIGHT", "REGISTER_INTAKE"].includes(body.mode)) return { status: 400, jsonBody: { code: "COMMISSIONING_REGISTRATION_SCOPE_DENIED", effects: 0 } };
  if (body.mode === "REGISTER_INTAKE" && !bindings.registrationEnabled(policy.titleId, env)) {
    return { status: 403, jsonBody: { code: "COMMISSIONING_REGISTRATION_DISABLED", effects: 0 } };
  }
  if (body.mode === "REGISTER_INTAKE" && env.JM1_TITLE_COMMISSIONING_REVIEW_ENABLED === "true") {
    return { status: 403, jsonBody: { code: "COMMISSIONING_REGISTRATION_INFERENCE_MUST_BE_DISABLED", effects: 0 } };
  }
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL });
  let attempted = false;
  try {
    const context = { ...deps, client, env };
    const proof = await (deps.readReceivedSourceProof || received.readReceivedSourceProof)(policy, context);
    const title = await received.readSourceTitle(policy, context);
    if (body.mode === "PREFLIGHT") return { status: 200, jsonBody: { titleId: policy.titleId,
      titleExists: Boolean(title), titleCreationProposed: !title && Boolean(policy.newTitleWorkReference),
      sourceArtifactId: received.sourceArtifactId(policy), sourceSha256: policy.sha256, role: "RECEIVED_ORIGINAL",
      proof, editorialApproval: false, effects: 0 } };
    const containerClient = deps.containerClient || require("@azure/storage-blob").BlobServiceClient
      .fromConnectionString(env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
    const readers = require("./titleCommissioningRuntimeReaders").createTitleCommissioningRuntimeReaders({ ...context, containerClient });
    // A retained revocation always wins; registration cannot repair it by creating a new scope.
    try {
      const scope = await readers.readScope(policy.titleId);
      if (scope.revoked === true || scope.enabled !== true || scope.sourceRole !== "RECEIVED_ORIGINAL") {
        throw Object.assign(new Error("COMMISSIONING_SCOPE_NOT_CURRENT"), { safeCode: "COMMISSIONING_SCOPE_NOT_CURRENT" });
      }
    } catch (error) { if (error.statusCode !== 404) throw error; }
    attempted = true;
    const result = await received.withRegistrationClaim(policy, { ...context, containerClient },
      current => received.registerReceivedSource(policy, current));
    await bindings.ensureTitleCommissioningOwnerBindings(policy.titleId, { ...context, containerClient, ...readers });
    const binding = await bindings.resolveOwnerBinding(policy.titleId, context);
    const intake = await require("./titleCommissioningIntakeWorker").processTitleCommissioningIntake(binding.request,
      { ...context, containerClient, ...readers });
    return { status: 200, jsonBody: { registration: result, intake, modelCalls: 0, communications: 0, payments: 0,
      productionStageChanged: false, editorialApproval: false, scope: "RECEIVED_SOURCE_AND_INTERNAL_LINKED_INTAKE_ONLY" } };
  } catch (error) {
    const code = /^COMMISSIONING_[A-Z_]{1,100}$/.test(error.safeCode || "") ? error.safeCode : "COMMISSIONING_REGISTRATION_DEPENDENCY_FAILED";
    return { status: 409, jsonBody: { code, mutationAttempted: attempted, recovery: attempted ? "EXACT_ID_READBACK_REQUIRED_NO_NEW_IDS" : "NONE",
      modelCalls: 0, communications: 0, payments: 0 } };
  }
}
async function longWatchIdentity(body, deps, env) {
  if (body.mode === "RECONCILE_IDENTITY" && (env.JM1_TITLE_COMMISSIONING_LONGWATCH_RECONCILIATION_ENABLED !== "true" ||
      env.JM1_TITLE_COMMISSIONING_REVIEW_ENABLED === "true")) {
    return { status: 403, jsonBody: { code: "COMMISSIONING_LONGWATCH_RECONCILIATION_DISABLED", effects: 0 } };
  }
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL });
  const reconciliation = require("./longWatchCommissioningIdentityReconciliation");
  const containerClient = body.mode === "RECONCILE_IDENTITY" ? deps.containerClient || require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime") : deps.containerClient || { getBlockBlobClient() { throw Error("READ_ONLY_NO_STORAGE"); } };
  const readers = require("./titleCommissioningRuntimeReaders").createTitleCommissioningRuntimeReaders({ ...deps, client, containerClient });
  const context = { ...deps, client, containerClient, env, ...readers };
  try {
    const authority = await reconciliation.readAuthority(context);
    if (body.mode === "IDENTITY_PREFLIGHT") return { status: 200, jsonBody: { titleId: body.titleId, titleVersion: String(authority.title.versionnumber),
      currentReference: authority.title.jm1_canonicalauthorcontactreference, proposedReference: `contact:${require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID}`,
      evidence: authority.evidence, effects: 0 } };
    try { const scope = await readers.readScope(body.titleId); if (scope.revoked === true || scope.enabled !== true) throw Error("REVOKED_SCOPE"); }
    catch (error) { if (error.statusCode !== 404) throw error; }
    const result = await reconciliation.reconcileIdentity(context);
    await bindings.ensureTitleCommissioningOwnerBindings(body.titleId, context);
    const binding = await bindings.resolveOwnerBinding(body.titleId, context);
    const intake = await require("./titleCommissioningIntakeWorker").processTitleCommissioningIntake(binding.request, context);
    return { status: 200, jsonBody: { identityReconciliation: result, intake, modelCalls: 0, communications: 0, payments: 0,
      productionStageChanged: false, scope: "EXACT_IDENTITY_CORRECTION_AND_INTERNAL_LINKED_INTAKE_ONLY" } };
  } catch (error) {
    return { status: 409, jsonBody: { code: /^COMMISSIONING_[A-Z_]{1,100}$/.test(error.safeCode || "") ? error.safeCode : "COMMISSIONING_LONGWATCH_RECONCILIATION_FAILED",
      mutationAttempted: body.mode === "RECONCILE_IDENTITY", recovery: "RETAIN_INTENT_AND_EXACT_ID_READBACK", modelCalls: 0, communications: 0, payments: 0 } };
  }
}
module.exports = { sourceRegistrationHandler };
