"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAuthorDraftApprovalDecision,
  buildAuthorDraftApprovalUpdate,
  AUTHOR_DRAFT_APPROVAL_DECISION,
  AUTHOR_DRAFT_APPROVAL_STATUS,
  DECISION_STATUS_MAP
} = require("../src/author/authorDraftApprovalDecisionModel");
const { AUTHOR_DRAFT_FIELD_MAP } = require("../src/author/authorDraftFieldMap");
const {
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS,
  INTERNAL_VISIBILITY_MAILBOX
} = require("../src/author/authorResponseDraftBuilder");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  currentApprovalStatus: DRAFT_APPROVAL_STATUS,
  currentSendStatus: DRAFT_STATUS,
  decision: AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION,
  reviewerId: "jackie",
  reviewerNotes: "Approved for later send preparation.",
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true,
  metadata: {
    correlationId: "INT-PUB-005-DRAFT-APPROVAL-TEST",
    executionId: "EXEC-DRAFT-APPROVAL-TEST"
  }
});

function makeInput(overrides = {}) {
  return { ...baseInput, ...overrides };
}

function assertInvalid(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
}

describe("authorDraftApprovalDecisionModel — valid decisions", () => {
  const validCases = [
    [
      AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION,
      AUTHOR_DRAFT_APPROVAL_STATUS.APPROVED_FOR_SEND_PREPARATION,
      ""
    ],
    [
      AUTHOR_DRAFT_APPROVAL_DECISION.NEEDS_DRAFT_REVISION,
      AUTHOR_DRAFT_APPROVAL_STATUS.NEEDS_DRAFT_REVISION,
      "Please revise the tone before use."
    ],
    [
      AUTHOR_DRAFT_APPROVAL_DECISION.REJECT_DRAFT,
      AUTHOR_DRAFT_APPROVAL_STATUS.DRAFT_REJECTED,
      "Do not use this draft."
    ],
    [
      AUTHOR_DRAFT_APPROVAL_DECISION.HOLD_DRAFT_REVIEW,
      AUTHOR_DRAFT_APPROVAL_STATUS.PENDING_HUMAN_APPROVAL,
      ""
    ]
  ];

  for (const [decision, expectedStatus, reviewerNotes] of validCases) {
    test(`${decision} succeeds and maps to ${expectedStatus}`, () => {
      const result = buildAuthorDraftApprovalUpdate(makeInput({ decision, reviewerNotes }));

      assert.equal(result.ok, true);
      assert.equal(result.decisionUpdate.draftApprovalDecision, decision);
      assert.equal(result.decisionUpdate.approvalStatus, expectedStatus);
      assert.equal(result.decisionUpdate.sendStatus, DRAFT_STATUS);
      assert.equal(result.decisionUpdate.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
      assert.equal(result.decisionUpdate.futureSendRequiresInternalCopy, true);
      assert.equal(result.decisionUpdate.futureSendRequiresDataverseLog, true);
      assert.equal(result.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus], expectedStatus);
      assert.equal(result.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftSendStatus], DRAFT_STATUS);
      assert.equal(result.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox], INTERNAL_VISIBILITY_MAILBOX);
      assert.equal(result.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy], true);
      assert.equal(result.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog], true);
    });
  }

  test("status mapping is explicit and internal-only", () => {
    assert.equal(DECISION_STATUS_MAP.APPROVE_FOR_SEND_PREPARATION, "APPROVED_FOR_SEND_PREPARATION");
    assert.equal(DECISION_STATUS_MAP.NEEDS_DRAFT_REVISION, "NEEDS_DRAFT_REVISION");
    assert.equal(DECISION_STATUS_MAP.REJECT_DRAFT, "DRAFT_REJECTED");
    assert.equal(DECISION_STATUS_MAP.HOLD_DRAFT_REVIEW, "PENDING_HUMAN_APPROVAL");
    assert.equal(JSON.stringify(DECISION_STATUS_MAP).includes("SENT"), false);
    assert.equal(JSON.stringify(DECISION_STATUS_MAP).includes("OPPORTUNITY"), false);
    assert.equal(JSON.stringify(DECISION_STATUS_MAP).includes("FLOW"), false);
  });
});

describe("authorDraftApprovalDecisionModel — fail closed", () => {
  test("missing diagnosticId fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ diagnosticId: "" })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ intakeReferenceCode: "" })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("missing reviewerId fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ reviewerId: "" })), "REVIEWER_ID_MISSING");
  });

  test("missing current approval status fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ currentApprovalStatus: "" })), "CURRENT_APPROVAL_STATUS_MISSING");
  });

  test("non-pending current approval status fails", () => {
    assertInvalid(
      validateAuthorDraftApprovalDecision(makeInput({ currentApprovalStatus: "APPROVED_FOR_SEND_PREPARATION" })),
      "CURRENT_APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL"
    );
  });

  test("missing current send status fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ currentSendStatus: "" })), "CURRENT_SEND_STATUS_MISSING");
  });

  test("current send status other than DRAFT_ONLY fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ currentSendStatus: "SENT" })), "CURRENT_SEND_STATUS_NOT_DRAFT_ONLY");
  });

  test("missing decision fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ decision: "" })), "DECISION_MISSING");
  });

  test("unsupported decision fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ decision: "SEND_NOW" })), "DECISION_UNSUPPORTED");
  });

  test("needs revision without notes fails", () => {
    assertInvalid(
      validateAuthorDraftApprovalDecision(makeInput({ decision: AUTHOR_DRAFT_APPROVAL_DECISION.NEEDS_DRAFT_REVISION, reviewerNotes: "" })),
      "REVIEWER_NOTES_REQUIRED"
    );
  });

  test("reject without notes fails", () => {
    assertInvalid(
      validateAuthorDraftApprovalDecision(makeInput({ decision: AUTHOR_DRAFT_APPROVAL_DECISION.REJECT_DRAFT, reviewerNotes: "" })),
      "REVIEWER_NOTES_REQUIRED"
    );
  });

  test("wrong internal visibility mailbox fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ internalVisibilityMailbox: "publishing@jmerrill.pub" })), "INTERNAL_VISIBILITY_MAILBOX_INVALID");
  });

  test("false future internal copy requirement fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ futureSendRequiresInternalCopy: false })), "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("false future Dataverse send-log requirement fails", () => {
    assertInvalid(validateAuthorDraftApprovalDecision(makeInput({ futureSendRequiresDataverseLog: false })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  const unsafeCases = [
    ["manuscript text", { manuscriptText: "DO NOT RETURN" }],
    ["prompt body", { promptBody: "DO NOT RETURN" }],
    ["raw model response", { rawModelResponse: "DO NOT RETURN" }],
    ["send-now field", { sendNow: true }],
    ["sentAt field", { sentAt: "2026-06-18T12:00:00.000Z" }],
    ["emailSent field", { emailSent: true }],
    ["mail provider message ID", { mailProviderMessageId: "DO-NOT-STORE" }],
    ["Opportunity field", { opportunityPayload: "DO NOT RETURN" }],
    ["Flow D trigger field", { flowDTrigger: true }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, () => {
      const result = buildAuthorDraftApprovalUpdate(makeInput(unsafe));

      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
      assert.equal(JSON.stringify(result).includes("DO-NOT-STORE"), false);
    });
  }
});

describe("authorDraftApprovalDecisionModel — safety", () => {
  test("decision update contains no unsafe content or downstream execution fields", () => {
    const result = buildAuthorDraftApprovalUpdate(makeInput());
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("extractedContent"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("sendNow"), false);
    assert.equal(serialized.includes("emailSent"), false);
    assert.equal(serialized.includes("mailProviderMessageId"), false);
    assert.equal(serialized.includes("opportunity"), false);
    assert.equal(serialized.includes("flowD"), false);
  });

  test("module exports no mail API, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const decisionModel = require("../src/author/authorDraftApprovalDecisionModel");
    const exportedNames = Object.keys(decisionModel).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("rundiagnostic"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });
});
