"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  verifyInternalNotificationProviderConfig,
  READY_STATUS,
  INCOMPLETE_STATUS,
  ENV_VARS
} = require("../src/author/verifyInternalNotificationProviderConfig");
const { PROVIDER } = require("../src/author/internalAuthorDraftReviewNotificationProviderConfig");
const { INTERNAL_VISIBILITY_MAILBOX } = require("../src/author/authorResponseDraftBuilder");

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

function assertIncomplete(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.status, INCOMPLETE_STATUS);
  assert.equal(result.reason, reason);
  assert.equal(JSON.stringify(result).includes("SECRET"), false);
  assert.equal(JSON.stringify(result).includes("TOKEN"), false);
}

describe("verify internal notification provider config - no-send readiness", () => {
  test("is disabled by default", () => {
    const result = verifyInternalNotificationProviderConfig({ env: { JM1_AI_EXECUTION_ENABLED: "false" } });

    assertIncomplete(result, "INTERNAL_NOTIFICATIONS_DISABLED");
    assert.equal(result.enabled, false);
  });

  test("returns ready when all governed Azure settings are present", () => {
    const result = verifyInternalNotificationProviderConfig({ env: enabledEnv() });

    assert.equal(result.ok, true);
    assert.equal(result.status, READY_STATUS);
    assert.equal(result.providerName, PROVIDER.INJECTED);
    assert.equal(result.fromConfigured, true);
    assert.equal(result.replyToConfigured, true);
    assert.equal(result.recipient, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.providerCalled, false);
    assert.equal(result.sendsEmail, false);
  });

  test("does not call a provider during readiness verification", () => {
    const provider = {
      send() {
        throw new Error("provider should not be called");
      }
    };

    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      providers: { injected: provider }
    });

    assert.equal(result.ok, true);
    assert.equal(result.providerCalled, false);
  });

  test("JM1_AI_EXECUTION_ENABLED=true blocks readiness", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ JM1_AI_EXECUTION_ENABLED: "true" })
    });

    assertIncomplete(result, "AI_EXECUTION_GATE_MUST_REMAIN_CLOSED");
  });

  test("missing provider fails when enabled", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.provider]: "" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_PROVIDER_MISSING");
  });

  test("unknown provider fails when enabled", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.provider]: "smtp" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_PROVIDER_UNSUPPORTED");
  });

  test("missing from fails when enabled", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.from]: "" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_FROM_INVALID");
  });

  test("missing reply-to fails when enabled", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.replyTo]: "" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_REPLY_TO_INVALID");
  });

  test("from must be @jmerrill.one", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.from]: "ops@example.com" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_FROM_INVALID");
  });

  test("reply-to must be @jmerrill.one", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.replyTo]: "ops@example.com" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_REPLY_TO_INVALID");
  });

  test("@jmerrill.pub is rejected as a live from mailbox", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.from]: "publishing@jmerrill.pub" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_FROM_INVALID");
  });

  test("@jmerrill.pub is rejected as a live reply-to mailbox", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({ [ENV_VARS.replyTo]: "publishing@jmerrill.pub" })
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_REPLY_TO_INVALID");
  });

  test("recipient must be publishing@jmerrill.one", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      to: "ops@jmerrill.one"
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_RECIPIENT_INVALID");
  });

  test("personal inbox recipient fails", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      to: "jackie@jmerrill.one"
    });

    assertIncomplete(result, "INTERNAL_NOTIFICATION_RECIPIENT_INVALID");
  });

  test("author cannot appear in To", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      to: "author@example.com",
      authorEmail: "author@example.com"
    });

    assertIncomplete(result, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("author cannot appear in CC", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      cc: ["author@example.com"],
      authorEmail: "author@example.com"
    });

    assertIncomplete(result, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("author cannot appear in BCC", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv(),
      bcc: ["author@example.com"],
      authorEmail: "author@example.com"
    });

    assertIncomplete(result, "AUTHOR_RECIPIENT_BLOCKED");
  });

  test("readiness failure does not leak secrets, tokens, keys, or headers", () => {
    const result = verifyInternalNotificationProviderConfig({
      env: enabledEnv({
        [ENV_VARS.provider]: "smtp",
        JM1_INTERNAL_NOTIFICATION_TOKEN: "SECRET_TOKEN_VALUE",
        JM1_INTERNAL_NOTIFICATION_API_KEY: "SECRET_KEY_VALUE",
        JM1_INTERNAL_NOTIFICATION_HEADERS: "Authorization: Bearer SECRET"
      })
    });

    const serialized = JSON.stringify(result);
    assertIncomplete(result, "INTERNAL_NOTIFICATION_PROVIDER_UNSUPPORTED");
    assert.equal(serialized.includes("SECRET"), false);
    assert.equal(serialized.includes("TOKEN"), false);
    assert.equal(serialized.includes("KEY"), false);
    assert.equal(serialized.includes("Authorization"), false);
  });
});
