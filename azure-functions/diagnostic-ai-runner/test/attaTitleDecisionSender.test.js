"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  FROM, MAILBOX, RECIPIENT, SUGGESTIONS, TITLE_ID,
  evaluateAttaTitleDecisionSend, renderTitleDecisionCopy, sendAttaTitleDecision
} = require("../src/editorial/attaTitleDecisionSender");

const STAGE_ID = "stage-atta";
const CONTACT_ID = "60937251-d589-f111-ab10-6045bdd69678";

function client(overrides = {}) {
  const rows = {
    titles: [{ jm1pub_titleid: TITLE_ID, jm1pub_titlename: "Untitled", jm1pub_authorname: "Atta Boateng" }],
    stages: [{ jm1pub_editorialstageid: STAGE_ID, _jm1pub_titleid_value: TITLE_ID, _jm1pub_contactid_value: CONTACT_ID }],
    contacts: [{ contactid: CONTACT_ID, fullname: "Atta Boateng", emailaddress1: RECIPIENT }],
    ...overrides
  };
  return {
    async list(entitySet) {
      if (entitySet === "jm1pub_titles") return rows.titles;
      if (entitySet === "jm1pub_editorialstages") return rows.stages;
      if (entitySet === "contacts") return rows.contacts;
      throw new Error(`Unexpected ${entitySet}`);
    }
  };
}

function input(overrides = {}) {
  return { titleId: TITLE_ID, stageId: STAGE_ID, contactId: CONTACT_ID, intakeReference: "JMP-INT-202607-422JSZ", ...overrides };
}

test("title decision copy is conversational and contains exactly the approved suggestions", () => {
  const copy = renderTitleDecisionCopy();
  assert.match(copy.body, /recent call and voicemail/i);
  assert.match(copy.body, /editorial work is continuing/i);
  assert.equal(SUGGESTIONS.filter((suggestion) => copy.body.includes(suggestion)).length, 3);
  assert.doesNotMatch(copy.body, /Why you are receiving this|What's attached|What happens next/);
});

test("Atta sender rejects the synthetic/wrong contact recipient", async () => {
  const result = await evaluateAttaTitleDecisionSend(input(), {
    client: client({ contacts: [{ contactid: CONTACT_ID, fullname: "Synthetic Certification Contact", emailaddress1: "synthetic@example.com" }] })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "RECIPIENT_AUTHORITY_MISMATCH");
});

test("Atta sender uses ACS canon, Publishing mailbox observability, and semantic idempotency", async () => {
  let relayPayload;
  let marked;
  const result = await sendAttaTitleDecision(input(), {
    client: client(),
    reserveCommunicationIntent: async () => ({ status: "RESERVED", semanticIdempotencyKey: "communication:v1:key", communicationRecordId: "communication-1" }),
    sendRelay: async (payload) => {
      relayPayload = payload;
      return { status: "SENT", providerMessageId: "provider-1", sentAt: "2026-09-20T12:00:00Z", observability: { acsDelivery: "PASS", publishingMailboxCopy: "PASS" } };
    },
    markCommunicationSent: async (_client, payload) => { marked = payload; }
  });
  assert.equal(result.status, "SENT");
  assert.equal(result.communicationsSent, 1);
  assert.equal(result.from, FROM);
  assert.equal(result.replyTo, MAILBOX);
  assert.deepEqual(result.cc, [MAILBOX]);
  assert.equal(relayPayload.authorEmail, RECIPIENT);
  assert.equal(relayPayload.attachments.length, 0);
  assert.equal(relayPayload.futureSendRequiresInternalCopy, true);
  assert.equal(relayPayload.futureSendRequiresDataverseLog, true);
  assert.equal(marked.providerMessageId, "provider-1");
});

test("Atta sender does not resend an already-delivered semantic intent", async () => {
  let relayCalls = 0;
  const result = await sendAttaTitleDecision(input(), {
    client: client(),
    reserveCommunicationIntent: async () => ({ status: "ALREADY_DELIVERED", semanticIdempotencyKey: "communication:v1:key", communicationRecordId: "communication-1" }),
    sendRelay: async () => { relayCalls += 1; return { status: "SENT" }; },
    markCommunicationSent: async () => {}
  });
  assert.equal(result.status, "ALREADY_DELIVERED");
  assert.equal(result.communicationsSent, 0);
  assert.equal(relayCalls, 0);
});
