const { app } = require("@azure/functions");
const path = require("node:path");
const fs = require("node:fs");
const { verifyKnowledgeBlob } = require("../blob/knowledgeReader");
const { extractManuscript } = require("../extraction/manuscriptExtractor");
const { checkLegacyExclusion, parseLegacyFlag } = require("../preflight/legacyExclusionCheck");
const { validateNoQuotation } = require("../validation/noQuotationValidator");

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
      // Legacy-exclusion pre-flight gate — must run before any manuscript access or AI call.
      // In contract-test mode, legacyFlag is read from the request body.
      // In production, the runner will read jm1_legacyroute from Dataverse before reaching this point.
      const legacyFlag = parseLegacyFlag(body);
      const legacyCheck = checkLegacyExclusion(legacyFlag);

      if (legacyCheck.excluded) {
        context.warn(
          `Legacy-exclusion gate fired; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}; reason=${legacyCheck.reason}`
        );
        return {
          status: 422,
          jsonBody: {
            status: "error",
            code: "LEGACY_EXCLUDED",
            diagnosticId,
            message: "This intake is flagged as Legacy and cannot be processed by the Stage 0 Diagnostic Runner. A separate governed Legacy diagnostic path is required."
          }
        };
      }

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

      const verifyExtraction = body.verifyExtraction === true;
      const syntheticFixture = typeof body.syntheticFixture === "string" ? body.syntheticFixture.toLowerCase() : null;

      if (verifyExtraction) {
        const ALLOWED_FIXTURES = ["txt", "docx"];
        if (!syntheticFixture || !ALLOWED_FIXTURES.includes(syntheticFixture)) {
          context.warn(`Extraction verify rejected: invalid syntheticFixture='${syntheticFixture}'`);
          return validationError("INVALID_SYNTHETIC_FIXTURE", diagnosticId);
        }

        const fixtureName = `synthetic-stage0.${syntheticFixture}`;
        const fixturePath = path.join(__dirname, "..", "..", "test", "fixtures", fixtureName);

        let fileBuffer;
        try {
          fileBuffer = fs.readFileSync(fixturePath);
        } catch {
          context.error(`Extraction verify: fixture not found at ${fixturePath}`);
          return { status: 503, jsonBody: { status: "error", code: "FIXTURE_NOT_FOUND", diagnosticId } };
        }

        const ext = `.${syntheticFixture}`;
        const extractionResult = await extractManuscript(ext, fileBuffer);

        if (!extractionResult.supported) {
          return { status: 503, jsonBody: { status: "error", code: "EXTRACTION_TYPE_NOT_SUPPORTED", diagnosticId, extraction: { supported: false, fileType: ext } } };
        }

        context.info(
          `Extraction verify ok; diagnosticId=${diagnosticId}; fixture=${fixtureName}; byteLength=${extractionResult.byteLength}; wordCount=${extractionResult.wordCount}; charCount=${extractionResult.charCount}; contentReturned=${extractionResult.contentReturned}`
        );

        return {
          status: 202,
          jsonBody: {
            status: "accepted",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            extraction: {
              supported: extractionResult.supported,
              fileType: extractionResult.fileType,
              byteLength: extractionResult.byteLength,
              charCount: extractionResult.charCount,
              wordCount: extractionResult.wordCount,
              lineCount: extractionResult.lineCount,
              sha256: extractionResult.sha256,
              extractionWarnings: extractionResult.extractionWarnings,
              contentReturned: extractionResult.contentReturned
            },
            message: `Diagnostic runner contract accepted. Synthetic ${syntheticFixture.toUpperCase()} extraction verified. AI execution not enabled.`
          }
        };
      }

      const verifyOutputValidation = body.verifyOutputValidation === true;

      if (verifyOutputValidation) {
        const syntheticOutput = body.syntheticOutput;

        if (syntheticOutput == null || typeof syntheticOutput !== "object" || Array.isArray(syntheticOutput)) {
          context.warn(`Output validation rejected: syntheticOutput missing or not an object; diagnosticId=${diagnosticId}`);
          return validationError("INVALID_SYNTHETIC_OUTPUT", diagnosticId);
        }

        const validationResult = validateNoQuotation(syntheticOutput);

        if (!validationResult.valid) {
          context.warn(
            `Output validation failed; diagnosticId=${diagnosticId}; violationCount=${validationResult.violations.length}; fields=${validationResult.fieldsChecked.join(",")}`
          );
          return {
            status: 422,
            jsonBody: {
              status: "error",
              code: "OUTPUT_QUOTATION_VIOLATION",
              diagnosticId,
              validation: {
                valid: false,
                violations: validationResult.violations,
                fieldsChecked: validationResult.fieldsChecked
              },
              message: "Synthetic output failed no-quotation validation. Output must be characterization only."
            }
          };
        }

        context.info(
          `Output validation passed; diagnosticId=${diagnosticId}; fieldsChecked=${validationResult.fieldsChecked.join(",")}`
        );

        return {
          status: 202,
          jsonBody: {
            status: "accepted",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            validation: {
              valid: true,
              violations: [],
              fieldsChecked: validationResult.fieldsChecked
            },
            message: "Diagnostic runner contract accepted. Synthetic output passed no-quotation validation. AI execution not enabled."
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
