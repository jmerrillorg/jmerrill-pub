"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  TEST_CLASSIFICATION,
  invokePhase6Certification,
  validateSyntheticRequest,
} = require("../src/onboarding/phase6OnboardingCertificationClient");

function request(overrides = {}) {
  return {
    Command: "ELIGIBILITY",
    EngagementId: "11111111-1111-1111-1111-111111111111",
    LifecycleId: "22222222-2222-2222-2222-222222222222",
    TitleId: "33333333-3333-3333-3333-333333333333",
    Actor: "phase6-authorized-actor",
    AuthorityContext: "V2_ONBOARDING_AUTHORITY",
    CorrelationId: "PHASE6-SYNTHETIC-correlation",
    IdempotencyKey: "PHASE6-SYNTHETIC-idempotency",
    TestClassification: TEST_CLASSIFICATION,
    ExpectedVersion: 1,
    ...overrides,
  };
}

test("certification request rejects non-synthetic and extended payloads", () => {
  assert.equal(validateSyntheticRequest(request({ TestClassification: "" })), "SYNTHETIC_CLASSIFICATION_REQUIRED");
  assert.equal(validateSyntheticRequest(request({ Extra: "value" })), "UNSUPPORTED_FIELD");
});

test("certification client fails closed outside explicitly enabled UAT", async () => {
  const result = await invokePhase6Certification(request(), { env: {} });
  assert.deepEqual(result, { ok: false, status: 503, code: "PHASE6_CERTIFICATION_NOT_ENABLED" });
});

test("certification client invokes Dataverse with managed-identity token", async () => {
  const calls = [];
  const result = await invokePhase6Certification(request(), {
    env: {
      JM1_ENVIRONMENT: "UAT",
      JMP_PHASE6_CERTIFICATION_ENABLED: "true",
      JMP_PHASE6_DATAVERSE_RESOURCE_URL: "https://jm1test.crm.dynamics.com/",
    },
    credential: { getToken: async (scope) => (calls.push({ scope }), { token: "managed-token" }) },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify({ Accepted: true }) };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0].scope, "https://jm1test.crm.dynamics.com/.default");
  assert.equal(calls[1].url, "https://jm1test.crm.dynamics.com/api/data/v9.2/jmpv2_ExecuteOnboardingCommand");
  assert.equal(calls[1].options.headers.Authorization, "Bearer managed-token");
  assert.equal(JSON.parse(calls[1].options.body).TestClassification, TEST_CLASSIFICATION);
});
