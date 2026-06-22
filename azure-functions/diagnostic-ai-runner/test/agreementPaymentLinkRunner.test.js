"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  createAgreementPaymentLink,
  isProductionAuthorized,
  buildPaymentLinkExecutionLogPayload,
  GATE_NAME
} = require("../src/payment/agreementPaymentLinkRunner");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

beforeEach(() => {
  delete process.env[GATE_NAME];
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

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

function mockFetchAlwaysOk() {
  global.fetch = async () => jsonResponse({ jm1_executionlogid: "22222222-2222-2222-2222-222222222222" });
}

function controlledInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    packageCode: "JMP-PKG-PRO",
    paymentOptionCode: "EIGHT_PAYMENTS",
    confirmedInstallments: 8,
    confirmedPerInstallmentUsd: 585.00,
    confirmedTotalUsd: 4680.00,
    ...overrides
  };
}

function fakeCreatePaymentLink() {
  let called = false;
  let capturedArgs = null;
  const fn = async (args) => {
    called = true;
    capturedArgs = args;
    return { paymentLinkId: "plink_fake_123", paymentLinkUrl: "https://buy.stripe.com/fake_test_link" };
  };
  fn.wasCalled = () => called;
  fn.getCapturedArgs = () => capturedArgs;
  return fn;
}

describe("createAgreementPaymentLink — gate enforcement", () => {
  test("rejects when gate is absent — createPaymentLink never called", async () => {
    const createPaymentLink = fakeCreatePaymentLink();
    const result = await createAgreementPaymentLink(controlledInput(), { createPaymentLink, getToken: async () => "fake" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(createPaymentLink.wasCalled(), false);
  });

  test("when gate is closed, still safely reports what WOULD be created (already-confirmed figures only)", async () => {
    const result = await createAgreementPaymentLink(controlledInput(), { createPaymentLink: fakeCreatePaymentLink() });
    assert.equal(result.wouldCreateLinkFor.installments, 8);
    assert.equal(result.wouldCreateLinkFor.perInstallmentUsd, 585);
    assert.equal(result.wouldCreateLinkFor.totalUsd, 4680);
  });
});

describe("createAgreementPaymentLink — validation before gate check", () => {
  test("rejects malformed diagnosticId", async () => {
    const result = await createAgreementPaymentLink(controlledInput({ diagnosticId: "bad" }), {});
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
  });

  test("rejects a confirmed-figures mismatch even before checking the gate", async () => {
    const result = await createAgreementPaymentLink(controlledInput({ confirmedTotalUsd: 1.00 }), {});
    assert.equal(result.reason, "CONFIRMED_FIGURES_MISMATCH");
    assert.ok(result.mismatches.includes("TOTAL_AMOUNT_MISMATCH"));
  });

  test("rejects an unrecognized package code", async () => {
    const result = await createAgreementPaymentLink(controlledInput({ packageCode: "NOT_REAL" }), {});
    assert.equal(result.reason, "STRIPE_MAPPING_RESOLUTION_FAILED");
  });
});

describe("createAgreementPaymentLink — when the gate is open, creates exactly the confirmed JMP-PKG-PRO / EIGHT_PAYMENTS link", () => {
  test("calls createPaymentLink with the correct priceId, productId, amount, and installment count", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const createPaymentLink = fakeCreatePaymentLink();
    const result = await createAgreementPaymentLink(controlledInput(), { createPaymentLink, getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(createPaymentLink.wasCalled(), true);
    const args = createPaymentLink.getCapturedArgs();
    assert.equal(args.priceId, "price_1TjyuZJCiOVFpgYur0FWmcj7");
    assert.equal(args.productId, "prod_UjRnnUiTQgHlrm");
    assert.equal(args.perInstallmentCents, 58500);
    assert.equal(args.installments, 8);

    assert.equal(result.installments, 8);
    assert.equal(result.perInstallmentUsd, 585);
    assert.equal(result.totalUsd, 4680);
  });

  test("rejects when createPaymentLink dep is missing even with the gate open", async () => {
    process.env[GATE_NAME] = "true";
    const result = await createAgreementPaymentLink(controlledInput(), {});
    assert.equal(result.reason, "DEPS_MISSING_CREATE_PAYMENT_LINK");
  });
});

describe("createAgreementPaymentLink — never creates a customer, invoice, subscription, or charge; never starts production", () => {
  test("liveActions confirms link-only scope", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const result = await createAgreementPaymentLink(controlledInput(), { createPaymentLink: fakeCreatePaymentLink(), getToken: async () => "fake" });
    assert.equal(result.liveActions.createsPaymentLink, true);
    assert.equal(result.liveActions.createsStripeCustomer, false);
    assert.equal(result.liveActions.createsInvoice, false);
    assert.equal(result.liveActions.createsSubscription, false);
    assert.equal(result.liveActions.chargesCard, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.submitsDistribution, false);
    assert.equal(result.liveActions.activatesLaunch, false);
    assert.equal(result.liveActions.createsRoyaltyAction, false);
    assert.equal(result.liveActions.activatesMarketing, false);
  });
});

describe("isProductionAuthorized — production never follows from link creation alone", () => {
  test("returns false when no payment-received signal is present", () => {
    assert.equal(isProductionAuthorized({}), false);
    assert.equal(isProductionAuthorized({ paymentReceived: false }), false);
    assert.equal(isProductionAuthorized(undefined), false);
  });

  test("returns true ONLY with an explicit paymentReceived: true signal", () => {
    assert.equal(isProductionAuthorized({ paymentReceived: true }), true);
  });

  test("a payment link having been created is, by itself, never sufficient", () => {
    // paymentLinkCreated is deliberately not a recognized input field —
    // this documents that link creation alone cannot satisfy the guard.
    assert.equal(isProductionAuthorized({ paymentLinkCreated: true }), false);
  });
});

describe("createAgreementPaymentLink — never logs the payment link URL", () => {
  test("the execution-log payload never contains the payment link URL", async () => {
    process.env[GATE_NAME] = "true";
    const calls = [];
    global.fetch = async (url, options) => { calls.push(options.body); return jsonResponse({ jm1_executionlogid: "x" }); };
    await createAgreementPaymentLink(controlledInput(), { createPaymentLink: fakeCreatePaymentLink(), getToken: async () => "fake" });
    const logCall = calls.find((b) => b.includes("AGREEMENT_PAYMENT_LINK_CREATED"));
    assert.ok(!logCall.includes("buy.stripe.com"));
    assert.ok(!logCall.includes("plink_fake_123"));
  });
});

describe("buildPaymentLinkExecutionLogPayload", () => {
  function logInput() {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      computed: { option: { payments: 8 }, perInstallmentUsd: 585, totalUsd: 4680 },
      completedAt: "2026-06-22T00:00:00.000Z"
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildPaymentLinkExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("states link creation is not a payment and production requires a separate confirmed signal", () => {
    const p = buildPaymentLinkExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("not a payment"));
    assert.ok(desc.includes("separately confirmed payment-received signal"));
  });

  test("states no customer/invoice/subscription created and no production/distribution/launch/royalty/marketing action", () => {
    const p = buildPaymentLinkExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no stripe customer pre-created"));
    assert.ok(desc.includes("no production/distribution/launch/royalty/marketing action"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildPaymentLinkExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
