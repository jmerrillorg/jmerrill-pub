"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { checkPublishingMailboxReply, buildReplyCheckExecutionLogPayload } = require("../src/mail/publishingMailboxReplyCheck");
const { CLASSIFICATION } = require("../src/mail/publishingReplyClassifier");

const originalFetch = global.fetch;
const originalEnv = {
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const SUBJECT = "Next steps for Establishing Glory: The Library";
const AFTER_ISO = "2026-06-21T01:20:45Z";
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    subjectContains: SUBJECT,
    afterIso: AFTER_ISO,
    ...overrides
  };
}

function fakeReplyFound(bodyText, receivedDateTime = "2026-06-21T02:00:00Z") {
  return async () => ({
    ok: true,
    code: "REPLY_FOUND",
    found: true,
    senderAddress: "chosen2k7@gmail.com",
    receivedDateTime,
    bodyText
  });
}

function fakeReplyNotFound() {
  return async () => ({ ok: true, code: "NO_MATCHING_REPLY_FOUND", found: false, senderAddress: null, receivedDateTime: null, bodyText: null });
}

function fakeReplyBlocked(reason) {
  return async () => ({ ok: false, code: "PUBLISHING_MAILBOX_READ_BLOCKED", reason, found: false });
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
      return { jm1_executionlogid: "33333333-3333-3333-3333-333333333333", "@odata.etag": "W/\"log-etag\"" };
    }
  };
}

beforeEach(() => {
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

describe("checkPublishingMailboxReply — input validation", () => {
  test("rejects missing diagnosticId", async () => {
    const result = await checkPublishingMailboxReply(baseInput({ diagnosticId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_MISSING");
  });

  test("rejects missing subjectContains", async () => {
    const result = await checkPublishingMailboxReply(baseInput({ subjectContains: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SUBJECT_FILTER_MISSING");
  });

  test("rejects missing afterIso", async () => {
    const result = await checkPublishingMailboxReply(baseInput({ afterIso: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AFTER_TIMESTAMP_MISSING");
  });
});

describe("checkPublishingMailboxReply — propagates reader blocking (e.g. gate closed)", () => {
  test("propagates GATE_CLOSED from the reader without writing an execution log", async () => {
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyBlocked("GATE_CLOSED")
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0, "no execution-log write must occur when the reader is blocked");
  });
});

describe("checkPublishingMailboxReply — no reply found", () => {
  test("returns found=false and classification null, still writes evidence", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyNotFound()
    });
    assert.equal(result.ok, true);
    assert.equal(result.found, false);
    assert.equal(result.classification, null);
    assert.equal(result.paymentOptionDetails, null);
    assert.equal(result.executionLog.created, true);
  });
});

describe("checkPublishingMailboxReply — reply found and classified", () => {
  test('"8 payments" reply classifies as EIGHT_PAYMENTS with correct payment detail', async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("8 payments")
    });
    assert.equal(result.ok, true);
    assert.equal(result.found, true);
    assert.equal(result.classification, CLASSIFICATION.EIGHT_PAYMENTS);
    assert.equal(result.paymentOptionDetails.installments, 8);
    assert.equal(result.paymentOptionDetails.perInstallmentUsd, 585.00);
    assert.equal(result.paymentOptionDetails.feeApplies, true);
  });

  test("execution log is created with an ID on success", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("8 payments")
    });
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "33333333-3333-3333-3333-333333333333");
  });

  test("never returns the raw reply body text anywhere in the result", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const sensitiveBody = "8 payments — by the way here is something private";
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound(sensitiveBody)
    });
    assert.ok(!JSON.stringify(result).includes("by the way"));
    assert.ok(!JSON.stringify(result).includes("something private"));
  });

  test("reports the schema gap for Opportunity-level structured capture", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("8 payments")
    });
    assert.equal(result.schemaGap.opportunityLevelCaptureFieldsExist, false);
    assert.ok(result.schemaGap.note.includes("schema change"));
  });

  test("all liveActions flags are false except readMailbox", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("8 payments")
    });
    assert.equal(result.liveActions.readMailbox, true);
    for (const [key, value] of Object.entries(result.liveActions)) {
      if (key === "readMailbox") continue;
      assert.equal(value, false, `${key} must be false`);
    }
  });

  test("execution-log write failure does not unwind a successful check", async () => {
    mockFetchSequence([{ ok: false, status: 403, async json() { return { error: { code: "X" } }; } }]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("8 payments")
    });
    assert.equal(result.ok, true);
    assert.equal(result.executionLog.created, false);
    assert.ok(result.executionLog.diagnostics);
  });

  test("call-requested reply has null paymentOptionDetails", async () => {
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await checkPublishingMailboxReply(baseInput(), {
      getToken: FAKE_TOKEN_DEPS.getToken,
      readReply: fakeReplyFound("Can we schedule a call?")
    });
    assert.equal(result.classification, CLASSIFICATION.CALL_REQUESTED);
    assert.equal(result.paymentOptionDetails, null);
  });
});

describe("buildReplyCheckExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      found: true,
      classification: CLASSIFICATION.EIGHT_PAYMENTS,
      paymentOptionDetails: { installments: 8, perInstallmentUsd: 585.00, feeApplies: true },
      receivedDateTime: "2026-06-21T02:00:00Z",
      completedAt: "2026-06-21T02:05:00Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("includes the classification and payment-option detail in the description", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("EIGHT_PAYMENTS"));
    assert.ok(p.jm1_actiondescription.includes("installments: 8"));
    assert.ok(p.jm1_actiondescription.includes("585.00"));
  });

  test("never includes raw reply body text (no such field is even accepted as input)", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.ok(!("bodyText" in p));
    assert.ok(!("rawBody" in p));
  });

  test("states no raw Graph response, headers, tokens, or secrets stored", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("raw email body"));
    assert.ok(desc.includes("raw graph response"));
    assert.ok(desc.includes("tokens"));
    assert.ok(desc.includes("secrets"));
  });

  test("states no Stripe/contract/onboarding/production/distribution/launch/royalty/marketing action occurred", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no stripe object"));
    assert.ok(desc.includes("contract"));
    assert.ok(desc.includes("onboarding form"));
    assert.ok(desc.includes("production"));
    assert.ok(desc.includes("distribution"));
    assert.ok(desc.includes("launch"));
    assert.ok(desc.includes("royalty"));
    assert.ok(desc.includes("marketing"));
  });

  test("describes 'no Opportunity write occurs' when found is true", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("no Opportunity write occurs in this check"));
  });

  test("handles found=false without a classification", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput({ found: false, classification: null, paymentOptionDetails: null, receivedDateTime: null }));
    assert.ok(p.jm1_actiondescription.includes("No matching reply was found"));
    assert.ok(!p.jm1_actiondescription.includes("Classification:"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });

  test("jm1_actiontype is the dedicated reply-check event type", () => {
    const p = buildReplyCheckExecutionLogPayload(logInput());
    assert.equal(p.jm1_actiontype, "MILESTONE_6_PUBLISHING_MAILBOX_REPLY_CHECKED");
  });
});
