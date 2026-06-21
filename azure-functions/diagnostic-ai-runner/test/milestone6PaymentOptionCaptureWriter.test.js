"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  writeMilestone6PaymentOptionCapture,
  validatePaymentOptionCapturePayload,
  buildPaymentOptionCaptureExecutionLogPayload,
  CAPTURE_GATE_NAME,
  ALLOWED_ENTITY_SET,
  ALLOWED_OPPORTUNITY_FIELDS
} = require("../src/author/milestone6PaymentOptionCaptureWriter");

const originalFetch = global.fetch;
const originalEnv = {
  [CAPTURE_GATE_NAME]: process.env[CAPTURE_GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

const VALID_PAYLOAD = Object.freeze({
  jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_SELECTED",
  jm1_m6selectedpaymentoption: "EIGHT_PAYMENTS",
  jm1_m6selectedinstallmentcount: 8,
  jm1_m6selectedpaymentamount: 585.00,
  jm1_m6selectedpaymenttotal: 4680.00,
  jm1_m6paymentselectionsource: "PUBLISHING_MAILBOX_REPLY",
  jm1_m6paymentselectionreceivedon: "2026-06-21T12:00:00.000Z",
  jm1_m6paymentselectionthreadsubject: "Next steps for Establishing Glory: The Library — Professional Publishing Package",
  jm1_m6paymentselectionevidencelog: "11111111-1111-1111-1111-111111111111"
});

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    opportunityPayload: { ...VALID_PAYLOAD },
    ...overrides
  };
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

function okPatchResponse() {
  return {
    ok: true,
    async json() {
      return { opportunityid: REAL_OPPORTUNITY_ID, "@odata.etag": "W/\"opp-etag-2\"" };
    }
  };
}

function okExecutionLogResponse() {
  return {
    ok: true,
    async json() {
      return { jm1_executionlogid: "44444444-4444-4444-4444-444444444444", "@odata.etag": "W/\"log-etag\"" };
    }
  };
}

beforeEach(() => {
  delete process.env[CAPTURE_GATE_NAME];
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

// ── validatePaymentOptionCapturePayload — allowlist + type enforcement ──────

describe("validatePaymentOptionCapturePayload — allowlist and type enforcement", () => {
  test("accepts a fully valid allowlisted payload", () => {
    assert.equal(validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD }).valid, true);
  });

  test("rejects a non-object payload", () => {
    assert.equal(validatePaymentOptionCapturePayload("nope").valid, false);
    assert.equal(validatePaymentOptionCapturePayload(null).valid, false);
  });

  test("rejects an empty payload", () => {
    const r = validatePaymentOptionCapturePayload({});
    assert.equal(r.valid, false);
    assert.equal(r.reason, "EMPTY_PAYLOAD");
  });

  test("rejects an unknown field", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, stripePaymentLinkUrl: "https://x" });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "UNKNOWN_FIELD_PRESENT");
    assert.ok(r.unknownFields.includes("stripePaymentLinkUrl"));
  });

  test("rejects a non-Opportunity field like an invoice/transaction field", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1fin_invoiceamount: 100 });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "UNKNOWN_FIELD_PRESENT");
  });

  test("rejects installment count out of 1-12 range", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6selectedinstallmentcount: 13 });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "INVALID_FIELD_VALUE");
    assert.ok(r.invalidFields.includes("jm1_m6selectedinstallmentcount"));
  });

  test("rejects a non-integer installment count", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6selectedinstallmentcount: 8.5 });
    assert.equal(r.valid, false);
  });

  test("rejects a negative payment amount", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6selectedpaymentamount: -10 });
    assert.equal(r.valid, false);
  });

  test("rejects a string where a number is required", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6selectedpaymentamount: "585.00" });
    assert.equal(r.valid, false);
  });

  test("rejects an invalid ISO date for receivedOn", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6paymentselectionreceivedon: "not-a-date" });
    assert.equal(r.valid, false);
  });

  test("rejects an empty-string status field", () => {
    const r = validatePaymentOptionCapturePayload({ ...VALID_PAYLOAD, jm1_m6paymentoptionselectionstatus: "  " });
    assert.equal(r.valid, false);
  });

  test("ALLOWED_OPPORTUNITY_FIELDS has exactly the nine payment-option capture fields", () => {
    assert.equal(ALLOWED_OPPORTUNITY_FIELDS.length, 9);
    for (const f of Object.keys(VALID_PAYLOAD)) {
      assert.ok(ALLOWED_OPPORTUNITY_FIELDS.includes(f), `${f} must be in the allowlist`);
    }
  });

  test("a partial valid payload (subset of fields) is accepted", () => {
    const r = validatePaymentOptionCapturePayload({
      jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_SELECTED",
      jm1_m6selectedpaymentoption: "SINGLE"
    });
    assert.equal(r.valid, true);
  });
});

// ── writeMilestone6PaymentOptionCapture — gate enforcement ───────────────────

describe("writeMilestone6PaymentOptionCapture — gate enforcement", () => {
  test("rejects when gate is absent (defaults closed), zero network calls", async () => {
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(result.gate, CAPTURE_GATE_NAME);
    assert.equal(calls.length, 0);
  });

  test("rejects when gate is explicitly false", async () => {
    process.env[CAPTURE_GATE_NAME] = "false";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("this gate is distinct from JM1_OPPORTUNITY_UPDATE_ENABLED", () => {
    assert.equal(CAPTURE_GATE_NAME, "JM1_PAYMENT_OPTION_CAPTURE_ENABLED");
    assert.notEqual(CAPTURE_GATE_NAME, "JM1_OPPORTUNITY_UPDATE_ENABLED");
  });
});

// ── No create/duplicate-Opportunity capability ───────────────────────────────

describe("writeMilestone6PaymentOptionCapture — no create/duplicate-Opportunity capability", () => {
  test("module exposes no create-style function", () => {
    const mod = require("../src/author/milestone6PaymentOptionCaptureWriter");
    const fnNames = Object.keys(mod).filter((k) => typeof mod[k] === "function");
    for (const name of fnNames) {
      assert.ok(!/create/i.test(name), `module must not export a create-style function: ${name}`);
    }
  });

  test("rejects a malformed Opportunity ID before any network call", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput({ opportunityId: "not-a-guid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_INVALID");
    assert.equal(calls.length, 0);
  });
});

// ── Input validation pass-through ────────────────────────────────────────────

describe("writeMilestone6PaymentOptionCapture — input validation enforced before gate/network", () => {
  test("rejects unknown fields before any network call", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(
      baseInput({ opportunityPayload: { ...VALID_PAYLOAD, stripeCheckoutUrl: "https://x" } })
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNKNOWN_FIELD_PRESENT");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed diagnosticId before any network call", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput({ diagnosticId: "bad" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });
});

// ── Successful controlled capture ────────────────────────────────────────────

describe("writeMilestone6PaymentOptionCapture — successful allowlisted PATCH", () => {
  test("performs exactly one PATCH and one execution-log POST when gate is open and payload is valid", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);

    const result = await writeMilestone6PaymentOptionCapture(baseInput(), FAKE_TOKEN_DEPS);

    assert.equal(result.ok, true);
    assert.equal(result.code, "MILESTONE_6_PAYMENT_OPTION_CAPTURED");
    assert.equal(result.opportunityId, REAL_OPPORTUNITY_ID);
    assert.deepEqual(result.fieldsUpdated.sort(), Object.keys(VALID_PAYLOAD).sort());

    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, "PATCH");
    assert.ok(calls[0].url.includes(`opportunities(${REAL_OPPORTUNITY_ID})`));
    assert.deepEqual(JSON.parse(calls[0].options.body), VALID_PAYLOAD);
    assert.equal(calls[1].options.method, "POST");
    assert.ok(calls[1].url.includes("jm1_executionlogs"));
  });

  test("execution log is created with an ID on success", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "44444444-4444-4444-4444-444444444444");
  });

  test("all liveActions flags are false except updatedOpportunity", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.liveActions.updatedOpportunity, true);
    for (const [key, value] of Object.entries(result.liveActions)) {
      if (key === "updatedOpportunity") continue;
      assert.equal(value, false, `${key} must be false`);
    }
  });

  test("execution-log write failure does not unwind a successful Opportunity update", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    mockFetchSequence([
      okPatchResponse(),
      { ok: false, status: 403, async json() { return { error: { code: "X" } }; } }
    ]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.executionLog.created, false);
    assert.ok(result.executionLog.diagnostics);
  });
});

// ── Dataverse failure handling ───────────────────────────────────────────────

describe("writeMilestone6PaymentOptionCapture — Dataverse failure handling", () => {
  test("returns DATAVERSE_CONFIG_MISSING when env vars are absent", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;
    const result = await writeMilestone6PaymentOptionCapture(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_CONFIG_MISSING");
  });

  test("returns a blocked result when the PATCH itself fails", async () => {
    process.env[CAPTURE_GATE_NAME] = "true";
    mockFetchSequence([{ ok: false, status: 404, async json() { return { error: { message: "Not Found" } }; } }]);
    const result = await writeMilestone6PaymentOptionCapture(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_WRITE_FAILED");
    assert.equal(result.httpStatus, 404);
  });
});

// ── buildPaymentOptionCaptureExecutionLogPayload — safety invariants ────────

describe("buildPaymentOptionCaptureExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      selectedPaymentOption: "EIGHT_PAYMENTS",
      installmentCount: 8,
      paymentAmount: 585.00,
      paymentTotal: 4680.00,
      selectionSource: "PUBLISHING_MAILBOX_REPLY",
      completedAt: "2026-06-21T12:05:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("includes the selected option, installment count, and amounts", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("EIGHT_PAYMENTS"));
    assert.ok(p.jm1_actiondescription.includes("8"));
    assert.ok(p.jm1_actiondescription.includes("585.00"));
    assert.ok(p.jm1_actiondescription.includes("4680.00"));
  });

  test("states no raw email body, raw Graph response, headers, tokens, or secrets stored", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("raw email body"));
    assert.ok(desc.includes("raw graph response"));
    assert.ok(desc.includes("tokens"));
    assert.ok(desc.includes("secrets"));
  });

  test("states no Stripe/contract/onboarding/production/distribution/launch/royalty/marketing action", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
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

  test("jm1_actiontype is the dedicated payment-option-captured event type", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
    assert.equal(p.jm1_actiontype, "MILESTONE_6_PAYMENT_OPTION_CAPTURED");
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildPaymentOptionCaptureExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});

describe("ALLOWED_ENTITY_SET", () => {
  test("is exactly 'opportunities'", () => {
    assert.equal(ALLOWED_ENTITY_SET, "opportunities");
  });
});
