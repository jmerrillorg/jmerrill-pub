"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  uploadTransientDocument,
  createAgreement,
  getAgreementStatus,
  downloadSignedDocument,
  GATE_NAME
} = require("../src/integrations/adobeSign/adobeSignClient");

const originalEnv = { [GATE_NAME]: process.env[GATE_NAME] };
beforeEach(() => { delete process.env[GATE_NAME]; });
afterEach(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("uploadTransientDocument — gate enforcement", () => {
  test("rejects when gate is absent, deps never called", async () => {
    let called = false;
    const deps = { uploadTransientDocument: async () => { called = true; return {}; } };
    const result = await uploadTransientDocument({ fileName: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") }, deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(called, false);
  });

  test("succeeds when gate is open and deps return a transientDocumentId", async () => {
    process.env[GATE_NAME] = "true";
    const deps = { uploadTransientDocument: async () => ({ transientDocumentId: "fake-id-123" }) };
    const result = await uploadTransientDocument({ fileName: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") }, deps);
    assert.equal(result.ok, true);
    assert.equal(result.transientDocumentId, "fake-id-123");
  });

  test("rejects missing fileName/buffer even with the gate open", async () => {
    process.env[GATE_NAME] = "true";
    const deps = { uploadTransientDocument: async () => ({ transientDocumentId: "x" }) };
    assert.equal((await uploadTransientDocument({ buffer: Buffer.from("x") }, deps)).reason, "FILE_NAME_REQUIRED");
    assert.equal((await uploadTransientDocument({ fileName: "x.pdf" }, deps)).reason, "BUFFER_REQUIRED");
  });
});

describe("createAgreement — gate enforcement and validation", () => {
  function validInput(overrides = {}) {
    return {
      name: "Agreement package for Establishing Glory: The Library",
      transientDocumentIds: ["td-1", "td-2"],
      participants: [{ email: "publishing@jmerrill.one", role: "SIGNER", order: 1 }],
      ...overrides
    };
  }

  test("rejects when gate is absent", async () => {
    const result = await createAgreement(validInput(), { createAgreement: async () => ({ agreementId: "x" }) });
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("succeeds when gate is open with valid input", async () => {
    process.env[GATE_NAME] = "true";
    const result = await createAgreement(validInput(), { createAgreement: async () => ({ agreementId: "agreement-abc" }) });
    assert.equal(result.ok, true);
    assert.equal(result.agreementId, "agreement-abc");
  });

  test("rejects when transientDocumentIds is empty (no documents to sign)", async () => {
    process.env[GATE_NAME] = "true";
    const result = await createAgreement(validInput({ transientDocumentIds: [] }), { createAgreement: async () => ({}) });
    assert.equal(result.reason, "TRANSIENT_DOCUMENT_IDS_REQUIRED");
  });

  test("rejects when participants is empty", async () => {
    process.env[GATE_NAME] = "true";
    const result = await createAgreement(validInput({ participants: [] }), { createAgreement: async () => ({}) });
    assert.equal(result.reason, "PARTICIPANTS_REQUIRED");
  });
});

describe("getAgreementStatus / downloadSignedDocument — gate enforcement", () => {
  test("getAgreementStatus rejects when gate is absent", async () => {
    const result = await getAgreementStatus("agreement-abc", { getAgreementStatus: async () => ({ status: "SIGNED" }) });
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("getAgreementStatus succeeds when gate is open", async () => {
    process.env[GATE_NAME] = "true";
    const result = await getAgreementStatus("agreement-abc", { getAgreementStatus: async () => ({ status: "SIGNED", completedAt: "2026-06-22T00:00:00Z" }) });
    assert.equal(result.ok, true);
    assert.equal(result.status, "SIGNED");
  });

  test("downloadSignedDocument rejects when gate is absent", async () => {
    const result = await downloadSignedDocument("agreement-abc", { downloadSignedDocument: async () => Buffer.from("pdf") });
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("downloadSignedDocument succeeds when gate is open", async () => {
    process.env[GATE_NAME] = "true";
    const result = await downloadSignedDocument("agreement-abc", { downloadSignedDocument: async () => Buffer.from("pdf-bytes") });
    assert.equal(result.ok, true);
    assert.equal(result.buffer.toString(), "pdf-bytes");
  });
});

describe("all four functions never call their dep without an agreementId/required field present", () => {
  test("getAgreementStatus rejects a missing agreementId even with the gate open", async () => {
    process.env[GATE_NAME] = "true";
    const result = await getAgreementStatus("", { getAgreementStatus: async () => ({}) });
    assert.equal(result.reason, "AGREEMENT_ID_REQUIRED");
  });
});
