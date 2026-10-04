"use strict";

const { policy, OWNER, metadataPath } = require("./approvedRevisionAuthority");
const { hash, fail } = require("./approvedRevisionDocument");
function guid(value) { const h = hash(value); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; }
const artifactId = (variant) => guid(`${policy.taskId}:${policy.recipeVersion}:${variant}`);
function itemPath(filename) { return `drives/${encodeURIComponent(policy.driveId)}/root:${policy.workspacePath}/02_Editorial/${filename}`; }
function graphPath(filename) { return itemPath(filename).split("/").map((p, i) => i < 3 ? p : encodeURIComponent(p)).join("/"); }

async function existingItem(graph, filename) {
  try { return await graph(graphPath(filename)); }
  catch (e) { if (e.status === 404) return null; throw e; }
}
async function verifyItem(graph, item, filename, sha256) {
  if (!item?.id || !item.file || item.parentReference?.driveId !== policy.driveId ||
      metadataPath(item) !== `${policy.workspacePath}/02_Editorial/${filename}`) fail("REVISION_OUTPUT_LOCATION_MISMATCH");
  const bytes = await graph(`drives/${policy.driveId}/items/${item.id}/content`, { responseType: "buffer" });
  if (!Buffer.isBuffer(bytes) || hash(bytes) !== sha256) fail("REVISION_OUTPUT_BYTES_CONFLICT");
  return item;
}
async function persistFile({ graph, fetchImpl = fetch }, filename, bytes, claim) {
  const existing = await existingItem(graph, filename);
  if (existing) return verifyItem(graph, existing, filename, hash(bytes));
  await claim.assertOwned();
  const session = await graph(`${graphPath(filename)}:/createUploadSession`, {
    method: "POST", body: JSON.stringify({ item: { name: filename, "@microsoft.graph.conflictBehavior": "fail" } }),
    headers: { "Content-Type": "application/json" }
  });
  let url;
  try { url = new URL(session.uploadUrl); } catch { fail("REVISION_UPLOAD_SESSION_INVALID"); }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".sharepoint.com")) fail("REVISION_UPLOAD_SESSION_HOST_INVALID");
  await claim.assertOwned();
  // The Graph-returned upload URL authorizes this upload; never forward a Graph bearer token.
  const response = await fetchImpl(url.href, { method: "PUT", redirect: "error", signal: AbortSignal.timeout(45000),
    headers: { "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
  if (![200, 201].includes(response.status)) {
    const error = new Error("Revision upload failed");
    error.safeCode = `REVISION_UPLOAD_HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  const item = await response.json();
  return verifyItem(graph, item, filename, hash(bytes));
}

function artifactPayload(variant, item, bytes) {
  const filename = variant === "review" ? policy.reviewFilename : policy.cleanFilename;
  return {
    jm1pub_editorialartifactid: artifactId(variant), jm1pub_editorialartifactname: filename.replace(/\.docx$/, ""),
    jm1pub_filename: filename, jm1pub_fileextension: "docx", jm1pub_filesizebytes: bytes.length,
    jm1pub_repositorydriveid: policy.driveId, jm1pub_repositoryitemid: item.id, jm1pub_repositorypath: item.webUrl,
    jm1pub_sha256: hash(bytes), jm1pub_versionlabel: policy.outputVersion, jm1pub_artifactstatus: 196650000,
    jm1pub_visibility: 196650001, jm1pub_iscurrentapproved: false, statecode: 0,
    jm1pub_correlationid: `${OWNER}:${policy.taskId}`,
    jm1pub_notes: `Audience INTERNAL_EDITORIAL. Approved bounded revision candidate; visual QA and separate author review pending. Source ${policy.sourceArtifactId}; source SHA256 ${policy.sourceSha256}; disposition ${policy.dispositionId}. No author delivery or stage authorization.`,
    "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${policy.titleId})`,
    "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${policy.stageId})`
  };
}
async function readArtifact(client, id) {
  const rows = await client.list("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${id}`, $top: "2" });
  if (rows.length > 1) fail("REVISION_ARTIFACT_NOT_UNIQUE");
  return rows[0] || null;
}
function verifyArtifact(row, expected) {
  const fields = ["jm1pub_editorialartifactid", "jm1pub_filename", "jm1pub_filesizebytes", "jm1pub_sha256", "jm1pub_repositorydriveid", "jm1pub_repositoryitemid", "jm1pub_repositorypath", "jm1pub_versionlabel", "jm1pub_artifactstatus", "jm1pub_visibility", "jm1pub_iscurrentapproved", "jm1pub_correlationid"];
  if (!row || row.statecode !== 0 || fields.some((key) => row[key] !== expected[key]) || row._jm1pub_titleid_value !== policy.titleId ||
      row._jm1pub_editorialstageid_value !== policy.stageId) fail("REVISION_ARTIFACT_REGISTRATION_CONFLICT");
}
async function persistVariant(deps, variant, bytes, claim) {
  if (!["review", "clean"].includes(variant)) fail("REVISION_VARIANT_INVALID");
  const filename = variant === "review" ? policy.reviewFilename : policy.cleanFilename;
  const item = await persistFile(deps, filename, bytes, claim);
  const payload = artifactPayload(variant, item, bytes);
  let existing = await readArtifact(deps.client, payload.jm1pub_editorialartifactid);
  if (!existing) {
    await claim.assertOwned();
    // Deterministic primary ID: a timeout is recovered by exact-ID readback, never a new create ID.
    await deps.client.create("jm1pub_editorialartifacts", payload);
    existing = await readArtifact(deps.client, payload.jm1pub_editorialartifactid);
  }
  verifyArtifact(existing, payload);
  return { variant, artifactId: payload.jm1pub_editorialartifactid, itemId: item.id, sha256: hash(bytes), size: bytes.length,
    version: policy.outputVersion, filename, webUrl: item.webUrl, audience: "INTERNAL_EDITORIAL" };
}
async function verifyReceipt(deps, receipt) {
  if (receipt.owner !== OWNER || receipt.taskId !== policy.taskId || receipt.recipe !== policy.recipeVersion ||
      receipt.sourceArtifactId !== policy.sourceArtifactId || receipt.sourceSha256 !== policy.sourceSha256 ||
      receipt.canonicalSourceItemId !== policy.canonicalSourceItemId || receipt.authorApproved !== false ||
      receipt.authorDeliveryEligible !== false || receipt.taskCompleted !== false ||
      receipt.authorCommunications !== 0 || receipt.stageAdvancements !== 0 || receipt.outputs?.length !== 2 ||
      new Set(receipt.outputs.map((o) => o.variant)).size !== 2) fail("REVISION_RECEIPT_INVALID");
  for (const output of receipt.outputs) {
    if (!["review", "clean"].includes(output.variant) || output.artifactId !== artifactId(output.variant) ||
        output.version !== policy.outputVersion || output.audience !== "INTERNAL_EDITORIAL" ||
        !Number.isSafeInteger(output.size) || output.size <= 0) fail("REVISION_RECEIPT_OUTPUT_INVALID");
    const expectedName = output.variant === "review" ? policy.reviewFilename : policy.cleanFilename;
    const item = await existingItem(deps.graph, expectedName);
    if (item?.id !== output.itemId) fail("REVISION_OUTPUT_ID_CHANGED");
    await verifyItem(deps.graph, item, expectedName, output.sha256);
    const row = await readArtifact(deps.client, output.artifactId);
    if (!row || row.jm1pub_sha256 !== output.sha256 || row.jm1pub_repositoryitemid !== output.itemId ||
        row._jm1pub_titleid_value !== policy.titleId || row._jm1pub_editorialstageid_value !== policy.stageId) fail("REVISION_RECEIPT_REGISTRATION_MISMATCH");
    const expected = artifactPayload(output.variant, item, Buffer.alloc(0));
    expected.jm1pub_sha256 = output.sha256;
    expected.jm1pub_filesizebytes = output.size;
    verifyArtifact(row, expected);
    if (output.filename !== expectedName || output.webUrl !== item.webUrl) fail("REVISION_RECEIPT_OUTPUT_INVALID");
  }
  return receipt;
}

module.exports = { persistVariant, verifyReceipt, artifactId, artifactPayload, graphPath, verifyArtifact };
