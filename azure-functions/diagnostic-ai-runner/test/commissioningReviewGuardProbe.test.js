"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
test("fixed authenticated live guard probe is synthetic and needs no provider, storage or title input", async () => {
  const handler = require("../src/lifecycle/gloryReviewRecoveryRuntime").gloryRecoveryHandler;
  const deps = { env: { JM1_DIAGNOSTIC_RUNNER_KEY: "fixture" } };
  const request = (body, key = "fixture") => ({ headers: new Headers({ "x-jm1-diagnostic-runner-key": key }), json: async () => body });
  const result = await handler(request({ mode: "VERIFY_REVIEW_GUARDS" }), deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.status, "SYNTHETIC_RUNTIME_GUARDS_VERIFIED");
  assert.equal(result.jsonBody.modelInvocationAttempts, 0); assert.equal(result.jsonBody.executionEffects, 0);
  assert.equal((await handler(request({ mode: "VERIFY_REVIEW_GUARDS", titleId: "caller" }), deps)).status, 400);
  assert.equal((await handler(request({ mode: "VERIFY_REVIEW_GUARDS" }, "wrong"), deps)).status, 401);
  const denied = await handler(request({ mode: "EXECUTE_NEXT_ASSESSMENT" }), deps);
  assert.equal(denied.status, 403); assert.equal(denied.jsonBody.modelInvocationAttempts, 0);
});
