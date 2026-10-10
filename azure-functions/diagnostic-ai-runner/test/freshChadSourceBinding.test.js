"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { POLICIES, AUTHORITY, readSource, enabled } = require("../src/lifecycle/freshTitleIntake");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const titleId = "0e127af9-fcb3-5671-a0fa-e4af63c307d1";
const p = POLICIES[titleId];
const reference = `codex:${AUTHORITY.threadId}:message:${AUTHORITY.messageId}`;

test("v003 handoff is exact, distinct from commissioning authority, and remains bounded", () => {
  assert.equal(Object.keys(POLICIES).length, 5);
  assert.equal(p.itemId, "01DF3SEQNJKOYB65P7EZHKLV3FDSPULDHL");
  assert.equal(p.name, "CHAD-AND-ME-manuscript-v003.docx");
  assert.equal(p.bytes, 414642);
  assert.equal(p.sha256, "e03b0a2b6da9b6318352b9724e024713aaf7ffba24f1fd426f9def2fb8540175");
  assert.equal(p.eTag, '"{1FB053A9-FF75-4E26-A5D7-651C9F458CEB},1"');
  assert.equal(p.handoffReference, "codex:01a10bb0-3832-7e03-b3a7-2cc488694143:message:01a12773-117d-7901-b43a-5f4d567d3662");
  assert.notEqual(p.handoffReference, reference);
  for (const [id, policy] of Object.entries(POLICIES)) {
    if (id !== titleId) assert.equal(policy.handoffReference, undefined);
  }
  const env = { JM1_TITLE_COMMISSIONING_FRESH_ENABLED: "true", JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS: titleId,
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" };
  assert.equal(enabled(titleId, env), true);
  assert.equal(enabled(titleId, { ...env, JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS: Object.keys(POLICIES).join(",") }), false);
  assert.equal(enabled(titleId, {}), false);
});

test("older Chad source or changed exact bytes cannot substitute for v003", async () => {
  const driveId = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
  const metadata = { id: p.itemId, name: p.name, size: p.bytes, eTag: p.eTag, file: {},
    parentReference: { driveId, path: `/drives/${driveId}/root:${p.parent}` } };
  const client = { first: async () => ({ jm1pub_titleid: titleId, _jm1_primaryauthor_value: contactId, statecode: 0 }) };
  for (const changed of [{ id: "01DF3SEQO2STECHISMSBCLZD6CDJOHDVYO" }, { name: "CHAD-AND-ME-manuscript-v002.docx" },
    { eTag: '"changed",2' }, { size: p.bytes + 1 }]) {
    await assert.rejects(readSource(titleId, { client, sourceMetadata: async () => ({ ...metadata, ...changed }),
      sourceBytes: () => assert.fail("must reject metadata before byte read") }), /ORIGINAL_CUSTODY_CHANGED/);
  }
  await assert.rejects(readSource(titleId, { client, sourceMetadata: async () => metadata,
    sourceBytes: async () => Buffer.alloc(p.bytes) }), /ORIGINAL_BYTES_CHANGED/);
});
