"use strict";

const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  publishingMailboxAttachmentReadbackHandler
} = require("../src/functions/runPublishingMailboxAttachmentReadback");
const { GATE_NAME, PUBLISHING_MAILBOX, FILE_ATTACHMENT_TYPE } = require("../src/mail/publishingMailboxReader");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  JM1_DIAGNOSTIC_RUNNER_KEY: process.env.JM1_DIAGNOSTIC_RUNNER_KEY
};

function request(body, key = "test-key") {
  return {
    headers: {
      get(name) {
        return name.toLowerCase() === "x-jm1-diagnostic-runner-key" ? key : null;
      }
    },
    async json() {
      return body;
    }
  };
}

const context = { info() {}, warn() {} };
const deps = { getToken: async () => "fake-token" };

function graphResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}

beforeEach(() => {
  process.env.JM1_DIAGNOSTIC_RUNNER_KEY = "test-key";
  process.env[GATE_NAME] = "true";
  process.env.AZURE_CLIENT_ID = "";
  global.fetch = async () => graphResponse({ value: [] });
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("rejects missing runner key before mailbox access", async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
    return graphResponse({ value: [] });
  };

  const response = await publishingMailboxAttachmentReadbackHandler(
    request({ confirmPublishingMailboxAttachmentReadback: true, action: "LIST_ATTACHMENTS", messageId: "message-1" }, "wrong"),
    context,
    deps
  );

  assert.equal(response.status, 401);
  assert.equal(response.jsonBody.code, "UNAUTHORIZED");
  assert.equal(called, false);
});

test("requires explicit attachment-readback confirmation", async () => {
  const response = await publishingMailboxAttachmentReadbackHandler(
    request({ action: "LIST_ATTACHMENTS", messageId: "message-1" }),
    context,
    deps
  );

  assert.equal(response.status, 400);
  assert.equal(response.jsonBody.code, "CONFIRM_PUBLISHING_MAILBOX_ATTACHMENT_READBACK_REQUIRED");
});

test("lists attachments only from the governed Publishing mailbox", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return graphResponse({
      value: [{
        id: "attachment-1",
        name: "review.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 1234,
        isInline: false,
        "@odata.type": FILE_ATTACHMENT_TYPE
      }]
    });
  };

  const response = await publishingMailboxAttachmentReadbackHandler(
    request({ confirmPublishingMailboxAttachmentReadback: true, action: "LIST_ATTACHMENTS", messageId: "message-1" }),
    context,
    deps
  );

  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.attachmentCount, 1);
  assert.equal(response.jsonBody.sourceMailbox, PUBLISHING_MAILBOX);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes(encodeURIComponent(PUBLISHING_MAILBOX)));
  assert.ok(calls[0].url.includes("/attachments"));
  assert.equal(calls[0].options.method, "GET");
});

test("fetches a requested file attachment without allowing mailbox override", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return graphResponse({
      id: "attachment-1",
      name: "review.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 4,
      isInline: false,
      "@odata.type": FILE_ATTACHMENT_TYPE,
      contentBytes: Buffer.from("test").toString("base64")
    });
  };

  const response = await publishingMailboxAttachmentReadbackHandler(
    request({
      confirmPublishingMailboxAttachmentReadback: true,
      action: "FETCH_ATTACHMENT",
      messageId: "message-1",
      attachmentId: "attachment-1",
      mailbox: "not-authorized@example.com"
    }),
    context,
    deps
  );

  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.attachment.name, "review.docx");
  assert.equal(response.jsonBody.attachment.sha256, "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes(encodeURIComponent(PUBLISHING_MAILBOX)));
  assert.ok(!calls[0].url.includes("not-authorized"));
});
