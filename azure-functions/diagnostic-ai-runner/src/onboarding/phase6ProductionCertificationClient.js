"use strict";

const { ALLOWED_FIELDS } = require("./phase6OnboardingCertificationClient");

const PRODUCTION_TEST_CLASSIFICATION = "PHASE6_PRODUCTION_NO_EFFECT";
const PRODUCTION_EVIDENCE_REFERENCE = "JMP-PHASE6-PROD-001";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function configuration(env = process.env) {
  return {
    enabled: clean(env.JMP_PHASE6_PRODUCTION_CERTIFICATION_ENABLED).toLowerCase() === "true",
    environment: clean(env.JM1_ENVIRONMENT).toUpperCase(),
    resourceUrl: clean(env.JMP_PHASE6_PRODUCTION_DATAVERSE_RESOURCE_URL).replace(/\/$/, ""),
    managedIdentityClientId: clean(env.JMP_PHASE6_PRODUCTION_MANAGED_IDENTITY_CLIENT_ID),
  };
}

function validateProductionNoEffectRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "INVALID_JSON";
  if (body.TestClassification !== PRODUCTION_TEST_CLASSIFICATION) return "PRODUCTION_NO_EFFECT_CLASSIFICATION_REQUIRED";
  if (clean(body.EvidenceReference) !== PRODUCTION_EVIDENCE_REFERENCE) return "PRODUCTION_EVIDENCE_REFERENCE_REQUIRED";
  if (!clean(body.CorrelationId).startsWith("PHASE6-PROD-NOEFFECT-")) return "PRODUCTION_CORRELATION_REQUIRED";
  if (!clean(body.IdempotencyKey).startsWith("PHASE6-PROD-NOEFFECT-")) return "PRODUCTION_IDEMPOTENCY_REQUIRED";
  if (body.ExpectedVersion !== 0) return "ZERO_EXPECTED_VERSION_REQUIRED";
  if (Object.keys(body).some((key) => !ALLOWED_FIELDS.includes(key))) return "UNSUPPORTED_FIELD";
  return null;
}

function safeDataverseCode(result, status) {
  const candidate = clean(result?.error?.code || result?.Code || result?.code);
  return candidate && /^[A-Z0-9_:-]{1,120}$/.test(candidate)
    ? candidate
    : `DATAVERSE_PHASE6_FAILED:${status}`;
}

async function invokePhase6ProductionCertification(body, options = {}) {
  const config = configuration(options.env);
  if (
    !config.enabled ||
    config.environment !== "PRODUCTION" ||
    config.resourceUrl !== "https://jm1hq.crm.dynamics.com" ||
    !config.managedIdentityClientId
  ) {
    return { ok: false, status: 503, code: "PHASE6_PRODUCTION_CERTIFICATION_NOT_ENABLED" };
  }

  const validationError = validateProductionNoEffectRequest(body);
  if (validationError) return { ok: false, status: 400, code: validationError };

  const credential = options.credential || new (require("@azure/identity").ManagedIdentityCredential)(config.managedIdentityClientId);
  const token = await credential.getToken(`${config.resourceUrl}/.default`);
  if (!token?.token) return { ok: false, status: 503, code: "DATAVERSE_TOKEN_FAILED" };

  const requestBody = Object.fromEntries(ALLOWED_FIELDS.map((field) => [field, body[field] ?? (field === "ExpectedVersion" ? 0 : "")]));
  const response = await (options.fetch || fetch)(`${config.resourceUrl}/api/data/v9.2/jmpv2_ExecuteOnboardingCommand`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
    },
    body: JSON.stringify(requestBody),
  });
  const text = await response.text();
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, status: 502, code: "DATAVERSE_RESPONSE_INVALID" };
  }
  if (!response.ok) return { ok: false, status: 502, code: safeDataverseCode(result, response.status) };
  return { ok: true, status: 200, result };
}

module.exports = {
  PRODUCTION_EVIDENCE_REFERENCE,
  PRODUCTION_TEST_CLASSIFICATION,
  configuration,
  invokePhase6ProductionCertification,
  validateProductionNoEffectRequest,
};
