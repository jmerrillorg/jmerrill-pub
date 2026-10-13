"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const validator = require("../src/agreement/acrobatExecutionValidation");
const event = (name, email) => `Document e-signed by ${name} (${email}) Signature Date: 2026-10-13`;
test("separate exact author and Publishing countersigner are required", () => {
  const author = event("Jackie Smith, Jr.", "jackie@jmerrill.one");
  const publisher = event("Jackie Smith", "publishing@jmerrill.one");
  assert.deepEqual(validator.requiredParties(author + publisher), { author: "jackie@jmerrill.one", publisher: "publishing@jmerrill.one" });
  for (const invalid of [author, publisher, author + author, publisher + publisher,
    author + event("Other Person", "publishing@jmerrill.one"),
    author + event("Jackie Smith", "publishing@unrelated.example"), author + publisher + author]) {
    assert.throws(() => validator.requiredParties(invalid), /REQUIRED_PARTIES_UNPROVEN/);
  }
});
test("only exact issued furniture is removed once on each page", () => {
  assert.equal(validator.withoutIssuedFurniture(["Exact Header body", "Exact Header more"], ["Exact Header"]), "bodymore");
  assert.equal(validator.withoutIssuedFurniture(["Changed Header body"], ["Exact Header"]), "ChangedHeaderbody");
  assert.equal(validator.withoutIssuedFurniture(["Exact Header Exact Header body"], ["Exact Header"]), "ExactHeaderbody");
});
test("an uploaded unsigned PDF does not establish agreement execution", async () => {
  const doc = await require("pdf-lib").PDFDocument.create(); doc.addPage();
  const bytes = Buffer.from(await doc.save());
  await assert.rejects(validator.verifySeal(bytes), /FULL_DOCUMENT_SEAL_REQUIRED/);
});
test("malformed, oversized and wrong issued versions are rejected before interpretation", async () => {
  await assert.rejects(validator.verifySeal(Buffer.from("not a PDF")), /PDF_INVALID/);
  await assert.rejects(validator.verifySeal(Buffer.alloc(26 * 1024 * 1024)), /PDF_INVALID/);
  await assert.rejects(validator.validateExecution({ issuedBytes: Buffer.from("wrong"), prepared: { agreementSha256: "other", agreementVersion: "1.0.0" } }), /ISSUED_VERSION_CONFLICT/);
});
