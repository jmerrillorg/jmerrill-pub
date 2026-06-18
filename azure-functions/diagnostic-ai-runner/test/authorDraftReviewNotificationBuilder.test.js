"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorDraftReviewNotification,
  validateReviewNotificationInput,
  NOTIFICATION_TYPE,
  NEXT_ACTION,
  NOTIFICATION_ERROR_CODE,
  MAX_DRAFT_PREVIEW_LENGTH
} = require("../src/author/authorDraftReviewNotificationBuilder");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("../src/author/authorResponseDraftBuilder");

const baseDraftPayload = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  authorName: "Jackie",
  authorEmail: "jackie@example.com",
  projectTitle: "TEST - Stage 0 Submission",
  draftSubject: "Next step for your J Merrill Publishing submission",
  draftBody: "Thank you for sharing your work with J Merrill Publishing. A prepared author-response draft is ready for a human reviewer.",
  sendStatus: DRAFT_STATUS,
  approvalStatus: DRAFT_APPROVAL_STATUS,
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true
});

const baseInput = Object.freeze({
  diagnosticId: baseDraftPayload.diagnosticId,
  intakeReferenceCode: baseDraftPayload.intakeReferenceCode,
  notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
  draftPayload: baseDraftPayload,
  reviewPayload: {
    confidence: 0.79,
    diagnosticRiskFlags: "Needs Human Review"
  },
  metadata: {
    correlationId: "INT-PUB-005-NOTIFICATION-TEST",
    executionId: "EXEC-NOTIFICATION-TEST"
  },
  dataverseRecordReference: "jm1pub_editorialdiagnostics(64e387e0-7e6a-f111-a826-00224820105b)"
});

function makeInput(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    draftPayload: {
      ...baseDraftPayload,
      ...(overrides.draftPayload || {})
    },
    reviewPayload: {
      ...baseInput.reviewPayload,
      ...(overrides.reviewPayload || {})
    },
    metadata: {
      ...baseInput.metadata,
      ...(overrides.metadata || {})
    }
  };
}

function assertInvalid(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.code, NOTIFICATION_ERROR_CODE);
  assert.equal(result.reason, reason);
}

describe("authorDraftReviewNotificationBuilder - valid notification", () => {
  test("valid DRAFT_ONLY author draft builds an internal notification", () => {
    const result = buildAuthorDraftReviewNotification(makeInput());

    assert.equal(result.ok, true);
    assert.equal(result.notification.notificationType, NOTIFICATION_TYPE);
    assert.equal(result.notification.notificationType, "AUTHOR_DRAFT_READY_FOR_REVIEW");
    assert.equal(result.notification.notificationRecipient, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.notification.diagnosticId, baseDraftPayload.diagnosticId);
    assert.equal(result.notification.intakeReferenceCode, baseDraftPayload.intakeReferenceCode);
    assert.equal(result.notification.authorName, "Jackie");
    assert.equal(result.notification.authorEmail, "jackie@example.com");
    assert.equal(result.notification.projectTitle, "TEST - Stage 0 Submission");
    assert.equal(result.notification.draftSubject, baseDraftPayload.draftSubject);
    assert.equal(result.notification.draftStatus, DRAFT_STATUS);
    assert.equal(result.notification.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(result.notification.nextAction, NEXT_ACTION);
    assert.equal(result.notification.notificationBody.includes("No author email has been sent."), true);
    assert.equal(result.notification.notificationBody.includes("Next action: Review the prepared author-response draft"), true);
    assert.equal(result.notification.diagnosticConfidence, 0.79);
    assert.equal(result.notification.diagnosticRiskFlags, "Needs Human Review");
  });

  test("notification uses a safe preview instead of requiring full body exposure", () => {
    const longDraft = "A".repeat(MAX_DRAFT_PREVIEW_LENGTH + 80);
    const result = buildAuthorDraftReviewNotification(makeInput({ draftPayload: { draftBody: longDraft } }));

    assert.equal(result.ok, true);
    assert.equal(result.notification.draftBodyPreview.length <= MAX_DRAFT_PREVIEW_LENGTH, true);
    assert.equal(result.notification.draftBodyPreview.endsWith("..."), true);
    assert.equal(result.notification.draftBodyPreview.includes("A".repeat(MAX_DRAFT_PREVIEW_LENGTH + 1)), false);
  });
});

describe("authorDraftReviewNotificationBuilder - fail closed", () => {
  test("missing diagnosticId fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ diagnosticId: "", draftPayload: { diagnosticId: "" } })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ intakeReferenceCode: "", draftPayload: { intakeReferenceCode: "" } })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("wrong recipient fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ notificationRecipient: "publishing@jmerrill.pub" })), "NOTIFICATION_RECIPIENT_INVALID");
  });

  test("missing author name fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { authorName: "" } })), "AUTHOR_NAME_MISSING");
  });

  test("missing author email fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { authorEmail: "" } })), "AUTHOR_EMAIL_MISSING");
  });

  test("missing project title fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { projectTitle: "" } })), "PROJECT_TITLE_MISSING");
  });

  test("missing draft subject fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { draftSubject: "" } })), "DRAFT_SUBJECT_MISSING");
  });

  test("missing draft body or preview fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { draftBody: "", draftBodyPreview: "", safeDraftSummary: "" } })), "DRAFT_BODY_OR_PREVIEW_MISSING");
  });

  test("send status other than DRAFT_ONLY fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { sendStatus: "QUEUED_TO_SEND" } })), "SEND_STATUS_NOT_DRAFT_ONLY");
  });

  test("approval status other than PENDING_HUMAN_APPROVAL fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { approvalStatus: "APPROVED_FOR_SEND_PREPARATION" } })), "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL");
  });

  test("missing future internal copy requirement fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { futureSendRequiresInternalCopy: undefined } })), "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("missing future Dataverse send-log requirement fails", () => {
    assertInvalid(buildAuthorDraftReviewNotification(makeInput({ draftPayload: { futureSendRequiresDataverseLog: undefined } })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  const unsafeCases = [
    ["sendNow flag", { draftPayload: { sendNow: true } }],
    ["sentAt field", { draftPayload: { sentAt: "2026-06-18T12:00:00.000Z" } }],
    ["emailSent field", { draftPayload: { emailSent: true } }],
    ["provider message ID", { draftPayload: { providerMessageId: "DO-NOT-STORE" } }],
    ["Opportunity field", { draftPayload: { opportunityPayload: "DO NOT RETURN" } }],
    ["Flow D trigger", { draftPayload: { flowDTrigger: true } }],
    ["manuscript text", { draftPayload: { manuscriptText: "SECRET MANUSCRIPT" } }],
    ["extracted content", { draftPayload: { extractedContent: "SECRET EXTRACT" } }],
    ["prompt body", { draftPayload: { promptBody: "SECRET PROMPT" } }],
    ["raw model response", { draftPayload: { rawModelResponse: "SECRET RAW" } }],
    ["mail provider response", { draftPayload: { mailProviderResponse: "SECRET PROVIDER RESPONSE" } }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, () => {
      const result = buildAuthorDraftReviewNotification(makeInput(unsafe));
      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes("SECRET"), false);
      assert.equal(serialized.includes("DO NOT RETURN"), false);
      assert.equal(serialized.includes("DO-NOT-STORE"), false);
    });
  }
});

describe("authorDraftReviewNotificationBuilder - safety", () => {
  test("notification payload does not include unsafe manuscript, prompt, raw model, or provider content", () => {
    const result = buildAuthorDraftReviewNotification(makeInput());
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("extractedManuscriptContent"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("mailProviderResponse"), false);
  });

  test("module exports no author-facing mail, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const builder = require("../src/author/authorDraftReviewNotificationBuilder");
    const exportedNames = Object.keys(builder).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("graphmail"), false);
    assert.equal(exportedNames.includes("sendevent"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("rundiagnostic"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });

  test("validateReviewNotificationInput succeeds for pending human approval draft", () => {
    assert.deepEqual(validateReviewNotificationInput(makeInput()), { ok: true });
  });
});
