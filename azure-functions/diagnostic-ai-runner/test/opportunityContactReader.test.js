"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { readOpportunityAuthorContact, OPPORTUNITY_ID_PATTERN } = require("../src/dataverse/opportunityContactReader");

const originalFetch = global.fetch;
const originalEnv = {
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

beforeEach(() => {
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

function mockFetchSequence(responses) {
  let call = 0;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return response;
  };
  return calls;
}

function okContactResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        name: "Publishing Intake — Establishing Glory: The Library",
        customerid_contact: {
          fullname: "Jackie Smith Jr",
          emailaddress1: "chosen2k7@gmail.com",
          ...overrides
        }
      };
    }
  };
}

describe("readOpportunityAuthorContact — input validation (no network call)", () => {
  test("rejects a malformed Opportunity ID", async () => {
    const calls = mockFetchSequence([okContactResponse()]);
    const result = await readOpportunityAuthorContact("not-a-guid");
    assert.equal(result.ok, false);
    assert.equal(result.code, "OPPORTUNITY_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects an empty Opportunity ID", async () => {
    const result = await readOpportunityAuthorContact("");
    assert.equal(result.ok, false);
    assert.equal(result.code, "OPPORTUNITY_ID_INVALID");
  });

  test("OPPORTUNITY_ID_PATTERN matches a standard GUID", () => {
    assert.ok(OPPORTUNITY_ID_PATTERN.test(REAL_OPPORTUNITY_ID));
  });
});

describe("readOpportunityAuthorContact — config and network failure handling", () => {
  test("returns DATAVERSE_CONFIG_MISSING when env vars are absent", async () => {
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID);
    assert.equal(result.ok, false);
    assert.equal(result.code, "DATAVERSE_CONFIG_MISSING");
  });

  test("returns OPPORTUNITY_NOT_FOUND on a 404", async () => {
    mockFetchSequence([{ ok: false, status: 404, async json() { return {}; } }]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "OPPORTUNITY_NOT_FOUND");
  });

  test("returns a typed failure on a non-404 error status", async () => {
    mockFetchSequence([{ ok: false, status: 500, async json() { return {}; } }]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "DATAVERSE_READ_FAILED:500");
  });
});

describe("readOpportunityAuthorContact — successful read", () => {
  test("returns the linked Contact's name and email", async () => {
    mockFetchSequence([okContactResponse()]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.authorName, "Jackie Smith Jr");
    assert.equal(result.authorEmail, "chosen2k7@gmail.com");
    assert.equal(result.opportunityId, REAL_OPPORTUNITY_ID);
  });

  test("performs exactly one GET request, expanding customerid_contact", async () => {
    const calls = mockFetchSequence([okContactResponse()]);
    await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "GET");
    assert.ok(calls[0].url.includes(`opportunities(${REAL_OPPORTUNITY_ID})`));
    assert.ok(calls[0].url.includes("customerid_contact"));
  });

  test("lowercases the returned email address", async () => {
    mockFetchSequence([okContactResponse({ emailaddress1: "Chosen2K7@Gmail.com" })]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.authorEmail, "chosen2k7@gmail.com");
  });
});

describe("readOpportunityAuthorContact — safety rejections", () => {
  test("rejects when the Contact has no email address", async () => {
    mockFetchSequence([okContactResponse({ emailaddress1: null })]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "OPPORTUNITY_CONTACT_EMAIL_MISSING");
  });

  test("rejects a malformed email address", async () => {
    mockFetchSequence([okContactResponse({ emailaddress1: "not-an-email" })]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "OPPORTUNITY_CONTACT_EMAIL_INVALID");
  });

  test("rejects a @jmerrill.pub mailbox even if otherwise well-formed", async () => {
    mockFetchSequence([okContactResponse({ emailaddress1: "someone@jmerrill.pub" })]);
    const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
    assert.equal(result.authorEmail, null);
  });

  test("never returns an authorEmail value on any failure path", async () => {
    const failingCases = [
      [{ ok: false, status: 404, async json() { return {}; } }],
      [okContactResponse({ emailaddress1: null })],
      [okContactResponse({ emailaddress1: "bad" })],
      [okContactResponse({ emailaddress1: "x@jmerrill.pub" })]
    ];
    for (const seq of failingCases) {
      mockFetchSequence(seq);
      const result = await readOpportunityAuthorContact(REAL_OPPORTUNITY_ID, FAKE_TOKEN_DEPS);
      if (!result.ok) assert.equal(result.authorEmail, null);
    }
  });
});

describe("readOpportunityAuthorContact — module safety invariants", () => {
  test("module exports no PATCH/POST/create capability", () => {
    const mod = require("../src/dataverse/opportunityContactReader");
    const fnSource = mod.readOpportunityAuthorContact.toString();
    assert.ok(!fnSource.includes("method: \"PATCH\""));
    assert.ok(!fnSource.includes("method: \"POST\""));
    assert.equal(fnSource.includes("method: \"GET\""), true);
  });
});
