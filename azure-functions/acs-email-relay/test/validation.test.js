const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRelayModule() {
  process.env.ACS_EMAIL_SENDER = "DoNotReply@email.jmerrill.one";

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
    require: (name) => {
      if (name === "@azure/functions") {
        return { app: { http: () => {} } };
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
    `${source}\nmodule.exports.__test = { validatePayload, buildAcknowledgmentEmail, safeErrorCode };`,
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
