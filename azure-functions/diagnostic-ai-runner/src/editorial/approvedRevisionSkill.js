"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const lock = require("../../config/approved-revision-editorial-canon.json");
const policy = require("../../config/whole-stage07-approved-revision.json");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const DIMENSIONS = Object.freeze(["Spiritual", "Mental", "Emotional", "Physical", "Personal", "Relational", "Financial", "Professional"]);
const headings = (dimension) => [`Characteristics of ${dimension} Wholeness`, `Signs ${dimension} Wholeness May Need Attention`,
  `Core Components of ${dimension} Wholeness`, `Practices That Build ${dimension} Wholeness`];

// These are executable applications of the cited canon, not a new prompt or a new style authority.
const RULES = Object.freeze({
  "SKILL.md#CORE_GOVERNANCE_RULES:3,7": "NO_DIAGNOSTIC_REVIEW_OR_CROSS_STAGE_REWRITE",
  "SKILL.md#CORE_GOVERNANCE_RULES:4": "PRESERVE_EXISTING_STAGE_STYLE_AND_PROJECT_STYLE_SHEET",
  "SKILL.md#CORE_GOVERNANCE_RULES:5,8": "NO_HARD_STOP_CLEARANCE_AUTHOR_APPROVAL_OR_STAGE_ADVANCEMENT",
  "SKILL.md#CORE_GOVERNANCE_RULES:6": "EXACT_PUBLISHER_DISPOSITION_REQUIRED",
  "references/developmental-editing.md": "PRESERVE_ALL_SOURCE_TEXT_VOICE_ORDER_AND_GRIDS",
  "references/developmental-pipeline-bridge.md#Governance": "NO_NEW_CANON_OR_STYLE_OVERRIDE",
  "references/knowledge.md#SECTION_3,SECTION_4": "EXISTING_STYLE_ONLY_NO_NEW_ROUTING_OR_HARD_STOP_DECISION"
});
const reference = (value) => ({ id: value.id, version: value.version, sha256: value.sha256 });

async function readVerifiedSkill(readFile = (name) => fs.readFileSync(path.join(__dirname, "../../config/jm1-publishing-editorial", name))) {
  const files = {};
  for (const [name, expected] of Object.entries(lock.files)) {
    let bytes;
    try { bytes = await readFile(name); } catch { fail("REVISION_CUSTOM_SKILL_MISSING"); }
    if ((!Buffer.isBuffer(bytes) && typeof bytes !== "string") || hash(bytes) !== expected) fail("REVISION_CUSTOM_SKILL_STALE_OR_MISMATCHED");
    files[name] = { id: `${lock.sourceRoot}/${name}`, version: expected, sha256: expected };
  }
  return { skill: lock.skill, version: lock.version, lockSha256: hash(JSON.stringify(lock)),
    sourcePackage: lock.sourcePackage, sourcePackageSha256: lock.sourcePackageSha256, files };
}

function bindSkill(canon, snapshot, selectedStyleGuide) {
  const binding = { ...canon, taskId: snapshot.taskId, titleId: snapshot.titleId, stageId: snapshot.stageId,
    doctrine: "DEVELOPMENTAL_EDITING", execution: "PUBLISHER_APPROVED_FORMATTING_ONLY",
    sourceArtifactId: snapshot.sourceArtifactId, sourceSha256: snapshot.sourceSha256,
    chosenStyleGuide: { id: selectedStyleGuide, sourceStageId: snapshot.stageId, selection: "EXISTING_GOVERNED_STAGE_NO_FALLBACK" },
    authority: Object.fromEntries(["styleGuide", "titleStyleSheet", "voiceProfile", "titleRulings", "authorPreferences", "priorAuthorDecisions"]
      .map((key) => [key, reference(snapshot.sources[key])])),
    dispositionId: snapshot.dispositionId, approvalMessageId: snapshot.approvalMessageId,
    criteriaSha256: snapshot.criteriaSha256, rules: RULES,
    outputAudience: "INTERNAL_EDITORIAL", authorApproval: "NOT_GRANTED", stageAdvancements: 0, externalSends: 0,
    hardStopDisposition: "PRESERVED_NO_CLEARANCE_OR_ROUTING", genericFallback: false };
  assertSkillBinding(binding);
  return binding;
}

function assertSkillBinding(b) {
  if (!b || b.skill !== lock.skill || b.version !== lock.version || b.lockSha256 !== hash(JSON.stringify(lock)) ||
      b.sourcePackage !== lock.sourcePackage || b.sourcePackageSha256 !== lock.sourcePackageSha256 ||
      Object.keys(b.files || {}).length !== Object.keys(lock.files).length ||
      Object.entries(lock.files).some(([name, sha]) => b.files[name]?.id !== `${lock.sourceRoot}/${name}` ||
        b.files[name]?.sha256 !== sha || b.files[name]?.version !== sha)) fail("REVISION_CUSTOM_SKILL_BINDING_REQUIRED");
  if (b.taskId !== policy.taskId || b.titleId !== policy.titleId || b.stageId !== policy.stageId ||
      b.dispositionId !== policy.dispositionId || b.approvalMessageId !== policy.approvalMessageId ||
      b.sourceArtifactId !== policy.sourceArtifactId || !/^[a-f0-9]{64}$/.test(b.sourceSha256 || "") ||
      !/^[a-f0-9]{64}$/.test(b.criteriaSha256 || "") || b.doctrine !== "DEVELOPMENTAL_EDITING" ||
      b.execution !== "PUBLISHER_APPROVED_FORMATTING_ONLY" || b.chosenStyleGuide?.id !== "JMP-SG-CMOS" ||
      b.chosenStyleGuide?.sourceStageId !== policy.stageId || b.chosenStyleGuide?.selection !== "EXISTING_GOVERNED_STAGE_NO_FALLBACK" ||
      b.genericFallback !== false || b.outputAudience !== "INTERNAL_EDITORIAL" || b.authorApproval !== "NOT_GRANTED" ||
      b.stageAdvancements !== 0 || b.externalSends !== 0 || b.hardStopDisposition !== "PRESERVED_NO_CLEARANCE_OR_ROUTING" ||
      JSON.stringify(b.rules) !== JSON.stringify(RULES)) fail("REVISION_CUSTOM_SKILL_SCOPE_MISMATCH");
  for (const key of ["styleGuide", "titleStyleSheet", "voiceProfile", "titleRulings", "authorPreferences", "priorAuthorDecisions"]) {
    const ref = b.authority?.[key];
    if (!ref?.id || !ref.version || !/^[a-f0-9]{64}$/.test(ref.sha256 || "")) fail("REVISION_CUSTOM_SKILL_AUTHORITY_MISSING");
    const id = key === "authorPreferences" ? policy.titleAuthorities.titleRulings.id :
      key === "priorAuthorDecisions" ? policy.dispositionId : policy.titleAuthorities[key]?.id;
    if (id && ref.id !== id) fail("REVISION_CUSTOM_SKILL_AUTHORITY_MISMATCH");
  }
  return b;
}

function validateSkillPlan(plan) {
  assertSkillBinding(plan?.editorialAuthority);
  if (plan.edits?.length !== 40 || plan.targets?.length !== 8) fail("REVISION_CUSTOM_SKILL_PLAN_OUT_OF_SCOPE");
  const ids = new Set();
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dimension = DIMENSIONS[i], target = plan.targets[i];
    if (target.dimension !== dimension || !Number.isSafeInteger(target.paragraphIndex) || target.paragraphIndex < 0) fail("REVISION_CUSTOM_SKILL_PLAN_OUT_OF_SCOPE");
    const group = plan.edits.slice(i * 5, i * 5 + 5);
    for (let j = 0; j < 5; j++) {
      const e = group[j];
      const expected = j < 4 ? { editId: `format-${i * 5 + j}`, editClass: "FORMAT_PARAGRAPH", anchor: headings(dimension)[j],
        paragraphProperties: { spacingBefore: 240, spacingAfter: 120, keepNext: true }, authorityClass: "SYSTEM_AUTHORIZED_EDIT" } :
        { editId: `checkbox-${dimension}`, editClass: "INSERT_TEXT", anchor: e.anchor, anchorScope: "PARAGRAPH",
          insertPosition: "BEFORE", proposedText: "\u2610 ", authorityClass: "SYSTEM_AUTHORIZED_EDIT" };
      if (JSON.stringify(e) !== JSON.stringify(expected) || ids.has(e.editId) ||
          (j === 4 && (typeof e.anchor !== "string" || hash(e.anchor) !== target.anchorSha256))) fail("REVISION_CUSTOM_SKILL_PLAN_OUT_OF_SCOPE");
      ids.add(e.editId);
    }
  }
  return plan;
}

module.exports = { lock, RULES, DIMENSIONS, headings, readVerifiedSkill, bindSkill, assertSkillBinding, validateSkillPlan };
