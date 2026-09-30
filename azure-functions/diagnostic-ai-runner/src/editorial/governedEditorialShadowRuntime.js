"use strict";

const crypto = require("node:crypto");
const { AGENT_ID, validateAuthorityBundle, validateAgentEditPlan } = require("./editorialAgentContract");
const { createFoundryEditorialAgentRuntime } = require("./foundryEditorialAgentRuntime");
const { resolveGovernedEditorialAuthority } = require("./governedEditorialAuthorityResolver");
const { produceGovernedAuthorReviewDocx } = require("./governedWordEditorialProducer");

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

async function runGovernedEditorialShadow(input = {}, deps = {}) {
  if (!Buffer.isBuffer(input.sourceBuffer)) fail("EDITORIAL_SHADOW_SOURCE_DOCX_REQUIRED");
  const { snapshot, snapshotSha256 } = validateAuthorityBundle(input.authority);
  const sourceSha256 = crypto.createHash("sha256").update(input.sourceBuffer).digest("hex");
  if (sourceSha256 !== snapshot.sourceSha256) fail("EDITORIAL_SHADOW_SOURCE_CHECKSUM_MISMATCH");
  if (typeof deps.persistAuthoritySnapshot !== "function") fail("EDITORIAL_SHADOW_DURABLE_SNAPSHOT_REQUIRED");
  const agentRuntime = deps.agentRuntime || createFoundryEditorialAgentRuntime(deps.foundry || {});
  if (agentRuntime.agentId !== AGENT_ID ||
      typeof agentRuntime.prepareEditPlan !== "function") fail("EDITORIAL_SHADOW_SPECIALIZED_AGENT_REQUIRED");

  const persisted = await deps.persistAuthoritySnapshot({
    snapshot,
    snapshotSha256,
    authority: input.authority
  });
  if (!persisted?.recordId || persisted.snapshotSha256 !== snapshotSha256) {
    fail("EDITORIAL_SHADOW_AUTHORITY_SNAPSHOT_NOT_PERSISTED");
  }

  const plan = await agentRuntime.prepareEditPlan({
    sourceBuffer: input.sourceBuffer,
    authority: input.authority,
    authoritySnapshotRecordId: persisted.recordId,
    authoritySnapshotSha256: snapshotSha256
  });
  validateAgentEditPlan(plan, input.authority);
  const document = await produceGovernedAuthorReviewDocx(input.sourceBuffer, plan, input.authority, {
    timestamp: input.timestamp
  });
  return {
    status: "SHADOW_OUTPUT_READY",
    sourceArtifactId: snapshot.sourceArtifactId,
    sourceSha256,
    agentId: AGENT_ID,
    authoritySnapshotRecordId: persisted.recordId,
    authoritySnapshotSha256: snapshotSha256,
    outputSha256: document.outputSha256,
    trackedRevisionCount: document.trackedRevisionCount,
    wordCommentCount: document.wordCommentCount,
    structurePreserved: document.structurePreserved,
    buffer: document.buffer,
    internalFindings: document.internalFindings,
    authorCommunicationsSent: 0,
    businessStateMutations: 0
  };
}

async function runResolvedGovernedEditorialShadow(input = {}, deps = {}) {
  const resolved = await resolveGovernedEditorialAuthority(input, deps.authorityRepository);
  return runGovernedEditorialShadow({
    sourceBuffer: resolved.sourceBuffer,
    authority: resolved.authority,
    timestamp: input.timestamp
  }, deps);
}

module.exports = { runGovernedEditorialShadow, runResolvedGovernedEditorialShadow };
