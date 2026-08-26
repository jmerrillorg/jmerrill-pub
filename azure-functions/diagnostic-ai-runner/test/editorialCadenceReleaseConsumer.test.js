"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  STAGE_BASELINE_BUSINESS_DAYS,
  addBusinessDays,
  buildSchedule,
  normalizeStageCode,
  parsePackage,
  remainingHoldDuration,
  runEditorialCadenceReleaseConsumer
} = require("../src/editorial/editorialCadenceReleaseConsumer");

const stageId = "fd577d2b-01a0-f111-b8dc-000d3a14673b";
const titleId = "title-before-you-were-born";
const gateId = "gate-before-you-were-born";
const packageId = "pkg-before-you-were-born-developmental-v1";

function makeClient(overrides = {}) {
  const calls = { listed: [], created: [], patched: [] };
  const stage = {
    jm1pub_editorialstageid: stageId,
    jm1pub_name: "Developmental Editing - Before You Were Born",
    _jm1pub_titleid_value: titleId,
    jm1pub_internaloperationalsummary: `PACKAGE_PREPARATION: Editorial-to-Package handoff completed for ${packageId}; manifest artifact-before-you-were-born; package checksum ${"a".repeat(64)}; QA READY_INTERNAL;`,
    jm1pub_authorsafesummary: ""
  };
  const title = {
    jm1pub_titleid: titleId,
    jm1pub_titlename: "Before You Were Born",
    jm1pub_authorname: "Sean Crowley"
  };
  const gate = {
    jm1pub_editorialapprovalgateid: gateId,
    jm1pub_editorialapprovalgatename: "Developmental Review - Before You Were Born",
    jm1pub_gatestatus: 196650000,
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId,
    jm1pub_authoremail: "sean@example.com"
  };
  const completion = {
    jm1_executionlogid: "completion-log",
    jm1_actiontype: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
    jm1_sourcerecordid: stageId,
    createdon: "2026-08-20T15:00:00Z",
    jm1_actiondescription: stage.jm1pub_internaloperationalsummary
  };
  return {
    calls,
    async list(entitySet, query = {}) {
      calls.listed.push({ entitySet, query });
      if (entitySet === "jm1pub_editorialstages") return [overrides.stage || stage];
      if (entitySet === "jm1pub_titles") return [overrides.title || title];
      if (entitySet === "jm1pub_editorialapprovalgates") return [overrides.gate || gate];
      if (entitySet === "jm1_executionlogs" && /PACKAGE_CADENCE_SCHEDULED/.test(query.$filter || "")) {
        return overrides.cadenceLogs || [{
          jm1_executionlogid: "cadence-log",
          jm1_actiontype: "PACKAGE_CADENCE_SCHEDULED",
          jm1_sourcerecordid: stageId,
          createdon: "2026-08-20T15:00:00Z",
          jm1_actiondescription: "cadence scheduled"
        }];
      }
      if (entitySet === "jm1_executionlogs" && /EDITORIAL_PACKAGE_HANDOFF_COMPLETED/.test(query.$filter || "")) return [completion];
      if (entitySet === "jm1_executionlogs") return [];
      return [];
    },
    async first(entitySet, query = {}) {
      const rows = await this.list(entitySet, { ...query, $top: "1" });
      return rows[0] || null;
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      return `log-${calls.created.length}`;
    },
    async patch(entitySet, id, payload) {
      calls.patched.push({ entitySet, id, payload });
    }
  };
}

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

test("due package with no canonical or mailbox delivery evidence remains system attention", async () => {
  const client = makeClient();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-no-delivery" },
    {
      client,
      readDeliveryEvidence: async () => ({ ok: true, found: false, ambiguous: false, code: "NO_DELIVERY_EVIDENCE_FOUND" })
    }
  );
  assert.equal(result.dueSystemAttention, 1);
  assert.equal(result.deliveredRepaired, 0);
  assert.equal(result.results[0].status, "DUE_SYSTEM_ATTENTION");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_SYSTEM_ATTENTION_REQUIRED"));
});

test("mailbox delivery repairs missing internal send event and prevents duplicate send", async () => {
  const client = makeClient();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-mailbox-delivered" },
    {
      client,
      readDeliveryEvidence: async () => ({
        ok: true,
        found: true,
        ambiguous: false,
        deliveryStatus: "DELIVERED",
        deliveredAt: "2026-08-21T16:00:00Z",
        internetMessageId: "<delivered-before-you-were-born@jmerrill.one>",
        inboundMessageId: "message-delivered",
        correlationSource: "PUBLISHING_MAILBOX",
        correlationConfidence: "HIGH"
      }),
      readResponseEvidence: async () => ({ ok: true, found: false })
    }
  );
  assert.equal(result.deliveredRepaired, 1);
  assert.equal(result.dueSystemAttention, 0);
  assert.equal(result.results[0].status, "MAILBOX_DELIVERY_REPAIRED");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_MAILBOX_DELIVERY_CORRELATED"));
  assert.ok(!client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED"));
});

test("mailbox delivery plus acknowledgment response is reconciled but not treated as approval", async () => {
  const client = makeClient();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-mailbox-ack" },
    {
      client,
      readDeliveryEvidence: async () => ({
        ok: true,
        found: true,
        ambiguous: false,
        deliveredAt: "2026-08-21T16:00:00Z",
        internetMessageId: "<delivered-before-you-were-born@jmerrill.one>",
        inboundMessageId: "message-delivered",
        correlationSource: "PUBLISHING_MAILBOX",
        correlationConfidence: "HIGH"
      }),
      readResponseEvidence: async () => ({
        ok: true,
        found: true,
        bodyText: "Thanks, I will review.",
        receivedDateTime: "2026-08-21T16:10:00Z",
        internetMessageId: "<ack-before-you-were-born@jmerrill.one>",
        inboundMessageId: "message-ack"
      })
    }
  );
  assert.equal(result.responsesReconciled, 1);
  assert.equal(result.results[0].mailboxCorrelation.responseClassification, "ACKNOWLEDGMENT_ONLY");
  assert.ok(client.calls.created.some((call) => /classification=ACKNOWLEDGMENT_ONLY/.test(call.payload.jm1_actiondescription)));
  assert.ok(!client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates"));
});

test("ambiguous mailbox evidence fails closed with no resend", async () => {
  const client = makeClient();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-ambiguous" },
    {
      client,
      readDeliveryEvidence: async () => ({ ok: true, found: false, ambiguous: true, candidateCount: 2 })
    }
  );
  assert.equal(result.ambiguous, 1);
  assert.equal(result.results[0].status, "AMBIGUOUS_CORRELATION");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_MAILBOX_CORRELATION_AMBIGUOUS"));
  assert.ok(!client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED"));
});

test("future scheduled package does not invoke mailbox repair or send path", async () => {
  const client = makeClient();
  let mailboxReads = 0;
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-21T15:00:00Z", correlationId: "test-future" },
    {
      client,
      readDeliveryEvidence: async () => {
        mailboxReads += 1;
        return { ok: true, found: true };
      }
    }
  );
  assert.equal(result.scheduled, 1);
  assert.equal(mailboxReads, 0);
  assert.equal(result.results[0].status, "SCHEDULED_AUTOMATIC_FUTURE");
});
