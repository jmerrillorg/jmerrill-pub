"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");
const { createCoverOwnerStore, digest, hash } = require("./coverOwnerStore");
const { executeCoverOwner } = require("./coverOwnerRuntime");
const { resolveOwnerBinding } = require("../lifecycle/titleCommissioningOwnerBindings");
const { createTitleCommissioningRuntimeReaders } = require("../lifecycle/titleCommissioningRuntimeReaders");
const { readTitleCommissioningAuthority } = require("../lifecycle/titleCommissioningAuthority");
const { planTitleCommissioningRun } = require("../lifecycle/titleCommissioningRun");
const IDS = Object.freeze(["f1908dc9-5775-f111-ab0f-6045bdd69435", "e797232b-da7a-f111-ab0f-00224820105b",
  "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2", "f79006b7-f595-f111-8076-00224820105b", "0e127af9-fcb3-5671-a0fa-e4af63c307d1"]);
const SHA = /^[a-f0-9]{64}$/;
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID } = require("../author/jackieTitleSystemCommissioningPolicy");
const { createCoverSharePointPersistence, verifyPrintGeometry } = require("./coverSharePointPersistence");
const { createCoverReviewUploadJournal } = require("./coverReviewUploadJournal");

function nativeContext(deps = {}) {
  const env = deps.env || process.env;
  const service = deps.service || BlobServiceClient.fromConnectionString(env.AzureWebJobsStorage);
  const containerClient = deps.containerClient || service.getContainerClient("jm1-publishing-stage-runtime");
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL });
  return { ...deps, env, service, containerClient, client };
}

async function verifyNativeCoverAuthority(request, input, deps) {
  if (!IDS.includes(request.titleId) || input.synthetic === true || input.held === true) return false;
  const binding = await resolveOwnerBinding(request.titleId, deps);
  if (!binding || binding.request.source.role === "RECEIVED_ORIGINAL" ||
      binding.request.source.reference !== `dataverse:jm1pub_editorialartifact:${request.source.artifactId}` ||
      binding.request.source.version !== request.source.version || binding.request.source.sha256 !== request.source.sha256) return false;
  const readers = createTitleCommissioningRuntimeReaders(deps);
  const authority = await readTitleCommissioningAuthority(binding.request, { ...deps, ...readers });
  const contact = await deps.client.first("contacts", { $filter: `contactid eq ${authority.identityProof.contactId}` });
  if (contact?.statecode !== 0 || contact.contactid !== authority.identityProof.contactId ||
      !Number.isSafeInteger(contact.versionnumber)) return false;
  const plan = planTitleCommissioningRun(binding.request);
  const intakeBlob = deps.containerClient.getBlockBlobClient(`commissioning-intake/${request.titleId}/${plan.bindingHash}.json`);
  const intake = JSON.parse((await intakeBlob.downloadToBuffer()).toString("utf8"));
  if (intake.status !== "COMPLETED" || intake.executionId !== plan.executionId ||
      intake.source?.sha256 !== request.source.sha256) return false;
  try {
    const review = JSON.parse((await deps.containerClient.getBlockBlobClient(
      `commissioning-review-executions/${request.titleId}/${plan.bindingHash}.json`).downloadToBuffer()).toString("utf8"));
    if (review.status !== "COMPLETED") return false;
  } catch (error) { if (error.statusCode !== 404) throw error; return false; }
  const candidates = input.candidates || [];
  for (const [field, actual] of [["authorId", authority.identityProof.contactId], ["title", authority.title.jm1pub_titlename],
    ["subtitle", authority.title.jm1pub_subtitle], ["authorDisplay", authority.title.jm1pub_authordisplayname]]) {
    if (candidates.some(row => row.field === field && row.value !== actual) || !candidates.some(row => row.field === field)) return false;
  }
  const edition = await deps.client.first("jm1pub_publishingassets", { $filter: `jm1pub_publishingassetid eq ${request.editionId}` });
  if (edition?.jm1pub_publishingassetid !== request.editionId || edition._jm1pub_titleid_value !== request.titleId ||
      edition.jm1pub_iscurrentedition !== true || !GUID.test(input.printInterior?.artifactId || "")) return false;
  const interior = await deps.client.first("jm1pub_editorialartifacts", {
    $filter: `jm1pub_editorialartifactid eq ${input.printInterior.artifactId}` });
  if (interior?.jm1pub_editorialartifactid !== input.printInterior.artifactId || interior._jm1pub_titleid_value !== request.titleId ||
      interior.jm1pub_iscurrentapproved !== true || interior.jm1pub_supersededon || interior.statecode !== 0 ||
      String(interior.versionnumber) !== input.printInterior.version || interior.jm1pub_sha256 !== input.printInterior.sha256 ||
      await readers.verifyArtifactBytes(interior, input.printInterior.sha256) !== true) return false;
  if (interior.jm1pub_fileextension !== "pdf" || input.printInterior.editionId !== request.editionId ||
      !SHA.test(input.printInterior.approvalKey || "") || !SHA.test(input.printInterior.approvalSha256 || "")) return false;
  const store = createCoverOwnerStore(deps);
  const approval = await store.read("sources", input.printInterior.approvalKey);
  const proof = approval?.value;
  if (approval?.sha256 !== input.printInterior.approvalSha256 || proof?.kind !== "AUTHENTICATED_FOUNDER_DECISION" ||
      proof.decision !== "APPROVED" || proof.revoked === true || proof.founderContactId !== JACKIE_CANONICAL_AUTHOR_CONTACT_ID ||
      !GUID.test(proof.authenticatedPrincipalId || "") ||
      proof.approvedPayloadSha256 !== digest(proof.approvedPayload) ||
      proof.approvedPayload?.titleId !== request.titleId || proof.approvedPayload.editionId !== request.editionId ||
      proof.approvedPayload.artifactId !== input.printInterior.artifactId ||
      proof.approvedPayload.version !== input.printInterior.version || proof.approvedPayload.sha256 !== input.printInterior.sha256) return false;
  const trimGeometry = require("./fullWrapExecutor").parseTrimSize(proof.approvedPayload.trimSize);
  if (!trimGeometry || Math.abs(trimGeometry.width * 72 - proof.approvedPayload.widthPoints) > 0.01 ||
      Math.abs(trimGeometry.height * 72 - proof.approvedPayload.heightPoints) > 0.01) return false;
  const bytes = await require("../editorial/productionTitleAuthorityReader").graphBytes(interior,
    { ...deps, credential: deps.credential || new ManagedIdentityCredential() });
  await verifyPrintGeometry(bytes, { ...proof.approvedPayload, sha256: input.printInterior.sha256 });
  const pages = candidates.filter(row => row.field === "pageCount");
  const trim = candidates.filter(row => row.field === "trimSize");
  if (!pages.length || pages.some(row => row.value !== proof.approvedPayload.pageCount || row.sourceChecksum !== input.printInterior.sha256) ||
      !trim.length || trim.some(row => row.value !== proof.approvedPayload.trimSize)) return false;
  const after = await deps.client.first("jm1pub_editorialartifacts", {
    $filter: `jm1pub_editorialartifactid eq ${input.printInterior.artifactId}` });
  if (after?.versionnumber !== interior.versionnumber || after.jm1pub_sha256 !== interior.jm1pub_sha256 ||
      after.jm1pub_iscurrentapproved !== true || after.jm1pub_supersededon || after.statecode !== 0) return false;
  return true;
}

function nativeGraph(deps) {
  return async (path, options = {}) => {
    const [basePath, query, ...extra] = path.split("?");
    if (!path.startsWith("drives/") || path.includes("..") || (query !== undefined &&
        (options.method !== "PUT" || !basePath.endsWith(":/content") || query !== "@microsoft.graph.conflictBehavior=fail" || extra.length))) {
      throw new Error("COVER_GRAPH_PATH_DENIED");
    }
    let token;
    try { token = await (deps.credential || new ManagedIdentityCredential()).getToken("https://graph.microsoft.com/.default"); }
    catch (error) { throw Object.assign(new Error("COVER_GRAPH_TOKEN_FAILED"), { safeCode: "COVER_GRAPH_TOKEN_FAILED", statusCode: error.statusCode }); }
    const response = await (deps.fetchImpl || fetch)(`https://graph.microsoft.com/v1.0/${path}`, {
      ...options, ...(options.method === "PUT" ? { redirect: "error" } : {}), signal: AbortSignal.timeout(45000),
      headers: { ...options.headers, Authorization: `Bearer ${token.token}` } });
    if (!response.ok) {
      const operation = basePath.endsWith("/permissions") ? "PERMISSIONS" : basePath.endsWith("createUploadSession") ? "UPLOAD_SESSION" :
        basePath.endsWith("/content") ? "CONTENT" : basePath.includes(":/") ? "TARGET" : "METADATA";
      let error;
      try { error = (await response.json()).error; } catch { /* No response body is retained. */ }
      const providerCode = ["invalidRequest", "accessDenied", "notAllowed", "itemNotFound", "generalException",
        "resourceModified", "nameAlreadyExists", "quotaLimitReached", "notSupported", "badRequest", "activityLimitReached"].includes(error?.code) ? error.code : "UNKNOWN";
      const message = typeof error?.message === "string" ? error.message : "";
      const category = /file.*(blocked|not allowed|prohibited)/i.test(message) ? "FILE_POLICY" :
        /invalid.*(path|name)/i.test(message) ? "PATH_POLICY" : /quota|storage limit/i.test(message) ? "CAPACITY" :
          /unsupported.*(file|type)/i.test(message) ? "UNSUPPORTED_TYPE" : "UNCLASSIFIED";
      const requestId = response.headers?.get("request-id");
      throw Object.assign(new Error("COVER_GRAPH_DEPENDENCY_FAILED"), { statusCode: response.status,
        safeCode: `COVER_GRAPH_${operation}_FAILED`, operation, providerCode, category,
        requestId: /^[a-f0-9-]{36}$/i.test(requestId || "") ? requestId : null });
    }
    return options.responseType === "buffer" ? Buffer.from(await response.arrayBuffer()) : response.json();
  };
}

async function persistNativeCoverReview(input, context, store) {
  const authority = await store.read("authority", input.request.authorityKey);
  if (authority?.sha256 !== input.request.authoritySha256) throw new Error("COVER_REVIEW_AUTHORITY_CHANGED");
  const destination = authority.value.reviewDelivery;
  const uploadMode = destination?.uploadMode || "SESSION";
  if (!["SESSION", "SMALL_CREATE_ONLY"].includes(uploadMode)) throw new Error("COVER_REVIEW_TRANSPORT_INVALID");
  if (!destination || destination.reviewerId !== JACKIE_CANONICAL_AUTHOR_CONTACT_ID ||
      !destination.folderPath?.startsWith("/01_Pipeline_A-Z/") ||
      !SHA.test(destination.reviewerAuthorityKey || "")) throw new Error("COVER_REVIEW_DESTINATION_NOT_BOUND");
  const binding = { titleId: input.request.titleId, editionId: input.request.editionId, executionKey: input.executionKey,
    sourceSha256: input.request.source.sha256, authoritySha256: input.request.authoritySha256,
    reviewerId: destination.reviewerId, reviewerAuthoritySha256: destination.reviewerAuthoritySha256, destination };
  const runtime = createCoverSharePointPersistence({ graph: nativeGraph(context), fetchImpl: context.fetchImpl, uploadMode,
    assertClaim: input.assertClaim,
    verifyAuthority: async () => {
      const current = await store.read("authority", input.request.authorityKey);
      const reviewer = await store.read("sources", destination.reviewerAuthorityKey);
      const assignment = reviewer?.value;
      return reviewer?.sha256 === destination.reviewerAuthoritySha256 && assignment?.kind === "CANONICAL_COVER_REVIEW_ASSIGNMENT" &&
        assignment.revoked !== true && assignment.titleId === input.request.titleId && assignment.editionId === input.request.editionId &&
        assignment.sourceSha256 === input.request.source.sha256 && assignment.reviewerId === destination.reviewerId &&
        Number.isFinite(Date.parse(assignment.accessVerifiedAt)) &&
        Math.abs(Date.now() - Date.parse(assignment.accessVerifiedAt)) <= 15 * 60 * 1000 &&
        assignment.driveId === destination.driveId && assignment.folderId === destination.folderId &&
        assignment.folderPath === destination.folderPath && assignment.permissionsSha256 === destination.permissionsSha256 &&
        assignment.privateAccessVerified === true && current?.sha256 === input.request.authoritySha256 &&
        (assignment.uploadMode || "SESSION") === uploadMode &&
        await verifyNativeCoverAuthority(input.request, current.value, context) === true;
    },
    ...createCoverReviewUploadJournal(store, undefined, uploadMode) });
  const result = await runtime.persist(binding, input.bytes);
  if (input.readOnly === true) return result;
  const saved = await store.writeJson("review-deliveries", digest(binding), result, { immutable: true });
  return saved.value;
}

async function verifyNativeCoverSpend(request, bundle, deps) {
  if (!SHA.test(request.paidApprovalKey || "") || !SHA.test(request.paidApprovalSha256 || "")) return false;
  const approval = await deps.store.read("sources", request.paidApprovalKey);
  if (!approval || approval.sha256 !== request.paidApprovalSha256) return false;
  const value = approval.value;
  if (value.kind !== "RECORDED_OWNER_COVER_SPEND_APPROVAL" || value.status !== "APPROVED" || value.revoked === true ||
      value.titleId !== request.titleId || value.editionId !== request.editionId || value.sourceSha256 !== request.source.sha256 ||
      value.bundleSha256 !== bundle.sha256 || value.variantCount !== request.variantCount ||
      value.modelDeployment !== deps.env.JM1_COVER_IMAGE_DEPLOYMENT || value.modelVersion !== deps.env.JM1_COVER_IMAGE_MODEL_VERSION ||
      !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now() ||
      !Number.isSafeInteger(value.maxCostMicroUsd) || value.maxCostMicroUsd <= 0 ||
      !SHA.test(value.decisionEvidenceKey || "") || !SHA.test(value.decisionEvidenceSha256 || "") ||
      !SHA.test(value.tariffKey || "") || !SHA.test(value.tariffSha256 || "")) return false;
  const decision = await deps.store.read("sources", value.decisionEvidenceKey);
  const tariff = await deps.store.read("sources", value.tariffKey);
  return decision?.sha256 === value.decisionEvidenceSha256 && decision.value.kind === "AUTHENTICATED_FOUNDER_DECISION" &&
    decision.value.decision === "APPROVED" && decision.value.approvedPayloadSha256 === digest(value.approvedPayload) &&
    value.approvedPayload?.titleId === request.titleId && value.approvedPayload.editionId === request.editionId &&
    value.approvedPayload.sourceSha256 === request.source.sha256 && value.approvedPayload.bundleSha256 === bundle.sha256 &&
    value.approvedPayload.maxCostMicroUsd === value.maxCostMicroUsd && value.approvedPayload.variantCount === request.variantCount &&
    decision.value.founderContactId === JACKIE_CANONICAL_AUTHOR_CONTACT_ID &&
    typeof decision.value.authenticatedPrincipalId === "string" && GUID.test(decision.value.authenticatedPrincipalId) &&
    tariff?.sha256 === value.tariffSha256 && tariff.value.modelDeployment === value.modelDeployment &&
    tariff.value.modelVersion === value.modelVersion && tariff.value.size === "1024x1536" && tariff.value.quality === "high" &&
    tariff.value.currency === "USD" && Date.parse(tariff.value.expiresAt) > Date.now() &&
    Number.isSafeInteger(tariff.value.maxMicroUsdPerImage) && tariff.value.maxMicroUsdPerImage > 0 &&
    tariff.value.maxMicroUsdPerImage * request.variantCount <= value.maxCostMicroUsd;
}

async function claimNativeCoverSpend(request, bundle, deps, execution) {
  if (!SHA.test(execution?.executionKey || "") || !SHA.test(execution?.bindingHash || "") ||
      await verifyNativeCoverSpend(request, bundle, deps) !== true) return false;
  const approval = await deps.store.read("sources", request.paidApprovalKey);
  if (approval?.sha256 !== request.paidApprovalSha256) return false;
  // Key by the exact authenticated decision bytes, not a refreshable snapshot.
  const key = digest({ kind: "COVER_SPEND_DECISION", decisionSha256: approval.value.decisionEvidenceSha256 });
  const claim = { schemaVersion: 1, kind: "COVER_SPEND_DECISION", status: "RESERVED",
    decisionSha256: approval.value.decisionEvidenceSha256, executionKey: execution.executionKey,
    bindingHash: execution.bindingHash, titleId: request.titleId, editionId: request.editionId };
  const current = await deps.store.read("spend-claims", key);
  if (current) return digest(current.value) === digest(claim);
  try {
    const saved = await deps.store.writeJson("spend-claims", key, claim, { immutable: true });
    return digest(saved.value) === digest(claim);
  } catch (error) {
    if ([409, 412].includes(error.statusCode) || error.safeCode === "COVER_OWNER_STORE_READBACK_CONFLICT") return false;
    throw error;
  }
}

function createNativeCoverOwner(deps = {}) {
  const context = nativeContext(deps);
  const store = createCoverOwnerStore(context);
  const owner = { ...context, store, generationEnabled: context.env.JM1_COVER_GENERATION_ENABLED === "true",
    verifyCurrentAuthority: (request, input) => verifyNativeCoverAuthority(request, input, context),
    verifySpendAuthority: (request, bundle) => verifyNativeCoverSpend(request, bundle, { ...context, store }),
    reserveSpendAuthority: (request, bundle, execution) => claimNativeCoverSpend(request, bundle, { ...context, store }, execution),
    persistReviewPackage: input => persistNativeCoverReview(input, context, store),
    verifyReviewDelivery: async input => {
      const result = await persistNativeCoverReview({ ...input, executionKey: input.receipt.executionKey,
        readOnly: true, assertClaim: async () => { throw new Error("COVER_REVIEW_READ_ONLY_CUSTODY_MISSING"); } }, context, store);
      return digest(result) === digest(input.receipt.reviewDelivery);
    },
    readProviderOutcome: async key => (await store.read("provider-receipts", key))?.value };
  owner.generateImage = async request => {
    // Instantiation is lazy: missing spend/source authority never reaches identity,
    // Content Safety, image or asset adapters.
    if (!owner.generationEnabled) throw new Error("COVER_GENERATION_DISABLED");
    const opts = { service: context.service, serviceUrl: context.service.url, containerName: "jm1-publishing-stage-runtime",
      credential: new ManagedIdentityCredential() };
    const assets = require("./coverAssetStore").createCoverAssetStore(opts);
    const safetyStore = require("./coverSafetyEvidenceStore").createCoverSafetyEvidenceStore(opts);
    const safety = require("./coverSafetyAssessment").createCoverSafetyAssessment({ endpoint: context.env.JM1_COVER_SAFETY_ENDPOINT },
      { ...safetyStore, credential: opts.credential });
    const provider = require("./azureFoundryCoverImageProvider").createAzureFoundryCoverImageProvider({
      endpoint: context.env.JM1_COVER_IMAGE_ENDPOINT, deployment: context.env.JM1_COVER_IMAGE_DEPLOYMENT,
      modelVersion: context.env.JM1_COVER_IMAGE_MODEL_VERSION }, { ...assets, assessSafety: safety, credential: opts.credential });
    const id = request.executionKey.slice(0, 32);
    const executionId = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    const result = await provider({ ...request, executionId });
    if (!result.providerReceiptId) throw new Error("COVER_PROVIDER_RECEIPT_UNAVAILABLE");
    const bytes = await assets.fetchAssetBytes(result);
    const assetKey = digest({ executionKey: request.executionKey, direction: request.direction, sha256: result.sha256 });
    await store.write("assets", assetKey, bytes, { extension: "png", immutable: true });
    await store.writeJson("provider-receipts", request.providerRequestId, { schemaVersion: 1, status: "RESULT_PERSISTED",
      executionKey: request.executionKey, bindingHash: request.bindingHash, titleId: request.titleId, editionId: request.editionId,
      direction: request.direction, providerRequestId: request.providerRequestId, providerReceiptId: result.providerReceiptId,
      assetKey, sha256: hash(bytes), width: result.width, height: result.height, safetyEvidenceId: result.safetyEvidenceId }, { immutable: true });
    return { ...result, bytes, providerRequestId: request.providerRequestId };
  };
  return owner;
}

async function runNativeCoverOwners(deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_TITLE_COMMISSIONING_COVER_ENABLED !== "true") return { enabled: false, results: [], failures: [] };
  const ids = (env.JM1_TITLE_COMMISSIONING_COVER_TITLE_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !IDS.includes(id))) throw new Error("COVER_OWNER_ALLOWLIST_DENIED");
  const owner = createNativeCoverOwner(deps);
  const results = [], failures = [];
  for (const id of ids) {
    try {
      const pointer = owner.containerClient.getBlockBlobClient(`${owner.store.prefix}/title-bindings/${id}.json`);
      const { etag } = await pointer.getProperties();
      const binding = JSON.parse((await pointer.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } })).toString("utf8"));
      if (binding.titleId !== id || !SHA.test(binding.requestKey || "")) throw new Error("COVER_OWNER_POINTER_UNBOUND");
      const request = await owner.store.read("requests", binding.requestKey);
      if (request?.value.titleId !== id) throw new Error("COVER_OWNER_POINTER_UNBOUND");
      const result = await executeCoverOwner(binding.requestKey, owner);
      results.push({ titleId: id, ...result });
      if (["RECOVERY_REQUIRED", "RECEIPT_RECONCILIATION_REQUIRED"].includes(result.status) ||
          result.code === "COVER_PROVIDER_RECONCILIATION_REQUIRED") {
        failures.push({ titleId: id, executionKey: result.executionKey, code: result.code || "COVER_OWNER_RECOVERY_REQUIRED" });
      }
    } catch (error) { failures.push({ titleId: id, code: error.statusCode === 404 ? "COVER_OWNER_INPUTS_NOT_BOUND" :
      /^COVER_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "COVER_OWNER_READ_OR_DISPATCH_FAILED" }); }
  }
  return { enabled: true, results, failures };
}

module.exports = { IDS, nativeContext, createNativeCoverOwner, verifyNativeCoverAuthority, verifyNativeCoverSpend, claimNativeCoverSpend,
  nativeGraph, persistNativeCoverReview, runNativeCoverOwners };
