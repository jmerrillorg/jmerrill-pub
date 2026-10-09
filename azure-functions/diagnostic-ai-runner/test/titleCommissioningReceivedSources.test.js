"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const received = require("../src/lifecycle/titleCommissioningReceivedSources");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contact } = require("../src/author/jackieTitleSystemCommissioningPolicy");
function fixture(policy = received.policies.TIL_DEATH) {
  const rows = new Map(); let creates = 0, claims = 0;
  const title = { jm1pub_titleid: policy.titleId, statecode: 0, jm1_canonicalauthorcontactreference: `contact:${contact}`,
    ...(policy.newTitleWorkReference ? { jm1_sourceauthority: policy.newTitleWorkReference } : {}) };
  rows.set(`jm1pub_titles:${policy.titleId}`, title);
  const deps = { claim: { assertOwned: async () => { claims++; } },
    readReceivedSourceProof: async () => ({ kind: "EXACT_INTAKE_IMMUTABLE_MANIFEST", originalFileName: "Original.md",
      repositoryPath: "https://jmerrillfoundation.sharepoint.com/sites/publishing/Documents/01_Pipeline_A-Z/02%20-%20Intake/Original.md" }),
    client: {
      first: async (entity, query) => [...rows].find(([key]) => key.startsWith(`${entity}:`) && query.$filter.includes(key.split(":")[1]))?.[1] || null,
      list: async () => [],
      create: async (entity, payload) => { creates++;
        const id = payload[entity === "jm1pub_titles" ? "jm1pub_titleid" : "jm1pub_editorialartifactid"];
        rows.set(`${entity}:${id}`, { ...payload, statecode: 0, versionnumber: 1,
          ...(entity === "jm1pub_editorialartifacts" ? { _jm1pub_titleid_value: policy.titleId } : {}) });
        return id;
      }
    } };
  return { policy, deps, rows, title, creates: () => creates, claims: () => claims };
}
test("registration preserves existing title and creates one explicitly unapproved original; replay uses the same ID", async () => {
  const x = fixture(), original = structuredClone(x.title);
  const first = await received.registerReceivedSource(x.policy, x.deps);
  assert.deepEqual(await received.registerReceivedSource(x.policy, x.deps), first);
  assert.equal(first.editorialApproval, false); assert.equal(first.role, "RECEIVED_ORIGINAL");
  assert.equal(x.creates(), 1); assert.equal(x.claims(), 1); assert.deepEqual(x.title, original);
});
test("source metadata requires exact file identity and canonical active Pipeline A-Z custody", () => {
  const policy = received.policies.TIL_DEATH;
  const metadata = { id: policy.itemId, size: policy.bytes, name: "Original.md", file: {}, eTag: "version-1",
    webUrl: "https://jmerrillfoundation.sharepoint.com/sites/publishing/Documents/01_Pipeline_A-Z/02%20-%20Intake/Original.md",
    parentReference: { driveId: received.driveId, id: "parent", path: "/drive/root:/Documents/01_Pipeline_A-Z/02 - Intake" } };
  assert.equal(received.verifySourceMetadata(policy, metadata).sourceETag, "version-1");
  for (const change of [m => m.id = "other", m => m.size++, m => delete m.eTag,
    m => m.webUrl = m.webUrl.replace("01_Pipeline_A-Z", "07_Archive"),
    m => m.parentReference.path = "/drive/root:/07_Archive", m => m.webUrl += "?token=secret",
    m => m.parentReference.driveId = "other"]) {
    const changed = structuredClone(metadata); change(changed);
    assert.throws(() => received.verifySourceMetadata(policy, changed), /LOCATION_INVALID/);
  }
});
test("changed registration checksum or approval status rejects replay without new records", async () => {
  for (const change of [row => row.jm1pub_sha256 = "0".repeat(64), row => row.jm1pub_iscurrentapproved = true,
    row => row._jm1pub_titleid_value = received.policies.MY_AI.titleId]) {
    const x = fixture(); await received.registerReceivedSource(x.policy, x.deps);
    change(x.rows.get(`jm1pub_editorialartifacts:${received.sourceArtifactId(x.policy)}`));
    await assert.rejects(received.registerReceivedSource(x.policy, x.deps), /REGISTRATION_CONFLICT/);
    assert.equal(x.creates(), 1);
  }
});

test("exact founder-completed Intake rename preserves registry and run identity; other locations deny", async () => {
  for (const [policy, oldName, newName] of [
    [received.policies.TIL_DEATH, "JMP-INT-202608-3W6Q6L - Jackie Smith Jr - TIL DEATH DO US PART", "Smith, Jackie - Til Death Do Us Part"],
    [received.policies.MY_AI, "2025-Smith-MyAIJourney", "Smith, Jackie - My AI Journey"]
  ]) {
    const x = fixture(policy);
    const prefix = "https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/01_Pipeline_A-Z/02%20-%20Intake/";
    const historical = `${prefix}${encodeURIComponent(oldName)}/Original.md`;
    let current = historical;
    x.deps.readReceivedSourceProof = async () => ({ repositoryPath: current, originalFileName: "Original.md" });
    await received.registerReceivedSource(policy, x.deps);
    const row = x.rows.get(`jm1pub_editorialartifacts:${received.sourceArtifactId(policy)}`), before = structuredClone(row);
    current = `${prefix}${encodeURIComponent(newName)}/Original.md`;
    assert.equal(await received.verifySourceRegistration(policy, row, x.deps), true);
    assert.deepEqual(row, before); assert.equal(x.creates(), 1);
    for (const wrong of [current.replace("Original.md", "Different.md"), current.replace("01_Pipeline_A-Z", "07_Archive"),
      current.replace("jmerrillfoundation.sharepoint.com", "other.sharepoint.com"), current + "?token=secret",
      `${prefix}Unrelated/Original.md`]) {
      current = wrong;
      await assert.rejects(received.verifySourceRegistration(policy, row, x.deps), /LOCATION_CONFLICT/);
    }
  }
});
test("source proof, strict author and exclusive claim are required before creation", async () => {
  const x = fixture(); x.deps.readReceivedSourceProof = async () => { throw Error("MANIFEST_CHANGED"); };
  await assert.rejects(received.registerReceivedSource(x.policy, x.deps), /MANIFEST_CHANGED/); assert.equal(x.creates(), 0);
  const y = fixture(); y.title.jm1_canonicalauthorcontactreference = "contact:a7801f4d-1d76-f111-ab0f-6045bdd69435";
  await assert.rejects(received.registerReceivedSource(y.policy, y.deps), /TITLE_CHANGED/); assert.equal(y.creates(), 0);
  const z = fixture(); delete z.deps.claim;
  await assert.rejects(received.registerReceivedSource(z.policy, z.deps), /CLAIM_REQUIRED/); assert.equal(z.creates(), 0);
});
test("existing different item registration holds instead of creating a duplicate", async () => {
  const x = fixture(); x.deps.client.list = async () => [{ jm1pub_editorialartifactid: "existing" }];
  await assert.rejects(received.registerReceivedSource(x.policy, x.deps), /EXISTING_ARTIFACT_CONFLICT/); assert.equal(x.creates(), 0);
});
test("new My AI record is explicit creation tied to source UUID, never a guessed existing title", async () => {
  const x = fixture(received.policies.MY_AI); x.rows.clear();
  const result = await received.registerReceivedSource(x.policy, x.deps);
  assert.equal(x.creates(), 2);
  assert.equal(x.rows.get(`jm1pub_titles:${result.titleId}`).jm1_sourceauthority, x.policy.newTitleWorkReference);
  await received.registerReceivedSource(x.policy, x.deps); assert.equal(x.creates(), 2);
  const y = fixture(received.policies.MY_AI); y.rows.clear(); y.deps.client.list = async entity => entity === "jm1pub_titles" ? [{ jm1pub_titleid: "unresolved-existing" }] : [];
  await assert.rejects(received.registerReceivedSource(y.policy, y.deps), /CROSSWALK_REQUIRES_REVIEW/); assert.equal(y.creates(), 0);
});
test("source-item conflict blocks new My AI title creation before any write", async () => {
  const x = fixture(received.policies.MY_AI); x.rows.clear();
  x.deps.client.list = async entity => entity === "jm1pub_editorialartifacts" ? [{ jm1pub_editorialartifactid: "other" }] : [];
  await assert.rejects(received.registerReceivedSource(x.policy, x.deps), /EXISTING_ARTIFACT_CONFLICT/);
  assert.equal(x.creates(), 0);
});
test("ambiguous creation is retried by exact ID and never a second create identity", async () => {
  const x = fixture(), create = x.deps.client.create;
  x.deps.client.create = async (...args) => { await create(...args); throw Object.assign(new Error("timeout"), { status: 504 }); };
  await assert.rejects(received.registerReceivedSource(x.policy, x.deps), /timeout/);
  x.deps.client.create = create; await received.registerReceivedSource(x.policy, x.deps); assert.equal(x.creates(), 1);
});
