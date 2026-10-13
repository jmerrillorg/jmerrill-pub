"use strict";

const POLICY = Object.freeze({
  version: "JMP-AGREEMENT-EFFECTIVE-DATE-20261013-v1",
  timeZone: "America/New_York",
  rule: "CURRENT_DATE_AT_PREPARATION",
  authority: "Publisher instruction 2026-10-13: always use the current date as the effective",
});

function effectiveDateAtPreparation(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw Object.assign(new Error("AGREEMENT_PREPARATION_CLOCK_INVALID"), { safeCode: "AGREEMENT_PREPARATION_CLOCK_INVALID" });
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: POLICY.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = name => parts.find(p => p.type === name).value;
  return {
    value: `${part("year")}-${part("month")}-${part("day")}`,
    reference: POLICY.version,
    policy: POLICY,
    preparedAt: now.toISOString(),
    inferred: false,
  };
}

module.exports = { POLICY, effectiveDateAtPreparation };
