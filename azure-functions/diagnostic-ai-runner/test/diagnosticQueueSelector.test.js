"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  evaluateDiagnosticQueueEligibility,
  selectEligibleDiagnostics,
  QUEUE_STATUS,
  DEFAULT_MAX_ATTEMPTS
} = require("../src/queue/diagnosticQueueSelector");

const baseRecord = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  manuscriptAssetUrl: "https://jmerrill.sharepoint.com/sites/publishing/approved.docx",
  manuscriptAssetStatus: "Approved",
  approvedForDiagnostic: true,
  manuscriptFileType: ".docx",
  diagnosticExecutionStatus: QUEUE_STATUS.READY_FOR_DIAGNOSTIC,
  diagnosticAttemptCount: 0,
  manuallyBlocked: false
});

function makeRecord(overrides = {}) {
  return { ...baseRecord, ...overrides };
}

function assertBlocked(result, condition) {
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "BLOCKED");
  assert.ok(result.blockingConditions.includes(condition), JSON.stringify(result));
}

describe("diagnosticQueueSelector — eligible records", () => {
  test("valid approved diagnostic record returns eligible safe result", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord());
    assert.deepEqual(result, {
      eligible: true,
      reason: "ELIGIBLE",
      missingFields: [],
      blockingConditions: [],
      diagnosticId: baseRecord.diagnosticId,
      intakeReferenceCode: baseRecord.intakeReferenceCode
    });
  });

  test("accepts Dataverse-style field names", () => {
    const result = evaluateDiagnosticQueueEligibility({
      jm1pub_editorialdiagnosticid: baseRecord.diagnosticId,
      jm1_intakereferencecode: baseRecord.intakeReferenceCode,
      jm1_manuscriptasseturl: baseRecord.manuscriptAssetUrl,
      jm1_manuscriptassetstatus: 3,
      jm1_manuscriptapprovedfordiagnostic: true,
      jm1_manuscriptfiletype: "txt",
      jm1_diagnosticexecutionstatus: "READY_FOR_DIAGNOSTIC",
      jm1_diagnosticattemptcount: "0",
      jm1_diagnosticblocked: false
    });

    assert.equal(result.eligible, true);
    assert.equal(result.diagnosticId, baseRecord.diagnosticId);
    assert.equal(result.intakeReferenceCode, baseRecord.intakeReferenceCode);
  });

  test("selectEligibleDiagnostics separates eligible and rejected records without processing them", () => {
    const selection = selectEligibleDiagnostics([
      makeRecord(),
      makeRecord({ diagnosticId: "" })
    ]);

    assert.equal(selection.eligible.length, 1);
    assert.equal(selection.rejected.length, 1);
    assert.equal(selection.eligible[0].eligible, true);
    assert.ok(selection.rejected[0].missingFields.includes("diagnosticId"));
  });
});

describe("diagnosticQueueSelector — required field gates", () => {
  test("missing diagnostic ID blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ diagnosticId: "" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("diagnosticId"));
  });

  test("missing intake reference blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ intakeReferenceCode: "" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("intakeReferenceCode"));
  });

  test("malformed diagnostic ID blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ diagnosticId: "not-a-guid" }));
    assertBlocked(result, "DIAGNOSTIC_ID_MALFORMED");
  });

  test("malformed intake reference blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ intakeReferenceCode: "UFYG60" }));
    assertBlocked(result, "INTAKE_REFERENCE_CODE_MALFORMED");
  });

  test("missing manuscript asset URL blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptAssetUrl: "" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("manuscriptAssetUrl"));
  });

  test("invalid manuscript asset URL blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptAssetUrl: "not-a-url" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("manuscriptAssetUrl"));
  });

  test("non-HTTPS manuscript asset URL blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      manuscriptAssetUrl: "http://jmerrill.sharepoint.com/sites/publishing/approved.docx"
    }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("manuscriptAssetUrl"));
  });

  test("missing manuscript asset status blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptAssetStatus: "" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("manuscriptAssetStatus"));
  });

  test("approvedForDiagnostic false blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ approvedForDiagnostic: false }));
    assertBlocked(result, "MANUSCRIPT_NOT_APPROVED_FOR_DIAGNOSTIC");
    assert.ok(result.missingFields.includes("approvedForDiagnostic"));
  });

  test("approvedForDiagnostic missing blocks", () => {
    const { approvedForDiagnostic, ...record } = makeRecord();
    const result = evaluateDiagnosticQueueEligibility(record);
    assertBlocked(result, "MANUSCRIPT_NOT_APPROVED_FOR_DIAGNOSTIC");
    assert.ok(result.missingFields.includes("approvedForDiagnostic"));
  });
});

describe("diagnosticQueueSelector — blocking conditions", () => {
  test("asset not approved blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptAssetStatus: "Pending" }));
    assertBlocked(result, "MANUSCRIPT_ASSET_NOT_APPROVED");
  });

  test("unsupported file type blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptFileType: "pdf" }));
    assertBlocked(result, "UNSUPPORTED_FILE_TYPE");
    assert.ok(result.missingFields.includes("manuscriptFileType"));
  });

  test("missing file type blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuscriptFileType: "" }));
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("manuscriptFileType"));
  });

  test("already completed diagnostic blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: QUEUE_STATUS.DIAGNOSTIC_COMPLETE
    }));
    assertBlocked(result, "DIAGNOSTIC_ALREADY_COMPLETE");
  });

  test("currently processing diagnostic blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: QUEUE_STATUS.PROCESSING
    }));
    assertBlocked(result, "DIAGNOSTIC_CURRENTLY_PROCESSING");
  });

  test("human review required diagnostic blocks rerun selection", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: QUEUE_STATUS.HUMAN_REVIEW_REQUIRED
    }));
    assertBlocked(result, "DIAGNOSTIC_ALREADY_REQUIRES_HUMAN_REVIEW");
  });

  test("failed beyond retry limit blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: QUEUE_STATUS.DIAGNOSTIC_FAILED,
      diagnosticAttemptCount: DEFAULT_MAX_ATTEMPTS
    }));
    assertBlocked(result, "DIAGNOSTIC_RETRY_LIMIT_EXCEEDED");
  });

  test("manually blocked record blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({ manuallyBlocked: true }));
    assertBlocked(result, "DIAGNOSTIC_MANUALLY_BLOCKED");
  });

  test("status BLOCKED blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: QUEUE_STATUS.BLOCKED
    }));
    assertBlocked(result, "DIAGNOSTIC_MANUALLY_BLOCKED");
  });

  test("missing status blocks", () => {
    const { diagnosticExecutionStatus, ...record } = makeRecord();
    const result = evaluateDiagnosticQueueEligibility(record);
    assert.equal(result.eligible, false);
    assert.ok(result.missingFields.includes("diagnosticExecutionStatus"));
  });

  test("malformed status blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticExecutionStatus: "ship-it"
    }));
    assertBlocked(result, "DIAGNOSTIC_STATUS_MALFORMED");
    assert.ok(result.missingFields.includes("diagnosticExecutionStatus"));
  });

  test("malformed attempt count blocks", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      diagnosticAttemptCount: "many"
    }));
    assertBlocked(result, "DIAGNOSTIC_ATTEMPT_COUNT_MALFORMED");
    assert.ok(result.missingFields.includes("diagnosticAttemptCount"));
  });
});

describe("diagnosticQueueSelector — safe output", () => {
  test("result does not include manuscript text, prompt body, or raw model output", () => {
    const result = evaluateDiagnosticQueueEligibility(makeRecord({
      manuscriptText: "DO NOT RETURN MANUSCRIPT TEXT",
      promptBody: "DO NOT RETURN PROMPT BODY",
      rawModelOutput: "DO NOT RETURN RAW MODEL OUTPUT",
      jm1_requestpayload: "DO NOT RETURN REQUEST PAYLOAD",
      jm1_responsepayload: "DO NOT RETURN RESPONSE PAYLOAD"
    }));

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("DO NOT RETURN MANUSCRIPT TEXT"), false);
    assert.equal(serialized.includes("DO NOT RETURN PROMPT BODY"), false);
    assert.equal(serialized.includes("DO NOT RETURN RAW MODEL OUTPUT"), false);
    assert.equal(serialized.includes("DO NOT RETURN REQUEST PAYLOAD"), false);
    assert.equal(serialized.includes("DO NOT RETURN RESPONSE PAYLOAD"), false);
  });

  test("module exports no author email, Opportunity, or Flow D execution code path", () => {
    const selector = require("../src/queue/diagnosticQueueSelector");
    const exportedNames = Object.keys(selector).join(" ").toLowerCase();
    assert.equal(exportedNames.includes("email"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
  });

  test("invalid input fails closed with safe fields", () => {
    const result = evaluateDiagnosticQueueEligibility(null);
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "INVALID_RECORD");
    assert.deepEqual(result.missingFields, ["record"]);
    assert.deepEqual(result.blockingConditions, ["INVALID_RECORD"]);
    assert.equal(result.diagnosticId, null);
    assert.equal(result.intakeReferenceCode, null);
  });
});
