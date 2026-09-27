"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { communicationAcceptance, verifyPublishingMailboxEvidence, MAILBOX_VERIFICATION_POLICY } = require("../src/generated/communications/publishing-communication-acceptance");
const { createLedger } = require("../src/state/messageLedger");
function command() {
  return { jm1MessageId: "11111111-1111-4111-8111-111111111111", brand: "JMP", correlationId: "event", businessObjectId: "title",
    providerMessageId: "97212229-ae70-4322-a6dc-a5a9de8898a5", acceptedAt: "2026-09-27T03:10:58.190Z",
    recipient: "fixture@example.invalid", subject: "Project materials", rendererVersion: "1.0.1", templateVersion: "1.0",
    contentValid: true, canonicalRender: true };
}
function nativeMessage() {
  return { id: "immutable-native-id", internetMessageId: "<202609270310.97212229ae704322a6dca5a9de8898a5-proof@microsoft.com>",
    subject: "Project materials", from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: "fixture@example.invalid" } }],
    ccRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }] };
}
test("ACS success is provider accepted, never recipient delivery or communication complete", () => {
  const result = communicationAcceptance(command());
  assert.equal(result.communicationState, "PROVIDER_ACCEPTED");
  assert.equal(result.communicationComplete, false); assert.equal(result.recipientDeliveryProven, false);
});
test("immutable native copy correlation passes and complete requires all four gates", () => {
  const proof = verifyPublishingMailboxEvidence(command(), nativeMessage(), "publishing@jmerrill.one");
  assert.equal(proof.verified, true);
  const c = { ...command(), ...proof.evidence, mailboxVerifiedAt: "2026-09-27T03:11:00Z" };
  assert.equal(communicationAcceptance(c).communicationComplete, true);
  for (const key of ["contentValid", "canonicalRender"]) assert.equal(communicationAcceptance({ ...c, [key]: false }).communicationComplete, false);
});
test("subject/recipient/time matches cannot substitute for provider identity", () => {
  const row = nativeMessage(); row.internetMessageId = "<202609270310.00000000000000000000000000000000-other@microsoft.com>";
  assert.equal(verifyPublishingMailboxEvidence(command(), row, "publishing@jmerrill.one").verified, false);
});
test("wrong mailbox, sender, recipient, CC or missing immutable message ID deny", () => {
  assert.equal(verifyPublishingMailboxEvidence(command(), nativeMessage(), "other@example.invalid").verified, false);
  for (const override of [{ id: "" }, { from: { emailAddress: { address: "other@example.invalid" } } },
    { toRecipients: [] }, { ccRecipients: [] }, { subject: "different" }]) {
    assert.equal(verifyPublishingMailboxEvidence(command(), { ...nativeMessage(), ...override }, "publishing@jmerrill.one").verified, false);
  }
});
test("bounded verification expires, persists exception, then recovers without provider send", async () => {
  let row = { ...command(), partitionKey: "p", rowKey: "r", verificationRequired: true, verificationAttempts: 0,
    verificationDeadline: new Date(Date.parse(command().acceptedAt) + MAILBOX_VERIFICATION_POLICY.windowMs).toISOString() };
  let sends = 0;
  const ledger = createLedger({ getEntity: async () => row, updateEntity: async update => { row = { ...row, ...update }; } });
  const pending = await ledger.recordVerification(row, null, "2026-09-27T03:11:00Z");
  assert.equal(pending.communicationState, "PROVIDER_ACCEPTED"); assert.equal(pending.serviceException, false);
  const failed = await ledger.recordVerification(row, null, "2026-09-27T03:41:00Z");
  assert.equal(failed.communicationState, "DELIVERY_UNVERIFIED"); assert.equal(failed.serviceException, true);
  assert.equal(failed.nextVerificationAt, ""); assert.equal(communicationAcceptance(failed).communicationComplete, false);
  const recovered = await ledger.recordVerification(row, nativeMessage(), "2026-09-27T03:42:00Z");
  assert.equal(communicationAcceptance(recovered).communicationComplete, true); assert.equal(sends, 0);
  const same = await ledger.recordVerification(row, null, "2026-09-27T03:43:00Z");
  assert.equal(same.mailboxVerifiedAt, recovered.mailboxVerifiedAt);
});
test("provider failure remains distinct from accepted-but-unverified", () => {
  const failed = communicationAcceptance({ communicationState: "FAILED" });
  assert.equal(failed.communicationState, "FAILED"); assert.equal(failed.providerAccepted, false);
  const unverified = communicationAcceptance({ ...command(), communicationState: "DELIVERY_UNVERIFIED" });
  assert.equal(unverified.providerAccepted, true); assert.equal(unverified.communicationComplete, false);
});
