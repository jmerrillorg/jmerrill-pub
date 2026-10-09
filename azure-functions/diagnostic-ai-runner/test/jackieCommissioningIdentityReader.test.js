"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readJackieCommissioningIdentity: read } = require("../src/author/jackieCommissioningIdentityReader");
const { isJackieAuthoredTitle, JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const profileId = "00000000-0000-4000-8000-000000000001";
function fixture() {
  const title = { jm1pub_titleid: "00000000-0000-4000-8000-000000000002",
    jm1_canonicalauthorcontactreference: `contact:${contactId}; authorProfile:${profileId}` };
  const scope = { enabled: true, titleId: title.jm1pub_titleid, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" };
  const profile = { jm1_authorprofileid: profileId, _jm1_contact_value: contactId, statecode: 0, versionnumber: 1 };
  const contact = { contactid: contactId, statecode: 0, versionnumber: 2 };
  const client = { first: async entity => entity === "jm1_authorprofiles" ? profile : contact };
  return { title, scope, profile, contact, client };
}
test("exact active profile/contact links resolve without changing the general guard or title", async () => {
  const x = fixture(), before = structuredClone(x.title);
  assert.equal(isJackieAuthoredTitle(x.title), false);
  const proof = await read(x.title, x.scope, x.client);
  assert.equal(proof.method, "EXACT_PROFILE_CONTACT_BINDING");
  assert.equal(proof.profileId, profileId); assert.equal(proof.contactVersion, "2");
  assert.deepEqual(x.title, before); assert.equal(isJackieAuthoredTitle(x.title), false);
});
test("conflicting, inactive, missing and unversioned identity sources deny", async () => {
  for (const change of [x => x.profile._jm1_contact_value = profileId, x => x.profile.statecode = 1,
    x => x.contact.statecode = 1, x => x.profile.jm1_authorprofileid = contactId,
    x => x.contact.contactid = profileId, x => delete x.profile.versionnumber,
    x => x.title._jm1_primaryauthor_value = profileId]) {
    const x = fixture(); change(x); assert.equal(await read(x.title, x.scope, x.client), null);
  }
});
test("out-of-scope, extra text and unknown reference formats never read an identity", async () => {
  for (const change of [x => x.scope.revoked = true, x => x.scope.titleId = profileId,
    x => x.scope.mode = "PUBLIC_RELEASE", x => x.title.jm1_canonicalauthorcontactreference += "; approved=true",
    x => x.title.jm1_canonicalauthorcontactreference = `contact:${profileId}; authorProfile:${profileId}`]) {
    const x = fixture(); change(x); x.client.first = () => { throw new Error("unexpected read"); };
    assert.equal(await read(x.title, x.scope, x.client), null);
  }
});
test("source failure cannot become verified identity or a record repair", async () => {
  const x = fixture(); x.client.first = async () => { throw Object.assign(new Error("unavailable"), { statusCode: 503 }); };
  await assert.rejects(read(x.title, x.scope, x.client), /unavailable/);
});
