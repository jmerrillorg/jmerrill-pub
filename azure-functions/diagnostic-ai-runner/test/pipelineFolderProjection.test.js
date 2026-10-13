"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const p = require("../src/lifecycle/pipelineFolderProjection");
const b = require("../src/lifecycle/newSubmissionStage03Budget");
function fixture() {
  const titleId = Object.keys(p.FOLDERS)[0], folderId = p.FOLDERS[titleId], blobs = new Map(), versions = new Map();
  const permission = [{ id: "owners", roles: ["owner"], grantedToV2: { group: { id: "owners" } } }];
  const items = new Map([
    [p.PIPELINE, { id: p.PIPELINE, name: "01_Pipeline_A-Z", folder: {}, parentReference: { id: "root" } }],
    ["intake", { id: "intake", name: "02 - Intake", folder: {}, parentReference: { id: p.PIPELINE } }],
    ["agreement", { id: "agreement", name: "05 - Agreement & Payment", folder: {}, parentReference: { id: p.PIPELINE } }],
    [folderId, { id: folderId, name: "Title", folder: {}, eTag: "etag", parentReference: { id: "intake" } }],
    ["original", { id: "original", name: "source.docx", size: 123, file: { hashes: { quickXorHash: "bytes" } }, parentReference: { id: folderId } }]
  ]);
  let patches = 0, failAfterMove = false, leased = false;
  const put = (ref, value) => { blobs.set(ref, Buffer.from(JSON.stringify(value))); versions.set(ref, (versions.get(ref) || 0) + 1); };
  const deps = {
    readPlacementAuthority: async () => ({ titleId, current: true, stageCode: "05_AGREEMENT_PAYMENT", reference: "signed-request-not-signature" }),
    graph: async (url, options = {}) => {
      const [id, sub] = url.split("/items/")[1].split(/[/?]/);
      const item = items.get(id);
      if (options.method === "PATCH") {
        assert.equal(id, folderId); assert.equal(options.headers["If-Match"], "etag");
        patches++; item.parentReference.id = JSON.parse(options.body).parentReference.id;
        if (failAfterMove) { failAfterMove = false; throw Error("timeout after provider success"); }
      }
      if (sub === "permissions") return { value: permission };
      if (sub === "versions") return { value: [{ id: "1.0", size: 123 }] };
      if (sub === "children") return { value: [...items.values()].filter(x => x.parentReference.id === id) };
      assert.ok(item, url); return structuredClone(item);
    },
    containerClient: { getProperties: async () => ({}), getBlockBlobClient: ref => ({
      getProperties: async () => { if (!blobs.has(ref)) throw Object.assign(Error(), { statusCode: 404 }); return { etag: String(versions.get(ref)) }; },
      downloadToBuffer: async () => blobs.get(ref),
      uploadData: async (bytes, options = {}) => {
        if (options.conditions?.ifNoneMatch && blobs.has(ref) || options.conditions?.ifMatch && options.conditions.ifMatch !== String(versions.get(ref))) throw Object.assign(Error(), { statusCode: 412 });
        blobs.set(ref, Buffer.from(bytes)); versions.set(ref, (versions.get(ref) || 0) + 1);
      },
      getBlobLeaseClient: () => ({ acquireLease: async () => { if (leased) throw Object.assign(Error(), { statusCode: 409 }); leased = true; },
        renewLease: async () => {}, releaseLease: async () => { leased = false; } })
    }) }
  };
  return { titleId, folderId, deps, blobs, items, put, patches: () => patches, timeout: () => { failAfterMove = true; } };
}
test("moves same folder, preserves file versions and permissions, does not complete a stage, replay does not move", async () => {
  const x = fixture(), first = await p.reconcile(x.titleId, x.deps);
  assert.equal(first.status, "ALIGNED"); assert.equal(first.items, 2); assert.equal(x.patches(), 1);
  const receipt = JSON.parse(x.blobs.get(first.receiptReference));
  assert.equal(receipt.signatureInferred, false); assert.equal(receipt.stageCompleted, false);
  assert.equal(receipt.items.find(x => x.id === "original").versions[0].id, "1.0");
  await p.reconcile(x.titleId, x.deps); assert.equal(x.patches(), 1);
  assert.equal(JSON.parse(x.blobs.get(`${p.PREFIX}/${x.titleId}/state.json`)).receiptReference, first.receiptReference);
});
test("ambiguous provider timeout resumes from same intent without a second move", async () => {
  const x = fixture(); x.timeout();
  await assert.rejects(p.reconcile(x.titleId, x.deps));
  const statePath = `${p.PREFIX}/${x.titleId}/state.json`, state = JSON.parse(x.blobs.get(statePath));
  assert.equal(state.status, "RETRY_PENDING");
  x.put(statePath, { ...state, nextAttemptAt: "2000-01-01T00:00:00Z" });
  const result = await p.reconcile(x.titleId, x.deps);
  assert.equal(result.status, "ALIGNED"); assert.equal(x.patches(), 1);
});
test("destination collision fails closed without deleting or merging", async () => {
  const x = fixture(); x.items.set("duplicate", { id: "duplicate", name: "Title", folder: {}, parentReference: { id: "agreement" } });
  await assert.rejects(p.reconcile(x.titleId, x.deps), /PIPELINE_DESTINATION_COLLISION/);
  assert.equal(x.patches(), 0);
});
test("hold stays in current folder, expired claim can be retried, unknown title denied", async () => {
  const x = fixture(); x.deps.readPlacementAuthority = async () => ({ titleId: x.titleId, current: true, hold: true, stageCode: "05_AGREEMENT_PAYMENT", reference: "hold" });
  assert.equal((await p.reconcile(x.titleId, x.deps)).status, "HELD"); assert.equal(x.patches(), 0);
  await assert.rejects(p.reconcile("unknown", x.deps), /OUT_OF_SCOPE/);
});
test("custody comparison rejects changed bytes, versions, permissions and missing items", async () => {
  const x = fixture(), before = await p.inventory(x.folderId, x.deps.graph);
  const after = structuredClone(before); after.find(r => r.id === x.folderId).parentId = "agreement";
  assert.equal(p.custodyEqual(before, after, x.folderId, "agreement"), true);
  for (const change of [r => r.size++, r => r.permissions = "other", r => r.versions.push({ id: "2.0" })]) {
    const altered = structuredClone(after); change(altered.find(r => r.id === "original"));
    assert.equal(p.custodyEqual(before, altered, x.folderId, "agreement"), false);
  }
  assert.equal(p.custodyEqual(before, after.slice(1), x.folderId, "agreement"), false);
});
test("incremental inventory resumes persisted cursor without duplicate items", async () => {
  const x = fixture(); let state;
  const progress = { deadline: 0, read: async () => state, save: async value => { state = structuredClone(value); } };
  assert.equal(await p.inventory(x.folderId, x.deps.graph, progress), null);
  progress.deadline = Infinity;
  const rows = await p.inventory(x.folderId, x.deps.graph, progress);
  assert.equal(rows.length, 2); assert.equal(new Set(rows.map(x => x.id)).size, 2);
  assert.deepEqual(await p.inventory(x.folderId, x.deps.graph, progress), rows);
});
test("source relocation needs stable title folder plus durable verified custody, not path text", async () => {
  const x = fixture(); await p.reconcile(x.titleId, x.deps);
  const metadata = { id: "original", parentReference: { id: x.folderId, path: "/root:/01_Pipeline_A-Z/05 - Agreement & Payment/Title" } };
  const policy = { parent: "/01_Pipeline_A-Z/02 - Intake/Title", name: "source.docx", bytes: 123 };
  assert.equal(await p.acceptsSourceLocation(policy, metadata, x.deps), true);
  assert.equal(await p.acceptsSourceLocation({ ...policy, bytes: 124 }, metadata, x.deps), false);
  const statePath = `${p.PREFIX}/${x.titleId}/state.json`; x.put(statePath, {});
  assert.equal(await p.acceptsSourceLocation(policy, metadata, x.deps), false);
});
test("pagination rejects cross-drive continuation instead of claiming complete census", async () => {
  await assert.rejects(p.pages(async () => ({ value: [], "@odata.nextLink": "https://example.org/secret" }), p.path("root")), /PAGINATION_SCOPE_DENIED/);
});
test("transient Graph credentials and absent false IRM flags are not custody differences", async () => {
  const x = fixture(), before = await p.inventory(x.folderId, x.deps.graph), after = structuredClone(before);
  after.find(r => r.id === x.folderId).parentId = "agreement";
  const file = after.find(r => r.id === "original");
  file.file.irmEnabled = false; file.file.irmEffectivelyEnabled = false;
  file.versions[0]["@microsoft.graph.downloadUrl"] = "temporary-secret";
  assert.equal(p.custodyEqual(before, after, x.folderId, "agreement"), true);
  assert.ok(!JSON.stringify(p.sanitize(after)).includes("temporary-secret"));
  file.file.irmEnabled = true;
  assert.equal(p.custodyEqual(before, after, x.folderId, "agreement"), false);
  const permission = [{ id: "link", roles: ["read"], link: { type: "view", scope: "users", webUrl: "secret" } }];
  assert.equal(p.acl(permission), p.acl([{ ...permission[0], link: { type: "view", scope: "users" } }]));
  assert.notEqual(p.acl(permission), p.acl([{ ...permission[0], roles: ["write"] }]));
});
test("only metadata-only held moves recover; recovery rereads custody without another move", async () => {
  const x = fixture(), before = await p.inventory(x.folderId, x.deps.graph);
  const authority = await x.deps.readPlacementAuthority(x.titleId), prefix = `${p.PREFIX}/${x.titleId}`;
  const move = `${prefix}/moves/${b.sha(JSON.stringify(authority))}`;
  x.items.get(x.folderId).parentReference.id = "agreement";
  const after = await p.inventory(x.folderId, x.deps.graph);
  x.put(`${move}/intent.json`, { folderId: x.folderId, targetId: "agreement", sourceId: "intake", before, authority });
  x.put(`${move}/after.json`, { pending: [], items: after });
  x.put(`${prefix}/state.json`, { status: "HELD", code: "PIPELINE_CUSTODY_MISMATCH" });
  const changed = structuredClone(after); changed.find(r => r.id === "original").size++;
  x.put(`${move}/after.json`, { pending: [], items: changed });
  assert.equal((await p.reconcile(x.titleId, x.deps)).status, "HELD");
  x.put(`${move}/after.json`, { pending: [], items: after });
  assert.equal((await p.reconcile(x.titleId, x.deps)).status, "ALIGNED");
  assert.equal(x.patches(), 0);
  assert.ok(x.blobs.has(`${move}/metadata-recovery-v2.json`));
  assert.ok(x.blobs.has(`${move}/after-v2.json`));
  assert.equal((await p.reconcile(x.titleId, x.deps)).status, "ALIGNED");
  assert.equal(x.patches(), 0);
});
