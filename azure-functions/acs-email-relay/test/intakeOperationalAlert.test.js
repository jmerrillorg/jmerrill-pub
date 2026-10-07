"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateIntakeOperationalAlert, sendIntakeOperationalAlert } = require("../src/state/intakeOperationalAlert");
const value = { reference: "JMP-INT-202610-TEST01", recordId: "aaaaaaaa-aaaa-5aaa-aaaa-aaaaaaaaaaaa",
  status: "FAILED", failureCode: "DEPENDENCY_UNAVAILABLE", firstObservedAt: "2026-10-07T22:00:00Z" };

test("operational payload rejects inquiry content, arbitrary recipient, URL and invalid state", () => {
  assert.equal(validateIntakeOperationalAlert(value).ok, true);
  for (const patch of [{ recipient: "external@example.invalid" }, { body: "manuscript" }, { authorEmail: "private@example.invalid" },
    { failureCode: "https://private.invalid" }, { status: "APPROVED" }]) {
    assert.equal(validateIntakeOperationalAlert({ ...value, ...patch }).ok, false);
  }
});

test("real transport receipt is journaled once per failure/resolution purpose across replay", async () => {
  const entries = new Map(); let sends = 0;
  const ledger = {
    reserve: async input => {
      const previous = entries.get(input.idempotencyKey);
      return previous ? { kind: "REPLAY", entity: previous }
        : { kind: "RESERVED", entity: { ...input, jm1MessageId: input.idempotencyKey } };
    },
    recordAccepted: async (entity, providerMessageId) => {
      const accepted = { ...entity, providerMessageId, deliveryState: "ACCEPTED" };
      entries.set(entity.idempotencyKey, accepted); return accepted;
    },
  };
  const deps = { ledger, senderAddress: "publishing@email.jmerrill.one", sendMessage: async message => {
    sends++;
    assert.deepEqual(message.recipients.to.map(x => x.address), ["jm1-admin@jmerrill.one"]);
    assert.deepEqual(message.recipients.cc.map(x => x.address), ["publishing@jmerrill.one"]);
    assert.match(message.content.plainText, /DEPENDENCY_UNAVAILABLE/);
    return { providerMessageId: `provider-${sends}`, providerStatus: "Succeeded" };
  } };
  const first = await sendIntakeOperationalAlert(value, deps);
  const replay = await sendIntakeOperationalAlert(value, deps);
  const resolved = await sendIntakeOperationalAlert({ ...value, status: "RESOLVED" }, deps);
  assert.equal(replay.replay, true);
  assert.equal(replay.providerMessageId, first.providerMessageId);
  assert.notEqual(resolved.providerMessageId, first.providerMessageId);
  assert.equal(sends, 2);
});
