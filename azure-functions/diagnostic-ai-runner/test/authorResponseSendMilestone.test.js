"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorResponseSendApproval,
  AUTHOR_RESPONSE_SEND_DECISION,
  AUTHOR_RESPONSE_SEND_STATUS
} = require("../src/author/authorResponseSendApprovalModel");
const {
  getAuthorResponseSendProviderConfig,
  buildAuthorResponseEmail,
  sendConfiguredAuthorResponse,
  ENV_VARS,
  PROVIDER
} = require("../src/author/authorResponseSendProviderConfig");
const {
  buildAuthorResponseSendLogRecord,
  persistAuthorResponseSendLog
} = require("../src/author/authorResponseSendPersister");
const {
  SEND_PREPARATION_STATUS,
  DELIVERY_STATUS
} = require("../src/author/authorDraftSendPreparationBuilder");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  TEMPLATE_NAME
} = require("../src/author/authorResponseDraftBuilder");

const sendPreparationRecord = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  authorEmail: "author@example.com",
  authorName: "Jackie",
  projectTitle: "TEST - Stage 0 Submission",
  draftSubject: "Next step for your J Merrill Publishing submission",
  draftBody: "Thank you for sharing your work with J Merrill Publishing. This is the approved response body.",
  templateName: TEMPLATE_NAME,
  sendPreparationStatus: SEND_PREPARATION_STATUS,
  deliveryStatus: DELIVERY_STATUS,
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true
});

function approval(overrides = {}) {
  const result = buildAuthorResponseSendApproval({
    sendPreparationRecord: {
      ...sendPreparationRecord,
      ...(overrides.record || {})
    },
    decision: overrides.decision || AUTHOR_RESPONSE_SEND_DECISION.APPROVE_AUTHOR_SEND,
    reviewerId: overrides.reviewerId || "jackie",
    reviewerNotes: overrides.reviewerNotes || "Approved for controlled author response send.",
    approvedOn: "2026-06-18T12:00:00.000Z",
    metadata: {
      correlationId: "INT-PUB-005-MILESTONE-5-TEST"
    },
    ...(overrides.input || {})
  });
  assert.equal(result.ok, true);
  return result.sendApproval;
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

function assertSafeFailure(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("MANUSCRIPT"), false);
  assert.equal(serialized.includes("PROMPT"), false);
}

describe("author response send approval model", () => {
  test("APPROVE_AUTHOR_SEND records approval but does not send", () => {
    const sendApproval = approval();

    assert.equal(sendApproval.sendApproved, true);
    assert.equal(sendApproval.sendStatus, AUTHOR_RESPONSE_SEND_STATUS.APPROVED);
    assert.equal(sendApproval.deliveryStatus, AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT);
    assert.equal(sendApproval.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
  });

  test("approval requires reviewer ID", () => {
    const result = buildAuthorResponseSendApproval({
      sendPreparationRecord,
      decision: AUTHOR_RESPONSE_SEND_DECISION.APPROVE_AUTHOR_SEND,
      reviewerId: ""
    });

    assertSafeFailure(result, "REVIEWER_ID_MISSING");
  });

  test("revision and reject require notes", () => {
    for (const decision of [
      AUTHOR_RESPONSE_SEND_DECISION.NEEDS_AUTHOR_RESPONSE_REVISION,
      AUTHOR_RESPONSE_SEND_DECISION.REJECT_AUTHOR_SEND
    ]) {
      const result = buildAuthorResponseSendApproval({
        sendPreparationRecord,
        decision,
        reviewerId: "jackie"
      });

      assertSafeFailure(result, "REVIEWER_NOTES_REQUIRED");
    }
  });

  test("non-approve decisions do not permit send", () => {
    const result = buildAuthorResponseSendApproval({
      sendPreparationRecord,
      decision: AUTHOR_RESPONSE_SEND_DECISION.HOLD_AUTHOR_SEND,
      reviewerId: "jackie"
    });

    assert.equal(result.ok, true);
    assert.equal(result.sendApproval.sendApproved, false);
    assert.equal(result.sendApproval.sendStatus, AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT);
  });

  test("unsafe fields fail without leaking content", () => {
    const result = buildAuthorResponseSendApproval({
      sendPreparationRecord: {
        ...sendPreparationRecord,
        manuscriptText: "SECRET MANUSCRIPT",
        promptBody: "SECRET PROMPT"
      },
      decision: AUTHOR_RESPONSE_SEND_DECISION.APPROVE_AUTHOR_SEND,
      reviewerId: "jackie"
    });

    assertSafeFailure(result, "UNSAFE_FIELD_PRESENT");
  });
});

describe("author response provider boundary", () => {
  test("send gate is disabled by default", () => {
    const config = getAuthorResponseSendProviderConfig({});

    assert.equal(config.ok, true);
    assert.equal(config.enabled, false);
    assert.equal(config.deliveryStatus, AUTHOR_RESPONSE_SEND_STATUS.DISABLED);
  });

  test("disabled gate prevents live provider call", async () => {
    let providerCalled = false;
    const result = await sendConfiguredAuthorResponse({
      input: { sendApproval: approval() },
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
    assert.equal(result.deliveryStatus, AUTHOR_RESPONSE_SEND_STATUS.DISABLED);
    assert.equal(result.authorEmailStatus, AUTHOR_RESPONSE_SEND_STATUS.NOT_SENT);
    assert.equal(result.providerCalled, false);
    assert.equal(providerCalled, false);
  });

  test("valid enabled config sends only to author and copies internal visibility mailbox", async () => {
    const calls = [];
    const sendApproval = approval();
    const result = await sendConfiguredAuthorResponse({
      input: { sendApproval },
      env: enabledEnv(),
      providers: {
        injected: {
          async send(message) {
            calls.push(message);
            return { messageId: "author-response-message-id" };
          }
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.deliveryStatus, AUTHOR_RESPONSE_SEND_STATUS.SENT);
    assert.equal(result.internalVisibilityStatus, AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].to, [sendPreparationRecord.authorEmail]);
    assert.deepEqual(calls[0].cc, [INTERNAL_VISIBILITY_MAILBOX]);
    assert.deepEqual(calls[0].bcc, []);
    assert.equal(calls[0].from, "publishing@jmerrill.one");
    assert.equal(calls[0].replyTo, "publishing@jmerrill.one");
  });

  test("author recipient must be the approved intake author email", () => {
    const result = buildAuthorResponseEmail({
      sendApproval: approval(),
      to: "other@example.com"
    }, getAuthorResponseSendProviderConfig(enabledEnv()));

    assertSafeFailure(result, "AUTHOR_RECIPIENT_INVALID");
  });

  test("publishing@jmerrill.one copy is required", () => {
    const result = buildAuthorResponseEmail({
      sendApproval: approval(),
      cc: []
    }, getAuthorResponseSendProviderConfig(enabledEnv()));

    assertSafeFailure(result, "INTERNAL_VISIBILITY_REQUIRED");
  });

  test("@jmerrill.pub is rejected as sender, reply-to, or recipient", () => {
    assertSafeFailure(buildAuthorResponseEmail(
      { sendApproval: approval() },
      getAuthorResponseSendProviderConfig(enabledEnv({ [ENV_VARS.from]: "publishing@jmerrill.pub" }))
    ), "AUTHOR_RESPONSE_SEND_FROM_INVALID");

    assertSafeFailure(buildAuthorResponseEmail(
      { sendApproval: approval() },
      getAuthorResponseSendProviderConfig(enabledEnv({ [ENV_VARS.replyTo]: "publishing@jmerrill.pub" }))
    ), "AUTHOR_RESPONSE_SEND_REPLY_TO_INVALID");

    assertSafeFailure(buildAuthorResponseEmail(
      { sendApproval: approval({ record: { authorEmail: "author@jmerrill.pub" } }) },
      getAuthorResponseSendProviderConfig(enabledEnv())
    ), "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
  });

  test("missing provider fails when enabled", async () => {
    const result = await sendConfiguredAuthorResponse({
      input: { sendApproval: approval() },
      env: enabledEnv(),
      providers: {}
    });

    assertSafeFailure(result, "AUTHOR_RESPONSE_SEND_PROVIDER_MISSING");
  });

  test("provider rejection fails safely", async () => {
    const result = await sendConfiguredAuthorResponse({
      input: { sendApproval: approval() },
      env: enabledEnv(),
      providers: {
        injected: {
          async send() {
            throw new Error("SECRET provider response");
          }
        }
      }
    });

    assertSafeFailure(result, "AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED");
    assert.equal(result.deliveryStatus, AUTHOR_RESPONSE_SEND_STATUS.FAILED);
  });
});

describe("author response Dataverse send logging", () => {
  test("builds safe jm1_executionlogs metadata for sent author response", () => {
    const sendApproval = approval();
    const deliveryResult = {
      ok: true,
      deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
      internalVisibilityStatus: AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED,
      providerName: PROVIDER.INJECTED,
      providerMessageId: "author-response-message-id"
    };
    const result = buildAuthorResponseSendLogRecord({ sendApproval, deliveryResult });

    assert.equal(result.ok, true);
    assert.equal(result.entitySet, "jm1_executionlogs");
    assert.equal(result.persistenceRecord.eventType, "AUTHOR_RESPONSE_SENT");
    assert.equal(result.persistenceRecord.authorEmail, sendPreparationRecord.authorEmail);
    assert.equal(result.persistenceRecord.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.persistenceRecord.dataverseSendLogStatus, AUTHOR_RESPONSE_SEND_STATUS.DATAVERSE_SEND_LOG_CREATED);
    const serialized = JSON.stringify(result.persistenceRecord);
    assert.equal(serialized.includes(sendPreparationRecord.draftBody), false);
    assert.equal(serialized.includes("OPPORTUNITY_READY"), false);
    assert.equal(serialized.includes("FLOW_D_READY"), false);
    assert.equal(serialized.includes("PRODUCTION_READY"), false);
  });

  test("fails if internal visibility was not satisfied", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: approval(),
      deliveryResult: {
        deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT
      }
    });

    assertSafeFailure(result, "INTERNAL_VISIBILITY_NOT_SATISFIED");
  });

  test("persists only safe execution-log payload through injected Dataverse client", async () => {
    const calls = [];
    const result = await persistAuthorResponseSendLog({
      sendApproval: approval(),
      deliveryResult: {
        deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
        internalVisibilityStatus: AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED,
        providerName: PROVIDER.INJECTED,
        providerMessageId: "author-response-message-id"
      }
    }, {
      async createRecord(entitySet, payload) {
        calls.push({ entitySet, payload });
        return { id: "execution-log-id" };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.dataverseSendLogStatus, AUTHOR_RESPONSE_SEND_STATUS.DATAVERSE_SEND_LOG_CREATED);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].entitySet, "jm1_executionlogs");
    assert.equal(JSON.stringify(calls[0].payload).includes(sendPreparationRecord.draftBody), false);
  });
});
