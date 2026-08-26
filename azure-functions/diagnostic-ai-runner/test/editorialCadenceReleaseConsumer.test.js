"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  STAGE_BASELINE_BUSINESS_DAYS,
  addBusinessDays,
  buildSchedule,
  normalizeStageCode,
  parsePackage,
  remainingHoldDuration
} = require("../src/editorial/editorialCadenceReleaseConsumer");

test("line editing cadence uses canonical five-business-day baseline", () => {
  assert.equal(STAGE_BASELINE_BUSINESS_DAYS.LINE_EDITING, 5);
  assert.equal(normalizeStageCode({ jm1pub_name: "Line Editing - The Long Watch" }), "LINE_EDITING");
  assert.equal(addBusinessDays("2026-08-25T21:50:03Z", 5), "2026-09-01T21:50:03.000Z");
});

test("schedule is future-owned system work until release boundary passes", () => {
  const schedule = buildSchedule(
    { jm1pub_name: "Line Editing - The General's Will" },
    { createdon: "2026-08-25T20:10:03Z" },
    { createdon: "2026-08-25T20:10:03Z" },
    "2026-08-26T01:07:45Z"
  );
  assert.equal(schedule.stageCode, "LINE_EDITING");
  assert.equal(schedule.cadenceStartedAt, "2026-08-25T20:10:03Z");
  assert.equal(schedule.scheduledReleaseAt, "2026-09-01T20:10:03.000Z");
  assert.equal(schedule.due, false);
  assert.notEqual(schedule.remainingHoldDuration, "expired");
});

test("due cadence becomes system attention when send binding is missing", () => {
  const schedule = buildSchedule(
    { jm1pub_name: "Line Editing - The General's Will" },
    { createdon: "2026-08-25T20:10:03Z" },
    { createdon: "2026-08-25T20:10:03Z" },
    "2026-09-02T01:07:45Z"
  );
  assert.equal(schedule.due, true);
  assert.equal(schedule.remainingHoldDuration, "expired");
});

test("package identity is parsed from current handoff summaries", () => {
  const parsed = parsePackage(
    "PACKAGE_PREPARATION: Editorial-to-Package handoff completed for pkg-e698257d-ca9c-f111-b8dc-00224820105b-line-editing-v1; manifest e874adc0-bfa0-f111-b8dc-6045bdd69435; package checksum e05043e4c1bc85f4a4f6efec1d02e48821ca5cf81b540552ec9b318fb8a0654c; QA READY_INTERNAL;",
    ""
  );
  assert.equal(parsed.packageId, "pkg-e698257d-ca9c-f111-b8dc-00224820105b-line-editing-v1");
  assert.equal(parsed.manifestArtifactId, "e874adc0-bfa0-f111-b8dc-6045bdd69435");
  assert.equal(parsed.packageChecksum, "e05043e4c1bc85f4a4f6efec1d02e48821ca5cf81b540552ec9b318fb8a0654c");
});

test("hold duration reports expired only after boundary", () => {
  assert.equal(remainingHoldDuration("2026-08-26T00:00:00Z", "2026-08-26T00:00:01Z"), "expired");
  assert.match(remainingHoldDuration("2026-08-26T01:00:00Z", "2026-08-26T00:00:00Z"), /^1h/);
});
