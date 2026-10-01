"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createCoverTitleAuthorityReader } = require("../src/production/coverTitleAuthorityReader");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
function fixture(overrides = {}) {
  const calls = [];
  const title = {
    "@odata.etag": 'W/"57459277"', jm1pub_titleid: titleId,
    jm1pub_titlename: "Before You Were Born", jm1pub_subtitle: "Discovering God's Plan for Your Life",
    jm1pub_authordisplayname: "Sean Arron Crowley",
    jm1_canonicalauthorcontactreference: "contact:dfb397e7-3b7c-f111-ab0f-6045bdd69435",
    "jm1pub_imprint@OData.Community.Display.V1.FormattedValue": "J Merrill Publishing",
    ...overrides.title
  };
  const assets = { value: [
    { "@odata.etag": 'W/"2"', jm1pub_publishingassetid: "24716f8b-f4b0-f111-aaac-00224820105b",
      jm1pub_assetformat: 100000000, jm1pub_isbn13: "978-1-961475-86-1", jm1pub_iscurrentedition: true },
    { "@odata.etag": 'W/"3"', jm1pub_publishingassetid: "07f99887-f4b0-f111-aaac-6045bdd69678",
      jm1pub_assetformat: 100000002, jm1pub_isbn13: "978-1-961475-87-8", jm1pub_iscurrentedition: true }
  ], ...overrides.assets };
  const reader = createCoverTitleAuthorityReader({
    apiBase: "https://jm1hq.crm.dynamics.com/api/data/v9.2",
    resourceUrl: "https://jm1hq.crm.dynamics.com",
    credential: { getToken: async () => ({ token: "test-token" }) },
    ...(overrides.evidence ? { loadInternalCategoryEvidence: async () => overrides.evidence } : {}),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => url.includes("jm1pub_titles") ? title : assets };
    }
  });
  return { reader, calls };
}

test("reader binds live title, canonical author, formatted imprint, and current identifiers", async () => {
  const { reader, calls } = fixture();
  const values = Object.fromEntries((await reader(titleId)).map((item) => [item.field, item.value]));
  assert.equal(values.authorId, "dfb397e7-3b7c-f111-ab0f-6045bdd69435");
  assert.equal(values.authorDisplay, "Sean Arron Crowley");
  assert.equal(values.imprint, "J Merrill Publishing");
  assert.deepEqual(values.isbn, { paperback: "9781961475861", ebook: "9781961475878" });
  assert.equal(values.genre, undefined);
  assert.equal(values.pageCount, undefined);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.headers.Authorization === "Bearer test-token"));
});

test("reader derives internal creative category from title-bound governed evidence", async () => {
  const now = new Date().toISOString();
  const evidence = [{
    titleId, sourceType: "CONTROLLING_MANUSCRIPT", sourceId: "current-interior",
    sourceVersion: "v1", sourceChecksum: "a".repeat(64), current: true, lastVerified: now,
    text: "Christian faith and Scripture inform spiritual encouragement, purpose, and a life of obedience."
  }];
  const { reader } = fixture({ evidence });
  const candidates = await reader(titleId);
  const genre = candidates.find((item) => item.field === "genre");
  assert.equal(genre.value, "Christian Living / Spiritual Growth");
  assert.equal(genre.authorityClass, "SYSTEM_DERIVED_GOVERNED_INTERNAL");
  assert.equal(candidates.find((item) => item.field === "marketContext").value, genre.value);
});

test("reader refuses cross-title data and duplicate current ISBN authority", async () => {
  await assert.rejects(fixture({ title: { jm1pub_titleid: "6bd7e606-cb8d-4aab-a07b-0463536b9869" } }).reader(titleId),
    /COVER_TITLE_READBACK_UNBOUND/);
  const { reader } = fixture({ assets: { value: [
    { "@odata.etag": 'W/"2"', jm1pub_publishingassetid: titleId, jm1pub_assetformat: 100000000,
      jm1pub_isbn13: "9781961475861", jm1pub_iscurrentedition: true },
    { "@odata.etag": 'W/"3"', jm1pub_publishingassetid: titleId, jm1pub_assetformat: 100000000,
      jm1pub_isbn13: "9781961475862", jm1pub_iscurrentedition: true }
  ] } });
  await assert.rejects(reader(titleId), /COVER_DUPLICATE_CURRENT_IDENTIFIER/);
});
