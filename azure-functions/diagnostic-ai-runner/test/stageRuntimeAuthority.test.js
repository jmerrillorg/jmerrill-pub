"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readEditorialStageAuthority, readCanonicalStageAuthority, readStageAuthority } = require("../src/lifecycle/stageRuntimeAuthority");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";

function client(overrides = {}) {
  return {
    async first(entitySet) {
      if (entitySet === "contacts") return overrides.contact === null ? null :
        { contactid: "d38aa56a-882a-f111-88b4-6045bdd69678", ...(overrides.contact || {}) };
      return entitySet === "jm1pub_editorialstages"
        ? { jm1pub_editorialstageid: stageId, jm1pub_stagetype: 100000001,
            jm1pub_stagestatus: 100000002, _jm1pub_titleid_value: titleId,
            ...(overrides.stage || {}) }
        : { jm1pub_titleid: titleId, jm1pub_stage: 100000006,
            _jm1_primaryauthor_value: "d38aa56a-882a-f111-88b4-6045bdd69678",
            ...(overrides.title || {}) };
    }
  };
}

test("reads exact live editorial stage/title authority", async () => {
  const result = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" }, client());
  assert.equal(result.current, true);
  assert.equal(result.stageCode, "07_DEVELOPMENTAL_EDITING");
});

test("editorial authority uses the exact contact reference when the primary lookup is absent", async () => {
  const reference = "contact:d38aa56a-882a-f111-88b4-6045bdd69678";
  const event = { titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" };
  const resolved = await readEditorialStageAuthority(event,
    client({ title: { _jm1_primaryauthor_value: null, jm1_canonicalauthorcontactreference: reference } }));
  assert.equal(resolved.current, true);
  assert.equal(resolved.authorId, "d38aa56a-882a-f111-88b4-6045bdd69678");
  const missingContact = await readEditorialStageAuthority(event,
    client({ title: { _jm1_primaryauthor_value: null, jm1_canonicalauthorcontactreference: reference }, contact: null }));
  assert.equal(missingContact.current, false);
});

test("denies cross-title and mismatched stage type", async () => {
  const crossTitle = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ stage: { _jm1pub_titleid_value: "11111111-1111-1111-1111-111111111111" } }));
  assert.equal(crossTitle.current, false);
  const wrongStage = await readEditorialStageAuthority({ titleId, stageId, stageCode: "08_LINE_EDITING" }, client());
  assert.equal(wrongStage.stageCode, "");
  const completed = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ stage: { jm1pub_stagestatus: 100000008 } }));
  assert.equal(completed.current, false);
  const wrongLifecycle = await readEditorialStageAuthority({ titleId, stageId, stageCode: "07_DEVELOPMENTAL_EDITING" },
    client({ title: { jm1pub_stage: 100000007 } }));
  assert.equal(wrongLifecycle.current, false);
});

test("denies unsupported stages until their canonical adapter is commissioned", async () => {
  await assert.rejects(readEditorialStageAuthority({ titleId, stageId, stageCode: "13_PRODUCTION" }, client()),
    /AUTHORITY_ADAPTER_NOT_COMMISSIONED/);
});

const lifecycleId = "11111111-1111-4111-8111-111111111111";
const authorId = "d38aa56a-882a-f111-88b4-6045bdd69678";
const canonicalEvent = { titleId, stageId, stageCode: "13_PRODUCTION" };

function canonicalClient(overrides = {}) {
  const rows = {
    jmpv2_stageinstances: [{ jmpv2_stageinstanceid: stageId, jmpv2_stageinstancekey: "stage-current",
      jmpv2_lifecyclekey: lifecycleId, jmpv2_stagecode: "13_PRODUCTION", jmpv2_status: "OPEN" }],
    jmpv2_stagedefinitions: [{ jmpv2_stagecode: "13_PRODUCTION", jmpv2_isactive: true }],
    jm1pub_titles: [{ jm1pub_titleid: titleId, _jm1_primaryauthor_value: authorId,
      jm1_canonicalauthorcontactreference: `contact:${authorId}` }],
    contacts: [{ contactid: authorId }],
    jmpv2_lifecycleinstances: [{ jmpv2_lifecycleinstanceid: lifecycleId,
      jmpv2_lifecyclekey: lifecycleId, jmpv2_currentstagecode: "13_PRODUCTION",
      jmpv2_currentstageinstancekey: "stage-current" }],
    jmpv2_publishingengagements: [{ jmpv2_canonicaltitleid: titleId,
      jmpv2_canonicalauthorid: authorId, jmpv2_lifecycleinstanceid: lifecycleId,
      jmpv2_currentstage: "13_PRODUCTION" }],
    ...overrides
  };
  return {
    async first(entitySet) { return rows[entitySet]?.[0] || null; },
    async list(entitySet) { return rows[entitySet] || []; }
  };
}

test("canonical stage authority requires exact open stage, lifecycle, title and author", async () => {
  const result = await readStageAuthority(canonicalEvent, canonicalClient());
  assert.equal(result.current, true);
  assert.equal(result.authorId, authorId);
});

test("canonical stage authority uses verified contact reference when title lookup is empty", async () => {
  const title = (await canonicalClient().list("jm1pub_titles"))[0];
  const result = await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jm1pub_titles: [{ ...title, _jm1_primaryauthor_value: null }] }));
  assert.equal(result.current, true);
  assert.equal(result.authorId, authorId);
  const missingContact = await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jm1pub_titles: [{ ...title, _jm1_primaryauthor_value: null }], contacts: [] }));
  assert.equal(missingContact.current, false);
  const mismatch = await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jm1pub_titles: [{ ...title, jm1_canonicalauthorcontactreference:
      "contact:22222222-2222-4222-8222-222222222222" }] }));
  assert.equal(mismatch.current, false);
  const malformed = await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jm1pub_titles: [{ ...title, jm1_canonicalauthorcontactreference: "not-a-contact" }] }));
  assert.equal(malformed.current, false);
});

test("canonical stage authority denies absent and conflicting records", async () => {
  const baseline = canonicalClient();
  for (const [entitySet, mutation] of [
    ["jmpv2_stageinstances", { jmpv2_status: "CLOSED" }],
    ["jmpv2_lifecycleinstances", { jmpv2_currentstageinstancekey: "another-stage" }],
    ["jmpv2_publishingengagements", { jmpv2_canonicaltitleid: "22222222-2222-4222-8222-222222222222" }],
    ["jmpv2_publishingengagements", { jmpv2_canonicalauthorid: "22222222-2222-4222-8222-222222222222" }],
    ["jmpv2_stagedefinitions", { jmpv2_isactive: false }]
  ]) {
    const original = entitySet === "jmpv2_stageinstances"
      ? await baseline.first(entitySet) : (await baseline.list(entitySet))[0];
    const result = await readCanonicalStageAuthority(canonicalEvent,
      canonicalClient({ [entitySet]: [{ ...original, ...mutation }] }));
    assert.equal(result.current, false, entitySet);
  }
  assert.equal((await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jmpv2_publishingengagements: [] }))).current, false);
  assert.equal((await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jmpv2_lifecycleinstances: [
      ...(await baseline.list("jmpv2_lifecycleinstances")),
      ...(await baseline.list("jmpv2_lifecycleinstances"))
    ] }))).current, false);
  assert.equal((await readCanonicalStageAuthority(canonicalEvent,
    canonicalClient({ jmpv2_publishingengagements: [
      ...(await baseline.list("jmpv2_publishingengagements")),
      ...(await baseline.list("jmpv2_publishingengagements"))
    ] }))).current, false);
});

test("stage queue authority rejects non-Jackie, missing, and conflicting author records", async () => {
  const title = (await canonicalClient().list("jm1pub_titles"))[0];
  for (const mutation of [
    { _jm1_primaryauthor_value: "22222222-2222-4222-8222-222222222222", jm1_canonicalauthorcontactreference: "contact:22222222-2222-4222-8222-222222222222" },
    { _jm1_primaryauthor_value: null, jm1_canonicalauthorcontactreference: null },
    { jm1_canonicalauthorcontactreference: "malformed" },
    { jm1_canonicalauthorcontactreference: " " },
    { _jm1_author_value: 42 },
  ]) {
    const result = await readStageAuthority(canonicalEvent,
      canonicalClient({ jm1pub_titles: [{ ...title, ...mutation }] }));
    assert.equal(result.current, false);
  }
});
