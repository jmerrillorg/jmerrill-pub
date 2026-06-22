"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAgreementPackageModule() {
  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = "publishing@email.jmerrill.one";

  const routes = {};
  const filePath = path.join(__dirname, "..", "src", "functions", "sendAgreementPackage.js");
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    routes,
    require: (name) => {
      if (name === "@azure/functions") {
        return { app: { http: (name2, config) => { routes[name2] = config; } } };
      }
      if (name === "@azure/communication-email") {
        return { EmailClient: class EmailClient {} };
      }
      if (name === "@azure/identity") {
        return { DefaultAzureCredential: class DefaultAzureCredential {} };
      }
      return require(name);
    },
    process,
    Buffer
  };

  vm.runInNewContext(
    `${source}\nmodule.exports.__test = {
      routes,
      validateAgreementPackageSendPayload,
      validateAttachments,
      buildAgreementPackageSendEmail,
      safeErrorCode,
      milestoneValidationError,
      milestoneUnauthorized
    };`,
    sandbox,
    { filename: filePath }
  );

  return sandbox.module.exports.__test;
}

const VALID_ATTACHMENT = {
  name: "JMP_Publishing_Agreement_FILLED_x.docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  contentInBase64: Buffer.from("fake docx bytes").toString("base64")
};

function fourValidAttachments() {
  return [
    { ...VALID_ATTACHMENT, name: "JMP_Publishing_Agreement_FILLED_x.docx" },
    { ...VALID_ATTACHMENT, name: "JMP_Publishing_Package_Addendum_FILLED_x.docx" },
    { ...VALID_ATTACHMENT, name: "JMP_Audiobook_Addendum_FILLED_x.docx" },
    { ...VALID_ATTACHMENT, name: "JMP_Schedule_A_Payment_Schedule_x.docx" }
  ];
}

function validPayload(overrides = {}) {
  return {
    diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
    intakeReferenceCode: "JMP-INT-202606-UFYG60",
    to: "chosen2k7@gmail.com",
    toDisplayName: "Jackie Smith Jr.",
    cc: "publishing@jmerrill.one",
    replyTo: "publishing@jmerrill.one",
    subject: "Agreement package for Establishing Glory: The Library",
    bodyText: "Hi Jackie, attached is your agreement package for review and signature.",
    attachments: fourValidAttachments(),
    ...overrides
  };
}

test("validates a correctly-formed agreement package send payload", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload());
  assert.equal(result.ok, true);
  assert.equal(result.value.to, "chosen2k7@gmail.com");
});

test("rejects a recipient at @jmerrill.pub", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ to: "author@jmerrill.pub" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
});

test("rejects when cc is not the internal visibility mailbox", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ cc: "someone-else@jmerrill.one" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CC_MUST_BE_INTERNAL_VISIBILITY_MAILBOX");
});

test("rejects when replyTo is not the internal visibility mailbox", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ replyTo: "wrong@jmerrill.one" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "REPLY_TO_MUST_BE_INTERNAL_VISIBILITY_MAILBOX");
});

test("rejects an invalid diagnosticId", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ diagnosticId: "bad" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
});

test("rejects a missing subject or body", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  assert.equal(validateAgreementPackageSendPayload(validPayload({ subject: "" })).reason, "SUBJECT_MISSING");
  assert.equal(validateAgreementPackageSendPayload(validPayload({ bodyText: "" })).reason, "BODY_MISSING");
});

test("rejects body text that mentions a payment link / pay-now language", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ bodyText: "Click here to pay now: https://checkout.stripe.com/abc" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "PAYMENT_LINK_LANGUAGE_NOT_ALLOWED");
});

test("rejects an unsafe field (e.g. rawModelOutput, paymentLink) anywhere in the payload", () => {
  const { validateAgreementPackageSendPayload } = loadAgreementPackageModule();
  const result = validateAgreementPackageSendPayload(validPayload({ paymentLink: "https://example.com" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
});

test("validateAttachments — requires exactly four attachments", () => {
  const { validateAttachments } = loadAgreementPackageModule();
  assert.equal(validateAttachments(fourValidAttachments().slice(0, 3)).ok, false);
  assert.equal(validateAttachments(fourValidAttachments()).ok, true);
});

test("validateAttachments — rejects a non-.docx attachment name", () => {
  const { validateAttachments } = loadAgreementPackageModule();
  const attachments = fourValidAttachments();
  attachments[0].name = "Agreement.pdf";
  const result = validateAttachments(attachments);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ATTACHMENT_NAME_INVALID");
});

test("validateAttachments — rejects a non-docx content type", () => {
  const { validateAttachments } = loadAgreementPackageModule();
  const attachments = fourValidAttachments();
  attachments[0].contentType = "application/pdf";
  const result = validateAttachments(attachments);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ATTACHMENT_CONTENT_TYPE_INVALID");
});

test("validateAttachments — rejects missing attachment content", () => {
  const { validateAttachments } = loadAgreementPackageModule();
  const attachments = fourValidAttachments();
  attachments[0].contentInBase64 = "";
  const result = validateAttachments(attachments);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ATTACHMENT_CONTENT_MISSING");
});

test("buildAgreementPackageSendEmail — sender, replyTo, cc, and attachments are correct", () => {
  const { validateAgreementPackageSendPayload, buildAgreementPackageSendEmail } = loadAgreementPackageModule();
  const validation = validateAgreementPackageSendPayload(validPayload());
  const email = buildAgreementPackageSendEmail(validation.value);

  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(email.replyTo[0].address, "publishing@jmerrill.one");
  assert.equal(email.recipients.to[0].address, "chosen2k7@gmail.com");
  assert.equal(email.recipients.cc[0].address, "publishing@jmerrill.one");
  assert.equal(email.attachments.length, 4);
  assert.ok(email.attachments.every((a) => a.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
});

test("buildAgreementPackageSendEmail — never includes a bcc", () => {
  const { validateAgreementPackageSendPayload, buildAgreementPackageSendEmail } = loadAgreementPackageModule();
  const validation = validateAgreementPackageSendPayload(validPayload());
  const email = buildAgreementPackageSendEmail(validation.value);
  assert.equal(email.recipients.bcc, undefined);
});

test("the route is registered as send-agreement-package, POST only, anonymous authLevel (relay key is the real gate)", () => {
  const { routes } = loadAgreementPackageModule();
  assert.ok(routes["send-agreement-package"]);
  assert.equal(Array.from(routes["send-agreement-package"].methods).join(","), "POST");
  assert.equal(routes["send-agreement-package"].route, "send-agreement-package");
});

test("the handler rejects requests without a valid relay key", async () => {
  const { routes } = loadAgreementPackageModule();
  const handler = routes["send-agreement-package"].handler;
  process.env.JM1_RELAY_API_KEY = "correct-key";
  const request = {
    headers: { get: () => "wrong-key" },
    json: async () => validPayload()
  };
  const context = { warn: () => {}, error: () => {}, info: () => {} };
  const response = await handler(request, context);
  assert.equal(response.status, 401);
});
