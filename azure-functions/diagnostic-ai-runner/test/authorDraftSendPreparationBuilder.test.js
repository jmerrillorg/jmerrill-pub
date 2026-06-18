"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorDraftSendPreparationRecord,
  validateSendPreparationInput,
  SEND_PREPARATION_STATUS,
  DELIVERY_STATUS,
  SEND_PREPARATION_ERROR_CODE
} = require("../src/author/authorDraftSendPreparationBuilder");
const {
  AUTHOR_DRAFT_APPROVAL_DECISION,
  AUTHOR_DRAFT_APPROVAL_STATUS
} = require("../src/author/authorDraftApprovalDecisionModel");
const {
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS
} = require("../src/author/authorResponseDraftBuilder");

const baseDraftPayload = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  authorEmail: "jackie@example.com",
  authorName: "Jackie",
  projectTitle: "TEST - Stage 0 Submission",
  draftSubject: "Next step for your J Merrill Publishing submission",
  draftBody: "Thank you for sharing your work with J Merrill Publishing.",
  templateName: TEMPLATE_NAME,
  sendStatus: DRAFT_STATUS,
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true
});

const baseInput = Object.freeze({
  diagnosticId: baseDraftPayload.diagnosticId,
  intakeReferenceCode: baseDraftPayload.intakeReferenceCode,
  draftPayload: baseDraftPayload,
  approvalDecision: AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION,
  approvalStatus: AUTHOR_DRAFT_APPROVAL_STATUS.APPROVED_FOR_SEND_PREPARATION,
  currentSendStatus: DRAFT_STATUS,
  approvedForSendPreparationBy: "jackie",
  approvedForSendPreparationOn: "2026-06-18T12:00:00.000Z",
  preparedBy: "system/internal",
  metadata: {
    correlationId: "INT-PUB-005-SEND-PREP-TEST",
    executionId: "EXEC-SEND-PREP-TEST"
  }
});

function makeInput(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    draftPayload: {
      ...baseDraftPayload,
      ...(overrides.draftPayload || {})
    }
  };
}

function assertInvalid(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.code || null, result.code ? SEND_PREPARATION_ERROR_CODE : null);
  assert.equal(result.reason, reason);
}

describe("authorDraftSendPreparationBuilder — valid preparation", () => {
  test("approved draft builds a send-preparation record", () => {
    const result = buildAuthorDraftSendPreparationRecord(makeInput());

    assert.equal(result.ok, true);
    assert.equal(result.sendPreparationRecord.diagnosticId, baseDraftPayload.diagnosticId);
    assert.equal(result.sendPreparationRecord.intakeReferenceCode, baseDraftPayload.intakeReferenceCode);
    assert.equal(result.sendPreparationRecord.authorEmail, "jackie@example.com");
    assert.equal(result.sendPreparationRecord.draftSubject, baseDraftPayload.draftSubject);
    assert.equal(result.sendPreparationRecord.draftBody, baseDraftPayload.draftBody);
    assert.equal(result.sendPreparationRecord.sendPreparationStatus, SEND_PREPARATION_STATUS);
    assert.equal(result.sendPreparationRecord.sendPreparationStatus, "READY_FOR_HUMAN_SEND_APPROVAL");
    assert.equal(result.sendPreparationRecord.sendStatus, DRAFT_STATUS);
    assert.equal(result.sendPreparationRecord.deliveryStatus, DELIVERY_STATUS);
    assert.equal(result.sendPreparationRecord.deliveryStatus, "NOT_SENT");
    assert.equal(result.sendPreparationRecord.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.sendPreparationRecord.futureSendRequiresInternalCopy, true);
    assert.equal(result.sendPreparationRecord.futureSendRequiresDataverseLog, true);
  });
});

describe("authorDraftSendPreparationBuilder — fail closed", () => {
  test("non-approved decision fails", () => {
    assertInvalid(
      buildAuthorDraftSendPreparationRecord(makeInput({ approvalDecision: AUTHOR_DRAFT_APPROVAL_DECISION.HOLD_DRAFT_REVIEW })),
      "APPROVAL_DECISION_NOT_APPROVED_FOR_SEND_PREPARATION"
    );
  });

  test("wrong approval status fails", () => {
    assertInvalid(
      buildAuthorDraftSendPreparationRecord(makeInput({ approvalStatus: AUTHOR_DRAFT_APPROVAL_STATUS.PENDING_HUMAN_APPROVAL })),
      "APPROVAL_STATUS_NOT_APPROVED_FOR_SEND_PREPARATION"
    );
  });

  test("current send status other than DRAFT_ONLY fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ currentSendStatus: "QUEUED_TO_SEND" })), "CURRENT_SEND_STATUS_NOT_DRAFT_ONLY");
  });

  test("missing diagnosticId fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ diagnosticId: "", draftPayload: { diagnosticId: "" } })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ intakeReferenceCode: "", draftPayload: { intakeReferenceCode: "" } })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("missing authorEmail fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { authorEmail: "" } })), "AUTHOR_EMAIL_MISSING");
  });

  test("missing subject fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { draftSubject: "" } })), "DRAFT_SUBJECT_MISSING");
  });

  test("missing body fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { draftBody: "" } })), "DRAFT_BODY_MISSING");
  });

  test("wrong internal visibility mailbox fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { internalVisibilityMailbox: "publishing@jmerrill.pub" } })), "INTERNAL_VISIBILITY_MAILBOX_INVALID");
  });

  test("missing future internal copy requirement fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { futureSendRequiresInternalCopy: undefined } })), "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("false future internal copy requirement fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { futureSendRequiresInternalCopy: false } })), "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("missing future Dataverse send-log requirement fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { futureSendRequiresDataverseLog: undefined } })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  test("false future Dataverse send-log requirement fails", () => {
    assertInvalid(buildAuthorDraftSendPreparationRecord(makeInput({ draftPayload: { futureSendRequiresDataverseLog: false } })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  const unsafeCases = [
    ["sendNow flag", { draftPayload: { sendNow: true } }],
    ["sentAt field", { draftPayload: { sentAt: "2026-06-18T12:00:00.000Z" } }],
    ["emailSent field", { draftPayload: { emailSent: true } }],
    ["provider message ID", { draftPayload: { providerMessageId: "DO-NOT-STORE" } }],
    ["Opportunity field", { draftPayload: { opportunityPayload: "DO NOT RETURN" } }],
    ["Flow D trigger", { draftPayload: { flowDTrigger: true } }],
    ["manuscript text", { draftPayload: { manuscriptText: "SECRET MANUSCRIPT" } }],
    ["prompt body", { draftPayload: { promptBody: "SECRET PROMPT" } }],
    ["raw model response", { draftPayload: { rawModelResponse: "SECRET RAW" } }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, () => {
      const result = buildAuthorDraftSendPreparationRecord(makeInput(unsafe));
      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("SECRET"), false);
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
      assert.equal(JSON.stringify(result).includes("DO-NOT-STORE"), false);
    });
  }
});

describe("authorDraftSendPreparationBuilder — safety", () => {
  test("error results do not include draft body or unsafe source content", () => {
    const result = buildAuthorDraftSendPreparationRecord(makeInput({
      draftPayload: {
        draftBody: "AUTHOR DRAFT BODY",
        manuscriptText: "SECRET MANUSCRIPT",
        promptBody: "SECRET PROMPT",
        rawModelResponse: "SECRET RAW"
      }
    }));

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("AUTHOR DRAFT BODY"), false);
    assert.equal(serialized.includes("SECRET MANUSCRIPT"), false);
    assert.equal(serialized.includes("SECRET PROMPT"), false);
    assert.equal(serialized.includes("SECRET RAW"), false);
  });

  test("module exports no mail API, send event, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const builder = require("../src/author/authorDraftSendPreparationBuilder");
    const exportedNames = Object.keys(builder).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("sendevent"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("rundiagnostic"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });

  test("validateSendPreparationInput succeeds for approved draft", () => {
    assert.deepEqual(validateSendPreparationInput(makeInput()), { ok: true });
  });
});
