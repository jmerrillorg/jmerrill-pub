"use strict";

const b = require("./newSubmissionStage03Budget");
const PREFIX = "pipeline-folder-projection";
const PIPELINE = "01DF3SEQLV6K2H3E6TPJH2UOTR5DUBSJT5";
const FOLDERS = Object.freeze({
  "f79006b7-f595-f111-8076-00224820105b": "01DF3SEQIRJVGX6SINUBBJY7GQET66UAAJ",
  "f1908dc9-5775-f111-ab0f-6045bdd69435": "01DF3SEQMY6I3TGLY7EVHZMK5ETM736U5L",
  "e797232b-da7a-f111-ab0f-00224820105b": "01DF3SEQPE2CYM7TA5JFD2LPUMHLK5L2CE",
  "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2": "01DF3SEQKZINN4AIQQ5RGZL2P3Y45GQI5E",
  "0e127af9-fcb3-5671-a0fa-e4af63c307d1": "01DF3SEQLX56WJB7SAGVFYCNM6CW7WBKAT"
});
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function path(id) { return `drives/${encodeURIComponent(require("./freshTitleIntake").driveId)}/items/${encodeURIComponent(id)}`; }
async function pages(graph, url) {
  const result = [], seen = new Set();
  while (url) {
    if (seen.has(url)) deny("PIPELINE_PAGINATION_CYCLE");
    seen.add(url);
    const page = await graph(url);
    if (!Array.isArray(page.value)) deny("PIPELINE_INCOMPLETE_READBACK");
    result.push(...page.value);
    url = page["@odata.nextLink"];
    if (url) {
      const prefix = `https://graph.microsoft.com/v1.0/${path("")}`;
      if (!url.startsWith(prefix)) deny("PIPELINE_PAGINATION_SCOPE_DENIED");
      url = url.slice("https://graph.microsoft.com/v1.0/".length);
    }
  }
  return result;
}
function acl(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.some(x => !x.id || !Array.isArray(x.roles) || !x.roles.length)) deny("PIPELINE_PERMISSION_READBACK_INCOMPLETE");
  return JSON.stringify(rows.map(x => ({ id: x.id, roles: [...x.roles].sort(),
    grantedToV2: x.grantedToV2, grantedToIdentitiesV2: x.grantedToIdentitiesV2,
    link: x.link, invitation: x.invitation, expirationDateTime: x.expirationDateTime }))
    .sort((a, c) => a.id.localeCompare(c.id)));
}
async function inventory(id, graph, progress) {
  const state = progress ? await progress.read() || { pending: [id], items: [] } : { pending: [id], items: [] };
  while (state.pending.length) {
    if (progress && Date.now() >= progress.deadline) return null;
    const itemId = state.pending[0];
    const x = await graph(path(itemId));
    if (x.id !== itemId || state.items.some(row => row.id === itemId)) deny("PIPELINE_INVENTORY_ID_CONFLICT");
    const row = { id: x.id, name: x.name, size: x.size, file: x.file || null,
      parentId: x.parentReference?.id, webUrl: x.webUrl,
      permissions: acl(await pages(graph, `${path(itemId)}/permissions`)) };
    if (x.file) {
      row.versions = await pages(graph, `${path(itemId)}/versions`);
      if (!row.versions.length) deny("PIPELINE_VERSION_READBACK_INCOMPLETE");
    }
    const children = x.folder ? await pages(graph, `${path(itemId)}/children?$top=200`) : [];
    state.items.push(row);
    state.pending.shift();
    state.pending.push(...children.map(child => child.id));
    if (progress) await progress.save(state);
  }
  return state.items.sort((a, c) => a.id.localeCompare(c.id));
}
function custodyEqual(before, after, rootId, targetId) {
  const normalize = (rows, moved) => rows.map(({ webUrl, ...x }) => ({ ...x,
    parentId: x.id === rootId && moved ? targetId : x.parentId }));
  return JSON.stringify(normalize(before, true)) === JSON.stringify(normalize(after, false));
}
async function reconcile(titleId, deps) {
  const folderId = FOLDERS[titleId];
  if (!folderId) deny("PIPELINE_TITLE_OUT_OF_SCOPE");
  const container = deps.containerClient, graph = deps.projectionGraph || deps.graph;
  if ((await container.getProperties()).blobPublicAccess) deny("PIPELINE_PRIVATE_STORAGE_REQUIRED");
  const prefix = `${PREFIX}/${titleId}`;
  const deadline = Date.now() + 120000;
  const lock = container.getBlockBlobClient(`${prefix}/lock.json`);
  try { await lock.uploadData(Buffer.from("{}"), { conditions: { ifNoneMatch: "*" } }); }
  catch (e) { if (![409, 412].includes(e.statusCode)) throw e; }
  const lease = lock.getBlobLeaseClient();
  try { await lease.acquireLease(60); }
  catch (e) { if ([409, 412].includes(e.statusCode)) return { titleId, status: "IN_FLIGHT" }; throw e; }
  let lost = false;
  const timer = setInterval(() => lease.renewLease().catch(() => { lost = true; }), 20000);
  const claim = () => { if (lost) deny("PIPELINE_CLAIM_LOST"); };
  const save = async (name, value) => {
    claim();
    const old = await b.optional(container, `${prefix}/${name}.json`);
    await container.getBlockBlobClient(`${prefix}/${name}.json`).uploadData(Buffer.from(JSON.stringify(value)), {
      conditions: old ? { ifMatch: old.etag } : { ifNoneMatch: "*" },
      blobHTTPHeaders: { blobContentType: "application/json" } });
  };
  try {
    const authority = await deps.readPlacementAuthority(titleId);
    if (!authority?.current || authority.titleId !== titleId || !authority.reference ||
        !/^(0[1-9]|1[0-6])_[A-Z_]+$/.test(authority.stageCode)) deny("PIPELINE_STAGE_AUTHORITY_UNPROVEN");
    if (authority.hold === true) return { titleId, status: "HELD", reason: "MOVEMENT_HOLD", effects: 0 };
    const prior = (await b.optional(container, `${prefix}/state.json`))?.value;
    if (prior?.status === "HELD") return { titleId, ...prior };
    if (prior?.nextAttemptAt && Date.parse(prior.nextAttemptAt) > Date.now()) return { titleId, ...prior };
    const folder = await graph(path(folderId));
    const source = await graph(path(folder.parentReference.id));
    if (!folder.folder || source.parentReference?.id !== PIPELINE || !source.folder) deny("PIPELINE_ANCESTRY_UNPROVEN");
    const stages = await pages(graph, `${path(PIPELINE)}/children?$top=200`);
    const targets = stages.filter(x => x.folder && x.name.startsWith(`${authority.stageCode.slice(0, 2)} - `));
    if (targets.length !== 1) deny("PIPELINE_STAGE_FOLDER_AMBIGUOUS");
    const target = targets[0];
    const children = await pages(graph, `${path(target.id)}/children?$top=200`);
    if (children.some(x => x.name === folder.name && x.id !== folderId)) deny("PIPELINE_DESTINATION_COLLISION");
    const key = b.sha(JSON.stringify(authority));
    const snapshot = phase => inventory(folderId, graph, {
      deadline, read: async () => (await b.optional(container, `${prefix}/moves/${key}/${phase}.json`))?.value,
      save: value => save(`moves/${key}/${phase}`, value)
    });
    const intentPath = `${prefix}/moves/${key}/intent.json`;
    let intent = (await b.optional(container, intentPath))?.value;
    const completed = await b.optional(container, `${prefix}/moves/${key}/receipt.json`);
    if (completed && folder.parentReference.id !== target.id) deny("PIPELINE_VERIFIED_LOCATION_DRIFT");
    if (!intent && folder.parentReference.id === target.id) deny("PIPELINE_UNRECORDED_PLACEMENT");
    if (folder.parentReference.id === target.id && (!intent || completed)) {
      if (completed && deps.reconcileReferences) await deps.reconcileReferences(titleId, completed.value);
      await save("state", { status: "ALIGNED", stageCode: authority.stageCode,
        ...(intent ? { receiptReference: `${prefix}/moves/${key}/receipt.json` } : {}),
        checkedAt: new Date().toISOString(), failures: 0 });
      return { titleId, status: "ALIGNED", folderId, webUrl: folder.webUrl, effects: 0 };
    }
    if (!intent) {
      await save("state", { status: "INVENTORY_PENDING", stageCode: authority.stageCode,
        ...(prior?.receiptReference ? { receiptReference: prior.receiptReference } : {}), failures: prior?.failures || 0 });
      if (acl(await pages(graph, `${path(source.id)}/permissions`)) !== acl(await pages(graph, `${path(target.id)}/permissions`))) deny("PIPELINE_INHERITANCE_CONFLICT");
      const before = await snapshot("before");
      if (!before) return { titleId, status: "INVENTORY_PENDING", effects: 0 };
      intent = { titleId, folderId, sourceId: source.id, targetId: target.id, authority,
        before, createdAt: new Date().toISOString() };
      claim();
      await b.immutable(container, intentPath, intent);
    }
    if (intent.targetId !== target.id || intent.folderId !== folderId) deny("PIPELINE_INTENT_CONFLICT");
    if (folder.parentReference.id !== target.id) {
      if (folder.parentReference.id !== intent.sourceId) deny("PIPELINE_UNEXPECTED_LOCATION");
      const current = await deps.readPlacementAuthority(titleId);
      if (JSON.stringify(current) !== JSON.stringify(authority)) deny("PIPELINE_AUTHORITY_CHANGED");
      const latest = await graph(path(folderId));
      if (!latest.eTag || latest.parentReference.id !== intent.sourceId) deny("PIPELINE_CONCURRENT_MOVE");
      claim();
      await graph(path(folderId), { method: "PATCH", headers: { "Content-Type": "application/json", "If-Match": latest.eTag },
        body: JSON.stringify({ parentReference: { id: target.id } }) });
    }
    const after = await snapshot("after");
    if (!after) return { titleId, status: "CUSTODY_READBACK_PENDING" };
    if (!custodyEqual(intent.before, after, folderId, target.id)) deny("PIPELINE_CUSTODY_MISMATCH");
    const receiptPath = `${prefix}/moves/${key}/receipt.json`;
    const existing = await b.optional(container, receiptPath);
    const receipt = existing?.value || { titleId, folderId, stageCode: authority.stageCode, targetId: target.id,
      authorityReference: authority.reference, intentReference: intentPath, verifiedAt: new Date().toISOString(),
      items: after, status: "CUSTODY_VERIFIED", stageCompleted: false, signatureInferred: false };
    claim();
    await b.immutable(container, receiptPath, receipt);
    if (deps.reconcileReferences) await deps.reconcileReferences(titleId, receipt);
    await save("state", { status: "ALIGNED", stageCode: authority.stageCode, receiptReference: receiptPath,
      checkedAt: new Date().toISOString(), failures: 0 });
    return { titleId, status: "ALIGNED", folderId, receiptReference: receiptPath, items: after.length, replay: !!existing };
  } catch (error) {
    const old = (await b.optional(container, `${prefix}/state.json`))?.value;
    const failures = (old?.failures || 0) + 1;
    const code = /^PIPELINE_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "PIPELINE_DEPENDENCY_FAILED";
    await save("state", { ...(old?.receiptReference ? { receiptReference: old.receiptReference } : {}),
      ...(old?.stageCode ? { stageCode: old.stageCode } : {}),
      status: failures >= 5 || code !== "PIPELINE_DEPENDENCY_FAILED" ? "HELD" : "RETRY_PENDING",
      code, failures, checkedAt: new Date().toISOString(), nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** failures)).toISOString() });
    throw error;
  } finally { clearInterval(timer); await lease.releaseLease().catch(() => {}); }
}

async function acceptsSourceLocation(policy, metadata, deps) {
  if (!deps.graph || !deps.containerClient) return false;
  const original = policy.parent.split("/");
  const current = decodeURIComponent(metadata.parentReference?.path || "").split("root:");
  if (current.length !== 2) return false;
  const actual = current[1].split("/");
  if (actual.length !== original.length || actual.slice(3).join("/") !== original.slice(3).join("/")) return false;
  let parent = await deps.graph(path(metadata.parentReference.id));
  for (let depth = original.length - 4; depth > 0; depth--) parent = await deps.graph(path(parent.parentReference.id));
  const binding = Object.entries(FOLDERS).find(([, folder]) => folder === parent.id);
  if (!binding || parent.name !== original[3]) return false;
  const state = (await b.optional(deps.containerClient, `${PREFIX}/${binding[0]}/state.json`))?.value;
  if (!state?.receiptReference?.startsWith(`${PREFIX}/${binding[0]}/moves/`)) return false;
  const receipt = (await b.read(deps.containerClient, state.receiptReference)).value;
  const stage = await deps.graph(path(parent.parentReference.id));
  return receipt.status === "CUSTODY_VERIFIED" && receipt.folderId === parent.id &&
    receipt.targetId === stage.id && stage.parentReference.id === PIPELINE && stage.name === actual[2] &&
    receipt.items.some(x => x.id === metadata.id && x.name === policy.name && x.size === policy.bytes);
}
module.exports = { PREFIX, PIPELINE, FOLDERS, path, pages, acl, inventory, custodyEqual, reconcile, acceptsSourceLocation };
