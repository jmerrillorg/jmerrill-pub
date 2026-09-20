"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  PRODUCTION_EVIDENCE_REFERENCE,
  PRODUCTION_TEST_CLASSIFICATION,
  invokePhase6ProductionCertification,
  validateProductionNoEffectRequest,
} = require("../src/onboarding/phase6ProductionCertificationClient");

function request(overrides = {}) {
  return {
    Command: "ELIGIBILITY",
    EngagementId: "11111111-1111-1111-1111-111111111111",
    LifecycleId: "22222222-2222-2222-2222-222222222222",
    TitleId: "33333333-3333-3333-3333-333333333333",
    Actor: "phase6-authorized-actor",
    AuthorityContext: "V2_ONBOARDING_AUTHORITY",
    EvidenceReference: PRODUCTION_EVIDENCE_REFERENCE,
    CorrelationId: "PHASE6-PROD-NOEFFECT-correlation",
    IdempotencyKey: "PHASE6-PROD-NOEFFECT-idempotency",
    TestClassification: PRODUCTION_TEST_CLASSIFICATION,
    ExpectedVersion: 0,
    ...overrides,
  };
}

test("production certification accepts only the bounded no-effect contract", () => {
  assert.equal(validateProductionNoEffectRequest(request()), null);
  assert.equal(validateProductionNoEffectRequest(request({ TestClassification: "PHASE6_SYNTHETIC_TEST_ONLY" })), "PRODUCTION_NO_EFFECT_CLASSIFICATION_REQUIRED");
  assert.equal(validateProductionNoEffectRequest(request({ ExpectedVersion: 1 })), "ZERO_EXPECTED_VERSION_REQUIRED");
  assert.equal(validateProductionNoEffectRequest(request({ Extra: "value" })), "UNSUPPORTED_FIELD");
});

test("production certification fails closed without every production binding", async () => {
  const result = await invokePhase6ProductionCertification(request(), { env: {} });
  assert.deepEqual(result, { ok: false, status: 503, code: "PHASE6_PRODUCTION_CERTIFICATION_NOT_ENABLED" });
});

test("production certification uses the dedicated managed identity", async () => {
  const calls = [];
  const result = await invokePhase6ProductionCertification(request(), {
    env: {
      JM1_ENVIRONMENT: "PRODUCTION",
      JMP_PHASE6_PRODUCTION_CERTIFICATION_ENABLED: "true",
      JMP_PHASE6_PRODUCTION_DATAVERSE_RESOURCE_URL: "https://jm1hq.crm.dynamics.com/",
      JMP_PHASE6_PRODUCTION_MANAGED_IDENTITY_CLIENT_ID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    },
    credential: { getToken: async (scope) => (calls.push({ scope }), { token: "managed-token" }) },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: false, status: 400, text: async () => JSON.stringify({ code: "ENGAGEMENT_NOT_FOUND" }) };
    },
  });
  assert.deepEqual(result, { ok: false, status: 502, code: "ENGAGEMENT_NOT_FOUND" });
  assert.equal(calls[0].scope, "https://jm1hq.crm.dynamics.com/.default");
  assert.equal(calls[1].url, "https://jm1hq.crm.dynamics.com/api/data/v9.2/jmpv2_ExecuteOnboardingCommand");
  assert.equal(calls[1].options.headers.Authorization, "Bearer managed-token");
});
