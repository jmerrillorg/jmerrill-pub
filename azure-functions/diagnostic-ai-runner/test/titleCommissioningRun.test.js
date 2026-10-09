"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { planTitleCommissioningRun: plan, assertCommissioningEffectAllowed: allowed, FORBIDDEN_EFFECTS } = require("../src/lifecycle/titleCommissioningRun");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contact } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const { persistTitleCommissioningPlan: persist } = require("../src/lifecycle/titleCommissioningRun");
const fixture = () => ({ title: { jm1pub_titleid: "00000000-0000-4000-8000-000000000001", _jm1_primaryauthor_value: contact },
  source: { reference: "sharepoint:item:original", version: "1", sha256: "a".repeat(64) }, historyReference: "dataverse:preserved-history", revision: 1 });

test("replay has identical linked execution identity and never claims completion", () => {
  const before = fixture(); const clone = structuredClone(before); const run = plan(before);
  assert.deepEqual(run, plan(clone)); assert.deepEqual(before, clone);
  assert.equal(run.entryStage, "01_INQUIRY"); assert.equal(run.state, "PLANNED_NOT_STARTED");
});
test("durable planning replays after restart without another write", async () => {
  let bytes; let writes = 0;
  const blob = { async uploadData(body, options) {
    assert.equal(options.conditions.ifNoneMatch, "*");
    if (bytes) throw Object.assign(new Error("exists"), { statusCode: 412 });
    bytes = body; writes += 1;
  }, async downloadToBuffer() { return bytes; } };
  const deps = { authorize: async () => true, containerClient: { getBlockBlobClient(name) { assert.match(name, /^commissioning-plans\//); return blob; } } };
  assert.equal((await persist(fixture(), deps)).duplicate, false);
  assert.equal((await persist(fixture(), { ...deps })).duplicate, true);
  assert.equal(writes, 1);
  bytes = Buffer.from("altered");
  await assert.rejects(persist(fixture(), deps), /REPLAY_CONFLICT/);
});
test("live authority, storage binding and dependency failures remain fail closed", async () => {
  await assert.rejects(persist(fixture()), /LIVE_AUTHORITY_NOT_VERIFIED/);
  await assert.rejects(persist(fixture(), { authorize: async () => true }), /STORAGE_NOT_BOUND/);
  await assert.rejects(persist(fixture(), { authorize: async () => true, containerClient: { getBlockBlobClient() {
    return { uploadData: async () => { throw new Error("dependency unavailable"); } };
  } } }), /dependency unavailable/);
});
test("changed source creates a distinct run without modifying existing title", () => {
  const first = fixture(); const second = fixture(); second.source.sha256 = "b".repeat(64);
  assert.notEqual(plan(first).executionId, plan(second).executionId);
});
test("external author, contradictory identity and unproven composite reference remain denied", () => {
  for (const reference of ["contact:00000000-0000-4000-8000-000000000002", `contact:${contact}; authorProfile:unverified`]) {
    const input = fixture(); input.title.jm1_canonicalauthorcontactreference = reference;
    assert.throws(() => plan(input), /JACKIE_AUTHOR_ONLY/);
  }
});
test("unbound originals or historical evidence fail closed", () => {
  for (const mutate of [x => x.source.sha256 = "unknown", x => x.historyReference = "", x => x.revision = 0]) {
    const input = fixture(); mutate(input); assert.throws(() => plan(input), /SOURCE_OR_HISTORY_UNBOUND/);
  }
});
test("retained artifacts require unique exact identities and checksums", () => {
  const input = fixture(); const artifact = { artifactId: "00000000-0000-4000-8000-000000000003", sha256: "c".repeat(64), version: "2", reference: "sharepoint:item:retained" };
  input.retainedArtifacts = [artifact]; assert.equal(plan(input).retainedArtifacts[0].disposition, "PRESERVE_REVALIDATE");
  input.retainedArtifacts.push(artifact); assert.throws(() => plan(input), /RETAINED_ARTIFACTS_INVALID/);
});
test("business effects and unknown effects cannot be authorized by commissioning plan", () => {
  const run = plan(fixture());
  for (const effect of [...FORBIDDEN_EFFECTS, "UNKNOWN", "PAYMENT_PREVIEW_AND_CHARGE"]) assert.throws(() => allowed(run, effect), /EFFECT_NOT_AUTHORIZED/);
  for (const effect of ["INTERNAL_ARTIFACT", "INTERNAL_APPROVAL_WAIT", "READBACK"]) assert.doesNotThrow(() => allowed(run, effect));
});
