"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { createEditorialShadowEvidenceStore } = require("../src/editorial/editorialShadowEvidenceStore");

test("editorial shadow snapshot is immutable, metadata-only, and read back exactly", async () => {
  const records = new Map();
  const service = { getContainerClient: () => ({
    getBlockBlobClient: (name) => ({
      uploadData: async (bytes, options) => {
        assert.equal(options.conditions.ifNoneMatch, "*");
        assert.equal(options.metadata.retentionclass, "governed-agent-audit");
        assert.equal(records.has(name), false);
        records.set(name, bytes);
      }
    }),
    getBlobClient: (name) => ({ downloadToBuffer: async () => records.get(name) })
  }) };
  const store = createEditorialShadowEvidenceStore({ service, agentVersion: "1", executionId: "execution-1" });
  const snapshot = { agentId: "jm1-agent-pub-editorial-01", titleId: "title-1", sources: {
    voiceProfile: { id: "voice-1", approvalStatus: "SHADOW_REVIEW_ONLY" }
  } };
  const snapshotSha256 = crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  const persisted = await store.persistAuthoritySnapshot({ snapshot, snapshotSha256,
    authority: { voiceProfile: { content: "private authority text" } } });
  const readback = await store.readAuthoritySnapshot(persisted.recordId);
  assert.equal(readback.snapshotSha256, snapshotSha256);
  assert.equal(readback.executionMode, "SHADOW");
  assert.equal(readback.foundryAgentVersion, "1");
  assert.equal(readback.snapshot.sources.voiceProfile.approvalStatus, "SHADOW_REVIEW_ONLY");
  assert.equal(JSON.stringify(readback).includes("private authority text"), false);
  await assert.rejects(store.persistAuthoritySnapshot({ snapshot, snapshotSha256: "wrong" }),
    /EDITORIAL_SHADOW_SNAPSHOT_CHECKSUM_INVALID/);
});
