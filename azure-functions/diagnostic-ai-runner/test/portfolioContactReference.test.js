"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePortfolioContactReference, reconcilePortfolioContactReference } = require("../src/mail/portfolioContactReference");
const contact = "d38aa56a-882a-f111-88b4-6045bdd69678", profile = "1f0188ca-71a5-f111-b8de-7c1e525b15c2";
test("simple and composite contact references preserve distinct identity grains", () => {
  assert.equal(parsePortfolioContactReference(`contact:${contact}`).format, "CONTACT_ONLY");
  assert.deepEqual(parsePortfolioContactReference(`contact:${contact}; authorProfile:${profile}`), {
    status: "PARSED", contactId: contact, authorProfileId: profile, format: "CONTACT_WITH_AUTHOR_PROFILE" });
  assert.equal(parsePortfolioContactReference(`CONTACT:${contact.toUpperCase()}; AUTHORPROFILE:${profile}`).contactId, contact);
});
test("malformed, repeated and unrelated suffixes never become contact authority", () => {
  for (const input of [`contact:${contact}; contact:${contact}`, `contact:${contact}; authorProfile:bad`,
    `prefix contact:${contact}`, `contact:${contact}; ignored:true`]) {
    assert.equal(parsePortfolioContactReference(input).status, "UNSUPPORTED_OR_MALFORMED");
  }
  assert.equal(parsePortfolioContactReference("UNRESOLVED").status, "UNRESOLVED");
});
test("composite-only rows resolve contact existence and profile parity without certifying business identity", () => {
  const row = reconcilePortfolioContactReference({ jm1pub_titleid: "title", jm1_canonicalauthorcontactreference: `contact:${contact}; authorProfile:${profile}` },
    [{ contactid: contact, statecode: 0 }], [{ jm1_authorprofileid: profile, _jm1_contact_value: contact }]);
  assert.equal(row.fieldParity, "REFERENCE_ONLY");assert.equal(row.contactBound, true);
  assert.equal(row.explicitProfileParity, "PROFILE_CONTACT_MATCH");assert.deepEqual(row.missingContactIds, []);
  assert.equal(row.businessAuthorIdentityCertified, false);
});
test("lookup conflict and mismatched profile remain explicit even when both contacts exist", () => {
  const other = "26621431-fa9d-f111-b8dc-7c1e525b15c2";
  const row = reconcilePortfolioContactReference({ _jm1_primaryauthor_value: other, jm1_canonicalauthorcontactreference: `contact:${contact}; authorProfile:${profile}` },
    [{ contactid: contact, statecode: 0 }, { contactid: other, statecode: 1 }], [{ jm1_authorprofileid: profile, _jm1_contact_value: other }]);
  assert.equal(row.fieldParity, "DUAL_CONFLICT");assert.equal(row.explicitProfileParity, "PROFILE_CONTACT_CONFLICT");
  assert.deepEqual(row.inactiveContactIds, [other]);
});
