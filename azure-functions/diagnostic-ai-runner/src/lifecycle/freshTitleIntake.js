"use strict";
const { createHash } = require("node:crypto");
const { planFreshTitleRun, persistFreshTitleRun } = require("./freshTitleCommissioningRun");
const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../author/jackieTitleSystemCommissioningPolicy");
const AUTHORITY = Object.freeze({ threadId: "01a10bb0-3832-7e03-b3a7-2cc488694143",
  messageId: "01a1242b-8fb0-77f0-a9e1-7eb197148dcd", packet: "JMP-JACKIE-TITLE-COMMISSIONING-20261008",
  classification: "FRESH_SYSTEM_COMMISSIONING_NOT_EDITORIAL_OR_FINANCIAL_APPROVAL" });
const driveId = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
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
    parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - Establishing Glory- The Library/02-MANUSCRIPT/_ORIGINAL" })
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
  const p = POLICIES[titleId]; if (!p) deny("COMMISSIONING_FRESH_SOURCE_SCOPE_DENIED");
  const title = await deps.client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${titleId}` });
  const identity = await require("../author/jackieCommissioningIdentityReader").readJackieCommissioningIdentity(title, scope(titleId), deps.client);
  if (!identity || identity.contactId !== contactId || title.statecode !== 0) deny("COMMISSIONING_FRESH_AUTHOR_IDENTITY_DENIED");
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
  const reference = `codex:${AUTHORITY.threadId}:message:${AUTHORITY.messageId}`;
  const input = { title: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contactId }, revision: 2,
    source: { reference: `sharepoint:drive:${driveId}:item:${p.itemId}`, version: metadata.eTag, sha256: p.sha256, role: "RECEIVED_ORIGINAL" },
    retainedArtifacts: [], historyReference: `dataverse:jm1pub_title:${titleId}:PRESERVE_HISTORY`, authorityReference: reference,
    handoff: { state: "READY", reference }, sourceCustody: { driveId, itemId: p.itemId, eTag: metadata.eTag,
      bytes: p.bytes, path: `${p.parent}/${p.name}`, sha256: p.sha256 } };
  return { input, bytes, identity, titleName: title.jm1pub_titlename };
}
async function createExact(client, set, pk, payload) {
  let row = await client.first(set, { $filter: `${pk} eq ${payload[pk]}` });
  if (!row) {
    try { await client.create(set, payload); }
    catch (error) { if (![409, 412].includes(error.statusCode ?? error.status)) throw error; }
    row = await client.first(set, { $filter: `${pk} eq ${payload[pk]}` });
  }
  if (!row || Object.entries(payload).some(([k, v]) => row[k] !== v)) deny("COMMISSIONING_FRESH_CANONICAL_RECORD_CONFLICT");
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
  jackieAuthorshipVerified: true, stableHandoffVerified: true }; }
async function execute(input, deps, execution = {}) {
  if (!Number.isFinite(Date.parse(execution.startedAt))) deny("COMMISSIONING_FRESH_EXECUTION_INTENT_REQUIRED");
  const read = deps.readFreshSource || readSource;
  const current = await read(input.title.jm1pub_titleid, deps), run = planFreshTitleRun(input);
  if (planFreshTitleRun(current.input).bindingHash !== run.bindingHash) deny("COMMISSIONING_FRESH_REQUEST_CHANGED");
  await persistFreshTitleRun(input, { containerClient: deps.containerClient, readCurrentSourceAuthority: async () => proof(run) });
  const definitions = await deps.client.list("jmpv2_stagedefinitions", { $filter: "jmpv2_isactive eq true", $top: "100" });
  for (const [stage, next] of [["01_INQUIRY", "02_INTAKE"], ["02_INTAKE", "03_EDITORIAL_REVIEW"]]) {
    const rows = definitions.filter(x => x.jmpv2_stagecode === stage);
    if (rows.length !== 1 || rows[0].jmpv2_validnextstagecode !== next) deny("COMMISSIONING_FRESH_CANONICAL_DEFINITION_CONFLICT");
  }
  const lifecycle = id(`${run.runId}:lifecycle`), engagement = id(`${run.runId}:engagement`);
  const existing = await deps.client.list("jmpv2_publishingengagements", { $filter: `jmpv2_canonicaltitleid eq '${run.titleId}'`, $top: "2" });
  if (existing.some(x => x.jmpv2_publishingengagementid !== engagement)) deny("COMMISSIONING_FRESH_EXISTING_ENGAGEMENT_PRESERVED");
  const prefix = `commissioning-fresh-results/${run.titleId}/${run.bindingHash}`;
  await immutable(deps.containerClient, `${prefix}/original.${POLICIES[run.titleId].format}`, current.bytes);
  await immutable(deps.containerClient, `${prefix}/intake.json`, { runId: run.runId, titleId: run.titleId,
    source: run.custody, identity: current.identity, authority: AUTHORITY, historicalOutputsUsed: false, editorialApproval: false });
  const stageIds = ["01_INQUIRY", "02_INTAKE"].map(stage => id(`${run.runId}:${stage}`));
  const lifePayload = { jmpv2_lifecycleinstanceid: lifecycle, jmpv2_lifecyclekey: lifecycle,
    jmpv2_lifecycleversion: 2, jmpv2_currentstagecode: "02_INTAKE", jmpv2_currentstageinstancekey: stageIds[1],
    jmpv2_isactive: true, jmpv2_testclassification: "LIVE_JACKIE_FRESH_COMMISSIONING" };
  await createExact(deps.client, "jmpv2_lifecycleinstances", "jmpv2_lifecycleinstanceid", lifePayload);
  for (const [i, stageCode] of ["01_INQUIRY", "02_INTAKE"].entries()) {
    await createExact(deps.client, "jmpv2_stageinstances", "jmpv2_stageinstanceid", {
      jmpv2_stageinstanceid: stageIds[i], jmpv2_stageinstancekey: stageIds[i], jmpv2_lifecyclekey: lifecycle,
      jmpv2_stagecode: stageCode, jmpv2_status: "CLOSED", jmpv2_openedbytransitionkey: id(`${run.runId}:${stageCode}:open`),
      jmpv2_closedbytransitionkey: id(`${run.runId}:${stageCode}:complete`) });
  }
  await createExact(deps.client, "jmpv2_publishingengagements", "jmpv2_publishingengagementid", {
    jmpv2_publishingengagementid: engagement, jmpv2_engagementkey: engagement, jmpv2_canonicaltitleid: run.titleId,
    jmpv2_canonicalauthorid: contactId, jmpv2_canonicaltitlename: current.titleName,
    jmpv2_lifecycleinstanceid: lifecycle, jmpv2_currentstage: "02_INTAKE", jmpv2_firstv2stage: "01_INQUIRY",
    jmpv2_originsystem: "PUBLISHING_FRESH_OWNER", jmpv2_correlationid: run.bindingHash,
    jmpv2_idempotencykey: run.bindingHash, jmpv2_testclassification: "LIVE_JACKIE_FRESH_COMMISSIONING",
    jmpv2_activationclassification: "NOT_COMMERCIALLY_ACTIVATED" });
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
    engagementId: engagement, stages: receipts, nextAction: "CANONICAL_STAGE_03_AUTHORITY_AND_OWNER_ADVANCEMENT_REQUIRED",
    legacyTitleChanged: false, authorApproval: false, modelCalls: 0, communications: 0, payments: 0 };
  await immutable(deps.containerClient, `${prefix}/receipt.json`, receipt);
  return { receipt };
}
async function processFreshTitleIntake(titleId, deps) {
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
  const client = deps.client || require("../orchestration/authorReviewResponseConsumer").createDataverseClient({
    apiBase: env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: env.DATAVERSE_RESOURCE_URL });
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
  return { ...deps, env, client, containerClient, sourceMetadata, sourceBytes };
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (!enabled(body.titleId, env)) return { status: 403, jsonBody: { code: "COMMISSIONING_FRESH_DISABLED", effects: 0 } };
  const context = nativeDeps(deps);
  let attempted = false;
  try {
    const current = await readSource(body.titleId, context), run = planFreshTitleRun(current.input);
    if (body.mode === "FRESH_PREFLIGHT") {
      const existing = await context.client.list("jmpv2_publishingengagements", { $filter: `jmpv2_canonicaltitleid eq '${run.titleId}'`, $top: "2" });
      const definitions = await context.client.list("jmpv2_stagedefinitions", { $filter: "jmpv2_isactive eq true", $top: "100" });
      return { status: 200, jsonBody: { runId: run.runId, bindingHash: run.bindingHash, titleId: run.titleId,
        source: run.custody, identity: current.identity, existingEngagementIds: existing.map(x => x.jmpv2_publishingengagementid),
        definitions: definitions.map(x => ({ code: x.jmpv2_stagecode, next: x.jmpv2_validnextstagecode })), effects: 0 } };
    }
    if (body.mode === "FRESH_READBACK") {
      const blob = context.containerClient.getBlockBlobClient(`commissioning-fresh-results/${run.titleId}/${run.bindingHash}/receipt.json`);
      const properties = await blob.getProperties();
      const receipt = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
      if (receipt.bindingHash !== run.bindingHash || receipt.runId !== run.runId) deny("COMMISSIONING_FRESH_RECEIPT_CONFLICT");
      return { status: 200, jsonBody: { receipt, effects: 0 } };
    }
    attempted = true;
    const result = await processFreshTitleIntake(body.titleId, context);
    return { status: 200, jsonBody: { result, modelCalls: 0, communications: 0, payments: 0 } };
  } catch (error) {
    return { status: 409, jsonBody: { code: /^COMMISSIONING_[A-Z_]{1,100}$/.test(error.safeCode || "") ? error.safeCode : "COMMISSIONING_FRESH_DEPENDENCY_FAILED",
      mutationAttempted: attempted, recovery: "EXACT_RUN_READBACK_FORWARD_ONLY", modelCalls: 0, communications: 0, payments: 0 } };
  }
}
module.exports = { AUTHORITY, POLICIES, enabled, readSource, processFreshTitleIntake, execute, createExact, nativeDeps, handler };
