"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { runCoverAdapterAcceptance, readCoverAdapterAcceptance, acceptanceDependencies } = require("../src/production/coverAdapterAcceptance");
const { executeCoverOwner } = require("../src/production/coverOwnerRuntime");
const { createCoverOwnerStore } = require("../src/production/coverOwnerStore");

function storage() {
  const blobs = new Map();
  const writes = [];
  let version = 0;
  const client = { getBlockBlobClient: name => ({
    getProperties: async () => {
      const row = blobs.get(name);
      if (!row) throw Object.assign(new Error("not found"), { statusCode: 404 });
      return { etag: row.etag };
    },
    downloadToBuffer: async (_offset, _length, options) => {
      const row = blobs.get(name);
      if (!row) throw Object.assign(new Error("not found"), { statusCode: 404 });
      if (options?.conditions?.ifMatch && options.conditions.ifMatch !== row.etag) throw Object.assign(new Error("conflict"), { statusCode: 412 });
      return Buffer.from(row.bytes);
    },
    uploadData: async (bytes, options) => {
      const row = blobs.get(name);
      if ((options.conditions.ifNoneMatch === "*" && row) ||
          (options.conditions.ifMatch && options.conditions.ifMatch !== row?.etag)) throw Object.assign(new Error("conflict"), { statusCode: 412 });
      blobs.set(name, { bytes: Buffer.from(bytes), etag: `"${++version}"` });
      writes.push(name);
    }
  }) };
  client.listBlobsFlat = async function* ({ prefix }) {
    for (const name of blobs.keys()) if (name.startsWith(prefix)) yield { name };
  };
  return { client, blobs, writes };
}

test("concrete store/composer path survives owner restart, lost response, stale claim and duplicate replay", async () => {
  const { client, blobs, writes } = storage();
  let clock = new Date("2026-10-09T12:00:00Z");
  const first = await runCoverAdapterAcceptance(client, { seed: true, now: () => clock });
  const rows = Object.fromEntries(first.results.map(row => [row.caseName, row]));
  assert.equal(rows.success.status, "AWAITING_REVIEW");
  assert.equal(rows["lost-provider-response"].status, "RECOVERY_REQUIRED");
  assert.equal(rows["unknown-provider-outcome"].status, "RECOVERY_REQUIRED");
  assert.equal(rows["denied-authority"].status, "DENIED");
  assert.equal(rows["expired-claim"].status, "DENIED");
  assert.equal(rows["expired-claim"].code, "COVER_ACCEPTANCE_SIMULATED_CRASH");
  const immediate = await runCoverAdapterAcceptance(client, { now: () => clock });
  assert.equal(immediate.results.find(row => row.caseName === "lost-provider-response").status, "RETRY_PENDING");
  assert.equal(immediate.results.find(row => row.caseName === "expired-claim").status, "IN_PROGRESS");
  clock = new Date(clock.getTime() + 301000);
  const restarted = await runCoverAdapterAcceptance(client, { now: () => clock });
  assert.equal(restarted.results.find(row => row.caseName === "lost-provider-response").status, "AWAITING_REVIEW");
  assert.equal(restarted.results.find(row => row.caseName === "expired-claim").status, "AWAITING_REVIEW");
  assert.equal(restarted.results.find(row => row.caseName === "unknown-provider-outcome").providerCalls, 0);
  const beforeReplayWrites = writes.length;
  const replay = await runCoverAdapterAcceptance(client, { now: () => clock });
  assert.equal(replay.results.find(row => row.caseName === "success").replay, true);
  assert.equal(replay.results.find(row => row.caseName === "lost-provider-response").replay, true);
  assert.equal(writes.length, beforeReplayWrites);
  assert.equal([...blobs.keys()].filter(name => name.includes("/packages/")).length, 3);
  assert.equal([...blobs.keys()].filter(name => name.includes("/receipts/")).length, 3);
  assert.equal([...blobs.keys()].filter(name => name.includes("/provider-receipts/")).length, 6);
  const alerts = await createCoverOwnerStore({ containerClient: client, acceptance: true }).list("alerts");
  assert.equal(alerts.length, 2);
  assert.equal(alerts.filter(row => row.value.status === "RESOLVED").length, 1);
  assert.equal(alerts.filter(row => row.value.status === "OPEN").length, 1);
  assert.ok([...blobs.keys()].every(name => name.startsWith("publishing/cover/acceptance/v1/")));
});

test("denied authority produces no writes after independent source provisioning", async () => {
  const { client, writes } = storage();
  await runCoverAdapterAcceptance(client, { seed: true });
  const { deps, fixture } = await acceptanceDependencies(client, "denied-authority");
  const count = writes.length;
  await assert.rejects(executeCoverOwner(fixture.requestKey, deps), /COVER_OWNER_AUTHORITY_DENIED/);
  assert.equal(writes.length, count);
});

test("synthetic acceptance authority cannot be promoted into the production owner store", async () => {
  const { client } = storage();
  await runCoverAdapterAcceptance(client, { seed: true });
  const { deps, fixture } = await acceptanceDependencies(client, "success");
  const production = createCoverOwnerStore({ containerClient: client });
  await production.writeJson("requests", fixture.requestKey, fixture.request);
  await production.writeJson("authority", fixture.authorityKey, fixture.authority);
  await assert.rejects(executeCoverOwner(fixture.requestKey, { ...deps, store: production }), /COVER_SYNTHETIC_AUTHORITY_PROMOTION_DENIED/);
});

module.exports = { storage };

test("acceptance readback observes durable results without dispatch or writes", async () => {
  const { client, writes } = storage();
  await runCoverAdapterAcceptance(client, { seed: true });
  const before = writes.length;
  const result = await readCoverAdapterAcceptance(client);
  assert.equal(result.counts.requests, 5);
  assert.equal(result.counts.receipts, 1);
  assert.equal(result.counts.executions, 4);
  assert.equal(writes.length, before);
  await readCoverAdapterAcceptance(client);
  assert.equal(writes.length, before);
});

test("request replacement during authority revalidation prevents the provider call", async () => {
  const { client } = storage();
  const { deps, fixture } = await acceptanceDependencies(client, "success");
  await runCoverAdapterAcceptance(client, { seed: true });
  // Start a distinct unexecuted binding without rewriting the seeded source.
  const requestRow = await deps.store.read("requests", fixture.requestKey);
  const authorityRow = await deps.store.read("authority", fixture.authorityKey);
  const modified = { ...authorityRow.value, authorityReference: `${authorityRow.value.authorityReference}:revision` };
  const newKey = require("../src/production/coverOwnerStore").digest(modified);
  const newAuthority = await deps.store.writeJson("authority", newKey, modified, { immutable: true });
  const request = { ...fixture.request, authorityKey: newKey, authoritySha256: newAuthority.sha256,
    authorityReference: modified.authorityReference };
  await deps.store.writeJson("requests", fixture.requestKey, request, { etag: requestRow.etag });
  let checks = 0, calls = 0;
  deps.verifyCurrentAuthority = async () => {
    checks++;
    if (checks === 2) {
      const current = await deps.store.read("requests", fixture.requestKey);
      await deps.store.writeJson("requests", fixture.requestKey, { ...request, revoked: true }, { etag: current.etag });
    }
    return true;
  };
  deps.generateImage = async () => { calls++; throw new Error("must not call"); };
  const result = await executeCoverOwner(fixture.requestKey, deps);
  assert.equal(result.status, "RECOVERY_REQUIRED");
  assert.equal(result.code, "COVER_OWNER_REQUEST_CHANGED");
  assert.equal(calls, 0);
});

test("a revoked request cannot resume a completed or held owner execution", async () => {
  const { client, writes } = storage();
  await runCoverAdapterAcceptance(client, { seed: true });
  const { deps, fixture } = await acceptanceDependencies(client, "success");
  const current = await deps.store.read("requests", fixture.requestKey);
  await deps.store.writeJson("requests", fixture.requestKey, { ...current.value, revoked: true }, { etag: current.etag });
  const before = writes.length;
  await assert.rejects(executeCoverOwner(fixture.requestKey, deps), /COVER_OWNER_REQUEST_INVALID/);
  assert.equal(writes.length, before);
});
