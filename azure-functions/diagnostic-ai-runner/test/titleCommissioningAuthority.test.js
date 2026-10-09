"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readTitleCommissioningAuthority: read } = require("../src/lifecycle/titleCommissioningAuthority");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contact } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const titleId = "00000000-0000-4000-8000-000000000001";
const artifactId = "00000000-0000-4000-8000-000000000002";
function fixture() {
  const title = { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contact };
  const artifact = { jm1pub_editorialartifactid: artifactId, _jm1pub_titleid_value: titleId,
    statecode: 0, versionnumber: 10, jm1pub_sha256: "a".repeat(64), jm1pub_iscurrentapproved: true };
  const scope = { enabled: true, titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", version: "1", controllingSourceArtifactId: artifactId, retainedArtifactIds: [] };
  return { title, artifact, scope, input: { title, source: { reference: `dataverse:jm1pub_editorialartifact:${artifactId}`, version: "10", sha256: artifact.jm1pub_sha256 } },
    deps: { client: { first: async entity => entity === "jm1pub_titles" ? title : artifact }, readScope: async () => scope, verifyArtifactBytes: async () => true } };
}
test("same scope revalidates on retry without new human approval", async () => {
  const x = fixture(); assert.deepEqual(await read(x.input, x.deps), await read(x.input, x.deps));
  assert.equal((await read(x.input, x.deps)).artifacts[0].role, "CONTROLLING_SOURCE");
});
test("revoked scope and changed author fail closed", async () => {
  const x = fixture(); x.scope.revoked = true; await assert.rejects(read(x.input, x.deps), /SCOPE_NOT_CURRENT/);
  delete x.scope.revoked; x.title._jm1_primaryauthor_value = artifactId;
  await assert.rejects(read(x.input, x.deps), /AUTHOR_AUTHORITY_CHANGED/);
});
test("cross-title, stale version, changed checksum and superseded work are denied", async () => {
  for (const change of [a => a._jm1pub_titleid_value = artifactId, a => a.versionnumber++, a => a.jm1pub_sha256 = "b".repeat(64), a => a.jm1pub_supersededon = "2026-10-09T00:00:00Z"]) {
    const x = fixture(); change(x.artifact); await assert.rejects(read(x.input, x.deps), /ARTIFACT_AUTHORITY_CHANGED/);
  }
});
test("approval flag cannot substitute for exact byte custody", async () => {
  const x = fixture(); x.deps.verifyArtifactBytes = async () => false;
  await assert.rejects(read(x.input, x.deps), /BYTES_UNVERIFIED/);
});
test("a current approved artifact cannot silently replace the controlling source role", async () => {
  const x = fixture(); x.scope.controllingSourceArtifactId = titleId;
  await assert.rejects(read(x.input, x.deps), /ARTIFACT_ROLE_SCOPE_MISMATCH/);
});
test("composite source identity is accepted only through live exact Contact/profile proof", async () => {
  const x = fixture(), profileId = "00000000-0000-4000-8000-000000000003";
  x.title.jm1_canonicalauthorcontactreference = `contact:${contact}; authorProfile:${profileId}`;
  const original = x.deps.client.first;
  const profile = { jm1_authorprofileid: profileId, _jm1_contact_value: contact, statecode: 0, versionnumber: 9 };
  x.deps.client.first = async entity => entity === "jm1_authorprofiles" ? profile : entity === "contacts"
    ? { contactid: contact, statecode: 0, versionnumber: 8 } : original(entity);
  const result = await read(x.input, x.deps);
  assert.equal(result.identityProof.profileId, profileId);
  profile._jm1_contact_value = artifactId;
  await assert.rejects(read(x.input, x.deps), /AUTHOR_AUTHORITY_CHANGED/);
});
test("received original requires exact provenance and cannot substitute for approved controlling work", async () => {
  const x = fixture(); x.input.source.role = "RECEIVED_ORIGINAL"; x.scope.sourceRole = "RECEIVED_ORIGINAL";
  x.artifact.jm1pub_iscurrentapproved = false;
  await assert.rejects(read(x.input, x.deps), /PROVENANCE_UNVERIFIED/);
  x.deps.verifyReceivedSource = async () => true;
  assert.equal((await read(x.input, x.deps)).current, true);
  x.input.source.role = "APPROVED_CONTROLLING";
  await assert.rejects(read(x.input, x.deps), /SOURCE_ROLE_MISMATCH/);
  x.scope.sourceRole = "APPROVED_CONTROLLING";
  await assert.rejects(read(x.input, x.deps), /ARTIFACT_AUTHORITY_CHANGED/);
});
test("unapproved or historical retained work is preserved but never becomes controlling authority", async () => {
  const x = fixture(), retainedId = "00000000-0000-4000-8000-000000000003";
  const retained = { ...x.artifact, jm1pub_editorialartifactid: retainedId, jm1pub_iscurrentapproved: false,
    jm1pub_supersededon: "2026-09-01T00:00:00Z" };
  x.scope.retainedArtifactIds = [retainedId];
  x.input.retainedArtifacts = [{ artifactId: retainedId, reference: `dataverse:jm1pub_editorialartifact:${retainedId}`, version: "10", sha256: retained.jm1pub_sha256 }];
  x.deps.client.first = async (entity, query) => entity === "jm1pub_titles" ? x.title : query.$filter.includes(retainedId) ? retained : x.artifact;
  const result = await read(x.input, x.deps);
  assert.equal(result.artifacts[1].role, "RETAINED_WORK");
  x.input.source.reference = `dataverse:jm1pub_editorialartifact:${retainedId}`;
  x.scope.controllingSourceArtifactId = retainedId;
  await assert.rejects(read(x.input, x.deps), /ARTIFACT_AUTHORITY_CHANGED/);
});
