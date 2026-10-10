"use strict";
const { createHash } = require("node:crypto");
const { planFreshTitleRun, persistFreshTitleRun } = require("./freshTitleCommissioningRun");
const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../author/jackieTitleSystemCommissioningPolicy");
const { bindSourceCollection } = require("./freshSourceCollection");
const AUTHORITY = Object.freeze({ threadId: "01a10bb0-3832-7e03-b3a7-2cc488694143",
  messageId: "01a1242b-8fb0-77f0-a9e1-7eb197148dcd", packet: "JMP-JACKIE-TITLE-COMMISSIONING-20261008",
  classification: "FRESH_SYSTEM_COMMISSIONING_NOT_EDITORIAL_OR_FINANCIAL_APPROVAL" });
const driveId = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
const RUNTIME_OWNER_ID = "cb6e97e5-1d6a-f111-a826-000d3a9eacee";
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function freshDataverseIdentityBinding(env) {
  const clientId = env.JM1_TITLE_COMMISSIONING_FRESH_DATAVERSE_CLIENT_ID;
  const ownerId = env.JM1_TITLE_COMMISSIONING_FRESH_DATAVERSE_USER_ID;
  if (!GUID.test(clientId || "") || !GUID.test(ownerId || "") || ownerId === RUNTIME_OWNER_ID ||
      clientId === "dc8d1429-8c1b-473b-83ca-f9545fad8074") deny("COMMISSIONING_FRESH_ISOLATED_IDENTITY_UNBOUND");
  return { clientId, ownerId };
}
const POLICIES = Object.freeze({
  "f79006b7-f595-f111-8076-00224820105b": Object.freeze({ itemId: "01DF3SEQLS4HFC4AAJSRE2LVY7XVZTLH2Y",
    name: "JMP-INT-202608-3W6Q6L - Til Death Do Us Part Full Manuscript.md", bytes: 133593, format: "md",
    sha256: "b030075bbda336c8dea8f7c12aaf210665fb0bbdc52da690144d7cfd3dd8bcd7",
    eTag: '"{2ECAE172-0900-4994-A5D7-1FBD73359F58},1"',
    parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - Til Death Do Us Part/01_Manuscript/_Original" }),
  "f1908dc9-5775-f111-ab0f-6045bdd69435": Object.freeze({ itemId: "01DF3SEQLSR5STTZRHRBG2ECRMNRMU3IXO",
    name: "220811 establishing glory.docx", bytes: 204724, format: "docx",
    sha256: "b6dd239da025e58d9d0dc4e375a00e76391f9455fb856d63664031931387b5e2",
    eTag: '"{39658F72-27E6-4D88-A20A-2C6C594DA2EE},1"',
    parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - Establishing Glory- The Library/02-MANUSCRIPT/_ORIGINAL" }),
  "e797232b-da7a-f111-ab0f-00224820105b": Object.freeze({ format: "docx", components: Object.freeze([
    Object.freeze({ itemId: "01DF3SEQJQ4TOTWXAVD5GZ5SOR3R7VPFKF", name: "The Intentional Leader Volume I - V2 Intake Source.docx",
      bytes: 1053763, format: "docx", sha256: "701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06",
      eTag: '"{3BDDE430-155C-4D1F-9EC9-D1DC7F579545},5"',
      parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - The Intentional Leader Volume I/02 - Intake/_ORIGINAL" }),
    Object.freeze({ itemId: "01DF3SEQO7LTRYYPL3Y5AYBVEAFAVFJFZF", name: "The Intentional Leader - continued.docx",
      bytes: 753827, format: "docx", sha256: "94b46204db5e0e81d739f507c26905f693888949a494d2c4d64463ebe2a90312",
      eTag: '"{8CE35CDF-7B3D-41C7-80D4-80282A549725},16"',
      parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - The Intentional Leader Volume I/02 - Intake/_ORIGINAL" })
  ]) }),
  "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2": Object.freeze({ format: "docx", recoveredOriginal: true })
});
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const hash = value => createHash("sha256").update(value).digest("hex");
function id(value) { const h = hash(value); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; }
function enabled(titleId, env) {
  const ids = (env.JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS || "").split(",").filter(Boolean);
  return env.JM1_TITLE_COMMISSIONING_FRESH_ENABLED === "true" && ids.length > 0 && ids.length <= 2 &&
    new Set(ids).size === ids.length && ids.every(x => Object.hasOwn(POLICIES, x)) && ids.includes(titleId) &&
    ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"].every(k => env[k] === "false");
}
function scope(titleId) { return { enabled: true, revoked: false, titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }; }
async function readSource(titleId, deps) {
  let p = POLICIES[titleId]; if (!p) deny("COMMISSIONING_FRESH_SOURCE_SCOPE_DENIED");
  const authorityClient = deps.authorityClient || deps.client;
  const title = await authorityClient.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${titleId}` });
  const identity = await require("../author/jackieCommissioningIdentityReader").readJackieCommissioningIdentity(title, scope(titleId), authorityClient);
  if (!identity || identity.contactId !== contactId || title.statecode !== 0) deny("COMMISSIONING_FRESH_AUTHOR_IDENTITY_DENIED");
  if (p.recoveredOriginal) p = await require("./freshLongWatchCustody").readPreparedOriginal(deps);
  const parts = [];
  for (const component of p.components || [p]) parts.push(await readComponent(component, deps));
  // Recheck every component after all byte reads, not just each in isolation.
  for (const part of parts) {
    const after = await deps.sourceMetadata(part.policy);
    if (after.eTag !== part.custody.eTag || JSON.stringify(after.parentReference) !== JSON.stringify(part.parentReference)) {
      deny("COMMISSIONING_FRESH_ORIGINAL_CHANGED_DURING_READ");
    }
  }
  const collection = p.components ? bindSourceCollection(parts.map(part => part.custody)) : null;
  const representative = parts.find(part => part.custody.itemId === (collection?.components[0].itemId || p.itemId));
  const reference = `codex:${AUTHORITY.threadId}:message:${AUTHORITY.messageId}`;
  const input = { title: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contactId }, revision: 2,
    source: { reference: collection ? `sharepoint:collection:${collection.custodyHash}` : `sharepoint:drive:${driveId}:item:${p.itemId}`,
      version: collection?.custodyHash || representative.custody.eTag, sha256: collection?.custodyHash || p.sha256, role: "RECEIVED_ORIGINAL" },
    retainedArtifacts: [], historyReference: `dataverse:jm1pub_title:${titleId}:PRESERVE_HISTORY`, authorityReference: reference,
    handoff: { state: "READY", reference }, sourceCustody: representative.custody,
    ...(collection ? { sourceComponents: collection.components } : {}) };
  return { input, bytes: representative.bytes, components: parts, identity, titleName: title.jm1pub_titlename };
}
async function readComponent(p, deps) {
  const metadata = await deps.sourceMetadata(p);
  const parent = decodeURIComponent(metadata.parentReference?.path || "").split("root:");
  if (metadata.id !== p.itemId || metadata.name !== p.name || metadata.size !== p.bytes || metadata.eTag !== p.eTag ||
      metadata.parentReference?.driveId !== driveId || parent.length !== 2 || parent[1] !== p.parent || !metadata.file) {
    deny("COMMISSIONING_FRESH_ORIGINAL_CUSTODY_CHANGED");
  }
  const bytes = await deps.sourceBytes(p);
  if (!Buffer.isBuffer(bytes) || bytes.length !== p.bytes || hash(bytes) !== p.sha256) deny("COMMISSIONING_FRESH_ORIGINAL_BYTES_CHANGED");
  if (p.format === "docx") {
    const zip = await require("jszip").loadAsync(bytes, { checkCRC32: true });
    if (!zip.file("word/document.xml") || !zip.file("[Content_Types].xml") || zip.file("word/vbaProject.bin")) deny("COMMISSIONING_FRESH_DOCX_INVALID");
  } else if (bytes.toString("utf8").includes("\u0000")) deny("COMMISSIONING_FRESH_TEXT_INVALID");
  const after = await deps.sourceMetadata(p);
  if (after.eTag !== metadata.eTag || JSON.stringify(after.parentReference) !== JSON.stringify(metadata.parentReference)) deny("COMMISSIONING_FRESH_ORIGINAL_CHANGED_DURING_READ");
  return { policy: p, bytes, parentReference: metadata.parentReference, custody: { driveId, itemId: p.itemId,
    eTag: metadata.eTag, bytes: p.bytes, path: `${p.parent}/${p.name}`, sha256: p.sha256 } };
}
async function createExact(client, set, pk, payload, expectedOwnerId) {
  let row = await client.first(set, { $filter: `${pk} eq ${payload[pk]}` });
  if (!row) {
    try { await client.create(set, payload); }
    catch (error) { if (![409, 412].includes(error.statusCode ?? error.status)) throw error; }
    row = await client.first(set, { $filter: `${pk} eq ${payload[pk]}` });
  }
  if (!row || Object.entries(payload).some(([k, v]) => row[k] !== v)) deny("COMMISSIONING_FRESH_CANONICAL_RECORD_CONFLICT");
  if (expectedOwnerId && row._ownerid_value !== expectedOwnerId) deny("COMMISSIONING_FRESH_CANONICAL_OWNER_CONFLICT");
  return row;
}
async function immutable(container, path, value) {
  const blob = container.getBlockBlobClient(path), body = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  try { await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: Buffer.isBuffer(value) ? "application/octet-stream" : "application/json" } }); }
  catch (error) {
    if (![409, 412].includes(error.statusCode)) throw error;
    const properties = await blob.getProperties();
    if (!properties.etag || !(await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).equals(body)) deny("COMMISSIONING_FRESH_CUSTODY_REPLAY_CONFLICT");
  }
}
function proof(run) { return { current: true, titleId: run.titleId, authorityReference: run.authorityReference,
  sourceSha256: run.source.sha256, sourceETag: run.custody.eTag, sourceItemId: run.custody.itemId,
  sourceDriveId: run.custody.driveId, sourceBytes: run.custody.bytes, sourcePath: run.custody.path,
  ...(run.sourceCollection ? { sourceCollectionHash: run.sourceCollection.custodyHash } : {}),
  jackieAuthorshipVerified: true, stableHandoffVerified: true }; }
async function execute(input, deps, execution = {}) {
  if (!Number.isFinite(Date.parse(execution.startedAt))) deny("COMMISSIONING_FRESH_EXECUTION_INTENT_REQUIRED");
  if (deps.verifyRuntimeIdentity) await deps.verifyRuntimeIdentity();
  const read = deps.readFreshSource || readSource;
  const current = await read(input.title.jm1pub_titleid, deps), run = planFreshTitleRun(input);
  const ownerId = deps.ownerId || RUNTIME_OWNER_ID;
  if (planFreshTitleRun(current.input).bindingHash !== run.bindingHash) deny("COMMISSIONING_FRESH_REQUEST_CHANGED");
  await verifyCanonicalTitleKey(deps.client);
  await persistFreshTitleRun(input, { containerClient: deps.containerClient, readCurrentSourceAuthority: async () => proof(run) });
  const definitions = await deps.client.list("jmpv2_stagedefinitions", { $filter: "jmpv2_isactive eq true", $top: "100" });
  for (const [stage, next] of [["01_INQUIRY", "02_INTAKE"], ["02_INTAKE", "03_EDITORIAL_REVIEW"]]) {
    const rows = definitions.filter(x => x.jmpv2_stagecode === stage);
    if (rows.length !== 1 || rows[0].jmpv2_validnextstagecode !== next) deny("COMMISSIONING_FRESH_CANONICAL_DEFINITION_CONFLICT");
  }
  const lifecycle = id(`${run.runId}:lifecycle`), engagement = id(`${run.runId}:engagement`);
  const existing = await deps.client.list("jmpv2_publishingengagements", { $filter: `jmpv2_canonicaltitleid eq '${run.titleId}'`, $top: "2" });
  if (existing.some(x => x.jmpv2_publishingengagementid !== engagement)) deny("COMMISSIONING_FRESH_EXISTING_ENGAGEMENT_PRESERVED");
  const stageIds = ["01_INQUIRY", "02_INTAKE"].map(stage => id(`${run.runId}:${stage}`));
  // The active title key, not a security-trimmed query, arbitrates other owners.
  // Reserve it before lifecycle/stage writes; unreadable collisions stay held.
  await createExact(deps.client, "jmpv2_publishingengagements", "jmpv2_publishingengagementid", {
    jmpv2_publishingengagementid: engagement, jmpv2_engagementkey: engagement, jmpv2_canonicaltitleid: run.titleId,
    jmpv2_canonicalauthorid: contactId, jmpv2_canonicaltitlename: current.titleName,
    jmpv2_lifecycleinstanceid: lifecycle, jmpv2_currentstage: "02_INTAKE", jmpv2_firstv2stage: "01_INQUIRY",
    jmpv2_originsystem: "PUBLISHING_FRESH_OWNER", jmpv2_correlationid: run.bindingHash,
    jmpv2_idempotencykey: run.bindingHash, jmpv2_testclassification: "LIVE_JACKIE_FRESH_COMMISSIONING",
    jmpv2_activationclassification: "NOT_COMMERCIALLY_ACTIVATED" }, ownerId);
  const prefix = `commissioning-fresh-results/${run.titleId}/${run.bindingHash}`;
  if (run.sourceCollection) {
    if (!Array.isArray(current.components) || current.components.length !== run.sourceCollection.components.length) deny("COMMISSIONING_FRESH_COLLECTION_BYTES_UNBOUND");
    for (const component of run.sourceCollection.components) {
      const matches = current.components.filter(part => part.custody.driveId === component.driveId && part.custody.itemId === component.itemId);
      if (matches.length !== 1 || !Buffer.isBuffer(matches[0].bytes) || matches[0].bytes.length !== component.bytes ||
          hash(matches[0].bytes) !== component.sha256) deny("COMMISSIONING_FRESH_COLLECTION_BYTES_UNBOUND");
      await immutable(deps.containerClient, `${prefix}/components/${component.itemId}.docx`, matches[0].bytes);
    }
  } else await immutable(deps.containerClient, `${prefix}/original.${POLICIES[run.titleId].format}`, current.bytes);
  await immutable(deps.containerClient, `${prefix}/intake.json`, { runId: run.runId, titleId: run.titleId,
    source: run.custody, ...(run.sourceCollection ? { sourceCollection: run.sourceCollection } : {}),
    identity: current.identity, authority: AUTHORITY, historicalOutputsUsed: false, editorialApproval: false });
  const lifePayload = { jmpv2_lifecycleinstanceid: lifecycle, jmpv2_lifecyclekey: lifecycle,
    jmpv2_lifecycleversion: 2, jmpv2_currentstagecode: "02_INTAKE", jmpv2_currentstageinstancekey: stageIds[1],
    jmpv2_isactive: true, jmpv2_testclassification: "LIVE_JACKIE_FRESH_COMMISSIONING" };
  await createExact(deps.client, "jmpv2_lifecycleinstances", "jmpv2_lifecycleinstanceid", lifePayload, ownerId);
  for (const [i, stageCode] of ["01_INQUIRY", "02_INTAKE"].entries()) {
    await createExact(deps.client, "jmpv2_stageinstances", "jmpv2_stageinstanceid", {
      jmpv2_stageinstanceid: stageIds[i], jmpv2_stageinstancekey: stageIds[i], jmpv2_lifecyclekey: lifecycle,
      jmpv2_stagecode: stageCode, jmpv2_status: "CLOSED", jmpv2_openedbytransitionkey: id(`${run.runId}:${stageCode}:open`),
      jmpv2_closedbytransitionkey: id(`${run.runId}:${stageCode}:complete`) }, ownerId);
  }
  const journal = require("./stageRuntimeJournal");
  for (const [i, stageCode] of ["01_INQUIRY", "02_INTAKE"].entries()) {
    const authorize = async () => {
      const source = await read(run.titleId, deps);
      const row = await deps.client.first("jmpv2_stageinstances", { $filter: `jmpv2_stageinstanceid eq ${stageIds[i]}` });
      if (planFreshTitleRun(source.input).bindingHash !== run.bindingHash || row?.jmpv2_stagecode !== stageCode ||
          row.jmpv2_lifecyclekey !== lifecycle || row.jmpv2_status !== "CLOSED") deny("COMMISSIONING_FRESH_COMPLETION_READBACK_CHANGED");
      return { current: true, titleId: run.titleId, stageId: stageIds[i], stageCode };
    };
    for (const eventType of ["STAGE_ELIGIBLE", "STAGE_STARTED", "STAGE_COMPLETED"]) {
      const event = { schemaVersion: 1, eventType, titleId: run.titleId, stageId: stageIds[i], stageCode,
        executionId: `${run.runId}:${stageCode}`, sourceEventId: `${run.runId}:${stageCode}:${eventType}`,
        evidenceReference: `${prefix}/intake.json`, actorClass: "SYSTEM", timestamp: execution.startedAt };
      event.idempotencyKey = journal.keyFor(event);
      await journal.persistStageEvent(event, { containerClient: deps.containerClient, authorize,
        verifyCompletion: async () => { await authorize(); return true; } });
    }
  }
  const receipts = ["01_INQUIRY", "02_INTAKE"].map((stageCode, i) => ({ runId: run.runId, titleId: run.titleId,
    sourceBindingHash: run.bindingHash, stageCode, stageId: stageIds[i], status: "COMPLETED", historical: false,
    executionId: `${run.runId}:${stageCode}`, outputReference: `${prefix}/intake.json`,
    evidenceReference: `dataverse:jmpv2_stageinstance:${stageIds[i]}`, proofLevel: "PRODUCTION_OWNER_READBACK" }));
  const receipt = { runId: run.runId, executionId: run.executionId, bindingHash: run.bindingHash,
    titleId: run.titleId, status: "FRESH_INTAKE_CANONICAL_READBACK_COMPLETE", lifecycleId: lifecycle,
    engagementId: engagement, stages: receipts,
    ...(run.sourceCollection ? { downstreamGate: "SOURCE_COMPONENT_ORDER_AUTHORITY_REQUIRED", concatenationAuthorized: false } : {}),
    nextAction: "CANONICAL_STAGE_03_AUTHORITY_AND_OWNER_ADVANCEMENT_REQUIRED",
    legacyTitleChanged: false, authorApproval: false, modelCalls: 0, communications: 0, payments: 0 };
  await immutable(deps.containerClient, `${prefix}/receipt.json`, receipt);
  return { receipt };
}
async function verifyCanonicalTitleKey(client) {
  const keys = await client.list("EntityDefinitions(LogicalName='jmpv2_publishingengagement')/Keys", {
    $select: "LogicalName,KeyAttributes,EntityKeyIndexStatus" });
  if (!keys.some(key => key.EntityKeyIndexStatus === "Active" &&
    Array.isArray(key.KeyAttributes) && key.KeyAttributes.length === 1 && key.KeyAttributes[0] === "jmpv2_canonicaltitleid")) {
    deny("COMMISSIONING_FRESH_CANONICAL_TITLE_UNIQUENESS_UNPROVEN");
  }
  return { enforcement: "ACTIVE_CANONICAL_TITLE_ALTERNATE_KEY", crossOwnerVisibilityClaimed: false };
}
async function processFreshTitleIntake(titleId, deps) {
  if (deps.verifyRuntimeIdentity) await deps.verifyRuntimeIdentity();
  const current = await (deps.readFreshSource || readSource)(titleId, deps), run = planFreshTitleRun(current.input);
  return processTitleCommissioningStep(current.input, { ...deps, readScope: async () => scope(titleId) }, {
    plan: planFreshTitleRun, namespace: "commissioning-fresh-executions", executionSuffix: "", execute,
    validate: result => result?.receipt?.runId === run.runId && result.receipt.bindingHash === run.bindingHash &&
      result.receipt.status === "FRESH_INTAKE_CANONICAL_READBACK_COMPLETE",
    reference: () => `commissioning-fresh-results/${run.titleId}/${run.bindingHash}/receipt.json`,
    completionEffects: () => ({ productionStageChanged: true, legacyTitleChanged: false, freshCanonicalIntakeOnly: true })
  });
}
function nativeDeps(deps = {}) {
  const env = deps.env || process.env;
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  function dataverseClient(tokenCredential) {
    return require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL }, {
    getToken: async resourceUrl => {
      const result = await tokenCredential.getToken(`${resourceUrl.replace(/\/$/, "")}/.default`);
      if (!result?.token) deny("COMMISSIONING_FRESH_RUNTIME_TOKEN_UNAVAILABLE");
      return result.token;
    }
  });
  }
  const authorityClient = deps.authorityClient || deps.client || dataverseClient(credential);
  const binding = deps.client || deps.authorityOnly ? null : freshDataverseIdentityBinding(env);
  const freshCredential = binding ? deps.freshCredential || new (require("@azure/identity").ManagedIdentityCredential)(binding.clientId) : null;
  const client = deps.client || (deps.authorityOnly ? authorityClient : dataverseClient(freshCredential));
  const verifyRuntimeIdentity = binding ? async () => {
    const token = await freshCredential.getToken(`${env.DATAVERSE_RESOURCE_URL.replace(/\/$/, "")}/.default`);
    const response = await (deps.fetchImpl || fetch)(`${env.DATAVERSE_WEB_API_BASE_URL.replace(/\/$/, "")}/WhoAmI`, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token.token}`, "OData-Version": "4.0" } });
    if (!response.ok) deny("COMMISSIONING_FRESH_RUNTIME_IDENTITY_UNAVAILABLE");
    const identity = await response.json();
    if (identity.UserId !== binding.ownerId || identity.OrganizationId !== "9dafb403-b493-f011-a700-000d3a106f37") {
      deny("COMMISSIONING_FRESH_RUNTIME_IDENTITY_MISMATCH");
    }
    return { userId: identity.UserId, organizationId: identity.OrganizationId };
  } : deps.verifyRuntimeIdentity;
  const containerClient = deps.containerClient || require("@azure/storage-blob").BlobServiceClient
    .fromConnectionString(env.AzureWebJobsStorage).getContainerClient("jm1-publishing-stage-runtime");
  const sourceMetadata = deps.sourceMetadata || (async policy => {
    const token = await credential.getToken("https://graph.microsoft.com/.default");
    const response = await (deps.fetchImpl || fetch)(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${policy.itemId}?$select=id,name,size,eTag,parentReference,file`,
      { headers: { Authorization: `Bearer ${token.token}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) deny("COMMISSIONING_FRESH_METADATA_UNAVAILABLE");
    return response.json();
  });
  const sourceBytes = deps.sourceBytes || (policy => require("../editorial/productionTitleAuthorityReader").graphBytes({
    jm1pub_repositorydriveid: driveId, jm1pub_repositoryitemid: policy.itemId }, { ...deps, credential }));
  const graph = deps.graph || (async (path, options = {}) => {
    if (!path.startsWith(`drives/${encodeURIComponent(driveId)}/items/`) || /[\r\n]/.test(path) ||
      !["GET", "POST", "PUT"].includes(options.method || "GET")) deny("COMMISSIONING_FRESH_GRAPH_SCOPE_DENIED");
    const token = await credential.getToken("https://graph.microsoft.com/.default");
    const response = await (deps.fetchImpl || fetch)(`https://graph.microsoft.com/v1.0/${path}`, {
      ...options, redirect: "error", headers: { ...options.headers, Authorization: `Bearer ${token.token}` },
      signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Object.assign(new Error("COMMISSIONING_FRESH_GRAPH_REQUEST_FAILED"), {
      safeCode: "COMMISSIONING_FRESH_GRAPH_REQUEST_FAILED", statusCode: response.status });
    return response.json();
  });
  return { ...deps, env, client, authorityClient, ownerId: binding?.ownerId || deps.ownerId || RUNTIME_OWNER_ID,
    verifyRuntimeIdentity, containerClient, sourceMetadata, sourceBytes, graph };
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  const readOnly = ["FRESH_PREFLIGHT", "FRESH_READBACK"].includes(body.mode) && Object.hasOwn(POLICIES, body.titleId || "") &&
    ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"].every(k => env[k] === "false");
  if (!readOnly && !enabled(body.titleId, env)) return { status: 403, jsonBody: { code: "COMMISSIONING_FRESH_DISABLED", effects: 0 } };
  let attempted = false;
  let phase = "SOURCE_READ";
  try {
    const context = nativeDeps(deps);
    phase = "RUNTIME_IDENTITY_READ";
    if (context.verifyRuntimeIdentity) await context.verifyRuntimeIdentity();
    phase = "SOURCE_READ";
    const current = await readSource(body.titleId, context);
    phase = "RUN_PLAN";
    const run = planFreshTitleRun(current.input);
    if (body.mode === "FRESH_PREFLIGHT") {
      phase = "CANONICAL_UNIQUENESS_READ";
      const uniqueness = await verifyCanonicalTitleKey(context.client);
      phase = "CANONICAL_ENGAGEMENT_READ";
      const existing = await context.client.list("jmpv2_publishingengagements", { $filter: `jmpv2_canonicaltitleid eq '${run.titleId}'`, $top: "2" });
      phase = "CANONICAL_DEFINITION_READ";
      const definitions = await context.client.list("jmpv2_stagedefinitions", { $filter: "jmpv2_isactive eq true", $top: "100" });
      return { status: 200, jsonBody: { runId: run.runId, bindingHash: run.bindingHash, titleId: run.titleId,
        source: run.custody, ...(run.sourceCollection ? { sourceCollection: run.sourceCollection } : {}),
        uniqueness, identity: current.identity, existingEngagementIds: existing.map(x => x.jmpv2_publishingengagementid),
        existingEngagementVisibility: "OWNED_OR_EXPLICITLY_SHARED_ONLY_NOT_GLOBAL_ABSENCE_PROOF",
        definitions: definitions.map(x => ({ code: x.jmpv2_stagecode, next: x.jmpv2_validnextstagecode })), effects: 0 } };
    }
    if (body.mode === "FRESH_READBACK") {
      phase = "RECEIPT_READ";
      const blob = context.containerClient.getBlockBlobClient(`commissioning-fresh-results/${run.titleId}/${run.bindingHash}/receipt.json`);
      const properties = await blob.getProperties();
      const receipt = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
      if (receipt.bindingHash !== run.bindingHash || receipt.runId !== run.runId) deny("COMMISSIONING_FRESH_RECEIPT_CONFLICT");
      return { status: 200, jsonBody: { receipt, effects: 0 } };
    }
    attempted = true;
    phase = "INTAKE_EXECUTION";
    const result = await processFreshTitleIntake(body.titleId, context);
    return { status: 200, jsonBody: { result, modelCalls: 0, communications: 0, payments: 0 } };
  } catch (error) {
    const providerStatus = error.statusCode ?? error.status;
    return { status: 409, jsonBody: { code: /^(?:COMMISSIONING|FRESH_RUN|DATAVERSE|JACKIE_AUTHOR)_[A-Z_]{1,100}$/.test(error.safeCode || "") ? error.safeCode : "COMMISSIONING_FRESH_DEPENDENCY_FAILED",
      phase, ...(Number.isInteger(providerStatus) && providerStatus >= 400 && providerStatus <= 599 ? { providerStatus } : {}),
      mutationAttempted: attempted, recovery: "EXACT_RUN_READBACK_FORWARD_ONLY", modelCalls: 0, communications: 0, payments: 0 } };
  }
}
module.exports = { AUTHORITY, POLICIES, driveId, RUNTIME_OWNER_ID, freshDataverseIdentityBinding, enabled, readSource, readComponent, immutable,
  processFreshTitleIntake, execute, createExact, verifyCanonicalTitleKey, nativeDeps, handler };
