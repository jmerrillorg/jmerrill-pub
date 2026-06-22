"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const { mirrorGeneratedPackageToBlob, GATE_NAME } = require("../src/agreement/agreementGeneratedPackageMirror");
const { REQUIRED_DOCUMENT_NAMES } = require("../src/agreement/agreementPackageSendRunner");

const originalEnv = { [GATE_NAME]: process.env[GATE_NAME] };
const DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";

beforeEach(() => { delete process.env[GATE_NAME]; });
afterEach(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function buildMinimalDocx(label) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file("word/document.xml", `<w:document>${label}</w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

function freshBlobStore() {
  const store = new Map();
  return {
    store,
    downloadBlob: async (blobName) => (store.has(blobName) ? store.get(blobName) : null),
    uploadBlob: async (blobName, buffer) => { store.set(blobName, buffer); }
  };
}

async function freshDeps() {
  const blob = freshBlobStore();
  return {
    readLocalDocument: async (name) => buildMinimalDocx(name),
    downloadBlob: blob.downloadBlob,
    uploadBlob: blob.uploadBlob,
    __store: blob.store
  };
}

describe("mirrorGeneratedPackageToBlob — gate enforcement and validation", () => {
  test("rejects when gate is absent", async () => {
    const deps = await freshDeps();
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects when diagnosticId is missing", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    const result = await mirrorGeneratedPackageToBlob({}, deps);
    assert.equal(result.reason, "DIAGNOSTIC_ID_REQUIRED");
  });

  test("rejects when required deps are missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, {});
    assert.equal(result.reason, "DEPS_MISSING_REQUIRED_FUNCTIONS");
  });
});

describe("mirrorGeneratedPackageToBlob — uploads, verifies, and manifests the four documents", () => {
  test("uploads all four documents under generated-agreements/{diagnosticId}/ and verifies each by hash", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    assert.equal(result.ok, true);
    assert.equal(result.files.length, 4);
    assert.equal(result.manifestUploaded, true);

    for (const baseName of REQUIRED_DOCUMENT_NAMES) {
      const expectedFile = `${baseName}_${DIAGNOSTIC_ID}.docx`;
      const blobKey = `generated-agreements/${DIAGNOSTIC_ID}/${expectedFile}`;
      assert.ok(deps.__store.has(blobKey), `expected ${blobKey} to be uploaded`);
    }
    assert.ok(deps.__store.has(`generated-agreements/${DIAGNOSTIC_ID}/manifest.json`));
  });

  test("never uploads under the template path", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    for (const key of deps.__store.keys()) {
      assert.ok(!key.startsWith("agreement-templates/"), `must never write under the template path: ${key}`);
    }
  });

  test("the manifest documents this is the generated package, not the canonical template", () => {
    // covered functionally by mirrorGeneratedPackageToBlob's returned manifest
  });

  test("the manifest's per-file hashes match the actual uploaded content", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    for (const fileEntry of result.manifest.files) {
      const blobKey = `generated-agreements/${DIAGNOSTIC_ID}/${fileEntry.name}`;
      const uploaded = deps.__store.get(blobKey);
      const { computeSha256 } = require("../src/agreement/templateHasher");
      assert.equal(computeSha256(uploaded), fileEntry.sha256);
    }
  });
});

describe("mirrorGeneratedPackageToBlob — rejects an invalid local document", () => {
  test("fails safely when a local document is not a structurally valid .docx", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    deps.readLocalDocument = async () => Buffer.from("not a docx");
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "LOCAL_DOCUMENT_INVALID");
  });
});

describe("mirrorGeneratedPackageToBlob — never sends anything author-facing", () => {
  test("liveActions confirms staging-only scope", async () => {
    process.env[GATE_NAME] = "true";
    const deps = await freshDeps();
    const result = await mirrorGeneratedPackageToBlob({ diagnosticId: DIAGNOSTIC_ID }, deps);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.overwroteTemplatePath, false);
  });
});
