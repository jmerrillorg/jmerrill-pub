"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildInternalDiagnosticReviewPayload,
  REVIEW_STATUS,
  APPROVAL_STATUS,
  SAFE_METADATA_FIELDS
} = require("../src/review/diagnosticReviewBuilder");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  aiOutput: {
    jm1_diagnosticoutputsummary: "Concise internal diagnostic summary.",
    jm1_diagnosticriskflags: "Market fit; Editorial structure",
    jm1_confidence: 0.79,
    jm1_requireshumanreview: true
  },
  routingResult: {
    status: 835500004,
    statusLabel: "Needs Human Review",
    routingBasis: "CONFIDENCE_MID",
    requiresHumanReview: true
  },
  metadata: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    modelDeploymentAlias: "claude-sonnet-4-6",
    promptKey: "jm1-prompt-pub-stage0-diagnostic",
    promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
    correlationId: "INT-PUB-005-REVIEW-TEST",
    tokenCounts: { input: 10, output: 20, total: 30 }
  },
  preparedAt: "2026-06-18T10:00:00.000Z"
});

function makeInput(overrides = {}) {
  const aiOutput = Object.prototype.hasOwnProperty.call(overrides, "aiOutput") && overrides.aiOutput === null
    ? null
    : {
        ...baseInput.aiOutput,
        ...(overrides.aiOutput || {})
      };
  const routingResult = Object.prototype.hasOwnProperty.call(overrides, "routingResult") && overrides.routingResult === null
    ? null
    : {
        ...baseInput.routingResult,
        ...(overrides.routingResult || {})
      };
  const metadata = Object.prototype.hasOwnProperty.call(overrides, "metadata") && overrides.metadata === null
    ? null
    : {
        ...baseInput.metadata,
        ...(overrides.metadata || {})
      };

  return {
    ...baseInput,
    ...overrides,
    aiOutput,
    routingResult,
    metadata
  };
}

function assertBlocked(result, condition) {
  assert.equal(result.ok, false);
  assert.equal(result.code, "REVIEW_PAYLOAD_BLOCKED");
  assert.ok(result.blockingConditions.includes(condition), JSON.stringify(result));
}

describe("diagnosticReviewBuilder — valid payload", () => {
  test("valid diagnostic output builds an internal review payload", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput());
    assert.equal(result.ok, true);
    assert.equal(result.payload.diagnosticId, baseInput.diagnosticId);
    assert.equal(result.payload.intakeReferenceCode, baseInput.intakeReferenceCode);
    assert.equal(result.payload.diagnosticOutputSummary, baseInput.aiOutput.jm1_diagnosticoutputsummary);
    assert.equal(result.payload.diagnosticRiskFlags, baseInput.aiOutput.jm1_diagnosticriskflags);
    assert.equal(result.payload.confidence, 0.79);
    assert.equal(result.payload.requiresHumanReview, true);
    assert.deepEqual(result.payload.routingDecision, {
      status: 835500004,
      statusLabel: "Needs Human Review",
      routingBasis: "CONFIDENCE_MID",
      requiresHumanReview: true
    });
  });

  test("payload defaults to pending human review statuses", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput());
    assert.equal(result.ok, true);
    assert.equal(result.payload.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(result.payload.approvalStatus, APPROVAL_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(result.payload.reviewedBy, null);
    assert.equal(result.payload.reviewedOn, null);
  });

  test("payload includes safe metadata only", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      metadata: {
        manuscriptText: "DO NOT RETURN",
        promptBody: "DO NOT RETURN",
        rawModelOutput: "DO NOT RETURN",
        authorEmailBody: "DO NOT RETURN",
        opportunityPayload: "DO NOT RETURN",
        headers: { authorization: "DO NOT RETURN" },
        tokenCounts: { input: 1, output: 2, total: 3 }
      }
    }));

    assertBlocked(result, "UNSAFE_FIELD_PRESENT");
  });

  test("SAFE_METADATA_FIELDS stays limited to operational metadata", () => {
    assert.deepEqual(SAFE_METADATA_FIELDS, [
      "provider",
      "model",
      "modelDeploymentAlias",
      "promptKey",
      "promptVersion",
      "correlationId",
      "tokenCounts"
    ]);
  });
});

describe("diagnosticReviewBuilder — fail-closed required fields", () => {
  test("missing diagnosticId fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({ diagnosticId: "" }));
    assert.equal(result.ok, false);
    assert.ok(result.missingFields.includes("diagnosticId"));
  });

  test("malformed diagnosticId fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({ diagnosticId: "not-a-guid" }));
    assertBlocked(result, "DIAGNOSTIC_ID_MALFORMED");
  });

  test("missing intakeReferenceCode fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({ intakeReferenceCode: "" }));
    assert.equal(result.ok, false);
    assert.ok(result.missingFields.includes("intakeReferenceCode"));
  });

  test("malformed intakeReferenceCode fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({ intakeReferenceCode: "UFYG60" }));
    assertBlocked(result, "INTAKE_REFERENCE_CODE_MALFORMED");
  });

  test("missing summary fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_diagnosticoutputsummary: "" }
    }));
    assert.equal(result.ok, false);
    assert.ok(result.missingFields.includes("jm1_diagnosticoutputsummary"));
  });

  test("missing risk flags fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_diagnosticriskflags: "" }
    }));
    assert.equal(result.ok, false);
    assert.ok(result.missingFields.includes("jm1_diagnosticriskflags"));
  });

  test("missing confidence fails", () => {
    const input = makeInput();
    delete input.aiOutput.jm1_confidence;
    const result = buildInternalDiagnosticReviewPayload(input);
    assertBlocked(result, "CONFIDENCE_INVALID");
    assert.ok(result.missingFields.includes("jm1_confidence"));
  });

  test("confidence below 0.0 fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_confidence: -0.01 }
    }));
    assertBlocked(result, "CONFIDENCE_INVALID");
  });

  test("confidence above 1.0 fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_confidence: 1.01 }
    }));
    assertBlocked(result, "CONFIDENCE_INVALID");
  });

  test("non-finite confidence fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_confidence: Infinity }
    }));
    assertBlocked(result, "CONFIDENCE_INVALID");
  });

  test("requiresHumanReview false fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: { jm1_requireshumanreview: false }
    }));
    assertBlocked(result, "HUMAN_REVIEW_REQUIRED_NOT_TRUE");
  });

  test("missing routing decision fails", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({ routingResult: null }));
    assertBlocked(result, "ROUTING_RESULT_INVALID");
    assert.ok(result.missingFields.includes("routingResult"));
  });

  test("routing decision must require human review", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      routingResult: { requiresHumanReview: false }
    }));
    assertBlocked(result, "ROUTING_REQUIRES_HUMAN_REVIEW_NOT_TRUE");
  });
});

describe("diagnosticReviewBuilder — safety exclusions", () => {
  test("payload does not include unsafe raw fields", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput());
    assert.equal(result.ok, true);
    const serialized = JSON.stringify(result.payload);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("extractedContent"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("authorEmailBody"), false);
    assert.equal(serialized.includes("emailTo"), false);
    assert.equal(serialized.includes("opportunityPayload"), false);
    assert.equal(serialized.includes("flowDTrigger"), false);
    assert.equal(serialized.includes("headers"), false);
    assert.equal(serialized.includes("apiKey"), false);
  });

  test("unsafe raw fields in aiOutput are rejected rather than passed through", () => {
    const result = buildInternalDiagnosticReviewPayload(makeInput({
      aiOutput: {
        manuscriptText: "DO NOT RETURN",
        extractedContent: "DO NOT RETURN",
        promptBody: "DO NOT RETURN",
        rawModelResponse: "DO NOT RETURN",
        emailBody: "DO NOT RETURN",
        opportunityId: "DO NOT RETURN",
        flowDTrigger: "DO NOT RETURN"
      }
    }));

    assertBlocked(result, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
  });

  test("module exports no author email, Opportunity, Flow D, or runner code path", () => {
    const builder = require("../src/review/diagnosticReviewBuilder");
    const exportedNames = Object.keys(builder).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("email"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
    assert.equal(exportedNames.includes("send"), false);
  });

  test("invalid input fails closed with safe result", () => {
    const result = buildInternalDiagnosticReviewPayload(null);
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVALID_REVIEW_INPUT");
    assert.deepEqual(result.missingFields, ["input"]);
    assert.deepEqual(result.blockingConditions, ["INVALID_REVIEW_INPUT"]);
    assert.equal(result.diagnosticId, null);
    assert.equal(result.intakeReferenceCode, null);
  });
});
