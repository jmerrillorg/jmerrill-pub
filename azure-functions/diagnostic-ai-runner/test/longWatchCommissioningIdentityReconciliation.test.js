"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { titleId, readAuthority, reconcileIdentity } = require("../src/lifecycle/longWatchCommissioningIdentityReconciliation");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../src/author/jackieTitleSystemCommissioningPolicy");
function fixture() {
  const log = { jm1_executionlogid: "2262539a-8f80-f111-ab0e-6045bdd9ab12", jm1_sourcerecordid: titleId,
    jm1_actiontype: "LONGWATCH_CLUSTER_RECONCILIATION_COMPLETED", createdon: "2026-07-15T20:56:10Z",
    jm1_actiondescription: "Long Watch cluster reconciled from Core and SharePoint. Canonical title a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2 and asset 0b30451e-be7b-f111-ab0f-7c1e525b15c2 retained; canonical author contact identified as d38aa56a-882a-f111-88b4-6045bdd69678; admin/test intake rows classified as non-canonical; chosen2k7 intake rows updated with manuscript evidence." };
  const title = { jm1pub_titleid: titleId, statecode: 0, versionnumber: 50731083, "@odata.etag": 'W/"50731083"',
    jm1_canonicalauthorcontactreference: "contact:a7801f4d-1d76-f111-ab0f-6045bdd69435", jm1pub_stage: 100000006,
    _jm1_primaryauthor_value: null, _jm1_author_value: null, jm1_sourceauthority: "PRESERVE_EXISTING" };
  const intake = { jm1_publishingintakeid: "4320d89c-1676-f111-ab0f-6045bdd69435", _jm1_linkedcontact_value: contactId,
    jm1_intakereferencecode: "JMP-INT-202607-6R2MPZ", statecode: 0, versionnumber: 38848491,
    jm1_manuscripturl: "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?sourcedoc=%7BCB4E2C54-68FF-44F9-97D1-FB7A05774CE1%7D" };
  const asset = { jm1pub_publishingassetid: "0b30451e-be7b-f111-ab0f-7c1e525b15c2", _jm1pub_titleid_value: titleId, versionnumber: 38866022 };
  const contact = { contactid: contactId, statecode: 0, versionnumber: 50735216 };
  const source = { jm1pub_editorialartifactid: "e8b7ff2b-1c84-f111-ab0f-6045bdd69678", _jm1pub_titleid_value: titleId,
    jm1pub_repositoryitemid: "01DF3SEQKUFRHMX73I7FCJPUP3PICXOTHB", versionnumber: 39644804,
    jm1pub_sha256: "d4fdcd2515c60d592ff2df0bf116c967777bef4d2eb1d3897fbe88004d42cf1a", statecode: 0, jm1pub_iscurrentapproved: true };
  const entities = { jm1pub_titles: title, jm1_executionlogs: log, jm1_publishingintakes: intake,
    jm1pub_publishingassets: asset, contacts: contact, jm1pub_editorialartifacts: source };
  const saved = new Map(); let patches = 0, leaseActive = false;
  const deps = { verifyArtifactBytes: async () => true,
    client: { first: async entity => structuredClone(entities[entity]), patchIfMatch: async (entity, id, payload, etag) => {
      assert.equal(entity, "jm1pub_titles"); assert.equal(id, titleId); assert.equal(etag, title["@odata.etag"]); assert.equal(leaseActive, true);
      assert.deepEqual(Object.keys(payload), ["jm1_canonicalauthorcontactreference"]);
      patches++; Object.assign(title, payload, { versionnumber: 50731084, "@odata.etag": 'W/"50731084"' });
    } },
    containerClient: { getBlockBlobClient: path => ({
      downloadToBuffer: async () => { if (!saved.has(path)) throw Object.assign(new Error("missing"), { statusCode: 404 }); return saved.get(path); },
      uploadData: async (bytes, options) => { assert.equal(options.conditions.ifNoneMatch, "*"); if (saved.has(path)) throw Object.assign(new Error("exists"), { statusCode: 412 }); saved.set(path, bytes); },
      getBlobLeaseClient: () => ({ acquireLease: async () => { assert.equal(leaseActive, false); leaseActive = true; },
        renewLease: async () => { assert.equal(leaseActive, true); }, releaseLease: async () => { leaseActive = false; } })
    }) } };
  return { deps, title, intake, log, source, saved, patches: () => patches };
}
test("exact authority changes only canonical reference with preserved preimage, conditional write and replay", async () => {
  const x = fixture(); assert.equal((await readAuthority(x.deps)).title.versionnumber, 50731083); assert.equal(x.saved.size, 0);
  const result = await reconcileIdentity(x.deps), again = await reconcileIdentity({ ...x.deps });
  assert.deepEqual(again, result); assert.equal(x.patches(), 1); assert.equal(x.saved.size, 2);
  assert.equal(x.title.jm1pub_stage, 100000006); assert.equal(result.contactsMerged, false);
});
test("changed source IDs, custody, authority or title preimage deny without writes", async () => {
  for (const change of [x => x.title.versionnumber++, x => x.title._jm1_primaryauthor_value = contactId,
    x => x.intake._jm1_linkedcontact_value = "other", x => x.log.jm1_actiondescription += " changed",
    x => x.source.jm1pub_sha256 = "0".repeat(64), x => x.deps.verifyArtifactBytes = async () => false]) {
    const x = fixture(); change(x); await assert.rejects(reconcileIdentity(x.deps), /COMMISSIONING_LONGWATCH_/);
    assert.equal(x.patches(), 0); assert.equal(x.saved.size, 0);
  }
});
test("timeout after successful patch recovers from persisted intent without another patch", async () => {
  const x = fixture(), patch = x.deps.client.patchIfMatch;
  x.deps.client.patchIfMatch = async (...args) => { await patch(...args); throw Error("timeout"); };
  await assert.rejects(reconcileIdentity(x.deps), /timeout/); assert.equal(x.saved.size, 1);
  x.deps.client.patchIfMatch = patch; await reconcileIdentity(x.deps); assert.equal(x.patches(), 1); assert.equal(x.saved.size, 2);
});
test("already corrected state without an attributable audit cannot be claimed as this correction", async () => {
  const x = fixture(); x.title.jm1_canonicalauthorcontactreference = `contact:${contactId}`;
  await assert.rejects(reconcileIdentity(x.deps), /NOT_ATTRIBUTED/); assert.equal(x.saved.size, 0); assert.equal(x.patches(), 0);
});
