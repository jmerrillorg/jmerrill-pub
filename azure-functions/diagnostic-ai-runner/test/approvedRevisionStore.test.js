"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovedRevisionStore } = require("../src/editorial/approvedRevisionStore");

function fixture() {
  const blobs = new Map(); let leased = false, failRenew = false, publicAccess;
  const container = {
    getProperties: async () => ({ blobPublicAccess: publicAccess }),
    getBlockBlobClient: (key) => ({
      downloadToBuffer: async () => { if (!blobs.has(key)) throw { statusCode: 404 }; return blobs.get(key); },
      uploadData: async (bytes, options) => {
        if (options.conditions?.ifNoneMatch && blobs.has(key)) throw { statusCode: 412 };
        if (key.endsWith("/state.json") && blobs.has(key)) assert.equal(options.conditions?.leaseId, "synthetic-lease");
        blobs.set(key, Buffer.from(bytes));
      },
      getBlobLeaseClient: () => ({
        leaseId: "synthetic-lease",
        acquireLease: async (seconds) => { assert.equal(seconds, 60); if (leased) throw { statusCode: 409 }; leased = true; },
        renewLease: async () => { if (!leased || failRenew) throw { statusCode: 412 }; },
        releaseLease: async () => { leased = false; }
      })
    })
  };
  const store = createApprovedRevisionStore({ service: { getContainerClient: () => container } });
  return { store, blobs, lose: () => { failRenew = true; }, expire: () => { leased = false; failRenew = false; },
    expose: () => { publicAccess = "blob"; } };
}

test("immutable storage verifies bytes, rejects mutation and invalid keys", async () => {
  const h = fixture();
  await h.store.put("intent.json", { one: 1 }); await h.store.put("intent.json", { one: 1 });
  assert.deepEqual(await h.store.read("intent.json"), { one: 1 });
  await assert.rejects(h.store.put("intent.json", { one: 2 }), /IMMUTABLE_RECORD_CONFLICT/);
  await assert.rejects(h.store.read("../other"), /KEY_INVALID/);
});

test("private storage and exclusive claims fail closed; expiry allows existing intent recovery", async () => {
  const publicStore = fixture(); publicStore.expose();
  await assert.rejects(publicStore.store.withClaim(async () => {}), /NOT_PRIVATE/);
  assert.equal(publicStore.blobs.size, 0);
  const h = fixture();
  await h.store.put("intent.json", { original: true });
  await h.store.withClaim(async (claim) => {
    assert.equal((await h.store.withClaim(async () => assert.fail("duplicate execution"))).status, "BUSY");
    await claim.state({ status: "RUNNING" });
    h.lose();
    await assert.rejects(claim.state({ status: "COMPLETE" }), /CLAIM_LOST/);
  });
  assert.deepEqual(await h.store.read("state.json"), { status: "RUNNING" });
  h.expire();
  await h.store.withClaim(async (claim) => {
    assert.deepEqual(await h.store.read("intent.json"), { original: true });
    await claim.state({ status: "RECOVERED" });
  });
  assert.deepEqual(await h.store.read("state.json"), { status: "RECOVERED" });
});
