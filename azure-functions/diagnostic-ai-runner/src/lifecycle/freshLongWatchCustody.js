"use strict";
const { createHash } = require("node:crypto");
const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const TITLE_ID = "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2";
const PARENT_ID = "01DF3SEQLCYBWRYG7O5BDLCVHBTFM2TVJL";
const SOURCE = Object.freeze({ itemId: "01DF3SEQKUFRHMX73I7FCJPUP3PICXOTHB", name: "The Long Watch.docx",
  bytes: 787352, format: "docx", sha256: "d4fdcd2515c60d592ff2df0bf116c967777bef4d2eb1d3897fbe88004d42cf1a",
  eTag: '"{CB4E2C54-68FF-44F9-97D1-FB7A05774CE1},38"',
  parent: "/01_Pipeline_A-Z/02 - Intake/Smith, Jackie - The Long Watch/01_Manuscript" });
const ARTIFACT_ID = "e8b7ff2b-1c84-f111-ab0f-6045bdd69678";
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const hash = value => createHash("sha256").update(value).digest("hex");

function plan(input) {
  if (input.titleId !== TITLE_ID || input.sourceSha256 !== SOURCE.sha256 || input.sourceETag !== SOURCE.eTag ||
      !input.authorityReference) deny("COMMISSIONING_FRESH_CUSTODY_AUTHORITY_DENIED");
  const identity = { titleId: TITLE_ID, sourceSha256: SOURCE.sha256, sourceETag: SOURCE.eTag,
    targetPath: `${SOURCE.parent}/_ORIGINAL/${SOURCE.name}`, authorityReference: input.authorityReference };
  const bindingHash = hash(JSON.stringify(identity));
  return { ...identity, bindingHash, executionId: `commissioning-fresh-custody:${TITLE_ID}:${bindingHash}` };
}

async function readAuthority(deps) {
  const fresh = require("./freshTitleIntake");
  const title = await deps.client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${TITLE_ID}` });
  const identity = await require("../author/jackieCommissioningIdentityReader").readJackieCommissioningIdentity(title,
    { enabled: true, revoked: false, titleId: TITLE_ID, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }, deps.client);
  if (!identity || title?.statecode !== 0) deny("COMMISSIONING_FRESH_AUTHOR_IDENTITY_DENIED");
  const artifact = await deps.client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${ARTIFACT_ID}` });
  if (artifact?.jm1pub_repositoryitemid !== SOURCE.itemId || artifact.jm1pub_sha256 !== SOURCE.sha256 ||
      artifact._jm1pub_titleid_value !== TITLE_ID || artifact.jm1pub_repositorydriveid !== fresh.driveId) {
    deny("COMMISSIONING_FRESH_ORIGINAL_CROSSWALK_CHANGED");
  }
  const source = await fresh.readComponent(SOURCE, deps);
  if (source.parentReference.id !== PARENT_ID) deny("COMMISSIONING_FRESH_ORIGINAL_PARENT_CHANGED");
  const input = { titleId: TITLE_ID, sourceSha256: SOURCE.sha256, sourceETag: SOURCE.eTag,
    authorityReference: `codex:${fresh.AUTHORITY.threadId}:message:${fresh.AUTHORITY.messageId}` };
  return { source, input, identity };
}

async function execute(input, deps) {
  const fresh = require("./freshTitleIntake"), run = plan(input);
  const read = deps.readOriginalAuthority || readAuthority;
  const current = await read(deps);
  if (plan(current.input).bindingHash !== run.bindingHash) deny("COMMISSIONING_FRESH_CUSTODY_AUTHORITY_CHANGED");
  const parent = `drives/${encodeURIComponent(fresh.driveId)}/items/${PARENT_ID}`;
  async function folderRead() {
    try { return await deps.graph(`${parent}:/_ORIGINAL`); }
    catch (error) { if ([error.status, error.statusCode].includes(404)) return null; throw error; }
  }
  let folder = await folderRead();
  await fresh.immutable(deps.containerClient, `commissioning-fresh-custody/${TITLE_ID}/${run.bindingHash}/intent.json`, run);
  if (!folder) {
    try { await deps.graph(`${parent}/children`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "_ORIGINAL", folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }); }
    catch (error) { folder = await folderRead(); if (!folder) throw error; }
    folder = folder || await folderRead();
  }
  if (!folder?.folder || folder.name !== "_ORIGINAL" || folder.parentReference?.id !== PARENT_ID ||
      folder.parentReference?.driveId !== fresh.driveId) deny("COMMISSIONING_FRESH_ORIGINAL_FOLDER_CONFLICT");
  const target = `drives/${encodeURIComponent(fresh.driveId)}/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(SOURCE.name)}`;
  async function targetRead() {
    let item;
    try { item = await deps.graph(target); }
    catch (error) { if ([error.status, error.statusCode].includes(404)) return null; throw error; }
    if (!item?.file || !item.eTag || item.name !== SOURCE.name || item.size !== SOURCE.bytes ||
        item.parentReference?.id !== folder.id || item.parentReference?.driveId !== fresh.driveId || item.id === SOURCE.itemId) {
      deny("COMMISSIONING_FRESH_ORIGINAL_COPY_CONFLICT");
    }
    const policy = { ...SOURCE, itemId: item.id, eTag: item.eTag, parent: `${SOURCE.parent}/_ORIGINAL` };
    await (deps.verifyCopiedSource || fresh.readComponent)(policy, deps);
    return { driveId: fresh.driveId, itemId: item.id, eTag: item.eTag, sha256: SOURCE.sha256,
      bytes: SOURCE.bytes, path: run.targetPath };
  }
  let custody = await targetRead();
  if (!custody) {
    await read(deps);
    try { await deps.graph(`${target}:/content?@microsoft.graph.conflictBehavior=fail`, {
      method: "PUT", headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, body: current.source.bytes }); }
    catch (error) { custody = await targetRead(); if (!custody) throw error; }
    custody = custody || await targetRead();
  }
  if (!custody) deny("COMMISSIONING_FRESH_ORIGINAL_COPY_OUTCOME_UNKNOWN");
  await read(deps);
  const receipt = { ...run, status: "ORIGINAL_CUSTODY_COPY_VERIFIED", custody,
    provenance: { driveId: fresh.driveId, itemId: SOURCE.itemId, eTag: SOURCE.eTag, sha256: SOURCE.sha256,
      artifactId: ARTIFACT_ID }, historicalSourceChanged: false, titleChanged: false, stagesExecuted: 0 };
  await fresh.immutable(deps.containerClient, `commissioning-fresh-custody/${TITLE_ID}/${run.bindingHash}/receipt.json`, receipt);
  return { receipt };
}

async function processCustody(deps) {
  const current = await (deps.readOriginalAuthority || readAuthority)(deps);
  const result = await processTitleCommissioningStep(current.input, deps, { plan, namespace: "commissioning-fresh-custody-executions",
    executionSuffix: "", execute, validate: result => result?.receipt?.status === "ORIGINAL_CUSTODY_COPY_VERIFIED" &&
      result.receipt.bindingHash === plan(current.input).bindingHash,
    reference: () => `commissioning-fresh-custody/${TITLE_ID}/${plan(current.input).bindingHash}/receipt.json`,
    completionEffects: () => ({ productionStageChanged: false, historicalSourceChanged: false, originalCopyOnly: true }) });
  if (result.status === "COMPLETED") await readPreparedOriginal(deps);
  return result;
}

async function readPreparedOriginal(deps) {
  const current = await (deps.readOriginalAuthority || readAuthority)(deps), run = plan(current.input);
  const blob = deps.containerClient.getBlockBlobClient(`commissioning-fresh-custody/${TITLE_ID}/${run.bindingHash}/receipt.json`);
  const properties = await blob.getProperties();
  if (!properties.etag) deny("COMMISSIONING_FRESH_CUSTODY_RECEIPT_UNVERSIONED");
  const receipt = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
  const fresh = require("./freshTitleIntake"), copy = receipt.custody;
  if (receipt.status !== "ORIGINAL_CUSTODY_COPY_VERIFIED" || receipt.bindingHash !== run.bindingHash ||
      receipt.titleId !== TITLE_ID || receipt.historicalSourceChanged !== false || receipt.stagesExecuted !== 0 ||
      receipt.provenance?.itemId !== SOURCE.itemId || receipt.provenance.eTag !== SOURCE.eTag ||
      receipt.provenance.sha256 !== SOURCE.sha256 || receipt.provenance.artifactId !== ARTIFACT_ID ||
      copy?.driveId !== fresh.driveId || copy.sha256 !== SOURCE.sha256 || copy.bytes !== SOURCE.bytes ||
      copy.path !== run.targetPath || !copy.itemId || copy.itemId === SOURCE.itemId || !copy.eTag) {
    deny("COMMISSIONING_FRESH_CUSTODY_RECEIPT_CONFLICT");
  }
  const policy = { ...SOURCE, itemId: copy.itemId, eTag: copy.eTag, parent: `${SOURCE.parent}/_ORIGINAL` };
  await (deps.verifyCopiedSource || fresh.readComponent)(policy, deps);
  return policy;
}

async function handler(body, deps) {
  const env = deps.env || process.env;
  const disabled = ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"]
    .some(key => env[key] !== "false");
  const executeRequested = body.mode === "FRESH_CUSTODY_PREPARE";
  if (body.titleId !== TITLE_ID || disabled || (executeRequested && env.JM1_TITLE_COMMISSIONING_ORIGINAL_CUSTODY_ENABLED !== "true")) {
    return { status: 403, jsonBody: { code: "COMMISSIONING_FRESH_CUSTODY_DISABLED", effects: 0 } };
  }
  try {
    const fresh = require("./freshTitleIntake"), context = fresh.nativeDeps(deps);
    if (!executeRequested) {
      const current = await readAuthority(context);
      return { status: 200, jsonBody: { plan: plan(current.input), source: current.source.custody, effects: 0 } };
    }
    const result = await processCustody({ ...context, readScope: async () => ({ enabled: true, revoked: false,
      titleId: TITLE_ID, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }) });
    return { status: 200, jsonBody: { result, modelCalls: 0, communications: 0, payments: 0 } };
  } catch (error) {
    return { status: 409, jsonBody: { code: /^COMMISSIONING_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode :
      "COMMISSIONING_FRESH_CUSTODY_DEPENDENCY_FAILED", mutationAttempted: executeRequested,
      recovery: "EXACT_TARGET_READBACK_NO_OVERWRITE", modelCalls: 0, communications: 0, payments: 0 } };
  }
}

module.exports = { TITLE_ID, SOURCE, PARENT_ID, plan, readAuthority, execute, processCustody, readPreparedOriginal, handler };
