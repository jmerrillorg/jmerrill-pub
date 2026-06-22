"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSigningPacketPlan } = require("../src/integrations/adobeSign/agreementSigningPacketBuilder");

function baseInput(overrides = {}) {
  return {
    authorEmail: "chosen2k7@gmail.com",
    authorName: "Jackie Smith Jr.",
    publisherEmail: "publishing@jmerrill.one",
    publisherName: "J Merrill Publishing",
    audiobookIncluded: true,
    ...overrides
  };
}

describe("buildSigningPacketPlan — audiobook included", () => {
  const plan = buildSigningPacketPlan(baseInput());

  test("includes all four documents as one packet (no merging required)", () => {
    assert.equal(plan.documents.length, 4);
    const roles = plan.documents.map((d) => d.role);
    assert.deepEqual(roles, ["PUBLISHING_AGREEMENT", "PACKAGE_ADDENDUM", "AUDIOBOOK_ADDENDUM", "PAYMENT_DISCLOSURE"]);
  });

  test("two participants: Publisher first, Author second", () => {
    assert.equal(plan.participants.length, 2);
    assert.equal(plan.participants[0].email, "publishing@jmerrill.one");
    assert.equal(plan.participants[0].order, 1);
    assert.equal(plan.participants[1].email, "chosen2k7@gmail.com");
    assert.equal(plan.participants[1].order, 2);
  });

  test("includes all five required signature/initial fields", () => {
    const fields = plan.signatureFields.map((f) => f.field);
    assert.ok(fields.includes("PUBLISHER_SIGNATURE"));
    assert.ok(fields.includes("AUTHOR_SIGNATURE"));
    assert.ok(fields.includes("PACKAGE_ADDENDUM_ACK"));
    assert.ok(fields.includes("AUDIOBOOK_ADDENDUM_ACK"));
    assert.ok(fields.includes("PAYMENT_SCHEDULE_ACK"));
    assert.equal(plan.signatureFields.length, 5);
  });

  test("Publisher and Author signature fields are on the Publishing Agreement", () => {
    const pub = plan.signatureFields.find((f) => f.field === "PUBLISHER_SIGNATURE");
    const auth = plan.signatureFields.find((f) => f.field === "AUTHOR_SIGNATURE");
    assert.equal(pub.documentRole, "PUBLISHING_AGREEMENT");
    assert.equal(auth.documentRole, "PUBLISHING_AGREEMENT");
  });

  test("acknowledgement fields are assigned to the Author, not the Publisher", () => {
    const acks = plan.signatureFields.filter((f) => f.field.endsWith("_ACK"));
    assert.ok(acks.every((f) => f.assignedTo === "chosen2k7@gmail.com"));
  });
});

describe("buildSigningPacketPlan — audiobook not included", () => {
  const plan = buildSigningPacketPlan(baseInput({ audiobookIncluded: false }));

  test("omits the Audiobook Addendum document and its acknowledgement field", () => {
    const roles = plan.documents.map((d) => d.role);
    assert.ok(!roles.includes("AUDIOBOOK_ADDENDUM"));
    const fields = plan.signatureFields.map((f) => f.field);
    assert.ok(!fields.includes("AUDIOBOOK_ADDENDUM_ACK"));
    assert.equal(plan.signatureFields.length, 4);
  });
});
