"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { InMemoryInboundEvidenceStore, processGraphMessage } = require("../../src/mail/inbound");
const { runInboundBusinessRouter, resolveEditorialGate } = require("../../src/mail/inbound/businessRouter");

function authorMessage(id, subject, body) {
  return {
    id,
    internetMessageId: `<${id}@example.com>`,
    conversationId: `thread-${id}`,
    receivedDateTime: "2026-09-22T18:11:14Z",
    from: { emailAddress: { address: "author@example.com", name: "Author" } },
    subject,
    body: { contentType: "text", content: body },
    hasAttachments: false,
    toRecipients: [],
    ccRecipients: []
  };
}

const authoritativeContext = {
  contacts: [{ email: "author@example.com", authorId: "author-1", contactId: "author-1", name: "Author" }],
  activeEngagements: [{
    authorId: "author-1", authorEmail: "author@example.com", titleId: "11111111-1111-4111-8111-111111111111", title: "Untitled",
    engagementId: "engagement-1", stageId: "22222222-2222-4222-8222-222222222222", stageName: "07 Developmental Editing"
  }]
};

function fakeDataverse() {
  const rows = [];
  return {
    rows,
    async list() { return [{ jm1pub_editorialapprovalgateid: "gate-1", _jm1pub_deliverableartifactid_value: "artifact-1" }]; },
    async first(_set, query) {
      const eventId = query.$filter.match(/jm1_sourcerecordid eq '([^']+)'/)?.[1];
      return rows.find((row) => row.jm1_sourcerecordid === eventId) || null;
    },
    async create(_set, payload) {
      rows.push({ ...payload, jm1_executionlogid: `log-${rows.length + 1}` });
      return rows.at(-1).jm1_executionlogid;
    }
  };
}

async function setup(messages) {
  const store = new InMemoryInboundEvidenceStore();
  const byId = new Map(messages.map((message) => [message.id, message]));
  for (const message of messages) {
    await processGraphMessage(message, {
      store,
      graphClient: { listAttachments: async () => ({ value: [] }) },
      contextProvider: async () => authoritativeContext
    });
  }
  return {
    store,
    client: fakeDataverse(),
    contextProvider: async () => authoritativeContext,
    graphClient: { getMessage: async (id) => byId.get(id) }
  };
}

describe("Inbound business route", () => {
  test("binds only one exact current editorial gate", async () => {
    const queue = {
      titleId: "11111111-1111-4111-8111-111111111111",
      stageId: "22222222-2222-4222-8222-222222222222"
    };
    const client = { list: async () => [{
      jm1pub_editorialapprovalgateid: "gate-1",
      _jm1pub_deliverableartifactid_value: "artifact-1"
    }] };
    assert.deepEqual(await resolveEditorialGate(client, queue), {
      status: "EXACT", gateId: "gate-1", artifactId: "artifact-1"
    });
    client.list = async () => [{}, {}];
    assert.equal((await resolveEditorialGate(client, queue)).status, "AMBIGUOUS");
    client.list = async () => [];
    assert.equal((await resolveEditorialGate(client, queue)).status, "MISSING");
  });

  test("routes two distinct editorial replies and a payment request to exact human gates without effects", async () => {
    const deps = await setup([
      authorMessage("editorial-1", "Approval with Corrections - Untitled Edited Manuscript", "I approve with corrections."),
      authorMessage("editorial-2", "Approval with Corrections - Untitled Edited Manuscript", "Please see my corrections."),
      authorMessage("payment-1", "Request for 2nd and 3rd Installment Payment Plan", "Can we discuss the second and third installment payments?")
    ]);
    const first = await runInboundBusinessRouter({}, deps);
    assert.equal(first.businessEventsReady, 3);
    assert.equal(first.exceptions, 0);
    assert.equal(deps.client.rows.length, 3);
    const routes = [...deps.store.businessRoutes.values()];
    assert.equal(new Set(routes.map((route) => route.inboundMessageEventId)).size, 3);
    assert.equal(routes.filter((route) => route.kind === "EDITORIAL_HUMAN_REVIEW").length, 2);
    const payment = routes.find((route) => route.kind === "COMMERCIAL_HUMAN_REVIEW");
    assert.equal(payment.decisionGate.financialEffectsAuthorized, false);
    assert.deepEqual(payment.effects, { authorDecisions: 0, titleTransitions: 0, authorMessages: 0, financialMutations: 0 });
    for (const route of routes) {
      assert.equal(route.authorId, "author-1");
      assert.equal(route.titleId, "11111111-1111-4111-8111-111111111111");
      assert.equal(route.engagementId, "engagement-1");
      assert.equal(route.stageId, "22222222-2222-4222-8222-222222222222");
      assert.equal(route.status, "HUMAN_REVIEW_READY");
    }
    const replay = await Promise.all(routes.map((route) => runInboundBusinessRouter({ targetEventId: route.inboundMessageEventId }, deps)));
    assert.equal(replay.reduce((sum, result) => sum + result.idempotent, 0), 3);
    assert.equal(deps.client.rows.length, 3);
  });

  test("stale title, author, engagement, or stage tuple cannot produce a business event", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    const eventId = [...deps.store.queue.values()][0].evidenceLink;
    for (const changed of ["authorId", "titleId", "engagementId", "stageId"]) {
      const queue = await deps.store.getQueueItem(`queue_${eventId}`);
      await deps.store.updateQueueItem({ ...queue, [changed]: "wrong" });
      const result = await runInboundBusinessRouter({}, deps);
      assert.equal(result.results[0].outcome, "HELD_STALE_OR_AMBIGUOUS_MOVEMENT");
      await deps.store.updateQueueItem(queue);
    }
    assert.equal(deps.client.rows.length, 0);
  });

  test("ambiguous editorial gate is a system binding exception, not a founder decision", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    deps.client.list = async () => [{ jm1pub_editorialapprovalgateid: "gate-1" }, { jm1pub_editorialapprovalgateid: "gate-2" }];
    const first = await runInboundBusinessRouter({}, deps);
    assert.equal(first.results[0].outcome, "HELD_EDITORIAL_GATE_BINDING");
    assert.equal(first.businessEventsReady, 0);
    assert.equal(deps.client.rows.length, 1);
    const queue = [...deps.store.queue.values()][0];
    assert.equal(queue.waitingOn, "JMP_SYSTEM");
    assert.equal(queue.decisionGate, null);
    assert.equal(queue.editorialGate.status, "AMBIGUOUS");
    const replay = await runInboundBusinessRouter({ targetEventId: queue.evidenceLink }, deps);
    assert.equal(replay.results[0].outcome, "HELD_EDITORIAL_GATE_BINDING");
    assert.equal(deps.client.rows.length, 1);
  });

  test("an editorial gate without a bound artifact does not request a founder decision", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    deps.client.list = async () => [{ jm1pub_editorialapprovalgateid: "gate-1" }];
    const result = await runInboundBusinessRouter({}, deps);
    assert.equal(result.results[0].outcome, "HELD_EDITORIAL_GATE_BINDING");
    const queue = [...deps.store.queue.values()][0];
    assert.equal(queue.editorialGate.status, "UNBOUND_ARTIFACT");
    assert.equal(queue.decisionGate, null);
    assert.equal(queue.waitingOn, "JMP_SYSTEM");
  });

  test("a previously ready decision is invalidated when gate binding becomes ambiguous", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    await runInboundBusinessRouter({}, deps);
    deps.client.list = async () => [{ jm1pub_editorialapprovalgateid: "gate-1" }, { jm1pub_editorialapprovalgateid: "gate-2" }];
    const targetEventId = [...deps.store.queue.values()][0].evidenceLink;
    const result = await runInboundBusinessRouter({ targetEventId }, deps);
    assert.equal(result.results[0].outcome, "HELD_EDITORIAL_GATE_BINDING");
    assert.equal((await deps.store.getBusinessRoute(targetEventId)).decisionGate, null);
    assert.equal([...deps.store.queue.values()][0].waitingOn, "JMP_SYSTEM");
    assert.equal(deps.client.rows.length, 1);
  });

  test("source message mismatch and transient Dataverse failure remain retryable", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    const original = deps.graphClient.getMessage;
    deps.graphClient.getMessage = async (id) => ({ ...(await original(id)), internetMessageId: "<wrong@example.com>" });
    assert.equal((await runInboundBusinessRouter({}, deps)).results[0].outcome, "HELD_SOURCE_MESSAGE_MISMATCH");
    assert.equal(deps.client.rows.length, 0);
    deps.graphClient.getMessage = original;
    const create = deps.client.create;
    deps.client.create = async () => { throw Object.assign(new Error("temporary"), { safeCode: "DATAVERSE_UNAVAILABLE" }); };
    assert.equal((await runInboundBusinessRouter({}, deps)).results[0].outcome, "ROUTE_FAILED_RETRYABLE");
    deps.client.create = create;
    assert.equal((await runInboundBusinessRouter({}, deps)).businessEventsReady, 1);
    assert.equal(deps.client.rows.length, 1);
  });

  test("concurrent timer and replay invocations create one durable event", async () => {
    const deps = await setup([authorMessage("editorial-1", "Approval with Corrections", "I approve with corrections.")]);
    const targetEventId = [...deps.store.queue.values()][0].evidenceLink;
    const [timer, replay] = await Promise.all([
      runInboundBusinessRouter({ targetEventId }, deps),
      runInboundBusinessRouter({ targetEventId }, deps)
    ]);
    assert.equal(timer.businessEventsReady + replay.businessEventsReady, 1);
    assert.equal(timer.idempotent + replay.idempotent, 1);
    assert.equal(deps.client.rows.length, 1);
  });
});
