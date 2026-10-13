"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const runtime = require("../src/lifecycle/pipelineFolderRuntime");
const stage04 = require("../src/lifecycle/publisherFundedStage04");
const b = require("../src/lifecycle/newSubmissionStage03Budget");
const projection = require("../src/lifecycle/pipelineFolderProjection");
test("disabled projection does not read, move, send, or alter stages", async () => {
  assert.deepEqual(await runtime.monitor({ env: {} }), []);
  const result = await runtime.handler({ titleId: Object.keys(projection.FOLDERS)[0], mode: "PIPELINE_FOLDER_RECONCILE" }, { env: {} });
  assert.equal(result.status, 403);
});
test("endpoint rejects extra input and external titles", async () => {
  for (const body of [{ titleId: "external", mode: "PIPELINE_FOLDER_READBACK" },
    { titleId: Object.keys(projection.FOLDERS)[0], mode: "PIPELINE_FOLDER_RECONCILE", targetStage: "06" }]) {
    assert.equal((await runtime.handler(body)).status, 400);
  }
});
test("accepted offer plus unsigned request projects Stage05, never infers execution", async t => {
  t.mock.method(b, "optional", async () => null);
  const titleId = Object.keys(projection.FOLDERS)[0];
  const offer = { titleId, offerSha256: "offer" };
  t.mock.method(stage04, "load", async () => ({ prefix: "stage04", offer, sourceFingerprint: "fresh" }));
  const response = { titleId, offerSha256: "offer", decision: "ACCEPT", status: "AUTHOR_ELECTION_CAPTURED", sourceReference: "actual-reply" };
  const request = { titleId, offerSha256: "offer", authorElectionReference: "actual-reply",
    authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", authorDueCents: 0, paymentCreated: false,
    signatureStatus: "AWAITING_REQUIRED_PARTIES", executionVerified: false, stage05Complete: false, stage06: "NOT_STARTED" };
  t.mock.method(b, "read", async (_container, path) => ({ value: path === "stage04/response.json" ? response : request }));
  const deps = { authorityClient: { list: async () => [] } };
  assert.equal((await runtime.readAuthority(titleId, deps)).stageCode, "05_AGREEMENT_PAYMENT");
  response.decision = "HOLD";
  await assert.rejects(runtime.readAuthority(titleId, deps), /OWNER_AUTHORITY_CONFLICT/);
  response.decision = "ACCEPT"; request.stage05Complete = true;
  await assert.rejects(runtime.readAuthority(titleId, deps), /CURRENT_STAGE_UNPROVEN/);
});
test("legacy later-stage engagement cannot move a fresh submission", async t => {
  t.mock.method(b, "optional", async () => null);
  const titleId = Object.keys(projection.FOLDERS)[0];
  t.mock.method(stage04, "load", async () => ({ prefix: "stage04", offer: { titleId, offerSha256: "offer" }, sourceFingerprint: "fresh" }));
  t.mock.method(b, "read", async (_c, path) => ({ value: path === "stage04/response.json"
    ? { titleId, offerSha256: "offer", decision: "ACCEPT", status: "AUTHOR_ELECTION_CAPTURED", sourceReference: "actual" }
    : { titleId, offerSha256: "offer", authorElectionReference: "actual", authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", authorDueCents: 0, paymentCreated: false } }));
  await assert.rejects(runtime.readAuthority(titleId, { projectionEvent: { stageCode: "16_ARCHIVE" }, authorityClient: { list: async () => [{ jmpv2_currentstage: "16_ARCHIVE", jmpv2_correlationid: "old" }] } }), /FRESH_ENGAGEMENT_BINDING_UNPROVEN/);
});
test("only exact replacement execution can project the fresh title into onboarding", async t => {
  const titleId = Object.keys(projection.FOLDERS)[0];
  const response = { titleId, offerSha256: "offer", decision: "ACCEPT", status: "AUTHOR_ELECTION_CAPTURED", sourceReference: "reply" };
  const request = { titleId, offerSha256: "offer", authorElectionReference: "reply", authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", authorDueCents: 0, paymentCreated: false };
  const execution = { ...request, agreementSha256: "replacement", status: "REPLACEMENT_EXECUTION_VERIFIED", stage05Complete: true,
    proof: { seal: { fullDocumentIntegrity: true }, requiredPartyEvents: 2 } };
  t.mock.method(stage04, "load", async () => ({ prefix: "stage04", offer: { titleId, offerSha256: "offer" } }));
  t.mock.method(b, "optional", async (_c, ref) => ref.endsWith("execution.json") ? { value: execution } : null);
  t.mock.method(b, "read", async (_c, ref) => ({ value: ref === "stage04/response.json" ? response : ref.endsWith("prepared.json") ? { agreementSha256: "replacement" } : request }));
  assert.equal((await runtime.readAuthority(titleId, {})).stageCode, "06_ONBOARDING");
  execution.agreementSha256 = "defective-v1";
  await assert.rejects(runtime.readAuthority(titleId, {}), /OWNER_AUTHORITY_CONFLICT/);
});
test("reference repair changes only an exact moved artifact path and retains its preimage", async t => {
  const titleId = Object.keys(projection.FOLDERS)[0], saved = new Map(); let writes = 0;
  const row = { jm1pub_editorialartifactid: "artifact", _jm1pub_titleid_value: titleId,
    jm1pub_repositorydriveid: require("../src/lifecycle/freshTitleIntake").driveId,
    jm1pub_repositoryitemid: "file", jm1pub_repositorypath: "old-path", "@odata.etag": "version1" };
  t.mock.method(b, "optional", async (_c, path) => saved.has(path) ? { value: saved.get(path) } : null);
  t.mock.method(b, "immutable", async (_c, path, value) => { saved.set(path, value); });
  const client = { list: async () => [row], first: async () => row,
    patchIfMatch: async (set, id, fields, etag) => {
      assert.equal(set, "jm1pub_editorialartifacts"); assert.equal(id, "artifact"); assert.equal(etag, "version1");
      assert.deepEqual(Object.keys(fields), ["jm1pub_repositorypath"]); Object.assign(row, fields); writes++;
    } };
  const receipt = { intentReference: "moves/key/intent.json", items: [{ id: "file", webUrl: "new-path" }] };
  await runtime.reconcileReferences(titleId, receipt, { authorityClient: client });
  await runtime.reconcileReferences(titleId, receipt, { authorityClient: client });
  assert.equal(writes, 1); assert.equal([...saved.values()][0].before, "old-path");
  row.jm1pub_repositorypath = "concurrent-change";
  await assert.rejects(runtime.reconcileReferences(titleId, receipt, { authorityClient: client }), /REFERENCE_CONCURRENT_CHANGE/);
});
