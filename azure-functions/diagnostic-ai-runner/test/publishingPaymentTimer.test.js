"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isNoonEastern, paymentTimerMode, runPublishingPaymentTimer, selectPaymentCandidates } = require("../src/payment/publishingPaymentTimer");

const AS_OF = "2026-09-21T16:00:00.000Z";
const due = {
  jmpv2_agreementrecordid: "11111111-1111-4111-8111-111111111111",
  jmpv2_paymentledgerstatus: "ACTIVE",
  jmpv2_currentbalancecents: 11742,
  jmpv2_nextduedate: "2026-09-20T12:00:00.000Z",
  jmpv2_stripecustomerid: "cus_existing",
};

test("timer mode fails closed and recognizes dry run", () => {
  assert.equal(paymentTimerMode({}), "DISABLED");
  assert.equal(paymentTimerMode({ JMP_PUBLISHING_PAYMENT_TIMER_MODE: "dry_run" }), "DRY_RUN");
  assert.equal(paymentTimerMode({ JMP_PUBLISHING_PAYMENT_TIMER_MODE: "maybe" }), "INVALID");
});

test("hourly schedule selects only the noon Eastern execution window", () => {
  assert.equal(isNoonEastern(new Date("2026-09-21T16:00:00.000Z")), true);
  assert.equal(isNoonEastern(new Date("2026-09-21T15:00:00.000Z")), false);
});

test("candidate selection excludes paid, future, and unbound rows", () => {
  const rows = [
    due,
    { ...due, jmpv2_agreementrecordid: "paid", jmpv2_paymentledgerstatus: "PAID_IN_FULL" },
    { ...due, jmpv2_agreementrecordid: "future", jmpv2_nextduedate: "2026-10-20T12:00:00.000Z" },
    { ...due, jmpv2_agreementrecordid: "unbound", jmpv2_stripecustomerid: "" },
  ];
  assert.deepEqual(selectPaymentCandidates(rows, AS_OF).map((row) => row.jmpv2_agreementrecordid), [due.jmpv2_agreementrecordid]);
});

test("dry run reports candidates with zero financial effect", async () => {
  const result = await runPublishingPaymentTimer({ mode: "DRY_RUN", asOf: AS_OF, rows: [due] });
  assert.equal(result.status, "PASS");
  assert.equal(result.candidates, 1);
  assert.equal(result.financialEffects, 0);
});

test("enabled mode still fails closed without the separately commissioned execution gate", async () => {
  const result = await runPublishingPaymentTimer({ mode: "ENABLED", asOf: AS_OF, rows: [due], env: {} });
  assert.equal(result.status, "ATTENTION_REQUIRED");
  assert.equal(result.code, "PAYMENT_COLLECTION_NOT_AUTHORIZED");
  assert.equal(result.financialEffects, 0);
});
