"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  markAgreementReadyForManualSignatureSend,
  recordAgreementSentManually,
  GATE_NAME,
  READY_EVENT_TYPE,
  SENT_EVENT_TYPE,
  READY_FOR_MANUAL_SIGNATURE_SEND,
  AGREEMENT_SENT_MANUALLY,
  WAITING_ON_JMP,
  WAITING_ON_AUTHOR
} = require("../src/agreement/manualSignatureHandoff");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const opportunityId = "455daa4a-629f-f111-b8dc-6045bdd69678";

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => "" },
    async json() { return body; }
  };
}

function mockFetchSequence(responses) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return next;
  };
  return calls;
}

function handoffInput(overrides = {}) {
  return {
    opportunityId,
    intakeReferenceCode: "JMP-INT-202608-0AOS7L",
    authorName: "Quanisha Dockery",
    authorEmail: "chosen2k7@gmail.com",
    title: "Indomitable",
    documentLocation: "governed-publishing-artifacts/agreements/indomitable/manual-signature-package",
    artifacts: [
      {
        name: "JMP_Publishing_Agreement_Indomitable.docx",
        location: "governed-publishing-artifacts/agreements/indomitable/agreement.docx",
        sha256: "a".repeat(64)
      },
      {
        name: "JMP_Publishing_Package_Addendum_Indomitable.pdf",
        location: "governed-publishing-artifacts/agreements/indomitable/addendum.pdf",
        sha256: "b".repeat(64)
      }
    ],
    confirmManualSignatureHandoff: true,
    ...overrides
  };
}

beforeEach(() => {
  process.env[GATE_NAME] = "true";
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("markAgreementReadyForManualSignatureSend", () => {
  test("records validated agreement package readiness and waits on JMP without sending", async () => {
    const calls = mockFetchSequence([
      jsonResponse({ value: [] }),
      jsonResponse({ jm1_executionlogid: "ready-log" }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await markAgreementReadyForManualSignatureSend(handoffInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(result.code, READY_EVENT_TYPE);
    assert.equal(result.status, READY_FOR_MANUAL_SIGNATURE_SEND);
    assert.equal(result.waitingOn, WAITING_ON_JMP);
    assert.equal(result.communication.automaticSend, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.invokedAdobeSign, false);
    assert.equal(result.liveActions.invokedSignNow, false);
    assert.equal(result.liveActions.createdProviderEnvelope, false);
    assert.equal(result.liveActions.chargedCard, false);

    const patch = calls.find((call) => call.options.method === "PATCH");
    assert.equal(JSON.parse(patch.options.body).jm1_m6agreementpreparationstatus, READY_FOR_MANUAL_SIGNATURE_SEND);
    const log = calls.find((call) => call.options.method === "POST");
    const logBody = JSON.parse(log.options.body);
    assert.equal(logBody.jm1_actiontype, READY_EVENT_TYPE);
    assert.match(logBody.jm1_actiondescription, /No automatic author email/);
    assert.match(logBody.jm1_actiondescription, /Adobe Sign call/);
    assert.match(logBody.jm1_actiondescription, /SignNow call/);
  });

  test("fails closed when artifact authority is missing", async () => {
    const calls = mockFetchSequence([]);

    const result = await markAgreementReadyForManualSignatureSend(
      handoffInput({ artifacts: [] }),
      { getToken: async () => "fake" }
    );

    assert.equal(result.ok, false);
    assert.equal(result.reason, "INPUT_VALIDATION_FAILED");
    assert.ok(result.errors.includes("AGREEMENT_ARTIFACTS_REQUIRED"));
    assert.equal(calls.length, 0);
  });
});

describe("recordAgreementSentManually", () => {
  test("records Jackie manual send and moves wait owner to author", async () => {
    mockFetchSequence([
      jsonResponse({ value: [] }),
      jsonResponse({ jm1_executionlogid: "sent-log" }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await recordAgreementSentManually(handoffInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(result.code, SENT_EVENT_TYPE);
    assert.equal(result.status, AGREEMENT_SENT_MANUALLY);
    assert.equal(result.waitingOn, WAITING_ON_AUTHOR);
    assert.equal(result.communication.from, "publishing@email.jmerrill.one");
    assert.equal(result.communication.replyTo, "publishing@jmerrill.one");
    assert.equal(result.communication.cc, "publishing@jmerrill.one");
    assert.equal(result.communication.htmlRequired, true);
    assert.equal(result.communication.automaticSend, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.invokedAdobeSign, false);
    assert.equal(result.liveActions.invokedSignNow, false);
  });

  test("duplicate manual-send record is idempotent and creates no duplicate evidence event", async () => {
    const calls = mockFetchSequence([
      jsonResponse({ value: [{ jm1_executionlogid: "existing-sent-log", createdon: "2026-08-24T03:00:00Z" }] }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await recordAgreementSentManually(handoffInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(result.idempotentReplay, true);
    assert.equal(result.executionLogId, "existing-sent-log");
    assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
    assert.equal(calls.filter((call) => call.options.method === "PATCH").length, 1);
  });
});
