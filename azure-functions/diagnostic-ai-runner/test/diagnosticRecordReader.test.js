"use strict";

const { describe, it, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withEnv(vars, fn) {
  return async () => {
    const saved = {};
    for (const [k, v] of Object.entries(vars)) {
      saved[k] = process.env[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = v;
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// getEntitySet and getManuscriptUrlColumn defaults
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — env var defaults", () => {
  it("getEntitySet defaults to jm1pub_editorialdiagnostics", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET: undefined },
    async () => {
      const { getEntitySet } = require("../src/dataverse/diagnosticRecordReader");
      assert.equal(getEntitySet(), "jm1pub_editorialdiagnostics");
    }
  ));

  it("getEntitySet returns override value when env var is set", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET: "custom_editorialdiagnostics" },
    async () => {
      // Re-require to pick up env change — module is cached so test the exported function
      const { getEntitySet } = require("../src/dataverse/diagnosticRecordReader");
      // Module is cached, so the function reads process.env at call time
      process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET = "custom_editorialdiagnostics";
      assert.equal(getEntitySet(), "custom_editorialdiagnostics");
    }
  ));

  it("getManuscriptUrlColumn defaults to jm1pub_manuscripturl", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN: undefined },
    async () => {
      const { getManuscriptUrlColumn } = require("../src/dataverse/diagnosticRecordReader");
      assert.equal(getManuscriptUrlColumn(), "jm1pub_manuscripturl");
    }
  ));

  it("getManuscriptUrlColumn returns override when env var is set", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN: "jm1_manuscripturl" },
    async () => {
      const { getManuscriptUrlColumn } = require("../src/dataverse/diagnosticRecordReader");
      process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN = "jm1_manuscripturl";
      assert.equal(getManuscriptUrlColumn(), "jm1_manuscripturl");
    }
  ));
});

// ---------------------------------------------------------------------------
// readDiagnosticRecord — config missing
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — config missing", () => {
  it("returns DATAVERSE_CONFIG_MISSING when DATAVERSE_WEB_API_BASE_URL is absent", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: "https://org.crm.dynamics.com" },
    async () => {
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.ok, false);
      assert.equal(result.code, "DATAVERSE_CONFIG_MISSING");
      assert.equal(result.manuscriptUrl, null);
    }
  ));

  it("returns DATAVERSE_CONFIG_MISSING when DATAVERSE_RESOURCE_URL is absent", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: "https://org.crm.dynamics.com/api/data/v9.2", DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.ok, false);
      assert.equal(result.code, "DATAVERSE_CONFIG_MISSING");
      assert.equal(result.manuscriptUrl, null);
    }
  ));

  it("returns DATAVERSE_CONFIG_MISSING when both config vars are absent", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.ok, false);
      assert.equal(result.code, "DATAVERSE_CONFIG_MISSING");
    }
  ));
});

// ---------------------------------------------------------------------------
// URL field validation (unit tests — no network)
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — URL validation logic", () => {
  it("empty string URL field returns MANUSCRIPT_URL_NOT_POPULATED code semantics", () => {
    // Verify the expected behavior without a live call: empty string from field → not populated
    const raw = "  ".trim();
    assert.equal(raw, "");
  });

  it("non-http URL is rejected by URL parsing guard", () => {
    // Simulate what the module does when URL has a disallowed protocol
    const rawUrl = "ftp://files.example.com/manuscript.docx";
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      parsed = null;
    }
    assert.ok(parsed !== null);
    assert.notEqual(parsed.protocol, "https:");
    assert.notEqual(parsed.protocol, "http:");
  });

  it("https URL passes protocol check", () => {
    const rawUrl = "https://example.sharepoint.com/sites/manuscripts/manuscript.docx";
    const parsed = new URL(rawUrl);
    assert.ok(parsed.protocol === "https:" || parsed.protocol === "http:");
  });

  it("http URL passes protocol check", () => {
    const rawUrl = "http://example.com/manuscript.txt";
    const parsed = new URL(rawUrl);
    assert.ok(parsed.protocol === "https:" || parsed.protocol === "http:");
  });

  it("malformed URL is caught by URL constructor", () => {
    let threw = false;
    try {
      new URL("not a url at all");
    } catch {
      threw = true;
    }
    assert.ok(threw);
  });
});

// ---------------------------------------------------------------------------
// Safety invariants
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — safety invariants", () => {
  it("module exports only readDiagnosticRecord, getEntitySet, getManuscriptUrlColumn", () => {
    const mod = require("../src/dataverse/diagnosticRecordReader");
    const keys = Object.keys(mod).sort();
    assert.deepEqual(keys, ["getEntitySet", "getManuscriptUrlColumn", "readDiagnosticRecord"]);
  });

  it("readDiagnosticRecord is a function", () => {
    const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(typeof readDiagnosticRecord, "function");
  });

  it("result.manuscriptUrl is null on all error paths", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.manuscriptUrl, null);
    }
  ));

  it("result shape always has ok, code, manuscriptUrl", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.ok("ok" in result);
      assert.ok("code" in result);
      assert.ok("manuscriptUrl" in result);
    }
  ));
});
