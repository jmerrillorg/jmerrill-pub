import test from "node:test";
import assert from "node:assert/strict";
import {
  FAILURE,
  reconcileAppointments,
  shouldAlertForMissingOutlook,
  validateWriterDefinition
} from "../scripts/precoa-calendar-sync-guard.mjs";

const schedulingMailbox = "scheduling@jmerrill.one";

function source(overrides = {}) {
  return {
    uid: "uid-1",
    subject: "Client, Example",
    startUtc: "2026-08-10T14:00:00Z",
    endUtc: "2026-08-10T16:00:00Z",
    location: "5456 E Livingston Ave Columbus, OH",
    modifiedUtc: "2026-08-05T20:00:00Z",
    ...overrides
  };
}

function dv(row = source(), overrides = {}) {
  return {
    uid: row.uid,
    subject: row.subject,
    active: true,
    outlookEventId: `AQMk-${row.uid}`,
    mailbox: schedulingMailbox,
    ...overrides
  };
}

function outlook(row = source(), overrides = {}) {
  return {
    uid: row.uid,
    subject: row.subject,
    startUtc: row.startUtc,
    endUtc: row.endUtc,
    location: row.location,
    mailbox: schedulingMailbox,
    ...overrides
  };
}

test("writer definition decouples active appointments from cancelled cleanup", () => {
  const result = validateWriterDefinition({
    actions: {
      List_rows: { inputs: { parameters: { $filter: "statecode eq 0 and jm1_startutc ge '@{utcNow()}' and not startswith(jm1_externaluid,'blocked|')" } } },
      Apply_to_each: { runAfter: { List_rows: ["Succeeded"] } },
      "List:_Cancelled_With_Outlook_ID": { inputs: { parameters: { $filter: "startswith(jm1_outlookeventid,'AQMkAGE1Y2Rh')" } } }
    }
  });
  assert.equal(result.activeLoopDecoupledFromCancellation, true);
  assert.equal(result.cancellationCleanupLimitedToSchedulingIds, true);
  assert.equal(result.activeFilterUsesFutureWindow, true);
  assert.equal(result.excludesBlockedTime, true);
});

test("detects the former partial loop termination shape", () => {
  const result = validateWriterDefinition({
    actions: {
      List_rows: { inputs: { parameters: { $filter: "statecode eq 0 and jm1_startutc ge '@{utcNow()}'" } } },
      Apply_to_each: { runAfter: { Apply_to_each_2: ["Succeeded"] } },
      "List:_Cancelled_With_Outlook_ID": { inputs: { parameters: { $filter: "jm1_outlookeventid ne null" } } }
    }
  });
  assert.equal(result.activeLoopDecoupledFromCancellation, false);
  assert.equal(result.cancellationCleanupLimitedToSchedulingIds, false);
});

test("matches multiple same-day appointments", () => {
  const morning = source({ uid: "morning", startUtc: "2026-08-13T14:00:00Z", subject: "Alston, Anita" });
  const afternoon = source({ uid: "afternoon", startUtc: "2026-08-13T18:00:00Z", subject: "Zehner, James" });
  const evening = source({ uid: "evening", startUtc: "2026-08-13T21:00:00Z", subject: "Hightower, Alma" });
  const result = reconcileAppointments({
    source: [morning, afternoon, evening],
    dataverse: [dv(morning), dv(afternoon), dv(evening)],
    outlook: [outlook(morning), outlook(afternoon), outlook(evening)]
  });
  assert.equal(result.exactMatches, 3);
  assert.deepEqual(result.failures, []);
});

test("handles phone and in-person appointment types without changing matching", () => {
  const phone = source({ uid: "phone", appointmentType: "Phone" });
  const inPerson = source({ uid: "in-person", appointmentType: "InPerson" });
  const result = reconcileAppointments({
    source: [phone, inPerson],
    dataverse: [dv(phone), dv(inPerson)],
    outlook: [outlook(phone), outlook(inPerson)]
  });
  assert.equal(result.exactMatches, 2);
});

test("excludes blocked-time events from missing Outlook alerts", () => {
  const blocked = source({ uid: "blocked", blockedTime: true, subject: "Blocked Time" });
  assert.equal(shouldAlertForMissingOutlook({ source: blocked, nowUtc: "2026-08-05T22:00:00Z", syncWindowMinutes: 15 }), null);
});

test("excludes recurring blocked-time entries from appointment ingestion failures", () => {
  const blocked = source({ uid: "blocked-recurring", blockedTime: true, recurrence: "daily" });
  const result = reconcileAppointments({ source: [blocked], dataverse: [], outlook: [] });
  assert.deepEqual(result.failures, []);
});

test("allows missing optional location when both sides are blank", () => {
  const row = source({ location: "" });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [outlook(row)] });
  assert.deepEqual(result.failures, []);
});

test("detects source update after initial creation as time mismatch", () => {
  const row = source({ startUtc: "2026-08-11T14:30:00Z" });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [outlook(row, { startUtc: "2026-08-11T15:00:00Z" })] });
  assert.equal(result.failures[0].failureClass, FAILURE.TIMEZONE_CONVERSION_SHIFT);
});

test("detects stale Outlook event ID with no resolvable event", () => {
  const row = source({ uid: "stale-id" });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row, { outlookEventId: "AAMkAGE5-stale-admin" })], outlook: [] });
  assert.equal(result.failures[0].failureClass, FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING);
});

test("detects deleted Outlook event with active Dataverse record", () => {
  const row = source({ uid: "deleted-event" });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [] });
  assert.equal(result.failures[0].failureClass, FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING);
});

test("detects duplicate source UID", () => {
  const one = source({ uid: "dupe" });
  const two = source({ uid: "dupe", subject: "Duplicate" });
  const result = reconcileAppointments({ source: [one, two], dataverse: [dv(one)], outlook: [outlook(one)] });
  assert.ok(result.failures.some((failure) => failure.failureClass === FAILURE.SOURCE_UID_COLLISION));
});

test("detects pagination gaps beyond the first page as source-only records", () => {
  const rows = Array.from({ length: 101 }, (_, index) => source({ uid: `uid-${index}` }));
  const result = reconcileAppointments({ source: rows, dataverse: rows.slice(0, 100).map((row) => dv(row)), outlook: rows.slice(0, 100).map((row) => outlook(row)) });
  assert.ok(result.failures.some((failure) => failure.uid === "uid-100" && failure.failureClass === "SOURCE_ONLY"));
});

test("detects EDT to UTC conversion drift", () => {
  const row = source({ uid: "tz", startUtc: "2026-08-10T14:00:00Z" });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [outlook(row, { startUtc: "2026-08-10T10:00:00Z" })] });
  assert.equal(result.failures[0].failureClass, FAILURE.TIMEZONE_CONVERSION_SHIFT);
});

test("surfaces retry-needed Exchange failure as missing Outlook after window", () => {
  const alert = shouldAlertForMissingOutlook({ source: source({ uid: "throttle" }), dataverse: dv(source({ uid: "throttle" }), { outlookEventId: null }), outlook: null, nowUtc: "2026-08-05T22:00:00Z", syncWindowMinutes: 15 });
  assert.equal(alert.failureClass, FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING);
});

test("idempotent replay preserves exact matches", () => {
  const row = source({ uid: "replay" });
  const first = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [outlook(row)] });
  const second = reconcileAppointments({ source: [row], dataverse: [dv(row)], outlook: [outlook(row)] });
  assert.deepEqual(second, first);
});

test("cancellation update is not treated as an active missing Outlook event", () => {
  const row = source({ uid: "cancelled", cancelled: true });
  const result = reconcileAppointments({ source: [row], dataverse: [dv(row, { active: false })], outlook: [] });
  assert.deepEqual(result.failures, []);
});

test("raises a reconciliation alert after the permitted synchronization window", () => {
  const alert = shouldAlertForMissingOutlook({
    source: source({ uid: "late", modifiedUtc: "2026-08-05T21:00:00Z" }),
    dataverse: dv(source({ uid: "late" }), { outlookEventId: null }),
    outlook: null,
    nowUtc: "2026-08-05T22:00:00Z",
    syncWindowMinutes: 15
  });
  assert.equal(alert.uid, "late");
  assert.equal(alert.failureClass, FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING);
});
