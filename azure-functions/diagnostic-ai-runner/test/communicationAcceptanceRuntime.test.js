"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { nativeAcceptanceProof, runAcceptanceVerification, recoverAcceptanceFromMailboxEvent } = require("../src/mail/outbound/acceptanceRuntime");
const command = { jm1MessageId: "command-1", correlationId: "event-1", businessObjectId: "title-1",
  providerMessageId: "11111111-1111-1111-1111-111111111111", acceptedAt: "2026-09-27T12:00:00Z",
  recipient: "author@example.com", subject: "Your review" };
const nativeMessage = { id: "immutable-1", internetMessageId: "<202609271200.11111111111111111111111111111111-copy@microsoft.com>",
  subject: command.subject, from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
  toRecipients: [{ emailAddress: { address: command.recipient } }],
  ccRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }] };
test("native proof reads authoritative command and immutable Graph message without a send tool", async () => {
  const reads = [];
  const result = await nativeAcceptanceProof("command-1", {
    relayRequest: async body => { assert.deepEqual(body, { communicationId: "command-1" }); return { command }; },
    graph: { request: async (...args) => { reads.push(args); return { value: [nativeMessage] }; } }
  });
  assert.equal(result.reason, "MAILBOX_VERIFIED");
  assert.equal(result.recipientDeliveryProven, false);
  assert.equal(reads[0][0], "GET");
  assert.equal(reads[0][3].Prefer, 'IdType="ImmutableId"');
});
test("matching subject and recipient cannot substitute for immutable provider correlation", async () => {
  const result = await nativeAcceptanceProof("command-1", { relayRequest: async () => ({ command }),
    graph: { request: async () => ({ value: [{ ...nativeMessage, internetMessageId: "<unrelated@example.com>" }] }) } });
  assert.equal(result.nativeMessage, null);
});
test("Graph pagination cannot cross mailbox authority", async () => {
  await assert.rejects(nativeAcceptanceProof("command-1", { relayRequest: async () => ({ command }),
    graph: { request: async () => ({ value: [], "@odata.nextLink": "https://example.com/messages" }) } }),
  { safeCode: "MAILBOX_PAGINATION_AUTHORITY_DENIED" });
});
test("verification timer persists health and separates normal delay from material failures", async () => {
  const calls = [];
  const result = await runAcceptanceVerification({ relayRequest: async body => {
    calls.push(body);
    if (body.action === "pending") return { commands: [{ jm1MessageId: "pending" }, { jm1MessageId: "expired" }, { jm1MessageId: "verified" }] };
    if (body.action === "runtime-health") return { recorded: true };
    return { acceptance: { communicationComplete: body.communicationId === "verified",
      communicationState: body.communicationId === "expired" ? "DELIVERY_UNVERIFIED" : "PROVIDER_ACCEPTED" } };
  } });
  assert.deepEqual(result, { pending: 1, verified: 1, unverified: 1, runtimeFailures: 0 });
  assert.equal(calls.at(-1).action, "runtime-health");
  assert.equal(calls.some(call => call.action === "send"), false);
});
test("original mailbox-copy event recovers the original provider binding without a send", async () => {
  const calls = [];
  await recoverAcceptanceFromMailboxEvent(nativeMessage, { relayRequest: async body => { calls.push(body); return {}; } });
  assert.deepEqual(calls, [{ action: "recover-provider", providerMessageId: command.providerMessageId }]);
  await recoverAcceptanceFromMailboxEvent({ ...nativeMessage, from: { emailAddress: { address: "attacker@example.com" } } },
    { relayRequest: async () => { throw new Error("must not call"); } });
});
test("recovered native evidence re-arms only the exact held service readback, never a send", async () => {
  let route = { service: { relayCommunicationId: "command-1", providerMessageId: command.providerMessageId,
    status: "DELIVERY_UNVERIFIED", serviceException: true } };
  let queue = { evidenceLink: "original-event", serviceStatus: "DELIVERY_UNVERIFIED" };
  const store = { listQueueItems: async () => [queue], withBusinessRouteLease: async (_id, fn) => fn(),
    getBusinessRoute: async () => route, updateBusinessRoute: async value => { route = value; },
    updateQueueItem: async value => { queue = value; } };
  await recoverAcceptanceFromMailboxEvent(nativeMessage, { store, relayRequest: async () => ({ acceptance: {
    communicationComplete: true, communicationId: "command-1", providerMessageId: command.providerMessageId } }) });
  assert.equal(route.service.status, "SENT_READBACK_PENDING");
  assert.equal(route.service.serviceException, false);
  assert.equal(queue.serviceStatus, "SENT_READBACK_PENDING");
});
