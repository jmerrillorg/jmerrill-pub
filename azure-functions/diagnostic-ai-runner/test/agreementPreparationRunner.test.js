"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const {
  prepareAgreementDocumentPackage,
  fillPublishingAgreement,
  fillPackageAddendum,
  fillAudiobookAddendum,
  buildAgreementPreparationExecutionLogPayload,
  TEMPLATE_NAME,
  GATE_NAME
} = require("../src/agreement/agreementPreparationRunner");
const { computeAgreementFields } = require("../src/agreement/agreementFieldComputer");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FORBIDDEN_TEXT = "This text must never appear in any output document or execution log.";

beforeEach(() => {
  delete process.env[GATE_NAME];
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function controlledInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    title: "Establishing Glory: The Library",
    authorLegalName: "Jackie Smith Jr.",
    imprintLabel: "J Merrill Publishing",
    officialManuscriptWordCount: 48232,
    selectedPackageCode: "JMP-PKG-PRO",
    paymentOption: "EIGHT_PAYMENTS",
    contractDate: "2026-06-22",
    ...overrides
  };
}

async function buildMinimalDocx(documentXml) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

function fakeDeps(templateXmlByName, { writes = [] } = {}) {
  return {
    getToken: async () => "fake-token",
    readTemplate: async (name) => buildMinimalDocx(templateXmlByName[name] || "<w:document/>"),
    writeOutput: async (name, buffer) => { writes.push({ name, size: buffer.length }); return `/controlled/output/${name}`; }
  };
}

function jsonOkResponse(body) {
  return { ok: true, status: 200, async json() { return body; } };
}

function mockFetchAlwaysOk(body = { jm1_executionlogid: "88888888-8888-8888-8888-888888888888" }) {
  global.fetch = async () => jsonOkResponse(body);
}

// ── fillPublishingAgreement / fillPackageAddendum / fillAudiobookAddendum ───

describe("fillPublishingAgreement", () => {
  test("fills author, title, and effective date placeholders and leaves address fields deferred", () => {
    const fields = computeAgreementFields(controlledInput());
    const xml = "<w:t>[Author Legal Name]</w:t><w:t>[Book Title]</w:t><w:t>[Effective Date]</w:t><w:t>[Address]</w:t><w:t>[City, State ZIP]</w:t>";
    const r = fillPublishingAgreement(xml, fields);
    assert.ok(r.xml.includes("Jackie Smith Jr."));
    assert.ok(r.xml.includes("Establishing Glory: The Library"));
    assert.ok(r.xml.includes("2026-06-22"));
    assert.ok(r.xml.includes("[Address]"));
    assert.ok(r.xml.includes("[City, State ZIP]"));
    assert.deepEqual(r.deferredFields, ["address", "cityStateZip"]);
    assert.equal(r.unmatchedFields.length, 0);
  });
});

describe("fillPackageAddendum", () => {
  test("fills bracket placeholders, labeled blanks, and complimentary copies scoped after the section heading", () => {
    const fields = computeAgreementFields(controlledInput());
    const xml = [
      "<w:t>[Date]</w:t><w:t>[Author Legal Name]</w:t><w:t>[Book Title]</w:t><w:t>[Contract Date]</w:t>",
      '<w:t xml:space="preserve">Selected Package: </w:t><w:t>________________________________________</w:t>',
      '<w:t xml:space="preserve">    Imprint: </w:t><w:t>______________________________</w:t>',
      '<w:t xml:space="preserve">Word Count (approx.): </w:t><w:t>_____________</w:t>',
      '<w:t xml:space="preserve">    Manuscript Deadline: </w:t><w:t>______________________________</w:t>',
      "<w:t>COMPLIMENTARY COPIES</w:t>",
      '<w:t xml:space="preserve">Paperback</w:t><w:t>_______</w:t>',
      '<w:t xml:space="preserve">Hardcover</w:t><w:t>_______</w:t>',
      '<w:t xml:space="preserve">eBook</w:t><w:t>_______</w:t>',
      "<w:t>TOTAL</w:t><w:t>$____________</w:t>"
    ].join("");
    const r = fillPackageAddendum(xml, fields);
    assert.ok(r.xml.includes("Professional Publishing Package (JMP-PKG-PRO)"));
    assert.ok(r.xml.includes("J Merrill Publishing"));
    assert.ok(r.xml.includes("48,232 (manuscript-derived)"));
    assert.ok(r.xml.includes("Manuscript received prior to agreement preparation"));
    assert.ok(r.xml.includes("$4,680.00"));
    assert.ok(!r.xml.includes("________"));
    assert.equal(r.unmatchedFields.length, 0);

    const fieldsByName = Object.fromEntries(r.filledFields.map((f) => [f.field, f.value]));
    assert.equal(fieldsByName.complimentaryPaperback, "10");
    assert.equal(fieldsByName.complimentaryHardcover, "2");
    assert.equal(fieldsByName.complimentaryEbook, "1");
  });

  test("the 3-row table's per-payment amounts are intentionally left blank, deferred to Schedule A", () => {
    const fields = computeAgreementFields(controlledInput());
    const r = fillPackageAddendum("<w:t>COMPLIMENTARY COPIES</w:t>", fields);
    assert.ok(r.deferredFields.some((d) => d.includes("Schedule A")));
  });

  test("never touches an unrelated earlier occurrence of 'Paperback'/'Hardcover' outside the complimentary-copies section", () => {
    const fields = computeAgreementFields(controlledInput());
    const xml = [
      '<w:t xml:space="preserve">Paperback format</w:t><w:t>☑</w:t>', // services table — must stay untouched
      "<w:t>COMPLIMENTARY COPIES</w:t>",
      '<w:t xml:space="preserve">Paperback</w:t><w:t>_______</w:t>'
    ].join("");
    const r = fillPackageAddendum(xml, fields);
    assert.ok(r.xml.includes("Paperback format</w:t><w:t>☑</w:t>"), "the services-table checkbox row must remain untouched");
    assert.ok(r.xml.includes(">10<"));
  });
});

describe("fillAudiobookAddendum", () => {
  test("fills bracket placeholders, defers special-notes annotation", () => {
    const fields = computeAgreementFields(controlledInput());
    const xml = "<w:t>[Date]</w:t><w:t>[Author Legal Name]</w:t><w:t>[Book Title]</w:t><w:t>[Contract Date]</w:t>";
    const r = fillAudiobookAddendum(xml, fields);
    assert.ok(r.xml.includes("Jackie Smith Jr."));
    assert.ok(r.xml.includes("Establishing Glory: The Library"));
    assert.equal(r.unmatchedFields.length, 0);
    assert.ok(r.deferredFields.some((d) => d.includes("specialNotesAnnotation")));
  });
});

// ── prepareAgreementDocumentPackage — orchestrator ───────────────────────────

describe("prepareAgreementDocumentPackage — gate enforcement and validation", () => {
  test("rejects when gate is absent", async () => {
    const result = await prepareAgreementDocumentPackage(controlledInput(), fakeDeps({}));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const result = await prepareAgreementDocumentPackage(controlledInput({ diagnosticId: "bad" }), fakeDeps({}));
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
  });

  test("rejects when readTemplate/writeOutput deps are missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await prepareAgreementDocumentPackage(controlledInput(), { getToken: async () => "fake" });
    assert.equal(result.reason, "DEPS_MISSING_READ_OR_WRITE");
  });

  test("rejects when field computation fails (e.g. unrecognized package)", async () => {
    process.env[GATE_NAME] = "true";
    const result = await prepareAgreementDocumentPackage(controlledInput({ selectedPackageCode: "NOT_REAL" }), fakeDeps({}));
    assert.equal(result.reason, "FIELD_COMPUTATION_FAILED");
  });
});

describe("prepareAgreementDocumentPackage — produces the expected document set for the controlled record", () => {
  test("Professional Package with 8 payments produces Agreement + Addendum + Audiobook Addendum + Schedule A", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const writes = [];
    const deps = fakeDeps({
      [TEMPLATE_NAME.PUBLISHING_AGREEMENT]: "<w:t>[Author Legal Name]</w:t><w:t>[Book Title]</w:t><w:t>[Effective Date]</w:t>",
      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>[Date]</w:t><w:t>COMPLIMENTARY COPIES</w:t>",
      [TEMPLATE_NAME.AUDIOBOOK_ADDENDUM]: "<w:t>[Date]</w:t>"
    }, { writes });
    const result = await prepareAgreementDocumentPackage(controlledInput(), deps);
    assert.equal(result.ok, true);
    assert.equal(result.audiobookAddendumGenerated, true);
    assert.equal(result.scheduleAGenerated, true);
    assert.equal(result.manifest.documents.length, 4);
    assert.ok(writes.some((w) => w.name.includes("Publishing_Agreement_FILLED")));
    assert.ok(writes.some((w) => w.name.includes("Publishing_Package_Addendum_FILLED")));
    assert.ok(writes.some((w) => w.name.includes("Audiobook_Addendum_FILLED")));
    assert.ok(writes.some((w) => w.name.includes("Schedule_A_Payment_Schedule")));
  });

  test("a single-payment plan does not generate a Schedule A attachment", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const deps = fakeDeps({
      [TEMPLATE_NAME.PUBLISHING_AGREEMENT]: "<w:t>[Author Legal Name]</w:t>",
      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",
      [TEMPLATE_NAME.AUDIOBOOK_ADDENDUM]: "<w:t>[Date]</w:t>"
    });
    const result = await prepareAgreementDocumentPackage(controlledInput({ paymentOption: "SINGLE" }), deps);
    assert.equal(result.ok, true);
    assert.equal(result.scheduleAGenerated, false);
    assert.equal(result.manifest.documents.length, 3);
  });
});

describe("prepareAgreementDocumentPackage — never sends, never touches the Opportunity, never starts production", () => {
  test("liveActions confirms preparation-only scope", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const deps = fakeDeps({
      [TEMPLATE_NAME.PUBLISHING_AGREEMENT]: "<w:t>[Author Legal Name]</w:t>",
      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",
      [TEMPLATE_NAME.AUDIOBOOK_ADDENDUM]: "<w:t>[Date]</w:t>"
    });
    const result = await prepareAgreementDocumentPackage(controlledInput(), deps);
    assert.equal(result.liveActions.readManuscript, false);
    assert.equal(result.liveActions.calledAiModel, false);
    assert.equal(result.liveActions.updatedOpportunity, false);
    assert.equal(result.liveActions.updatedDiagnosticRecord, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.activatesFlowD, false);
  });
});

describe("prepareAgreementDocumentPackage — never logs raw manuscript text or model output", () => {
  test("the manifest and execution log contain no manuscript content (none was ever read in this run)", async () => {
    process.env[GATE_NAME] = "true";
    let capturedLogBody = null;
    global.fetch = async (url, options) => {
      capturedLogBody = options.body;
      return jsonOkResponse({ jm1_executionlogid: "99999999-9999-9999-9999-999999999999" });
    };
    const deps = fakeDeps({
      [TEMPLATE_NAME.PUBLISHING_AGREEMENT]: `<w:t>[Author Legal Name]</w:t><w:t>${FORBIDDEN_TEXT}</w:t>`,
      [TEMPLATE_NAME.PACKAGE_ADDENDUM]: "<w:t>COMPLIMENTARY COPIES</w:t>",
      [TEMPLATE_NAME.AUDIOBOOK_ADDENDUM]: "<w:t>[Date]</w:t>"
    });
    await prepareAgreementDocumentPackage(controlledInput(), deps);
    assert.ok(!capturedLogBody.includes(FORBIDDEN_TEXT));
  });
});

// ── buildAgreementPreparationExecutionLogPayload — safety invariants ───────

describe("buildAgreementPreparationExecutionLogPayload", () => {
  function logInput() {
    const fields = computeAgreementFields(controlledInput());
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      fields,
      manifest: { documents: [{ sourceTemplate: "x" }], deferredFields: ["address"] },
      completedAt: "2026-06-22T00:00:00.000Z"
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildAgreementPreparationExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("states the audiobook addendum and Schedule A decisions", () => {
    const p = buildAgreementPreparationExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("Audiobook addendum generated: true"));
    assert.ok(p.jm1_actiondescription.includes("Schedule A attachment generated"));
  });

  test("states documents were prepared only, not sent, and no other action occurred", () => {
    const p = buildAgreementPreparationExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("prepared only"));
    assert.ok(desc.includes("not sent"));
    assert.ok(desc.includes("no contract finalized"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildAgreementPreparationExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
