"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { authorCopy, runAuthorFollowupCadence } = require("../src/author/authorFollowupRuntime");
const { elapsedGovernedBusinessDays } = require("../src/author/authorBusinessCalendar");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const authorId = "106a78d0-fb9a-f111-b8dc-6045bdd69738";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
const gateId = "4d04daa2-67b5-f111-aaac-000d3a14673b";
const projection = {
  titleId, authorId, stageId, actionRequestId: gateId,
  engagementId: "JMP-INT-202608-JFLY01", nextActionOwner: "AUTHOR",
  authorActionType: "DEVELOPMENTAL_EDIT_REVIEW", actionRequestedAt: "2026-09-21T17:00:00.000Z",
  actionDueAt: "2026-09-28T17:00:00.000Z", currentDeliveryState: "VERIFIED"
};
const census = { activeTitlesScanned: 364, classifications: { AUTHOR: 1, JM_PUBLISHING: 12, NONE: 206, AMBIGUOUS: 145 },
  projections: [projection] };

function mockDeps(overrides = {}) {
  const calls = { sent: 0, reserved: 0, marked: 0, mutations: 0 };
  const client = { async first(entitySet) {
    if (entitySet === "jm1pub_titles") return { jm1pub_titleid: titleId,
      _jm1_primaryauthor_value: authorId, jm1_canonicalauthorcontactreference: `contact:${authorId}`,
      jm1pub_titlename: "Whole" };
    if (entitySet === "contacts") return { contactid: authorId, fullname: "Jackuline Fly",
      emailaddress1: "author@example.com" };
    throw new Error(`Unexpected ${entitySet}`);
  }, async patch() { calls.mutations += 1; } };
  return { calls, deps: {
    client, scanCurrentAuthorActions: async () => census,
    reserveCommunicationIntent: async (_client, input) => {
      calls.reserved += 1;
      assert.equal(input.workstream, `author-followup:${titleId}:${stageId}:${gateId}:7`);
      return { status: "RESERVED", semanticIdempotencyKey: "semantic-key", communicationRecordId: "record-1" };
    },
    sendConfiguredAuthorResponse: async ({ input }) => {
      calls.sent += 1;
      assert.equal(input.sendApproval.templateName, "AUTHOR_FOLLOWUP_STANDARD_ACTION_V1");
      assert.deepEqual(input.cc, ["publishing@jmerrill.one"]);
      return { ok: true, providerMessageId: "provider-1", communicationComplete: true };
    },
    markCommunicationSent: async () => { calls.marked += 1; },
    ...overrides
  } };
}

test("preview scans but does not reserve, send, or mutate", async () => {
  const { calls, deps } = mockDeps();
  const result = await runAuthorFollowupCadence({ preview: true, now: "2026-09-29T17:00:00Z" }, deps);
  assert.equal(result.status, "PREVIEW");
  assert.equal(result.results[0].status, "DUE");
  assert.deepEqual(calls, { sent: 0, reserved: 0, marked: 0, mutations: 0 });
});

test("enabled runtime rechecks current action and uses governed relay once", async () => {
  const { calls, deps } = mockDeps({ enabled: true });
  const result = await runAuthorFollowupCadence({ now: "2026-09-29T17:00:00Z" }, deps);
  assert.equal(result.results[0].status, "SENT");
  assert.equal(calls.sent, 1);
  assert.equal(calls.reserved, 1);
  assert.equal(calls.marked, 1);
  assert.equal(calls.mutations, 0);
});

test("changed action and delivered replay do not send", async () => {
  let reads = 0;
  const { calls, deps } = mockDeps({ enabled: true, scanCurrentAuthorActions: async () => {
    reads += 1;
    return reads === 1 ? census : { ...census, projections: [{ ...projection, nextActionOwner: "JM_PUBLISHING" }] };
  } });
  const changed = await runAuthorFollowupCadence({ now: "2026-09-29T17:00:00Z" }, deps);
  assert.equal(changed.results[0].reason, "CURRENT_ACTION_CHANGED");
  assert.equal(calls.sent, 0);
  const replay = mockDeps({ enabled: true, reserveCommunicationIntent: async () => ({ status: "ALREADY_DELIVERED" }) });
  assert.equal((await runAuthorFollowupCadence({ now: "2026-09-29T17:00:00Z" }, replay.deps)).results[0].status,
    "IDEMPOTENT");
  assert.equal(replay.calls.sent, 0);
});

test("ambiguous or provider-accepted prior send never invokes the relay again", async () => {
  for (const status of ["PROVIDER_ACCEPTED", "AMBIGUOUS_SEND_STATE", "DELIVERY_UNVERIFIED"]) {
    const { calls, deps } = mockDeps({ enabled: true,
      reserveCommunicationIntent: async () => ({ status }) });
    const result = await runAuthorFollowupCadence({ now: "2026-09-29T17:00:00Z" }, deps);
    assert.equal(result.results[0].reason, `OUTBOX_${status}`);
    assert.equal(calls.sent, 0);
  }
});

test("copy states action, deadline, and hold without internal identifiers", () => {
  const copy = authorCopy("Whole", "Jackuline Fly", projection.actionDueAt, 7);
  assert.match(copy.body, /edited manuscript/);
  assert.match(copy.body, /September 28, 2026/);
  assert.match(copy.body, /next editorial step will remain on hold/);
  assert.doesNotMatch(copy.body, /\b(?:Dataverse|Azure|ACS|GUID|checksum|AI)\b/i);
});

test("Day 20 counts governed 2026 holidays and never assigns adverse author status", async () => {
  assert.equal(elapsedGovernedBusinessDays("2026-09-04T16:00:00Z", "2026-09-08T16:00:00Z"), 0);
  assert.equal(elapsedGovernedBusinessDays("2026-09-04T16:00:00Z", "2026-09-08T21:00:00Z"), 1);
  assert.equal(elapsedGovernedBusinessDays("2027-01-01T16:00:00Z", "2027-02-01T16:00:00Z"), null);
  let escalations = 0;
  const { deps } = mockDeps({ enabled: true,
    findExecutionLog: async () => null,
    writeLog: async (_client, event) => {
      escalations += 1;
      assert.equal(event.actionType, "AUTHOR_DAY20_ESCALATED");
      assert.match(event.description, /no adverse author classification/);
    },
    reserveCommunicationIntent: async () => ({ status: "ALREADY_DELIVERED" })
  });
  const result = await runAuthorFollowupCadence({ now: "2026-10-23T17:00:00Z" }, deps);
  assert.equal(result.results[0].day20Escalation, "RECORDED");
  assert.equal(escalations, 1);
});

test("ambiguous current review enters operational reconciliation without an author send", async () => {
  let reviews = 0;
  const { calls, deps } = mockDeps({ enabled: true,
    scanCurrentAuthorActions: async () => ({ activeTitlesScanned: 364,
      classifications: { AUTHOR: 0, JM_PUBLISHING: 0, NONE: 363, AMBIGUOUS: 1 },
      projections: [], reviewCandidates: [{ titleId, stageId, reason: "DELIVERY_OBSERVABILITY_UNPROVEN" }] }),
    findExecutionLog: async () => null,
    writeLog: async (_client, event) => {
      reviews += 1;
      assert.equal(event.actionType, "AUTHOR_FOLLOWUP_REVIEW_REQUIRED");
    }
  });
  const result = await runAuthorFollowupCadence({ now: "2026-09-29T17:00:00Z" }, deps);
  assert.equal(result.reviewQueue[0].recordStatus, "RECORDED");
  assert.equal(reviews, 1);
  assert.equal(calls.sent, 0);
});
