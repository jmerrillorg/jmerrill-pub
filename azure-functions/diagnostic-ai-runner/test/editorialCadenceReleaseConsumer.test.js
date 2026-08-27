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
const contactId = "dfb397e7-3b7c-f111-ab0f-6045bdd69435";
const packageId = "pkg-before-you-were-born-developmental-v1";

function makeClient(overrides = {}) {
  const calls = { listed: [], created: [], patched: [] };
  const stage = {
    jm1pub_editorialstageid: stageId,
    jm1pub_name: "Developmental Editing - Before You Were Born",
    _jm1pub_titleid_value: titleId,
    _jm1pub_contactid_value: contactId,
    jm1pub_intakereference: "JMP-INT-202607-LQPHEK",
    jm1pub_publishingintakereference: "JMP-INT-202607-LQPHEK",
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
    jm1pub_gatestatus: 196650001,
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId
  };
  const contact = {
    contactid: contactId,
    fullname: "Sean Crowley",
    emailaddress1: "sean@example.com"
  };
  const artifacts = [
    {
      jm1pub_editorialartifactid: "artifact-edited-manuscript",
      jm1pub_editorialartifactname: "Developmentally Edited Manuscript - Developmental Editing - Before You Were Born",
      jm1pub_filename: "Before You Were Born - Developmentally Edited Manuscript.docx",
      jm1pub_artifactstatus: 196650002,
      jm1pub_visibility: 196650001,
      jm1pub_sha256: "",
      jm1pub_repositorydriveid: "drive",
      jm1pub_repositoryitemid: "item-docx",
      jm1pub_filesizebytes: 100,
      jm1pub_iscurrentapproved: true,
      _jm1pub_titleid_value: titleId,
      _jm1pub_editorialstageid_value: stageId
    },
    {
      jm1pub_editorialartifactid: "artifact-review-instructions",
      jm1pub_editorialartifactname: "Developmental Review Instructions - Developmental Editing - Before You Were Born",
      jm1pub_filename: "Before You Were Born - Review Instructions.txt",
      jm1pub_artifactstatus: 196650002,
      jm1pub_visibility: 196650001,
      jm1pub_sha256: "",
      jm1pub_repositorydriveid: "drive",
      jm1pub_repositoryitemid: "item-txt",
      jm1pub_filesizebytes: 64,
      jm1pub_iscurrentapproved: false,
      _jm1pub_titleid_value: titleId,
      _jm1pub_editorialstageid_value: stageId
    }
  ];
  const alreadyDeliveredGate = {
    ...gate,
    jm1pub_gatestatus: 196650002,
    jm1pub_authorresponsesummary: "Developmental Editing package delivery is OPERATIONALLY_CERTIFIED. Seven-calendar-day author response period started after compliant email delivery."
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
      if (entitySet === "contacts") return overrides.contact === null ? [] : [overrides.contact || contact];
      if (entitySet === "jm1pub_editorialapprovalgates") return [overrides.gate || gate];
      if (entitySet === "jm1pub_editorialartifacts") return overrides.artifacts || artifacts;
      if (entitySet === "jm1_executionlogs" && /PACKAGE_CADENCE_SCHEDULED/.test(query.$filter || "")) {
        return overrides.cadenceLogs || [{
          jm1_executionlogid: "cadence-log",
          jm1_actiontype: "PACKAGE_CADENCE_SCHEDULED",
          jm1_sourcerecordid: stageId,
          createdon: "2026-08-20T15:00:00Z",
          jm1_actiondescription: "cadence scheduled"
        }];
      }
      if (entitySet === "jm1_executionlogs" && /EDITORIAL_PACKAGE_HANDOFF_COMPLETED/.test(query.$filter || "")) return overrides.completionLogs || [completion];
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

function senderDeps(extra = {}) {
  const sends = [];
  return {
    sends,
    readDeliveryEvidence: async () => ({ ok: true, found: false, ambiguous: false, code: "NO_DELIVERY_EVIDENCE_FOUND" }),
    downloadArtifact: async (artifact) => artifact.jm1pub_repositoryitemid === "item-docx"
      ? Buffer.from("PK test word/document.xml payload")
      : Buffer.from("Please review these materials and reply with your decision."),
    sendRelay: async (payload) => {
      sends.push(payload);
      return {
        status: "SENT",
        providerMessageId: "acs-message-1",
        attachmentCount: payload.attachments.length,
        attachmentChecksums: payload.attachments.map((attachment) => `${attachment.role}:${attachment.sha256}`),
        subject: payload.subject,
        from: "publishing@email.jmerrill.one",
        replyTo: "publishing@jmerrill.one",
        cc: ["publishing@jmerrill.one"]
      };
    },
    ...extra
  };
}

test("line editing cadence uses canonical five-business-day baseline", () => {
  assert.equal(STAGE_BASELINE_BUSINESS_DAYS.LINE_EDITING, 5);
  assert.equal(normalizeStageCode({ jm1pub_name: "Line Editing - The Long Watch" }), "LINE_EDITING");
  assert.equal(
    normalizeStageCode({
      jm1pub_name: "Editorial Review - The Long Watch",
      jm1pub_internaloperationalsummary: "CADENCE_RELEASE_RUNTIME: READY_FOR_RELEASE; stage COVER_DESIGN;"
    }),
    "EDITORIAL_REVIEW"
  );
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

test("due cadence marks the release boundary as expired", () => {
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

test("metadata-refresh package completion does not restart an already due cadence hold", async () => {
  const client = makeClient({
    completionLogs: [
      {
        jm1_executionlogid: "metadata-refresh-completion",
        jm1_actiontype: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
        jm1_sourcerecordid: stageId,
        createdon: "2026-08-28T14:00:00Z",
        jm1_actiondescription:
          `Package handoff completed. Package ${packageId}; version v1; manifest artifact-before-you-were-born; QA READY_INTERNAL; cadence CADENCE_HOLD; ` +
          "Correlation BLOCK04-CADENCE-PACKAGE-MANIFEST-REFRESH-2026-08-28T14:00Z. Idempotency metadata-refresh."
      },
      {
        jm1_executionlogid: "real-completion",
        jm1_actiontype: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
        jm1_sourcerecordid: stageId,
        createdon: "2026-08-20T15:00:00Z",
        jm1_actiondescription:
          `Package handoff completed. Package ${packageId}; version v1; manifest artifact-before-you-were-born; QA READY_INTERNAL; cadence CADENCE_HOLD.`
      }
    ]
  });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-metadata-refresh-does-not-reset-cadence" },
    { client, ...deps }
  );
  assert.equal(result.packageSent, 1);
  assert.equal(result.results[0].schedule.cadenceStartedAt, "2026-08-20T15:00:00Z");
  assert.equal(deps.sends.length, 1);
});

test("repeated package handoff for same output does not restart cadence hold", async () => {
  const client = makeClient({
    completionLogs: [
      {
        jm1_executionlogid: "same-output-repeat",
        jm1_actiontype: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
        jm1_sourcerecordid: stageId,
        createdon: "2026-08-27T01:30:02Z",
        jm1_actiondescription:
          `Package handoff completed. Package ${packageId}; version v1; manifest artifact-before-you-were-born; QA READY_INTERNAL; cadence CADENCE_HOLD; ` +
          "Correlation EDITORIAL-PACKAGE-HANDOFF-TIMER-2026-08-27T01:30:00.003Z."
      },
      {
        jm1_executionlogid: "original-output-package",
        jm1_actiontype: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
        jm1_sourcerecordid: stageId,
        createdon: "2026-08-20T15:00:00Z",
        jm1_actiondescription:
          `Package handoff completed. Package ${packageId}; version v1; manifest artifact-before-you-were-born; QA READY_INTERNAL; cadence CADENCE_HOLD.`
      }
    ]
  });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-25T15:00:00Z", correlationId: "test-repeated-package-handoff-does-not-reset-cadence" },
    { client, ...deps }
  );
  assert.equal(result.results[0].schedule.cadenceStartedAt, "2026-08-20T15:00:00Z");
  assert.equal(result.results[0].schedule.scheduledReleaseAt, "2026-08-27T15:00:00.000Z");
  assert.equal(result.results[0].status, "SCHEDULED_AUTOMATIC_FUTURE");
});

test("due package with no canonical or mailbox delivery evidence sends once through governed ACS relay", async () => {
  const client = makeClient();
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-no-delivery" },
    { client, ...deps }
  );
  assert.equal(result.dueSystemAttention, 0);
  assert.equal(result.deliveredRepaired, 0);
  assert.equal(result.packageSent, 1);
  assert.equal(result.results[0].status, "PACKAGE_SENT");
  assert.equal(deps.sends.length, 1);
  assert.equal(deps.sends[0].authorEmail, "sean@example.com");
  assert.equal(deps.sends[0].internalVisibilityMailbox, "publishing@jmerrill.one");
  assert.deepEqual(deps.sends[0].cc, ["publishing@jmerrill.one"]);
  assert.equal(deps.sends[0].templateName, "AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1");
  assert.equal(deps.sends[0].attachments.length, 2);
  const stageRead = client.calls.listed.find((call) => call.entitySet === "jm1pub_editorialstages");
  assert.match(stageRead.query.$select, /jm1pub_intakereference/);
  assert.match(stageRead.query.$select, /jm1pub_publishingintakereference/);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT"));
  assert.ok(client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates" && call.payload.jm1pub_gatestatus === 196650002));
});

test("due package with missing contact fails closed as ambiguous and does not send", async () => {
  const client = makeClient({
    stage: {
      jm1pub_editorialstageid: stageId,
      jm1pub_name: "Developmental Editing - Establishing Glory",
      _jm1pub_titleid_value: titleId,
      _jm1pub_contactid_value: null,
      jm1pub_intakereference: "JMP-INT-202607-LQPHEK",
      jm1pub_publishingintakereference: "JMP-INT-202607-LQPHEK",
      jm1pub_internaloperationalsummary: `Package handoff completed. Package ${packageId}; QA READY_INTERNAL;`
    }
  });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-missing-contact" },
    { client, ...deps }
  );
  assert.equal(result.nonSendable, 1);
  assert.equal(result.dueSystemAttention, 0);
  assert.equal(result.results[0].status, "AMBIGUOUS");
  assert.deepEqual(result.results[0].blockers, ["CONTACT_MISSING", "AUTHOR_EMAIL_MISSING"]);
  assert.equal(deps.sends.length, 0);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_SEND_BLOCKED"));
});

test("due package with missing required attachment fails closed without failing the timer", async () => {
  const client = makeClient({ artifacts: [] });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-missing-attachment" },
    { client, ...deps }
  );
  assert.equal(result.nonSendable, 1);
  assert.equal(result.dueSystemAttention, 0);
  assert.equal(result.results[0].status, "AMBIGUOUS");
  assert.deepEqual(result.results[0].blockers, ["REQUIRED_ATTACHMENT_MISSING:editedManuscript"]);
  assert.equal(deps.sends.length, 0);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_SEND_BLOCKED"));
});

test("already operationally certified gate is treated as already released and not resent", async () => {
  const client = makeClient({
    gate: {
      jm1pub_editorialapprovalgateid: gateId,
      jm1pub_editorialapprovalgatename: "Developmental Review - Before You Were Born",
      jm1pub_gatestatus: 196650002,
      jm1pub_authorresponsesummary: "Developmental Editing package delivery is OPERATIONALLY_CERTIFIED. Seven-calendar-day author response period started after compliant email delivery.",
      _jm1pub_titleid_value: titleId,
      _jm1pub_editorialstageid_value: stageId
    }
  });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-already-certified" },
    { client, ...deps }
  );
  assert.equal(result.alreadyReleased, 1);
  assert.equal(result.results[0].sentActionType, "GATE_AWAITING_AUTHOR_RESPONSE");
  assert.equal(deps.sends.length, 0);
});

test("cadence-not-required package is reconciled as non-sendable instead of sent", async () => {
  const client = makeClient({
    cadenceLogs: [{
      jm1_executionlogid: "cadence-not-required",
      jm1_actiontype: "PACKAGE_CADENCE_SCHEDULED",
      jm1_sourcerecordid: stageId,
      createdon: "2026-08-20T15:00:00Z",
      jm1_actiondescription: "CADENCE_NOT_REQUIRED: publisher-facing Editorial Review decision package; no author release scheduled."
    }]
  });
  const deps = senderDeps();
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-cadence-not-required" },
    { client, ...deps }
  );
  assert.equal(result.nonSendable, 1);
  assert.equal(result.results[0].status, "AMBIGUOUS");
  assert.equal(result.results[0].reason, "CADENCE_NOT_AUTHOR_RELEASE_ELIGIBLE");
  assert.equal(deps.sends.length, 0);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_NON_SENDABLE_RECONCILED"));
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

test("legacy package-id cadence source is skipped instead of queried as an editorial stage", async () => {
  const client = makeClient({
    cadenceLogs: [{
      jm1_executionlogid: "legacy-package-source",
      jm1_actiontype: "PACKAGE_CADENCE_SCHEDULED",
      jm1_sourcerecordid: "pkg-8face475-8f80-f111-ab0f-00224820105b-editorial-review-v1",
      createdon: "2026-08-20T15:00:00Z",
      jm1_actiondescription: "legacy source"
    }]
  });
  const result = await runEditorialCadenceReleaseConsumer(
    { now: "2026-08-28T15:00:00Z", correlationId: "test-legacy-package-source" },
    { client }
  );
  assert.equal(result.results[0].status, "SKIPPED");
  assert.equal(result.results[0].reason, "CADENCE_LOG_SOURCE_NOT_STAGE_GUID");
  assert.ok(!client.calls.listed.some((call) => call.entitySet === "jm1pub_editorialstages"));
});
