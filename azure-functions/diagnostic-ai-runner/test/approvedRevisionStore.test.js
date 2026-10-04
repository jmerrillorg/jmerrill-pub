"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovedRevisionStore, CONTROL_CONTAINER } = require("../src/editorial/approvedRevisionStore");

function fixture() {
  const blobs = new Map(), controlBlobs = new Map(); let leased = false, failRenew = false, publicAccess;
  const controlProperties = { hasImmutabilityPolicy: false, hasLegalHold: false };
  const container = (records, immutable) => ({
    getProperties: async () => immutable ? { blobPublicAccess: publicAccess, hasImmutabilityPolicy: true } : controlProperties,
    getBlockBlobClient: (key) => ({
      downloadToBuffer: async () => { if (!records.has(key)) throw { statusCode: 404 }; return records.get(key); },
      uploadData: async (bytes, options) => {
        if (immutable && records.has(key)) throw { statusCode: 409, code: "BlobImmutableDueToPolicy" };
        if (options.conditions?.ifNoneMatch && records.has(key)) throw { statusCode: 412 };
        if (key.endsWith("/state.json") && records.has(key)) assert.equal(options.conditions?.leaseId, "synthetic-lease");
        records.set(key, Buffer.from(bytes));
      },
      getBlobLeaseClient: () => ({
        leaseId: "synthetic-lease",
        acquireLease: async (seconds) => { assert.equal(seconds, 60); if (leased) throw { statusCode: 409 }; leased = true; },
        renewLease: async () => { if (!leased || failRenew) throw { statusCode: 412 }; },
        releaseLease: async () => { leased = false; }
      })
    })
  });
  const service = { getContainerClient: name => name === CONTROL_CONTAINER ? container(controlBlobs, false) : container(blobs, true) };
  const store = createApprovedRevisionStore({ service });
  return { store, blobs, controlBlobs, controlProperties, restart: () => createApprovedRevisionStore({ service }),
    seedLegacy: value => blobs.set(`${store.prefix}/state.json`, Buffer.from(JSON.stringify(value))),
    lose: () => { failRenew = true; }, expire: () => { leased = false; failRenew = false; },
    expose: () => { publicAccess = "blob"; } };
}

test("immutable storage verifies bytes, rejects mutation and invalid keys", async () => {
  const h = fixture();
  await h.store.put("intent.json", { one: 1 }); await h.store.put("intent.json", { one: 1 });
  assert.deepEqual(await h.store.read("intent.json"), { one: 1 });
  await assert.rejects(h.store.put("intent.json", { one: 2 }), /IMMUTABLE_RECORD_CONFLICT/);
  await assert.rejects(h.store.read("../other"), /KEY_INVALID/);
  await assert.rejects(h.store.put("state.json", { status: "FAKE" }), /STATE_REQUIRES_CLAIM/);
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

test("WORM audit evidence stays immutable while fenced control state survives restart", async () => {
  const h = fixture();
  h.seedLegacy({ status: "READY", attempt: 0 });
  const oldState = Buffer.from(h.blobs.get(`${h.store.prefix}/state.json`));
  await h.store.withClaim(async claim => {
    await claim.state({ status: "RUNNING", attempt: 1 });
    await h.store.put("intent.json", { authority: "original" });
    await claim.state({ status: "RETRY_WAIT", attempt: 1 });
  });
  const restarted = h.restart();
  assert.deepEqual(await restarted.read("state.json"), { status: "RETRY_WAIT", attempt: 1 });
  await restarted.withClaim(async claim => {
    assert.deepEqual(await restarted.read("intent.json"), { authority: "original" });
    await claim.state({ status: "AWAITING_VISUAL_QA", attempt: 2 });
    await restarted.put("receipt.json", { complete: true });
  });
  assert.equal(h.controlBlobs.size, 1);
  assert.ok(h.blobs.get(`${h.store.prefix}/state.json`).equals(oldState));
  assert.ok(h.blobs.has(`${h.store.prefix}/receipt.json`));
  assert.deepEqual(await h.restart().read("state.json"), { status: "AWAITING_VISUAL_QA", attempt: 2 });
});

test("fresh execution state is never written to the audit container", async () => {
  const h = fixture();
  await h.store.withClaim(claim => claim.state({ status: "RUNNING", attempt: 1 }));
  assert.equal(h.blobs.has(`${h.store.prefix}/state.json`), false);
  assert.equal(h.controlBlobs.size, 1);
});

test("nonpristine legacy attempts require explicit recovery instead of a reset", async () => {
  for (const legacy of [null, false, { status: "RUNNING", attempt: 1 }, { status: "HELD_AUTHORITY", attempt: 1 },
    { status: "READY", attempt: 1 }, { status: "READY", attempt: 0, intent: "unexpected" }]) {
    const h = fixture(); h.seedLegacy(legacy);
    await assert.rejects(h.store.withClaim(() => assert.fail("must not execute")), /LEGACY_STATE_RECOVERY_REQUIRED/);
    assert.equal(h.controlBlobs.size, 0);
    assert.deepEqual(await h.store.read("state.json"), legacy);
  }
});

test("public, immutable, held or unknown control storage fails before any execution", async () => {
  for (const properties of [{ blobPublicAccess: "blob" }, { hasImmutabilityPolicy: true }, { hasLegalHold: true },
    { hasImmutabilityPolicy: undefined }, { hasLegalHold: undefined }]) {
    const h = fixture(); Object.assign(h.controlProperties, properties);
    await assert.rejects(h.store.withClaim(() => assert.fail("must not execute")), /CONTROL_/);
    assert.equal(h.blobs.size, 0); assert.equal(h.controlBlobs.size, 0);
  }
});
