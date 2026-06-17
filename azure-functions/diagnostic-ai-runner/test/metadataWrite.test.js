"use strict";

const { test, describe, mock, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// ── Import the module under test ──────────────────────────────────────────────

const {
  buildAiRequestLogPayload,
  buildExecutionLogPayload,
  MODEL_PROVIDER,
  REQUEST_STATUS,
  SOURCE_BRAND,
  REQUEST_TYPE,
  EXECUTION_STATUS,
  BAND_LEVEL,
  AGENT_NAME,
  SOURCE_ENTITY,
} = require("../src/dataverse/metadataWriter");

// ── Shared synthetic input ────────────────────────────────────────────────────

function syntheticInput(overrides = {}) {
  return {
    diagnosticId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    intakeReferenceCode: "JMP-INT-METADATA-TEST",
    correlationId: "INT-PUB-005-METADATA-WRITE-001",
    executionMode: "contract-test",
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

// ── AI Request Log payload ────────────────────────────────────────────────────

describe("buildAiRequestLogPayload — allowed fields", () => {
  test("includes required jm1_ fields", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.equal(p.jm1_agentname, AGENT_NAME);
    assert.ok(p.jm1_airequestid, "jm1_airequestid must be set");
    assert.ok(p.jm1_modeldeployment, "jm1_modeldeployment must be set");
    assert.equal(p.jm1_modelprovider, MODEL_PROVIDER.AZURE_OPENAI);
    assert.ok(p.jm1_promptname, "jm1_promptname must be set");
    assert.ok(p.jm1_promptversion, "jm1_promptversion must be set");
    assert.equal(p.jm1_requeststatus, REQUEST_STATUS.COMPLETED);
    assert.ok(p.jm1_requesttimestamp, "jm1_requesttimestamp must be set");
    assert.equal(p.jm1_sourcebrand, SOURCE_BRAND.JM_PUBLISHING);
    assert.equal(p.jm1_sourceentity, SOURCE_ENTITY);
    assert.ok(p.jm1_sourcerecordid, "jm1_sourcerecordid must be set");
    assert.ok(p.jm1_sourcesystem, "jm1_sourcesystem must be set");
  });

  test("sourcerecordid is diagnosticId", () => {
    const input = syntheticInput();
    const p = buildAiRequestLogPayload(input);
    assert.equal(p.jm1_sourcerecordid, input.diagnosticId);
  });

  test("confidence set when numeric", () => {
    const p = buildAiRequestLogPayload(syntheticInput({ confidence: 0.9 }));
    assert.equal(p.jm1_confidence, 0.9);
  });

  test("confidence not set when null", () => {
    const p = buildAiRequestLogPayload(syntheticInput({ confidence: null }));
    assert.ok(!("jm1_confidence" in p), "jm1_confidence must not be present when null");
  });

  test("token counts default to 0", () => {
    const p = buildAiRequestLogPayload(syntheticInput({ tokenCounts: null }));
    assert.equal(p.jm1_actualinputtokens, 0);
    assert.equal(p.jm1_actualoutputtokens, 0);
  });

  test("token counts from input", () => {
    const p = buildAiRequestLogPayload(syntheticInput({ tokenCounts: { input: 0, output: 0, total: 0 } }));
    assert.equal(p.jm1_actualinputtokens, 0);
    assert.equal(p.jm1_actualoutputtokens, 0);
  });

  test("requeststatus FAILED when errorCode present", () => {
    const p = buildAiRequestLogPayload(syntheticInput({ errorCode: "TECHNICAL_FAILURE", errorMessage: "safe error" }));
    assert.equal(p.jm1_requeststatus, REQUEST_STATUS.FAILED);
  });

  test("requeststatus COMPLETED when no errorCode", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.equal(p.jm1_requeststatus, REQUEST_STATUS.COMPLETED);
  });

  test("humanreviewrequired is always true in contract-test", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.equal(p.jm1_humanreviewrequired, true);
  });

  test("requesttype is Diagnostic", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.equal(p.jm1_requesttype, REQUEST_TYPE.DIAGNOSTIC);
  });
});

// ── AI Request Log — prohibited fields ───────────────────────────────────────

describe("buildAiRequestLogPayload — prohibited fields absent", () => {
  test("jm1_requestpayload (prompt body) is not set", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.ok(!("jm1_requestpayload" in p), "prompt body field must not be present");
  });

  test("jm1_responsepayload (model output) is not set", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.ok(!("jm1_responsepayload" in p), "model output field must not be present");
  });

  test("jm1_airecommendation (model output) is not set", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    assert.ok(!("jm1_airecommendation" in p), "AI recommendation field must not be present");
  });

  test("no manuscript text appears in any field value", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    const allValues = JSON.stringify(p);
    assert.ok(!allValues.includes("manuscript content"), "no manuscript text in payload");
    assert.ok(!allValues.includes("extracted text"), "no extracted text in payload");
  });

  test("no prompt body text appears in any field value", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    const allValues = JSON.stringify(p);
    assert.ok(!allValues.includes("you are a"), "no prompt instruction text");
    assert.ok(!allValues.includes("given the manuscript"), "no prompt instruction text");
  });

  test("no secrets or headers in payload", () => {
    const p = buildAiRequestLogPayload(syntheticInput());
    const allValues = JSON.stringify(p).toLowerCase();
    assert.ok(!allValues.includes("x-jm1-diagnostic-runner-key"), "no runner key in payload");
    assert.ok(!allValues.includes("authorization"), "no auth header in payload");
    assert.ok(!allValues.includes("bearer "), "no bearer token in payload");
  });

  test("error detail is truncated to 1000 chars and does not expose system path", () => {
    const longMsg = "x".repeat(2000);
    const p = buildAiRequestLogPayload(syntheticInput({ errorCode: "ERR", errorMessage: longMsg }));
    assert.ok(p.jm1_errordetail.length <= 1000, "error detail must not exceed 1000 chars");
  });
});

// ── Execution Log payload ─────────────────────────────────────────────────────

describe("buildExecutionLogPayload — allowed fields", () => {
  test("includes required fields", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    assert.ok(p.jm1_actiondescription, "jm1_actiondescription must be set");
    assert.ok(p.jm1_actiontype, "jm1_actiontype must be set");
    assert.equal(p.jm1_agentname, AGENT_NAME);
    assert.equal(p.jm1_bandlevel, BAND_LEVEL.BAND_1);
    assert.equal(p.jm1_executionstatus, EXECUTION_STATUS.SUCCESS);
    assert.ok(p.jm1_startedon, "jm1_startedon must be set");
  });

  test("executionstatus FAILED when errorCode present", () => {
    const p = buildExecutionLogPayload(syntheticInput({ errorCode: "ERR" }), null);
    assert.equal(p.jm1_executionstatus, EXECUTION_STATUS.FAILED);
  });

  test("executionstatus SUCCESS when no errorCode", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    assert.equal(p.jm1_executionstatus, EXECUTION_STATUS.SUCCESS);
  });

  test("sourcerecordid is diagnosticId", () => {
    const input = syntheticInput();
    const p = buildExecutionLogPayload(input, null);
    assert.equal(p.jm1_sourcerecordid, input.diagnosticId);
  });

  test("actiondescription includes executionMode", () => {
    const p = buildExecutionLogPayload(syntheticInput({ executionMode: "contract-test" }), null);
    assert.ok(p.jm1_actiondescription.includes("contract-test"));
  });

  test("actiondescription includes intakeReferenceCode", () => {
    const input = syntheticInput();
    const p = buildExecutionLogPayload(input, null);
    assert.ok(p.jm1_actiondescription.includes(input.intakeReferenceCode));
  });
});

// ── Execution Log — safety ────────────────────────────────────────────────────

describe("buildExecutionLogPayload — prohibited content absent", () => {
  test("actiondescription does not contain manuscript text", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(!desc.includes("manuscript content"), "no manuscript text in description");
    assert.ok(!desc.includes("extracted text"), "no extracted text in description");
  });

  test("actiondescription explicitly states no manuscript text stored", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    assert.ok(p.jm1_actiondescription.includes("No manuscript text stored"));
  });

  test("actiondescription explicitly states no prompt body stored", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    assert.ok(p.jm1_actiondescription.includes("No prompt body stored"));
  });

  test("no model output in any field", () => {
    const p = buildExecutionLogPayload(syntheticInput(), null);
    const all = JSON.stringify(p).toLowerCase();
    assert.ok(!all.includes("you are a"), "no model output text");
  });
});

// ── writeMetadata — config guards ─────────────────────────────────────────────

describe("writeMetadata — env var guard", () => {
  test("returns DATAVERSE_CONFIG_MISSING when env vars absent", async () => {
    // Temporarily ensure env vars are absent
    const origApi = process.env.DATAVERSE_WEB_API_BASE_URL;
    const origRes = process.env.DATAVERSE_RESOURCE_URL;
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;

    const { writeMetadata: wm } = require("../src/dataverse/metadataWriter");
    const result = await wm(syntheticInput());

    assert.equal(result.aiRequestLog.created, false);
    assert.equal(result.executionLog.created, false);
    assert.equal(result.aiRequestLog.error, "DATAVERSE_CONFIG_MISSING");
    assert.equal(result.executionLog.error, "DATAVERSE_CONFIG_MISSING");

    // Restore
    if (origApi) process.env.DATAVERSE_WEB_API_BASE_URL = origApi;
    if (origRes) process.env.DATAVERSE_RESOURCE_URL = origRes;
  });
});

// ── Picklist constants ────────────────────────────────────────────────────────

describe("Dataverse picklist constants", () => {
  test("MODEL_PROVIDER.AZURE_OPENAI matches schema value", () => {
    assert.equal(MODEL_PROVIDER.AZURE_OPENAI, 835500000);
  });

  test("REQUEST_STATUS.COMPLETED matches schema value", () => {
    assert.equal(REQUEST_STATUS.COMPLETED, 835500002);
  });

  test("REQUEST_STATUS.FAILED matches schema value", () => {
    assert.equal(REQUEST_STATUS.FAILED, 835500003);
  });

  test("SOURCE_BRAND.JM_PUBLISHING matches schema value", () => {
    assert.equal(SOURCE_BRAND.JM_PUBLISHING, 835500001);
  });

  test("REQUEST_TYPE.DIAGNOSTIC matches schema value", () => {
    assert.equal(REQUEST_TYPE.DIAGNOSTIC, 835500000);
  });

  test("EXECUTION_STATUS.SUCCESS matches schema value", () => {
    assert.equal(EXECUTION_STATUS.SUCCESS, 835500001);
  });

  test("EXECUTION_STATUS.FAILED matches schema value", () => {
    assert.equal(EXECUTION_STATUS.FAILED, 835500002);
  });

  test("BAND_LEVEL.BAND_1 matches schema value", () => {
    assert.equal(BAND_LEVEL.BAND_1, 835500000);
  });
});
