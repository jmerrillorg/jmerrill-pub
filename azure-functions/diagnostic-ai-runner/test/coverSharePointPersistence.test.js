"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { PDFDocument, degrees } = require("pdf-lib");
const { hash } = require("../src/production/coverOwnerStore");
const { createCoverSharePointPersistence, verifyPrintGeometry, permissionDigest } = require("../src/production/coverSharePointPersistence");
const binding = { titleId: "11111111-1111-4111-8111-111111111111", editionId: "22222222-2222-4222-8222-222222222222",
  executionKey: "a".repeat(64), sourceSha256: "b".repeat(64), authoritySha256: "c".repeat(64),
  reviewerId: "33333333-3333-4333-8333-333333333333", reviewerAuthoritySha256: "d".repeat(64),
  destination: { driveId: "drive", folderId: "folder", folderPath: "/Preview Runtime Certification", host: "jmerrillfoundation.sharepoint.com", permissionsSha256: permissionDigest([]) } };
function fixture(mode) {
  let item, bytes, intent = false, uploads = 0, sessions = 0, allowed = true;
  const deps = {
    assertClaim: async () => {}, verifyAuthority: async () => allowed,
    reserveUploadIntent: async () => { if (intent) return false; intent = true; return true; },
    graph: async (path, options) => {
      if (path.endsWith("/permissions")) return { value: [] };
      if (path.endsWith("createUploadSession")) { sessions++; return { uploadUrl: "https://jmerrillfoundation.sharepoint.com/upload" }; }
      if (path.endsWith("/items/folder")) return { id: "folder", name: "Preview Runtime Certification", folder: {},
        parentReference: { driveId: "drive", path: "/drive/root:" }, webUrl: "https://jmerrillfoundation.sharepoint.com/preview" };
      if (path.endsWith("/content")) return bytes;
      if (!item) throw Object.assign(new Error("missing"), { status: 404 });
      if (path.includes(":/")) item.name = path.split(":/")[1];
      return item;
    },
    fetchImpl: async (url, request) => {
      uploads++; assert.equal(request.headers.Authorization, undefined);
      if (mode !== "unknown") {
        bytes = request.body;
        item = { id: "item", file: {}, eTag: "v1", parentReference: { driveId: "drive", id: "folder" },
          webUrl: "https://jmerrillfoundation.sharepoint.com/preview/item" };
      }
      if (mode) throw new Error("timeout");
      return { status: 201 };
    }
  };
  return { deps, stats: () => ({ uploads, sessions }), revoke: () => { allowed = false; },
    loseCustody: () => { item = undefined; },
    corrupt: () => { bytes = Buffer.from("conflicting bytes"); } };
}
test("exact SharePoint bytes survive restart and replay with stable receipt and one upload", async () => {
  const f = fixture(); const bytes = Buffer.from("synthetic review package");
  const first = await createCoverSharePointPersistence(f.deps).persist(binding, bytes);
  const replay = await createCoverSharePointPersistence(f.deps).persist(binding, bytes);
  assert.deepEqual(first, replay); assert.equal(first.sha256, hash(bytes));
  assert.deepEqual(f.stats(), { uploads: 1, sessions: 1 });
});
test("lost committed upload response reconciles exact bytes without another upload", async () => {
  const f = fixture("committed"); const bytes = Buffer.from("synthetic review package");
  const first = await createCoverSharePointPersistence(f.deps).persist(binding, bytes);
  assert.equal(first.sha256, hash(bytes));
  await createCoverSharePointPersistence(f.deps).persist(binding, bytes);
  assert.equal(f.stats().uploads, 1);
});
test("unknown write remains held on restart rather than issuing a second session", async () => {
  const f = fixture("unknown"); const runtime = createCoverSharePointPersistence(f.deps);
  await assert.rejects(runtime.persist(binding, Buffer.from("fixture")), /COVER_REVIEW_UPLOAD_OUTCOME_UNKNOWN/);
  await assert.rejects(runtime.persist(binding, Buffer.from("fixture")), /COVER_REVIEW_UPLOAD_RECONCILIATION_REQUIRED/);
  assert.deepEqual(f.stats(), { uploads: 1, sessions: 1 });
});
test("revoked authority denies writes and replay; conflicting stored bytes are not overwritten", async () => {
  const f = fixture(); const bytes = Buffer.from("fixture"); const runtime = createCoverSharePointPersistence(f.deps);
  await runtime.persist(binding, bytes); f.corrupt();
  await assert.rejects(runtime.persist(binding, bytes), /COVER_REVIEW_BYTES_CONFLICT/);
  f.revoke(); await assert.rejects(runtime.persist(binding, bytes), /AUTHORITY_DENIED/);
  assert.equal(f.stats().uploads, 1);
});
test("PDF parser checks every page, count, exact bytes, and rotation without changing the original", async () => {
  const document = await PDFDocument.create(); document.addPage([432, 648]); document.addPage([432, 648]);
  const bytes = Buffer.from(await document.save()); const proof = { sha256: hash(bytes), pageCount: 2, widthPoints: 432, heightPoints: 648 };
  assert.equal(await verifyPrintGeometry(bytes, proof), true);
  await assert.rejects(verifyPrintGeometry(bytes, { ...proof, pageCount: 3 }), /GEOMETRY_MISMATCH/);
  await assert.rejects(verifyPrintGeometry(bytes, { ...proof, widthPoints: 500 }), /GEOMETRY_MISMATCH/);
  document.getPage(1).setRotation(degrees(90)); const rotated = Buffer.from(await document.save());
  await assert.rejects(verifyPrintGeometry(rotated, { ...proof, sha256: hash(rotated) }), /GEOMETRY_MISMATCH/);
  assert.equal(hash(bytes), proof.sha256);
});
test("permission drift and cross-folder custody deny before upload", async () => {
  const f = fixture();
  await assert.rejects(createCoverSharePointPersistence(f.deps).persist({ ...binding,
    destination: { ...binding.destination, permissionsSha256: "e".repeat(64) } }, Buffer.from("fixture")), /PERMISSIONS_CHANGED/);
  await assert.rejects(createCoverSharePointPersistence(f.deps).persist({ ...binding,
    destination: { ...binding.destination, folderPath: "/Wrong title" } }, Buffer.from("fixture")), /FOLDER_MISMATCH/);
  assert.deepEqual(f.stats(), { uploads: 0, sessions: 0 });
});
test("read-only completed custody verification never repairs a missing SharePoint file", async () => {
  const f = fixture(); const bytes = Buffer.from("fixture");
  const first = await createCoverSharePointPersistence(f.deps).persist(binding, bytes);
  f.deps.assertClaim = async () => { throw new Error("READ_ONLY_CUSTODY_MISSING"); };
  const readOnly = createCoverSharePointPersistence(f.deps);
  assert.deepEqual(await readOnly.persist(binding, bytes), first);
  f.loseCustody(); await assert.rejects(readOnly.persist(binding, bytes), /READ_ONLY_CUSTODY_MISSING/);
  assert.deepEqual(f.stats(), { uploads: 1, sessions: 1 });
});
