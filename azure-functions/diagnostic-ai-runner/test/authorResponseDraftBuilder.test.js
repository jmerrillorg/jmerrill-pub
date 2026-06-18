"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorResponseDraft,
  validateDraftInput,
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("../src/author/authorResponseDraftBuilder");
const { REVIEW_DECISION } = require("../src/review/humanReviewDecisionModel");
const { REVIEW_STATUS } = require("../src/review/diagnosticReviewBuilder");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  reviewDecision: REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT,
  reviewPayload: {
    diagnosticOutputSummary: "The project shows a clear nonfiction concept with a reflective teaching voice.",
    diagnosticRiskFlags: "Positioning clarity; Editorial structure",
    confidence: 0.79,
    requiresHumanReview: true,
    reviewStatus: REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT
  },
  author: {
    name: "Jackie",
    email: "jackie@example.com"
  },
  project: {
    title: "TEST - Stage 0 Submission"
  },
  metadata: {
    correlationId: "INT-PUB-005-DRAFT-TEST",
    executionId: "EXEC-DRAFT-TEST"
  }
});

function makeInput(overrides = {}) {
  const reviewPayload = Object.prototype.hasOwnProperty.call(overrides, "reviewPayload") && overrides.reviewPayload === null
    ? null
    : {
        ...baseInput.reviewPayload,
        ...(overrides.reviewPayload || {})
      };
  const author = Object.prototype.hasOwnProperty.call(overrides, "author") && overrides.author === null
    ? null
    : {
        ...baseInput.author,
        ...(overrides.author || {})
      };
  const project = Object.prototype.hasOwnProperty.call(overrides, "project") && overrides.project === null
    ? null
    : {
        ...baseInput.project,
        ...(overrides.project || {})
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
    reviewPayload,
    author,
    project,
    metadata
  };
}

function assertBlocked(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUTHOR_RESPONSE_DRAFT_BLOCKED");
  assert.equal(result.reason, reason);
}

describe("authorResponseDraftBuilder — valid draft", () => {
  test("approved review decision builds a draft", () => {
    const result = buildAuthorResponseDraft(makeInput());

    assert.equal(result.ok, true);
    assert.equal(result.draft.draftTemplate, TEMPLATE_NAME);
    assert.equal(result.draft.sendStatus, DRAFT_STATUS);
    assert.equal(result.draft.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(result.draft.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.draft.diagnosticId, baseInput.diagnosticId);
    assert.equal(result.draft.intakeReferenceCode, baseInput.intakeReferenceCode);
    assert.equal(result.draft.authorName, "Jackie");
    assert.equal(result.draft.authorEmail, "jackie@example.com");
    assert.equal(result.draft.projectTitle, "TEST - Stage 0 Submission");
    assert.ok(result.draft.draftSubject.length > 0);
    assert.ok(result.draft.draftBody.length > 0);
  });

  test("draft body uses safe JMP-branded next-step language", () => {
    const result = buildAuthorResponseDraft(makeInput());
    const body = result.draft.draftBody;

    assert.ok(body.includes("Thank you for submitting"));
    assert.ok(body.includes("J Merrill Publishing"));
    assert.ok(body.includes("initial internal editorial review"));
    assert.ok(body.includes("not a final acceptance decision"));
    assert.ok(body.includes("A human team member will review"));
    assert.equal(body.toLowerCase().includes("rejected"), false);
    assert.equal(body.toLowerCase().includes("ai made"), false);
    assert.equal(body.toLowerCase().includes("price"), false);
  });

  test("draft includes future visibility rule without executing it", () => {
    const result = buildAuthorResponseDraft(makeInput());

    assert.deepEqual(result.draft.visibilityRule, {
      internalVisibilityMailbox: "publishing@jmerrill.one",
      futureSendMustCopyOrMirror: true,
      futureSendEventMustBeLoggedInDataverse: true
    });
  });

  test("draft does not contain unsafe source content or downstream fields", () => {
    const result = buildAuthorResponseDraft(makeInput());
    const serialized = JSON.stringify(result.draft);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("opportunityPayload"), false);
    assert.equal(serialized.includes("flowDTrigger"), false);
  });
});

describe("authorResponseDraftBuilder — fail closed", () => {
  test("non-approved decision fails", () => {
    assertBlocked(validateDraftInput(makeInput({ reviewDecision: REVIEW_DECISION.HOLD_FOR_REVIEW })), "REVIEW_DECISION_NOT_APPROVED_FOR_AUTHOR_DRAFT");
  });

  test("pending review status fails", () => {
    assertBlocked(validateDraftInput(makeInput({
      reviewPayload: { reviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW }
    })), "REVIEW_STATUS_NOT_APPROVED_FOR_AUTHOR_DRAFT");
  });

  test("needs revision decision fails", () => {
    assertBlocked(validateDraftInput(makeInput({ reviewDecision: REVIEW_DECISION.NEEDS_REVISION })), "REVIEW_DECISION_NOT_APPROVED_FOR_AUTHOR_DRAFT");
  });

  test("reject/block decision fails", () => {
    assertBlocked(validateDraftInput(makeInput({ reviewDecision: REVIEW_DECISION.REJECT_BLOCK })), "REVIEW_DECISION_NOT_APPROVED_FOR_AUTHOR_DRAFT");
  });

  test("hold decision fails", () => {
    assertBlocked(validateDraftInput(makeInput({ reviewDecision: REVIEW_DECISION.HOLD_FOR_REVIEW })), "REVIEW_DECISION_NOT_APPROVED_FOR_AUTHOR_DRAFT");
  });

  test("missing diagnosticId fails", () => {
    assertBlocked(validateDraftInput(makeInput({ diagnosticId: "" })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertBlocked(validateDraftInput(makeInput({ intakeReferenceCode: "" })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("missing author email fails", () => {
    assertBlocked(validateDraftInput(makeInput({ author: { email: "" } })), "AUTHOR_EMAIL_MISSING");
  });

  test("missing project title fails", () => {
    assertBlocked(validateDraftInput(makeInput({ project: { title: "" } })), "PROJECT_TITLE_MISSING");
  });

  test("missing summary fails", () => {
    assertBlocked(validateDraftInput(makeInput({
      reviewPayload: { diagnosticOutputSummary: "" }
    })), "DIAGNOSTIC_SUMMARY_MISSING");
  });

  test("missing risk flags fails", () => {
    assertBlocked(validateDraftInput(makeInput({
      reviewPayload: { diagnosticRiskFlags: "" }
    })), "DIAGNOSTIC_RISK_FLAGS_MISSING");
  });

  for (const confidence of [undefined, Number.NaN, Infinity, -0.01, 1.01]) {
    test(`invalid confidence fails: ${String(confidence)}`, () => {
      const input = makeInput();
      input.reviewPayload.confidence = confidence;
      assertBlocked(validateDraftInput(input), "CONFIDENCE_INVALID");
    });
  }

  test("requiresHumanReview not true fails", () => {
    assertBlocked(validateDraftInput(makeInput({
      reviewPayload: { requiresHumanReview: false }
    })), "HUMAN_REVIEW_REQUIRED_NOT_TRUE");
  });

  const unsafeCases = [
    ["manuscript text", { manuscriptText: "DO NOT RETURN" }],
    ["prompt body", { promptBody: "DO NOT RETURN" }],
    ["raw model response", { rawModelResponse: "DO NOT RETURN" }],
    ["author email send field", { emailBody: "DO NOT RETURN" }],
    ["Opportunity field", { opportunityPayload: "DO NOT RETURN" }],
    ["Flow D trigger field", { flowDTrigger: true }],
    ["sendNow flag", { sendNow: true }],
    ["sentAt flag", { sentAt: "2026-06-18T12:00:00.000Z" }],
    ["emailSent flag", { emailSent: true }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, () => {
      const result = validateDraftInput(makeInput(unsafe));
      assertBlocked(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
    });
  }
});

describe("authorResponseDraftBuilder — safety", () => {
  test("module exports no mail API, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const builder = require("../src/author/authorResponseDraftBuilder");
    const exportedNames = Object.keys(builder).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });

  test("draft uses jmerrill.one visibility mailbox and no jmerrill.pub mailbox", () => {
    const result = buildAuthorResponseDraft(makeInput());
    const serialized = JSON.stringify(result.draft);

    assert.equal(result.draft.internalVisibilityMailbox, "publishing@jmerrill.one");
    assert.equal(serialized.includes("@jmerrill.pub"), false);
  });
});
