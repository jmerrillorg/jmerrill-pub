"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const {
  classifyAuthorReviewResponse,
  compactDecisionSource,
  runAuthorReviewResponseConsumer,
  stableIdempotencyKey
} = require("../src/orchestration/authorReviewResponseConsumer");

const gateId = "be079017-0983-f111-ab0f-000d3a14673b";

function createMockClient() {
  const calls = { created: [], patched: [] };
  return {
    calls,
    async first(entitySet) {
      if (entitySet === "jm1_executionlogs") return null;
      return null;
    },
    async list() {
      return [
        {
          jm1pub_editorialapprovalgateid: gateId,
          jm1pub_editorialapprovalgatename: "A5 Proofreading Completion - The Intentional Leader Volume I",
          modifiedon: "2026-07-19T13:28:12Z"
        }
      ];
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      return `${payload.jm1_actiontype}-id`;
    },
    async patch(entitySet, id, payload) {
      calls.patched.push({ entitySet, id, payload });
    }
  };
}

test("author review classifier recognizes concise approval", () => {
  assert.equal(classifyAuthorReviewResponse("I approve!"), "APPROVE");
  assert.equal(classifyAuthorReviewResponse("Please make these corrections"), "REQUEST_CORRECTIONS");
  assert.equal(classifyAuthorReviewResponse("Received, thank you"), "ACKNOWLEDGMENT_ONLY");
  assert.equal(classifyAuthorReviewResponse("I approve with minor corrections"), "APPROVE_WITH_MINOR_CORRECTIONS");
});

test("author decision source fits Dataverse field limit", () => {
  const source = compactDecisionSource("<very-long-internet-message-id-with-a-large-provider-generated-value@example.gmail.com>");
  assert.ok(source.length <= 100);
  assert.match(source, /^inbound:publishing@jmerrill\.one:/);
});

test("Azure Functions timer registers the durable inbound response consumer", () => {
  const wrapper = readFileSync("src/functions/runAuthorReviewResponseConsumer.js", "utf8");
  const index = readFileSync("src/index.js", "utf8");
  assert.match(wrapper, /app\.timer\("run-author-review-response-consumer"/);
  assert.match(wrapper, /schedule: "0 \*\/5 \* \* \* \*"/);
  assert.match(index, /runAuthorReviewResponseConsumer/);
});

test("inbound approval begins at monitored mailbox and persists the gate decision", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: true,
        inboundMessageId: "inbound-1",
        internetMessageId: "<internet-1@jmerrill.one>",
        conversationId: "conv-1",
        senderAddress: "chosen2k7@gmail.com",
        toRecipients: ["publishing@jmerrill.one"],
        receivedDateTime: "2026-07-19T20:08:00Z",
        bodyText: "I approve!"
      })
    }
  );

  assert.equal(result.processed, 1);
  assert.equal(result.monitoredMailbox, "publishing@jmerrill.one");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_DISCOVERED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CLAIMED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CORRELATED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CLASSIFIED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_PERSISTED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_COMPLETED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_INBOUND_CORRELATED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_APPROVAL_PERSISTED"));
  assert.ok(client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates" && call.payload.jm1pub_authordecision === 196650000));
});

test("correction response does not approve or start the next stage", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: true,
        inboundMessageId: "inbound-2",
        internetMessageId: "<internet-2@jmerrill.one>",
        conversationId: "conv-2",
        senderAddress: "chosen2k7@gmail.com",
        toRecipients: ["publishing@jmerrill.one"],
        receivedDateTime: "2026-07-19T20:09:00Z",
        bodyText: "Please make a correction"
      })
    }
  );

  assert.equal(result.processed, 1);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_CORRECTIONS_REQUESTED"));
  assert.ok(!client.calls.created.some((call) => call.entitySet === "jm1_productionprojects"));
});

test("publishing sender copy is ignored and cannot be classified as author corrections", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: false,
        code: "NO_MATCHING_REPLY_FOUND",
        senderAddress: null,
        receivedDateTime: null,
        bodyText: null
      })
    }
  );

  assert.equal(result.processed, 0);
  assert.equal(client.calls.created.length, 0);
  assert.equal(client.calls.patched.length, 0);
});

test("acknowledgment-only response is preserved but does not approve the gate", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: true,
        inboundMessageId: "inbound-3",
        internetMessageId: "<internet-3@jmerrill.one>",
        conversationId: "conv-3",
        senderAddress: "chosen2k7@gmail.com",
        toRecipients: ["publishing@jmerrill.one"],
        receivedDateTime: "2026-07-19T20:10:00Z",
        bodyText: "Received, thank you"
      })
    }
  );

  assert.equal(result.processed, 0);
  assert.equal(result.results[0].outcome, "ACKNOWLEDGMENT_RECORDED");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED"));
  assert.ok(!client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates"));
});

test("duplicate provider message identity does not create a second response", async () => {
  const client = createMockClient();
  client.first = async (entitySet) => {
    if (entitySet === "jm1_executionlogs") {
      return { jm1_executionlogid: "existing-completed" };
    }
    return null;
  };

  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: true,
        inboundMessageId: "inbound-4",
        internetMessageId: "<internet-4@jmerrill.one>",
        conversationId: "conv-4",
        senderAddress: "chosen2k7@gmail.com",
        toRecipients: ["publishing@jmerrill.one"],
        receivedDateTime: "2026-07-19T20:11:00Z",
        bodyText: "I approve!"
      })
    }
  );

  assert.equal(result.idempotent, 1);
  assert.equal(client.calls.created.length, 0);
  assert.equal(client.calls.patched.length, 0);
});

test("short idempotency keys fit in execution-log descriptions", () => {
  const longInboundMessageId = "<202607192316.50583b1d164e479790f039ac90815e15-OBZG6ZD4IFBVGRKNIFEUYLLQOJXWILRUMVQWCYJVMYZS2YZQGBSS2NDBMZQS2YLFGRRC2MZYGE3DSMLBGEZDKYZUPRZW25DQ@microsoft.com>";
  const key = stableIdempotencyKey(gateId, longInboundMessageId);
  assert.match(key, /^author-review-response:[a-f0-9]{24}$/);
  assert.ok(key.length < 60);
});

test("source text documents no Publisher button or Cody session in the normal path", () => {
  const source = readFileSync("src/orchestration/authorReviewResponseConsumer.js", "utf8");
  assert.match(source, /publishing@jmerrill\.one Inbox plus open Dataverse author-review gates/);
  assert.match(source, /It did not call the transition handler/);
  assert.doesNotMatch(source, /Publisher Center action required/);
  assert.doesNotMatch(source, /Cody session required/);
});
