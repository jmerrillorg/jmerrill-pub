"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const validator = require("../src/agreement/acrobatExecutionValidation");
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
