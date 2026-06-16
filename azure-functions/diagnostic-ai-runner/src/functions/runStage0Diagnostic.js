const { app } = require("@azure/functions");
const { verifyKnowledgeBlob } = require("../blob/knowledgeReader");

const CONTRACT_TEST_MODE = true;

const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const CORRELATION_ID_PATTERN = /^[0-9a-zA-Z_-]{1,100}$/;
const MAX_FIELD_LENGTH = 200;

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return safeTrim(value).slice(0, MAX_FIELD_LENGTH);
}

function unauthorized() {
  return {
    status: 401,
    jsonBody: {
      status: "error",
      code: "UNAUTHORIZED"
    }
  };
}

function validationError(code, diagnosticId) {
  return {
    status: 400,
    jsonBody: {
      status: "error",
      code,
      diagnosticId: diagnosticId || null
    }
  };
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function validatePayload(payload) {
  const diagnosticId = normalizeText(payload.diagnosticId);
  const intakeReferenceCode = normalizeText(payload.intakeReferenceCode);
  const correlationId = normalizeText(payload.correlationId);

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, code: "INVALID_DIAGNOSTIC_ID", diagnosticId };
  }

  if (!intakeReferenceCode || !REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, code: "INVALID_INTAKE_REFERENCE_CODE", diagnosticId };
  }

  if (correlationId && !CORRELATION_ID_PATTERN.test(correlationId)) {
    return { ok: false, code: "INVALID_CORRELATION_ID", diagnosticId };
  }

  return {
    ok: true,
    value: {
      diagnosticId,
      intakeReferenceCode,
      correlationId: correlationId || null
    }
  };
}

app.http("run-stage0-diagnostic", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-stage0-diagnostic",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Diagnostic runner rejected request: invalid or missing runner key.");
      return unauthorized();
    }

    let body;

    try {
      body = await request.json();
    } catch {
      context.warn("Diagnostic runner rejected request: malformed JSON.");
      return validationError("INVALID_JSON", null);
    }

    const validation = validatePayload(body || {});

    if (!validation.ok) {
      context.warn(`Diagnostic runner validation failed: ${validation.code}; diagnosticId=${validation.diagnosticId}`);
      return validationError(validation.code, validation.diagnosticId);
    }

    const { diagnosticId, intakeReferenceCode, correlationId } = validation.value;

    if (CONTRACT_TEST_MODE) {
      const verifyKnowledge = body.verifyKnowledge === true;

      if (verifyKnowledge) {
        context.info(`Diagnostic runner knowledge-verify requested; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}`);

        const knowledgeMeta = await verifyKnowledgeBlob();

        if (!knowledgeMeta.reachable || !knowledgeMeta.hashMatched) {
          context.warn(
            `knowledge.md verification failed; reachable=${knowledgeMeta.reachable}; hashMatched=${knowledgeMeta.hashMatched}; error=${knowledgeMeta.error || "none"}`
          );
          return {
            status: 503,
            jsonBody: {
              status: "error",
              code: "KNOWLEDGE_VERIFICATION_FAILED",
              diagnosticId,
              knowledge: {
                reachable: knowledgeMeta.reachable,
                hashMatched: knowledgeMeta.hashMatched,
                expectedSha256: knowledgeMeta.expectedSha256,
                error: knowledgeMeta.error
              }
            }
          };
        }

        context.info(
          `knowledge.md verified; diagnosticId=${diagnosticId}; byteLength=${knowledgeMeta.byteLength}; hashMatched=true`
        );

        return {
          status: 202,
          jsonBody: {
            status: "accepted",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            knowledge: {
              reachable: knowledgeMeta.reachable,
              hashMatched: knowledgeMeta.hashMatched,
              calculatedSha256: knowledgeMeta.calculatedSha256,
              expectedSha256: knowledgeMeta.expectedSha256,
              byteLength: knowledgeMeta.byteLength,
              etag: knowledgeMeta.etag,
              lastModified: knowledgeMeta.lastModified
            },
            message: "Diagnostic runner contract accepted. knowledge.md verified. AI execution not enabled."
          }
        };
      }

      context.info(`Diagnostic runner contract-test accepted; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}`);

      return {
        status: 202,
        jsonBody: {
          status: "accepted",
          mode: "contract-test",
          diagnosticId,
          intakeReferenceCode,
          correlationId,
          message: "Diagnostic runner contract accepted. AI execution not enabled."
        }
      };
    }

    // AI execution is not authorized. This path is unreachable while CONTRACT_TEST_MODE is true.
    context.error("Diagnostic runner reached unauthorized AI execution path.");
    return {
      status: 503,
      jsonBody: {
        status: "error",
        code: "AI_EXECUTION_NOT_AUTHORIZED",
        diagnosticId
      }
    };
  }
});
