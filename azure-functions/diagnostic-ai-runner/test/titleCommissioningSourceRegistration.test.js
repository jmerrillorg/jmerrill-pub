"use strict";
require("node:test")("source registration is imported by the actual Function entry point", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "../src/index.js"), "utf8");
  require("node:assert/strict").match(source, /require\("\.\/functions\/runTitleCommissioningSourceRegistration"\)/);
});
const test = require("node:test"), assert = require("node:assert/strict");
const { sourceRegistrationHandler: handler } = require("../src/lifecycle/titleCommissioningSourceRegistration");
const { policies } = require("../src/lifecycle/titleCommissioningReceivedSources");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contact } = require("../src/author/jackieTitleSystemCommissioningPolicy");
const request = (body, key = "internal-key") => ({ headers: { get: () => key }, json: async () => body });
test("scope and disabled registration reject before any service is accessed", async () => {
  const deps = { env: { JM1_DIAGNOSTIC_RUNNER_KEY: "internal-key" } };
  assert.equal((await handler(request({ mode: "REGISTER_INTAKE", titleId: policies.TIL_DEATH.titleId }), deps)).status, 403);
  assert.equal((await handler(request({ mode: "REGISTER_INTAKE", titleId: "other" }), deps)).status, 400);
  assert.equal((await handler(request({ mode: "REGISTER_INTAKE", titleId: policies.TIL_DEATH.titleId, approved: true }), deps)).status, 400);
  assert.equal((await handler(request({}, "wrong-key"), deps)).status, 401);
  assert.equal((await handler(request({ mode: "RECONCILE_IDENTITY", titleId: "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2" }), deps)).status, 403);
});
test("received-source preflight is read-only and does not access runtime storage", async () => {
  let reads = 0;
  const deps = { env: { JM1_DIAGNOSTIC_RUNNER_KEY: "internal-key" }, readReceivedSourceProof: async () => ({ kind: "TEST_PROOF" }),
    client: { first: async () => { reads++; return { jm1pub_titleid: policies.TIL_DEATH.titleId, statecode: 0,
      jm1_canonicalauthorcontactreference: `contact:${contact}` }; } } };
  const result = await handler(request({ mode: "PREFLIGHT", titleId: policies.TIL_DEATH.titleId }), deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.effects, 0);
  assert.equal(result.jsonBody.editorialApproval, false); assert.equal(reads, 1);
});
test("registration cannot execute while ordinary inference is enabled", async () => {
  const env = { JM1_DIAGNOSTIC_RUNNER_KEY: "internal-key", JM1_TITLE_COMMISSIONING_REGISTRATION_ENABLED: "true",
    JM1_TITLE_COMMISSIONING_REGISTRATION_TITLE_IDS: policies.TIL_DEATH.titleId, JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "true" };
  const result = await handler(request({ mode: "REGISTER_INTAKE", titleId: policies.TIL_DEATH.titleId }), { env });
  assert.equal(result.status, 403); assert.equal(result.jsonBody.code, "COMMISSIONING_REGISTRATION_INFERENCE_MUST_BE_DISABLED");
});
test("invalid or broad registration allowlist cannot authorize execution", async () => {
  for (const ids of ["*", `${policies.TIL_DEATH.titleId},unknown`, `${policies.TIL_DEATH.titleId},${policies.TIL_DEATH.titleId}`]) {
    const result = await handler(request({ mode: "REGISTER_INTAKE", titleId: policies.TIL_DEATH.titleId }), {
      env: { JM1_DIAGNOSTIC_RUNNER_KEY: "internal-key", JM1_TITLE_COMMISSIONING_REGISTRATION_ENABLED: "true",
        JM1_TITLE_COMMISSIONING_REGISTRATION_TITLE_IDS: ids } });
    assert.equal(result.status, 403);
  }
});
