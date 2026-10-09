"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createCoverTitleAuthorityReader, createGovernedCoverTitleAuthorityReader } = require("../src/production/coverTitleAuthorityReader");

const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
function fixture(overrides = {}) {
  const calls = [];
  const title = {
    "@odata.etag": 'W/"57459277"', jm1pub_titleid: titleId,
    jm1pub_titlename: "Before You Were Born", jm1pub_subtitle: "Discovering God's Plan for Your Life",
    jm1pub_authordisplayname: "Sean Arron Crowley",
    jm1_canonicalauthorcontactreference: "contact:d38aa56a-882a-f111-88b4-6045bdd69678",
    "jm1pub_imprint@OData.Community.Display.V1.FormattedValue": "J Merrill Publishing",
    ...overrides.title
  };
  const assets = { value: [
    { "@odata.etag": 'W/"2"', jm1pub_publishingassetid: "24716f8b-f4b0-f111-aaac-00224820105b",
      _jm1pub_titleid_value: titleId, jm1pub_assetformat: 100000000,
      jm1pub_isbn13: "978-1-961475-86-1", jm1pub_iscurrentedition: true },
    { "@odata.etag": 'W/"3"', jm1pub_publishingassetid: "07f99887-f4b0-f111-aaac-6045bdd69678",
      _jm1pub_titleid_value: titleId, jm1pub_assetformat: 100000002,
      jm1pub_isbn13: "978-1-961475-87-8", jm1pub_iscurrentedition: true }
  ], ...overrides.assets };
  const reader = createCoverTitleAuthorityReader({
    apiBase: "https://jm1hq.crm.dynamics.com/api/data/v9.2",
    resourceUrl: "https://jm1hq.crm.dynamics.com",
    credential: { getToken: async () => ({ token: "test-token" }) },
    loadCommissioningScope: async () => ({ enabled: true, revoked: false, titleId,
      mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING", ...overrides.scope }),
    identityClient: overrides.identityClient || { first: async () => ({
      contactid: "d38aa56a-882a-f111-88b4-6045bdd69678", statecode: 0, versionnumber: 3 }) },
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
  assert.equal(values.authorId, "d38aa56a-882a-f111-88b4-6045bdd69678");
  assert.equal(values.authorDisplay, "Sean Arron Crowley");
  assert.equal(values.imprint, "J Merrill Publishing");
  assert.deepEqual(values.isbn, { paperback: "9781961475861", ebook: "9781961475878" });
  assert.equal(values.genre, undefined);
  assert.equal(values.pageCount, undefined);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.headers.Authorization === "Bearer test-token"));
});

test("production reader requires the existing private scope store and native identity client", () => {
  assert.throws(() => createGovernedCoverTitleAuthorityReader(), /COMMISSIONING_SCOPE_STORE_NOT_BOUND/);
  assert.throws(() => createGovernedCoverTitleAuthorityReader({ containerClient: { getBlockBlobClient() {} } }),
    /COVER_IDENTITY_CLIENT_NOT_BOUND/);
});

test("compound reference requires exact active Contact/profile evidence, never a name", async () => {
  const contactId = "d38aa56a-882a-f111-88b4-6045bdd69678";
  const profileId = "1f0188ca-71a5-f111-b8de-7c1e525b15c2";
  const title = { jm1_canonicalauthorcontactreference: `contact:${contactId}; authorProfile:${profileId}` };
  const identityClient = { first: async (entity) => entity === "contacts"
    ? { contactid: contactId, statecode: 0, versionnumber: 3 }
    : { jm1_authorprofileid: profileId, _jm1_contact_value: contactId, statecode: 0, versionnumber: 2 } };
  const candidates = await fixture({ title, identityClient }).reader(titleId);
  assert.equal(candidates.find((row) => row.field === "authorId").value, contactId);
  const denied = fixture({ title, identityClient: { first: async () => null } });
  await assert.rejects(denied.reader(titleId), /COVER_JACKIE_IDENTITY_DENIED/);
  assert.equal(denied.calls.length, 1);
});

test("reader denies non-Jackie, conflicting author, revoked and cross-title scope before edition reads", async () => {
  for (const overrides of [
    { title: { jm1_canonicalauthorcontactreference: `contact:${titleId}` } },
    { title: { _jm1_primaryauthor_value: titleId } },
    { scope: { revoked: true } },
    { scope: { enabled: false } },
    { scope: { titleId: "6bd7e606-cb8d-4aab-a07b-0463536b9869" } },
    { scope: { mode: "PUBLIC_METADATA" } }
  ]) {
    const { reader, calls } = fixture(overrides);
    await assert.rejects(reader(titleId), /COVER_JACKIE_IDENTITY_DENIED/);
    assert.equal(calls.length, 1);
  }
});

test("inactive or missing current Contact denies edition reads", async () => {
  for (const contact of [null, { contactid: "d38aa56a-882a-f111-88b4-6045bdd69678", statecode: 1, versionnumber: 3 }]) {
    const { reader, calls } = fixture({ identityClient: { first: async () => contact } });
    await assert.rejects(reader(titleId), /COVER_CURRENT_CONTACT_UNVERIFIED/);
    assert.equal(calls.length, 1);
  }
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
      _jm1pub_titleid_value: titleId, jm1pub_isbn13: "9781961475861", jm1pub_iscurrentedition: true },
    { "@odata.etag": 'W/"3"', jm1pub_publishingassetid: titleId, jm1pub_assetformat: 100000000,
      _jm1pub_titleid_value: titleId, jm1pub_isbn13: "9781961475862", jm1pub_iscurrentedition: true }
  ] } });
  await assert.rejects(reader(titleId), /COVER_DUPLICATE_CURRENT_IDENTIFIER/);
});

test("reader rejects cross-title and unversioned identifier rows", async () => {
  const wrongTitle = fixture({ assets: { value: [{
    "@odata.etag": 'W/"2"', jm1pub_publishingassetid: "24716f8b-f4b0-f111-aaac-00224820105b",
    _jm1pub_titleid_value: "6bd7e606-cb8d-4aab-a07b-0463536b9869",
    jm1pub_assetformat: 100000000, jm1pub_isbn13: "9781961475861", jm1pub_iscurrentedition: true
  }] } });
  await assert.rejects(wrongTitle.reader(titleId), /COVER_IDENTIFIER_READBACK_UNBOUND/);
  const unversioned = fixture({ assets: { value: [{
    jm1pub_publishingassetid: "24716f8b-f4b0-f111-aaac-00224820105b",
    _jm1pub_titleid_value: titleId, jm1pub_assetformat: 100000000,
    jm1pub_isbn13: "9781961475861", jm1pub_iscurrentedition: true
  }] } });
  await assert.rejects(unversioned.reader(titleId), /COVER_IDENTIFIER_READBACK_UNBOUND/);
});
