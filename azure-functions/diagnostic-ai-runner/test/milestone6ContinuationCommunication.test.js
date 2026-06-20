"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  sendMilestone6ContinuationCommunication,
  buildContinuationExecutionLogPayload,
  GATE_NAMES
} = require("../src/author/milestone6ContinuationCommunication");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAMES.authorResponseSend]: process.env[GATE_NAMES.authorResponseSend],
  [GATE_NAMES.publishingOnboarding]: process.env[GATE_NAMES.publishingOnboarding],
  [GATE_NAMES.agreementPreparation]: process.env[GATE_NAMES.agreementPreparation],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

const VALID_PAYMENT_OPTIONS = Object.freeze([
  { payments: 1, totalPerInstallmentUsd: 4680.00 },
  { payments: 2, totalPerInstallmentUsd: 2340.00 }
]);

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    projectTitle: "Establishing Glory: The Library",
    selectedPackageCode: "JMP-PKG-PRO",
    paymentOptions: VALID_PAYMENT_OPTIONS,
    approvedBy: "Jackie (J Merrill Publishing)",
    ...overrides
  };
}

function openAllGates() {
  process.env[GATE_NAMES.authorResponseSend] = "true";
  process.env[GATE_NAMES.publishingOnboarding] = "true";
  process.env[GATE_NAMES.agreementPreparation] = "true";
}

function closeAllGates() {
  delete process.env[GATE_NAMES.authorResponseSend];
  delete process.env[GATE_NAMES.publishingOnboarding];
  delete process.env[GATE_NAMES.agreementPreparation];
}

const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

function fakeContactOk() {
  return async () => ({
    ok: true,
    code: null,
    opportunityId: REAL_OPPORTUNITY_ID,
    authorName: "Jackie Smith Jr",
    authorEmail: "chosen2k7@gmail.com"
  });
}

function fakeContactFail(code) {
  return async () => ({ ok: false, code, opportunityId: REAL_OPPORTUNITY_ID, authorName: null, authorEmail: null });
}

function fakeSendOk(messageId = "msg-123") {
  return async () => ({
    ok: true,
    deliveryStatus: "AUTHOR_RESPONSE_SENT",
    authorEmailStatus: "AUTHOR_RESPONSE_SENT",
    internalVisibilityStatus: "INTERNAL_VISIBILITY_SATISFIED",
    providerMessageId: messageId,
    providerCalled: true
  });
}

function fakeSendFail(reason = "AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED") {
  return async () => ({ ok: false, reason, code: "AUTHOR_RESPONSE_SEND_PROVIDER_CONFIG_FAILED" });
}

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

function okExecutionLogResponse() {
  return {
    ok: true,
    async json() {
      return { jm1_executionlogid: "22222222-2222-2222-2222-222222222222", "@odata.etag": "W/\"log-etag\"" };
    }
  };
}

beforeEach(() => {
  closeAllGates();
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

// ── Gate enforcement ──────────────────────────────────────────────────────────

describe("sendMilestone6ContinuationCommunication — gate enforcement", () => {
  test("rejects when all gates are closed, with zero contact lookup or send attempted", async () => {
    let contactCalled = false;
    let sendCalled = false;
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: async () => { contactCalled = true; return fakeContactOk()(); },
      sendResponse: async () => { sendCalled = true; return fakeSendOk()(); }
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(contactCalled, false, "contact lookup must not occur when gates are closed");
    assert.equal(sendCalled, false, "send must not occur when gates are closed");
  });

  test("rejects when only JM1_AUTHOR_RESPONSE_SEND_ENABLED is true (others closed)", async () => {
    process.env[GATE_NAMES.authorResponseSend] = "true";
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken, readContact: fakeContactOk(), sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects when only JM1_PUBLISHING_ONBOARDING_ENABLED is true (others closed)", async () => {
    process.env[GATE_NAMES.publishingOnboarding] = "true";
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken, readContact: fakeContactOk(), sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects when only JM1_AGREEMENT_PREPARATION_ENABLED is true (others closed)", async () => {
    process.env[GATE_NAMES.agreementPreparation] = "true";
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken, readContact: fakeContactOk(), sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("proceeds only when all three gates are true", async () => {
    openAllGates();
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken, readContact: fakeContactOk(), sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, true);
  });
});

// ── Recipient confirmation ────────────────────────────────────────────────────

describe("sendMilestone6ContinuationCommunication — recipient confirmation", () => {
  test("rejects when the recipient cannot be confirmed from Dataverse", async () => {
    openAllGates();
    let sendCalled = false;
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactFail("OPPORTUNITY_CONTACT_EMAIL_MISSING"),
      sendResponse: async () => { sendCalled = true; return fakeSendOk()(); }
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "RECIPIENT_NOT_CONFIRMED");
    assert.equal(result.recipientCheckCode, "OPPORTUNITY_CONTACT_EMAIL_MISSING");
    assert.equal(sendCalled, false, "send must never occur when recipient is unconfirmed");
  });

  test("rejects when the Contact resolves to a @jmerrill.pub mailbox", async () => {
    openAllGates();
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactFail("JMERRILL_PUB_MAILBOX_NOT_ALLOWED"),
      sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, false);
    assert.equal(result.recipientCheckCode, "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("sendMilestone6ContinuationCommunication — input validation", () => {
  test("rejects missing diagnosticId before gate check", async () => {
    const result = await sendMilestone6ContinuationCommunication(baseInput({ diagnosticId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_MISSING");
  });

  test("rejects missing opportunityId", async () => {
    const result = await sendMilestone6ContinuationCommunication(baseInput({ opportunityId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_MISSING");
  });

  test("rejects missing approvedBy", async () => {
    const result = await sendMilestone6ContinuationCommunication(baseInput({ approvedBy: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "APPROVED_BY_MISSING");
  });
});

// ── Send failure handling ─────────────────────────────────────────────────────

describe("sendMilestone6ContinuationCommunication — send failure handling", () => {
  test("propagates a send failure without writing an execution log", async () => {
    openAllGates();
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: fakeSendFail()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED");
    assert.equal(calls.length, 0, "no execution-log write must occur when send fails");
  });

  test("rejects when the send result is ok but deliveryStatus is not AUTHOR_RESPONSE_SENT", async () => {
    openAllGates();
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: async () => ({ ok: true, deliveryStatus: "AUTHOR_RESPONSE_SEND_DISABLED" })
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SEND_NOT_CONFIRMED_SENT");
  });
});

// ── Successful send + evidence ────────────────────────────────────────────────

describe("sendMilestone6ContinuationCommunication — successful send and evidence", () => {
  test("returns ok with execution log created on success", async () => {
    openAllGates();
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: fakeSendOk("provider-msg-1")
    });
    assert.equal(result.ok, true);
    assert.equal(result.code, "MILESTONE_6_CONTINUATION_COMMUNICATION_SENT");
    assert.equal(result.providerMessageId, "provider-msg-1");
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "22222222-2222-2222-2222-222222222222");
  });

  test("execution-log write failure does not unwind a successful send", async () => {
    openAllGates();
    mockFetchSequence([{ ok: false, status: 403, async json() { return { error: { code: "X" } }; } }]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: fakeSendOk()
    });
    assert.equal(result.ok, true, "send success must stand even if log write fails");
    assert.equal(result.executionLog.created, false);
    assert.ok(result.executionLog.diagnostics);
  });

  test("all liveActions flags are false except the two send-related flags", async () => {
    openAllGates();
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: fakeSendOk()
    });
    assert.equal(result.liveActions.sentAuthorEmail, true);
    assert.equal(result.liveActions.sentInternalVisibilityCopy, true);
    for (const [key, value] of Object.entries(result.liveActions)) {
      if (key === "sentAuthorEmail" || key === "sentInternalVisibilityCopy") continue;
      assert.equal(value, false, `${key} must be false`);
    }
  });

  test("never returns the author email address anywhere in the result", async () => {
    openAllGates();
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await sendMilestone6ContinuationCommunication(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readContact: fakeContactOk(),
      sendResponse: fakeSendOk()
    });
    assert.ok(!JSON.stringify(result).includes("chosen2k7"));
  });
});

// ── buildContinuationExecutionLogPayload — safety invariants ────────────────

describe("buildContinuationExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      selectedPackageCode: "JMP-PKG-PRO",
      providerMessageId: "msg-1",
      completedAt: "2026-06-21T00:00:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("does not include the author's email address", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    assert.ok(!JSON.stringify(p).includes("chosen2k7"));
  });

  test("includes intake reference and Opportunity ID in the description", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes(REAL_INTAKE_REFERENCE));
    assert.ok(p.jm1_actiondescription.includes(REAL_OPPORTUNITY_ID));
  });

  test("explicitly states no Stripe/contract/production/distribution/launch/royalty/marketing action", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no stripe payment link"));
    assert.ok(desc.includes("no contract sent"));
    assert.ok(desc.includes("no production start"));
    assert.ok(desc.includes("distribution submission"));
    assert.ok(desc.includes("launch/release"));
    assert.ok(desc.includes("royalty action"));
    assert.ok(desc.includes("marketing action"));
  });

  test("explicitly states no manuscript/prompt/secret content stored", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("manuscript text"));
    assert.ok(desc.includes("prompt body"));
    assert.ok(desc.includes("secrets"));
  });

  test("jm1_actiontype is the dedicated continuation-send event type", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    assert.equal(p.jm1_actiontype, "MILESTONE_6_CONTINUATION_COMMUNICATION_SENT");
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildContinuationExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
