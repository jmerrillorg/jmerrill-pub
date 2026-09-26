"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { InMemoryInboundEvidenceStore } = require("../../src/mail/inbound");
const { assertRequest, prepareObservedService, runObservedPaymentConsumer } = require("../../src/payment/observedPaymentServiceConsumer");
const { executeService, runInboundService } = require("../../src/mail/inbound/serviceRunner");

function setup() {
  const requestId = `observed_payment_${"a".repeat(40)}`;
  const request = { requestId, idempotencyKey: requestId, authorId: "author-1", titleId: "title-1",
    agreementId: "agreement-1", engagementId: "agreement-1", obligationId: "agreement-1",
    requestType: "ADDITIONAL_PAYMENT_REQUEST", createdAt: "2026-09-24T20:33:00Z",
    sourceEvent: { kind: "FOUNDER_RATIFIED_OBSERVATION", providerMessageId: null } };
  const store = new InMemoryInboundEvidenceStore();
  const records = new Map();
  store.get = async path => structuredClone(records.get(path) || null);
  store.put = async (path, record) => { records.set(path, structuredClone(record)); return record; };
  store.listPrefix = async prefix => [...records].filter(([path]) => path.startsWith(prefix)).map(([, row]) => structuredClone(row));
  const effects = { sends: 0, reconciliations: 0, failed: false };
  const deps = { store, env: { JM1_OBSERVED_PAYMENT_SERVICE_ENABLED: "true" }, client: {}, writeLog: async () => "log-1",
    paymentServiceCall: async action => {
      if (action === "LIST") return { requests: [request] };
      if (action === "RECONCILE_PROVIDER_TAIL") return { results: [] };
      if (action === "RECONCILE_SETTLEMENTS") {
        effects.reconciliations++;
        if (effects.failed) throw Object.assign(new Error("timeout"), { safeCode: "DATAVERSE_TIMEOUT" });
        return { reconciliation: { status: "RECONCILED", totalAppliedCents: 51976, balanceCents: 155923 } };
      }
      return { preparation: { request, recipient: "author@example.com", titleName: "Book", authorName: "Author",
        paymentUrl: "https://checkout.stripe.com/fixture", copy: { subject: "Your payment information",
          text: "Your existing publishing payment information.", html: "<p>Your existing publishing payment information.</p>",
          metadata: { qualityGate: "PASS" } } } };
    },
    reserveCommunicationIntent: async () => ({ status: "RESERVED", communicationRecordId: "comm-1", semanticIdempotencyKey: "semantic-1" }),
    markCommunicationSent: async () => ({ sentRecordId: "sent-1" }),
    sendConfiguredAuthorResponse: async ({ input }) => {
      assert.deepEqual(input.cc, ["publishing@jmerrill.one"]);
      assert.ok(input.sendApproval.draftHtmlBody);
      effects.sends++;
      return { ok: true, authorEmailStatus: "AUTHOR_RESPONSE_SENT", providerMessageId: "acs-1" };
    },
    verifyMailboxCopy: async () => ({ status: "PASS", graphMessageId: "copy-1", internetMessageId: "<copy@example.com>" }),
  };
  return { request, store, records, effects, deps };
}

test("uncommissioned consumer performs no reads or effects", async () => {
  let calls = 0;
  assert.equal((await runObservedPaymentConsumer({ env: {}, paymentServiceCall: async () => { calls++; } })).status, "DISABLED");
  assert.equal(calls, 0);
});

test("request authority preserves observed provenance and rejects unsupported or conflicting identity", () => {
  const { request } = setup();
  for (const requestType of ["ADDITIONAL_PAYMENT_REQUEST", "PAYMENT_ACCESS_REQUEST", "INSTALLMENT_INFORMATION_REQUEST", "PAYMENT_LINK_ACCESS_PROBLEM"]) {
    assert.doesNotThrow(() => assertRequest({ ...request, requestType }));
  }
  for (const change of [{ engagementId: "wrong" }, { obligationId: "wrong" }, { requestType: "CREATE_INVOICE" },
    { sourceEvent: { ...request.sourceEvent, providerMessageId: "fabricated" } }]) {
    assert.throws(() => assertRequest({ ...request, ...change }), /AUTHORITY_DENIED/);
  }
});

test("durable timeout recovery survives process restart, deduplicates queue, and sends through normal outbox once", async () => {
  const { request, store, effects, deps } = setup();
  effects.failed = true;
  assert.equal((await runObservedPaymentConsumer(deps)).status, "RECONCILIATION_PENDING");
  assert.equal((await store.listQueueItems()).length, 0);
  const path = `payment-service/requests/${request.requestId}.json`;
  const pending = await store.get(path);
  assert.equal(pending.retryCount, 1);
  assert.equal(pending.lastFailure, "DATAVERSE_TIMEOUT");
  await store.put(path, { ...pending, nextRetryAt: "2000-01-01T00:00:00Z" });
  effects.failed = false;
  assert.equal((await runObservedPaymentConsumer({ ...deps })).status, "HEALTHY");
  await runObservedPaymentConsumer({ ...deps });
  assert.equal((await store.listQueueItems()).length, 1);
  const queue = (await store.listQueueItems())[0];
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal((await executeService(queue, { ...deps })).outcome, "IDEMPOTENT");
  assert.equal(effects.sends, 1);
  assert.equal((await store.get(path)).reconciliation.balanceCents, 155923);
});

test("wrong author/title/engagement cannot prepare or send", async () => {
  const { store, deps, effects } = setup();
  await runObservedPaymentConsumer(deps);
  const queue = (await store.listQueueItems())[0];
  for (const change of [{ authorId: "wrong" }, { titleId: "wrong" }, { engagementId: "wrong" }]) {
    await assert.rejects(() => prepareObservedService({ ...queue, ...change }, deps), /IDENTITY_DENIED/);
  }
  assert.equal(effects.sends, 0);
});

test("mailbox copy delay retries readback without a second provider send", async () => {
  const { store, deps, effects } = setup();
  await runObservedPaymentConsumer(deps);
  const queue = (await store.listQueueItems())[0];
  const verify = deps.verifyMailboxCopy;
  deps.verifyMailboxCopy = async () => ({ status: "PENDING" });
  assert.equal((await executeService(queue, deps)).outcome, "SENT_READBACK_PENDING");
  deps.verifyMailboxCopy = verify;
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal(effects.sends, 1);
});

test("rejected relay recovery reuses the same canonical reservation and durable relay path", async () => {
  const { store, deps, effects } = setup();
  await runObservedPaymentConsumer(deps);
  const queue = (await store.listQueueItems())[0];
  const route = await store.getBusinessRoute(queue.evidenceLink);
  const held = { intent: "ADDITIONAL_PAYMENT_REQUEST", status: "AMBIGUOUS_SEND_STATE",
    communicationRecordId: "comm-1", reason: "AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED" };
  await store.updateBusinessRoute({ ...route, service: held });
  deps.env.JM1_AUTHOR_RESPONSE_SEND_PROVIDER = "acs-relay";
  deps.reserveCommunicationIntent = async () => ({ status: "AMBIGUOUS_SEND_STATE",
    communicationRecordId: "comm-1", semanticIdempotencyKey: "semantic-1" });
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal((await executeService(queue, deps)).outcome, "IDEMPOTENT");
  assert.equal(effects.sends, 1);
});

test("unknown ambiguity, a different reservation, or a non-durable sender cannot replay", async () => {
  for (const variant of ["UNKNOWN", "WRONG_RESERVATION", "INJECTED"]) {
    const { store, deps, effects } = setup();
    await runObservedPaymentConsumer(deps);
    const queue = (await store.listQueueItems())[0];
    const route = await store.getBusinessRoute(queue.evidenceLink);
    await store.updateBusinessRoute({ ...route, service: { status: "AMBIGUOUS_SEND_STATE",
      communicationRecordId: "comm-1", reason: variant === "UNKNOWN" ? "UNKNOWN" : "AUTHOR_RESPONSE_SEND_PROVIDER_REJECTED" } });
    deps.env.JM1_AUTHOR_RESPONSE_SEND_PROVIDER = variant === "INJECTED" ? "injected" : "acs-relay";
    deps.reserveCommunicationIntent = async () => ({ status: "AMBIGUOUS_SEND_STATE",
      communicationRecordId: variant === "WRONG_RESERVATION" ? "comm-2" : "comm-1", semanticIdempotencyKey: "semantic-1" });
    assert.equal((await executeService(queue, deps)).outcome, "HELD_AMBIGUOUS_SEND_STATE");
    assert.equal(effects.sends, 0);
  }
});

test("provider census outage remains durably visible and cannot erase earlier failures", async () => {
  const { store, deps } = setup();
  const call = deps.paymentServiceCall;
  deps.paymentServiceCall = async action => {
    if (action === "RECONCILE_PROVIDER_TAIL") throw new Error("provider timeout");
    return call(action);
  };
  await runObservedPaymentConsumer(deps);
  const health = await store.get("payment-service/health.json");
  assert.equal(health.status, "RECONCILIATION_PENDING");
  assert.equal(health.unreconciledSettlementCount, 1);
  assert.ok(health.oldestUnreconciledSettlement);
  assert.equal(health.retryCount, 1);
  deps.paymentServiceCall = call;
  await runObservedPaymentConsumer(deps);
  const recovered = await store.get("payment-service/health.json");
  assert.equal(recovered.status, "HEALTHY");
  assert.equal(recovered.unreconciledSettlementCount, 0);
  assert.equal(recovered.retryCount, 1);
  assert.equal(recovered.lastFailure, health.lastFailure);
});

test("observed-request preview cannot reconcile, create access, or send", async () => {
  const { store, deps, effects } = setup();
  await runObservedPaymentConsumer(deps);
  deps.paymentServiceCall = async () => { throw new Error("PREVIEW_EFFECT_FORBIDDEN"); };
  deps.graphClient = {};
  deps.contextProvider = async () => ({});
  const queue = (await store.listQueueItems())[0];
  const result = await runInboundService({ preview: true, targetEventId: queue.evidenceLink }, deps);
  assert.equal(result.results[0].outcome, "PREVIEW_OBSERVED_REQUEST");
  assert.equal(effects.sends, 0);
});

test("accepted provider send with a failed audit write resumes audit without resending", async () => {
  const { store, deps, effects } = setup();
  await runObservedPaymentConsumer(deps);
  const queue = (await store.listQueueItems())[0];
  const mark = deps.markCommunicationSent;
  deps.markCommunicationSent = async () => { throw new Error("DATAVERSE_TIMEOUT"); };
  await assert.rejects(() => executeService(queue, deps), /DATAVERSE_TIMEOUT/);
  assert.equal((await store.getBusinessRoute(queue.evidenceLink)).service.status, "SEND_ACCEPTED_AUDIT_PENDING");
  deps.markCommunicationSent = mark;
  deps.findIntentState = async () => ({ status: "AMBIGUOUS_SEND_STATE" });
  assert.equal((await executeService(queue, deps)).outcome, "SENT");
  assert.equal(effects.sends, 1);
});
