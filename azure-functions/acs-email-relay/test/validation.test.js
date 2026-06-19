const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRelayModule() {
  process.env.ACS_EMAIL_SENDER = "DoNotReply@email.jmerrill.one";

  const routes = {};
  const filePath = path.join(
    __dirname,
    "..",
    "src",
    "functions",
    "sendAuthorAcknowledgment.js"
  );
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    routes,
    require: (name) => {
      if (name === "@azure/functions") {
        return {
          app: {
            http: (name, config) => {
              routes[name] = config;
            }
          }
        };
      }

      if (name === "@azure/communication-email") {
        return { EmailClient: class EmailClient {} };
      }

      if (name === "@azure/identity") {
        return { DefaultAzureCredential: class DefaultAzureCredential {} };
      }

      return require(name);
    },
    process
  };

  vm.runInNewContext(
    `${source}\nmodule.exports.__test = {
      routes,
      validatePayload,
      buildAcknowledgmentEmail,
      safeErrorCode,
      validateInternalNotificationPayload,
      validateApprovedAuthorResponsePayload,
      buildInternalNotificationEmail,
      buildApprovedAuthorResponseEmail,
      milestoneValidationError,
      milestoneUnauthorized
    };`,
    sandbox,
    { filename: filePath }
  );

  return sandbox.module.exports.__test;
}

test("validates the INT-PUB-005 contract", () => {
  const { validatePayload } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "Author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join"
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.to, "author@example.com");
});

test("rejects non-join intake channels", () => {
  const { validatePayload } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "other"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INTAKE_CHANNEL");
});

test("uses explicit project title fallback", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "",
    intakeChannel: "INT-PUB-005 /join"
  });

  assert.equal(result.ok, true);
  const email = buildAcknowledgmentEmail(result.value);
  assert.match(email.content.plainText, /your book/);
});

test("does not include reply-to by default", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join"
  });

  const email = buildAcknowledgmentEmail(result.value);
  assert.equal(Object.hasOwn(email, "replyTo"), false);
});

const diagnosticId = "64e387e0-7e6a-f111-a826-00224820105b";
const intakeReferenceCode = "JMP-INT-202606-UFYG60";

function validInternalPayload(overrides = {}) {
  return {
    notificationType: "AUTHOR_DRAFT_READY_FOR_REVIEW",
    diagnosticId,
    intakeReferenceCode,
    authorName: "Jackie",
    authorEmail: "author@example.com",
    projectTitle: "Test Book",
    draftStatus: "DRAFT_ONLY",
    approvalStatus: "PENDING_HUMAN_APPROVAL",
    draftPreview: "Safe draft preview for internal review.",
    nextAction: "Review author-response draft",
    recipient: "publishing@jmerrill.one",
    ...overrides
  };
}

function validAuthorResponsePayload(overrides = {}) {
  return {
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId,
    intakeReferenceCode,
    authorEmail: "author@example.com",
    authorName: "Jackie",
    projectTitle: "Test Book",
    subject: "Next step for your J Merrill Publishing submission",
    body: "Approved author response body.",
    templateName: "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP",
    approvedBy: "jackie",
    approvedOn: "2026-06-18T12:00:00.000Z",
    internalVisibilityMailbox: "publishing@jmerrill.one",
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    cc: ["publishing@jmerrill.one"],
    ...overrides
  };
}

function assertRejected(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("MANUSCRIPT"), false);
  assert.equal(serialized.includes("PROMPT"), false);
}

test("valid internal notification builds ACS email to publishing@jmerrill.one", () => {
  const { validateInternalNotificationPayload, buildInternalNotificationEmail } = loadRelayModule();
  const result = validateInternalNotificationPayload(validInternalPayload());

  assert.equal(result.ok, true);
  const email = buildInternalNotificationEmail(result.value);
  assert.equal(email.senderAddress, "DoNotReply@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "cc"), false);
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.match(email.content.subject, /JMP-INT-202606-UFYG60/);
  assert.match(email.content.plainText, /No author email has been sent\./);
  assert.equal(JSON.stringify(email.recipients).includes("author@example.com"), false);
});

test("internal notification rejects wrong type and wrong recipient", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  assertRejected(
    validateInternalNotificationPayload(validInternalPayload({ notificationType: "OTHER" })),
    "NOTIFICATION_TYPE_INVALID"
  );
  assertRejected(
    validateInternalNotificationPayload(validInternalPayload({ recipient: "ops@jmerrill.one" })),
    "RECIPIENT_INVALID"
  );
});

test("internal notification rejects author in To, CC, or BCC", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  for (const field of ["to", "cc", "bcc"]) {
    assertRejected(
      validateInternalNotificationPayload(validInternalPayload({ [field]: ["author@example.com"] })),
      "AUTHOR_RECIPIENT_BLOCKED"
    );
  }
});

test("internal notification rejects CC/BCC, @jmerrill.pub, missing preview, and unsafe fields", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  assertRejected(validateInternalNotificationPayload(validInternalPayload({ cc: ["publishing@jmerrill.one"] })), "CC_BCC_NOT_ALLOWED");
  assertRejected(validateInternalNotificationPayload(validInternalPayload({ recipient: "publishing@jmerrill.pub" })), "RECIPIENT_INVALID");
  assertRejected(validateInternalNotificationPayload(validInternalPayload({ draftPreview: "" })), "DRAFT_PREVIEW_MISSING");

  for (const unsafe of [
    { manuscriptText: "SECRET MANUSCRIPT" },
    { promptBody: "SECRET PROMPT" },
    { rawModelResponse: "SECRET RAW" },
    { opportunityPayload: "SECRET" },
    { flowDTrigger: true },
    { headers: { authorization: "Bearer SECRET" } },
    { apiKey: "SECRET" },
    { token: "SECRET" }
  ]) {
    assertRejected(validateInternalNotificationPayload(validInternalPayload(unsafe)), "UNSAFE_FIELD_PRESENT");
  }
});

test("valid approved author response builds ACS email to author and copies publishing mailbox", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  assert.equal(result.ok, true);
  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.equal(email.senderAddress, "DoNotReply@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["author@example.com"]));
  assert.equal(JSON.stringify(email.recipients.cc.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.equal(email.content.subject, "Next step for your J Merrill Publishing submission");
});

test("approved author response rejects missing author email, To mismatch, missing copy, and BCC", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ authorEmail: "" })), "AUTHOR_EMAIL_INVALID");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ to: "other@example.com" })), "AUTHOR_RECIPIENT_INVALID");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ cc: [] })), "INTERNAL_VISIBILITY_REQUIRED");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ bcc: ["audit@example.com"] })), "BCC_NOT_ALLOWED");
});

test("approved author response rejects @jmerrill.pub, missing approval fields, subject/body, and log requirement", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ authorEmail: "author@jmerrill.pub" })), "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ approvedBy: "" })), "APPROVED_BY_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ approvedOn: "" })), "APPROVED_ON_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ subject: "" })), "SUBJECT_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ body: "" })), "BODY_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ futureSendRequiresDataverseLog: false })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
});

test("approved author response rejects unsafe fields and returns safe failure only", () => {
  const { validateApprovedAuthorResponsePayload, milestoneValidationError } = loadRelayModule();

  for (const unsafe of [
    { manuscriptText: "SECRET MANUSCRIPT" },
    { promptBody: "SECRET PROMPT" },
    { rawModelResponse: "SECRET RAW" },
    { opportunityPayload: "SECRET" },
    { flowDTrigger: true },
    { headers: { authorization: "Bearer SECRET" } },
    { apiKey: "SECRET" },
    { token: "SECRET" }
  ]) {
    assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload(unsafe)), "UNSAFE_FIELD_PRESENT");
  }

  const response = milestoneValidationError("UNSAFE_FIELD_PRESENT", validAuthorResponsePayload({ body: "SECRET BODY" }));
  const serialized = JSON.stringify(response);
  assert.equal(response.jsonBody.accepted, false);
  assert.equal(response.jsonBody.code, "ACS_RELAY_VALIDATION_FAILED");
  assert.equal(serialized.includes("SECRET BODY"), false);
});

test("relay auth failures return safe responses", () => {
  const { milestoneUnauthorized } = loadRelayModule();

  const response = milestoneUnauthorized(validInternalPayload());
  assert.equal(response.status, 401);
  assert.equal(response.jsonBody.accepted, false);
  assert.equal(response.jsonBody.code, "UNAUTHORIZED");
  assert.equal(Object.hasOwn(response.jsonBody, "headers"), false);
});

test("missing or invalid ACS sender fails safely", () => {
  const relay = loadRelayModule();
  const valid = relay.validateInternalNotificationPayload(validInternalPayload());

  process.env.ACS_EMAIL_SENDER = "";
  assert.throws(() => relay.buildInternalNotificationEmail(valid.value), /ACS sender is missing/);

  process.env.ACS_EMAIL_SENDER = "publishing@jmerrill.pub";
  assert.throws(() => relay.buildInternalNotificationEmail(valid.value), /ACS sender is invalid/);
});

test("routes are registered without changing acknowledgment route", () => {
  const { routes } = loadRelayModule();

  assert.equal(Boolean(routes["send-author-acknowledgment"]), true);
  assert.equal(Boolean(routes["send-internal-author-draft-review-notification"]), true);
  assert.equal(Boolean(routes["send-approved-author-response"]), true);
});
