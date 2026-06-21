"use strict";

/**
 * HTTP wiring for the controlled publishing-mailbox reply check.
 *
 * Thin wrapper only. All gate enforcement, mailbox scope, GET-only
 * behavior, classification, and execution-log logic lives in
 * publishingMailboxReplyCheck.js / publishingMailboxReader.js /
 * publishingReplyClassifier.js — all independently tested.
 *
 * Subject filter and after-timestamp are fixed here for this controlled
 * activation — not caller-supplied.
 */

const { app } = require("@azure/functions");
const { checkPublishingMailboxReply } = require("../mail/publishingMailboxReplyCheck");

const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

// Fixed for this controlled activation — not caller-supplied.
const SUBJECT_CONTAINS = "Next steps for Establishing Glory: The Library";
// Author-facing send timestamp (jm1_startedon on execution-log evidence
// 661a176d-0f6d-f111-ab0d-7c1e525b15c2) — only replies received after this
// point are in scope.
const AFTER_ISO = "2026-06-21T01:20:45Z";

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

function recordNotAuthorized() {
  return { status: 403, jsonBody: { status: "error", code: "MILESTONE_6_RECORD_NOT_AUTHORIZED" } };
}

function confirmationRequired() {
  return {
    status: 400,
    jsonBody: { status: "error", code: "CONFIRM_PUBLISHING_MAILBOX_REPLY_CHECK_FLAG_REQUIRED" }
  };
}

app.http("run-publishing-mailbox-reply-check", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-publishing-mailbox-reply-check",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Publishing mailbox reply check rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const diagnosticId = safeTrim(body.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode);
    const opportunityId = safeTrim(body.opportunityId);
    const confirmMailboxReplyCheck = body.confirmMailboxReplyCheck === true;

    if (!confirmMailboxReplyCheck) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Publishing mailbox reply check rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const result = await checkPublishingMailboxReply({
      diagnosticId,
      intakeReferenceCode,
      opportunityId,
      subjectContains: SUBJECT_CONTAINS,
      afterIso: AFTER_ISO
    });

    context.info(
      `Publishing mailbox reply check attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; found=${result.found}; classification=${result.classification}`
    );

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
