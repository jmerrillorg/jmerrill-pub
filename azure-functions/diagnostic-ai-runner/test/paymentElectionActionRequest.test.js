"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  NEW_FINANCING_POLICY_VERSION
} = require("../src/author/paymentPolicyEngine");
const {
  classifyPaymentElectionIntent,
  buildPaymentSchedule,
  requirePaymentElectionActionRequest,
  stablePaymentElectionActionRequestKey,
  validateAgreementCompletionEvent,
  wholePaymentElectionManualContinuityActionRequest
} = require("../src/author/paymentElectionActionRequest");

function agreementEvent(overrides = {}) {
  return {
    workId: "work-Whole",
    engagementId: "eng-Whole",
    opportunityId: "11111111-1111-4111-8111-111111111111",
    agreementId: "adobe-agreement-Whole",
    agreementVersion: "v1.0",
    executionState: "COMPLETED",
    currentAgreement: true,
    currentAgreementChecksum: "sha256-whole-current-agreement",
    contractedTotalUsd: 1999.00,
    paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
    ...overrides
  };
}

test("agreement completion event requires complete current agreement authority", () => {
  assert.equal(validateAgreementCompletionEvent(agreementEvent()).ok, true);
  assert.equal(validateAgreementCompletionEvent(agreementEvent({ currentAgreement: false })).reason, "STALE_OR_SUPERSEDED_AGREEMENT");
  assert.equal(validateAgreementCompletionEvent(agreementEvent({ executionState: "SENT" })).reason, "AGREEMENT_NOT_EXECUTED");
  const missing = validateAgreementCompletionEvent(agreementEvent({ agreementId: "" }));
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ["agreementId"]);
});

test("existing payment election blocks a new action request and communication", async () => {
  const result = await requirePaymentElectionActionRequest(agreementEvent(), {
    findExistingPaymentElection: async () => ({ selectedPaymentOption: "FULL_PAY" })
  });
  assert.equal(result.action, "PAYMENT_ELECTION_ALREADY_EXISTS");
  assert.equal(result.communicationRequired, false);
  assert.equal(result.actionRequest, null);
});

test("duplicate agreement events reuse the existing open payment-election action request", async () => {
  const key = stablePaymentElectionActionRequestKey(agreementEvent());
  let created = 0;
  const result = await requirePaymentElectionActionRequest(agreementEvent(), {
    findExistingPaymentElection: async () => null,
    findOpenActionRequest: async (idempotencyKey) => ({ actionRequestId: idempotencyKey, status: "OPEN" }),
    createActionRequest: async () => { created += 1; }
  });
  assert.equal(result.action, "REUSED_OPEN_ACTION_REQUEST");
  assert.equal(result.idempotencyKey, key);
  assert.equal(created, 0);
});

test("new current agreement without an election creates one open action request", async () => {
  const created = [];
  const result = await requirePaymentElectionActionRequest(agreementEvent(), {
    findExistingPaymentElection: async () => null,
    findOpenActionRequest: async () => null,
    createActionRequest: async (request) => created.push(request)
  });
  assert.equal(result.action, "CREATED_OPEN_ACTION_REQUEST");
  assert.equal(created.length, 1);
  assert.equal(created[0].status, "OPEN");
  assert.equal(result.communicationRequired, true);
});

test("existing Whole manual email evidence binds to the action request and prevents resend", () => {
  const request = wholePaymentElectionManualContinuityActionRequest();
  assert.equal(request.title, "Whole");
  assert.equal(request.communicationEvidence, "BOUND_TO_ACTION_REQUEST");
  assert.equal(request.communicationSentAt, "2026-09-15T18:11:35Z");
  assert.equal(request.paymentRequestCreated, false);
});

test("payment-election intent recognizes exact options and refuses ambiguous replies", () => {
  for (const [text, code] of [
    ["Full pay works for me", "FULL_PAY"],
    ["I'll do 2-pay", "2_PAY"],
    ["4 payments please", "4_PAY"],
    ["8-pay is best", "8_PAY"],
    ["12 payments", "12_PAY"],
    ["18-pay", "18_PAY"],
    ["24 payments please", "24_PAY"]
  ]) {
    assert.equal(classifyPaymentElectionIntent(text).selectedPaymentOption, code);
  }
  for (const text of ["installments", "maybe 12", "either 8 or 12", "not sure, probably 4-pay"]) {
    const result = classifyPaymentElectionIntent(text);
    assert.equal(result.ok, false);
    assert.equal(result.classification, "CLARIFICATION_REQUIRED");
  }
});

test("Whole Starter payment schedules are generated from the contracted total and selected plan only", () => {
  const full = buildPaymentSchedule({ contractedTotalUsd: 1999.00, paymentOptionCode: "FULL_PAY" });
  const twelve = buildPaymentSchedule({ contractedTotalUsd: 1999.00, paymentOptionCode: "12_PAY" });
  assert.equal(full.ok, true);
  assert.equal(full.contractedTotalUsd, 1999.00);
  assert.equal(full.totalDueUsd, 1999.00);
  assert.equal(twelve.ok, true);
  assert.equal(twelve.paymentCount, 12);
  assert.equal(twelve.installments.reduce((sum, row) => sum + Math.round(row.totalDueUsd * 100), 0), Math.round(twelve.totalDueUsd * 100));
  assert.equal(twelve.paymentOptionCode, "12_PAY");
  assert.equal(buildPaymentSchedule({ contractedTotalUsd: 1999.00, paymentOptionCode: "NOT_REAL" }).ok, false);
});
