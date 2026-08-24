"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  continuePaymentOptionCommercialPath,
  validateSelectedPaymentState,
  GATE_NAME,
  EVENT_TYPE,
  AGREEMENT_PREPARATION_READY,
  READY_FOR_MANUAL_SIGNATURE_SEND,
  WAITING_ON_JMP,
  NEXT_AGREEMENT_ACTION
} = require("../src/author/paymentOptionCommercialContinuation");

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

function opportunity(overrides = {}) {
  return {
    opportunityid: opportunityId,
    name: "Indomitable — Professional Publishing Package — Quanisha Dockery",
    jm1pub_intaketrackingid: "JMP-INT-202608-0AOS7L",
    jm1pub_projecttitle: "Indomitable",
    jm1_m6authorselectedpackagecode: "JMP-PKG-PRO",
    jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_SELECTED",
    jm1_m6selectedpaymentoption: "TWENTY_FOUR_PAYMENTS",
    jm1_m6selectedinstallmentcount: 24,
    jm1_m6selectedpaymentamount: 209.06,
    jm1_m6selectedpaymenttotal: 5017.50,
    jm1_m6paymentselectionreceivedon: "2026-08-24T01:51:12Z",
    jm1_m6paymentselectionsource: "PUBLISHING_MAILBOX_REPLY",
    jm1_m6agreementpreparationstatus: null,
    jm1pub_contractstatus: null,
    jm1pub_contracturl: null,
    ...overrides
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

function validInput(overrides = {}) {
  return {
    opportunityId,
    correlationId: "indomitable-commercial-continuation-test",
    paymentPolicyVersion: "JMP_FINANCING_EARLY_PAYOFF_v1.0",
    confirmPaymentOptionCommercialContinuation: true,
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

describe("validateSelectedPaymentState", () => {
  test("accepts Quanisha's governed 24-month selection", () => {
    const state = validateSelectedPaymentState(opportunity());
    assert.equal(state.ok, true);
    assert.equal(state.selected.installments, 24);
    assert.equal(state.selected.perInstallmentUsd, 209.06);
    assert.equal(state.selected.totalUsd, 5017.50);
  });

  test("fails closed when the Opportunity is not payment-option-selected", () => {
    const state = validateSelectedPaymentState(opportunity({ jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_PENDING" }));
    assert.equal(state.ok, false);
    assert.ok(state.errors.includes("PAYMENT_OPTION_NOT_SELECTED"));
  });
});

describe("continuePaymentOptionCommercialPath", () => {
  test("requires the dedicated continuation gate", async () => {
    delete process.env[GATE_NAME];
    const calls = mockFetchSequence([]);
    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("locks pricing for a valid 24-month selection and advances agreement readiness without charging or sending", async () => {
    const calls = mockFetchSequence([
      jsonResponse(opportunity()),
      jsonResponse({ value: [{ opportunityid: opportunityId, name: "Indomitable" }] }),
      jsonResponse({ value: [] }),
      jsonResponse({ jm1_executionlogid: "pricing-lock-log" }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(result.pricingLocked, true);
    assert.equal(result.snapshot.installmentCount, 24);
    assert.equal(result.snapshot.regularPayment, 209.06);
    assert.equal(result.snapshot.finalPayment, 209.12);
    assert.equal(result.snapshot.totalBeforeTax, 5017.50);
    assert.equal(result.snapshot.pricingException, false);
    assert.equal(result.agreement.blocker, null);
    assert.equal(result.agreement.waitingOn, WAITING_ON_JMP);
    assert.equal(result.agreement.nextAction, NEXT_AGREEMENT_ACTION);
    assert.equal(result.agreement.manualSignaturePolicy, true);
    assert.equal(result.requiredNextStateAfterAgreementValidation, READY_FOR_MANUAL_SIGNATURE_SEND);
    assert.equal(result.communication.htmlRequired, true);
    assert.equal(result.communication.sent, false);
    assert.equal(result.communication.blocker, null);
    assert.equal(result.liveActions.createdPricingLockEvent, true);
    assert.equal(result.liveActions.chargedCard, false);
    assert.equal(result.liveActions.resentPaymentOptionsEmail, false);
    assert.equal(result.liveActions.sentAgreementEmail, false);
    assert.equal(result.liveActions.createdEsignTransaction, false);
    assert.equal(result.liveActions.invokedAdobeSign, false);
    assert.equal(result.liveActions.invokedSignNow, false);
    assert.equal(result.liveActions.createdStripeCustomer, false);
    assert.equal(result.liveActions.createdStripeSchedule, false);

    const logPost = calls.find((call) => call.options.method === "POST" && call.url.includes("jm1_executionlogs"));
    assert.ok(logPost, "pricing lock evidence log is written once");
    const logBody = JSON.parse(logPost.options.body);
    assert.equal(logBody.jm1_actiontype, EVENT_TYPE);
    assert.match(logBody.jm1_actiondescription, /term 24/);
    assert.match(logBody.jm1_actiondescription, /regular payment \$209\.06/);
    assert.match(logBody.jm1_actiondescription, /final payment \$209\.12/);
    assert.match(logBody.jm1_actiondescription, /paid e-sign provider not required/);
    assert.match(logBody.jm1_actiondescription, /No author email/);
    assert.doesNotMatch(logBody.jm1_actiondescription, /SIGNNOW_OUTBOUND_SEND_ROUTE_MISSING/);

    const patch = calls.find((call) => call.options.method === "PATCH" && call.url.includes(`opportunities(${opportunityId})`));
    assert.equal(JSON.parse(patch.options.body).jm1_m6agreementpreparationstatus, AGREEMENT_PREPARATION_READY);
  });

  test("defaults this new-contract continuation wrapper to the current financing policy", async () => {
    mockFetchSequence([
      jsonResponse(opportunity()),
      jsonResponse({ value: [{ opportunityid: opportunityId, name: "Indomitable" }] }),
      jsonResponse({ value: [] }),
      jsonResponse({ jm1_executionlogid: "pricing-lock-log" }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await continuePaymentOptionCommercialPath(
      validInput({ paymentPolicyVersion: "" }),
      { getToken: async () => "fake" }
    );

    assert.equal(result.ok, true);
    assert.equal(result.snapshot.paymentPolicyVersion, "JMP_FINANCING_EARLY_PAYOFF_v1.1");
    assert.equal(result.snapshot.totalBeforeTax, 5017.50);
  });

  test("duplicate replay reuses the existing pricing-lock event and does not create another one", async () => {
    const calls = mockFetchSequence([
      jsonResponse(opportunity()),
      jsonResponse({ value: [{ opportunityid: opportunityId, name: "Indomitable" }] }),
      jsonResponse({ value: [{ jm1_executionlogid: "existing-lock-log", jm1_actiondescription: "Payment-option pricing locked" }] }),
      jsonResponse({ opportunityid: opportunityId })
    ]);

    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, true);
    assert.equal(result.idempotentReplay, true);
    assert.equal(result.executionLogId, "existing-lock-log");
    assert.equal(calls.filter((call) => call.options.method === "POST" && call.url.includes("jm1_executionlogs")).length, 0);
    assert.equal(result.liveActions.createdDuplicatePricingLock, false);
  });

  test("stops on duplicate Opportunity candidates", async () => {
    mockFetchSequence([
      jsonResponse(opportunity()),
      jsonResponse({ value: [{ opportunityid: opportunityId }, { opportunityid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }] })
    ]);

    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "DUPLICATE_OR_CONFLICTING_OPPORTUNITY");
  });

  test("stops instead of duplicating when an agreement or contract state already exists", async () => {
    mockFetchSequence([
      jsonResponse(opportunity({
        jm1pub_contractstatus: "SENT_FOR_SIGNATURE",
        jm1pub_contracturl: "https://example.invalid/agreement"
      }))
    ]);

    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "EXISTING_AGREEMENT_OR_CONTRACT_STATE_PRESENT");
    assert.equal(result.contractStatus, "SENT_FOR_SIGNATURE");
    assert.equal(result.contractUrlPresent, true);
  });

  test("stops on a pricing mismatch instead of silently changing the author offer", async () => {
    mockFetchSequence([
      jsonResponse(opportunity({ jm1_m6selectedpaymenttotal: 5010.00 })),
      jsonResponse({ value: [{ opportunityid: opportunityId, name: "Indomitable" }] }),
      jsonResponse({ value: [] })
    ]);

    const result = await continuePaymentOptionCommercialPath(validInput(), { getToken: async () => "fake" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "PRICING_MISMATCH");
    assert.equal(result.expected.totalBeforeTax, 5017.50);
  });
});
