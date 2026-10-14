"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), c = require("../src/lifecycle/onboardingPayloadCodec");
test("small legacy JSON is unchanged and complete larger answers round-trip within live field limit", () => {
  const small = { answer: "hello" }; assert.equal(c.encode(small), JSON.stringify(small)); assert.deepEqual(c.decode(c.encode(small)), small);
  const large = { rawFormData: { notes: "Preserve exact rights and safeguards. ".repeat(200) }, governedAuthority: { titleId: "exact-title" } };
  const encoded = c.encode(large); assert.ok(encoded.length <= 2000); assert.deepEqual(c.decode(encoded), large);
  assert.equal(c.encode(large), encoded);
});
test("corruption and oversized expansion fail without truncation", () => {
  const large = { answer: "source content ".repeat(500) }, encoded = JSON.parse(c.encode(large));
  assert.throws(() => c.decode(JSON.stringify({ ...encoded, sha256: "a".repeat(64) })), /INTEGRITY/);
  assert.throws(() => c.decode(JSON.stringify({ ...encoded, bytes: c.EXPANDED_LIMIT + 1 })), /INTEGRITY/);
  assert.throws(() => c.encode({ answer: "x".repeat(c.EXPANDED_LIMIT) }), /CAPACITY/);
  assert.throws(() => c.encode({ answer: require("node:crypto").randomBytes(3000).toString("base64") }), /CAPACITY/);
});
