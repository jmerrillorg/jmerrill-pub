"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  FAILED_ACTION,
  RESERVED_ACTION,
  SENT_ACTION,
  buildCommunicationIdentity,
  findIntentState,
  reserveCommunicationIntent
} = require("../src/editorial/communicationIntentStore");

const checksum = "097b042aeb30e9fde1e9381201049788cf6ba3fac1866fceb3f53298619d64fa";
const titleId = "a05f72d0-c27a-f111-ab0f-6045bdd69738";

function input(overrides = {}) {
  return {
    titleId,
    titleName: "Naughty Tales",
    authorId: "author-jaylonna",
    communicationType: "DEVELOPMENTAL_MISSING_COMPONENT_RECOVERY",
    workstream: "07-developmental-editing",
    recipient: "jaylonnastevette@gmail.com",
    attachments: [{ role: "editedManuscript", sha256: checksum }],
    ...overrides
  };
}

const semantic = {
  key: "communication:v1:key",
  identity: { recipient: "author@example.com", titleId: "title-1", artifacts: [] }
};

function client(rows) {
  return { async list(_entitySet, query) { return query.$filter.includes("recipient") ? [] : rows; } };
}

test("semantic identity is stable across attachment ordering", () => {
  const one = { role: "editedManuscript", sha256: checksum };
  const two = { role: "reviewInstructions", sha256: "a".repeat(64) };
  assert.equal(
    buildCommunicationIdentity(input({ attachments: [one, two] })).key,
    buildCommunicationIdentity(input({ attachments: [two, one] })).key
  );
});

test("Naughty Tales historical send suppresses replay and preserves original clock", async () => {
  let creates = 0;
  const dataverse = {
    async list(_entitySet, query) {
      if (query.$filter.includes("AUTHOR_COMMUNICATION_INTENT")) return [];
      return [{
        jm1_executionlogid: "2a9ae47a-3fb3-f111-aaac-00224820105b",
        jm1_actiontype: "DEVELOPMENTAL_MISSING_COMPONENT_RECOVERY_SENT",
        jm1_sourcerecordid: titleId,
        createdon: "2026-09-18T09:00:13.000Z",
        jm1_actiondescription:
          `recipient=jaylonnastevette@gmail.com; attachment=Naughty Tales - Developmentally Edited Manuscript (Clean).docx; checksum=${checksum}.`
      }];
    },
    async create() { creates += 1; return "unexpected"; }
  };
  const result = await reserveCommunicationIntent(dataverse, input());
  assert.equal(result.status, "ALREADY_DELIVERED");
  assert.equal(result.communicationRecordId, "2a9ae47a-3fb3-f111-aaac-00224820105b");
  assert.equal(result.sentAt, "2026-09-18T09:00:13.000Z");
  assert.equal(creates, 0);
});

test("an incomplete pre-send intent blocks replay without a second effect", async () => {
  const identity = buildCommunicationIdentity(input());
  const dataverse = {
    async list(_entitySet, query) {
      if (!query.$filter.includes("AUTHOR_COMMUNICATION_INTENT")) return [];
      return [{
        jm1_executionlogid: "reserved-record",
        jm1_actiontype: RESERVED_ACTION,
        jm1_sourcerecordid: titleId,
        createdon: "2026-09-18T08:59:53.171Z",
        jm1_actiondescription: `Idempotency ${identity.key}. DELIVERY_STATE=RESERVED.`
      }];
    }
  };
  const result = await reserveCommunicationIntent(dataverse, input());
  assert.equal(result.status, "AMBIGUOUS_SEND_STATE");
  assert.equal(result.communicationRecordId, "reserved-record");
});

test("reconciled sent intent returns its original provider acceptance time", async () => {
  const identity = buildCommunicationIdentity(input());
  const dataverse = {
    async list(_entitySet, query) {
      if (!query.$filter.includes("AUTHOR_COMMUNICATION_INTENT")) return [];
      return [{
        jm1_executionlogid: "sent-record",
        jm1_actiontype: SENT_ACTION,
        jm1_sourcerecordid: titleId,
        createdon: "2026-09-18T12:00:00.000Z",
        jm1_actiondescription:
          `Idempotency ${identity.key}. DELIVERY_STATE=SENT; sentAt=2026-09-18T09:00:13.000Z; recipient=jaylonnastevette@gmail.com; artifacts=${checksum}.`
      }];
    }
  };
  const result = await reserveCommunicationIntent(dataverse, input());
  assert.equal(result.status, "ALREADY_DELIVERED");
  assert.equal(result.sentAt, "2026-09-18T09:00:13.000Z");
});

test("a terminal pre-delivery failure releases a reserved intent for governed retry", async () => {
  const state = await findIntentState(client([
    { jm1_executionlogid: "failed-1", jm1_actiontype: FAILED_ACTION, createdon: "2026-09-21T03:00:00Z" },
    { jm1_executionlogid: "reserved-1", jm1_actiontype: RESERVED_ACTION, createdon: "2026-09-21T02:59:00Z" }
  ]), semantic);
  assert.equal(state.status, "AVAILABLE");
  assert.equal(state.source, "PROVEN_PRE_DELIVERY_FAILURE");
});

test("sent authority wins even when a later failure row exists", async () => {
  const state = await findIntentState(client([
    { jm1_executionlogid: "failed-1", jm1_actiontype: FAILED_ACTION, createdon: "2026-09-21T03:00:00Z" },
    { jm1_executionlogid: "sent-1", jm1_actiontype: SENT_ACTION, createdon: "2026-09-21T02:59:30Z" }
  ]), semantic);
  assert.equal(state.status, "ALREADY_DELIVERED");
});
