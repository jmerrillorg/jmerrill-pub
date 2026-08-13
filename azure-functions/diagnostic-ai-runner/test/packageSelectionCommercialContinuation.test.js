"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  continuePackageSelectionCommercialPath,
  packageCodeFromText,
  GATE_NAME,
  EVENT_TYPE
} = require("../src/author/packageSelectionCommercialContinuation");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const diagnosticId = "48cd0d86-f595-f111-8076-6045bdd69435";
const intakeId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const contactId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const leadId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const opportunityId = "dddddddd-dddd-dddd-dddd-dddddddddddd";

function jsonResponse(body, ok = true, status = 200, entityId = "") {
  return {
    ok,
    status,
    headers: { get: (name) => (name === "OData-EntityId" ? entityId : "") },
    async json() { return body; }
  };
}

function mockFetchSequence(responses) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return next;
  };
  return calls;
}

beforeEach(() => {
  process.env[GATE_NAME] = "true";
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("package selection commercial continuation", () => {
  test("extracts governed package code from execution-log wording", () => {
    assert.equal(packageCodeFromText("selectedPackage=Starter Publishing Package (JMP-PKG-STARTER)"), "JMP-PKG-STARTER");
    assert.equal(packageCodeFromText("selectedPackage=not real"), "");
  });

  test("fails closed when the continuation gate is not open", async () => {
    delete process.env[GATE_NAME];
    const calls = mockFetchSequence([]);
    const result = await continuePackageSelectionCommercialPath({
      diagnosticId,
      intakeReferenceCode: "JMP-INT-202608-3W6Q6L",
      confirmPackageSelectionCommercialContinuation: true
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("creates and links exactly one native Opportunity after package selection evidence", async () => {
    const calls = mockFetchSequence([
      jsonResponse({
        jm1pub_editorialdiagnosticid: diagnosticId,
        _jm1pub_publishingintake_value: intakeId,
        _jm1pub_authorcontact_value: contactId,
        _jm1pub_lead_value: leadId
      }),
      jsonResponse({
        jm1_publishingintakeid: intakeId,
        jm1_intakereferencecode: "JMP-INT-202608-3W6Q6L",
        jm1_projecttitle: "'Til Death Do Us Part"
      }),
      jsonResponse({
        value: [{ jm1_executionlogid: "log-package", jm1_actiondescription: "selectedPackage=Starter Publishing Package (JMP-PKG-STARTER)" }]
      }),
      jsonResponse({ value: [] }),
      jsonResponse({ opportunityid: opportunityId }, true, 200, `https://jm1hq.crm.dynamics.com/api/data/v9.2/opportunities(${opportunityId})`),
      jsonResponse({ opportunityid: opportunityId }),
      jsonResponse({ jm1_publishingintakeid: intakeId }),
      jsonResponse({ jm1pub_editorialdiagnosticid: diagnosticId }),
      jsonResponse({ jm1_executionlogid: "log-continuation" })
    ]);

    const result = await continuePackageSelectionCommercialPath({
      diagnosticId,
      intakeReferenceCode: "JMP-INT-202608-3W6Q6L",
      correlationId: "test-correlation",
      confirmPackageSelectionCommercialContinuation: true
    }, { getToken: async () => "fake-token" });

    assert.equal(result.ok, true);
    assert.equal(result.createdOpportunity, true);
    assert.equal(result.opportunityId, opportunityId);
    assert.equal(result.selectedPackageCode, "JMP-PKG-STARTER");
    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(calls.filter((call) => call.options.method === "POST" && /\/opportunities$/.test(call.url)).length, 1);
    assert.equal(calls.some((call) => call.options.body?.includes('"jm1_Opportunity@odata.bind"')), true);
    assert.equal(calls.some((call) => call.options.body?.includes('"jm1pub_Opportunity@odata.bind"')), true);
    assert.equal(calls.some((call) => call.options.body?.includes(`"jm1_actiontype":"${EVENT_TYPE}"`)), true);
  });

  test("accepts OData-EntityId when Dataverse create omits representation body", async () => {
    const calls = mockFetchSequence([
      jsonResponse({
        jm1pub_editorialdiagnosticid: diagnosticId,
        _jm1pub_publishingintake_value: intakeId,
        _jm1pub_authorcontact_value: contactId,
        _jm1pub_lead_value: leadId
      }),
      jsonResponse({
        jm1_publishingintakeid: intakeId,
        jm1_intakereferencecode: "JMP-INT-202608-3W6Q6L",
        jm1_projecttitle: "'Til Death Do Us Part"
      }),
      jsonResponse({
        value: [{ jm1_executionlogid: "log-package", jm1_actiondescription: "selectedPackage=Starter Publishing Package (JMP-PKG-STARTER)" }]
      }),
      jsonResponse({ value: [] }),
      jsonResponse({}, true, 204, `https://jm1hq.crm.dynamics.com/api/data/v9.2/opportunities(${opportunityId})`),
      jsonResponse({ opportunityid: opportunityId }),
      jsonResponse({ jm1_publishingintakeid: intakeId }),
      jsonResponse({ jm1pub_editorialdiagnosticid: diagnosticId }),
      jsonResponse({ jm1_executionlogid: "log-continuation" })
    ]);

    const result = await continuePackageSelectionCommercialPath({
      diagnosticId,
      intakeReferenceCode: "JMP-INT-202608-3W6Q6L",
      confirmPackageSelectionCommercialContinuation: true
    }, { getToken: async () => "fake-token" });

    assert.equal(result.ok, true);
    assert.equal(result.createdOpportunity, true);
    assert.equal(result.opportunityId, opportunityId);
    assert.equal(calls.filter((call) => call.options.method === "POST" && /\/opportunities$/.test(call.url)).length, 1);
  });

  test("returns sanitized Dataverse step and message when Opportunity create fails", async () => {
    mockFetchSequence([
      jsonResponse({
        jm1pub_editorialdiagnosticid: diagnosticId,
        _jm1pub_publishingintake_value: intakeId,
        _jm1pub_authorcontact_value: contactId,
        _jm1pub_lead_value: leadId
      }),
      jsonResponse({
        jm1_publishingintakeid: intakeId,
        jm1_intakereferencecode: "JMP-INT-202608-3W6Q6L",
        jm1_projecttitle: "'Til Death Do Us Part"
      }),
      jsonResponse({
        value: [{ jm1_executionlogid: "log-package", jm1_actiondescription: "selectedPackage=Starter Publishing Package (JMP-PKG-STARTER)" }]
      }),
      jsonResponse({ value: [] }),
      jsonResponse({ error: { code: "0x80040265", message: "Service identity cannot create this Opportunity." } }, false, 400)
    ]);

    const result = await continuePackageSelectionCommercialPath({
      diagnosticId,
      intakeReferenceCode: "JMP-INT-202608-3W6Q6L",
      confirmPackageSelectionCommercialContinuation: true
    }, { getToken: async () => "fake-token" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_REQUEST_FAILED");
    assert.equal(result.step, "opportunity:create");
    assert.equal(result.dvCode, "0x80040265");
    assert.match(result.dvMessage, /Service identity cannot create/);
  });

  test("reuses an existing candidate and does not create a duplicate Opportunity", async () => {
    const calls = mockFetchSequence([
      jsonResponse({
        jm1pub_editorialdiagnosticid: diagnosticId,
        _jm1pub_publishingintake_value: intakeId,
        _jm1pub_authorcontact_value: contactId,
        _jm1pub_lead_value: leadId
      }),
      jsonResponse({
        jm1_publishingintakeid: intakeId,
        jm1_intakereferencecode: "JMP-INT-202608-3W6Q6L",
        jm1_projecttitle: "'Til Death Do Us Part"
      }),
      jsonResponse({
        value: [{ jm1_executionlogid: "log-package", jm1_actiondescription: "selectedPackage=Starter Publishing Package (JMP-PKG-STARTER)" }]
      }),
      jsonResponse({ value: [{ opportunityid: opportunityId, jm1pub_intaketrackingid: "JMP-INT-202608-3W6Q6L" }] }),
      jsonResponse({ opportunityid: opportunityId }),
      jsonResponse({ jm1_publishingintakeid: intakeId }),
      jsonResponse({ jm1pub_editorialdiagnosticid: diagnosticId }),
      jsonResponse({ jm1_executionlogid: "log-continuation" })
    ]);
    const result = await continuePackageSelectionCommercialPath({
      diagnosticId,
      intakeReferenceCode: "JMP-INT-202608-3W6Q6L",
      confirmPackageSelectionCommercialContinuation: true
    }, { getToken: async () => "fake-token" });

    assert.equal(result.ok, true);
    assert.equal(result.createdOpportunity, false);
    assert.equal(calls.filter((call) => call.options.method === "POST" && /\/opportunities$/.test(call.url)).length, 0);
  });
});
