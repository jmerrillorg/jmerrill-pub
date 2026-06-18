"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  createAuthorDraftDataverseClient,
  patchDataverseRecord
} = require("../src/dataverse/authorDraftPersistenceClient");
const { ENTITY_SET, AUTHOR_DRAFT_FIELD_MAP } = require("../src/author/authorDraftFieldMap");

const originalFetch = global.fetch;
const originalEnv = {
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

beforeEach(() => {
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnv.DATAVERSE_WEB_API_BASE_URL === undefined) delete process.env.DATAVERSE_WEB_API_BASE_URL;
  else process.env.DATAVERSE_WEB_API_BASE_URL = originalEnv.DATAVERSE_WEB_API_BASE_URL;
  if (originalEnv.DATAVERSE_RESOURCE_URL === undefined) delete process.env.DATAVERSE_RESOURCE_URL;
  else process.env.DATAVERSE_RESOURCE_URL = originalEnv.DATAVERSE_RESOURCE_URL;
});

describe("authorDraftPersistenceClient — Dataverse PATCH", () => {
  test("patchDataverseRecord updates the existing diagnostic row and returns safe metadata", async () => {
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            jm1pub_editorialdiagnosticid: "64e387e0-7e6a-f111-a826-00224820105b",
            "@odata.etag": "W/123"
          };
        }
      };
    };

    const payload = {
      [AUTHOR_DRAFT_FIELD_MAP.draftSendStatus]: "DRAFT_ONLY"
    };

    const result = await patchDataverseRecord(
      "https://jm1hq.crm.dynamics.com/api/data/v9.2/",
      "token-value",
      ENTITY_SET,
      "64e387e0-7e6a-f111-a826-00224820105b",
      payload
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://jm1hq.crm.dynamics.com/api/data/v9.2/jm1pub_editorialdiagnostics(64e387e0-7e6a-f111-a826-00224820105b)");
    assert.equal(calls[0].options.method, "PATCH");
    assert.equal(calls[0].options.headers.Prefer, "return=representation");
    assert.deepEqual(JSON.parse(calls[0].options.body), payload);
    assert.equal(result.dataverseRecordId, "64e387e0-7e6a-f111-a826-00224820105b");
    assert.equal(result.etag, "W/123");
  });

  test("createAuthorDraftDataverseClient requires config before live update", async () => {
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    const client = createAuthorDraftDataverseClient();

    await assert.rejects(
      () => client.persistAuthorDraft({ entitySet: ENTITY_SET, dataverseUpdatePayload: {}, diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b" }),
      /Dataverse configuration missing/
    );
  });

  test("createAuthorDraftDataverseClient rejects unexpected entity set", async () => {
    const client = createAuthorDraftDataverseClient();

    await assert.rejects(
      () => client.persistAuthorDraft({ entitySet: "jm1_opportunities", dataverseUpdatePayload: {}, diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b" }),
      /Unexpected author draft entity set/
    );
  });

  test("module exports no mail, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const clientModule = require("../src/dataverse/authorDraftPersistenceClient");
    const exportedNames = Object.keys(clientModule).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("rundiagnostic"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });
});
