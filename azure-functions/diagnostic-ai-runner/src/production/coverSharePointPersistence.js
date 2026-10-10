"use strict";

const { PDFDocument } = require("pdf-lib");
const { hash, digest } = require("./coverOwnerStore");
const SHA = /^[a-f0-9]{64}$/;
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

async function verifyPrintGeometry(bytes, proof) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 20 * 1024 * 1024 || !SHA.test(proof?.sha256 || "") ||
      hash(bytes) !== proof.sha256 || !Number.isInteger(proof.pageCount) || proof.pageCount < 1 || proof.pageCount > 2000 ||
      !Number.isFinite(proof.widthPoints) || !Number.isFinite(proof.heightPoints) ||
      proof.widthPoints < 144 || proof.heightPoints < 144) deny("COVER_PRINT_PROOF_INVALID");
  let document;
  try { document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true }); }
  catch { deny("COVER_PRINT_PDF_INVALID"); }
  if (document.isEncrypted || document.getPageCount() !== proof.pageCount || document.getPages().some(page => {
    const box = page.getTrimBox();
    return page.getRotation().angle !== 0 || Math.abs(box.width - proof.widthPoints) > 0.01 ||
      Math.abs(box.height - proof.heightPoints) > 0.01;
  })) deny("COVER_PRINT_GEOMETRY_MISMATCH");
  return true;
}

function createCoverSharePointPersistence(deps) {
  async function authority(binding) {
    if (!GUID.test(binding?.titleId || "") || !GUID.test(binding.editionId || "") ||
        !SHA.test(binding.executionKey || "") || !SHA.test(binding.sourceSha256 || "") ||
        !SHA.test(binding.authoritySha256 || "") || typeof deps.verifyAuthority !== "function" ||
        await deps.verifyAuthority(binding) !== true) deny("COVER_REVIEW_DESTINATION_AUTHORITY_DENIED");
    const destination = binding.destination;
    if (!destination || !destination.driveId || !destination.folderId || !destination.folderPath ||
        destination.host !== "jmerrillfoundation.sharepoint.com" || !SHA.test(destination.permissionsSha256 || "") || !GUID.test(binding.reviewerId || "") ||
        !SHA.test(binding.reviewerAuthoritySha256 || "")) deny("COVER_REVIEW_DESTINATION_INVALID");
    const folder = await deps.graph(`drives/${encodeURIComponent(destination.driveId)}/items/${encodeURIComponent(destination.folderId)}`);
    const path = folder.parentReference?.path;
    if (!folder.folder || folder.id !== destination.folderId || folder.parentReference?.driveId !== destination.driveId ||
        typeof path !== "string" || !path.includes("root:") ||
        `${decodeURIComponent(path.slice(path.indexOf("root:") + 5))}/${folder.name}` !== destination.folderPath ||
        new URL(folder.webUrl).hostname !== destination.host) deny("COVER_REVIEW_FOLDER_MISMATCH");
    const permissions = await deps.graph(`drives/${encodeURIComponent(destination.driveId)}/items/${encodeURIComponent(destination.folderId)}/permissions`);
    if (!Array.isArray(permissions.value) || permissions["@odata.nextLink"] || permissions.value.some(row => row.link) ||
        permissionDigest(permissions.value) !== destination.permissionsSha256) deny("COVER_REVIEW_PERMISSIONS_CHANGED");
    return destination;
  }

  async function persist(binding, bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 20 * 1024 * 1024 || !bytes.length) deny("COVER_REVIEW_BYTES_INVALID");
    const destination = await authority(binding);
    const transport = deps.uploadMode || "SESSION";
    if (!["SESSION", "SMALL_CREATE_ONLY"].includes(transport)) deny("COVER_REVIEW_TRANSPORT_INVALID");
    const checksum = hash(bytes);
    const filename = `cover-review-${digest({ binding, checksum })}.html`;
    const parent = `drives/${encodeURIComponent(destination.driveId)}/items/${encodeURIComponent(destination.folderId)}`;
    const target = `${parent}:/${filename}`;
    async function read() {
      let item;
      try { item = await deps.graph(target); }
      catch (error) { if ([error.status, error.statusCode].includes(404)) return null; throw error; }
      if (!item?.file || !item.eTag || item.name !== filename || item.parentReference?.id !== destination.folderId ||
          item.parentReference?.driveId !== destination.driveId || new URL(item.webUrl).hostname !== destination.host) {
        deny("COVER_REVIEW_ITEM_BINDING_MISMATCH");
      }
      const content = await deps.graph(`drives/${encodeURIComponent(destination.driveId)}/items/${encodeURIComponent(item.id)}/content`,
        { responseType: "buffer", headers: { "If-Match": item.eTag } });
      const after = await deps.graph(`drives/${encodeURIComponent(destination.driveId)}/items/${encodeURIComponent(item.id)}`);
      if (!Buffer.isBuffer(content) || !content.equals(bytes) || after.eTag !== item.eTag || after.id !== item.id) {
        deny("COVER_REVIEW_BYTES_CONFLICT");
      }
      return { itemId: item.id, driveId: destination.driveId, folderId: destination.folderId,
        location: item.webUrl, etag: item.eTag, sha256: checksum, bindingSha256: digest(binding),
        titleId: binding.titleId, editionId: binding.editionId, sourceSha256: binding.sourceSha256,
        reviewerId: binding.reviewerId, reviewerAuthoritySha256: binding.reviewerAuthoritySha256 };
    }
    const existing = await read();
    if (existing) { await authority(binding); return existing; }
    await deps.assertClaim();
    await authority(binding);
    if (typeof deps.reserveUploadIntent !== "function" ||
        await deps.reserveUploadIntent({ bindingSha256: digest(binding), checksum, filename }) !== true) {
      deny("COVER_REVIEW_UPLOAD_RECONCILIATION_REQUIRED");
    }
    if (transport === "SMALL_CREATE_ONLY") {
      await deps.assertClaim();
      await authority(binding);
      try {
        await deps.graph(`${target}:/content?@microsoft.graph.conflictBehavior=fail`, { method: "PUT",
          headers: { "Content-Type": "text/plain" }, body: bytes });
      } catch (error) {
        const reconciled = await read();
        if (reconciled) { await authority(binding); return reconciled; }
        throw error;
      }
      const saved = await read();
      if (!saved) deny("COVER_REVIEW_UPLOAD_OUTCOME_UNKNOWN");
      await authority(binding);
      return saved;
    }
    let session;
    try { session = await deps.graph(`${target}:/createUploadSession`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: { name: filename, "@microsoft.graph.conflictBehavior": "fail" } }) }); }
    catch (error) { if (deps.recordUploadSessionFailure) await deps.recordUploadSessionFailure(error); throw error; }
    let upload;
    try { upload = new URL(session.uploadUrl); } catch { deny("COVER_REVIEW_UPLOAD_SESSION_INVALID"); }
    if (upload.protocol !== "https:" || upload.hostname !== destination.host || upload.username || upload.password) {
      deny("COVER_REVIEW_UPLOAD_SESSION_INVALID");
    }
    await deps.assertClaim();
    await authority(binding);
    try {
      const response = await (deps.fetchImpl || fetch)(upload.href, { method: "PUT", redirect: "error",
        signal: AbortSignal.timeout(45000), headers: { "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
      if (![200, 201].includes(response.status)) deny("COVER_REVIEW_UPLOAD_INCOMPLETE");
    } catch {
      // A lost response may still have committed bytes. Read the stable target;
      // never issue a second upload or overwrite to guess the outcome.
      const reconciled = await read();
      if (!reconciled) deny("COVER_REVIEW_UPLOAD_OUTCOME_UNKNOWN");
      await authority(binding);
      return reconciled;
    }
    const saved = await read();
    if (!saved) deny("COVER_REVIEW_UPLOAD_OUTCOME_UNKNOWN");
    await authority(binding);
    return saved;
  }
  return { persist };
}

function permissionDigest(rows) {
  return digest(rows.map(row => ({ id: row.id, roles: [...(row.roles || [])].sort(), link: row.link || null }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id))));
}
module.exports = { createCoverSharePointPersistence, verifyPrintGeometry, permissionDigest };
