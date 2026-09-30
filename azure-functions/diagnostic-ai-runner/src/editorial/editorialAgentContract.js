"use strict";

const crypto = require("node:crypto");

const AGENT_ID = "jm1-agent-pub-editorial-01";
const STAGES = new Set(["EDITORIAL_REVIEW", "DEVELOPMENTAL_EDITING", "LINE_EDITING", "COPYEDITING", "PROOFREADING"]);
const EDIT_CLASSES = new Set([
  "REPLACE_TEXT", "INSERT_TEXT", "DELETE_TEXT", "MOVE_SECTION_RECOMMENDATION",
  "EDITOR_COMMENT", "AUTHOR_QUESTION", "AUTHOR_DECISION_REQUIRED", "PUBLISHER_INTERNAL",
  "RIGHTS_LEGAL_INTERNAL", "FACT_CHECK_INTERNAL", "PRODUCTION_INTERNAL", "PROVIDER_INTERNAL",
  "SYSTEM_INTERNAL", "AI_INTERNAL", "NO_CHANGE"
]);
const AUTHORITY_CLASSES = new Set([
  "SYSTEM_AUTHORIZED_EDIT", "AUTHOR_DECISION_REQUIRED", "PUBLISHER_DECISION_REQUIRED",
  "FACT_CHECK_REQUIRED", "RIGHTS_LEGAL_REVIEW_REQUIRED"
]);
const INTERNAL_EDIT_CLASSES = new Set([
  "MOVE_SECTION_RECOMMENDATION", "NO_CHANGE", "PUBLISHER_INTERNAL", "RIGHTS_LEGAL_INTERNAL",
  "FACT_CHECK_INTERNAL", "PRODUCTION_INTERNAL", "PROVIDER_INTERNAL", "SYSTEM_INTERNAL", "AI_INTERNAL"
]);
const FORBIDDEN_EFFECT_KEYS = new Set([
  "editedManuscript", "docx", "documentBuffer", "send", "email", "stageTransition",
  "dataverseWrite", "graphUpload", "providerCall"
]);

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSource(source, label) {
  if (!source || !nonempty(source.id) || !nonempty(source.version) || !nonempty(source.content)) {
    fail(`EDITORIAL_AUTHORITY_${label}_MISSING`);
  }
  const approvalStatus = source.approvalStatus || "APPROVED";
  if (!["APPROVED", "SHADOW_REVIEW_ONLY"].includes(approvalStatus)) {
    fail(`EDITORIAL_AUTHORITY_${label}_APPROVAL_STATUS_INVALID`);
  }
  const checksum = crypto.createHash("sha256").update(source.content, "utf8").digest("hex");
  if (source.sha256 !== checksum) fail(`EDITORIAL_AUTHORITY_${label}_CHECKSUM_MISMATCH`);
  return { id: source.id, version: source.version, sha256: checksum, approvalStatus };
}

function validateAuthorityBundle(bundle) {
  if (!bundle || bundle.agentId !== AGENT_ID || !STAGES.has(bundle.stageCode)) fail("EDITORIAL_AGENT_AUTHORITY_INVALID");
  if (!nonempty(bundle.titleId) || !nonempty(bundle.stageId) || !nonempty(bundle.sourceArtifactId) ||
      !/^[a-f0-9]{64}$/i.test(bundle.sourceSha256 || "")) {
    fail("EDITORIAL_AGENT_SOURCE_BINDING_INVALID");
  }
  const sources = {};
  for (const label of ["stageCanon", "styleGuide", "authorPreferences", "voiceProfile", "titleRulings", "priorAuthorDecisions"]) {
    sources[label] = validateSource(bundle[label], label.toUpperCase());
  }
  const snapshot = {
    agentId: AGENT_ID,
    titleId: bundle.titleId,
    stageId: bundle.stageId,
    stageCode: bundle.stageCode,
    sourceArtifactId: bundle.sourceArtifactId,
    sourceSha256: bundle.sourceSha256.toLowerCase(),
    sources
  };
  return {
    snapshot,
    snapshotSha256: crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")
  };
}

function validateAgentEditPlan(result, authority) {
  const { snapshot, snapshotSha256 } = validateAuthorityBundle(authority);
  if (!result || result.agentId !== AGENT_ID || result.titleId !== snapshot.titleId ||
      result.stageId !== snapshot.stageId || result.stageCode !== snapshot.stageCode ||
      result.sourceArtifactId !== snapshot.sourceArtifactId ||
      result.sourceSha256?.toLowerCase() !== snapshot.sourceSha256 ||
      result.authoritySnapshotSha256 !== snapshotSha256) {
    fail("EDITORIAL_AGENT_OUTPUT_BINDING_MISMATCH");
  }
  if (Object.keys(result).some((key) => FORBIDDEN_EFFECT_KEYS.has(key))) fail("EDITORIAL_AGENT_OUTPUT_EFFECT_FORBIDDEN");
  if (!Array.isArray(result.edits) || !result.edits.length) fail("EDITORIAL_AGENT_STRUCTURED_PLAN_REQUIRED");
  const ids = new Set();
  for (const edit of result.edits) {
    if (!edit || !nonempty(edit.editId) || ids.has(edit.editId) || !EDIT_CLASSES.has(edit.editClass) ||
        !AUTHORITY_CLASSES.has(edit.authorityClass)) fail("EDITORIAL_AGENT_EDIT_INVALID");
    ids.add(edit.editId);
    if (!nonempty(edit.rationale)) fail("EDITORIAL_AGENT_EDIT_RATIONALE_MISSING");
    if (typeof edit.decisionRequired !== "boolean") fail("EDITORIAL_AGENT_DECISION_FLAG_MISSING");
    if (edit.decisionRequired !== (edit.authorityClass !== "SYSTEM_AUTHORIZED_EDIT")) {
      fail("EDITORIAL_AGENT_DECISION_FLAG_MISMATCH");
    }
    if (["REPLACE_TEXT", "INSERT_TEXT", "DELETE_TEXT"].includes(edit.editClass) &&
        edit.authorityClass !== "SYSTEM_AUTHORIZED_EDIT") fail("EDITORIAL_AGENT_EDIT_AUTHORITY_DENIED");
    if (["REPLACE_TEXT", "INSERT_TEXT", "DELETE_TEXT", "EDITOR_COMMENT", "AUTHOR_QUESTION", "AUTHOR_DECISION_REQUIRED"].includes(edit.editClass) &&
        !nonempty(edit.anchor || edit.sourceText)) fail("EDITORIAL_AGENT_EDIT_ANCHOR_MISSING");
    if (["REPLACE_TEXT", "INSERT_TEXT"].includes(edit.editClass) && !nonempty(edit.proposedText)) {
      fail("EDITORIAL_AGENT_PROPOSED_TEXT_MISSING");
    }
    if (["EDITOR_COMMENT", "AUTHOR_QUESTION", "AUTHOR_DECISION_REQUIRED"].includes(edit.editClass) &&
        !nonempty(edit.commentText)) fail("EDITORIAL_AGENT_COMMENT_TEXT_MISSING");
    if (edit.authorVisibility !== (INTERNAL_EDIT_CLASSES.has(edit.editClass) ? "INTERNAL" : "AUTHOR")) {
      fail("EDITORIAL_AGENT_EDIT_VISIBILITY_INVALID");
    }
  }
  return { snapshot, snapshotSha256, edits: result.edits };
}

module.exports = { AGENT_ID, validateAuthorityBundle, validateAgentEditPlan };
