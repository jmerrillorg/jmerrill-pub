"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  mirrorAgreementTemplateStack,
  CANONICAL_TEMPLATE_FILES,
  GATE_NAME
} = require("../src/agreement/templateMirrorRunner");
const { computeSha256 } = require("../src/agreement/templateHasher");

const originalEnv = { [GATE_NAME]: process.env[GATE_NAME] };
const SOURCE_CANON_PATH = "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Agreements/JMP_Complete_Agreement_Stack_v1";

beforeEach(() => { delete process.env[GATE_NAME]; });
afterEach(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function fakeContent(name) {
  return Buffer.from(`fake content for ${name}`);
}

function freshBlobStore() {
  const store = new Map();
  return {
    store,
    downloadBlob: async (blobName) => (store.has(blobName) ? store.get(blobName) : null),
    uploadBlob: async (blobName, buffer) => { store.set(blobName, buffer); }
  };
}

function freshDeps(overrides = {}) {
  const blob = freshBlobStore();
  return {
    readLocalCanon: async (name) => fakeContent(name),
    downloadBlob: blob.downloadBlob,
    uploadBlob: blob.uploadBlob,
    ...overrides,
    __store: blob.store
  };
}

describe("mirrorAgreementTemplateStack — gate enforcement and validation", () => {
  test("rejects when gate is absent", async () => {
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, freshDeps());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("rejects when sourceCanonPath is missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await mirrorAgreementTemplateStack({}, freshDeps());
    assert.equal(result.reason, "SOURCE_CANON_PATH_REQUIRED");
  });

  test("rejects when required deps are missing", async () => {
    process.env[GATE_NAME] = "true";
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, {});
    assert.equal(result.reason, "DEPS_MISSING_REQUIRED_FUNCTIONS");
  });
});

describe("mirrorAgreementTemplateStack — first-time upload", () => {
  test("uploads all three templates, verifies each, and uploads a matching manifest", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(result.ok, true);
    assert.equal(result.files.length, 3);
    assert.ok(result.files.every((f) => f.action === "uploaded"));
    assert.equal(result.manifestVerified, true);
    assert.equal(result.skipped.length, 0);

    for (const name of CANONICAL_TEMPLATE_FILES) {
      const expectedHash = computeSha256(fakeContent(name));
      const fileEntry = result.manifest.files.find((f) => f.name === name);
      assert.equal(fileEntry.sha256, expectedHash);
    }
  });

  test("never reads, moves, or deletes anything from the local canon beyond a read", async () => {
    process.env[GATE_NAME] = "true";
    let readCount = 0;
    const deps = freshDeps({ readLocalCanon: async (name) => { readCount += 1; return fakeContent(name); } });
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(readCount, 3);
    assert.equal(result.liveActions.movedOrDeletedLocalCanon, false);
    assert.equal(result.liveActions.readLocalCanon, true);
  });
});

describe("mirrorAgreementTemplateStack — idempotent re-run", () => {
  test("a second run with identical content skips re-upload and reports unchanged", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    const second = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(second.ok, true);
    assert.equal(second.skipped.length, 3);
    assert.ok(second.files.every((f) => f.action === "unchanged"));
    assert.equal(second.liveActions.overwroteExistingTemplate, false);
  });
});

describe("mirrorAgreementTemplateStack — does not silently overwrite a different approved version", () => {
  test("stops with EXISTING_TEMPLATE_HASH_MISMATCH when a blob exists with different content", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    // Pre-seed a different version under the same blob name.
    await deps.uploadBlob(`agreement-templates/JMP_Complete_Agreement_Stack_v1/${CANONICAL_TEMPLATE_FILES[0]}`, Buffer.from("a different, older version"));
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "EXISTING_TEMPLATE_HASH_MISMATCH");
    assert.equal(result.file, CANONICAL_TEMPLATE_FILES[0]);
    // The pre-seeded (different) content must remain untouched.
    const stillThere = await deps.downloadBlob(`agreement-templates/JMP_Complete_Agreement_Stack_v1/${CANONICAL_TEMPLATE_FILES[0]}`);
    assert.equal(stillThere.toString("utf8"), "a different, older version");
  });
});

describe("mirrorAgreementTemplateStack — upload verification failure", () => {
  test("fails safely if the read-back hash does not match what was uploaded", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    let uploadCount = 0;
    deps.uploadBlob = async (blobName, buffer) => {
      uploadCount += 1;
      // Corrupt the stored content to simulate a verification failure.
      deps.__store.set(blobName, Buffer.concat([buffer, Buffer.from("corrupted")]));
    };
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "VERIFICATION_HASH_MISMATCH");
    assert.equal(uploadCount, 1, "must stop at the first verification failure rather than continuing");
  });
});

describe("mirrorAgreementTemplateStack — manifest content", () => {
  test("the manifest documents OneDrive as the source of truth and lists the correct stack ID", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    assert.equal(result.manifest.templateStackId, "JMP_Complete_Agreement_Stack_v1");
    assert.equal(result.manifest.sourceCanonPath, SOURCE_CANON_PATH);
    assert.ok(result.manifest.canonSourceNote.toLowerCase().includes("onedrive"));
  });
});

describe("mirrorAgreementTemplateStack — never logs file contents", () => {
  test("the result and manifest never contain the fake template content", async () => {
    process.env[GATE_NAME] = "true";
    const deps = freshDeps();
    const result = await mirrorAgreementTemplateStack({ sourceCanonPath: SOURCE_CANON_PATH }, deps);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes("fake content for"));
  });
});
