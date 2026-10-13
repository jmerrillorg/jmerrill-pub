"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const folder = require("../src/lifecycle/publisherFundedSignedFolder");
const owner = require("../src/lifecycle/publisherFundedStage05");
const stage04 = require("../src/lifecycle/publisherFundedStage04");
const b = require("../src/lifecycle/newSubmissionStage03Budget");
test("disabled signature monitor has no storage, mail, stage or payment effects", async () => {
  assert.deepEqual(await folder.monitor({ env: {} }), []);
});
test("signature scan waits for exact replacement delivery and replays completed evidence", async t => {
  t.mock.method(stage04, "load", async () => ({ offer: { offerSha256: "offer" } }));
  t.mock.method(owner, "readPrepared", async () => ({ agreementSha256: "agreement" }));
  let delivered = null, execution = null;
  t.mock.method(b, "optional", async (_c, path) => ({ value: path.endsWith("admin-delivery.json") ? delivered : execution }));
  assert.equal((await folder.scan("title", {})).status, "WAITING_ADMIN_DELIVERY");
  delivered = { delivered: true, agreementSha256: "wrong" };
  assert.equal((await folder.scan("title", {})).status, "WAITING_ADMIN_DELIVERY");
  delivered.agreementSha256 = "agreement";
  execution = { status: "REPLACEMENT_EXECUTION_VERIFIED", titleId: "title" };
  assert.deepEqual(await folder.scan("title", {}), { ...execution, replay: true });
});
