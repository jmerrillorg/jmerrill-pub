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
    ["JMPRODUCTIONS", "productions@email.jmerrill.one"],
    ["AIC", "aic@email.agapeic.org"],
    ["JSJ", "jackie@email.jackiesmithjr.com"]
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
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "AIC", from: "publishing@email.jmerrill.one" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "AIC", from: "one@email.jmerrill.one" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "JSJ", from: "one@email.jmerrill.one" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "JSJ", from: "aic@email.agapeic.org" })),
    { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
  );
  assert.deepEqual(
    pick(validateSenderForBrand({ brand: "JMP", from: "jackie@email.jackiesmithjr.com" })),
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

test("AIC sender identity is governed by its own ACS sender and reply mailbox", () => {
  const profile = getSenderProfile("AIC");
  assert.equal(profile.ok, true);
  assert.equal(profile.profile.acsFrom, "aic@email.agapeic.org");
  assert.equal(profile.profile.replyTo, "aic@agapeic.org");
  assert.equal(profile.profile.replyMailboxAuthority, "aic@agapeic.org");
  assert.equal(profile.profile.riskPolicy, "AIC");
});

test("JSJ sender identity is governed by the Jackie Smith Jr. personal brand domain", () => {
  const profile = getSenderProfile("JSJ");
  assert.equal(profile.ok, true);
  assert.equal(profile.profile.acsFrom, "jackie@email.jackiesmithjr.com");
  assert.equal(profile.profile.replyTo, "jackie@jmerrill.one");
  assert.equal(profile.profile.replyMailboxAuthority, "jackie@jmerrill.one");
  assert.equal(profile.profile.replyAddressType, "MAILBOX");
  assert.equal(profile.profile.riskPolicy, "PERSONAL_BRAND");

  assert.equal(validateMessageIdentity({
    brand: "JSJ",
    from: "jackie@email.jackiesmithjr.com",
    replyTo: "jackie@jmerrill.one"
  }).ok, true);

  for (const from of [
    "one@email.jmerrill.one",
    "publishing@email.jmerrill.one",
    "financial@email.jmerrill.one",
    "foundation@email.jmerrill.one",
    "productions@email.jmerrill.one",
    "aic@email.agapeic.org"
  ]) {
    assert.deepEqual(
      pick(validateMessageIdentity({ brand: "JSJ", from, replyTo: "jackie@jmerrill.one" })),
      { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH" }
    );
  }
});

test("missing and unknown brands fail closed", () => {
  assert.deepEqual(pick(getSenderProfile("")), { ok: false, reason: "ACS_BRAND_REQUIRED" });
  assert.deepEqual(pick(getSenderProfile("UNKNOWN")), { ok: false, reason: "ACS_BRAND_UNKNOWN" });
});

test("registry contains the decided enterprise brands including AIC and JSJ", () => {
  assert.deepEqual(
    listSenderProfiles().map((profile) => profile.brand).sort(),
    ["AIC", "JM1", "JMF", "JMFN", "JMP", "JMPRODUCTIONS", "JSJ"].sort()
  );
});

function pick(result) {
  return { ok: result.ok, reason: result.reason };
}
