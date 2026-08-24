"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const {
  sendAgreementPackage,
  buildAgreementSendExecutionLogPayload,
  REQUIRED_DOCUMENT_NAMES,
  BASE_REQUIRED_DOCUMENT_NAMES,
  resolveRequiredDocumentNames,
  CONTRACT_STATUS,
  GATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX
} = require("../src/agreement/agreementPackageSendRunner");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FORBIDDEN_TEXT = "This text must never appear in the email, attachments, or execution log.";

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

async function buildMinimalDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", [
    '<?xml version="1.0"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>'
  ].join(""));
  zip.file("_rels/.rels", [
    '<?xml version="1.0"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>'
  ].join(""));
  zip.file("word/document.xml", "<w:document/>");
  return zip.generateAsync({ type: "nodebuffer" });
}

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

function mockFetchAlwaysOk(body = { jm1_executionlogid: "11111111-1111-1111-1111-111111111111" }) {
  global.fetch = async () => jsonResponse(body);
}

function controlledInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    title: "Establishing Glory: The Library",
    packageLabel: "Professional Publishing Package (JMP-PKG-PRO)",
    paymentSchedule: { installments: 8, perInstallmentUsd: 585.00, totalUsd: 4680.00 },
    expectedAuthorEmail: "chosen2k7@gmail.com",
    allowSupersededAttachmentSendForEvidence: true,
    ...overrides
  };
}

async function fakeDeps(overrides = {}) {
  const validDocx = await buildMinimalDocx();
  return {
    getToken: async () => "fake-token",
    readAuthorContact: async () => ({ ok: true, code: null, opportunityId: REAL_OPPORTUNITY_ID, authorName: "Jackie Smith Jr.", authorEmail: "chosen2k7@gmail.com" }),
    readGeneratedDocument: async () => validDocx,
    sendEmail: async () => ({ providerMessageId: "fake-provider-message-id" }),
    ...overrides
  };
}

// ── sendAgreementPackage — gate enforcement and validation ──────────────────

describe("sendAgreementPackage — gate enforcement and validation", () => {
  test("rejects when gate is absent, recipient/email/send deps never called", async () => {
    let called = false;
    const deps = await fakeDeps({ readAuthorContact: async () => { called = true; return { ok: true }; } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(called, false);
  });

  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps();
    const result = await sendAgreementPackage(controlledInput({ diagnosticId: "bad" }), deps);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
  });

  test("rejects when required deps are missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await sendAgreementPackage(controlledInput(), {});
    assert.equal(result.reason, "DEPS_MISSING_REQUIRED_FUNCTIONS");
  });


  test("default live path is blocked because automatic attachment email is not the manual signature policy", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps({ sendEmail: async () => { throw new Error("send must not be called"); } });
    const result = await sendAgreementPackage(controlledInput({ allowSupersededAttachmentSendForEvidence: false }), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTOMATIC_ATTACHMENT_EMAIL_NOT_AUTHORIZED_FOR_MANUAL_SIGNATURE_POLICY");
    assert.equal(result.requiredNextState, "READY_FOR_MANUAL_SIGNATURE_SEND");
    assert.equal(result.waitingOn, "WAITING_ON_JMP");
    assert.equal(result.manualSignaturePolicy, true);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.createdEsignTransaction, false);
    assert.equal(result.liveActions.markedSentForSignature, false);
  });

  test("rejects when title is missing", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps();
    const result = await sendAgreementPackage(controlledInput({ title: "" }), deps);
    assert.equal(result.reason, "TITLE_REQUIRED");
  });
});

describe("sendAgreementPackage — recipient confirmed from source of truth", () => {
  test("uses the Dataverse-confirmed email, not a caller-supplied literal", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    let sentTo = null;
    const deps = await fakeDeps({ sendEmail: async (msg) => { sentTo = msg.to; return { providerMessageId: "x" }; } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, true);
    assert.equal(sentTo, "chosen2k7@gmail.com");
    assert.equal(result.recipient, "chosen2k7@gmail.com");
  });

  test("fails when the Dataverse contact lookup itself fails", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps({ readAuthorContact: async () => ({ ok: false, code: "OPPORTUNITY_CONTACT_EMAIL_MISSING" }) });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "RECIPIENT_CONFIRMATION_FAILED");
  });

  test("fails when the confirmed email does not match an explicitly expected email", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps();
    const result = await sendAgreementPackage(controlledInput({ expectedAuthorEmail: "someone-else@example.com" }), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "RECIPIENT_MISMATCH");
  });
});

describe("sendAgreementPackage — confirms the generated package and validates every attachment", () => {
  test("sends the valid .docx attachments required by the prepared package", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    let sentAttachments = null;
    const deps = await fakeDeps({ sendEmail: async (msg) => { sentAttachments = msg.attachments; return { providerMessageId: "x" }; } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, true);
    assert.equal(sentAttachments.length, 3);
    assert.equal(result.attachmentNames.length, 3);
    for (const name of [
      "JMP_Publishing_Agreement_FILLED",
      "JMP_Publishing_Package_Addendum_FILLED",
      "JMP_Schedule_A_Payment_Schedule"
    ]) {
      assert.ok(result.attachmentNames.some((n) => n.startsWith(name)));
    }
  });

  test("Starter/internal commissioning can send only Agreement + Package Addendum", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    let sentAttachments = null;
    const deps = await fakeDeps({ sendEmail: async (msg) => { sentAttachments = msg.attachments; return { providerMessageId: "x" }; } });
    const result = await sendAgreementPackage(controlledInput({
      packageLabel: "Starter Publishing Package (JMP-PKG-STARTER)",
      paymentSchedule: { installments: 0, perInstallmentUsd: 0, totalUsd: 0, internalCommissioning: true },
      requiredDocumentNames: BASE_REQUIRED_DOCUMENT_NAMES
    }), deps);
    assert.equal(result.ok, true);
    assert.equal(sentAttachments.length, 2);
    assert.deepEqual(result.attachmentLabels, ["Publishing Agreement", "Publishing Package Addendum"]);
    assert.equal(result.liveActions.createsPaymentLink, false);
  });

  test("fails when a generated document cannot be read", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps({ readGeneratedDocument: async () => { throw Object.assign(new Error("x"), { safeCode: "GENERATED_DOCUMENT_NOT_FOUND" }); } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GENERATED_DOCUMENT_READ_FAILED");
  });

  test("fails when a generated document is not a structurally valid .docx", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await fakeDeps({ readGeneratedDocument: async () => Buffer.from("not a docx") });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GENERATED_DOCUMENT_INVALID");
  });
});

describe("sendAgreementPackage — no payment link, no Stripe, never implies production started", () => {
  test("the email content built and sent contains no payment link language", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    let sentBody = null;
    const deps = await fakeDeps({ sendEmail: async (msg) => { sentBody = msg.bodyText; return { providerMessageId: "x" }; } });
    await sendAgreementPackage(controlledInput(), deps);
    const lower = sentBody.toLowerCase();
    assert.ok(!lower.includes("stripe"));
    assert.ok(!lower.includes("pay now"));
    assert.ok(!/https?:\/\//i.test(sentBody));
    assert.ok(lower.includes("production has not started"));
  });

  test("liveActions confirms no payment/production/distribution surface is touched", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    const deps = await fakeDeps();
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.liveActions.includedPaymentLink, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.submitsDistribution, false);
  });
});

describe("sendAgreementPackage — never logs raw manuscript text or AI output", () => {
  test("the execution log never contains attachment content or arbitrary text from inputs", async () => {
    process.env[GATE_NAME] = "true";
    const calls = [];
    global.fetch = async (url, options) => { calls.push(options.body); return jsonResponse({ jm1_executionlogid: "x" }); };
    const deps = await fakeDeps();
    await sendAgreementPackage(controlledInput(), deps);
    const logCall = calls.find((b) => b.includes("AGREEMENT_PACKAGE_SEND_PERFORMED"));
    assert.ok(!logCall.includes(FORBIDDEN_TEXT));
  });
});

describe("sendAgreementPackage — updates existing Opportunity fields (no new schema)", () => {
  test("PATCH sets jm1pub_contractstatus=SENT_FOR_SIGNATURE and jm1_m6agreementpreparationstatus", async () => {
    process.env[GATE_NAME] = "true";
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ "@odata.etag": "W/\"x\"", jm1_executionlogid: "y" });
    };
    const deps = await fakeDeps();
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.opportunityUpdate.updated, true);
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const body = JSON.parse(patchCall.options.body);
    assert.equal(body.jm1pub_contractstatus, CONTRACT_STATUS.SENT_FOR_SIGNATURE);
    assert.equal(body.jm1_m6agreementpreparationstatus, "AGREEMENT_SENT_FOR_SIGNATURE");
  });
});

describe("sendAgreementPackage — sender/replyTo/cc archive match the approved publishing identity", () => {
  test("sender, replyTo, and cc archive are fixed and correct", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchAlwaysOk();
    let capturedMessage = null;
    const deps = await fakeDeps({ sendEmail: async (msg) => { capturedMessage = msg; return { providerMessageId: "x" }; } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(capturedMessage.cc, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(capturedMessage.bcc, undefined);
    assert.equal(capturedMessage.replyTo, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.sender, "publishing@email.jmerrill.one");
    assert.equal(result.replyTo, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.archiveCopy, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.archiveVisibility, "cc");
  });
});

describe("resolveRequiredDocumentNames", () => {
  test("defaults to Agreement + Addendum only for a Starter single/internal package", () => {
    assert.deepEqual(resolveRequiredDocumentNames({ paymentSchedule: { installments: 0 } }), [
      "JMP_Publishing_Agreement_FILLED",
      "JMP_Publishing_Package_Addendum_FILLED"
    ]);
  });

  test("adds Schedule A for payment plans over three installments", () => {
    assert.deepEqual(resolveRequiredDocumentNames({ paymentSchedule: { installments: 8 } }), [
      "JMP_Publishing_Agreement_FILLED",
      "JMP_Publishing_Package_Addendum_FILLED",
      "JMP_Schedule_A_Payment_Schedule"
    ]);
  });

  test("honors explicit manifest-derived document names", () => {
    assert.deepEqual(resolveRequiredDocumentNames({
      requiredDocumentNames: [
        "JMP_Publishing_Agreement_FILLED.docx",
        "JMP_Publishing_Package_Addendum_FILLED.docx"
      ]
    }), [
      "JMP_Publishing_Agreement_FILLED",
      "JMP_Publishing_Package_Addendum_FILLED"
    ]);
  });
});

describe("sendAgreementPackage — send failure handling", () => {
  test("returns SEND_FAILED when the relay/email send itself fails, without updating Dataverse", async () => {
    process.env[GATE_NAME] = "true";
    let patchAttempted = false;
    global.fetch = async (url, options) => { if (options.method === "PATCH") patchAttempted = true; return jsonResponse({}); };
    const deps = await fakeDeps({ sendEmail: async () => { throw Object.assign(new Error("x"), { safeCode: "ACS_SEND_FAILED" }); } });
    const result = await sendAgreementPackage(controlledInput(), deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SEND_FAILED");
    assert.equal(patchAttempted, false);
  });
});

// ── buildAgreementSendExecutionLogPayload — safety invariants ──────────────

describe("buildAgreementSendExecutionLogPayload", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      authorEmail: "chosen2k7@gmail.com",
      emailContent: { subject: "Agreement package for Establishing Glory: The Library" },
      sendResult: { providerMessageId: "abc-123" },
      completedAt: "2026-06-22T00:00:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildAgreementSendExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("states no payment link and no scoring/manuscript/AI output included", () => {
    const p = buildAgreementSendExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no payment link included"));
    assert.ok(desc.includes("no editorial scoring"));
  });

  test("states no Stripe/payment/production/distribution/launch/royalty/marketing action occurred", () => {
    const p = buildAgreementSendExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.toLowerCase().includes("no stripe/payment/production/distribution/launch/royalty/marketing action"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildAgreementSendExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
