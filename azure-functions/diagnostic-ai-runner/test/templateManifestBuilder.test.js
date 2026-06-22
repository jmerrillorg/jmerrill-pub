"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildTemplateStackManifest, TEMPLATE_STACK_ID, REVIEWED_APPROVED_BY } = require("../src/agreement/templateManifestBuilder");

function baseInput(overrides = {}) {
  return {
    sourceCanonPath: "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Agreements/JMP_Complete_Agreement_Stack_v1",
    files: [
      { name: "JMP_Publishing_Agreement_v3.docx", sha256: "a".repeat(64), byteLength: 100 },
      { name: "JMP_Publishing_Package_Addendum_v3.docx", sha256: "b".repeat(64), byteLength: 200 },
      { name: "JMP_Audiobook_Addendum_v3.docx", sha256: "c".repeat(64), byteLength: 300 }
    ],
    uploadedAt: "2026-06-22T10:00:00.000Z",
    targetBlobPath: "agreement-templates/JMP_Complete_Agreement_Stack_v1/",
    generatedBy: "templateMirrorRunner.js",
    environment: { storageAccount: "stjm1diagrunner", container: "publishing" },
    ...overrides
  };
}

describe("buildTemplateStackManifest — required fields", () => {
  test("includes the template stack ID and version", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.templateStackId, TEMPLATE_STACK_ID);
    assert.equal(m.templateStackId, "JMP_Complete_Agreement_Stack_v1");
    assert.equal(typeof m.version, "string");
  });

  test("includes the source canon path verbatim", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.ok(m.sourceCanonPath.includes("00_CANON/Publishing/Agreements/JMP_Complete_Agreement_Stack_v1"));
  });

  test("includes each file's name, sha256, and byte length", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.files.length, 3);
    assert.equal(m.files[0].name, "JMP_Publishing_Agreement_v3.docx");
    assert.equal(m.files[0].sha256, "a".repeat(64));
    assert.equal(m.files[0].byteLength, 100);
  });

  test("includes the uploaded timestamp", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.uploadedAt, "2026-06-22T10:00:00.000Z");
  });

  test("status is approved/runtime-copy", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.status, "approved/runtime-copy");
  });

  test("reviewed/approved by is Jackie Smith Jr.", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.reviewedApprovedBy, REVIEWED_APPROVED_BY);
    assert.equal(m.reviewedApprovedBy, "Jackie Smith Jr.");
  });

  test("explicitly notes that OneDrive canon remains source of truth", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.ok(m.canonSourceNote.toLowerCase().includes("onedrive"));
    assert.ok(m.canonSourceNote.toLowerCase().includes("source of truth"));
    assert.ok(m.canonSourceNote.toLowerCase().includes("not the canon"));
  });

  test("includes the target blob path", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.targetBlobPath, "agreement-templates/JMP_Complete_Agreement_Stack_v1/");
  });

  test("includes generatedBy and environment", () => {
    const m = buildTemplateStackManifest(baseInput());
    assert.equal(m.generatedBy, "templateMirrorRunner.js");
    assert.deepEqual(m.environment, { storageAccount: "stjm1diagrunner", container: "publishing" });
  });

  test("environment defaults to null when not supplied", () => {
    const m = buildTemplateStackManifest(baseInput({ environment: undefined }));
    assert.equal(m.environment, null);
  });
});
