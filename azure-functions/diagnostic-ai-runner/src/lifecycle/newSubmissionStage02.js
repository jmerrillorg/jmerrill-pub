"use strict";
const { createHash } = require("node:crypto");
const fresh = require("./freshTitleIntake");
const stage01 = require("./newSubmissionStage01");
const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const MODES = ["SUBMISSION_02_PREFLIGHT", "SUBMISSION_02_EXECUTE", "SUBMISSION_02_READBACK", "SUBMISSION_02_TRANSPORT_READBACK"];
const BROAD = ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"];
const CONTRACT = "EDITORIAL_SYSTEM_STAGE_CONTRACTS:02_INTAKE:PUBLISHING.INTAKE_NORMALIZATION";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function plan(current) {
  const source = stage01.plan(current);
  return { ...source, bindingHash: source.fingerprint, executionId: `new-submission-02:${source.fingerprint}`,
    stage01Output: source.output, output: `new-submission-stage02/${source.titleId}/${source.fingerprint}/receipt.json` };
}
async function load(current, deps) {
  const p = plan(current), census = await stage01.inventory(deps), row = stage01.findExact(census.rows, p);
  const prior = await stage01.readReceipt({ ...p, output: p.stage01Output }, deps, row);
  if (!prior || prior.contactId !== current.identity.contactId) deny("COMMISSIONING_STAGE02_STAGE01_REQUIRED");
  return { p, prior };
}
async function qa(part) {
  if (!Buffer.isBuffer(part.bytes) || hash(part.bytes) !== part.custody.sha256 || part.bytes.length !== part.custody.bytes) {
    deny("COMMISSIONING_STAGE02_SOURCE_BYTES_CHANGED");
  }
  const format = part.policy.format;
  const text = format === "docx" ? (await require("mammoth").extractRawText({ buffer: part.bytes })).value : part.bytes.toString("utf8");
  if (!["docx", "md"].includes(format) || !text.trim() || text.includes("\u0000")) deny("COMMISSIONING_STAGE02_CONTENT_QA_FAILED");
  return { contentQa: "PASS", words: text.trim().split(/\s+/u).length, textSha256: hash(text), format,
    normalization: "LOSSLESS_WORKING_COPY_AND_PROVENANCE_INDEX", editorialChanges: false };
}
async function readOptional(deps, path) {
  try { return await deps.graph(path); }
  catch (e) { if ((e.statusCode || e.status) === 404) return null; throw e; }
}
async function ensureFolder(part, p, deps) {
  const root = `drives/${encodeURIComponent(fresh.driveId)}/items/`;
  const originalFolder = await deps.graph(root + encodeURIComponent(part.parentReference.id));
  const parentPath = part.policy.parent.replace(/\/[^/]+$/, "");
  const originalParentPath = decodeURIComponent(originalFolder.parentReference?.path || "").split("root:")[1];
  if (!originalFolder.folder || !originalFolder.parentReference?.id || originalFolder.parentReference.driveId !== fresh.driveId ||
      originalParentPath !== parentPath || !parentPath.startsWith("/01_Pipeline_A-Z/")) deny("COMMISSIONING_STAGE02_WORKSPACE_UNBOUND");
  const parent = root + encodeURIComponent(originalFolder.parentReference.id);
  const name = `_WORKING_STAGE02_${p.fingerprint.slice(0,16)}`;
  let folder = await readOptional(deps, `${parent}:/${name}`);
  if (!folder) {
    try { await deps.graph(`${parent}/children`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }); }
    catch (e) { folder = await readOptional(deps, `${parent}:/${name}`); if (!folder) throw e; }
    folder = folder || await deps.graph(`${parent}:/${name}`);
  }
  if (!folder.folder || folder.name !== name || folder.parentReference?.id !== originalFolder.parentReference.id ||
      folder.parentReference.driveId !== fresh.driveId) deny("COMMISSIONING_STAGE02_FOLDER_CONFLICT");
  return { id: folder.id, path: `${parentPath}/${name}` };
}
async function persistFile(folder, name, bytes, contentType, deps) {
  const target = `drives/${encodeURIComponent(fresh.driveId)}/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(name)}`;
  let item = await readOptional(deps, target);
  if (!item) {
    try { await deps.graph(`${target}:/content?@microsoft.graph.conflictBehavior=fail`, {
      method: "PUT", headers: { "Content-Type": contentType, "If-None-Match": "*" }, body: bytes }); }
    catch (e) { item = await readOptional(deps, target); if (!item) throw e; }
    item = item || await deps.graph(target);
  }
  if (!item.file || !item.eTag || item.name !== name || item.parentReference?.id !== folder.id ||
      item.parentReference.driveId !== fresh.driveId) deny("COMMISSIONING_STAGE02_OUTPUT_CONFLICT");
  const readback = await deps.sourceBytes({ itemId: item.id });
  if (item.size !== readback.length) deny("COMMISSIONING_STAGE02_OUTPUT_CONFLICT");
  const transport = await verifyTransport(bytes, readback, name);
  return { driveId: fresh.driveId, itemId: item.id, eTag: item.eTag, sha256: hash(readback), bytes: readback.length,
    sourceSha256: hash(bytes), sourceBytes: bytes.length, transport,
    path: `${folder.path}/${name}`, webUrl: item.webUrl || null };
}
function routingXml(bytes, name) {
  const { DOMParser } = require("@xmldom/xmldom");
  let invalid = false;
  const doc = new DOMParser({ errorHandler: { warning: () => { invalid = true; }, error: () => { invalid = true; }, fatalError: () => { invalid = true; } } }).parseFromString(bytes.toString("utf8"), "application/xml");
  if (invalid || doc.doctype) deny("COMMISSIONING_STAGE02_PACKAGE_XML_INVALID");
  const root = doc.documentElement;
  const nodes = [...Array(root.childNodes.length)].map((_, i) => root.childNodes[i]).filter(n => n.nodeType === 1);
  const filtered = nodes.filter(n => name === "[Content_Types].xml"
    ? !(n.localName === "Override" && n.getAttribute("PartName") === "/docProps/custom.xml" && n.getAttribute("ContentType") === "application/vnd.openxmlformats-officedocument.custom-properties+xml")
    : !(n.localName === "Relationship" && n.getAttribute("Type") === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" && n.getAttribute("Target") === "docProps/custom.xml"));
  return JSON.stringify({ root: root.localName, namespace: root.namespaceURI,
    children: filtered.map(n => ({ name: n.localName, namespace: n.namespaceURI,
      attrs: [...Array(n.attributes.length)].map((_, i) => n.attributes[i]).map(a => [a.name, a.value]).sort(),
      text: n.textContent })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
}
async function verifyTransport(source, stored, name) {
  if (!source.equals(stored)) deny("COMMISSIONING_STAGE02_OUTPUT_BYTES_CONFLICT");
  return { rule: "EXACT_BYTES", changedParts: [] };
}
async function packWorkingSource(bytes, name) {
  if (!name || /[\\/]/.test(name)) deny("COMMISSIONING_STAGE02_PACKAGE_NAME_INVALID");
  const zip = new (require("jszip"))();
  zip.file(name, bytes, { date: new Date("2000-01-01T00:00:00Z"), createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE", platform: "DOS" });
}
async function verifyWorkingPackage(bytes, output) {
  const zip = await require("jszip").loadAsync(bytes, { checkCRC32: true });
  const entries = Object.values(zip.files).filter(e => !e.dir);
  if (entries.length !== 1 || entries[0].name !== output.entryName) deny("COMMISSIONING_STAGE02_PACKAGE_SCOPE_CHANGED");
  const source = await entries[0].async("nodebuffer");
  if (source.length !== output.sourceBytes || hash(source) !== output.sourceSha256) deny("COMMISSIONING_STAGE02_PACKAGE_SOURCE_CHANGED");
}
async function transportReadback(current, p, deps) {
  const observations = [];
  for (const part of current.components) {
    const root = `drives/${encodeURIComponent(fresh.driveId)}/items/`;
    const originalFolder = await deps.graph(root + encodeURIComponent(part.parentReference.id));
    const folder = await readOptional(deps, `${root}${encodeURIComponent(originalFolder.parentReference.id)}:/_WORKING_STAGE02_${p.fingerprint.slice(0,16)}`);
    const item = folder && await readOptional(deps, `${root}${encodeURIComponent(folder.id)}:/${encodeURIComponent(part.policy.name)}`);
    if (!item) { observations.push({ sourceItemId: part.custody.itemId, stored: false }); continue; }
    const bytes = await deps.sourceBytes({ itemId: item.id }), differences = [];
    if (part.policy.format === "docx") {
      const Zip = require("jszip"), packages = await Promise.all([part.bytes, bytes].map(b => Zip.loadAsync(b, { checkCRC32: true })));
      for (const path of new Set(packages.flatMap(z => Object.keys(z.files)))) {
        if (packages.every(z => !z.files[path] || z.files[path].dir)) continue;
        const data = await Promise.all(packages.map(z => z.file(path)?.async("nodebuffer") || null));
        if (data.every(Boolean) && data[0].equals(data[1])) continue;
        differences.push({ path, sourceHash: data[0] ? hash(data[0]) : null, storedHash: data[1] ? hash(data[1]) : null,
          ...(data.every(Boolean) && ["[Content_Types].xml", "_rels/.rels"].includes(path)
            ? { routingEquivalent: routingXml(data[0], path) === routingXml(data[1], path) } : {}) });
      }
    }
    observations.push({ sourceItemId: part.custody.itemId, storedItemId: item.id, stored: true,
      sourceBytes: part.bytes.length, storedBytes: bytes.length, sourceHash: hash(part.bytes), storedHash: hash(bytes), differences });
  }
  return observations;
}
async function verifyOutput(output, deps) {
  const item = await deps.graph(`drives/${encodeURIComponent(fresh.driveId)}/items/${encodeURIComponent(output.itemId)}`);
  const path = decodeURIComponent(item.parentReference?.path || "").split("root:")[1];
  if (!item.file || item.eTag !== output.eTag || item.size !== output.bytes || item.parentReference?.driveId !== output.driveId ||
      `${path}/${item.name}` !== output.path) deny("COMMISSIONING_STAGE02_OUTPUT_CUSTODY_CHANGED");
  const bytes = await deps.sourceBytes({ itemId: output.itemId });
  if (bytes.length !== output.bytes || hash(bytes) !== output.sha256) deny("COMMISSIONING_STAGE02_OUTPUT_BYTES_CHANGED");
  if (output.packaging === "ZIP_SINGLE_SOURCE_V1") await verifyWorkingPackage(bytes, output);
}
async function receipt(p, deps) {
  const blob = deps.containerClient.getBlockBlobClient(p.output);
  try {
    const props = await blob.getProperties();
    if (!props.etag) deny("COMMISSIONING_STAGE02_RECEIPT_UNVERSIONED");
    const r = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } })).toString("utf8"));
    if (r.schemaVersion !== 1 || r.titleId !== p.titleId || r.contactId !== p.contactId || r.intakeId !== p.intakeId ||
        r.sourceFingerprint !== p.fingerprint || r.executionId !== p.executionId || r.stageCode !== "02_INTAKE" ||
        r.status !== "COMPLETED" || r.stage03 !== "NOT_STARTED" || r.contract !== CONTRACT ||
        JSON.stringify(r.sources) !== JSON.stringify(p.components) || !Array.isArray(r.outputs) || r.outputs.length !== p.components.length) {
      deny("COMMISSIONING_STAGE02_RECEIPT_CONFLICT");
    }
    for (const [i, output] of r.outputs.entries()) {
      if (output.role !== "EDITORIAL_WORKING_SOURCE" || output.sourceItemId !== p.components[i].itemId ||
          (output.sourceSha256 || output.sha256) !== p.components[i].sha256 || (output.sourceBytes || output.bytes) !== p.components[i].bytes) deny("COMMISSIONING_STAGE02_LINEAGE_CONFLICT");
      await verifyOutput(output, deps);
    }
    await verifyOutput(r.manifest, deps);
    return r;
  } catch (e) { if (e.statusCode === 404) return null; throw e; }
}
async function execute(input, deps) {
  const current = await (deps.readSource || fresh.readSource)(input.titleId, deps), { p } = await load(current, deps);
  if (p.fingerprint !== input.bindingHash) deny("COMMISSIONING_STAGE02_SOURCE_AUTHORITY_CHANGED");
  const outputs = [], folders = new Map();
  for (const source of p.components) {
    const part = current.components.find(x => x.custody.itemId === source.itemId);
    const quality = await qa(part), folder = await ensureFolder(part, p, deps);
    folders.set(folder.id, folder);
    const packaged = quality.format === "docx";
    const workingBytes = packaged ? await packWorkingSource(part.bytes, part.policy.name) : part.bytes;
    const output = await persistFile(folder, packaged ? `${part.policy.name}.working-source.zip` : part.policy.name, workingBytes,
      packaged ? "application/zip" : "text/markdown; charset=utf-8", deps);
    if (output.itemId === source.itemId) deny("COMMISSIONING_STAGE02_ORIGINAL_OVERWRITE_DENIED");
    const bound = { ...output, format: quality.format, packaging: packaged ? "ZIP_SINGLE_SOURCE_V1" : "NONE",
      ...(packaged ? { entryName: part.policy.name } : {}), sourceSha256: source.sha256, sourceBytes: source.bytes,
      role: "EDITORIAL_WORKING_SOURCE", sourceItemId: source.itemId, qa: quality };
    if (packaged) await verifyWorkingPackage(await deps.sourceBytes({ itemId: bound.itemId }), bound);
    outputs.push(bound);
  }
  const after = await (deps.readSource || fresh.readSource)(p.titleId, deps);
  if (plan(after).fingerprint !== p.fingerprint) deny("COMMISSIONING_STAGE02_SOURCE_CHANGED_DURING_EXECUTION");
  const manifestBody = { schemaVersion: 1, contract: CONTRACT, titleId: p.titleId, contactId: p.contactId,
    intakeId: p.intakeId, sourceFingerprint: p.fingerprint, sources: p.components, outputs,
    collectionTreatment: p.components.length > 1 ? "SEPARATE_COMPONENTS_NO_ORDER_OR_CONCATENATION_INFERRED" : "SINGLE_WORKING_SOURCE",
    authorApprovalRequired: false, editorialApproval: false, stage03: "NOT_STARTED" };
  const manifest = await persistFile([...folders.values()][0], "Stage02-Provenance.json", Buffer.from(JSON.stringify(manifestBody)), "application/json", deps);
  const r = { ...manifestBody, executionId: p.executionId, stageCode: "02_INTAKE", status: "COMPLETED", manifest,
    outputReference: p.output, stage01Reference: p.stage01Output, originalBytesChanged: false,
    authorEmail: { generated: false, sent: false, delivered: false, actedUpon: "NOT_REQUIRED_SOURCE_ALREADY_SUPPLIED", required: false },
    historicalCompletionImported: false, modelCalls: 0, payments: 0, titleChanged: false };
  await fresh.immutable(deps.containerClient, p.output, r);
  return { receipt: await receipt(p, deps) };
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (!MODES.includes(body.mode) || !Object.hasOwn(fresh.POLICIES, body.titleId || "")) return { status: 400, jsonBody: { code: "COMMISSIONING_STAGE02_SCOPE_DENIED", effects: 0 } };
  if (Object.keys(body).some(k => !["titleId", "mode"].includes(k))) return { status: 400, jsonBody: { code: "COMMISSIONING_STAGE02_CALLER_AUTHORITY_DENIED", effects: 0 } };
  const executeRequested = body.mode === "SUBMISSION_02_EXECUTE";
  if (BROAD.some(k => env[k] !== "false") || (executeRequested &&
      (env.JM1_NEW_SUBMISSION_STAGE02_ENABLED !== "true" || !(env.JM1_NEW_SUBMISSION_STAGE02_TITLE_IDS || "").split(",").includes(body.titleId)))) {
    return { status: 403, jsonBody: { code: "COMMISSIONING_STAGE02_DISABLED", effects: 0 } };
  }
  let attempted = false;
  try {
    const context = await stage01.native(deps);
    const access = await (deps.verifyAccess || stage01.verifyAccess)(context);
    if (context.containerClient.getProperties && (await context.containerClient.getProperties()).blobPublicAccess) deny("COMMISSIONING_STAGE02_PUBLIC_STORAGE_DENIED");
    const current = await (deps.readSource || fresh.readSource)(body.titleId, context), { p, prior } = await load(current, context);
    for (const part of current.components) await qa(part);
    if (body.mode === "SUBMISSION_02_TRANSPORT_READBACK") return { status: 200, jsonBody: {
      titleId: p.titleId, observations: await transportReadback(current, p, context), effects: 0, stage03: "NOT_STARTED" } };
    const existing = await receipt(p, context);
    if (existing) return { status: 200, jsonBody: { receipt: existing, replay: true, stage03: "NOT_STARTED", effects: 0 } };
    if (!executeRequested) return { status: 200, jsonBody: { titleId: p.titleId, intakeId: p.intakeId, sourceFingerprint: p.fingerprint,
      stage01: prior.status, contract: CONTRACT, proposedOutputs: p.components.length, authorRequestRequired: false,
      sourceOrderInferred: false, access, stage03: "NOT_STARTED", effects: 0 } };
    attempted = true;
    const state = await processTitleCommissioningStep({ titleId: p.titleId, bindingHash: p.fingerprint }, {
      ...context, readScope: async () => ({ enabled: env.JM1_NEW_SUBMISSION_STAGE02_ENABLED === "true", revoked: false,
        titleId: p.titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }) }, {
      namespace: "new-submission-stage02-executions", executionSuffix: "", plan: input => ({ ...input, executionId: p.executionId }), execute,
      repairVersion: "ZIP_SINGLE_SOURCE_V1",
      recoverHeld: state => ["COMMISSIONING_STAGE02_OUTPUT_CONFLICT", "COMMISSIONING_STAGE02_SUBSTANTIVE_PACKAGE_CHANGE"].includes(state.causeCode) && state.repairRecovery?.version !== "ZIP_SINGLE_SOURCE_V1",
      validate: result => result?.receipt?.status === "COMPLETED" && result.receipt.sourceFingerprint === p.fingerprint,
      reference: () => p.output, completionEffects: () => ({ stage03: "NOT_STARTED", originalBytesChanged: false }) });
    const result = state.status === "COMPLETED" ? await receipt(p, context) : null;
    return { status: result ? 200 : 202, jsonBody: { state, receipt: result, replay: false, stage03: "NOT_STARTED", communications: 0, modelCalls: 0, payments: 0 } };
  } catch (e) { return { status: 409, jsonBody: { code: /^COMMISSIONING_[A-Z0-9_]+$/.test(e.safeCode || "") ? e.safeCode : "COMMISSIONING_STAGE02_DEPENDENCY_FAILED",
    mutationAttempted: attempted, providerStatus: e.statusCode || null, recovery: "SAME_SOURCE_CLAIM_AND_EXACT_OUTPUT_READBACK", communications: 0, stage03: "NOT_STARTED" } }; }
}
module.exports = { MODES, CONTRACT, plan, qa, receipt, handler, execute, verifyOutput, verifyTransport, packWorkingSource, verifyWorkingPackage };
