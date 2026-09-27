"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { executeRenderedPublishingDelivery } = require("../src/state/renderedPublishingDelivery");

const digest = value => createHash("sha256").update(value).digest("hex");
function fixture() {
  return { reference: "JMP-INT-202609-TEST", purpose: "PUBLISHING_INQUIRY_ACKNOWLEDGMENT",
    metadata: { rendererVersion: "1.0.1", templateName: "INQUIRY", templateVersion: "1.0",
      htmlSha256: digest("<html>fixture</html>"), textSha256: digest("fixture") },
    message: { senderAddress: "publishing@email.jmerrill.one", content: { html: "<html>fixture</html>", plainText: "fixture" },
      recipients: { to: [{ address: "fixture@example.invalid" }], cc: [{ address: "publishing@jmerrill.one" }] },
      replyTo: [{ address: "publishing@jmerrill.one" }] } };
}
test("persists renderer/template authority before send and replays the same receipt", async () => {
  let entity, sends = 0, captured;
  const ledger = { reserve: async input => { captured = input;
    return entity ? { kind: "REPLAY", entity } : { kind: "RESERVED", entity: { jm1MessageId: "record" } }; },
    recordAccepted: async (prior, id) => (entity = { ...prior, providerMessageId: id, deliveryState: "ACCEPTED" }) };
  const deps = { ledger, sendMessage: async () => { sends++; assert.equal(captured.rendererVersion, "1.0.1");
    assert.equal(captured.templateVersion, "1.0"); return { providerMessageId: "provider", providerStatus: "Succeeded" }; } };
  const first = await executeRenderedPublishingDelivery(fixture(), deps);
  const replay = await executeRenderedPublishingDelivery(fixture(), deps);
  assert.equal(first.replay, false); assert.equal(replay.replay, true);
  assert.equal(replay.providerMessageId, first.providerMessageId); assert.equal(sends, 1);
});
test("missing render authority and altered bodies deny before ledger or transport", async () => {
  const deps = { ledger: { reserve: async () => assert.fail("must not reserve") }, sendMessage: async () => assert.fail("must not send") };
  const missing = fixture(); missing.metadata.rendererVersion = "";
  await assert.rejects(executeRenderedPublishingDelivery(missing, deps), { safeCode: "RENDER_AUTHORITY_REQUIRED" });
  const tampered = fixture(); tampered.message.content.html = "changed";
  await assert.rejects(executeRenderedPublishingDelivery(tampered, deps), { safeCode: "RENDER_DIGEST_MISMATCH" });
});
test("ambiguous prior send cannot send again", async () => {
  await assert.rejects(executeRenderedPublishingDelivery(fixture(), {
    ledger: { reserve: async () => ({ kind: "REPLAY", entity: { deliveryState: "RESERVED" } }) },
    sendMessage: async () => assert.fail("must not resend")
  }), { safeCode: "AMBIGUOUS_SEND_STATE" });
});
test("incomplete provider receipt leaves reservation, not accepted evidence", async () => {
  await assert.rejects(executeRenderedPublishingDelivery(fixture(), {
    ledger: { reserve: async () => ({ kind: "RESERVED", entity: {} }), recordAccepted: async () => assert.fail("must not accept") },
    sendMessage: async () => ({ providerStatus: "Running" })
  }), { safeCode: "ACS_DELIVERY_UNPROVEN" });
});
test("audit storage failure denies before transport", async () => {
  await assert.rejects(executeRenderedPublishingDelivery(fixture(), {
    ledger: { reserve: async () => { throw new Error("ledger unavailable"); } },
    sendMessage: async () => assert.fail("must not send")
  }), /ledger unavailable/);
});
test("transport ambiguity preserves reserved state", async () => {
  let accepted = false;
  await assert.rejects(executeRenderedPublishingDelivery(fixture(), {
    ledger: { reserve: async () => ({ kind: "RESERVED", entity: {} }), recordAccepted: async () => { accepted = true; } },
    sendMessage: async () => { throw new Error("timeout after acceptance possible"); }
  }), /timeout/);
  assert.equal(accepted, false);
});
