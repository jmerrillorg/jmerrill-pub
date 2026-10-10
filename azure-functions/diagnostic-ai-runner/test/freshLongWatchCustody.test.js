"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const custody = require("../src/lifecycle/freshLongWatchCustody");
const { driveId } = require("../src/lifecycle/freshTitleIntake");
test("copy route remains disabled without its bounded custody flag", async () => {
  const result = await custody.handler({ titleId: custody.TITLE_ID, mode: "FRESH_CUSTODY_PREPARE" }, { env: {} });
  assert.equal(result.status, 403); assert.equal(result.jsonBody.effects, 0);
});
for (const outcome of ["success", "lost-response", "existing-conflict"]) test(`copy-only original custody ${outcome}`, async () => {
  const blobs = new Map(); let folder, item, writes = 0, verificationCount = 0, version = 0;
  const input = { titleId: custody.TITLE_ID, sourceSha256: custody.SOURCE.sha256, sourceETag: custody.SOURCE.eTag,
    authorityReference: "human:synthetic-fixture" };
  const deps = {
    readScope: async () => ({ enabled: true, revoked: false, titleId: custody.TITLE_ID, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }),
    readOriginalAuthority: async () => ({ input, source: { bytes: Buffer.from("harmless synthetic DOCX stand-in") } }),
    verifyCopiedSource: async policy => {
      verificationCount++;
      assert.equal(policy.sha256, custody.SOURCE.sha256);
      assert.equal(policy.parent, `${custody.SOURCE.parent}/_ORIGINAL`);
      if (outcome === "existing-conflict") throw new Error("conflicting original bytes");
    },
    containerClient: { getBlockBlobClient: path => ({
      uploadData: async (bytes, options) => {
        const previous = blobs.get(path);
        if ((options.conditions.ifNoneMatch && previous) || (options.conditions.ifMatch && previous?.etag !== options.conditions.ifMatch)) {
          throw Object.assign(new Error("exists"), { statusCode: 412 });
        }
        const etag = String(++version); blobs.set(path, { bytes: Buffer.from(bytes), etag }); return { etag };
      },
      getProperties: async () => { if (!blobs.has(path)) throw Object.assign(new Error("missing"), { statusCode: 404 }); return { etag: blobs.get(path).etag }; },
      downloadToBuffer: async (_start, _length, options) => {
        assert.equal(blobs.get(path).etag, options.conditions.ifMatch); return blobs.get(path).bytes;
      }
    }) },
    graph: async (path, options = {}) => {
      if (options.method === "POST") {
        writes++; folder = { id: "original-folder", name: "_ORIGINAL", folder: {},
          parentReference: { id: custody.PARENT_ID, driveId } }; return folder;
      }
      if (options.method === "PUT") {
        assert.match(path, /conflictBehavior=fail$/);
        writes++; item = { id: "copy-item", name: custody.SOURCE.name, size: custody.SOURCE.bytes, file: {}, eTag: "copy-v1",
          parentReference: { id: "original-folder", driveId } };
        if (outcome === "lost-response") throw new Error("lost committed upload response");
        return item;
      }
      const value = path.endsWith(":/_ORIGINAL") ? folder : item;
      if (!value) throw Object.assign(new Error("missing"), { statusCode: 404 });
      return value;
    }
  };
  if (outcome === "existing-conflict") {
    folder = { id: "original-folder", name: "_ORIGINAL", folder: {}, parentReference: { id: custody.PARENT_ID, driveId } };
    item = { id: "copy-item", name: custody.SOURCE.name, size: custody.SOURCE.bytes, file: {}, eTag: "copy-v1",
      parentReference: { id: "original-folder", driveId } };
    await assert.rejects(custody.execute(input, deps), /conflicting original bytes/);
    assert.equal(writes, 0);
    return;
  }
  const first = await custody.execute(input, deps);
  assert.equal(first.receipt.historicalSourceChanged, false);
  assert.equal(first.receipt.stagesExecuted, 0);
  assert.equal(writes, 2);
  assert.deepEqual(await custody.execute(input, { ...deps }), first);
  assert.equal(writes, 2); assert.ok(verificationCount >= 2);
  assert.equal([...blobs.keys()].filter(path => path.endsWith("/receipt.json")).length, 1);
  const worker = await custody.processCustody(deps);
  assert.equal(worker.status, "COMPLETED");
  assert.deepEqual(await custody.processCustody({ ...deps }), worker);
  const policy = await custody.readPreparedOriginal(deps);
  assert.equal(policy.itemId, "copy-item");
  assert.equal(policy.parent, `${custody.SOURCE.parent}/_ORIGINAL`);
  assert.equal(writes, 2);
  const receiptPath = [...blobs.keys()].find(path => path.endsWith("/receipt.json"));
  const broken = JSON.parse(blobs.get(receiptPath).bytes);
  broken.provenance.artifactId = "wrong-artifact";
  blobs.get(receiptPath).bytes = Buffer.from(JSON.stringify(broken));
  await assert.rejects(custody.readPreparedOriginal(deps), /CUSTODY_RECEIPT_CONFLICT/);
});
