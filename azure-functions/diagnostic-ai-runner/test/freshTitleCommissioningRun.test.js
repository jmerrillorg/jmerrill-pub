"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { planFreshTitleRun: plan, assertFreshStageReceipt: verify, persistFreshTitleRun: persist } = require("../src/lifecycle/freshTitleCommissioningRun");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contact } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const fixture = () => ({ title: { jm1pub_titleid: "00000000-0000-4000-8000-000000000001", _jm1_primaryauthor_value: contact },
  source: { reference: "sharepoint:item:exact", version: "1", sha256: "a".repeat(64), role: "RECEIVED_ORIGINAL" },
  historyReference: "dataverse:preserved-history", revision: 2, authorityReference: "founder:fresh-16-stage-scope",
  handoff: { state: "READY", reference: "author:stable-original-handoff" },
  sourceCustody: { driveId: "drive", itemId: "exact", eTag: "etag", bytes: 100,
    path: "/01_Pipeline_A-Z/02 - Intake/exact-title/01_Manuscript/_Original/source.docx", sha256: "a".repeat(64) } });
test("fresh run has sixteen unstarted outcomes and stable identity, never historical completion", () => {
  const input = fixture(), before = structuredClone(input), run = plan(input);
  assert.deepEqual(input, before); assert.deepEqual(run, plan(before));
  assert.equal(run.stages.length, 16); assert.equal(run.executionAuthorized, false);
  assert.equal(run.stages.every(x => x.status === "NOT_STARTED" && x.completedByHistoricalEvidence === false), true);
  const changed = fixture(); changed.sourceCustody.eTag = "changed";
  assert.notEqual(run.runId, plan(changed).runId);
});
test("drafting, non-original custody and unapproved content selection remain denied", () => {
  for (const mutate of [x => x.handoff.state = "DRAFTING", x => x.sourceCustody.path = "/archive/_original/source.docx",
    x => x.source.role = "APPROVED_CONTROLLING", x => x.sourceCustody.sha256 = "b".repeat(64),
    x => x.sourceCustody.path = "/01_Pipeline_A-Z/title/_Original/../wrong.docx"]) {
    const input = fixture(); mutate(input); assert.throws(() => plan(input), /FRESH_RUN_/);
  }
});
test("owner source proof precedes durable create-only fresh run and restart replay", async () => {
  const input = fixture(); let stored, writes = 0;
  const blob = { uploadData: async (body, options) => {
    assert.equal(options.conditions.ifNoneMatch, "*");
    if (stored) throw Object.assign(new Error("exists"), { statusCode: 412 });
    stored = body; writes++;
  }, getProperties: async () => ({ etag: "exact" }), downloadToBuffer: async (_start, _length, options) => {
    assert.equal(options.conditions.ifMatch, "exact"); return stored;
  } };
  const deps = { containerClient: { getBlockBlobClient: () => blob }, readCurrentSourceAuthority: async run => ({
    current: true, titleId: run.titleId, authorityReference: run.authorityReference,
    sourceSha256: run.source.sha256, sourceETag: run.custody.eTag, sourceItemId: run.custody.itemId,
    sourceDriveId: run.custody.driveId, sourceBytes: run.custody.bytes, sourcePath: run.custody.path,
    jackieAuthorshipVerified: true, stableHandoffVerified: true
  }) };
  assert.equal((await persist(input, deps)).duplicate, false);
  assert.equal((await persist(input, { ...deps })).duplicate, true); assert.equal(writes, 1);
  await assert.rejects(persist(input, { ...deps, readCurrentSourceAuthority: async () => ({ current: false }) }), /AUTHORITY_CHANGED/);
  stored = Buffer.from("altered"); await assert.rejects(persist(input, deps), /REPLAY_CONFLICT/);
  assert.equal(writes, 1);
});
test("old, cross-title, cross-source and synthetic receipts cannot close fresh stages", () => {
  const run = plan(fixture()), receipt = { runId: run.runId, titleId: run.titleId, sourceBindingHash: run.bindingHash,
    stageCode: "02_INTAKE", status: "COMPLETED", executionId: "owner:exact", outputReference: "private:output",
    evidenceReference: "private:readback", proofLevel: "PRODUCTION_OWNER_READBACK", historical: false };
  assert.equal(verify(run, receipt), true);
  for (const mutate of [x => x.runId = "old", x => x.titleId = "other", x => x.sourceBindingHash = "other",
    x => x.historical = true, x => x.proofLevel = "SYNTHETIC", x => x.outputReference = ""]) {
    const x = structuredClone(receipt); mutate(x); assert.throws(() => verify(run, x), /EVIDENCE_DENIED/);
  }
});
