"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { handler, MODE } = require("../src/lifecycle/newSubmissionStage03Preflight");
const titleId = Object.keys(require("../src/lifecycle/freshTitleIntake").POLICIES)[0];
function fixture() {
  const env = { JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" };
  const deps = { env, native: async x => x, stage02Readback: async () => ({ status: 200, jsonBody: { receipt: {
    titleId, status: "COMPLETED", stage03: "NOT_STARTED", outputs: [{ itemId: "first" }, { itemId: "second" }],
  } } }), consumeWorkingSource: async output => ({ text: "private manuscript", provenance: { itemId: output.itemId, words: 2, sourceSha256: "a".repeat(64) } }) };
  return deps;
}
test("native Stage03 preflight consumes separate components without effects or private text", async () => {
  const result = await handler({ titleId, mode: MODE }, fixture());
  assert.equal(result.status, 200); assert.deepEqual(result.jsonBody.components.map(x => x.itemId), ["first", "second"]);
  assert.equal(result.jsonBody.effects, 0); assert.equal(result.jsonBody.stage03, "NOT_STARTED");
  assert.equal(result.jsonBody.stage04, "NOT_STARTED"); assert.equal(result.jsonBody.modelCalls, 0);
  assert.ok(!JSON.stringify(result).includes("private manuscript"));
});
test("Stage03 rejects caller authority and external title", async () => {
  for (const body of [{ titleId: "unbound", mode: MODE }, { titleId, mode: MODE, source: "override" }]) {
    assert.equal((await handler(body, fixture())).status, 400);
  }
});
test("Stage03 requires completed exact Stage02 and disabled broader runtime", async () => {
  const deps = fixture(); deps.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED = "true";
  assert.equal((await handler({ titleId, mode: MODE }, deps)).status, 403);
  deps.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED = "false";
  deps.stage02Readback = async () => ({ status: 200, jsonBody: { receipt: { titleId, status: "PENDING" } } });
  assert.equal((await handler({ titleId, mode: MODE }, deps)).jsonBody.code, "COMMISSIONING_STAGE03_STAGE02_REQUIRED");
});
test("source failure produces bounded evidence without a retry or model effect", async () => {
  const deps = fixture(); deps.consumeWorkingSource = async () => { throw Object.assign(Error("secret"), { safeCode: "STAGE03_SOURCE_HASH_MISMATCH" }); };
  const result = await handler({ titleId, mode: MODE }, deps);
  assert.equal(result.status, 409); assert.equal(result.jsonBody.code, "STAGE03_SOURCE_HASH_MISMATCH");
  assert.equal(result.jsonBody.effects, 0); assert.ok(!JSON.stringify(result).includes("secret"));
});
