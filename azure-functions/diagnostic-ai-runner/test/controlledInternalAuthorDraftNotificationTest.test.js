"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  runControlledInternalAuthorDraftNotificationTest,
  buildControlledNotification,
  normalizeControlledInput
} = require("../src/author/runControlledInternalAuthorDraftNotificationTest");
const {
  ENV_VARS,
  PROVIDER
} = require("../src/author/internalAuthorDraftReviewNotificationProviderConfig");
const {
  INTERNAL_NOTIFICATION_STATUS,
  AUTHOR_EMAIL_STATUS
} = require("../src/author/authorDraftReviewNotificationPersister");
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

function safeInput(overrides = {}) {
  return {
    diagnosticId: baseDraftPayload.diagnosticId,
    intakeReferenceCode: baseDraftPayload.intakeReferenceCode,
    notificationRecipient: INTERNAL_VISIBILITY_MAILBOX,
    draftPayload: {
      ...baseDraftPayload,
      ...(overrides.draftPayload || {})
    },
    reviewPayload: {
      confidence: 0.79,
      diagnosticRiskFlags: "Needs Human Review"
    },
    metadata: {
      correlationId: "INT-PUB-005-CONTROLLED-INTERNAL-NOTIFICATION-TEST"
    },
    ...(overrides.input || {})
  };
}

function enabledEnv(overrides = {}) {
  return {
    JM1_AI_EXECUTION_ENABLED: "false",
    [ENV_VARS.enabled]: "true",
    [ENV_VARS.provider]: PROVIDER.INJECTED,
    [ENV_VARS.from]: "publishing@jmerrill.one",
    [ENV_VARS.replyTo]: "publishing@jmerrill.one",
    ...overrides
  };
}

describe("controlled internal notification test - guardrails", () => {
  test("refuses to run if JM1_AI_EXECUTION_ENABLED=true", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: enabledEnv({ JM1_AI_EXECUTION_ENABLED: "true" })
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AI_EXECUTION_GATE_MUST_REMAIN_CLOSED");
  });

  test("refuses to run more than one notification", () => {
    assert.deepEqual(normalizeControlledInput({ notifications: [safeInput(), safeInput()] }), {
      ok: false,
      reason: "MULTIPLE_NOTIFICATIONS_NOT_ALLOWED"
    });
  });

  test("accepts exactly one notification in array form", () => {
    const result = normalizeControlledInput({ notifications: [safeInput()] });

    assert.equal(result.ok, true);
    assert.equal(result.input.notification.diagnosticId, baseDraftPayload.diagnosticId);
  });

  test("refuses wrong recipient", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput({ input: { notificationRecipient: "ops@jmerrill.one" } }),
      env: enabledEnv()
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "NOTIFICATION_RECIPIENT_INVALID");
  });

  test("refuses author in To", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput({ input: { to: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv()
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("refuses author in CC", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput({ input: { cc: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv()
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("refuses author in BCC", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput({ input: { bcc: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv()
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  const blockedCases = [
    ["wrong notification type", { notification: { notificationType: "OTHER" } }, "NOTIFICATION_TYPE_INVALID"],
    ["wrong send status", { draftPayload: { sendStatus: "QUEUED_TO_AUTHOR" } }, "SEND_STATUS_NOT_DRAFT_ONLY"],
    ["wrong approval status", { draftPayload: { approvalStatus: "APPROVED_FOR_SEND_PREPARATION" } }, "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL"],
    ["unsafe sendNow", { draftPayload: { sendNow: true } }, "UNSAFE_FIELD_PRESENT"],
    ["unsafe manuscript text", { draftPayload: { manuscriptText: "SECRET MANUSCRIPT" } }, "UNSAFE_FIELD_PRESENT"],
    ["unsafe prompt body", { draftPayload: { promptBody: "SECRET PROMPT" } }, "UNSAFE_FIELD_PRESENT"],
    ["unsafe raw model response", { draftPayload: { rawModelResponse: "SECRET RAW" } }, "UNSAFE_FIELD_PRESENT"],
    ["unsafe header", { draftPayload: { headers: { authorization: "Bearer SECRET" } } }, "UNSAFE_FIELD_PRESENT"]
  ];

  for (const [label, override, reason] of blockedCases) {
    test(`refuses ${label}`, async () => {
      const input = safeInput(override);
      if (override.notification) {
        const notification = buildControlledNotification(safeInput()).notification;
        input.notification = { ...notification, ...override.notification };
      }

      const result = await runControlledInternalAuthorDraftNotificationTest({
        input,
        env: enabledEnv()
      });

      assert.equal(result.ok, false);
      assert.equal(result.reason, reason);
      assert.equal(JSON.stringify(result).includes("SECRET"), false);
    });
  }
});

describe("controlled internal notification test - delivery behavior", () => {
  test("with internal gate disabled, provider is not called", async () => {
    let providerCalled = false;
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: { JM1_AI_EXECUTION_ENABLED: "false" },
      providers: {
        injected: {
          async send() {
            providerCalled = true;
          }
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.DISABLED);
    assert.equal(result.providerCalled, false);
    assert.equal(providerCalled, false);
    assert.equal(result.authorEmailStatus, AUTHOR_EMAIL_STATUS);
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.DISABLED);
  });

  test("with internal gate enabled and valid provider, provider is called once", async () => {
    const calls = [];
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send(message) {
            calls.push(message);
            return { messageId: "controlled-internal-message-id" };
          }
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.SENT);
    assert.equal(result.providerCalled, true);
    assert.equal(result.providerMessageId, "controlled-internal-message-id");
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].to, [INTERNAL_VISIBILITY_MAILBOX]);
    assert.deepEqual(calls[0].cc, []);
    assert.deepEqual(calls[0].bcc, []);
    assert.equal(calls[0].body.includes("No author email has been sent."), true);
    assert.equal(calls[0].body.includes("Safe preview:"), true);
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.SENT);
  });

  test("provider failure returns failed status and safe log payload", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send() {
            throw new Error("provider SECRET failure");
          }
        }
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
    assert.equal(result.reason, "INTERNAL_MAIL_PROVIDER_REJECTED");
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
    assert.equal(JSON.stringify(result).includes("SECRET"), false);
  });

  test("missing provider returns safe failure", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: enabledEnv(),
      providers: {}
    });

    assert.equal(result.ok, false);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
    assert.equal(result.reason, "INTERNAL_MAIL_PROVIDER_MISSING");
  });
});

describe("controlled internal notification test - logging safety", () => {
  test("successful log payload excludes unsafe content and author-send claims", async () => {
    const result = await runControlledInternalAuthorDraftNotificationTest({
      input: safeInput(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send() {
            return { messageId: "controlled-internal-message-id" };
          }
        }
      }
    });

    const serialized = JSON.stringify(result.persistenceRecord);
    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("authorization"), false);
    assert.equal(serialized.includes("AUTHOR_EMAIL_SENT"), false);
    assert.equal(serialized.includes("SENT_TO_AUTHOR"), false);
    assert.equal(serialized.includes("QUEUED_TO_AUTHOR"), false);
  });
});
