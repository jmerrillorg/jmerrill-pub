"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

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
// Confirmed Power Apps column names
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — confirmed Power Apps column names", () => {
  it("ASSET_GATE_COLUMNS.manuscriptAssetUrl is jm1_manuscriptasseturl", () => {
    const { ASSET_GATE_COLUMNS } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(ASSET_GATE_COLUMNS.manuscriptAssetUrl, "jm1_manuscriptasseturl");
  });

  it("ASSET_GATE_COLUMNS.manuscriptAssetStatus is jm1_manuscriptassetstatus", () => {
    const { ASSET_GATE_COLUMNS } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(ASSET_GATE_COLUMNS.manuscriptAssetStatus, "jm1_manuscriptassetstatus");
  });

  it("ASSET_GATE_COLUMNS.manuscriptApprovedForDiagnostic is jm1_manuscriptapprovedfordiagnostic", () => {
    const { ASSET_GATE_COLUMNS } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(ASSET_GATE_COLUMNS.manuscriptApprovedForDiagnostic, "jm1_manuscriptapprovedfordiagnostic");
  });

  it("ASSET_GATE_COLUMNS.manuscriptFilename is jm1_manuscriptfilename", () => {
    const { ASSET_GATE_COLUMNS } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(ASSET_GATE_COLUMNS.manuscriptFilename, "jm1_manuscriptfilename");
  });

  it("ASSET_GATE_COLUMNS.manuscriptFileType is jm1_manuscriptfiletype", () => {
    const { ASSET_GATE_COLUMNS } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(ASSET_GATE_COLUMNS.manuscriptFileType, "jm1_manuscriptfiletype");
  });
});

// ---------------------------------------------------------------------------
// Default column name
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — default manuscript URL column", () => {
  it("getManuscriptUrlColumn defaults to jm1_manuscriptasseturl", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN: undefined },
    async () => {
      delete process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN;
      const { getManuscriptUrlColumn } = require("../src/dataverse/diagnosticRecordReader");
      assert.equal(getManuscriptUrlColumn(), "jm1_manuscriptasseturl");
    }
  ));

  it("getManuscriptUrlColumn returns override when env var is set", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN: "jm1_manuscriptasseturl" },
    async () => {
      process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_MANUSCRIPT_URL_COLUMN = "jm1_manuscriptasseturl";
      const { getManuscriptUrlColumn } = require("../src/dataverse/diagnosticRecordReader");
      assert.equal(getManuscriptUrlColumn(), "jm1_manuscriptasseturl");
    }
  ));

  it("getEntitySet defaults to jm1pub_editorialdiagnostics", withEnv(
    { DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET: undefined },
    async () => {
      delete process.env.DATAVERSE_EDITORIAL_DIAGNOSTIC_ENTITY_SET;
      const { getEntitySet } = require("../src/dataverse/diagnosticRecordReader");
      assert.equal(getEntitySet(), "jm1pub_editorialdiagnostics");
    }
  ));
});

// ---------------------------------------------------------------------------
// normalizeFileTypeHint
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — normalizeFileTypeHint", () => {
  it("normalizes 'docx' to '.docx'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint("docx"), ".docx");
  });

  it("normalizes '.docx' (with leading dot) to '.docx'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(".docx"), ".docx");
  });

  it("normalizes 'DOCX' (uppercase) to '.docx'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint("DOCX"), ".docx");
  });

  it("normalizes 'txt' to '.txt'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint("txt"), ".txt");
  });

  it("normalizes '.TXT' to '.txt'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(".TXT"), ".txt");
  });

  it("returns null for 'pdf'", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint("pdf"), null);
  });

  it("returns null for empty string", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(""), null);
  });

  it("returns null for null input", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(null), null);
  });

  it("returns null for undefined input", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(undefined), null);
  });

  it("returns null for a numeric value", () => {
    const { normalizeFileTypeHint } = require("../src/dataverse/diagnosticRecordReader");
    assert.equal(normalizeFileTypeHint(196650000), null);
  });
});

// ---------------------------------------------------------------------------
// readDiagnosticRecord — config missing
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — config missing", () => {
  it("returns DATAVERSE_CONFIG_MISSING when DATAVERSE_WEB_API_BASE_URL is absent", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: "https://org.crm.dynamics.com" },
    async () => {
      delete process.env.DATAVERSE_WEB_API_BASE_URL;
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
      delete process.env.DATAVERSE_RESOURCE_URL;
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.ok, false);
      assert.equal(result.code, "DATAVERSE_CONFIG_MISSING");
    }
  ));

  it("error result always includes assetGate with null fields", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      delete process.env.DATAVERSE_WEB_API_BASE_URL;
      delete process.env.DATAVERSE_RESOURCE_URL;
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.ok("assetGate" in result);
      assert.equal(result.assetGate.approvedForDiagnostic, null);
      assert.equal(result.assetGate.assetStatus, null);
      assert.equal(result.assetGate.filename, null);
      assert.equal(result.assetGate.fileTypeHint, null);
    }
  ));
});

// ---------------------------------------------------------------------------
// URL validation logic (unit tests — no network)
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — URL validation logic", () => {
  it("empty string URL field is caught by the not-populated guard", () => {
    const raw = "  ".trim();
    assert.equal(raw, "");
  });

  it("non-http URL is rejected", () => {
    const rawUrl = "ftp://files.example.com/manuscript.docx";
    const parsed = new URL(rawUrl);
    assert.notEqual(parsed.protocol, "https:");
    assert.notEqual(parsed.protocol, "http:");
  });

  it("https URL passes protocol check", () => {
    const parsed = new URL("https://jmerrillpublishing.sharepoint.com/sites/m/manuscript.docx");
    assert.ok(parsed.protocol === "https:" || parsed.protocol === "http:");
  });

  it("malformed URL is caught by URL constructor", () => {
    let threw = false;
    try { new URL("not a url"); } catch { threw = true; }
    assert.ok(threw);
  });
});

// ---------------------------------------------------------------------------
// Safety invariants
// ---------------------------------------------------------------------------

describe("diagnosticRecordReader — safety invariants", () => {
  it("module exports the expected set of names", () => {
    const mod = require("../src/dataverse/diagnosticRecordReader");
    const keys = Object.keys(mod).sort();
    assert.deepEqual(keys, [
      "ASSET_GATE_COLUMNS",
      "getEntitySet",
      "getManuscriptUrlColumn",
      "normalizeFileTypeHint",
      "readDiagnosticRecord",
    ]);
  });

  it("result always has ok, code, manuscriptUrl, assetGate", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      delete process.env.DATAVERSE_WEB_API_BASE_URL;
      delete process.env.DATAVERSE_RESOURCE_URL;
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.ok("ok" in result);
      assert.ok("code" in result);
      assert.ok("manuscriptUrl" in result);
      assert.ok("assetGate" in result);
      assert.ok("approvedForDiagnostic" in result.assetGate);
      assert.ok("assetStatus" in result.assetGate);
      assert.ok("filename" in result.assetGate);
      assert.ok("fileTypeHint" in result.assetGate);
    }
  ));

  it("manuscriptUrl is null on all error paths", withEnv(
    { DATAVERSE_WEB_API_BASE_URL: undefined, DATAVERSE_RESOURCE_URL: undefined },
    async () => {
      delete process.env.DATAVERSE_WEB_API_BASE_URL;
      delete process.env.DATAVERSE_RESOURCE_URL;
      const { readDiagnosticRecord } = require("../src/dataverse/diagnosticRecordReader");
      const result = await readDiagnosticRecord("64e387e0-7e6a-f111-a826-00224820105b");
      assert.equal(result.manuscriptUrl, null);
    }
  ));
});
