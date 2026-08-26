const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSenderProfile,
  listSenderProfiles,
  validateMessageIdentity,
  validateReplyToForBrand,
  validateSenderForBrand,
  validateSignatureBlock
} = require("../src/policy/acsSenderRegistry");

test("JM1 correct sender and alias reply-to are allowed", () => {
  const sender = validateSenderForBrand({ brand: "JM1", from: "one@email.jmerrill.one" });
  assert.equal(sender.ok, true);
  assert.equal(sender.profile.replyTo, "one@jmerrill.one");
  assert.equal(sender.profile.replyMailboxAuthority, "info@jmerrill.one");
  assert.equal(sender.profile.replyAddressType, "ALIAS");

  const reply = validateReplyToForBrand({ brand: "JM1", replyTo: "one@jmerrill.one" });
  assert.equal(reply.ok, true);
});

test("configured branch senders are allowed only for their own brand", () => {
  for (const [brand, from] of [
    ["JMP", "publishing@email.jmerrill.one"],
    ["JMF", "financial@email.jmerrill.one"],
    ["JMFN", "foundation@email.jmerrill.one"],
    ["JMPRODUCTIONS", "productions@email.jmerrill.one"]
  ]) {
    const result = validateSenderForBrand({ brand, from });
    assert.equal(result.ok, true, brand);
  }
});

test("cross-brand sender mismatch fails closed", () => {
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "JMF", from: "publishing@email.jmerrill.one" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "JMFN", from: "one@email.jmerrill.one" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
});

test("reply-to is resolved from registry, not derived from ACS sender", () => {
  assert.equal(validateReplyToForBrand({ brand: "JM1", replyTo: "one@jmerrill.one" }).ok, true);
  assert.deepEqual(
    pick(validateReplyToForBrand({ brand: "JM1", replyTo: "publishing@jmerrill.one" })),
    { ok: false, reason: "ACS_REPLY_TO_MISMATCH" }
  );
});

test("Publishing message identity requires archive copy", () => {
  assert.equal(validateMessageIdentity({
    brand: "JMP",
    from: "publishing@email.jmerrill.one",
    replyTo: "publishing@jmerrill.one",
    cc: ["publishing@jmerrill.one"]
  }).ok, true);

  assert.deepEqual(
    pick(validateMessageIdentity({
      brand: "JMP",
      from: "publishing@email.jmerrill.one",
      replyTo: "publishing@jmerrill.one",
      cc: []
    })),
    { ok: false, reason: "ACS_CC_ARCHIVE_MISSING" }
  );
});

test("duplicate signature is denied", () => {
  const duplicate = [
    "The Publishing Team",
    "J Merrill Publishing, Inc.",
    "",
    "The Publishing Team",
    "J Merrill Publishing, Inc."
  ].join("\n");
  assert.deepEqual(
    pick(validateSignatureBlock({ brand: "JMP", text: duplicate })),
    { ok: false, reason: "ACS_DUPLICATE_SIGNATURE_BLOCKED" }
  );
});

test("missing, unknown, and AIC brand fail closed", () => {
  assert.deepEqual(pick(getSenderProfile("")), { ok: false, reason: "ACS_BRAND_REQUIRED" });
  assert.deepEqual(pick(getSenderProfile("UNKNOWN")), { ok: false, reason: "ACS_BRAND_UNKNOWN" });
  assert.deepEqual(pick(getSenderProfile("AIC")), { ok: false, reason: "AIC_SENDER_IDENTITY_FOUNDER_DECISION_REQUIRED" });
});

test("registry contains exactly the decided non-AIC brands", () => {
  assert.deepEqual(
    listSenderProfiles().map((profile) => profile.brand).sort(),
    ["JM1", "JMF", "JMFN", "JMP", "JMPRODUCTIONS"].sort()
  );
});

function pick(result) {
  return { ok: result.ok, reason: result.reason };
}
