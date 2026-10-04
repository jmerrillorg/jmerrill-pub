"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("@azure/functions");
const owner = require("../src/editorial/approvedRevisionRuntime");
const { policy } = require("../src/editorial/approvedRevisionAuthority");
const runtime = require("../src/editorial/editorialExecutionRuntime");

test("existing timer route dispatches the fixed task once while the broad author-document safety hold remains", async () => {
  const original = { enabled: owner.enabled, run: owner.runApprovedRevision };
  let calls = 0;
  owner.enabled = () => true;
  owner.runApprovedRevision = async (input, deps) => {
    assert.equal(input.revisionTaskId, policy.taskId); assert.equal(input.executionMode, "EXECUTE");
    assert.ok(deps.client); calls++; return { ok: true, status: "AWAITING_VISUAL_QA" };
  };
  try {
    const client = { list: async () => [], create: async (set) => { assert.equal(set, "jm1_executionlogs"); return "fixture-log"; } };
    const result = await runtime.runEditorialExecutionRuntime({}, { client, stages: [] });
    assert.equal(calls, 1); assert.equal(result.approvedRevision.status, "AWAITING_VISUAL_QA");
    const source = require("node:fs").readFileSync(require.resolve("../src/editorial/editorialExecutionRuntime"), "utf8");
    assert.ok(source.includes("WORD_NATIVE_AUTHOR_DOCUMENT_NOT_COMMISSIONED"));
  } finally { owner.enabled = original.enabled; owner.runApprovedRevision = original.run; }
});

test("existing targeted route requires its key, allows disabled read-only preflight, and reports safe failures", async () => {
  const originalHttp = app.http, originalRun = owner.runApprovedRevision, originalKey = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  let handler, calls = 0;
  app.http = (_name, config) => { handler = config.handler; };
  const modulePath = require.resolve("../src/functions/runTargetedEditorialExecution");
  delete require.cache[modulePath]; require(modulePath);
  app.http = originalHttp;
  process.env.JM1_DIAGNOSTIC_RUNNER_KEY = "synthetic-key";
  const context = { warn() {}, error() {} };
  const request = (key, mode = "DRY_RUN") => ({ headers: { get: () => key }, json: async () => ({ revisionTaskId: policy.taskId, executionMode: mode }) });
  try {
    owner.runApprovedRevision = async (input) => { calls++; assert.equal(input.executionMode, "DRY_RUN"); return { ok: true, status: "DRY_RUN_READY", artifactWrites: 0 }; };
    assert.equal((await handler(request(null), context)).status, 401); assert.equal(calls, 0);
    assert.equal((await handler(request("synthetic-key"), context)).jsonBody.status, "DRY_RUN_READY");
    owner.runApprovedRevision = async () => { throw new Error("sensitive provider response"); };
    const failed = await handler(request("synthetic-key"), context);
    assert.equal(failed.status, 422); assert.equal(failed.jsonBody.code, "REVISION_DEPENDENCY_FAILED");
    assert.equal(JSON.stringify(failed).includes("sensitive"), false);
  } finally {
    owner.runApprovedRevision = originalRun; delete require.cache[modulePath];
    if (originalKey === undefined) delete process.env.JM1_DIAGNOSTIC_RUNNER_KEY; else process.env.JM1_DIAGNOSTIC_RUNNER_KEY = originalKey;
  }
});
