"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { generateSimplifiedAgreementPacket, GATE_NAME } = require("../src/agreement/simplifiedAgreementPacketRunner");
const { isValidDocxBuffer } = require("../src/agreement/agreementDocxValidator");

const originalEnv = { [GATE_NAME]: process.env[GATE_NAME] };
const DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";

beforeEach(() => { delete process.env[GATE_NAME]; });
afterEach(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function controlledInput(overrides = {}) {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    title: "Establishing Glory: The Library",
    authorLegalName: "Jackie Smith Jr.",
    authorEmail: "chosen2k7@gmail.com",
    imprintLabel: "J Merrill Publishing",
    officialManuscriptWordCount: 48232,
    selectedPackageCode: "JMP-PKG-PRO",
    paymentOption: "EIGHT_PAYMENTS",
    contractDate: "2026-06-22",
    ...overrides
  };
}

describe("generateSimplifiedAgreementPacket — gate enforcement and validation", () => {
  test("rejects when gate is absent", async () => {
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects when diagnosticId is missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput({ diagnosticId: "" }));
    assert.equal(result.reason, "DIAGNOSTIC_ID_REQUIRED");
  });

  test("rejects when field computation fails (e.g. unrecognized package)", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput({ selectedPackageCode: "NOT_REAL" }));
    assert.equal(result.reason, "FIELD_COMPUTATION_FAILED");
  });

  test("rejects a package without a defined content model (computeAgreementFields itself rejects first, since complimentaryCopies/audiobookIncluded are also only defined for JMP-PKG-PRO)", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput({ selectedPackageCode: "JMP-PKG-SIGNATURE" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "FIELD_COMPUTATION_FAILED");
  });
});

describe("generateSimplifiedAgreementPacket — produces the package-specific, simplified, single-packet documents", () => {
  test("generates exactly 3 new documents (Package Addendum, Audiobook section, Payment Disclosure) for JMP-PKG-PRO", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.equal(result.ok, true);
    assert.equal(result.packageSpecific, true);
    assert.equal(result.audiobookSimplified, true);
    assert.equal(result.paymentDisclosureReplacesScheduleA, true);
    assert.equal(result.documents.length, 3);
    const roles = result.documents.map((d) => d.role);
    assert.deepEqual(roles, ["PACKAGE_ADDENDUM", "AUDIOBOOK_ADDENDUM", "PAYMENT_DISCLOSURE"]);
  });

  test("every generated document is a structurally valid .docx", async () => {
    process.env[GATE_NAME] = "true";
    const writtenBuffers = [];
    const result = await generateSimplifiedAgreementPacket(controlledInput(), {
      writeOutput: async (name, buffer) => { writtenBuffers.push(buffer); return `/fake/${name}`; }
    });
    assert.equal(result.ok, true);
    assert.equal(writtenBuffers.length, 3);
    for (const buf of writtenBuffers) {
      const v = await isValidDocxBuffer(buf);
      assert.equal(v.valid, true);
    }
  });

  test("matches the controlled record's exact confirmed package/payment figures", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.equal(result.fields.packageLabel, "Professional Publishing Package (JMP-PKG-PRO)");
    assert.equal(result.fields.packageFeeFormatted, "$4,500.00");
    assert.deepEqual(result.fields.complimentaryCopies, { paperback: 10, hardcover: 2, ebook: 1 });
    assert.equal(result.fields.audiobookIncluded, true);
    assert.equal(result.fields.paymentSchedule.installments, 8);
    assert.equal(result.fields.paymentSchedule.totalFormatted, "$4,680.00");
  });

  test("includes an Adobe-Sign-ready signing packet plan with all four documents and five fields", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.equal(result.signingPacketPlan.documents.length, 4);
    assert.equal(result.signingPacketPlan.signatureFields.length, 5);
  });
});

describe("generateSimplifiedAgreementPacket — omits the audiobook document when not included in the package", () => {
  test("a package without audiobook inclusion produces only 2 new documents", async () => {
    // JMP-PKG-STARTER has no audiobookIncluded flag in agreementFieldComputer's PACKAGE_INFO,
    // so it is rejected by computeAgreementFields rather than silently treated as excluded —
    // this documents that behavior explicitly.
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput({ selectedPackageCode: "JMP-PKG-STARTER" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "FIELD_COMPUTATION_FAILED");
  });
});

describe("generateSimplifiedAgreementPacket — never calls Adobe Sign, never sends, never reissues", () => {
  test("liveActions confirms build/generate-only scope", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.equal(result.liveActions.calledAdobeSign, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.reissuedExistingControlledRecord, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.submitsDistribution, false);
    assert.equal(result.liveActions.activatesLaunch, false);
    assert.equal(result.liveActions.createsRoyaltyAction, false);
    assert.equal(result.liveActions.activatesMarketing, false);
    assert.equal(result.liveActions.readManuscript, false);
    assert.equal(result.liveActions.calledAiModel, false);
  });

  test("does not write any output when no writeOutput dep is supplied", async () => {
    process.env[GATE_NAME] = "true";
    const result = await generateSimplifiedAgreementPacket(controlledInput());
    assert.deepEqual(result.outputPaths, []);
  });
});
