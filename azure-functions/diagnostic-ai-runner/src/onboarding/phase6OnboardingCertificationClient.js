"use strict";

const TEST_CLASSIFICATION = "PHASE6_SYNTHETIC_TEST_ONLY";
const ALLOWED_FIELDS = [
  "Command",
  "CanonicalContactId",
  "AuthorName",
  "Email",
  "EngagementId",
  "LifecycleId",
  "TitleId",
  "PolicyVersion",
  "ItemType",
  "Classification",
  "ItemStatus",
  "EvidenceReference",
  "EvidenceChecksum",
  "EvidenceEngagementId",
  "WorkspaceStatus",
  "WorkspacePath",
  "WorkspaceItemId",
  "AccessStatus",
  "PayoutRequired",
  "PayoutStatus",
  "Actor",
  "AuthorityContext",
  "CorrelationId",
  "IdempotencyKey",
  "TestClassification",
  "ExpectedVersion",
];

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function configuration(env = process.env) {
  const resourceUrl = clean(env.JMP_PHASE6_DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  return {
    enabled: clean(env.JMP_PHASE6_CERTIFICATION_ENABLED).toLowerCase() === "true",
    environment: clean(env.JM1_ENVIRONMENT).toUpperCase(),
    resourceUrl,
  };
}

function validateSyntheticRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "INVALID_JSON";
  if (body.TestClassification !== TEST_CLASSIFICATION) return "SYNTHETIC_CLASSIFICATION_REQUIRED";
  if (!clean(body.CorrelationId).startsWith("PHASE6-SYNTHETIC-")) return "SYNTHETIC_CORRELATION_REQUIRED";
  if (!clean(body.IdempotencyKey).startsWith("PHASE6-SYNTHETIC-")) return "SYNTHETIC_IDEMPOTENCY_REQUIRED";
  if (Object.keys(body).some((key) => !ALLOWED_FIELDS.includes(key))) return "UNSUPPORTED_FIELD";
  return null;
}

async function invokePhase6Certification(body, options = {}) {
  const config = configuration(options.env);
  if (!config.enabled || config.environment !== "UAT" || !config.resourceUrl) {
    return { ok: false, status: 503, code: "PHASE6_CERTIFICATION_NOT_ENABLED" };
  }

  const validationError = validateSyntheticRequest(body);
  if (validationError) return { ok: false, status: 400, code: validationError };

  const credential = options.credential || new (require("@azure/identity").DefaultAzureCredential)();
  const token = await credential.getToken(`${config.resourceUrl}/.default`);
  if (!token?.token) return { ok: false, status: 503, code: "DATAVERSE_TOKEN_FAILED" };

  const requestBody = Object.fromEntries(ALLOWED_FIELDS.map((field) => [field, body[field] ?? (field === "ExpectedVersion" ? 0 : "")]));
  const response = await (options.fetch || fetch)(
    `${config.resourceUrl}/api/data/v9.2/jmpv2_ExecuteOnboardingCommand`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
      },
      body: JSON.stringify(requestBody),
    },
  );
  const text = await response.text();
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, status: 502, code: "DATAVERSE_RESPONSE_INVALID" };
  }
  if (!response.ok) return { ok: false, status: 502, code: `DATAVERSE_PHASE6_FAILED:${response.status}` };
  return { ok: true, status: 200, result };
}

module.exports = {
  ALLOWED_FIELDS,
  TEST_CLASSIFICATION,
  configuration,
  invokePhase6Certification,
  validateSyntheticRequest,
};
