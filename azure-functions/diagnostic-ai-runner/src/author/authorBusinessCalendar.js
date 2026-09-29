"use strict";

// Mirrors DEFAULT_BUSINESS_CALENDAR in lib/server/editorial-cadence-engine.ts.
const HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19",
  "2026-07-03", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25"
]);
const EASTERN = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

function parts(date) {
  return Object.fromEntries(EASTERN.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
}

function businessDate(day) {
  const date = new Date(day * 86400000);
  const iso = date.toISOString().slice(0, 10);
  return date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !HOLIDAYS_2026.has(iso);
}

function elapsedGovernedBusinessDays(startInput, nowInput) {
  const start = new Date(startInput);
  const now = new Date(nowInput);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(now.getTime()) || now < start) return null;
  const startParts = parts(start);
  const nowParts = parts(now);
  if (startParts.year !== 2026 || nowParts.year !== 2026) return null;
  let dayZero = Date.UTC(startParts.year, startParts.month - 1, startParts.day) / 86400000;
  const afterHours = startParts.hour > 17 || (startParts.hour === 17 && startParts.minute > 0);
  if (afterHours || !businessDate(dayZero)) {
    do { dayZero += 1; } while (!businessDate(dayZero));
  }
  const currentDayComplete = nowParts.hour >= 17;
  const end = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day) / 86400000 -
    (currentDayComplete ? 0 : 1);
  let elapsed = 0;
  for (let day = dayZero + 1; day <= end; day += 1) {
    if (businessDate(day)) elapsed += 1;
  }
  return elapsed;
}

module.exports = { HOLIDAYS_2026, elapsedGovernedBusinessDays };
