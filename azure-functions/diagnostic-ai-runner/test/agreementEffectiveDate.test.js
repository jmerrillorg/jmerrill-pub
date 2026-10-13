"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { effectiveDateAtPreparation } = require("../src/agreement/agreementEffectiveDate");

test("uses Eastern calendar date, not UTC or a signing timestamp", () => {
  assert.equal(effectiveDateAtPreparation(new Date("2026-10-14T03:59:59Z")).value, "2026-10-13");
  assert.equal(effectiveDateAtPreparation(new Date("2026-10-14T04:00:00Z")).value, "2026-10-14");
  assert.equal(effectiveDateAtPreparation(new Date("2026-12-14T04:59:59Z")).value, "2026-12-13");
});

test("rejects an invalid clock", () => {
  assert.throws(() => effectiveDateAtPreparation(new Date("invalid")), { safeCode: "AGREEMENT_PREPARATION_CLOCK_INVALID" });
});
