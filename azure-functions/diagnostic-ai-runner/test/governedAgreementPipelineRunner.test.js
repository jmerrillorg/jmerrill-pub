"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const JSZip = require("jszip");
const {
  AGREEMENT_TEMPLATE,
  selectAgreementTemplateForTrack
} = require("../src/agreement/governedAgreementTemplateRegistry");
const {
  GATE_NAME,
  generateGovernedAgreement
} = require("../src/agreement/governedAgreementPipelineRunner");

const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};
const originalFetch = global.fetch;

const repoRoot = path.resolve(__dirname, "../../..");

beforeEach(() => {
  process.env[GATE_NAME] = "true";
  delete process.env.DATAVERSE_WEB_API_BASE_URL;
  delete process.env.DATAVERSE_RESOURCE_URL;
  global.fetch = originalFetch;
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  global.fetch = originalFetch;
});

function validationInput(overrides = {}) {
  return {
    titleId: "INT-VALIDATION-001",
    bookTitle: "Internal Validation Title",
    authorId: "AUTHOR-VALIDATION-001",
    authorLegalName: "Validation Author",
    publishingTrack: "Hybrid",
    effectiveDate: "2026-08-05",
    territory: "World",
    correlationId: "agreement-validation-001",
    stateOfIncorporation: "Ohio",
    publisherBusinessAddress: "J Merrill Publishing business address on file",
    authorAddress: "Author address on file",
    finalTitleAndSubtitle: "Internal Validation Title",
    authorNameForSchedule: "Validation Author",
    manuscriptDeliveryRequirements: "Manuscript delivery requirements on file",
    anticipatedWordCount: "50000",
    deliveryDate: "2026-08-05",
    genreCategory: "Internal validation",
    language: "English",
    formatsAcquired: "print / ebook",
    targetPublicationDateOrWindow: "Internal validation only",
    ...overrides
  };
}

function memoryDeps({ writes = new Map(), convertDocxToPdf } = {}) {
  return {
    readTemplate: async (template) => fs.readFile(path.join(repoRoot, template.governedPath)),
    outputExists: async (name) => writes.has(name),
    writeOutput: async (name, buffer) => {
      if (writes.has(name)) throw Object.assign(new Error("duplicate"), { safeCode: "GENERATED_AGREEMENT_ALREADY_EXISTS" });
      writes.set(name, buffer);
      return `memory://governed-agreements/${name}`;
    },
    convertDocxToPdf: convertDocxToPdf || (async () => Buffer.from("%PDF-1.7\n% governed validation pdf\n")),
    getToken: async () => "fake-token"
  };
}

describe("selectAgreementTemplateForTrack", () => {
  test("selects the approved Hybrid agreement for Hybrid publishing track", () => {
    const selected = selectAgreementTemplateForTrack("Hybrid");
    assert.equal(selected.filename, "JMP_Publishing_Agreement_v1.3.1.docx");
    assert.equal(selected.version, "v1.3.1");
  });

  test("selects the approved JM Signature agreement for JM Signature publishing track", () => {
    const selected = selectAgreementTemplateForTrack("JM Signature");
    assert.equal(selected.filename, "JM_Signature_Publishing_Agreement_v1.0.docx");
    assert.equal(selected.version, "v1.0");
  });

  test("rejects tracks without an approved governed template", () => {
    assert.throws(() => selectAgreementTemplateForTrack("Unapproved Track"), (err) => err.safeCode === "AGREEMENT_TEMPLATE_SELECTION_FAILED");
  });
});

describe("generateGovernedAgreement", () => {
  test("requires the governed gate", async () => {
    delete process.env[GATE_NAME];
    const result = await generateGovernedAgreement(validationInput(), memoryDeps());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("Hybrid selects Hybrid template and produces immutable DOCX/PDF outputs", async () => {
    process.env.DATAVERSE_WEB_API_BASE_URL = "https://example.crm.dynamics.com/api/data/v9.2";
    process.env.DATAVERSE_RESOURCE_URL = "https://example.crm.dynamics.com";
    let capturedPayload = null;
    global.fetch = async (_url, options) => {
      capturedPayload = JSON.parse(options.body);
      return { ok: true, status: 200, async json() { return { jm1_executionlogid: "log-hybrid" }; } };
    };
    const writes = new Map();
    const result = await generateGovernedAgreement(validationInput(), memoryDeps({ writes }));

    assert.equal(result.ok, true);
    assert.equal(result.manifest.agreementSelected, "JMP Publishing Agreement");
    assert.equal(result.manifest.agreementVersion, "v1.3.1");
    assert.equal(result.manifest.templateFilename, AGREEMENT_TEMPLATE.HYBRID.filename);
    assert.equal(result.manifest.generatedArtifacts.length, 2);
    assert.equal([...writes.keys()].filter((name) => name.endsWith(".docx")).length, 1);
    assert.equal([...writes.keys()].filter((name) => name.endsWith(".pdf")).length, 1);
    assert.equal(result.executionLog.created, true);
    assert.equal(capturedPayload.jm1_actiontype, "GOVERNED_AGREEMENT_GENERATED");
    assert.match(capturedPayload.jm1_actiondescription, /Agreement selected: JMP Publishing Agreement v1\.3\.1/);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.requestedSignature, false);
    assert.equal(result.liveActions.activatedClientTitleAutomation, false);
  });

  test("JM Signature selects JM Signature template and preserves template version in output manifest", async () => {
    const writes = new Map();
    const result = await generateGovernedAgreement(
      validationInput({ publishingTrack: "JM Signature", correlationId: "agreement-validation-signature-001" }),
      memoryDeps({ writes })
    );

    assert.equal(result.ok, true);
    assert.equal(result.manifest.agreementSelected, "JM Signature Publishing Agreement");
    assert.equal(result.manifest.agreementVersion, "v1.0");
    assert.equal(result.manifest.templateFilename, AGREEMENT_TEMPLATE.JM_SIGNATURE.filename);
    assert.ok(result.manifest.templateSha256);
    assert.equal(result.manifest.immutableAfterExecution, true);
    assert.equal(result.manifest.authorFacingOutputSent, false);
  });

  test("fills existing bracket placeholders without requiring redesign of unresolved blanks", async () => {
    const writes = new Map();
    const result = await generateGovernedAgreement(validationInput(), memoryDeps({ writes }));
    assert.equal(result.ok, true);
    const docxName = [...writes.keys()].find((name) => name.endsWith(".docx"));
    const zip = await JSZip.loadAsync(writes.get(docxName));
    const xml = await zip.file("word/document.xml").async("string");
    assert.ok(xml.includes("Validation Author"));
    assert.ok(xml.includes("Internal Validation Title"));
    assert.ok(xml.includes("2026-08-05"));
    assert.ok(!xml.includes("[Author Legal Name]"));
    assert.ok(!xml.includes("[Book Title]"));
    assert.ok(!xml.includes("[Effective Date]"));
  });

  test("refuses duplicate generated artifacts for the same correlation", async () => {
    const writes = new Map();
    const deps = memoryDeps({ writes });
    const first = await generateGovernedAgreement(validationInput(), deps);
    const second = await generateGovernedAgreement(validationInput(), deps);
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(second.reason, "GENERATED_AGREEMENT_ALREADY_EXISTS");
  });
});
