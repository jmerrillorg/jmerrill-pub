"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { hash, fail } = require("./approvedRevisionDocument");
const { policy } = require("./approvedRevisionAuthority");

function createApprovedRevisionStore(deps = {}) {
  const service = deps.service || new BlobServiceClient(process.env.JM1_AGENTIC_AUDIT_BLOB_SERVICE_URL ||
    "https://stjm1diagrunner.blob.core.windows.net", new DefaultAzureCredential());
  const container = service.getContainerClient(process.env.JM1_AGENTIC_AUDIT_CONTAINER || "agentic-audit");
  const prefix = `publishing/editorial-revisions/v1/${policy.taskId}`;
  const blob = (name) => {
    if (!/^[a-z0-9.-]+$/.test(name)) fail("REVISION_STORE_KEY_INVALID");
    return container.getBlockBlobClient(`${prefix}/${name}`);
  };
  async function readBytes(name) {
    try { return await blob(name).downloadToBuffer(); }
    catch (e) { if (e.statusCode === 404) return null; throw e; }
  }
  async function putBytes(name, bytes) {
    try { await blob(name).uploadData(bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/octet-stream" } }); }
    catch (e) {
      if (![409, 412].includes(e.statusCode)) throw e;
      const existing = await readBytes(name);
      if (!existing || !existing.equals(bytes)) fail("REVISION_IMMUTABLE_RECORD_CONFLICT");
    }
    const readback = await readBytes(name);
    if (!readback || hash(readback) !== hash(bytes)) fail("REVISION_STORE_READBACK_FAILED");
  }
  const read = async (name) => { const bytes = await readBytes(name); return bytes ? JSON.parse(bytes.toString("utf8")) : null; };
  const put = (name, value) => putBytes(name, Buffer.from(JSON.stringify(value)));
  async function assertPrivate() {
    const properties = await container.getProperties();
    if (properties.blobPublicAccess) fail("REVISION_AUDIT_CONTAINER_NOT_PRIVATE");
  }
  async function withClaim(work) {
    await assertPrivate();
    await put("claim.json", { owner: "PUBLISHING_APPROVED_EDITORIAL_REVISION_V1", taskId: policy.taskId });
    const stateBlob = blob("state.json");
    try {
      await stateBlob.uploadData(Buffer.from(JSON.stringify({ status: "READY", attempt: 0 })), { conditions: { ifNoneMatch: "*" } });
    } catch (error) { if (![409, 412].includes(error.statusCode)) throw error; }
    // Lease the mutable state itself so an expired process cannot overwrite a newer owner's state.
    const lease = stateBlob.getBlobLeaseClient();
    try { await lease.acquireLease(60); }
    catch (e) { if (e.statusCode === 409) return { ok: true, status: "BUSY", externalSends: 0 }; throw e; }
    let lost = false;
    const timer = setInterval(() => lease.renewLease().catch(() => { lost = true; }), 15000);
    timer.unref?.();
    async function assertOwned() {
      if (lost) fail("REVISION_CLAIM_LOST");
      try { await lease.renewLease(); } catch { lost = true; fail("REVISION_CLAIM_LOST"); }
    }
    async function state(value) {
      await assertOwned();
      await stateBlob.uploadData(Buffer.from(JSON.stringify(value)), {
        conditions: { leaseId: lease.leaseId }, blobHTTPHeaders: { blobContentType: "application/json" }
      });
    }
    try { return await work({ assertOwned, state }); }
    finally { clearInterval(timer); if (!lost) await lease.releaseLease().catch(() => {}); }
  }
  return { read, put, readBytes, putBytes, withClaim, assertPrivate, prefix };
}

module.exports = { createApprovedRevisionStore };
