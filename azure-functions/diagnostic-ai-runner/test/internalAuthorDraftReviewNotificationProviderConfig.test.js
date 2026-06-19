"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorDraftReviewNotification
} = require("../src/author/authorDraftReviewNotificationBuilder");
const {
  getInternalNotificationProviderConfig,
  buildConfiguredInternalNotificationEmail,
  deliverConfiguredInternalAuthorDraftReviewNotification,
  ENV_VARS,
  PROVIDER,
  CONFIG_ERROR_CODE
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
      diagnosticRiskFlags: "Needs Human Review"
    },
    metadata: {
      correlationId: "INT-PUB-005-PROVIDER-CONFIG-TEST"
    }
  });

  assert.equal(result.ok, true);
  return {
    ...result.notification,
    ...(overrides.notification || {})
  };
}

function input(overrides = {}) {
  return {
    notification: buildNotification(overrides),
    ...(overrides.mail || {})
  };
}

function enabledEnv(overrides = {}) {
  return {
    [ENV_VARS.enabled]: "true",
    [ENV_VARS.provider]: PROVIDER.INJECTED,
    [ENV_VARS.from]: "publishing@jmerrill.one",
    [ENV_VARS.replyTo]: "publishing@jmerrill.one",
    ...overrides
  };
}

function assertConfigFailure(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.code, CONFIG_ERROR_CODE);
  assert.equal(result.reason, reason);
}

describe("internal notification provider config - configuration gate", () => {
  test("internal notifications are disabled by default", () => {
    const config = getInternalNotificationProviderConfig({});

    assert.equal(config.ok, true);
    assert.equal(config.enabled, false);
    assert.equal(config.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.DISABLED);
  });

  test("disabled config prepares email but marks delivery disabled", () => {
    const result = buildConfiguredInternalNotificationEmail(input(), getInternalNotificationProviderConfig({}));

    assert.equal(result.ok, true);
    assert.equal(result.disabled, true);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.DISABLED);
    assert.deepEqual(result.email.to, [INTERNAL_VISIBILITY_MAILBOX]);
    assert.equal(result.email.from, null);
    assert.equal(result.email.replyTo, null);
  });

  test("enabled config accepts injected provider with jmerrill.one sender", () => {
    const config = getInternalNotificationProviderConfig(enabledEnv());

    assert.equal(config.ok, true);
    assert.equal(config.enabled, true);
    assert.equal(config.providerName, PROVIDER.INJECTED);
    assert.equal(config.from, "publishing@jmerrill.one");
    assert.equal(config.replyTo, "publishing@jmerrill.one");
  });

  test("missing provider config fails safely when enabled", () => {
    const config = getInternalNotificationProviderConfig({
      [ENV_VARS.enabled]: "true",
      [ENV_VARS.from]: "publishing@jmerrill.one"
    });

    assert.equal(config.ok, false);
    assert.equal(config.reason, "INTERNAL_NOTIFICATION_PROVIDER_MISSING");
  });

  test("unknown provider fails safely", () => {
    const config = getInternalNotificationProviderConfig(enabledEnv({ [ENV_VARS.provider]: "smtp" }));

    assert.equal(config.ok, false);
    assert.equal(config.reason, "INTERNAL_NOTIFICATION_PROVIDER_UNSUPPORTED");
  });

  test("@jmerrill.pub sender fails", () => {
    const config = getInternalNotificationProviderConfig(enabledEnv({ [ENV_VARS.from]: "publishing@jmerrill.pub" }));

    assert.equal(config.ok, false);
    assert.equal(config.reason, "INTERNAL_NOTIFICATION_FROM_INVALID");
  });
});

describe("internal notification provider config - delivery", () => {
  test("disabled config does not call provider and creates disabled safe log payload", async () => {
    let providerCalled = false;
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input(),
      env: {},
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
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.DISABLED);
    assert.equal(result.persistenceRecord.authorEmailStatus, AUTHOR_EMAIL_STATUS);
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_actiondescription.includes("INTERNAL_NOTIFICATION_DISABLED"), true);
  });

  test("enabled config calls provider only when safety checks pass", async () => {
    const calls = [];
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send(message) {
            calls.push(message);
            return { messageId: "internal-provider-message-id" };
          }
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.SENT);
    assert.equal(result.providerCalled, true);
    assert.equal(result.providerMessageId, "internal-provider-message-id");
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].to, [INTERNAL_VISIBILITY_MAILBOX]);
    assert.deepEqual(calls[0].cc, []);
    assert.deepEqual(calls[0].bcc, []);
    assert.equal(calls[0].from, "publishing@jmerrill.one");
    assert.equal(calls[0].replyTo, "publishing@jmerrill.one");
    assert.equal(calls[0].subject.includes(baseDraftPayload.intakeReferenceCode), true);
    assert.equal(calls[0].body.includes("No author email has been sent."), true);
    assert.equal(calls[0].body.includes("Safe preview:"), true);
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.SENT);
    assert.equal(result.persistenceRecord.providerName, PROVIDER.INJECTED);
    assert.equal(result.persistenceRecord.internalProviderMessageId, "internal-provider-message-id");
  });

  test("missing injected provider fails safely when enabled", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input(),
      env: enabledEnv(),
      providers: {}
    });

    assertConfigFailure(result, "INTERNAL_MAIL_PROVIDER_MISSING");
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
    assert.equal(result.persistenceRecord.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
  });

  test("provider rejection fails safely", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send() {
            throw new Error("provider rejected with SECRET");
          }
        }
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "INTERNAL_MAIL_PROVIDER_REJECTED");
    assert.equal(result.deliveryStatus, INTERNAL_NOTIFICATION_STATUS.FAILED);
    assert.equal(JSON.stringify(result).includes("SECRET"), false);
  });
});

describe("internal notification provider config - recipient and fail-closed safety", () => {
  test("recipient must be exactly publishing@jmerrill.one", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ notification: { notificationRecipient: "ops@jmerrill.one" } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "NOTIFICATION_RECIPIENT_INVALID");
  });

  test("author cannot appear in To", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ mail: { to: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("author cannot appear in CC", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ mail: { cc: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("author cannot appear in BCC", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ mail: { bcc: [baseDraftPayload.authorEmail] } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("unapproved internal recipient fails", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ mail: { to: ["ops@jmerrill.one"] } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "TO_RECIPIENT_INVALID");
  });

  test("@jmerrill.pub recipient fails", async () => {
    const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input({ mail: { to: ["publishing@jmerrill.pub"] } }),
      env: enabledEnv(),
      providers: { injected: { async send() {} } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "TO_RECIPIENT_INVALID");
  });

  const unsafeCases = [
    ["wrong notification type", { notification: { notificationType: "OTHER" } }, "NOTIFICATION_TYPE_INVALID"],
    ["wrong send status", { notification: { draftStatus: "QUEUED_TO_AUTHOR" } }, "SEND_STATUS_NOT_DRAFT_ONLY"],
    ["wrong approval status", { notification: { approvalStatus: "APPROVED_FOR_SEND_PREPARATION" } }, "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL"],
    ["missing future internal copy", { notification: { futureSendRequiresInternalCopy: undefined } }, "FUTURE_INTERNAL_COPY_REQUIRED"],
    ["missing future Dataverse log", { notification: { futureSendRequiresDataverseLog: undefined } }, "FUTURE_DATAVERSE_SEND_LOG_REQUIRED"],
    ["missing diagnosticId", { notification: { diagnosticId: "" } }, "DIAGNOSTIC_ID_INVALID"],
    ["missing intakeReferenceCode", { notification: { intakeReferenceCode: "" } }, "INTAKE_REFERENCE_CODE_INVALID"],
    ["missing draft preview", { notification: { draftBodyPreview: "" } }, "DRAFT_PREVIEW_MISSING"],
    ["sendNow flag", { notification: { sendNow: true } }, "UNSAFE_FIELD_PRESENT"],
    ["sent marker", { notification: { emailSent: true } }, "UNSAFE_FIELD_PRESENT"],
    ["provider message ID", { notification: { providerMessageId: "DO-NOT-STORE" } }, "UNSAFE_FIELD_PRESENT"],
    ["Opportunity field", { notification: { opportunityPayload: "DO NOT RETURN" } }, "UNSAFE_FIELD_PRESENT"],
    ["Flow D trigger", { notification: { flowDTrigger: true } }, "UNSAFE_FIELD_PRESENT"],
    ["manuscript text", { notification: { manuscriptText: "SECRET MANUSCRIPT" } }, "UNSAFE_FIELD_PRESENT"],
    ["prompt body", { notification: { promptBody: "SECRET PROMPT" } }, "UNSAFE_FIELD_PRESENT"],
    ["raw model response", { notification: { rawModelResponse: "SECRET RAW" } }, "UNSAFE_FIELD_PRESENT"],
    ["secret", { notification: { secret: "SECRET VALUE" } }, "UNSAFE_FIELD_PRESENT"],
    ["token", { notification: { tokens: "SECRET TOKEN" } }, "UNSAFE_FIELD_PRESENT"],
    ["key", { notification: { apiKey: "SECRET KEY" } }, "UNSAFE_FIELD_PRESENT"],
    ["header", { notification: { headers: { authorization: "Bearer SECRET" } } }, "UNSAFE_FIELD_PRESENT"]
  ];

  for (const [label, override, reason] of unsafeCases) {
    test(`${label} fails closed`, async () => {
      const result = await deliverConfiguredInternalAuthorDraftReviewNotification({
        input: input(override),
        env: enabledEnv(),
        providers: { injected: { async send() {} } }
      });

      assert.equal(result.ok, false);
      assert.equal(result.reason, reason);
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes("SECRET"), false);
      assert.equal(serialized.includes("DO NOT RETURN"), false);
      assert.equal(serialized.includes("DO-NOT-STORE"), false);
    });
  }
});

describe("internal notification provider config - safety", () => {
  test("log payloads exclude unsafe content and author-facing claims", async () => {
    const sent = await deliverConfiguredInternalAuthorDraftReviewNotification({
      input: input(),
      env: enabledEnv(),
      providers: {
        injected: {
          async send() {
            return { messageId: "internal-message-id" };
          }
        }
      }
    });

    const serialized = JSON.stringify(sent.persistenceRecord);
    assert.equal(serialized.includes("manuscriptText"), false);
    assert.equal(serialized.includes("promptBody"), false);
    assert.equal(serialized.includes("rawModelResponse"), false);
    assert.equal(serialized.includes("authorization"), false);
    assert.equal(serialized.includes("AUTHOR_EMAIL_SENT"), false);
    assert.equal(serialized.includes("SENT_TO_AUTHOR"), false);
    assert.equal(serialized.includes("QUEUED_TO_AUTHOR"), false);
    assert.equal(serialized.includes("FLOW_D_READY"), false);
    assert.equal(serialized.includes("OPPORTUNITY_READY"), false);
  });

  test("module exports no author-facing mail, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const config = require("../src/author/internalAuthorDraftReviewNotificationProviderConfig");
    const exportedNames = Object.keys(config).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("graphmail"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("rundiagnostic"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });
});
