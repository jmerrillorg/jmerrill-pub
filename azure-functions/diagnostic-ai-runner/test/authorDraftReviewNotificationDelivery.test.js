"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorDraftReviewNotification
} = require("../src/author/authorDraftReviewNotificationBuilder");
const {
  buildAuthorDraftReviewNotificationPersistenceRecord,
  persistAuthorDraftReviewNotification,
  validateNotificationForPersistence,
  EXECUTION_LOG_ENTITY_SET,
  DELIVERY_INTENT,
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS
} = require("../src/author/authorDraftReviewNotificationPersister");
const {
  buildInternalAuthorDraftReviewNotificationEmail,
  sendInternalAuthorDraftReviewNotification,
  validateInternalNotificationMailInput,
  INTERNAL_MAIL_ERROR_CODE
} = require("../src/author/internalAuthorDraftReviewNotificationMailer");
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
  draftBody: "Thank you for sharing your work with J Merrill Publishing. This prepared draft is ready for human review.",
  sendStatus: DRAFT_STATUS,
  approvalStatus: DRAFT_APPROVAL_STATUS,
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true
});

function buildNotification(overrides = {}) {
  const result = buildAuthorDraftReviewNotification({
    diagnosticId: baseDraftPayload.diagnosticId,
    intakeReferenceCode: baseDraftPayload.intakeReferenceCode,
    notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
    draftPayload: {
      ...baseDraftPayload,
      ...(overrides.draftPayload || {})
    },
    reviewPayload: {
      confidence: 0.79,
      diagnosticRiskFlags: "Needs Human Review",
      ...(overrides.reviewPayload || {})
    },
    metadata: {
      correlationId: "INT-PUB-005-INTERNAL-NOTIFICATION",
      executionId: "EXEC-INTERNAL-NOTIFICATION",
      ...(overrides.metadata || {})
    },
    dataverseRecordReference: "jm1pub_editorialdiagnostics(64e387e0-7e6a-f111-a826-00224820105b)"
  });

  assert.equal(result.ok, true);
  return {
    ...result.notification,
    ...(overrides.notification || {})
  };
}

function persistenceInput(overrides = {}) {
  return {
    notification: buildNotification(overrides),
    deliveryStatus: overrides.deliveryStatus || INTERNAL_NOTIFICATION_STATUS.PREPARED,
    persistedAt: "2026-06-18T12:00:00.000Z"
  };
}

function mailInput(overrides = {}) {
  return {
    notification: buildNotification(overrides),
    ...(overrides.mail || {})
  };
}

function assertInvalid(result, reason, code = undefined) {
  assert.equal(result.ok, false);
  if (code) assert.equal(result.code, code);
  assert.equal(result.reason, reason);
}

describe("author draft review notification persistence - valid record", () => {
  test("valid internal notification can produce a safe execution-log persistence record", () => {
    const result = buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput());

    assert.equal(result.ok, true);
    assert.equal(result.entitySet, EXECUTION_LOG_ENTITY_SET);
    assert.equal(result.persistenceRecord.eventType, "AUTHOR_DRAFT_READY_FOR_REVIEW");
    assert.equal(result.persistenceRecord.diagnosticId, baseDraftPayload.diagnosticId);
    assert.equal(result.persistenceRecord.intakeReferenceCode, baseDraftPayload.intakeReferenceCode);
    assert.equal(result.persistenceRecord.notificationRecipient, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.persistenceRecord.deliveryIntent, DELIVERY_INTENT);
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.PREPARED);
    assert.equal(result.persistenceRecord.authorEmailStatus, AUTHOR_EMAIL_STATUS);
    assert.equal(result.persistenceRecord.sendStatus, DRAFT_STATUS);
    assert.equal(result.persistenceRecord.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_actiontype, "AUTHOR_DRAFT_READY_FOR_REVIEW");
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_sourcerecordid, baseDraftPayload.diagnosticId);
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_actiondescription.includes("No author email sent"), true);
  });

  test("persistence record excludes unsafe content", () => {
    const result = buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput());
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("extractedManuscriptContent"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("mailProviderResponse"), false);
    assert.equal(serialized.includes("AUTHOR_EMAIL_SENT"), false);
    assert.equal(serialized.includes("SENT_TO_AUTHOR"), false);
    assert.equal(serialized.includes("FLOW_D_READY"), false);
    assert.equal(serialized.includes("OPPORTUNITY_READY"), false);
  });

  test("valid internal notification persists through injected Dataverse client", async () => {
    const calls = [];
    const client = {
      async createRecord(entitySet, payload) {
        calls.push({ entitySet, payload });
        return { id: "execution-log-id" };
      }
    };

    const result = await persistAuthorDraftReviewNotification(persistenceInput(), client);

    assert.equal(result.ok, true);
    assert.equal(result.id, "execution-log-id");
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.PREPARED);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].entitySet, EXECUTION_LOG_ENTITY_SET);
    assert.equal(calls[0].payload.jm1_actiondescription.includes("No manuscript text stored"), true);
  });
});

describe("internal author draft review notification mailer - valid delivery", () => {
  test("valid internal notification builds internal email message", () => {
    const result = buildInternalAuthorDraftReviewNotificationEmail(mailInput());

    assert.equal(result.ok, true);
    assert.deepEqual(result.email.to, [INTERNAL_VISIBILITY_MAILBOX]);
    assert.deepEqual(result.email.cc, []);
    assert.deepEqual(result.email.bcc, []);
    assert.equal(result.email.subject.includes(baseDraftPayload.intakeReferenceCode), true);
    assert.equal(result.email.body.includes("Internal notification only."), true);
    assert.equal(result.email.body.includes("No author email has been sent."), true);
    assert.equal(result.email.body.includes("Next action: Review the prepared author-response draft"), true);
    assert.equal(result.email.body.includes("Author-facing send remains blocked"), true);
    assert.equal(result.email.body.includes(`Author Email (reference only): ${baseDraftPayload.authorEmail}`), true);
    assert.equal(result.email.body.includes("AUTHOR_EMAIL_SENT"), false);
    assert.equal(result.email.body.includes("SENT_TO_AUTHOR"), false);
  });

  test("valid internal notification sends through injected internal provider", async () => {
    const sent = [];
    const provider = {
      async send(email) {
        sent.push(email);
        return { messageId: "internal-message-id" };
      }
    };

    const result = await sendInternalAuthorDraftReviewNotification(mailInput(), provider);

    assert.equal(result.ok, true);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.SENT);
    assert.equal(result.providerMessageId, "internal-message-id");
    assert.equal(result.notificationRecipient, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.authorEmailStatus, AUTHOR_EMAIL_STATUS);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].to, [INTERNAL_VISIBILITY_MAILBOX]);
  });
});

describe("author draft review notification delivery - fail closed", () => {
  test("missing diagnosticId fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { diagnosticId: "" } })), "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { intakeReferenceCode: "" } })), "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("wrong notification type fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { notificationType: "OTHER" } })), "NOTIFICATION_TYPE_INVALID");
  });

  test("wrong recipient fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { notificationRecipient: "publishing@jmerrill.pub" } })), "NOTIFICATION_RECIPIENT_INVALID");
  });

  test("recipient list including author fails", () => {
    assertInvalid(buildInternalAuthorDraftReviewNotificationEmail(mailInput({ mail: { to: ["publishing@jmerrill.one", baseDraftPayload.authorEmail] } })), "AUTHOR_RECIPIENT_BLOCKED", INTERNAL_MAIL_ERROR_CODE);
  });

  test("cc including author fails", () => {
    assertInvalid(buildInternalAuthorDraftReviewNotificationEmail(mailInput({ mail: { cc: [baseDraftPayload.authorEmail] } })), "AUTHOR_RECIPIENT_BLOCKED", INTERNAL_MAIL_ERROR_CODE);
  });

  test("bcc including author fails", () => {
    assertInvalid(buildInternalAuthorDraftReviewNotificationEmail(mailInput({ mail: { bcc: [baseDraftPayload.authorEmail] } })), "AUTHOR_RECIPIENT_BLOCKED", INTERNAL_MAIL_ERROR_CODE);
  });

  test("unapproved cc fails", () => {
    assertInvalid(buildInternalAuthorDraftReviewNotificationEmail(mailInput({ mail: { cc: ["ops@jmerrill.one"] } })), "CC_BCC_NOT_ALLOWED", INTERNAL_MAIL_ERROR_CODE);
  });

  test("send status other than DRAFT_ONLY fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { draftStatus: "QUEUED_TO_AUTHOR" } })), "SEND_STATUS_NOT_DRAFT_ONLY");
  });

  test("approval status other than PENDING_HUMAN_APPROVAL fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { approvalStatus: "APPROVED_FOR_SEND_PREPARATION" } })), "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL");
  });

  test("missing future internal copy flag fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { futureSendRequiresInternalCopy: undefined } })), "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("missing future Dataverse send-log flag fails", () => {
    assertInvalid(buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({ notification: { futureSendRequiresDataverseLog: undefined } })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  const unsafeCases = [
    ["sendNow flag", { notification: { sendNow: true } }],
    ["sentAt field", { notification: { sentAt: "2026-06-18T12:00:00.000Z" } }],
    ["emailSent field", { notification: { emailSent: true } }],
    ["provider message ID", { notification: { providerMessageId: "DO-NOT-STORE" } }],
    ["Opportunity field", { notification: { opportunityPayload: "DO NOT RETURN" } }],
    ["Flow D trigger", { notification: { flowDTrigger: true } }],
    ["manuscript text", { notification: { manuscriptText: "SECRET MANUSCRIPT" } }],
    ["prompt body", { notification: { promptBody: "SECRET PROMPT" } }],
    ["raw model response", { notification: { rawModelResponse: "SECRET RAW" } }],
    ["secret", { notification: { secret: "SECRET VALUE" } }],
    ["token", { notification: { tokens: "SECRET TOKEN" } }],
    ["key", { notification: { apiKey: "SECRET KEY" } }],
    ["header", { notification: { headers: { authorization: "Bearer SECRET" } } }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, () => {
      const result = buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput(unsafe));
      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes("SECRET"), false);
      assert.equal(serialized.includes("DO NOT RETURN"), false);
      assert.equal(serialized.includes("DO-NOT-STORE"), false);
    });
  }

  test("missing Dataverse client fails safely", async () => {
    const result = await persistAuthorDraftReviewNotification(persistenceInput(), null);
    assertInvalid(result, "DATAVERSE_CLIENT_MISSING");
  });

  test("Dataverse rejection fails safely", async () => {
    const result = await persistAuthorDraftReviewNotification(persistenceInput(), {
      async createRecord() {
        throw new Error("reject with SECRET");
      }
    });
    assertInvalid(result, "DATAVERSE_WRITE_FAILED");
    assert.equal(JSON.stringify(result).includes("SECRET"), false);
  });

  test("missing mail provider fails safely when live delivery is attempted", async () => {
    const result = await sendInternalAuthorDraftReviewNotification(mailInput(), null);
    assertInvalid(result, "INTERNAL_MAIL_PROVIDER_MISSING", INTERNAL_MAIL_ERROR_CODE);
  });

  test("mail provider rejection fails safely", async () => {
    const result = await sendInternalAuthorDraftReviewNotification(mailInput(), {
      async send() {
        throw new Error("reject with SECRET");
      }
    });
    assertInvalid(result, "INTERNAL_MAIL_PROVIDER_REJECTED", INTERNAL_MAIL_ERROR_CODE);
    assert.equal(JSON.stringify(result).includes("SECRET"), false);
  });
});

describe("author draft review notification delivery - safety", () => {
  test("error results do not leak draft body, manuscript text, prompt body, raw model output, secrets, tokens, keys, or headers", () => {
    const result = buildAuthorDraftReviewNotificationPersistenceRecord(persistenceInput({
      notification: {
        manuscriptText: "SECRET MANUSCRIPT",
        promptBody: "SECRET PROMPT",
        rawModelResponse: "SECRET RAW",
        headers: { authorization: "Bearer SECRET" }
      }
    }));

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("SECRET MANUSCRIPT"), false);
    assert.equal(serialized.includes("SECRET PROMPT"), false);
    assert.equal(serialized.includes("SECRET RAW"), false);
    assert.equal(serialized.includes("Bearer SECRET"), false);
  });

  test("modules export no author-facing mail, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const persister = require("../src/author/authorDraftReviewNotificationPersister");
    const mailer = require("../src/author/internalAuthorDraftReviewNotificationMailer");
    const exportedNames = `${Object.keys(persister).join(" ")} ${Object.keys(mailer).join(" ")}`.toLowerCase();

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

  test("validators succeed for the governed internal notification", () => {
    assert.deepEqual(validateNotificationForPersistence(persistenceInput()), { ok: true });
    assert.deepEqual(validateInternalNotificationMailInput(mailInput()), { ok: true });
  });
});
