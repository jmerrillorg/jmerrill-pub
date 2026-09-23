"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { InMemoryInboundEvidenceStore, processGraphMessage } = require("../../src/mail/inbound");
const { serviceIntent, serviceCopy } = require("../../src/mail/inbound/serviceIntent");
const { executeService, runInboundService, verifyMailboxCopy } = require("../../src/mail/inbound/serviceRunner");
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
    authorId, titleId, engagementId, status: "HELD_EDITORIAL_AUTHORITY",
    editorialGate: { status: "EXACT" }
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

test("onboarding access response keeps identity changes behind verification", () => {
  assert.equal(serviceIntent(message("I need onboarding help and want a new email"), "AUTHOR_ACCESS_REQUEST").intent,
    "AUTHOR_ONBOARDING_CONTACT_CHANGE");
  assert.equal(serviceIntent(message("I need help signing in"), "AUTHOR_ACCESS_REQUEST").intent,
    "AUTHOR_ONBOARDING_ACCESS");
  const copy = serviceCopy("AUTHOR_ONBOARDING_CONTACT_CHANGE", "Jackuline Fly", "Whole", "Re: Begin Author Onboarding for Whole");
  assert.match(copy.body, /email address that received the invitation/);
  assert.match(copy.body, /verify the new address before updating it/);
  assert.doesNotMatch(copy.body, /payment link|one-time code:|Dataverse|ACS/);
});

test("onboarding access service sends only to the existing governed contact in fixture mode", async () => {
  const { queue, deps, effects } = await setup("I found the invitation in junk and need help with onboarding. My new email is new@example.com.",
    "AUTHOR_ACCESS_REQUEST");
  const result = await executeService(queue, deps);
  assert.equal(result.outcome, "SENT");
  assert.equal(effects.sends.length, 1);
  assert.deepEqual(effects.sends[0].input.to, ["author@example.com"]);
  assert.deepEqual(effects.sends[0].input.cc, ["publishing@jmerrill.one"]);
  assert.equal(effects.sends[0].input.sendApproval.draftBody.includes("new@example.com"), false);
  assert.equal((await deps.store.getQueueItem(queue.queueItemId)).waitingOn, "JMP_IDENTITY_VERIFICATION");
  assert.equal((await executeService(queue, deps)).outcome, "IDEMPOTENT");
  assert.equal(effects.sends.length, 1);
});

test("question follow-up with an unbound delivered artifact stays a system authority hold", async () => {
  const { queue, store, deps, effects } = await setup("Does the book need another chapter?", "AUTHOR_QUESTION");
  deps.enabled = true;
  const route = await store.getBusinessRoute(queue.evidenceLink);
  await store.updateBusinessRoute({ ...route, editorialGate: { status: "DELIVERY_MISMATCH" },
    service: { intent: "EDITORIAL_QUESTION_REVIEW", status: "HUMAN_REVIEW_REQUIRED", humanGateAt: "2026-09-23T13:32:16Z" } });
  await store.updateQueueItem({ ...queue, businessEventId: "route-1",
    serviceIntent: "EDITORIAL_QUESTION_REVIEW", serviceStatus: "HUMAN_REVIEW_REQUIRED" });
  const logs = [];
  deps.writeLog = async (_client, log) => { logs.push(log); return "authority-log-1"; };
  const result = await runInboundService({}, deps);
  assert.equal(result.results[0].outcome, "HELD_EDITORIAL_AUTHORITY");
  const corrected = await store.getQueueItem(queue.queueItemId);
  assert.equal(corrected.serviceStatus, null);
  assert.equal(corrected.serviceAuthorityStatus, "DELIVERY_MISMATCH");
  assert.equal(corrected.serviceWaitingOn, "JMP_SYSTEM");
  assert.ok(corrected.serviceHumanGateRetractedAt);
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.status, "HELD_EDITORIAL_AUTHORITY");
  assert.equal(effects.sends.length, 0);
  assert.equal(effects.reserves, 0);
  assert.equal(logs.filter((item) => item.actionType === "PUBLISHING_INBOUND_EDITORIAL_AUTHORITY_HOLD").length, 1);
  await runInboundService({}, deps);
  assert.equal(logs.filter((item) => item.actionType === "PUBLISHING_INBOUND_EDITORIAL_AUTHORITY_HOLD").length, 1);
});

test("a later author question turn creates one durable gate without an author send", async () => {
  const body = "Good morning,\r\n\r\nI apologize for that. Here are my questions regarding the review:\r\n\r\n" +
    "Does the book have a better flow after the corrections?\r\n\r\n" +
    "Do I need to add all of the acknowledgments and dedications yet?\r\n\r\n" +
    "Does the book need another chapter?\r\n\r\n" +
    "Are there any other corrections or additions that need to be made?\r\n\r\n" +
    "What is the next step?\r\n\r\nThank you for your patience.";
  const { queue, store, deps, effects } = await setup(body, "AUTHOR_QUESTION");
  const logs = [];
  deps.writeLog = async (_client, log) => { logs.push(log); return "gate-log-1"; };
  const first = await executeService(queue, deps);
  const replay = await executeService(queue, deps);
  assert.equal(first.outcome, "HUMAN_REVIEW_REQUIRED");
  assert.equal(first.questionCount, 5);
  assert.equal(replay.outcome, "HUMAN_REVIEW_REQUIRED");
  assert.equal(logs.length, 1);
  assert.equal(effects.sends.length, 0);
  assert.equal(effects.reserves, 0);
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceStatus, "HUMAN_REVIEW_REQUIRED");
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.questions[0],
    "Does the book have a better flow after the corrections?");
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.questions[4], "What is the next step?");
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.questionPlan[1].humanJudgment, false);
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.questionPlan[4].humanJudgment, false);
});

test("unrouted overdue service creates one durable system exception and remains retryable", async () => {
  const { queue, store, deps, effects } = await setup("Thank you for your note.", "AUTHOR_RESPONSE");
  deps.enabled = true;
  const logs = [];
  deps.writeLog = async (_client, log) => { logs.push(log); return "exception-log-1"; };
  assert.equal((await runInboundService({ targetEventId: queue.evidenceLink }, deps)).results[0].outcome,
    "NO_ROUTINE_SERVICE_RULE");
  await runInboundService({ targetEventId: queue.evidenceLink }, deps);
  assert.equal(logs.length, 1);
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceSla, "ESCALATED_SERVICE_EXCEPTION");
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceStatus, undefined);
  assert.equal(effects.sends.length, 0);
});

test("commercial terms request remains a human decision", () => {
  assert.equal(serviceIntent(message("Please send the next installment link"), "PAYMENT_CORRESPONDENCE").intent, "PAYMENT_LINK_ACCESS");
  assert.deepEqual(serviceIntent(message("Please send the second and third installment details"), "PAYMENT_CORRESPONDENCE"),
    { intent: "PAYMENT_SCHEDULE_DETAILS", humanGate: false });
  assert.equal(serviceIntent(message("Please change my second installment date"), "PAYMENT_CORRESPONDENCE").intent,
    "COMMERCIAL_EXCEPTION_REQUEST");
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

test("replay corrects an acknowledgment wait owner without resending", async () => {
  const { queue, store, deps, effects } = await setup("I approve the developmental editing with corrections.", "AUTHOR_RESPONSE");
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  const current = await store.getQueueItem(queue.queueItemId);
  await store.updateQueueItem({ ...current, serviceWaitingOn: "AUTHOR_RESPONSE" });
  assert.equal((await executeService(queue, deps)).outcome, "IDEMPOTENT");
  assert.equal((await store.getQueueItem(queue.queueItemId)).serviceWaitingOn, "JMP");
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

test("installment schedule request cannot receive a link-only service reply", async () => {
  const { queue, deps, effects } = await setup("Please send details for my second and third installment payments.",
    "PAYMENT_CORRESPONDENCE");
  deps.enabled = true;
  const result = await runInboundService({ targetEventId: queue.evidenceLink }, deps);
  assert.equal(result.results[0].outcome, "HELD_PAYMENT_SCHEDULE_AUTHORITY");
  assert.equal(result.results[0].intent, "PAYMENT_SCHEDULE_DETAILS");
  assert.equal(effects.sends.length, 0);
  assert.equal(effects.reserves, 0);
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
