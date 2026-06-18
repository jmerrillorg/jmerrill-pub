"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateHumanReviewDecision,
  buildHumanReviewDecisionUpdate,
  REVIEW_DECISION,
  DECISION_STATUS_MAP,
  DECISION_HUMAN_REVIEW_STATUS_MAP
} = require("../src/review/humanReviewDecisionModel");
const { REVIEW_STATUS } = require("../src/review/diagnosticReviewBuilder");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  currentReviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW,
  decision: REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT,
  reviewerId: "jackie",
  reviewerNotes: "",
  decisionTimestamp: "2026-06-18T12:00:00.000Z",
  metadata: {
    correlationId: "INT-PUB-005-HUMAN-REVIEW-TEST",
    executionId: "EXEC-HUMAN-REVIEW-TEST"
  }
});

function makeInput(overrides = {}) {
  const metadata = Object.prototype.hasOwnProperty.call(overrides, "metadata") && overrides.metadata === null
    ? null
    : {
        ...baseInput.metadata,
        ...(overrides.metadata || {})
      };

  return {
    ...baseInput,
    ...overrides,
    metadata
  };
}

function assertBlocked(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.code, "HUMAN_REVIEW_DECISION_BLOCKED");
  assert.equal(result.reason, reason);
}

describe("humanReviewDecisionModel — valid decisions", () => {
  test("APPROVE_FOR_AUTHOR_DRAFT from pending succeeds", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput({
      decision: REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT
    }));

    assert.equal(result.ok, true);
    assert.equal(result.update.reviewDecision, REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT);
    assert.equal(result.update.reviewStatus, REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT);
    assert.equal(result.dataverseUpdatePayload.jm1_humanreviewstatus, 835510001);
  });

  test("NEEDS_REVISION from pending succeeds with notes", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput({
      decision: REVIEW_DECISION.NEEDS_REVISION,
      reviewerNotes: "Revise internal risk labels before use."
    }));

    assert.equal(result.ok, true);
    assert.equal(result.update.reviewStatus, REVIEW_STATUS.NEEDS_REVISION);
    assert.equal(result.dataverseUpdatePayload.jm1_humanreviewstatus, 835510003);
  });

  test("REJECT_BLOCK from pending succeeds with notes", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput({
      decision: REVIEW_DECISION.REJECT_BLOCK,
      reviewerNotes: "Do not use this diagnostic result."
    }));

    assert.equal(result.ok, true);
    assert.equal(result.update.reviewStatus, REVIEW_STATUS.BLOCKED);
    assert.equal(result.dataverseUpdatePayload.jm1_humanreviewstatus, 835510004);
  });

  test("HOLD_FOR_REVIEW from pending succeeds", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput({
      decision: REVIEW_DECISION.HOLD_FOR_REVIEW
    }));

    assert.equal(result.ok, true);
    assert.equal(result.update.reviewStatus, REVIEW_STATUS.PENDING_HUMAN_REVIEW);
    assert.equal(result.dataverseUpdatePayload.jm1_humanreviewstatus, 835510000);
  });
});

describe("humanReviewDecisionModel — status mapping", () => {
  test("decision constants map to internal statuses", () => {
    assert.equal(DECISION_STATUS_MAP[REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT], REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT);
    assert.equal(DECISION_STATUS_MAP[REVIEW_DECISION.NEEDS_REVISION], REVIEW_STATUS.NEEDS_REVISION);
    assert.equal(DECISION_STATUS_MAP[REVIEW_DECISION.REJECT_BLOCK], REVIEW_STATUS.BLOCKED);
    assert.equal(DECISION_STATUS_MAP[REVIEW_DECISION.HOLD_FOR_REVIEW], REVIEW_STATUS.PENDING_HUMAN_REVIEW);
  });

  test("decision constants map to confirmed human review choice values", () => {
    assert.equal(DECISION_HUMAN_REVIEW_STATUS_MAP[REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT], 835510001);
    assert.equal(DECISION_HUMAN_REVIEW_STATUS_MAP[REVIEW_DECISION.NEEDS_REVISION], 835510003);
    assert.equal(DECISION_HUMAN_REVIEW_STATUS_MAP[REVIEW_DECISION.REJECT_BLOCK], 835510004);
    assert.equal(DECISION_HUMAN_REVIEW_STATUS_MAP[REVIEW_DECISION.HOLD_FOR_REVIEW], 835510000);
  });
});

describe("humanReviewDecisionModel — fail closed", () => {
  test("missing diagnosticId fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({ diagnosticId: "" })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({ intakeReferenceCode: "" })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("missing reviewerId fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({ reviewerId: "" })), "REVIEWER_ID_MISSING");
  });

  test("unsupported decision fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({ decision: "SEND_AUTHOR_EMAIL" })), "DECISION_UNSUPPORTED");
  });

  test("decision from non-pending status fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({
      currentReviewStatus: REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT
    })), "CURRENT_REVIEW_STATUS_NOT_PENDING");
  });

  test("Needs revision without notes fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({
      decision: REVIEW_DECISION.NEEDS_REVISION,
      reviewerNotes: ""
    })), "REVIEWER_NOTES_REQUIRED");
  });

  test("Reject/block without notes fails", () => {
    assertBlocked(validateHumanReviewDecision(makeInput({
      decision: REVIEW_DECISION.REJECT_BLOCK,
      reviewerNotes: ""
    })), "REVIEWER_NOTES_REQUIRED");
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
    test(`unsafe ${label} fails`, () => {
      const result = validateHumanReviewDecision(makeInput(unsafe));
      assertBlocked(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
    });
  }
});

describe("humanReviewDecisionModel — safety", () => {
  test("decision update does not include unsafe content fields", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput());
    assert.equal(result.ok, true);
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("extractedContent"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("authorEmailBody"), false);
    assert.equal(serialized.includes("emailTo"), false);
    assert.equal(serialized.includes("opportunityPayload"), false);
    assert.equal(serialized.includes("flowDTrigger"), false);
  });

  test("structured decision packet remains internal-only", () => {
    const result = buildHumanReviewDecisionUpdate(makeInput({
      decision: REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT,
      reviewerNotes: "Approved for a future draft preparation step only."
    }));
    const structured = JSON.parse(result.dataverseUpdatePayload.jm1_diagnosticstructuredoutputjson);

    assert.equal(structured.reviewDecision, REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT);
    assert.equal(structured.reviewStatus, REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT);
    assert.equal(structured.approvalStatus, REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT);
    assert.equal(Object.prototype.hasOwnProperty.call(structured, "emailBody"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(structured, "opportunityPayload"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(structured, "flowDTrigger"), false);
  });

  test("module exports no author email, Opportunity, Flow D, or runner code path", () => {
    const model = require("../src/review/humanReviewDecisionModel");
    const exportedNames = Object.keys(model).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("email"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
    assert.equal(exportedNames.includes("send"), false);
  });
});
