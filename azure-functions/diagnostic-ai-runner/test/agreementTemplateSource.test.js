"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  createLocalTemplateReader,
  createBlobTemplateReader,
  createGeneratedOutputBlobWriter,
  createGeneratedOutputBlobReader,
  createPublisherSignatureBlobReader,
  resolveAgreementPrepDeps,
  isUnderTemplatePrefix,
  DEFAULT_TEMPLATE_PREFIX,
  DEFAULT_PUBLISHER_SIGNATURE_BLOB_NAME
} = require("../src/agreement/agreementTemplateSource");
const { computeSha256 } = require("../src/agreement/templateHasher");

describe("createLocalTemplateReader", () => {
  test("reads a file from the given local canon path", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canon-"));
    fs.writeFileSync(path.join(dir, "Test.docx"), "fake docx content");
    const reader = createLocalTemplateReader(dir);
    const buffer = await reader("Test.docx");
    assert.equal(buffer.toString("utf8"), "fake docx content");
  });
});

describe("createBlobTemplateReader — missing-template and hash-mismatch fail safely", () => {
  test("throws TEMPLATE_MANIFEST_NOT_FOUND when no manifest exists", async () => {
    const reader = createBlobTemplateReader({ downloadBlob: async () => null });
    await assert.rejects(() => reader("JMP_Publishing_Agreement_v3.docx"), (err) => err.safeCode === "TEMPLATE_MANIFEST_NOT_FOUND");
  });

  test("throws TEMPLATE_MANIFEST_INVALID when the manifest is not valid JSON", async () => {
    const reader = createBlobTemplateReader({ downloadBlob: async () => Buffer.from("not json") });
    await assert.rejects(() => reader("x.docx"), (err) => err.safeCode === "TEMPLATE_MANIFEST_INVALID");
  });

  test("throws TEMPLATE_NOT_IN_MANIFEST when the requested file isn't listed", async () => {
    const manifest = JSON.stringify({ files: [{ name: "Other.docx", sha256: "x" }] });
    const reader = createBlobTemplateReader({ downloadBlob: async (name) => name.endsWith("manifest.json") ? Buffer.from(manifest) : null });
    await assert.rejects(() => reader("Missing.docx"), (err) => err.safeCode === "TEMPLATE_NOT_IN_MANIFEST");
  });

  test("throws TEMPLATE_BLOB_NOT_FOUND when the manifest lists the file but the blob is missing", async () => {
    const manifest = JSON.stringify({ files: [{ name: "Test.docx", sha256: "x" }] });
    const reader = createBlobTemplateReader({
      downloadBlob: async (name) => name.endsWith("manifest.json") ? Buffer.from(manifest) : null
    });
    await assert.rejects(() => reader("Test.docx"), (err) => err.safeCode === "TEMPLATE_BLOB_NOT_FOUND");
  });

  test("throws TEMPLATE_HASH_MISMATCH when the blob's content doesn't match the manifest's recorded hash", async () => {
    const realContent = Buffer.from("real content");
    const manifest = JSON.stringify({ files: [{ name: "Test.docx", sha256: "0".repeat(64) }] });
    const reader = createBlobTemplateReader({
      downloadBlob: async (name) => name.endsWith("manifest.json") ? Buffer.from(manifest) : realContent
    });
    await assert.rejects(() => reader("Test.docx"), (err) => err.safeCode === "TEMPLATE_HASH_MISMATCH");
  });

  test("returns the blob content when the hash matches the manifest", async () => {
    const realContent = Buffer.from("real content");
    const correctHash = computeSha256(realContent);
    const manifest = JSON.stringify({ files: [{ name: "Test.docx", sha256: correctHash }] });
    const reader = createBlobTemplateReader({
      downloadBlob: async (name) => name.endsWith("manifest.json") ? Buffer.from(manifest) : realContent
    });
    const result = await reader("Test.docx");
    assert.equal(result, realContent);
  });
});

describe("createGeneratedOutputBlobWriter — path separation", () => {
  test("writes under generated-agreements/{diagnosticId}/, not the template path", async () => {
    let capturedBlobName = null;
    const writer = createGeneratedOutputBlobWriter({
      diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
      uploadBlob: async (name) => { capturedBlobName = name; return `https://blob/${name}`; }
    });
    await writer("Filled.docx", Buffer.from("x"));
    assert.equal(capturedBlobName, "generated-agreements/64e387e0-7e6a-f111-a826-00224820105b/Filled.docx");
  });

  test("throws DIAGNOSTIC_ID_REQUIRED_FOR_GENERATED_OUTPUT when diagnosticId is missing", () => {
    assert.throws(() => createGeneratedOutputBlobWriter({ uploadBlob: async () => {} }), (err) => err.safeCode === "DIAGNOSTIC_ID_REQUIRED_FOR_GENERATED_OUTPUT");
  });

  test("refuses to write if the resulting path would fall under the template prefix", async () => {
    const writer = createGeneratedOutputBlobWriter({
      diagnosticId: "x",
      generatedPrefix: DEFAULT_TEMPLATE_PREFIX, // deliberately misconfigured to collide
      uploadBlob: async () => {}
    });
    await assert.rejects(() => writer("Filled.docx", Buffer.from("x")), (err) => err.safeCode === "GENERATED_OUTPUT_WOULD_OVERWRITE_TEMPLATE_PATH");
  });
});

describe("createGeneratedOutputBlobReader", () => {
  test("reads back from generated-agreements/{diagnosticId}/", async () => {
    let requestedBlobName = null;
    const reader = createGeneratedOutputBlobReader({
      diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
      downloadBlob: async (name) => { requestedBlobName = name; return Buffer.from("filled content"); }
    });
    const buffer = await reader("Filled.docx");
    assert.equal(requestedBlobName, "generated-agreements/64e387e0-7e6a-f111-a826-00224820105b/Filled.docx");
    assert.equal(buffer.toString("utf8"), "filled content");
  });

  test("throws GENERATED_DOCUMENT_NOT_FOUND when the blob does not exist", async () => {
    const reader = createGeneratedOutputBlobReader({ diagnosticId: "x", downloadBlob: async () => null });
    await assert.rejects(() => reader("Missing.docx"), (err) => err.safeCode === "GENERATED_DOCUMENT_NOT_FOUND");
  });

  test("throws DIAGNOSTIC_ID_REQUIRED_FOR_GENERATED_OUTPUT when diagnosticId is missing", () => {
    assert.throws(() => createGeneratedOutputBlobReader({ downloadBlob: async () => {} }), (err) => err.safeCode === "DIAGNOSTIC_ID_REQUIRED_FOR_GENERATED_OUTPUT");
  });
});

describe("createPublisherSignatureBlobReader", () => {
  test("reads the governed publisher signature asset from the default blob path", async () => {
    let requestedBlobName = null;
    const reader = createPublisherSignatureBlobReader({
      downloadBlob: async (name) => { requestedBlobName = name; return Buffer.from("signature"); }
    });
    const buffer = await reader();
    assert.equal(requestedBlobName, DEFAULT_PUBLISHER_SIGNATURE_BLOB_NAME);
    assert.equal(buffer.toString("utf8"), "signature");
  });

  test("throws PUBLISHER_SIGNATURE_ASSET_NOT_FOUND when the asset is missing", async () => {
    const reader = createPublisherSignatureBlobReader({ downloadBlob: async () => null });
    await assert.rejects(() => reader(), (err) => err.safeCode === "PUBLISHER_SIGNATURE_ASSET_NOT_FOUND");
  });
});

describe("isUnderTemplatePrefix", () => {
  test("detects a path under the template prefix", () => {
    assert.equal(isUnderTemplatePrefix(`${DEFAULT_TEMPLATE_PREFIX}foo.docx`, DEFAULT_TEMPLATE_PREFIX), true);
  });

  test("does not flag a generated-output path", () => {
    assert.equal(isUnderTemplatePrefix("generated-agreements/abc/foo.docx", DEFAULT_TEMPLATE_PREFIX), false);
  });
});

describe("resolveAgreementPrepDeps — mode selection", () => {
  test("local mode without blobClientDeps resolves a local reader and no writer", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canon-"));
    fs.writeFileSync(path.join(dir, "Test.docx"), "local content");
    const { readTemplate, writeOutput } = resolveAgreementPrepDeps({ mode: "local", diagnosticId: "x", localCanonPath: dir });
    const buffer = await readTemplate("Test.docx");
    assert.equal(buffer.toString("utf8"), "local content");
    assert.equal(writeOutput, undefined);
  });

  test("local mode WITH blobClientDeps still writes generated output to Blob, never to the local canon folder", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canon-"));
    let capturedBlobName = null;
    const { writeOutput } = resolveAgreementPrepDeps({
      mode: "local",
      diagnosticId: "abc",
      localCanonPath: dir,
      blobClientDeps: { uploadBlob: async (name) => { capturedBlobName = name; } }
    });
    await writeOutput("Filled.docx", Buffer.from("x"));
    assert.ok(capturedBlobName.startsWith("generated-agreements/abc/"));
    assert.equal(fs.readdirSync(dir).length, 0, "local canon folder must remain untouched");
  });

  test("local mode throws LOCAL_CANON_PATH_REQUIRED when localCanonPath is missing", () => {
    assert.throws(() => resolveAgreementPrepDeps({ mode: "local", diagnosticId: "x" }), (err) => err.safeCode === "LOCAL_CANON_PATH_REQUIRED");
  });

  test("blob mode resolves a blob reader and a generated-output writer", async () => {
    const correctHash = computeSha256(Buffer.from("template content"));
    const manifest = JSON.stringify({ files: [{ name: "Test.docx", sha256: correctHash }] });
    const { readTemplate, writeOutput, readPublisherSignatureAsset } = resolveAgreementPrepDeps({
      mode: "blob",
      diagnosticId: "abc",
      blobClientDeps: {
        downloadBlob: async (name) => {
          if (name === DEFAULT_PUBLISHER_SIGNATURE_BLOB_NAME) return Buffer.from("signature");
          return name.endsWith("manifest.json") ? Buffer.from(manifest) : Buffer.from("template content");
        },
        uploadBlob: async () => {}
      }
    });
    const buffer = await readTemplate("Test.docx");
    assert.equal(buffer.toString("utf8"), "template content");
    assert.equal(typeof writeOutput, "function");
    assert.equal((await readPublisherSignatureAsset()).toString("utf8"), "signature");
  });

  test("blob mode throws BLOB_CLIENT_DEPS_REQUIRED when blobClientDeps is missing", () => {
    assert.throws(() => resolveAgreementPrepDeps({ mode: "blob", diagnosticId: "x" }), (err) => err.safeCode === "BLOB_CLIENT_DEPS_REQUIRED");
  });

  test("defaults to blob mode when no mode is explicitly given and no env override is set", () => {
    delete process.env.JM1_AGREEMENT_TEMPLATE_SOURCE;
    assert.throws(() => resolveAgreementPrepDeps({ diagnosticId: "x" }), (err) => err.safeCode === "BLOB_CLIENT_DEPS_REQUIRED");
  });
});
