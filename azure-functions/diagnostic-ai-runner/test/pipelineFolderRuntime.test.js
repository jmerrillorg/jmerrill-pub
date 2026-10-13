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
