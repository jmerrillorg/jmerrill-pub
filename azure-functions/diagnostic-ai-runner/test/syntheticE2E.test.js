"use strict";

/**
 * Synthetic end-to-end pipeline contract tests.
 *
 * These tests exercise each stage of the synthetic E2E pipeline
 * using the individual module exports directly — no HTTP invocation,
 * no mocked HTTP handler.  The live HTTP contract test (verifyFullPipeline: true)
 * is the final integration proof run against the deployed function.
 *
 * CONTRACT: No AI calls. No real manuscripts. No Dataverse writes in unit tests.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const { extractManuscript } = require("../src/extraction/manuscriptExtractor");
const { checkLegacyExclusion, parseLegacyFlag } = require("../src/preflight/legacyExclusionCheck");
const { validateNoQuotation } = require("../src/validation/noQuotationValidator");
const { routeDiagnosticResult, STATUS } = require("../src/routing/confidenceRouter");
const { buildAiRequestLogPayload, buildExecutionLogPayload } = require("../src/dataverse/metadataWriter");

// ── Shared synthetic fixtures ─────────────────────────────────────────────────

const FIXTURE_TXT = path.join(__dirname, "fixtures", "synthetic-stage0.txt");
const FIXTURE_DOCX = path.join(__dirname, "fixtures", "synthetic-stage0.docx");

const CLEAN_OUTPUT = {
  jm1_diagnosticoutputsummary: "The submission demonstrates a focused thriller narrative with consistent pacing and a well-realized protagonist.",
  jm1_diagnosticriskflags: "No structural risk flags identified.",
  jm1_diagnosticexecutionerror: null,
  jm1_humanreviewnotes: null
};

const SYNTHETIC_RESULT_HIGH = { confidence: 0.9, requiresHumanReview: true };
const SYNTHETIC_RESULT_MID = { confidence: 0.75, requiresHumanReview: true };
const SYNTHETIC_RESULT_LOW = { confidence: 0.50, requiresHumanReview: true };

function syntheticMetadataInput(overrides = {}) {
  return {
    diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    intakeReferenceCode: "JMP-INT-260617-E2E-TEST01",
    correlationId: "INT-PUB-005-E2E-001",
    executionMode: "contract-test-e2e",
    modelDeploymentAlias: "jm1-pub-diagnostic-safe-test",
    promptKey: "jm1-prompt-pub-stage0-diagnostic",
    promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
    confidence: 0.9,
    requiresHumanReview: true,
    tokenCounts: { input: 0, output: 0, total: 0 },
    requestTimestamp: "2026-06-17T08:00:00.000Z",
    responseTimestamp: "2026-06-17T08:00:01.000Z",
    errorCode: null,
    errorMessage: null,
    ...overrides
  };
}

// ── Stage 1: Legacy gate (first gate — must fire before all others) ───────────

describe("E2E pipeline — Stage 1: Legacy gate", () => {
  test("non-legacy body passes gate", () => {
    const flag = parseLegacyFlag({});
    const result = checkLegacyExclusion(flag);
    assert.equal(result.excluded, false);
  });

  test("legacyFlag:true blocks pipeline before any downstream stage", () => {
    const flag = parseLegacyFlag({ legacyFlag: true });
    const result = checkLegacyExclusion(flag);
    assert.equal(result.excluded, true);
    assert.ok(result.reason.length > 0);
  });

  test("gate does not expose manuscript text or PII in reason", () => {
    const flag = parseLegacyFlag({ legacyFlag: true });
    const result = checkLegacyExclusion(flag);
    assert.ok(!result.reason.toLowerCase().includes("manuscript"));
    assert.ok(!result.reason.toLowerCase().includes("author"));
  });
});

// ── Stage 2: Knowledge verification (checked by live HTTP — covered by knowledge.test.js)

// ── Stage 3: Extraction ───────────────────────────────────────────────────────

describe("E2E pipeline — Stage 3: Synthetic extraction", () => {
  test("TXT fixture can be read and extracted", async () => {
    const buffer = fs.readFileSync(FIXTURE_TXT);
    const result = await extractManuscript(".txt", buffer);
    assert.equal(result.supported, true);
    assert.equal(result.contentReturned, false);
    assert.ok(result.wordCount > 0);
    assert.ok(result.sha256.length === 64);
  });

  test("DOCX fixture can be read and extracted", async () => {
    const buffer = fs.readFileSync(FIXTURE_DOCX);
    const result = await extractManuscript(".docx", buffer);
    assert.equal(result.supported, true);
    assert.equal(result.contentReturned, false);
    assert.ok(result.wordCount > 0);
  });

  test("extraction result never contains extracted text", async () => {
    const buffer = fs.readFileSync(FIXTURE_TXT);
    const result = await extractManuscript(".txt", buffer);
    assert.ok(!("text" in result), "result must not have a text field");
    assert.ok(!("content" in result), "result must not have a content field");
    assert.ok(!("extractedText" in result), "result must not have extractedText field");
  });

  test("extraction sha256 is deterministic across multiple reads", async () => {
    const buf1 = fs.readFileSync(FIXTURE_TXT);
    const buf2 = fs.readFileSync(FIXTURE_TXT);
    const r1 = await extractManuscript(".txt", buf1);
    const r2 = await extractManuscript(".txt", buf2);
    assert.equal(r1.sha256, r2.sha256);
  });
});

// ── Stage 4: Output validation ────────────────────────────────────────────────

describe("E2E pipeline — Stage 4: Output validation", () => {
  test("clean synthetic output passes validation", () => {
    const result = validateNoQuotation(CLEAN_OUTPUT);
    assert.equal(result.valid, true);
    assert.equal(result.violations.length, 0);
  });

  test("output with quoted prose is rejected before routing or metadata write", () => {
    const badOutput = {
      jm1_diagnosticoutputsummary: `The author wrote "this is a direct quote from the submitted manuscript text today"`,
      jm1_diagnosticriskflags: "none"
    };
    const result = validateNoQuotation(badOutput);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.rule === "QUOTED_CONTENT"));
  });

  test("output with prompt leakage is rejected", () => {
    const badOutput = {
      jm1_diagnosticoutputsummary: "You are a publishing evaluator. Given the manuscript, please evaluate..."
    };
    const result = validateNoQuotation(badOutput);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.rule === "PROMPT_LEAKAGE"));
  });

  test("violation objects contain no offending text", () => {
    const badOutput = {
      jm1_diagnosticoutputsummary: `The text said "this is a very long quote that contains many words here"`
    };
    const result = validateNoQuotation(badOutput);
    assert.equal(result.valid, false);
    for (const v of result.violations) {
      const vStr = JSON.stringify(v);
      assert.ok(!vStr.includes("long quote"), "violation must not expose offending text");
    }
  });
});

// ── Stage 5: Confidence routing ───────────────────────────────────────────────

describe("E2E pipeline — Stage 5: Confidence routing", () => {
  test("high confidence (0.9) routes to Completed", () => {
    const d = routeDiagnosticResult(SYNTHETIC_RESULT_HIGH);
    assert.equal(d.status, STATUS.COMPLETED);
    assert.equal(d.requiresHumanReview, true);
    assert.equal(d.routingBasis, "CONFIDENCE_HIGH");
  });

  test("mid confidence (0.75) routes to Needs Human Review", () => {
    const d = routeDiagnosticResult(SYNTHETIC_RESULT_MID);
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_MID");
    assert.equal(d.lowConfidenceNote, null);
  });

  test("low confidence (0.50) routes to Needs Human Review with note", () => {
    const d = routeDiagnosticResult(SYNTHETIC_RESULT_LOW);
    assert.equal(d.status, STATUS.NEEDS_HUMAN_REVIEW);
    assert.equal(d.routingBasis, "CONFIDENCE_LOW");
    assert.ok(typeof d.lowConfidenceNote === "string" && d.lowConfidenceNote.length > 0);
  });

  test("requiresHumanReview is true on all E2E routing paths", () => {
    const cases = [
      SYNTHETIC_RESULT_HIGH,
      SYNTHETIC_RESULT_MID,
      SYNTHETIC_RESULT_LOW,
      { technicalFailure: true },
      { manuscriptGateFailure: true }
    ];
    for (const c of cases) {
      const d = routeDiagnosticResult(c);
      assert.equal(d.requiresHumanReview, true, `requiresHumanReview must be true for ${JSON.stringify(c)}`);
    }
  });
});

// ── Stage 6: Metadata write payload safety (unit — no live Dataverse) ─────────

describe("E2E pipeline — Stage 6: Metadata write payload safety", () => {
  test("AI request log payload for E2E mode has correct executionMode in name", () => {
    const input = syntheticMetadataInput({ executionMode: "contract-test-e2e" });
    const p = buildAiRequestLogPayload(input);
    assert.ok(p.jm1_name.includes("contract-test-e2e"));
  });

  test("execution log payload for E2E mode states no manuscript or prompt stored", () => {
    const input = syntheticMetadataInput({ executionMode: "contract-test-e2e" });
    const p = buildExecutionLogPayload(input, null);
    assert.ok(p.jm1_actiondescription.includes("No manuscript text stored"));
    assert.ok(p.jm1_actiondescription.includes("No prompt body stored"));
  });

  test("AI request log token counts are 0 in contract-test-e2e", () => {
    const input = syntheticMetadataInput({ tokenCounts: { input: 0, output: 0, total: 0 } });
    const p = buildAiRequestLogPayload(input);
    assert.equal(p.jm1_actualinputtokens, 0);
    assert.equal(p.jm1_actualoutputtokens, 0);
  });

  test("prohibited payload fields absent from AI request log", () => {
    const input = syntheticMetadataInput();
    const p = buildAiRequestLogPayload(input);
    assert.ok(!("jm1_requestpayload" in p));
    assert.ok(!("jm1_responsepayload" in p));
    assert.ok(!("jm1_airecommendation" in p));
  });

  test("payload contains no manuscript or prompt text in any value", () => {
    const input = syntheticMetadataInput();
    const p = buildAiRequestLogPayload(input);
    const all = JSON.stringify(p).toLowerCase();
    assert.ok(!all.includes("given the manuscript"));
    assert.ok(!all.includes("extracted content"));
    assert.ok(!all.includes("you are a"));
  });
});

// ── Full pipeline simulation (all stages, module-level, no HTTP) ──────────────

describe("E2E pipeline — full synthetic chain simulation", () => {
  test("all 5 stages complete successfully with synthetic DOCX and clean output", async () => {
    // Stage 1: Legacy gate
    const legacyFlag = parseLegacyFlag({});
    const legacyCheck = checkLegacyExclusion(legacyFlag);
    assert.equal(legacyCheck.excluded, false, "Stage 1: legacy gate must not exclude");

    // Stage 2: Knowledge verification — skipped in unit test (live I/O, covered by knowledge.test.js)

    // Stage 3: Extraction
    const buffer = fs.readFileSync(FIXTURE_DOCX);
    const extraction = await extractManuscript(".docx", buffer);
    assert.equal(extraction.supported, true, "Stage 3: extraction must succeed");
    assert.equal(extraction.contentReturned, false, "Stage 3: content must not be returned");

    // Stage 4: Output validation
    const validation = validateNoQuotation(CLEAN_OUTPUT);
    assert.equal(validation.valid, true, "Stage 4: output validation must pass");
    assert.equal(validation.violations.length, 0, "Stage 4: no violations");

    // Stage 5: Confidence routing
    const routing = routeDiagnosticResult(SYNTHETIC_RESULT_HIGH);
    assert.equal(routing.status, STATUS.COMPLETED, "Stage 5: should route to Completed");
    assert.equal(routing.requiresHumanReview, true, "Stage 5: requiresHumanReview must be true");

    // Stage 6: Metadata payload safety
    const metaInput = syntheticMetadataInput({ confidence: SYNTHETIC_RESULT_HIGH.confidence });
    const aiLogPayload = buildAiRequestLogPayload(metaInput);
    const execLogPayload = buildExecutionLogPayload(metaInput, null);

    assert.ok(!("jm1_requestpayload" in aiLogPayload), "Stage 6: prompt body must not be in payload");
    assert.ok(!("jm1_responsepayload" in aiLogPayload), "Stage 6: model output must not be in payload");
    assert.ok(execLogPayload.jm1_actiondescription.includes("No manuscript text stored"), "Stage 6: action description safety");
  });

  test("pipeline aborts at Stage 1 when legacyFlag is true", () => {
    const legacyFlag = parseLegacyFlag({ legacyFlag: true });
    const legacyCheck = checkLegacyExclusion(legacyFlag);
    assert.equal(legacyCheck.excluded, true, "Pipeline must abort — legacy exclusion fired");
    // Downstream stages must not run when legacy gate fires
    // This is enforced by the handler returning 422 before reaching extraction
  });

  test("pipeline aborts at Stage 4 when output contains quoted prose", async () => {
    // Stages 1-3 would pass
    const legacyCheck = checkLegacyExclusion(parseLegacyFlag({}));
    assert.equal(legacyCheck.excluded, false);

    const buffer = fs.readFileSync(FIXTURE_TXT);
    const extraction = await extractManuscript(".txt", buffer);
    assert.equal(extraction.supported, true);

    // Stage 4 fails
    const badOutput = {
      jm1_diagnosticoutputsummary: `The author wrote "this is a direct quoted excerpt from the submitted manuscript text"`
    };
    const validation = validateNoQuotation(badOutput);
    assert.equal(validation.valid, false, "Pipeline must abort — output validation failed");
    // Stages 5-6 must not run when output validation fails
  });
});
