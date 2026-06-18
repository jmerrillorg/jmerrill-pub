"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  persistInternalDiagnosticReview,
  buildInternalDiagnosticReviewRecord,
  buildDataverseUpdatePayload,
  validateReviewPayload,
  ENTITY_SET,
  DATAVERSE_FIELD_MAP,
  HUMAN_REVIEW_STATUS,
  PERSISTENCE_ERROR_CODE,
  WRITE_ERROR_CODE
} = require("../src/review/diagnosticReviewPersister");
const {
  REVIEW_STATUS,
  APPROVAL_STATUS
} = require("../src/review/diagnosticReviewBuilder");

const baseReviewPayload = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  diagnosticOutputSummary: "Concise internal diagnostic summary.",
  diagnosticRiskFlags: "Market fit; Editorial structure",
  confidence: 0.79,
  requiresHumanReview: true,
  routingDecision: {
    status: 835500004,
    statusLabel: "Needs Human Review",
    routingBasis: "CONFIDENCE_MID",
    requiresHumanReview: true
  },
  reviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW,
  approvalStatus: APPROVAL_STATUS.PENDING_HUMAN_REVIEW,
  reviewedBy: null,
  reviewedOn: null,
  preparedAt: "2026-06-18T10:00:00.000Z",
  metadata: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    modelDeploymentAlias: "claude-sonnet-4-6",
    promptKey: "jm1-prompt-pub-stage0-diagnostic",
    promptVersion: "PUB-STAGE0-DIAGNOSTIC-V1",
    correlationId: "INT-PUB-005-REVIEW-PERSISTENCE-TEST",
    executionId: "EXEC-REVIEW-TEST",
    tokenCounts: { input: 10, output: 20, total: 30 }
  }
});

function makePayload(overrides = {}) {
  const routingDecision = Object.prototype.hasOwnProperty.call(overrides, "routingDecision") && overrides.routingDecision === null
    ? null
    : {
        ...baseReviewPayload.routingDecision,
        ...(overrides.routingDecision || {})
      };
  const metadata = Object.prototype.hasOwnProperty.call(overrides, "metadata") && overrides.metadata === null
    ? null
    : {
        ...baseReviewPayload.metadata,
        ...(overrides.metadata || {})
      };

  return {
    ...baseReviewPayload,
    ...overrides,
    routingDecision,
    metadata
  };
}

function makeClient(assertInput = () => {}) {
  return {
    calls: [],
    async updateDiagnosticReview(input) {
      this.calls.push(input);
      assertInput(input);
      return { dataverseRecordId: input.diagnosticId };
    }
  };
}

function assertInvalid(result, reason) {
  assert.equal(result.persisted, false);
  assert.equal(result.code, PERSISTENCE_ERROR_CODE);
  assert.equal(result.reason, reason);
}

describe("diagnosticReviewPersister — valid persistence", () => {
  test("valid review payload persists successfully with a mock Dataverse client", async () => {
    const client = makeClient((input) => {
      assert.equal(input.entitySet, ENTITY_SET);
      assert.equal(input.diagnosticId, baseReviewPayload.diagnosticId);
      assert.equal(input.intakeReferenceCode, baseReviewPayload.intakeReferenceCode);
      assert.equal(input.reviewRecord.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
      assert.equal(input.reviewRecord.approvalStatus, APPROVAL_STATUS.PENDING_HUMAN_REVIEW);
      assert.equal(input.dataverseUpdatePayload.jm1_humanreviewstatus, HUMAN_REVIEW_STATUS.PENDING_REVIEW);
      assert.equal(input.dataverseUpdatePayload.jm1_diagnosticexecutionstatus, 835500004);
    });

    const result = await persistInternalDiagnosticReview({
      dataverseClient: client,
      reviewPayload: makePayload()
    });

    assert.equal(result.persisted, true);
    assert.equal(result.diagnosticId, baseReviewPayload.diagnosticId);
    assert.equal(result.intakeReferenceCode, baseReviewPayload.intakeReferenceCode);
    assert.equal(result.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(result.approvalStatus, APPROVAL_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(result.dataverseRecordId, baseReviewPayload.diagnosticId);
    assert.equal(typeof result.persistedAt, "string");
    assert.equal(client.calls.length, 1);
  });

  test("safe summary, risk, confidence, routing, and metadata fields are prepared for persistence", () => {
    const record = buildInternalDiagnosticReviewRecord(makePayload());

    assert.equal(record.diagnosticOutputSummary, baseReviewPayload.diagnosticOutputSummary);
    assert.equal(record.diagnosticRiskFlags, baseReviewPayload.diagnosticRiskFlags);
    assert.equal(record.confidence, 0.79);
    assert.deepEqual(record.routingDecision, baseReviewPayload.routingDecision);
    assert.equal(record.requiresHumanReview, true);
    assert.deepEqual(record.metadata.tokenCounts, { input: 10, output: 20, total: 30 });
    assert.equal(record.metadata.correlationId, "INT-PUB-005-REVIEW-PERSISTENCE-TEST");
    assert.equal(record.metadata.executionId, "EXEC-REVIEW-TEST");
  });

  test("persisted review and approval statuses remain pending human review", () => {
    const record = buildInternalDiagnosticReviewRecord(makePayload());
    assert.equal(record.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(record.approvalStatus, APPROVAL_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(record.reviewedBy, null);
    assert.equal(record.reviewedOn, null);
  });

  test("Dataverse update payload uses exact approved Editorial Diagnostic logical names", () => {
    const record = buildInternalDiagnosticReviewRecord(makePayload());
    const payload = buildDataverseUpdatePayload(record);

    assert.equal(DATAVERSE_FIELD_MAP.diagnosticOutputSummary, "jm1_diagnosticoutputsummary");
    assert.equal(DATAVERSE_FIELD_MAP.diagnosticRiskFlags, "jm1_diagnosticriskflags");
    assert.equal(DATAVERSE_FIELD_MAP.confidence, "jm1_diagnosticconfidence");
    assert.equal(DATAVERSE_FIELD_MAP.requiresHumanReview, "jm1_diagnosticrequireshumanreview");
    assert.equal(DATAVERSE_FIELD_MAP.routingStatus, "jm1_diagnosticexecutionstatus");
    assert.equal(DATAVERSE_FIELD_MAP.structuredOutputJson, "jm1_diagnosticstructuredoutputjson");
    assert.equal(DATAVERSE_FIELD_MAP.humanReviewStatus, "jm1_humanreviewstatus");
    assert.equal(DATAVERSE_FIELD_MAP.humanReviewedBy, "jm1_humanreviewedby");
    assert.equal(DATAVERSE_FIELD_MAP.humanReviewedOn, "jm1_humanreviewedon");
    assert.equal(DATAVERSE_FIELD_MAP.humanReviewNotes, "jm1_humanreviewnotes");

    assert.equal(payload.jm1_diagnosticoutputsummary, baseReviewPayload.diagnosticOutputSummary);
    assert.equal(payload.jm1_diagnosticriskflags, baseReviewPayload.diagnosticRiskFlags);
    assert.equal(payload.jm1_diagnosticconfidence, 0.79);
    assert.equal(payload.jm1_diagnosticrequireshumanreview, true);
    assert.equal(payload.jm1_diagnosticexecutionstatus, 835500004);
    assert.equal(payload.jm1_humanreviewstatus, 835510000);
    assert.equal(payload.jm1_humanreviewedby, null);
    assert.equal(payload.jm1_humanreviewedon, null);
    assert.equal(payload.jm1_diagnosticagentid, "claude-sonnet-4-6");
    assert.equal(payload.jm1_diagnosticcorrelationid, "INT-PUB-005-REVIEW-PERSISTENCE-TEST");
  });

  test("structured output JSON stores only the safe internal review packet", () => {
    const record = buildInternalDiagnosticReviewRecord(makePayload());
    const payload = buildDataverseUpdatePayload(record);
    const structured = JSON.parse(payload.jm1_diagnosticstructuredoutputjson);

    assert.equal(structured.intakeReferenceCode, baseReviewPayload.intakeReferenceCode);
    assert.deepEqual(structured.routingDecision, baseReviewPayload.routingDecision);
    assert.equal(structured.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(structured.approvalStatus, APPROVAL_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(structured.reviewedBy, null);
    assert.equal(structured.reviewedOn, null);
    assert.equal(structured.preparedAt, baseReviewPayload.preparedAt);
    assert.deepEqual(structured.metadata.tokenCounts, { input: 10, output: 20, total: 30 });
  });
});

describe("diagnosticReviewPersister — fail closed", () => {
  test("missing payload fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient() });
    assertInvalid(result, "MISSING_REVIEW_PAYLOAD");
  });

  test("missing diagnosticId fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ diagnosticId: "" }) });
    assertInvalid(result, "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ intakeReferenceCode: "" }) });
    assertInvalid(result, "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("empty summary fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ diagnosticOutputSummary: "" }) });
    assertInvalid(result, "DIAGNOSTIC_SUMMARY_MISSING");
  });

  test("empty risk flags fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ diagnosticRiskFlags: "" }) });
    assertInvalid(result, "DIAGNOSTIC_RISK_FLAGS_MISSING");
  });

  for (const confidence of [undefined, Number.NaN, Infinity, -0.01, 1.01]) {
    test(`invalid confidence fails safely: ${String(confidence)}`, async () => {
      const payload = makePayload();
      payload.confidence = confidence;
      const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: payload });
      assertInvalid(result, "CONFIDENCE_INVALID");
    });
  }

  test("requiresHumanReview not true fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ requiresHumanReview: false }) });
    assertInvalid(result, "HUMAN_REVIEW_REQUIRED_NOT_TRUE");
  });

  test("wrong reviewStatus fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ reviewStatus: REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT }) });
    assertInvalid(result, "REVIEW_STATUS_NOT_PENDING_HUMAN_REVIEW");
  });

  test("wrong approvalStatus fails", async () => {
    const result = await persistInternalDiagnosticReview({ dataverseClient: makeClient(), reviewPayload: makePayload({ approvalStatus: "APPROVED" }) });
    assertInvalid(result, "APPROVAL_STATUS_NOT_PENDING_HUMAN_REVIEW");
  });

  test("routing decision must require human review", async () => {
    const result = await persistInternalDiagnosticReview({
      dataverseClient: makeClient(),
      reviewPayload: makePayload({ routingDecision: { requiresHumanReview: false } })
    });
    assertInvalid(result, "ROUTING_DECISION_INVALID");
  });

  const unsafeCases = [
    ["manuscript text", { manuscriptText: "DO NOT RETURN" }],
    ["prompt body", { promptBody: "DO NOT RETURN" }],
    ["raw model response", { rawModelResponse: "DO NOT RETURN" }],
    ["author email field", { emailBody: "DO NOT RETURN" }],
    ["Opportunity field", { opportunityPayload: "DO NOT RETURN" }],
    ["Flow D trigger field", { flowDTrigger: true }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, async () => {
      const result = await persistInternalDiagnosticReview({
        dataverseClient: makeClient(),
        reviewPayload: makePayload(unsafe)
      });

      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
    });
  }

  test("nested unsafe fields fail", () => {
    const result = validateReviewPayload(makePayload({
      metadata: { safe: true, rawModelOutput: "DO NOT RETURN" }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
  });

  test("missing Dataverse client fails", async () => {
    const result = await persistInternalDiagnosticReview({ reviewPayload: makePayload() });
    assertInvalid(result, "DATAVERSE_CLIENT_INVALID");
  });

  test("Dataverse write rejection fails safely", async () => {
    const result = await persistInternalDiagnosticReview({
      dataverseClient: {
        async updateDiagnosticReview() {
          throw new Error("boom with unsafe details omitted");
        }
      },
      reviewPayload: makePayload()
    });

    assert.equal(result.persisted, false);
    assert.equal(result.code, WRITE_ERROR_CODE);
    assert.equal(result.reason, "DATAVERSE_WRITE_FAILED");
  });
});

describe("diagnosticReviewPersister — safety", () => {
  test("error results do not include manuscript text, prompt body, or raw model output", async () => {
    const result = await persistInternalDiagnosticReview({
      dataverseClient: makeClient(),
      reviewPayload: makePayload({
        manuscriptText: "SECRET MANUSCRIPT TEXT",
        promptBody: "SECRET PROMPT BODY",
        rawModelOutput: "SECRET RAW OUTPUT"
      })
    });

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("SECRET MANUSCRIPT TEXT"), false);
    assert.equal(serialized.includes("SECRET PROMPT BODY"), false);
    assert.equal(serialized.includes("SECRET RAW OUTPUT"), false);
  });

  test("module exports no author email, Opportunity, Flow D, or runner code path", () => {
    const persister = require("../src/review/diagnosticReviewPersister");
    const exportedNames = Object.keys(persister).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("email"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
    assert.equal(exportedNames.includes("send"), false);
  });
});
