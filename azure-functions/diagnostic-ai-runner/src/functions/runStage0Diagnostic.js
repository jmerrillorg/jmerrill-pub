const { app } = require("@azure/functions");
const path = require("node:path");
const fs = require("node:fs");
const { verifyKnowledgeBlob } = require("../blob/knowledgeReader");
const { extractManuscript } = require("../extraction/manuscriptExtractor");
const { fetchAndExtractManuscript } = require("../extraction/pilotContentExtractor");
const { readDiagnosticRecord } = require("../dataverse/diagnosticRecordReader");
const { checkLegacyExclusion, parseLegacyFlag } = require("../preflight/legacyExclusionCheck");
const { validateNoQuotation } = require("../validation/noQuotationValidator");
const { validateDiagnosticOutputSchema } = require("../validation/diagnosticOutputSchemaValidator");
const { routeDiagnosticResult } = require("../routing/confidenceRouter");
const { writeMetadata } = require("../dataverse/metadataWriter");
const { checkAiExecutionGate, getGateState } = require("../activation/aiExecutionGate");
const { callModel } = require("../model/modelCaller");
const { resolveProvider } = require("../model/providerRouter");

// CONTRACT_TEST_MODE=false — Jackie Approval 1 granted 2026-06-17.
// Controlled synthetic real-AI test only. No real manuscripts. No production use.
const CONTRACT_TEST_MODE = false;

// Approval 2 — one limited real-manuscript diagnostic pilot.
// Jackie approval granted 2026-06-17 (PR #74). One record only.
// Both diagnosticId AND intakeReferenceCode must match. Either mismatch rejects with 403.
const AUTHORIZED_PILOT_DIAGNOSTIC_ID    = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_PILOT_REFERENCE_CODE   = "JMP-INT-202606-UFYG60";

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

    // Legacy-exclusion pre-flight gate — runs in all modes before any manuscript access or AI call.
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

    // controlledAiTest is reachable in any mode — the dual gate check inside determines
    // whether the model call executes or returns gate-closed state.
    const controlledAiTest = body.controlledAiTest === true;

    if (controlledAiTest) {
      const gate = checkAiExecutionGate(CONTRACT_TEST_MODE);
      const gateState = getGateState(CONTRACT_TEST_MODE);

      context.info(
        `Controlled AI test requested; diagnosticId=${diagnosticId}; gate.permitted=${gate.permitted}; gate.reason=${gate.reason}`
      );

      const providerResolution = resolveProvider();

      if (!gate.permitted) {
        return {
          status: 200,
          jsonBody: {
            status: "gate-closed",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            gate: {
              permitted: false,
              reason: gate.reason,
              contractTestModeActive: gateState.contractTestModeActive,
              aiExecutionEnabled: gateState.aiExecutionEnabled
            },
            provider: {
              configured: providerResolution.ok,
              name: providerResolution.provider || null
            },
            message: `Controlled AI test gate is closed: ${gate.reason}. No model call attempted. No manuscript processed.`
          }
        };
      }

      // Gate is open — run the controlled synthetic AI test.
      const aiFixture = typeof body.syntheticFixture === "string" ? body.syntheticFixture.toLowerCase() : "txt";
      const ALLOWED_AI_FIXTURES = ["txt", "docx"];
      if (!ALLOWED_AI_FIXTURES.includes(aiFixture)) {
        return validationError("INVALID_SYNTHETIC_FIXTURE", diagnosticId);
      }

      // Stage 1: Knowledge verification
      const knowledgeMeta = await verifyKnowledgeBlob();
      if (!knowledgeMeta.reachable || !knowledgeMeta.hashMatched) {
        return {
          status: 503,
          jsonBody: { status: "error", code: "CONTROLLED_AI_KNOWLEDGE_FAILED", diagnosticId, failedStage: "knowledge", knowledge: { reachable: knowledgeMeta.reachable, hashMatched: knowledgeMeta.hashMatched } }
        };
      }

      // Stage 2: Synthetic extraction only — no real manuscript
      const aiFixturePath = path.join(__dirname, "..", "..", "test", "fixtures", `synthetic-stage0.${aiFixture}`);
      let aiFileBuffer;
      try {
        aiFileBuffer = fs.readFileSync(aiFixturePath);
      } catch {
        return { status: 503, jsonBody: { status: "error", code: "CONTROLLED_AI_FIXTURE_NOT_FOUND", diagnosticId, failedStage: "extraction" } };
      }

      const aiExtractionResult = await extractManuscript(`.${aiFixture}`, aiFileBuffer);
      if (!aiExtractionResult.supported) {
        return { status: 503, jsonBody: { status: "error", code: "CONTROLLED_AI_EXTRACTION_UNSUPPORTED", diagnosticId, failedStage: "extraction" } };
      }

      // Stage 3: Build prompt — never returned, never logged, never stored
      const knowledgeContent = knowledgeMeta.content || "";
      const syntheticContentPlaceholder = `[SYNTHETIC FIXTURE: ${aiFixture.toUpperCase()} — ${aiExtractionResult.wordCount} words — contract-test only — not a real manuscript]`;
      const promptKey = process.env.JM1_PROMPT_KEY || "jm1-prompt-pub-stage0-diagnostic";
      const promptVersion = process.env.JM1_PROMPT_VERSION || "PUB-STAGE0-DIAGNOSTIC-V1";

      const promptBody = [
        knowledgeContent,
        "",
        "---",
        "MANUSCRIPT (controlled synthetic fixture only — not a real submission):",
        syntheticContentPlaceholder,
        "---",
        "",
        "Provide a structured Stage 0 Diagnostic in JSON format with keys:",
        "jm1_diagnosticoutputsummary, jm1_diagnosticriskflags, jm1_confidence (0.0-1.0), jm1_requireshumanreview (always true)"
      ].join("\n");

      context.info(
        `Controlled AI test calling model; diagnosticId=${diagnosticId}; fixture=${aiFixture}; promptKey=${promptKey}`
      );

      const requestTimestamp = new Date().toISOString();
      const modelResult = await callModel({
        contractTestMode: CONTRACT_TEST_MODE,
        promptBody,
        diagnosticId,
        promptKey,
        promptVersion
      });
      const responseTimestamp = new Date().toISOString();

      context.info(
        `Model call complete; diagnosticId=${diagnosticId}; ok=${modelResult.ok}; httpStatus=${modelResult.httpStatus}; gateBlocked=${modelResult.gateBlocked}; tokens=${JSON.stringify(modelResult.tokenCounts)}`
      );

      if (!modelResult.ok) {
        const errorCode = modelResult.gateBlocked
          ? `GATE_BLOCKED_${modelResult.gateReason}`
          : (modelResult.error || "MODEL_CALL_FAILED");

        const metadataInputFail = {
          diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
          executionMode: "controlled-ai-test",
          modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
          promptKey, promptVersion,
          confidence: null,
          requiresHumanReview: true,
          tokenCounts: modelResult.tokenCounts,
          requestTimestamp, responseTimestamp,
          errorCode, errorMessage: modelResult.error
        };
        await writeMetadata(metadataInputFail);

        return {
          status: 503,
          jsonBody: {
            status: "error",
            code: errorCode,
            diagnosticId,
            failedStage: "modelCall",
            gate: { permitted: gate.permitted, reason: gate.reason },
            tokens: modelResult.tokenCounts,
            message: "Controlled AI test model call failed. Metadata logged."
          }
        };
      }

      // Stage 4: Output validation — required before routing or logging.
      // Only text output fields are validated; numeric/boolean metadata fields
      // (jm1_confidence, jm1_requireshumanreview) are extracted separately.
      const aiOutput = modelResult.output || {};
      const aiTextFields = {};
      if (typeof aiOutput.jm1_diagnosticoutputsummary === "string") {
        aiTextFields.jm1_diagnosticoutputsummary = aiOutput.jm1_diagnosticoutputsummary;
      }
      if (typeof aiOutput.jm1_diagnosticriskflags === "string") {
        aiTextFields.jm1_diagnosticriskflags = aiOutput.jm1_diagnosticriskflags;
      }
      const aiValidation = validateNoQuotation(aiTextFields);

      if (!aiValidation.valid) {
        context.warn(
          `Controlled AI test output failed no-quotation validation; diagnosticId=${diagnosticId}; violations=${aiValidation.violations.length}`
        );

        const metadataInputViolation = {
          diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
          executionMode: "controlled-ai-test",
          modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
          promptKey, promptVersion,
          confidence: null,
          requiresHumanReview: true,
          tokenCounts: modelResult.tokenCounts,
          requestTimestamp, responseTimestamp,
          errorCode: "OUTPUT_QUOTATION_VIOLATION",
          errorMessage: `${aiValidation.violations.length} violation(s) in model output`
        };
        await writeMetadata(metadataInputViolation);

        return {
          status: 422,
          jsonBody: {
            status: "error",
            code: "CONTROLLED_AI_OUTPUT_QUOTATION_VIOLATION",
            diagnosticId,
            failedStage: "outputValidation",
            validation: { valid: false, violations: aiValidation.violations, fieldsChecked: aiValidation.fieldsChecked },
            tokens: modelResult.tokenCounts,
            message: "Model output failed no-quotation validation. No output forwarded. Metadata logged."
          }
        };
      }

      // Stage 5: Confidence routing
      const confidence = typeof aiOutput.jm1_confidence === "number" ? aiOutput.jm1_confidence : null;
      const aiRoutingDecision = routeDiagnosticResult({ confidence, requiresHumanReview: true });

      // Stage 6: Metadata write — never includes prompt body or model response text
      const metadataInputSuccess = {
        diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
        executionMode: "controlled-ai-test",
        modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
        promptKey, promptVersion,
        confidence,
        requiresHumanReview: true,
        tokenCounts: modelResult.tokenCounts,
        requestTimestamp, responseTimestamp,
        errorCode: null,
        errorMessage: null
      };

      const aiWriteResult = await writeMetadata(metadataInputSuccess);

      context.info(
        `Controlled AI test complete; diagnosticId=${diagnosticId}; routing=${aiRoutingDecision.routingBasis}; aiRequestLog.created=${aiWriteResult.aiRequestLog.created}; executionLog.created=${aiWriteResult.executionLog.created}`
      );

      return {
        status: 202,
        jsonBody: {
          status: "accepted",
          mode: "controlled-ai-test",
          diagnosticId,
          intakeReferenceCode,
          correlationId,
          gate: { permitted: true, reason: gate.reason },
          pipeline: {
            legacyGate: { excluded: false },
            knowledge: { reachable: knowledgeMeta.reachable, hashMatched: knowledgeMeta.hashMatched, byteLength: knowledgeMeta.byteLength },
            extraction: { supported: aiExtractionResult.supported, fileType: aiExtractionResult.fileType, byteLength: aiExtractionResult.byteLength, wordCount: aiExtractionResult.wordCount, contentReturned: aiExtractionResult.contentReturned },
            modelCall: { ok: true, provider: modelResult.provider, httpStatus: modelResult.httpStatus, tokens: modelResult.tokenCounts },
            outputValidation: { valid: true, violations: [], fieldsChecked: aiValidation.fieldsChecked },
            confidenceRouting: { status: aiRoutingDecision.status, statusLabel: aiRoutingDecision.statusLabel, requiresHumanReview: true, lowConfidenceNote: aiRoutingDecision.lowConfidenceNote, routingBasis: aiRoutingDecision.routingBasis },
            metadataWrites: { aiRequestLog: { created: aiWriteResult.aiRequestLog.created, id: aiWriteResult.aiRequestLog.id }, executionLog: { created: aiWriteResult.executionLog.created, id: aiWriteResult.executionLog.id } }
          },
          diagnosticOutput: {
            jm1_diagnosticoutputsummary: aiOutput.jm1_diagnosticoutputsummary || null,
            jm1_diagnosticriskflags: aiOutput.jm1_diagnosticriskflags || null,
            jm1_confidence: confidence,
            jm1_requireshumanreview: true
          },
          requiresHumanReview: true,
          message: "Controlled synthetic real-AI test complete. Output requires Jackie review before any production use. No real manuscript processed. No author-facing action taken."
        }
      };
    }

    // -----------------------------------------------------------------------
    // Real-manuscript pilot path — Approval 2 scope only
    // One authorized record: 64e387e0-7e6a-f111-a826-00224820105b
    // JM1_AI_EXECUTION_ENABLED must be true when Jackie re-opens the gate for PR #76 execution.
    // -----------------------------------------------------------------------
    const realManuscriptPilot = body.realManuscriptPilot === true;

    if (realManuscriptPilot) {
      // Pilot authorization guard — both diagnosticId AND intakeReferenceCode must match.
      // Either mismatch is a hard stop.
      const idMatch  = diagnosticId.toLowerCase()       === AUTHORIZED_PILOT_DIAGNOSTIC_ID;
      const refMatch = intakeReferenceCode.toUpperCase() === AUTHORIZED_PILOT_REFERENCE_CODE;

      if (!idMatch || !refMatch) {
        context.error(
          `Real manuscript pilot blocked: idMatch=${idMatch}; refMatch=${refMatch}; diagnosticId=${diagnosticId}; intakeReferenceCode=${intakeReferenceCode}`
        );
        return {
          status: 403,
          jsonBody: {
            status: "error",
            code: "PILOT_RECORD_NOT_AUTHORIZED",
            diagnosticId,
            message: `This record is not authorized for the limited real-manuscript pilot. Authorized: diagnosticId=${AUTHORIZED_PILOT_DIAGNOSTIC_ID}, intakeReferenceCode=${AUTHORIZED_PILOT_REFERENCE_CODE}.`
          }
        };
      }

      // Gate check — JM1_AI_EXECUTION_ENABLED must be true
      const gate = checkAiExecutionGate(CONTRACT_TEST_MODE);
      if (!gate.permitted) {
        context.warn(
          `Real manuscript pilot gate closed; diagnosticId=${diagnosticId}; reason=${gate.reason}`
        );
        return {
          status: 200,
          jsonBody: {
            status: "gate-closed",
            mode: "real-manuscript-pilot",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            gate: {
              permitted: false,
              reason: gate.reason,
              contractTestModeActive: getGateState(CONTRACT_TEST_MODE).contractTestModeActive,
              aiExecutionEnabled: getGateState(CONTRACT_TEST_MODE).aiExecutionEnabled
            },
            message: `Real manuscript pilot gate is closed: ${gate.reason}. No manuscript accessed. No model call attempted.`
          }
        };
      }

      context.info(
        `Real manuscript pilot authorized; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}`
      );

      // Stage 1: Knowledge verification
      const knowledgeMeta = await verifyKnowledgeBlob();
      if (!knowledgeMeta.reachable || !knowledgeMeta.hashMatched) {
        context.error(
          `Real manuscript pilot failed at knowledge stage; reachable=${knowledgeMeta.reachable}; hashMatched=${knowledgeMeta.hashMatched}`
        );
        return {
          status: 503,
          jsonBody: {
            status: "error",
            code: "PILOT_KNOWLEDGE_FAILED",
            diagnosticId,
            failedStage: "knowledge",
            knowledge: { reachable: knowledgeMeta.reachable, hashMatched: knowledgeMeta.hashMatched }
          }
        };
      }

      context.info(`Pilot stage 1 knowledge OK; diagnosticId=${diagnosticId}`);

      // Stage 2: Read Dataverse record — get manuscript URL (not logged)
      const recordResult = await readDiagnosticRecord(diagnosticId);
      if (!recordResult.ok) {
        context.error(
          `Real manuscript pilot failed at record read stage; diagnosticId=${diagnosticId}; code=${recordResult.code}; approvedForDiagnostic=${recordResult.assetGate.approvedForDiagnostic}; assetStatus=${recordResult.assetGate.assetStatus}`
        );
        return {
          status: 503,
          jsonBody: {
            status: "error",
            code: `PILOT_RECORD_READ_FAILED:${recordResult.code}`,
            diagnosticId,
            failedStage: "dataverseRead",
            assetGate: recordResult.assetGate
          }
        };
      }

      context.info(
        `Pilot stage 2 record read OK; diagnosticId=${diagnosticId}; assetStatus=${recordResult.assetGate.assetStatus}; filename=${recordResult.assetGate.filename}; fileTypeHint=${recordResult.assetGate.fileTypeHint}`
      );

      // Stage 3: Download + extract manuscript in memory (content not logged)
      const extractResult = await fetchAndExtractManuscript(
        recordResult.manuscriptUrl,
        { fileTypeHint: recordResult.assetGate.fileTypeHint }
      );
      if (!extractResult.ok) {
        context.error(
          `Real manuscript pilot failed at extraction stage; diagnosticId=${diagnosticId}; code=${extractResult.code}`
        );
        return {
          status: 503,
          jsonBody: {
            status: "error",
            code: `PILOT_EXTRACTION_FAILED:${extractResult.code}`,
            diagnosticId,
            failedStage: "extraction",
            extraction: extractResult.metadata
          }
        };
      }

      context.info(
        `Pilot stage 3 extraction OK; diagnosticId=${diagnosticId}; fileType=${extractResult.metadata.fileType}; wordCount=${extractResult.metadata.wordCount}`
      );

      // Stage 4: Build prompt — content and promptBody never logged, never stored, never returned
      const knowledgeContent = knowledgeMeta.content || "";
      const promptKey = process.env.JM1_PROMPT_KEY || "jm1-prompt-pub-stage0-diagnostic";
      const promptVersion = process.env.JM1_PROMPT_VERSION || "PUB-STAGE0-DIAGNOSTIC-V1";

      const promptBody = [
        knowledgeContent,
        "",
        "---",
        "MANUSCRIPT (authorized pilot record — real submission for diagnostic review only):",
        extractResult.content,
        "---",
        "",
        "Call the submit_stage0_diagnostic tool with your complete assessment.",
        "You MUST populate ALL FOUR fields before calling the tool. Do not call the tool with any field missing.",
        "",
        "Field requirements:",
        "  jm1_diagnosticoutputsummary (string, required) — characterization-only diagnostic summary, 2–4 sentences.",
        "  jm1_diagnosticriskflags (string, required) — characterization-only risk flag summary, 1–3 sentences. If none, state that explicitly.",
        "  jm1_confidence (number, required) — your confidence as a decimal between 0.0 and 1.0. Must be a number, not a string.",
        "  jm1_requireshumanreview (boolean, required) — must be true.",
        "",
        "ALL string fields: characterization only. No manuscript excerpts. No quoted prose. No verbatim author text."
      ].join("\n");

      // Clear content reference — no longer needed after prompt construction
      extractResult.content = null;

      context.info(
        `Pilot stage 4 prompt built; diagnosticId=${diagnosticId}; promptKey=${promptKey}`
      );

      // Stage 5: Model call
      const requestTimestamp = new Date().toISOString();
      const modelResult = await callModel({
        contractTestMode: CONTRACT_TEST_MODE,
        promptBody,
        diagnosticId,
        promptKey,
        promptVersion
      });
      const responseTimestamp = new Date().toISOString();

      context.info(
        `Pilot stage 5 model call complete; diagnosticId=${diagnosticId}; ok=${modelResult.ok}; httpStatus=${modelResult.httpStatus}; tokens=${JSON.stringify(modelResult.tokenCounts)}`
      );

      if (!modelResult.ok) {
        const errorCode = modelResult.gateBlocked
          ? `GATE_BLOCKED_${modelResult.gateReason}`
          : (modelResult.error || "MODEL_CALL_FAILED");

        const metadataFail = {
          diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
          executionMode: "real-manuscript-pilot",
          modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
          promptKey, promptVersion,
          confidence: null,
          requiresHumanReview: true,
          tokenCounts: modelResult.tokenCounts,
          requestTimestamp, responseTimestamp,
          errorCode, errorMessage: modelResult.error
        };
        await writeMetadata(metadataFail);

        return {
          status: 503,
          jsonBody: {
            status: "error",
            code: errorCode,
            diagnosticId,
            failedStage: "modelCall",
            gate: { permitted: gate.permitted, reason: gate.reason },
            tokens: modelResult.tokenCounts,
            message: "Real manuscript pilot model call failed. Metadata logged."
          }
        };
      }

      // Stage 6a: Schema validation — required fields and types must be present before any downstream use
      const aiOutput = modelResult.output || {};
      const schemaResult = validateDiagnosticOutputSchema(aiOutput);
      if (!schemaResult.valid) {
        context.error(
          `Real manuscript pilot output failed schema validation; diagnosticId=${diagnosticId}; errors=${schemaResult.errors.join("; ")}`
        );

        const metadataSchema = {
          diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
          executionMode: "real-manuscript-pilot",
          modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
          promptKey, promptVersion,
          confidence: null,
          requiresHumanReview: true,
          tokenCounts: modelResult.tokenCounts,
          requestTimestamp, responseTimestamp,
          errorCode: "PILOT_OUTPUT_SCHEMA_INVALID",
          errorMessage: schemaResult.errors.join("; ")
        };
        await writeMetadata(metadataSchema);

        return {
          status: 422,
          jsonBody: {
            status: "error",
            code: "PILOT_OUTPUT_SCHEMA_INVALID",
            diagnosticId,
            failedStage: "schemaValidation",
            schemaErrors: schemaResult.errors,
            tokens: modelResult.tokenCounts,
            message: "Real manuscript pilot output failed schema validation. No output forwarded. Metadata logged."
          }
        };
      }

      // Stage 6b: Output validation — no-quotation rule required
      const aiTextFields = {};
      if (typeof aiOutput.jm1_diagnosticoutputsummary === "string") {
        aiTextFields.jm1_diagnosticoutputsummary = aiOutput.jm1_diagnosticoutputsummary;
      }
      if (typeof aiOutput.jm1_diagnosticriskflags === "string") {
        aiTextFields.jm1_diagnosticriskflags = aiOutput.jm1_diagnosticriskflags;
      }
      const aiValidation = validateNoQuotation(aiTextFields);

      if (!aiValidation.valid) {
        context.warn(
          `Real manuscript pilot output failed no-quotation validation; diagnosticId=${diagnosticId}; violations=${aiValidation.violations.length}`
        );

        const metadataViolation = {
          diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
          executionMode: "real-manuscript-pilot",
          modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
          promptKey, promptVersion,
          confidence: null,
          requiresHumanReview: true,
          tokenCounts: modelResult.tokenCounts,
          requestTimestamp, responseTimestamp,
          errorCode: "OUTPUT_QUOTATION_VIOLATION",
          errorMessage: `${aiValidation.violations.length} violation(s) in model output`
        };
        await writeMetadata(metadataViolation);

        return {
          status: 422,
          jsonBody: {
            status: "error",
            code: "PILOT_OUTPUT_QUOTATION_VIOLATION",
            diagnosticId,
            failedStage: "outputValidation",
            validation: { valid: false, violations: aiValidation.violations, fieldsChecked: aiValidation.fieldsChecked },
            tokens: modelResult.tokenCounts,
            message: "Real manuscript pilot output failed no-quotation validation. No output forwarded. Metadata logged."
          }
        };
      }

      // Stage 7: Confidence routing
      const confidence = typeof aiOutput.jm1_confidence === "number" ? aiOutput.jm1_confidence : null;
      const routingDecision = routeDiagnosticResult({ confidence, requiresHumanReview: true });

      // Stage 8: Metadata write — never includes manuscript text, prompt body, or model response text
      const metadataSuccess = {
        diagnosticId, intakeReferenceCode, correlationId: correlationId || null,
        executionMode: "real-manuscript-pilot",
        modelDeploymentAlias: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "unknown",
        promptKey, promptVersion,
        confidence,
        requiresHumanReview: true,
        tokenCounts: modelResult.tokenCounts,
        requestTimestamp, responseTimestamp,
        errorCode: null,
        errorMessage: null
      };

      const writeResult = await writeMetadata(metadataSuccess);

      context.info(
        `Pilot stage 8 metadata writes; diagnosticId=${diagnosticId}; aiRequestLog.created=${writeResult.aiRequestLog.created}; executionLog.created=${writeResult.executionLog.created}; routing=${routingDecision.routingBasis}`
      );

      return {
        status: 202,
        jsonBody: {
          status: "accepted",
          mode: "real-manuscript-pilot",
          diagnosticId,
          intakeReferenceCode,
          correlationId,
          gate: { permitted: true, reason: gate.reason },
          pipeline: {
            legacyGate: { excluded: false },
            knowledge: { reachable: knowledgeMeta.reachable, hashMatched: knowledgeMeta.hashMatched, byteLength: knowledgeMeta.byteLength },
            assetGate: {
              approvedForDiagnostic: recordResult.assetGate.approvedForDiagnostic,
              assetStatus: recordResult.assetGate.assetStatus,
              filename: recordResult.assetGate.filename,
              fileTypeHint: recordResult.assetGate.fileTypeHint
            },
            manuscriptRead: {
              ok: true,
              fileType: extractResult.metadata.fileType,
              byteLength: extractResult.metadata.byteLength,
              wordCount: extractResult.metadata.wordCount,
              sha256: extractResult.metadata.sha256,
              contentReturned: false
            },
            modelCall: { ok: true, provider: modelResult.provider, httpStatus: modelResult.httpStatus, tokens: modelResult.tokenCounts },
            outputValidation: { valid: true, violations: [], fieldsChecked: aiValidation.fieldsChecked },
            confidenceRouting: { status: routingDecision.status, statusLabel: routingDecision.statusLabel, requiresHumanReview: true, lowConfidenceNote: routingDecision.lowConfidenceNote, routingBasis: routingDecision.routingBasis },
            metadataWrites: { aiRequestLog: { created: writeResult.aiRequestLog.created, id: writeResult.aiRequestLog.id }, executionLog: { created: writeResult.executionLog.created, id: writeResult.executionLog.id } }
          },
          diagnosticOutput: {
            jm1_diagnosticoutputsummary: aiOutput.jm1_diagnosticoutputsummary || null,
            jm1_diagnosticriskflags: aiOutput.jm1_diagnosticriskflags || null,
            jm1_confidence: confidence,
            jm1_requireshumanreview: true
          },
          requiresHumanReview: true,
          message: "Real manuscript pilot diagnostic complete. Output is for Jackie internal review only. No author-facing action taken. No Opportunity created. No email sent."
        }
      };
    }

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

      const verifyConfidenceRouting = body.verifyConfidenceRouting === true;

      if (verifyConfidenceRouting) {
        const syntheticResult = body.syntheticResult;

        if (syntheticResult == null || typeof syntheticResult !== "object" || Array.isArray(syntheticResult)) {
          context.warn(`Confidence routing verify rejected: syntheticResult missing or not an object; diagnosticId=${diagnosticId}`);
          return validationError("INVALID_SYNTHETIC_RESULT", diagnosticId);
        }

        const routingDecision = routeDiagnosticResult(syntheticResult);

        context.info(
          `Confidence routing verified; diagnosticId=${diagnosticId}; basis=${routingDecision.routingBasis}; status=${routingDecision.status}; statusLabel=${routingDecision.statusLabel}`
        );

        return {
          status: 202,
          jsonBody: {
            status: "accepted",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            routing: {
              status: routingDecision.status,
              statusLabel: routingDecision.statusLabel,
              requiresHumanReview: routingDecision.requiresHumanReview,
              lowConfidenceNote: routingDecision.lowConfidenceNote,
              routingBasis: routingDecision.routingBasis,
              error: routingDecision.error
            },
            message: `Diagnostic runner contract accepted. Confidence routing verified: ${routingDecision.statusLabel} (${routingDecision.routingBasis}). No Dataverse write. AI execution not enabled.`
          }
        };
      }

      const verifyFullPipeline = body.verifyFullPipeline === true;

      if (verifyFullPipeline) {
        const e2eFixture = typeof body.syntheticFixture === "string" ? body.syntheticFixture.toLowerCase() : "docx";
        const e2eSyntheticOutput = body.syntheticOutput;
        const e2eSyntheticResult = body.syntheticResult || {};

        context.info(
          `Synthetic E2E pipeline requested; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}; fixture=${e2eFixture}`
        );

        // Stage 1: Knowledge verification
        const knowledgeMeta = await verifyKnowledgeBlob();
        if (!knowledgeMeta.reachable || !knowledgeMeta.hashMatched) {
          context.warn(
            `E2E pipeline failed at knowledge stage; reachable=${knowledgeMeta.reachable}; hashMatched=${knowledgeMeta.hashMatched}`
          );
          return {
            status: 503,
            jsonBody: {
              status: "error",
              code: "E2E_KNOWLEDGE_FAILED",
              diagnosticId,
              failedStage: "knowledge",
              knowledge: {
                reachable: knowledgeMeta.reachable,
                hashMatched: knowledgeMeta.hashMatched,
                error: knowledgeMeta.error
              }
            }
          };
        }

        context.info(`E2E stage 1 knowledge OK; diagnosticId=${diagnosticId}`);

        // Stage 2: Extraction
        const ALLOWED_E2E_FIXTURES = ["txt", "docx"];
        if (!ALLOWED_E2E_FIXTURES.includes(e2eFixture)) {
          return validationError("INVALID_SYNTHETIC_FIXTURE", diagnosticId);
        }

        const fixturePath = path.join(__dirname, "..", "..", "test", "fixtures", `synthetic-stage0.${e2eFixture}`);
        let fileBuffer;
        try {
          fileBuffer = fs.readFileSync(fixturePath);
        } catch {
          return { status: 503, jsonBody: { status: "error", code: "E2E_FIXTURE_NOT_FOUND", diagnosticId, failedStage: "extraction" } };
        }

        const extractionResult = await extractManuscript(`.${e2eFixture}`, fileBuffer);
        if (!extractionResult.supported) {
          return { status: 503, jsonBody: { status: "error", code: "E2E_EXTRACTION_UNSUPPORTED", diagnosticId, failedStage: "extraction" } };
        }

        context.info(
          `E2E stage 2 extraction OK; diagnosticId=${diagnosticId}; fixture=synthetic-stage0.${e2eFixture}; wordCount=${extractionResult.wordCount}; contentReturned=${extractionResult.contentReturned}`
        );

        // Stage 3: Output validation
        if (e2eSyntheticOutput == null || typeof e2eSyntheticOutput !== "object" || Array.isArray(e2eSyntheticOutput)) {
          return validationError("INVALID_SYNTHETIC_OUTPUT", diagnosticId);
        }

        const validationResult = validateNoQuotation(e2eSyntheticOutput);
        if (!validationResult.valid) {
          context.warn(
            `E2E pipeline failed at output validation; diagnosticId=${diagnosticId}; violationCount=${validationResult.violations.length}`
          );
          return {
            status: 422,
            jsonBody: {
              status: "error",
              code: "E2E_OUTPUT_VALIDATION_FAILED",
              diagnosticId,
              failedStage: "outputValidation",
              validation: { valid: false, violations: validationResult.violations, fieldsChecked: validationResult.fieldsChecked }
            }
          };
        }

        context.info(`E2E stage 3 output validation OK; diagnosticId=${diagnosticId}; fieldsChecked=${validationResult.fieldsChecked.join(",")}`);

        // Stage 4: Confidence routing
        const routingDecision = routeDiagnosticResult(e2eSyntheticResult);

        context.info(
          `E2E stage 4 confidence routing OK; diagnosticId=${diagnosticId}; basis=${routingDecision.routingBasis}; status=${routingDecision.status}`
        );

        // Stage 5: Metadata writes
        const now = new Date().toISOString();
        const e2eMetadataInput = {
          diagnosticId,
          intakeReferenceCode,
          correlationId: correlationId || null,
          executionMode: "contract-test-e2e",
          modelDeploymentAlias: "jm1-pub-diagnostic-safe-test",
          promptKey: "jm1-prompt-pub-stage0-diagnostic",
          promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
          confidence: typeof e2eSyntheticResult.confidence === "number" ? e2eSyntheticResult.confidence : null,
          requiresHumanReview: routingDecision.requiresHumanReview,
          tokenCounts: { input: 0, output: 0, total: 0 },
          requestTimestamp: now,
          responseTimestamp: now,
          errorCode: routingDecision.routingBasis === "TECHNICAL_FAILURE" || routingDecision.routingBasis === "INVALID_CONFIDENCE" ? routingDecision.routingBasis : null,
          errorMessage: routingDecision.error || null
        };

        const writeResult = await writeMetadata(e2eMetadataInput);

        context.info(
          `E2E stage 5 metadata writes; diagnosticId=${diagnosticId}; aiRequestLog.created=${writeResult.aiRequestLog.created}; executionLog.created=${writeResult.executionLog.created}`
        );

        const allStagesPassed = writeResult.aiRequestLog.created && writeResult.executionLog.created;

        return {
          status: allStagesPassed ? 202 : 207,
          jsonBody: {
            status: allStagesPassed ? "accepted" : "partial",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            pipeline: {
              legacyGate: { excluded: false },
              knowledge: {
                reachable: knowledgeMeta.reachable,
                hashMatched: knowledgeMeta.hashMatched,
                byteLength: knowledgeMeta.byteLength,
                etag: knowledgeMeta.etag
              },
              extraction: {
                supported: extractionResult.supported,
                fileType: extractionResult.fileType,
                byteLength: extractionResult.byteLength,
                wordCount: extractionResult.wordCount,
                charCount: extractionResult.charCount,
                sha256: extractionResult.sha256,
                contentReturned: extractionResult.contentReturned
              },
              outputValidation: {
                valid: validationResult.valid,
                violations: validationResult.violations,
                fieldsChecked: validationResult.fieldsChecked
              },
              confidenceRouting: {
                status: routingDecision.status,
                statusLabel: routingDecision.statusLabel,
                requiresHumanReview: routingDecision.requiresHumanReview,
                lowConfidenceNote: routingDecision.lowConfidenceNote,
                routingBasis: routingDecision.routingBasis
              },
              metadataWrites: {
                aiRequestLog: { created: writeResult.aiRequestLog.created, id: writeResult.aiRequestLog.id, error: writeResult.aiRequestLog.error },
                executionLog: { created: writeResult.executionLog.created, id: writeResult.executionLog.id, error: writeResult.executionLog.error }
              }
            },
            message: allStagesPassed
              ? "Diagnostic runner synthetic end-to-end pipeline contract accepted. All 5 stages passed. AI execution not enabled."
              : "Diagnostic runner synthetic E2E pipeline completed with partial metadata write failure. Check metadataWrites for details."
          }
        };
      }

      const verifyMetadataWrites = body.verifyMetadataWrites === true;

      if (verifyMetadataWrites) {
        const syntheticResult = body.syntheticResult || {};
        const now = new Date().toISOString();

        const metadataInput = {
          diagnosticId,
          intakeReferenceCode,
          correlationId: correlationId || null,
          executionMode: "contract-test",
          modelDeploymentAlias: "jm1-pub-diagnostic-safe-test",
          promptKey: "jm1-prompt-pub-stage0-diagnostic",
          promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
          confidence: typeof syntheticResult.confidence === "number" ? syntheticResult.confidence : null,
          requiresHumanReview: syntheticResult.requiresHumanReview !== false,
          tokenCounts: { input: 0, output: 0, total: 0 },
          requestTimestamp: now,
          responseTimestamp: now,
          errorCode: null,
          errorMessage: null
        };

        context.info(
          `Metadata write contract test requested; diagnosticId=${diagnosticId}; reference=${intakeReferenceCode}`
        );

        const writeResult = await writeMetadata(metadataInput);

        const bothCreated = writeResult.aiRequestLog.created && writeResult.executionLog.created;
        const anyFailed = !writeResult.aiRequestLog.created || !writeResult.executionLog.created;

        context.info(
          `Metadata writes complete; diagnosticId=${diagnosticId}; aiRequestLog.created=${writeResult.aiRequestLog.created}; executionLog.created=${writeResult.executionLog.created}`
        );

        if (anyFailed && !bothCreated) {
          return {
            status: 503,
            jsonBody: {
              status: "error",
              code: "METADATA_WRITE_PARTIAL_OR_FAILED",
              diagnosticId,
              metadataWrites: {
                aiRequestLog: { created: writeResult.aiRequestLog.created, id: writeResult.aiRequestLog.id, error: writeResult.aiRequestLog.error },
                executionLog: { created: writeResult.executionLog.created, id: writeResult.executionLog.id, error: writeResult.executionLog.error }
              },
              message: "One or more metadata writes failed. No manuscript text, prompt body, or secrets were stored."
            }
          };
        }

        return {
          status: 202,
          jsonBody: {
            status: "accepted",
            mode: "contract-test",
            diagnosticId,
            intakeReferenceCode,
            correlationId,
            metadataWrites: {
              aiRequestLog: { created: writeResult.aiRequestLog.created, id: writeResult.aiRequestLog.id },
              executionLog: { created: writeResult.executionLog.created, id: writeResult.executionLog.id }
            },
            message: "Diagnostic runner metadata write contract accepted. AI execution not enabled."
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
