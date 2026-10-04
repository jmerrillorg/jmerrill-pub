const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEnterpriseRelayModule(options = {}) {
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
        return { EmailClient: class EmailClient { constructor() { return options.client || this; } } };
      }
      if (name === "@azure/identity") {
        return { DefaultAzureCredential: class DefaultAzureCredential {} };
      }
      if (name.startsWith("../")) {
        const dependency = require(path.join(path.dirname(filePath), name));
        if (name === "../security/callerAuthentication" && options.caller) {
          return { ...dependency, authenticateCaller: () => ({ ok: true, caller: options.caller, authModel: "ENTRA_WORKLOAD_IDENTITY" }) };
        }
        return name === "../state/messageLedger" && options.ledger
          ? { ...dependency, getMessageLedger: () => options.ledger } : dependency;
      }
      return require(name);
    },
    process: { env: { ...process.env, ...(options.env || {}) } }
  };

  vm.runInNewContext(`${source}\nmodule.exports.__test = { routes, buildEnterpriseEmail, validateEnterprisePayload, sendAcsMessage };`, sandbox, { filename: filePath });
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
    businessObjectType: "SYNTHETIC_PROOF",
    businessObjectId: "SYNTHETIC-JM1-ACS-001",
    correlationId: "COMMS-001A1-SYNTHETIC-001",
    templateId: "JM1_SYNTHETIC_UPDATE",
    templateVersion: "1.0",
    idempotencyKey: "COMMS-001A1-SYNTHETIC-001-JM1",
    ...overrides
  };
}

test("provider acceptance requires completed ACS operation and immutable provider ID", async () => {
  const { sendAcsMessage } = loadEnterpriseRelayModule();
  let completed = false;
  const client = { beginSend: async () => ({ pollUntilDone: async () => {
    completed = true;
    return { status: "Succeeded", id: "provider-proof-1" };
  } }) };
  assert.equal(await sendAcsMessage({}, client), "provider-proof-1");
  assert.equal(completed, true);
  for (const result of [{ status: "Running", id: "pending" }, { status: "Succeeded" }, { status: "Failed", id: "failed" }]) {
    await assert.rejects(() => sendAcsMessage({}, { beginSend: async () => ({ pollUntilDone: async () => result }) }),
      error => error.safeCode === "ACS_DELIVERY_UNPROVEN");
  }
  await assert.rejects(() => sendAcsMessage({}, { beginSend: async () => ({ getOperationState: () => ({ id: "pending" }) }) }),
    error => error.safeCode === "ACS_DELIVERY_UNPROVEN");
});

test("ambiguous provider completion retains the reservation and cannot record acceptance or retryable failure", async () => {
  let reserved = 0;
  const forbidden = () => { throw new Error("UNPROVEN_PROVIDER_STATE_MUST_NOT_BE_PERSISTED"); };
  const relay = loadEnterpriseRelayModule({ env: { ACS_CONNECTION_STRING: "fixture-only" },
    client: { beginSend: async () => ({ pollUntilDone: async () => { throw new Error("ambiguous completion"); } }) },
    ledger: { reserve: async () => { reserved++; return { kind: "RESERVED", entity: { jm1MessageId: "fixture" } }; },
      recordAccepted: forbidden, recordFailure: forbidden } });
  const result = await relay.routes["send-enterprise-governed-email"].handler(
    routeRequest(governedPublishingPayload(), workloadHeaders("ce363f5a-94f3-4ea9-9ba3-061404fca098")),
    { warn() {}, info() {}, error() {} });
  assert.equal(result.status, 502);
  assert.equal(reserved, 1);
  assert.equal(result.jsonBody.accepted, false);
});

function governedPublishingPayload(overrides = {}) {
  return validPayload({
    brand: "PUBLISHING",
    to: "jm1-admin@jmerrill.one",
    subject: undefined,
    plainText: undefined,
    html: undefined,
    templateId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
    templateVersion: "1.0.0",
    templateData: {
      authorFirstName: "Avery",
      projectTitle: "A New Beginning",
      packageName: "Starter Publishing Package",
      baseAmountCents: 199900,
      options: [{ code: "FULL_PAY", paymentAmountsCents: [199900], totalBeforeTaxCents: 199900 }]
    },
    ...overrides
  });
}

function routeRequest(body, headers = {}) {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    headers: { get: (name) => normalized.get(String(name).toLowerCase()) || null },
    json: async () => body
  };
}

function workloadHeaders(objectId) {
  const principal = Buffer.from(JSON.stringify({
    auth_typ: "aad",
    claims: [{ typ: "oid", val: objectId }]
  })).toString("base64");
  return {
    "x-ms-client-principal-id": objectId,
    "x-ms-client-principal": principal
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
  assert.equal(email.recipients.cc[0].address, "info@jmerrill.one");
});

test("active governed template derives subject and multipart bodies server-side", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(governedPublishingPayload());
  assert.equal(result.ok, true);
  assert.equal(result.value.subject, "Your Publishing Payment Options for A New Beginning");
  assert.match(result.value.html, /J Merrill Publishing/);
  assert.match(result.value.plainText, /Starter Publishing Package/);
  assert.equal(result.value.renderMetadata.brandTokenVersion, "PUBLISHING-EMAIL-v1.0.0");
});

test("governed template rejects caller-authored subject and body overrides", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(governedPublishingPayload({ subject: "Override" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CALLER_TEMPLATE_CONTENT_OVERRIDE_DENIED");
});

test("decided brands resolve to their own ACS sender and reply authority", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const [brand, sender, replyTo] of [
    ["JMP", "publishing@email.jmerrill.one", "publishing@jmerrill.one"],
    ["JMF", "financial@email.jmerrill.one", "financial@jmerrill.one"],
    ["JMFN", "foundation@email.jmerrill.one", "foundation@jmerrill.one"],
    ["JMPRODUCTIONS", "productions@email.jmerrill.one", "productions@jmerrill.one"],
    ["AIC", "aic@email.agapeic.org", "aic@agapeic.org"],
    ["JSJ", "jackie@email.jackiesmithjr.com", "jackie@jmerrill.one"]
  ]) {
    const result = validateEnterprisePayload(validPayload({ brand }));
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
  assert.equal(result.reason, "CALLER_FROM_OVERRIDE_DENIED");
});

test("AIC routine service communication uses governed sender and reply path", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "AIC",
    subject: "Your Agape International Cathedral update",
    plainText: "Good day. We are sending this because your service reminder is ready. We look forward to worshiping together.",
    html: "<!doctype html><html><body><p>Good day.</p><p>We are sending this because your service reminder is ready.</p><p>We look forward to worshiping together.</p><p>Agape International Cathedral</p></body></html>"
  }));
  assert.equal(result.ok, true);
  assert.equal(result.value.senderAddress, "aic@email.agapeic.org");
  assert.equal(result.value.replyTo, "aic@agapeic.org");
  assert.equal(result.value.profile.replyMailboxAuthority, "aic@agapeic.org");
});

test("AIC permits one signature in each multipart body representation", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "AIC",
    subject: "Your Agape International Cathedral update",
    plainText: "Good day. This service reminder is ready.\n\nAgape International Cathedral",
    html: "<!doctype html><html><body><p>Good day.</p><p>This service reminder is ready.</p><p>Agape International Cathedral</p></body></html>"
  }));
  assert.equal(result.ok, true);
});

test("AIC cannot use another JM1 brand sender", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const senderAddress of ["publishing@email.jmerrill.one", "one@email.jmerrill.one"]) {
    const result = validateEnterprisePayload(validPayload({
      brand: "AIC",
      senderAddress,
      replyTo: "aic@agapeic.org"
    }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "CALLER_FROM_OVERRIDE_DENIED");
  }
});

test("JSJ routine personal-brand communication uses governed personal sender and Jackie reply mailbox", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "JSJ",
    subject: "A note from Jackie Smith Jr.",
    plainText: "Good day. I am sending this because I wanted to share a personal update from my desk.\n\nJackie Smith Jr.",
    html: "<!doctype html><html><body><p>Good day.</p><p>I am sending this because I wanted to share a personal update from my desk.</p><p>Jackie Smith Jr.</p></body></html>"
  }));
  assert.equal(result.ok, true);
  assert.equal(result.value.senderAddress, "jackie@email.jackiesmithjr.com");
  assert.equal(result.value.replyTo, "jackie@jmerrill.one");
  assert.equal(result.value.profile.replyMailboxAuthority, "jackie@jmerrill.one");
});

test("JSJ cannot borrow enterprise, divisional, or AIC sender domains", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const senderAddress of [
    "one@email.jmerrill.one",
    "publishing@email.jmerrill.one",
    "financial@email.jmerrill.one",
    "foundation@email.jmerrill.one",
    "productions@email.jmerrill.one",
    "aic@email.agapeic.org"
  ]) {
    const result = validateEnterprisePayload(validPayload({
      brand: "JSJ",
      senderAddress,
      replyTo: "jackie@jmerrill.one"
    }));
    assert.equal(result.ok, false, senderAddress);
    assert.equal(result.reason, "CALLER_FROM_OVERRIDE_DENIED");
  }
});

test("Other contexts cannot use the JSJ personal-brand sender", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const brand of ["JMP", "JMF", "AIC"]) {
    const result = validateEnterprisePayload(validPayload({
      brand,
      senderAddress: "jackie@email.jackiesmithjr.com",
      replyTo: brand === "AIC" ? "aic@agapeic.org" : brand === "JMF" ? "financial@jmerrill.one" : "publishing@jmerrill.one",
      cc: brand === "JMP" ? ["publishing@jmerrill.one"] : []
    }));
    assert.equal(result.ok, false, brand);
    assert.equal(result.reason, "CALLER_FROM_OVERRIDE_DENIED");
  }
});

test("JSJ personal-brand sender cannot carry divisional legal, financial, or contract authority", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "JSJ",
    subject: "A note from Jackie Smith Jr.",
    plainText: "Good day. This publishing agreement update contains contract terms for your review.\n\nJackie Smith Jr.",
    html: "<!doctype html><html><body><p>Good day.</p><p>This publishing agreement update contains contract terms for your review.</p><p>Jackie Smith Jr.</p></body></html>"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "HUMAN_REVIEW_REQUIRED_JSJ_PERSONAL_BRAND_BOUNDARY");
});

test("AIC fails closed for wrong ministry context and Planning Center sender-authority misuse", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const wrongContext = validateEnterprisePayload(validPayload({
    brand: "AIC",
    relationshipContextValid: false
  }));
  assert.equal(wrongContext.ok, false);
  assert.equal(wrongContext.reason, "ACS_RELATIONSHIP_CONTEXT_MISMATCH");

  const planningCenterSenderAuthority = validateEnterprisePayload(validPayload({
    brand: "AIC",
    planningCenterAsSenderAuthority: true
  }));
  assert.equal(planningCenterSenderAuthority.ok, false);
  assert.equal(planningCenterSenderAuthority.reason, "ACS_PLANNING_CENTER_AUTHORITY_MISMATCH");
});

test("AIC sensitive pastoral, legal, or financial context requires human review", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  const result = validateEnterprisePayload(validPayload({
    brand: "AIC",
    plainText: "Please review this confidential pastoral care update.",
    html: "<!doctype html><html><body><p>Please review this confidential pastoral care update.</p><p>Agape International Cathedral</p></body></html>"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "HUMAN_REVIEW_REQUIRED_AIC_SENSITIVE_CONTEXT");
});

test("every resolved brand derives its mandatory visibility CC server-side", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const [brand, expectedCc] of [
    ["JM1", "info@jmerrill.one"],
    ["JMP", "publishing@jmerrill.one"],
    ["JMF", "financial@jmerrill.one"],
    ["JMFN", "foundation@jmerrill.one"],
    ["JMPRODUCTIONS", "productions@jmerrill.one"],
    ["AIC", "aic@agapeic.org"],
    ["JSJ", "jackie@jmerrill.one"]
  ]) {
    const result = validateEnterprisePayload(validPayload({ brand }));
    assert.equal(result.ok, true, brand);
    assert.equal(result.value.cc[0].address, expectedCc, brand);
  }
});

test("caller cannot override From, Reply-To, or brand CC", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  assert.equal(validateEnterprisePayload(validPayload({ from: "publishing@email.jmerrill.one" })).reason, "CALLER_FROM_OVERRIDE_DENIED");
  assert.equal(validateEnterprisePayload(validPayload({ replyTo: "publishing@jmerrill.one" })).reason, "CALLER_REPLY_TO_OVERRIDE_DENIED");
  assert.equal(validateEnterprisePayload(validPayload({ cc: ["publishing@jmerrill.one"] })).reason, "CALLER_CC_OVERRIDE_DENIED");
});

test("authority probe denies anonymous, unknown, and cross-brand callers without sending", async () => {
  const { routes } = loadEnterpriseRelayModule();
  const handler = routes["relay-authority-probe"].handler;
  delete process.env.JM1_RELAY_API_KEY;
  const anonymous = await handler(routeRequest({ brand: "JMP" }));
  assert.equal(anonymous.status, 401);

  const unknownId = "00000000-0000-0000-0000-000000000001";
  const unknown = await handler(routeRequest({ brand: "JMP" }, workloadHeaders(unknownId)));
  assert.equal(unknown.status, 403);
  assert.equal(unknown.jsonBody.reason, "UNKNOWN_CALLER");

  const publishingId = "ce363f5a-94f3-4ea9-9ba3-061404fca098";
  const crossBrand = await handler(routeRequest({ brand: "JMF" }, workloadHeaders(publishingId)));
  assert.equal(crossBrand.status, 403);
  assert.equal(crossBrand.jsonBody.reason, "CALLER_BRAND_NOT_AUTHORIZED");
});

test("authority probe attributes a Publishing workload identity and derives brand identity", async () => {
  const { routes } = loadEnterpriseRelayModule();
  const handler = routes["relay-authority-probe"].handler;
  const publishingId = "ce363f5a-94f3-4ea9-9ba3-061404fca098";
  const result = await handler(routeRequest({ brand: "PUBLISHING" }, workloadHeaders(publishingId)));
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.authorized, true);
  assert.equal(result.jsonBody.noSend, true);
  assert.equal(result.jsonBody.callerId, "publishing-web-prod");
  assert.equal(result.jsonBody.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(result.jsonBody.brandCc, "publishing@jmerrill.one");
  assert.equal(result.jsonBody.replyTo, "publishing@jmerrill.one");
});

test("JSJ authority probe permits only the approved recipient without sending", async () => {
  const { routes } = loadEnterpriseRelayModule();
  const handler = routes["relay-authority-probe"].handler;
  const headers = workloadHeaders("8a488b86-7a1a-4978-8705-6fbc3bd8ce15");
  const allowed = await handler(routeRequest({ brand: "JSJ", recipient: "jackie@jmerrill.one" }, headers));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.jsonBody.callerId, "jsj-web-prod");
  assert.equal(allowed.jsonBody.senderAddress, "jackie@email.jackiesmithjr.com");
  assert.equal(allowed.jsonBody.noSend, true);
  assert.equal((await handler(routeRequest({ brand: "JSJ", recipient: "other@example.com" }, headers))).status, 403);
  assert.equal((await handler(routeRequest({ brand: "JMP", recipient: "jackie@jmerrill.one" }, headers))).status, 403);
});

test("JSJ recipient and template denial occurs before any message reservation", async () => {
  let reservations = 0;
  const { routes } = loadEnterpriseRelayModule({ ledger: { reserve: async () => { reservations++; throw new Error("must not reserve"); } } });
  const handler = routes["send-enterprise-governed-email"].handler;
  const headers = workloadHeaders("8a488b86-7a1a-4978-8705-6fbc3bd8ce15");
  const payload = validPayload({ brand: "JSJ", to: "other@example.com", templateId: "JSJ_INQUIRY_NOTIFICATION" });
  const context = { warn() {}, info() {}, error() {} };
  const denied = await handler(routeRequest(payload, headers), context);
  assert.equal(denied.status, 403);
  assert.equal(denied.jsonBody.reason, "CALLER_RECIPIENT_NOT_AUTHORIZED");
  const wrongTemplate = await handler(routeRequest({ ...payload, to: "jackie@jmerrill.one", templateId: "JSJ_OTHER" }, headers), context);
  assert.equal(wrongTemplate.status, 403);
  assert.equal(reservations, 0);
});

test("durable trace contract fields are mandatory", () => {
  const { validateEnterprisePayload } = loadEnterpriseRelayModule();
  for (const [field, reason] of [
    ["businessObjectType", "BUSINESS_OBJECT_TYPE_REQUIRED"],
    ["businessObjectId", "BUSINESS_OBJECT_ID_REQUIRED"],
    ["correlationId", "CORRELATION_ID_REQUIRED"],
    ["templateId", "TEMPLATE_ID_REQUIRED"],
    ["templateVersion", "TEMPLATE_VERSION_REQUIRED"],
    ["idempotencyKey", "IDEMPOTENCY_KEY_REQUIRED"]
  ]) {
    const result = validateEnterprisePayload(validPayload({ [field]: "" }));
    assert.equal(result.ok, false, field);
    assert.equal(result.reason, reason, field);
  }
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

const bp09Headers = () => workloadHeaders("38b09d6f-34d9-48b3-9627-f04c047fd534");
const bp09Payload = () => ({
  brand: "JMPRODUCTIONS", to: "productions@jmerrill.one",
  templateId: "PRODUCTIONS.BP09_NOTICE", templateVersion: "1.0.0",
  templateData: { referenceId: "90000000-0000-4000-a000-000000000009", leadId: "90000000-0000-4000-a000-000000000010" }
});
const quietContext = { warn() {}, info() {}, error() {} };

const foundationHeaders = () => workloadHeaders("cb36ea0b-8ba6-4798-a836-47a52e340675");
const foundationPayload = () => ({
  brand: "JMFN", to: "foundation@jmerrill.one",
  templateId: "FOUNDATION.VOLUNTEER_INQUIRY_NOTICE", templateVersion: "1.0.0",
  templateData: { referenceId: "90000000-0000-4000-a000-000000000019" }
});

test("Foundation no-send probe validates exact notice without provider or ledger access", async () => {
  const forbidden = () => { throw Error("SIDE_EFFECT_FORBIDDEN"); };
  const relay = loadEnterpriseRelayModule({ client: { beginSend: forbidden }, ledger: { reserve: forbidden } });
  const result = await relay.routes["relay-authority-probe"].handler(routeRequest(foundationPayload(), foundationHeaders()));
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.noSend, true);
  assert.equal(result.jsonBody.callerId, "foundation-volunteer-web-prod");
  assert.equal(result.jsonBody.recipient, "foundation@jmerrill.one");
  assert.equal(result.jsonBody.brandCc, "foundation@jmerrill.one");
  assert.equal(result.jsonBody.senderAddress, "foundation@email.jmerrill.one");
  assert.equal(result.jsonBody.replyTo, "foundation@jmerrill.one");
  assert.equal(result.jsonBody.idempotencyKey, `foundation:volunteer-inquiry:notice:${foundationPayload().templateData.referenceId}`);
});

test("Foundation rejects private content, identifiers, links and envelope overrides without reflection", async () => {
  const relay = loadEnterpriseRelayModule({ ledger: { reserve() { throw Error("MUST_NOT_RESERVE"); } } });
  const mutations = [
    p => ({ ...p, brand: "JMP" }), p => ({ ...p, to: "client@example.com" }),
    p => ({ ...p, to: ["foundation@jmerrill.one", "client@example.com"] }),
    p => ({ ...p, templateId: "FOUNDATION.OTHER" }), p => ({ ...p, templateVersion: "2.0.0" }),
    ...["subject", "html", "plainText", "body", "bodyText", "sourceRecord", "from", "senderAddress", "replyTo", "cc", "bcc", "recipients", "recipient", "attachments", "idempotencyKey", "correlationId", "recordLink", "businessObjectType", "businessObjectId", "messageType", "riskClassification"].map(
      key => p => ({ ...p, [key]: "PRIVATE_INQUIRY_DO_NOT_LOG" })),
    ...["name", "email", "message", "url", "leadId"].map(key => p => ({ ...p, templateData: { ...p.templateData, [key]: "PRIVATE_INQUIRY_DO_NOT_LOG" } })),
    ...[null, 123, "00000000-0000-0000-0000-000000000000", "90000000-0000-4000-A000-000000000019", "90000000-0000-4000-a000-000000000019\n", "<script>PRIVATE_INQUIRY_DO_NOT_LOG</script>"].map(
      referenceId => p => ({ ...p, templateData: { referenceId } })),
    p => ({ ...p, templateData: null }), () => null, () => [], () => "PRIVATE_INQUIRY_DO_NOT_LOG"
  ];
  for (const mutate of mutations) for (const route of ["send-enterprise-governed-email", "relay-authority-probe"]) {
    const result = await relay.routes[route].handler(routeRequest(mutate(foundationPayload()), foundationHeaders()), quietContext);
    assert.equal(result.status, 400);
    assert.equal(JSON.stringify(result).includes("PRIVATE_INQUIRY_DO_NOT_LOG"), false);
  }
});

test("Foundation template cannot be borrowed; generic GUID filter is unchanged", async (t) => {
  const previousKey = process.env.JM1_RELAY_API_KEY;
  process.env.JM1_RELAY_API_KEY = "synthetic-only";
  t.after(() => {
    if (previousKey === undefined) delete process.env.JM1_RELAY_API_KEY;
    else process.env.JM1_RELAY_API_KEY = previousKey;
  });
  const relay = loadEnterpriseRelayModule({ ledger: { reserve() { throw Error("MUST_NOT_RESERVE"); } } });
  for (const oid of ["ce363f5a-94f3-4ea9-9ba3-061404fca098", "8a488b86-7a1a-4978-8705-6fbc3bd8ce15", "e8c51a80-bdb0-46fa-b398-9109719d6427", "38b09d6f-34d9-48b3-9627-f04c047fd534", "00000000-0000-4000-a000-000000000001"]) {
    const result = await relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload(), workloadHeaders(oid)), quietContext);
    assert.ok([400, 403].includes(result.status));
  }
  assert.equal((await relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload()), quietContext)).status, 401);
  assert.equal((await relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload(), { "x-jm1-relay-key": "synthetic-only" }), quietContext)).status, 403);
  const generic = relay.validateEnterprisePayload(validPayload({ brand: "JMFN", plainText: foundationPayload().templateData.referenceId }));
  assert.equal(generic.reason, "HUMAN_FIRST_INTERNAL_LANGUAGE_BLOCKED");
  const notice = relay.validateEnterprisePayload(foundationPayload()).value;
  assert.equal(notice.renderMetadata.audience, "INTERNAL_OPERATIONS");
  assert.equal(notice.businessObjectId, foundationPayload().templateData.referenceId);
  assert.equal(notice.correlationId, notice.businessObjectId);
  assert.equal(notice.businessObjectType, "FOUNDATION_VOLUNTEER_INQUIRY_RECEIPT");
  assert.equal(notice.messageType, "INTERNAL_VOLUNTEER_INQUIRY_NOTICE");
  assert.equal(notice.riskClassification, "ROUTINE");
  assert.equal(notice.html.includes("href="), false);
});

test("Foundation revoked or changed caller scope denies both routes before effects", async () => {
  const { findCallerByObjectId } = require("../src/policy/callerRegistry");
  const caller = findCallerByObjectId("cb36ea0b-8ba6-4798-a836-47a52e340675");
  for (const changes of [{ status: "INACTIVE" }, { status: "REVOKED" }, { authorizedBrands: ["JMP"] }, { authorizedTemplates: [] }, { authorizedRecipients: ["jackie@jmerrill.one"] }]) {
    const forbidden = () => { throw Error("SIDE_EFFECT_FORBIDDEN"); };
    const relay = loadEnterpriseRelayModule({ caller: { ...caller, ...changes }, client: { beginSend: forbidden }, ledger: { reserve: forbidden } });
    for (const route of ["relay-authority-probe", "send-enterprise-governed-email"]) {
      const result = await relay.routes[route].handler(routeRequest(foundationPayload(), foundationHeaders()), quietContext);
      assert.equal(result.status, 403);
      assert.notEqual(result.jsonBody.authorized, true);
    }
  }
});

test("Foundation accepted replay survives restart with one provider call and metadata-only receipt", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const table = bp09MemoryTable();
  let sends = 0;
  const options = () => ({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger: createLedger(table),
    client: { beginSend: async message => {
      sends++;
      assert.equal(message.senderAddress, "foundation@email.jmerrill.one");
      assert.equal(message.recipients.to[0].address, "foundation@jmerrill.one");
      assert.equal(message.recipients.cc[0].address, "foundation@jmerrill.one");
      return { pollUntilDone: async () => ({ status: "Succeeded", id: "provider-foundation" }) };
    } } });
  const send = relay => relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload(), foundationHeaders()), quietContext);
  const first = await send(loadEnterpriseRelayModule(options()));
  assert.equal(first.status, 202); assert.equal(first.jsonBody.accepted, true);
  const replay = await send(loadEnterpriseRelayModule(options()));
  assert.equal(replay.status, 200); assert.equal(replay.jsonBody.replay, true);
  assert.equal(replay.jsonBody.jm1MessageId, first.jsonBody.jm1MessageId);
  assert.equal(replay.jsonBody.providerMessageId, "provider-foundation");
  assert.equal(sends, 1); assert.equal(table.rows.size, 1);
  const stored = [...table.rows.values()][0];
  assert.equal(stored.communicationState, "PROVIDER_ACCEPTED");
  assert.equal(stored.mailboxVerifiedAt, undefined);
  for (const field of ["templateData", "html", "plainText", "subject", "message", "submission", "name", "email"]) assert.equal(Object.hasOwn(stored, field), false);
  table.rows.set(`${stored.partitionKey}/${stored.rowKey}`, { ...stored, fingerprint: "different-effect" });
  const conflict = await send(loadEnterpriseRelayModule(options()));
  assert.equal(conflict.status, 409); assert.equal(conflict.jsonBody.code, "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(sends, 1);
});

test("Foundation uncertain provider result remains submitted and never blindly resends", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const table = bp09MemoryTable(); let sends = 0;
  const options = () => ({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger: createLedger(table),
    client: { beginSend: async () => { sends++; throw Error("transport timeout"); } } });
  const send = relay => relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload(), foundationHeaders()), quietContext);
  assert.equal((await send(loadEnterpriseRelayModule(options()))).status, 502);
  assert.equal([...table.rows.values()][0].communicationState, "SUBMITTED");
  const replay = await send(loadEnterpriseRelayModule(options()));
  assert.equal(replay.status, 202); assert.equal(replay.jsonBody.accepted, false);
  assert.equal(replay.jsonBody.inProgress, true); assert.equal(sends, 1);
});

test("Foundation pre-reservation failure is retryable without duplicate provider effects", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const ledger = createLedger(bp09MemoryTable()); const original = ledger.reserve;
  let attempts = 0, sends = 0;
  ledger.reserve = async input => { if (++attempts === 1) throw Error("store unavailable"); return original(input); };
  const relay = loadEnterpriseRelayModule({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger,
    client: { beginSend: async () => { sends++; return { pollUntilDone: async () => ({ status: "Succeeded", id: "provider-foundation-retry" }) }; } } });
  const send = () => relay.routes["send-enterprise-governed-email"].handler(routeRequest(foundationPayload(), foundationHeaders()), quietContext);
  assert.equal((await send()).status, 502); assert.equal(sends, 0);
  assert.equal((await send()).jsonBody.accepted, true); assert.equal(sends, 1);
});

test("BP09 no-send probe validates the complete bounded contract with no provider or ledger access", async () => {
  const forbidden = () => { throw new Error("SIDE_EFFECT_FORBIDDEN"); };
  const relay = loadEnterpriseRelayModule({ client: { beginSend: forbidden }, ledger: { reserve: forbidden } });
  const result = await relay.routes["relay-authority-probe"].handler(routeRequest(bp09Payload(), bp09Headers()));
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.noSend, true);
  assert.equal(result.jsonBody.callerId, "one-bp09-productions-prod");
  assert.equal(result.jsonBody.recipient, "productions@jmerrill.one");
  assert.equal(result.jsonBody.senderAddress, "productions@email.jmerrill.one");
  assert.equal(result.jsonBody.replyTo, "productions@jmerrill.one");
});

test("BP09 denies all nonreference fields and cross-brand sender/destination overrides without reflecting content", async () => {
  const relay = loadEnterpriseRelayModule({ ledger: { reserve() { throw new Error("MUST_NOT_RESERVE"); } } });
  const mutations = [
    (p) => ({ ...p, brand: "JMP" }),
    (p) => ({ ...p, to: "jackie@jmerrill.one" }),
    (p) => ({ ...p, to: ["productions@jmerrill.one", "client@example.com"] }),
    (p) => ({ ...p, templateId: "PRODUCTIONS.OTHER" }),
    (p) => ({ ...p, templateVersion: "2.0.0" }),
    ...["subject", "html", "plainText", "body", "bodyText", "sourceRecord", "from", "senderAddress", "replyTo", "cc", "bcc", "recipients", "attachments", "idempotencyKey", "correlationId", "recordLink"].map(
      (key) => (p) => ({ ...p, [key]: "PRIVATE_INQUIRY_DO_NOT_LOG" })),
    (p) => ({ ...p, templateData: { ...p.templateData, message: "PRIVATE_INQUIRY_DO_NOT_LOG" } }),
    (p) => ({ ...p, templateData: { ...p.templateData, leadId: "https://evil.invalid/PRIVATE_INQUIRY_DO_NOT_LOG" } }),
    (p) => ({ ...p, templateData: { ...p.templateData, referenceId: "00000000-0000-0000-0000-000000000000" } }),
    (p) => ({ ...p, templateData: null }),
    () => null, () => [], () => "PRIVATE_INQUIRY_DO_NOT_LOG"
  ];
  for (const mutate of mutations) {
    for (const name of ["send-enterprise-governed-email", "relay-authority-probe"]) {
      const result = await relay.routes[name].handler(routeRequest(mutate(bp09Payload()), bp09Headers()), quietContext);
      assert.equal(result.status, 400, name);
      assert.equal(JSON.stringify(result).includes("PRIVATE_INQUIRY_DO_NOT_LOG"), false);
    }
  }
});

test("BP09 probe and send enforce inactive, revoked and wrong registry scopes before side effects", async () => {
  const { findCallerByObjectId } = require("../src/policy/callerRegistry");
  const caller = findCallerByObjectId("38b09d6f-34d9-48b3-9627-f04c047fd534");
  const cases = [
    [{ status: "INACTIVE" }, "CALLER_INACTIVE"],
    [{ status: "REVOKED" }, "CALLER_INACTIVE"],
    [{ authorizedBrands: [] }, "CALLER_BRAND_NOT_AUTHORIZED"],
    [{ authorizedBrands: ["JMP"] }, "CALLER_BRAND_NOT_AUTHORIZED"],
    [{ authorizedTemplates: [] }, "CALLER_TEMPLATE_NOT_AUTHORIZED"],
    [{ authorizedTemplates: ["PRODUCTIONS.OTHER"] }, "CALLER_TEMPLATE_NOT_AUTHORIZED"],
    [{ authorizedRecipients: [] }, "CALLER_RECIPIENT_NOT_AUTHORIZED"],
    [{ authorizedRecipients: ["jackie@jmerrill.one"] }, "CALLER_RECIPIENT_NOT_AUTHORIZED"]
  ];
  for (const [changes, reason] of cases) {
    let sideEffects = 0;
    const forbidden = () => { sideEffects++; throw new Error("SIDE_EFFECT_FORBIDDEN"); };
    const relay = loadEnterpriseRelayModule({ caller: { ...caller, ...changes },
      client: { beginSend: forbidden }, ledger: { reserve: forbidden } });
    for (const name of ["relay-authority-probe", "send-enterprise-governed-email"]) {
      const result = await relay.routes[name].handler(routeRequest(bp09Payload(), bp09Headers()), quietContext);
      assert.equal(result.status, 403, `${name}: ${JSON.stringify(changes)}`);
      assert.equal(result.jsonBody.reason, reason);
      assert.notEqual(result.jsonBody.authorized, true);
    }
    assert.equal(sideEffects, 0);
  }
});

test("BP09 template cannot be borrowed by Publishing, JSJ, diagnostic, anonymous or unknown callers", async () => {
  const relay = loadEnterpriseRelayModule({ ledger: { reserve() { throw new Error("MUST_NOT_RESERVE"); } } });
  for (const oid of ["ce363f5a-94f3-4ea9-9ba3-061404fca098", "8a488b86-7a1a-4978-8705-6fbc3bd8ce15", "e8c51a80-bdb0-46fa-b398-9109719d6427", "00000000-0000-4000-a000-000000000001"]) {
    const result = await relay.routes["send-enterprise-governed-email"].handler(routeRequest(bp09Payload(), workloadHeaders(oid)), quietContext);
    assert.equal(result.status, 403);
  }
  assert.equal((await relay.routes["send-enterprise-governed-email"].handler(routeRequest(bp09Payload()), quietContext)).status, 401);
});

test("BP09 rendering is internal-only, reference-only and fixes links to the existing Lead authority", () => {
  const relay = loadEnterpriseRelayModule();
  const rendered = relay.validateEnterprisePayload(bp09Payload());
  assert.equal(rendered.ok, true);
  assert.equal(rendered.value.renderMetadata.audience, "INTERNAL_OPERATIONS");
  assert.match(rendered.value.html, /https:\/\/jm1hq\.crm\.dynamics\.com\/main\.aspx\?pagetype=entityrecord&amp;etn=lead&amp;id=90000000-0000-4000-a000-000000000010/);
  assert.equal(rendered.value.idempotencyKey, "bp09:productions:notice:90000000-0000-4000-a000-000000000009");
  assert.equal(rendered.value.businessObjectId, bp09Payload().templateData.referenceId);
  assert.equal(rendered.value.to.length, 1);
  assert.equal(rendered.value.cc[0].address, "productions@jmerrill.one");
  assert.equal(rendered.value.renderMetadata.htmlSha256.length, 64);
});

function bp09MemoryTable() {
  const rows = new Map();
  return { rows, async createTable() {},
    async createEntity(row) {
      const key = `${row.partitionKey}/${row.rowKey}`;
      if (rows.has(key)) throw Object.assign(new Error("exists"), { statusCode: 409 });
      rows.set(key, { ...row });
    },
    async getEntity(pk, rk) { return { ...rows.get(`${pk}/${rk}`) }; },
    async updateEntity(row) {
      const key = `${row.partitionKey}/${row.rowKey}`;
      rows.set(key, { ...rows.get(key), ...row });
    }
  };
}

test("BP09 accepted replay survives runtime recreation and changed Lead conflicts without second provider call", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const table = bp09MemoryTable();
  let sends = 0;
  const options = () => ({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger: createLedger(table),
    client: { beginSend: async () => { sends++; return { pollUntilDone: async () => ({ status: "Succeeded", id: "provider-bp09" }) }; } } });
  const send = (relay, payload = bp09Payload()) => relay.routes["send-enterprise-governed-email"].handler(routeRequest(payload, bp09Headers()), quietContext);
  const first = await send(loadEnterpriseRelayModule(options()));
  assert.equal(first.status, 202);
  assert.equal(first.jsonBody.providerMessageId, "provider-bp09");
  const restarted = loadEnterpriseRelayModule(options());
  const replay = await send(restarted);
  assert.equal(replay.status, 200);
  assert.equal(replay.jsonBody.replay, true);
  assert.equal(replay.jsonBody.jm1MessageId, first.jsonBody.jm1MessageId);
  const changed = bp09Payload();
  changed.templateData.leadId = "90000000-0000-4000-a000-000000000011";
  const conflict = await send(restarted, changed);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.jsonBody.accepted, false);
  assert.equal(conflict.jsonBody.code, "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(sends, 1);
  assert.equal(table.rows.size, 1);
  const stored = [...table.rows.values()][0];
  assert.equal(stored.communicationState, "PROVIDER_ACCEPTED");
  assert.equal(stored.providerMessageId, "provider-bp09");
  for (const field of ["templateData", "html", "plainText", "subject", "message", "submission"]) assert.equal(Object.hasOwn(stored, field), false);
});

test("BP09 ambiguous send remains submitted after restart, exact retry does not resend", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const table = bp09MemoryTable();
  let sends = 0;
  const options = () => ({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger: createLedger(table),
    client: { beginSend: async () => { sends++; throw new Error("transport timeout"); } } });
  const send = (relay) => relay.routes["send-enterprise-governed-email"].handler(routeRequest(bp09Payload(), bp09Headers()), quietContext);
  const failed = await send(loadEnterpriseRelayModule(options()));
  assert.equal(failed.status, 502);
  assert.equal([...table.rows.values()][0].communicationState, "SUBMITTED");
  const replay = await send(loadEnterpriseRelayModule(options()));
  assert.equal(replay.status, 202);
  assert.equal(replay.jsonBody.accepted, false);
  assert.equal(replay.jsonBody.inProgress, true);
  assert.equal(sends, 1);
});

test("BP09 failure before reservation safely retries with the same request", async () => {
  const { createLedger } = require("../src/state/messageLedger");
  const ledger = createLedger(bp09MemoryTable());
  const original = ledger.reserve;
  let attempts = 0, sends = 0;
  ledger.reserve = async (input) => {
    if (++attempts === 1) throw Object.assign(new Error("unavailable"), { safeCode: "MESSAGE_STORE_UNAVAILABLE" });
    return original(input);
  };
  const relay = loadEnterpriseRelayModule({ env: { ACS_CONNECTION_STRING: "fixture" }, ledger,
    client: { beginSend: async () => { sends++; return { pollUntilDone: async () => ({ status: "Succeeded", id: "provider-retry" }) }; } } });
  const send = () => relay.routes["send-enterprise-governed-email"].handler(routeRequest(bp09Payload(), bp09Headers()), quietContext);
  assert.equal((await send()).status, 502);
  assert.equal(sends, 0);
  assert.equal((await send()).jsonBody.accepted, true);
  assert.equal(sends, 1);
});
