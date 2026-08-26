const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEnterpriseRelayModule() {
  const routes = {};
  const filePath = path.join(__dirname, "..", "src", "functions", "sendEnterpriseGovernedEmail.js");
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
      if (name.startsWith("../")) {
        return require(path.join(path.dirname(filePath), name));
      }
      return require(name);
    },
    process
  };

  vm.runInNewContext(`${source}\nmodule.exports.__test = { routes, buildEnterpriseEmail, validateEnterprisePayload };`, sandbox, { filename: filePath });
  return sandbox.module.exports.__test;
}

function validPayload(overrides = {}) {
  return {
    brand: "JM1",
    to: "operator@example.com",
    subject: "Your J Merrill One update",
    plainText: "Good day. We are sending this because your requested update is ready. Reply if you need help.",
    html: "<!doctype html><html><body><p>Good day.</p><p>We are sending this because your requested update is ready.</p><p>Reply if you need help.</p><p>J Merrill One</p></body></html>",
    sourceRecord: "SYNTHETIC-JM1-ACS-001",
    ...overrides
  };
}

test("JM1 uses ACS sender with public alias reply-to and info mailbox authority", () => {
  const { buildEnterpriseEmail, validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload());
  assert.equal(result.ok, true);
  assert.equal(result.value.senderAddress, "one@email.jmerrill.one");
  assert.equal(result.value.replyTo, "one@jmerrill.one");
  assert.equal(result.value.profile.replyMailboxAuthority, "info@jmerrill.one");

  const email = buildEnterpriseEmail(result.value);
  assert.equal(email.senderAddress, "one@email.jmerrill.one");
  assert.equal(email.replyTo[0].address, "one@jmerrill.one");
});

test("decided brands resolve to their own ACS sender and reply authority", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const [brand, sender, replyTo] of [
    ["JMP", "publishing@email.jmerrill.one", "publishing@jmerrill.one"],
    ["JMF", "financial@email.jmerrill.one", "financial@jmerrill.one"],
    ["JMFN", "foundation@email.jmerrill.one", "foundation@jmerrill.one"],
    ["JMPRODUCTIONS", "productions@email.jmerrill.one", "productions@jmerrill.one"]
  ]) {
    const result = validateEnterprisePayload(validPayload({
      brand,
      cc: brand === "JMP" ? ["publishing@jmerrill.one"] : []
    }));
    assert.equal(result.ok, true, brand);
    assert.equal(result.value.senderAddress, sender);
    assert.equal(result.value.replyTo, replyTo);
  }
});

test("wrong brand sender fails closed instead of falling back to Publishing", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "JMF",
    senderAddress: "publishing@email.jmerrill.one"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ACS_BRAND_SENDER_MISMATCH");
});

test("AIC sender remains Founder decision required", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({ brand: "AIC" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "AIC_SENDER_IDENTITY_FOUNDER_DECISION_REQUIRED");
});

test("Publishing requires visibility CC on the shared relay", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const missing = validateEnterprisePayload(validPayload({ brand: "JMP" }));
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "ACS_CC_ARCHIVE_MISSING");

  const present = validateEnterprisePayload(validPayload({
    brand: "JMP",
    cc: ["publishing@jmerrill.one"]
  }));
  assert.equal(present.ok, true);
});

test("Human-First policy blocks internal runtime language and duplicate signatures", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const internal = validateEnterprisePayload(validPayload({
    plainText: "Your runtime queue checksum is ready.",
    html: "<!doctype html><html><body><p>Your runtime queue checksum is ready.</p></body></html>"
  }));
  assert.equal(internal.ok, false);
  assert.equal(internal.reason, "HUMAN_FIRST_INTERNAL_LANGUAGE_BLOCKED");

  const duplicate = validateEnterprisePayload(validPayload({
    brand: "JMF",
    plainText: "Good day.\n\nJ Merrill Financial\n\nJ Merrill Financial",
    html: "<!doctype html><html><body><p>Good day.</p><p>J Merrill Financial</p><p>J Merrill Financial</p></body></html>"
  }));
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "ACS_DUPLICATE_SIGNATURE_BLOCKED");
});

test("Financial legal/compliance language requires human review", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "JMF",
    subject: "Your estate planning update",
    plainText: "This plan is legally sound and guaranteed to avoid probate.",
    html: "<!doctype html><html><body><p>This plan is legally sound and guaranteed to avoid probate.</p><p>J Merrill Financial</p></body></html>"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "HUMAN_REVIEW_REQUIRED_FINANCIAL_COMPLIANCE");
});

test("Foundation promotional communication requires consent, but service acknowledgment can send", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const promo = validateEnterprisePayload(validPayload({
    brand: "JMFN",
    messageType: "FUNDRAISING"
  }));
  assert.equal(promo.ok, false);
  assert.equal(promo.reason, "FOUNDATION_MARKETING_CONSENT_REQUIRED");

  const service = validateEnterprisePayload(validPayload({
    brand: "JMFN",
    messageType: "PROGRAM_UPDATE"
  }));
  assert.equal(service.ok, true);
});

test("Productions rights and contract language requires human review", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "JMPRODUCTIONS",
    plainText: "Please approve these usage rights and contract terms.",
    html: "<!doctype html><html><body><p>Please approve these usage rights and contract terms.</p><p>J Merrill Productions</p></body></html>"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "HUMAN_REVIEW_REQUIRED_RIGHTS_CONTRACT");
});
