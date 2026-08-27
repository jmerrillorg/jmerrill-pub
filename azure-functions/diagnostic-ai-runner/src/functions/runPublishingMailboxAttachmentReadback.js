"use strict";

const { app } = require("@azure/functions");
const {
  listPublishingMailboxMessageAttachments,
  fetchPublishingMailboxMessageAttachment
} = require("../mail/publishingMailboxReader");

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized() {
  return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
}

function confirmationRequired() {
  return {
    status: 400,
    jsonBody: { status: "error", code: "CONFIRM_PUBLISHING_MAILBOX_ATTACHMENT_READBACK_REQUIRED" }
  };
}

function invalidAction() {
  return { status: 400, jsonBody: { status: "error", code: "INVALID_ATTACHMENT_READBACK_ACTION" } };
}

async function publishingMailboxAttachmentReadbackHandler(request, context, deps = {}) {
  if (!verifyRunnerKey(request)) {
    context.warn("Publishing mailbox attachment readback rejected: invalid or missing runner key.");
    return unauthorized();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
  }

  if (body.confirmPublishingMailboxAttachmentReadback !== true) {
    return confirmationRequired();
  }

  const action = safeTrim(body.action).toUpperCase();
  const messageId = safeTrim(body.messageId);

  if (action === "LIST_ATTACHMENTS") {
    const result = await listPublishingMailboxMessageAttachments({ messageId }, deps);
    context.info(
      `Publishing mailbox attachment list attempted; ok=${result.ok}; code=${result.code || result.reason}; count=${result.attachmentCount || 0}`
    );
    return { status: result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422), jsonBody: result };
  }

  if (action === "FETCH_ATTACHMENT") {
    const attachmentId = safeTrim(body.attachmentId);
    const result = await fetchPublishingMailboxMessageAttachment({ messageId, attachmentId }, deps);
    context.info(
      `Publishing mailbox attachment fetch attempted; ok=${result.ok}; code=${result.code || result.reason}; attachmentId=${attachmentId ? "present" : "missing"}`
    );
    return { status: result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422), jsonBody: result };
  }

  return invalidAction();
}

app.http("run-publishing-mailbox-attachment-readback", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-publishing-mailbox-attachment-readback",
  handler: publishingMailboxAttachmentReadbackHandler
});

module.exports = { publishingMailboxAttachmentReadbackHandler };
