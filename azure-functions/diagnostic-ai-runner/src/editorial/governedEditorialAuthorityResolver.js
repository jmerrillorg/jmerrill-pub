"use strict";

const crypto = require("node:crypto");
const { AGENT_ID, validateAuthorityBundle } = require("./editorialAgentContract");

const AUTHORITY_LABELS = Object.freeze([
  "stageCanon", "styleGuide", "authorPreferences", "voiceProfile", "titleRulings", "priorAuthorDecisions"
]);
const TITLE_BOUND = new Set(["authorPreferences", "voiceProfile", "titleRulings", "priorAuthorDecisions"]);
const SOURCE_SYSTEMS = new Set(["DATAVERSE", "SHAREPOINT", "GOVERNED_REPO"]);

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function exactId(value) {
  return typeof value === "string" && value.trim() && value === value.trim();
}

function validAuthoritySource(row, label, input) {
  if (!row || row.id !== input.authorityRefs[label] || row.approved !== true || row.current !== true ||
      !SOURCE_SYSTEMS.has(row.sourceSystem)) fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_NOT_CURRENT_APPROVED`);
  if (TITLE_BOUND.has(label)) {
    if (row.scope !== "TITLE" || row.titleId !== input.titleId) {
      fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_TITLE_BINDING_MISMATCH`);
    }
  } else if (row.scope === "TITLE") {
    if (row.titleId !== input.titleId) fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_TITLE_BINDING_MISMATCH`);
  } else if (row.scope === "STAGE") {
    if (row.stageId !== input.stageId) fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_STAGE_BINDING_MISMATCH`);
  } else if (row.scope !== "GLOBAL") {
    fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_SCOPE_INVALID`);
  }
  if (row.stageCode && row.stageCode !== input.stageCode) {
    fail(`EDITORIAL_AUTHORITY_${label.toUpperCase()}_STAGE_CODE_MISMATCH`);
  }
  return { id: row.id, version: row.version, content: row.content, sha256: row.sha256 };
}

async function resolveGovernedEditorialAuthority(input = {}, repository = {}) {
  if (![input.titleId, input.stageId, input.stageCode, input.sourceArtifactId].every(exactId) ||
      !input.authorityRefs || !AUTHORITY_LABELS.every((label) => exactId(input.authorityRefs[label]))) {
    fail("EDITORIAL_AUTHORITY_EXACT_REFERENCES_REQUIRED");
  }
  if (typeof repository.readSourceArtifact !== "function" ||
      typeof repository.downloadSourceArtifact !== "function" ||
      typeof repository.readAuthoritySource !== "function") fail("EDITORIAL_AUTHORITY_REPOSITORY_REQUIRED");

  const sourceRecord = await repository.readSourceArtifact(input.sourceArtifactId);
  if (!sourceRecord || sourceRecord.id !== input.sourceArtifactId ||
      sourceRecord.titleId !== input.titleId || sourceRecord.currentApproved !== true ||
      !/^[a-f0-9]{64}$/i.test(sourceRecord.sha256 || "")) {
    fail("EDITORIAL_AUTHORITY_CONTROLLING_MANUSCRIPT_UNPROVEN");
  }
  const sourceBuffer = await repository.downloadSourceArtifact(sourceRecord);
  if (!Buffer.isBuffer(sourceBuffer) ||
      crypto.createHash("sha256").update(sourceBuffer).digest("hex") !== sourceRecord.sha256.toLowerCase()) {
    fail("EDITORIAL_AUTHORITY_CONTROLLING_MANUSCRIPT_CHECKSUM_MISMATCH");
  }
  const authority = {
    agentId: AGENT_ID,
    titleId: input.titleId,
    stageId: input.stageId,
    stageCode: input.stageCode,
    sourceArtifactId: input.sourceArtifactId,
    sourceSha256: sourceRecord.sha256.toLowerCase()
  };
  for (const label of AUTHORITY_LABELS) {
    const row = await repository.readAuthoritySource(input.authorityRefs[label]);
    authority[label] = validAuthoritySource(row, label, input);
  }
  const { snapshot, snapshotSha256 } = validateAuthorityBundle(authority);
  return { sourceBuffer, authority, snapshot, snapshotSha256 };
}

module.exports = { AUTHORITY_LABELS, resolveGovernedEditorialAuthority };
