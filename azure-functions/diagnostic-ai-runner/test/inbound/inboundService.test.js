"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { InMemoryInboundEvidenceStore, processGraphMessage } = require("../../src/mail/inbound");
const { serviceIntent } = require("../../src/mail/inbound/serviceIntent");
const { diagnoseMailboxCopy, executeService, runInboundService, verifyMailboxCopy } = require("../../src/mail/inbound/serviceRunner");
const { validatePaymentLink } = require("../../src/mail/inbound/paymentLinkAuthority");

const authorId = "11111111-1111-4111-8111-111111111111";
const titleId = "22222222-2222-4222-8222-222222222222";
const stageId = "33333333-3333-4333-8333-333333333333";
const engagementId = "ENG-1";

function message(body, id = "mail-1") {
  return {
    id, internetMessageId: `<${id}@example.com>`, conversationId: `thread-${id}`,
    receivedDateTime: "2026-09-22T18:11:14Z", subject: "Re: Indomitable review",
    from: { emailAddress: { address: "author@example.com", name: "Author Example" } },
    body: { contentType: "text", content: body }, hasAttachments: false,
    toRecipients: [], ccRecipients: []
  };
}

async function setup(body, classification = "EDITORIAL_RESPONSE") {
  const graphMessage = message(body);
  const context = {
    contacts: [{ email: "author@example.com", authorId, contactId: authorId, name: "Author Example" }],
    activeEngagements: [{ authorId, titleId, title: "Indomitable", engagementId, stageId, stageName: "07 Developmental Editing" }]
  };
  const store = new InMemoryInboundEvidenceStore();
  await processGraphMessage(graphMessage, {
    store, graphClient: { listAttachments: async () => ({ value: [] }) },
    contextProvider: async () => context
  });
  const queue = [...store.queue.values()][0];
  queue.classification = classification;
  const route = {
    inboundMessageEventId: queue.evidenceLink, dataverseExecutionLogId: "log-1",
    authorId, titleId, engagementId, status: "HELD_EDITORIAL_AUTHORITY"
  };
  await store.upsertBusinessRoute(route);
  const effects = { sends: [], reserves: 0, sentRecords: 0 };
  const deps = {
    store, graphClient: { getMessage: async () => graphMessage },
    contextProvider: async () => context,
    client: { first: async (set) => set === "contacts" ? { contactid: authorId, fullname: "Author Example", emailaddress1: "author@example.com" } : null },
    reserveCommunicationIntent: async () => { effects.reserves++; return { status: "RESERVED", communicationRecordId: "comm-1", semanticIdempotencyKey: "semantic-1" }; },
    markCommunicationSent: async () => { effects.sentRecords++; return { sentRecordId: "sent-1" }; },
    verifyMailboxCopy: async () => ({ status: "PASS", graphMessageId: "graph-1", conversationId: "thread-1" }),
    writeLog: async () => "copy-log-1",
    sendConfiguredAuthorResponse: async (input) => {
      effects.sends.push(input);
      return { ok: true, authorEmailStatus: "AUTHOR_RESPONSE_SENT", providerMessageId: "acs-1" };
    }
  };
  return { queue, route, store, deps, effects };
}

test("questions missing is routine, but supplied questions require judgment", () => {
  assert.equal(serviceIntent(message("Approved with questions"), "EDITORIAL_RESPONSE").intent, "AUTHOR_QUESTIONS_MISSING");
  assert.equal(serviceIntent(message("Approved with questions. Can we change chapter three?"), "EDITORIAL_RESPONSE").intent, "EDITORIAL_JUDGMENT_REQUIRED");
});

test("commercial terms request remains a human decision", () => {
  assert.equal(serviceIntent(message("Please send the next installment link"), "PAYMENT_CORRESPONDENCE").intent, "PAYMENT_LINK_ACCESS");
  assert.equal(serviceIntent(message("Please reduce the next installment"), "PAYMENT_CORRESPONDENCE").intent, "COMMERCIAL_EXCEPTION_REQUEST");
});

test("developmental approval with corrections is an acknowledgment, not stage approval", () => {
  const actualWording = "I have reviewed the manuscript and would like to approve the developmental editing with corrections.";
  assert.equal(serviceIntent(message(actualWording), "AUTHOR_RESPONSE").intent, "EDITORIAL_CORRECTIONS_ACKNOWLEDGMENT");
});

test("routine clarification sends once through governed provider and preserves held transition", async () => {
  const { queue, store, deps, effects } = await setup("Approved with questions");
  const first = await executeService(queue, deps);
  const replay = await executeService(queue, deps);
  assert.equal(first.outcome, "SENT");
  assert.equal(replay.outcome, "IDEMPOTENT");
  assert.equal(effects.sends.length, 1);
  assert.equal(effects.reserves, 1);
  assert.equal(effects.sentRecords, 1);
  assert.deepEqual(effects.sends[0].input.cc, ["publishing@jmerrill.one"]);
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).status, "HELD_EDITORIAL_AUTHORITY");
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.mailboxCopy, "PASS");
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceWaitingOn, "AUTHOR_QUESTIONS");
});

test("delayed mailbox copy never resends author communication", async () => {
  const { queue, store, deps, effects } = await setup("Approved with questions");
  let copyReady = false;
  deps.verifyMailboxCopy = async () => copyReady
    ? { status: "PASS", graphMessageId: "graph-1", conversationId: "thread-1" }
    : { status: "PENDING" };
  assert.equal((await executeService(queue, deps)).outcome, "SENT_READBACK_PENDING");
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceStatus, "SENT_READBACK_PENDING");
  copyReady = true;
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal(effects.sends.length, 1);
});

test("mailbox copy readback requires exact sender, recipient, and body", async () => {
  const body = "Good day, Author,\n\nPlease send your questions.\n\nJ Merrill Publishing";
  const hash = require("node:crypto").createHash("sha256").update(body).digest("hex");
  const service = { sentAt: "2026-09-22T18:11:14Z", subject: "Re: Indomitable review", recipient: "author@example.com", bodyHash: hash };
  const copy = { id: "graph-1", conversationId: "conversation-1", subject: service.subject,
    from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: service.recipient } }],
    ccRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }],
    body: { content: body } };
  const graph = { listInboxMessagesSince: async () => ({ value: [copy] }) };
  assert.equal((await verifyMailboxCopy(graph, service)).status, "PASS");
  copy.from.emailAddress.address = "other@example.com";
  assert.equal((await verifyMailboxCopy(graph, service)).status, "PENDING");
});

test("mailbox diagnostic exposes match flags without message body", async () => {
  const store = new InMemoryInboundEvidenceStore();
  await store.upsertBusinessRoute({ inboundMessageEventId: "event-1", service: {
    status: "SENT_READBACK_PENDING", sentAt: "2026-09-22T18:11:14Z", subject: "Re: Review",
    recipient: "author@example.com", bodyHash: "0".repeat(64)
  } });
  const graphClient = { listInboxMessagesSince: async () => ({ value: [{ id: "graph-1", subject: "Re: Review",
    from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: "author@example.com" } }], ccRecipients: [],
    body: { content: "private author correspondence" } }] }) };
  const result = await diagnoseMailboxCopy("event-1", { store, graphClient });
  assert.equal(result.candidates[0].senderMatches, true);
  assert.equal(result.candidates[0].ccMatches, false);
  assert.equal(JSON.stringify(result).includes("private author correspondence"), false);
});

test("routine service uses the existing sender canon and Publishing CC", async () => {
  const { queue, deps } = await setup("Approved with questions");
  const captured = [];
  delete deps.sendConfiguredAuthorResponse;
  deps.env = {
    JM1_AUTHOR_RESPONSE_SEND_ENABLED: "true",
    JM1_AUTHOR_RESPONSE_SEND_PROVIDER: "injected",
    JM1_AUTHOR_RESPONSE_SEND_FROM: "publishing@email.jmerrill.one",
    JM1_AUTHOR_RESPONSE_SEND_REPLY_TO: "publishing@jmerrill.one"
  };
  deps.providers = { injected: { send: async (email) => { captured.push(email); return { messageId: "acs-1" }; } } };
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal(captured.length, 1);
  assert.equal(captured[0].from, "publishing@email.jmerrill.one");
  assert.equal(captured[0].replyTo, "publishing@jmerrill.one");
  assert.deepEqual(captured[0].cc, ["publishing@jmerrill.one"]);
});

test("preview is effect-free and payment link remains withheld without exact authority", async () => {
  const { queue, deps, effects } = await setup("Can you send the second installment payment link?", "PAYMENT_CORRESPONDENCE");
  deps.validatePaymentLink = async () => ({ status: "UNVERIFIED", reason: "STRIPE_INVOICE_READ_DENIED" });
  const preview = await runInboundService({ targetEventId: queue.evidenceLink, preview: true }, deps);
  assert.equal(preview.results[0].outcome, "HELD_PAYMENT_LINK_AUTHORITY");
  assert.equal(preview.results[0].intent, "PAYMENT_LINK_ACCESS");
  assert.equal(preview.results[0].linkStatus, "UNVERIFIED");
  assert.equal(effects.sends.length, 0);
});

test("payment link validation requires exact existing live invoice and reachable page", async () => {
  const client = {
    first: async (set) => ({
      jm1pub_titles: { _jm1pub_contract_value: "contract-1" },
      jm1pub_contracts: { _new_author_value: authorId, jm1pub_providerstatus: "ADOBE_SIGNED_COMPLETED", _jm1pub_opportunity_value: engagementId },
      jmpv2_agreementrecords: { jmpv2_agreementrecordid: engagementId, jmpv2_authoridentity: authorId,
        jmpv2_agreementkey: engagementId, jmpv2_paymentledgerstatus: "ACTIVE", jmpv2_stripecustomerid: "cus-1" }
    })[set],
    list: async () => [{ jmpv2_installmentsequence: 2, jmpv2_amountcents: 25988,
      jmpv2_obligationstatus: "SCHEDULED", jmpv2_stripeinvoiceid: "in-1" }]
  };
  const deps = {
    retrieveStripeInvoice: async () => ({ status: "READ", invoice: { id: "in-1", customer: "cus-1", status: "open",
      livemode: true, currency: "usd", amount_remaining: 25988,
      hosted_invoice_url: "https://invoice.stripe.com/i/test" } }),
    checkHostedInvoiceUrl: async () => ({ status: "ACCESSIBLE" })
  };
  assert.equal((await validatePaymentLink(client, { titleId, authorId }, deps)).status, "VALID");
  deps.retrieveStripeInvoice = async () => ({ status: "READ", invoice: { id: "in-1", customer: "cus-other", status: "open",
    livemode: true, currency: "usd", amount_remaining: 25988, hosted_invoice_url: "https://invoice.stripe.com/i/test" } });
  assert.equal((await validatePaymentLink(client, { titleId, authorId }, deps)).reason, "INVOICE_PARITY_FAILED");
});
