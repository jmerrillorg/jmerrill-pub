"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  runEnterpriseMailboxReadbackHealth,
  HEALTH_GATE_NAME,
  GOVERNED_MAILBOXES,
  MAX_PROOF_MESSAGES
} = require("../src/mail/enterpriseMailboxReadbackHealth");

const originalFetch = global.fetch;
const originalGate = process.env[HEALTH_GATE_NAME];
const originalPublishingGate = process.env.JM1_PUBLISHING_MAIL_READ_ENABLED;

beforeEach(() => {
  delete process.env[HEALTH_GATE_NAME];
  delete process.env.JM1_PUBLISHING_MAIL_READ_ENABLED;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalGate === undefined) delete process.env[HEALTH_GATE_NAME];
  else process.env[HEALTH_GATE_NAME] = originalGate;
  if (originalPublishingGate === undefined) delete process.env.JM1_PUBLISHING_MAIL_READ_ENABLED;
  else process.env.JM1_PUBLISHING_MAIL_READ_ENABLED = originalPublishingGate;
});

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

function mockFetchSequence(responses) {
  const calls = [];
  let index = 0;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    const item = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return item;
  };
  return calls;
}

const tokenDeps = {
  getToken: async () => "token",
  now: () => "2026-08-27T17:00:00.000Z"
};

describe("runEnterpriseMailboxReadbackHealth", () => {
  test("blocks closed by default and performs no Graph reads", async () => {
    const calls = mockFetchSequence([]);
    const result = await runEnterpriseMailboxReadbackHealth({ brand: "AIC" }, tokenDeps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("uses the existing Publishing mail-read gate when the enterprise health gate is absent", async () => {
    process.env.JM1_PUBLISHING_MAIL_READ_ENABLED = "true";
    const calls = mockFetchSequence([
      response(200, { id: GOVERNED_MAILBOXES.AIC.objectId }),
      response(200, { value: [{ displayName: "Inbox", totalItemCount: 3, unreadItemCount: 0 }] }),
      response(200, { value: [] }),
      response(200, { value: [] })
    ]);

    const result = await runEnterpriseMailboxReadbackHealth({ brand: "AIC" }, tokenDeps);
    assert.equal(result.ok, true);
    assert.equal(result.code, "ENTERPRISE_MAILBOX_READBACK_HEALTH_PASS");
    assert.equal(calls.length, 4);
  });

  test("probes AIC mailbox folders by canonical mail-read principal and uses GET only", async () => {
    process.env[HEALTH_GATE_NAME] = "true";
    const calls = mockFetchSequence([
      response(200, { id: GOVERNED_MAILBOXES.AIC.objectId }),
      response(200, { value: [] }),
      response(200, { value: [] }),
      response(200, { value: [] })
    ]);

    await runEnterpriseMailboxReadbackHealth({ brand: "AIC" }, tokenDeps);
    assert.equal(calls.length, 4);
    assert.ok(calls[0].url.includes(encodeURIComponent(GOVERNED_MAILBOXES.AIC.mailReadPrincipal)));
    assert.ok(calls.every((call) => call.options.method === "GET"));
    assert.ok(calls[1].url.includes("/mailFolders?"));
    assert.ok(calls[2].url.includes("/mailFolders/inbox/messages?"));
    assert.ok(calls[3].url.includes("/mailFolders/sentitems/messages?"));
  });

  test("returns failed probe details without exposing message body content", async () => {
    process.env[HEALTH_GATE_NAME] = "true";
    mockFetchSequence([
      response(200, { id: GOVERNED_MAILBOXES.AIC.objectId }),
      response(403, { error: { code: "ErrorAccessDenied" } }),
      response(403, { error: { code: "ErrorAccessDenied" } }),
      response(403, { error: { code: "ErrorAccessDenied" } })
    ]);

    const result = await runEnterpriseMailboxReadbackHealth({ brand: "AIC" }, tokenDeps);
    assert.equal(result.ok, false);
    assert.equal(result.probes.mailFolders.status, 403);
    assert.equal(result.probes.mailFolders.graphErrorCode, "ErrorAccessDenied");
    assert.equal(Object.prototype.hasOwnProperty.call(result, "body"), false);
  });

  test("treats user profile read as informational when mail folder readback passes", async () => {
    process.env[HEALTH_GATE_NAME] = "true";
    mockFetchSequence([
      response(403, { error: { code: "Authorization_RequestDenied" } }),
      response(200, { value: [{ displayName: "Inbox", totalItemCount: 3, unreadItemCount: 0 }] }),
      response(200, { value: [] }),
      response(200, { value: [] })
    ]);

    const result = await runEnterpriseMailboxReadbackHealth({ brand: "AIC" }, tokenDeps);
    assert.equal(result.ok, true);
    assert.equal(result.code, "ENTERPRISE_MAILBOX_READBACK_HEALTH_PASS");
    assert.equal(result.probes.userObject.result, "FAIL");
    assert.equal(result.probes.mailFolders.result, "PASS");
    assert.equal(result.mailbox.objectId, GOVERNED_MAILBOXES.AIC.objectId);
    assert.equal(result.mailbox.mailReadPrincipal, GOVERNED_MAILBOXES.AIC.primarySmtp);
  });

  test("bounded proof lookup returns safe metadata only", async () => {
    process.env[HEALTH_GATE_NAME] = "true";
    const calls = mockFetchSequence([
      response(200, { id: GOVERNED_MAILBOXES.AIC.objectId }),
      response(200, { value: [] }),
      response(200, { value: [] }),
      response(200, { value: [] }),
      response(200, {
        value: [{
          id: "message-id",
          internetMessageId: "<proof@example>",
          conversationId: "conversation",
          subject: "AIC controlled proof",
          from: { emailAddress: { address: "aic@email.agapeic.org" } },
          toRecipients: [{ emailAddress: { address: "aic@agapeic.org" } }],
          ccRecipients: [],
          replyTo: [{ emailAddress: { address: "aic@agapeic.org" } }],
          receivedDateTime: "2026-08-27T16:00:00Z",
          body: { content: "do not expose this" }
        }]
      })
    ]);

    const result = await runEnterpriseMailboxReadbackHealth({
      brand: "AIC",
      subjectContains: "controlled proof",
      afterIso: "2026-08-27T00:00:00Z"
    }, tokenDeps);

    assert.equal(result.ok, true);
    assert.equal(result.proof.matchCount, 1);
    assert.equal(result.proof.matches[0].from, "aic@email.agapeic.org");
    assert.equal(result.proof.matches[0].replyTo[0], "aic@agapeic.org");
    assert.equal(result.proof.matches[0].body, undefined);
    assert.ok(calls[4].url.includes(`$top=${MAX_PROOF_MESSAGES}`));
  });
});
