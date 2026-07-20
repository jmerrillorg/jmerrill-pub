"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  readPublishingMailboxReply,
  GATE_NAME,
  PUBLISHING_MAILBOX,
  extractAuthorReplyText
} = require("../src/mail/publishingMailboxReader");

const originalFetch = global.fetch;
const originalEnv = { [GATE_NAME]: process.env[GATE_NAME] };

const SUBJECT = "Next steps for Establishing Glory: The Library";
const AFTER_ISO = "2026-06-21T01:20:45Z";
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

beforeEach(() => {
  delete process.env[GATE_NAME];
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function mockFetchSequence(responses) {
  let call = 0;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return response;
  };
  return calls;
}

function graphMessagesResponse(messages) {
  return {
    ok: true,
    async json() {
      return { value: messages };
    }
  };
}

function message(overrides = {}) {
  return {
    subject: "Next steps for Establishing Glory: The Library — Professional Publishing Package",
    from: { emailAddress: { address: "chosen2k7@gmail.com", name: "Jackie Smith Jr" } },
    toRecipients: [{ emailAddress: { address: PUBLISHING_MAILBOX, name: "J Merrill Publishing" } }],
    ccRecipients: [],
    receivedDateTime: "2026-06-21T02:00:00Z",
    bodyPreview: "8 payments",
    body: { content: "8 payments", contentType: "text" },
    conversationId: "conv-1",
    ...overrides
  };
}

describe("readPublishingMailboxReply — gate enforcement", () => {
  test("rejects when gate is absent (defaults closed), with zero network calls", async () => {
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(result.found, false);
    assert.equal(calls.length, 0);
  });

  test("rejects when gate is explicitly false", async () => {
    process.env[GATE_NAME] = "false";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("proceeds when gate is true", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
  });
});

describe("readPublishingMailboxReply — mailbox scope", () => {
  test("queries only the hardcoded publishing@jmerrill.one mailbox", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes(encodeURIComponent(PUBLISHING_MAILBOX)));
    assert.equal(PUBLISHING_MAILBOX, "publishing@jmerrill.one");
  });

  test("queries only the Inbox folder", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.ok(calls[0].url.includes("mailFolders/inbox/messages"));
  });

  test("ignores a caller-supplied mailbox override — there is no parameter for it", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO, mailbox: "attacker@example.com" }, FAKE_TOKEN_DEPS);
    assert.ok(!calls[0].url.includes("attacker"));
    assert.ok(calls[0].url.includes(encodeURIComponent(PUBLISHING_MAILBOX)));
  });

  test("the GET request uses method GET only", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(calls[0].options.method, "GET");
  });
});

describe("readPublishingMailboxReply — author-response filtering", () => {
  test("ignores outbound publishing copies even when the subject and body mention corrections", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      graphMessagesResponse([
        message({
          id: "outbound-copy",
          internetMessageId: "<outbound-copy@example>",
          subject: "Reply Requested: Proofreading Review Package - The Intentional Leader",
          from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
          toRecipients: [{ emailAddress: { address: "chosen2k7@gmail.com" } }],
          ccRecipients: [{ emailAddress: { address: PUBLISHING_MAILBOX } }],
          receivedDateTime: "2026-07-19T23:16:51Z",
          body: { content: "Please resend your approval, requested corrections, or question." },
          conversationId: "conv"
        })
      ])
    ]);
    const result = await readPublishingMailboxReply({ subjectContains: "Proofreading Review Package", afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);

    assert.equal(result.ok, true);
    assert.equal(result.found, false);
    assert.equal(result.code, "NO_MATCHING_REPLY_FOUND");
  });

  test("ignores quoted-only self replies", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      graphMessagesResponse([
        message({
          id: "self-reply",
          internetMessageId: "<self-reply@example>",
          subject: "Re: Reply Requested: Proofreading Review Package - The Intentional Leader",
          from: { emailAddress: { address: PUBLISHING_MAILBOX } },
          toRecipients: [{ emailAddress: { address: PUBLISHING_MAILBOX } }],
          ccRecipients: [],
          receivedDateTime: "2026-07-20T07:01:28Z",
          body: { content: "From: J Merrill Publishing <publishing@email.jmerrill.one>\nPlease resend your approval, requested corrections, or question." },
          conversationId: "conv"
        })
      ])
    ]);
    const result = await readPublishingMailboxReply({ subjectContains: "Proofreading Review Package", afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);

    assert.equal(result.ok, true);
    assert.equal(result.found, false);
  });

  test("extracts only the author's text above quoted history", () => {
    assert.equal(
      extractAuthorReplyText("I approve!\n\nFrom: J Merrill Publishing <publishing@email.jmerrill.one>\nPlease review."),
      "I approve!"
    );
  });
});

describe("readPublishingMailboxReply — subject/thread filtering", () => {
  test("filters by controlled subject and returns found=true on a match", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.found, true);
    assert.equal(result.code, "REPLY_FOUND");
  });

  test("ignores unrelated messages whose subject does not match", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      graphMessagesResponse([
        message({ subject: "Re: Your invoice is ready", bodyPreview: "unrelated" }),
        message({ subject: "Newsletter signup confirmation", bodyPreview: "unrelated" })
      ])
    ]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.found, false);
    assert.equal(result.code, "NO_MATCHING_REPLY_FOUND");
  });

  test("returns found=false (not an error) when zero messages exist", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([graphMessagesResponse([])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.found, false);
  });

  test("picks the most recent match when multiple matching messages exist", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      graphMessagesResponse([
        message({ receivedDateTime: "2026-06-21T05:00:00Z", bodyPreview: "8 payments", body: { content: "8 payments" } }),
        message({ receivedDateTime: "2026-06-21T02:00:00Z", bodyPreview: "single payment", body: { content: "single payment" } })
      ])
    ]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.receivedDateTime, "2026-06-21T05:00:00Z");
    assert.equal(result.bodyText, "8 payments");
  });
});

describe("readPublishingMailboxReply — input validation", () => {
  test("rejects missing subjectContains before any network call", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SUBJECT_FILTER_MISSING");
    assert.equal(calls.length, 0);
  });

  test("rejects a missing/invalid afterIso before any network call", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: "not-a-date" }, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AFTER_TIMESTAMP_INVALID");
    assert.equal(calls.length, 0);
  });
});

describe("readPublishingMailboxReply — Graph failure handling", () => {
  test("returns a blocked result on a non-ok Graph response", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([{ ok: false, status: 403, async json() { return {}; } }]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GRAPH_MAILBOX_READ_FAILED");
  });

  test("returns a blocked result when token acquisition fails", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply(
      { subjectContains: SUBJECT, afterIso: AFTER_ISO },
      { getToken: async () => { throw Object.assign(new Error("x"), { safeCode: "GRAPH_TOKEN_FAILED" }); } }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GRAPH_TOKEN_FAILED");
    assert.equal(calls.length, 0);
  });
});

describe("readPublishingMailboxReply — safety invariants", () => {
  test("never returns the raw Graph message object — only extracted safe fields", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    const keys = Object.keys(result).sort();
    assert.deepEqual(keys, [
      "bodyText",
      "ccRecipients",
      "code",
      "conversationId",
      "found",
      "inboundMessageId",
      "internetMessageId",
      "ok",
      "receivedDateTime",
      "senderAddress",
      "toRecipients"
    ]);
  });

  test("never logs or includes Authorization header value in the result", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([graphMessagesResponse([message()])]);
    const result = await readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS);
    assert.ok(!JSON.stringify(result).toLowerCase().includes("bearer"));
    assert.ok(!JSON.stringify(result).includes("fake-test-token"));
  });

  test("module exports no PATCH/POST/DELETE capability — read-only by source inspection", () => {
    const mod = require("../src/mail/publishingMailboxReader");
    const fnSource = mod.readPublishingMailboxReply.toString();
    assert.ok(!fnSource.includes("method: \"PATCH\""));
    assert.ok(!fnSource.includes("method: \"POST\""));
    assert.ok(!fnSource.includes("method: \"DELETE\""));
  });

  test("the Graph query never expands or requests attachments", () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([graphMessagesResponse([message()])]);
    return readPublishingMailboxReply({ subjectContains: SUBJECT, afterIso: AFTER_ISO }, FAKE_TOKEN_DEPS).then(() => {
      assert.ok(!calls[0].url.toLowerCase().includes("attachment"));
    });
  });
});
