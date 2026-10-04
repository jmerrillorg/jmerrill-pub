"use strict";
const { createHash } = require("node:crypto");
const { lock, bindSkill, DIMENSIONS, headings } = require("../../src/editorial/approvedRevisionSkill");
const policy = require("../../config/whole-stage07-approved-revision.json");
const hash = (v) => createHash("sha256").update(v).digest("hex");
function binding(sourceSha256 = policy.sourceSha256) {
  const sources = Object.fromEntries(Object.entries(policy.titleAuthorities).map(([k, v]) => [k, { ...v, version: "fixture-v1" }]));
  sources.styleGuide = { id: "JM1-PUB-Editorial-Knowledge-v1.0", version: "v1.0", sha256: hash("guide") };
  sources.authorPreferences = sources.titleRulings;
  sources.priorAuthorDecisions = { id: policy.dispositionId, version: "fixture-v1", sha256: policy.dispositionSha256 };
  return bindSkill({ skill: lock.skill, version: lock.version, sourcePackage: lock.sourcePackage,
    sourcePackageSha256: lock.sourcePackageSha256, lockSha256: hash(JSON.stringify(lock)),
    files: Object.fromEntries(Object.entries(lock.files).map(([name, sha256]) => [name, { id: `${lock.sourceRoot}/${name}`, version: sha256, sha256 }]))
  }, { ...policy, sourceSha256, sources }, "JMP-SG-CMOS");
}
function plan(editorialAuthority = binding()) {
  const edits = [], targets = [];
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const d = DIMENSIONS[i];
    for (const anchor of headings(d)) edits.push({ editId: `format-${edits.length}`, editClass: "FORMAT_PARAGRAPH", anchor,
      paragraphProperties: { spacingBefore: 240, spacingAfter: 120, keepNext: true }, authorityClass: "SYSTEM_AUTHORIZED_EDIT" });
    const anchor = `Synthetic ${d} sentence.`;
    edits.push({ editId: `checkbox-${d}`, editClass: "INSERT_TEXT", anchor, anchorScope: "PARAGRAPH",
      insertPosition: "BEFORE", proposedText: "\u2610 ", authorityClass: "SYSTEM_AUTHORIZED_EDIT" });
    targets.push({ dimension: d, paragraphIndex: i * 10, anchorSha256: hash(anchor) });
  }
  return { edits, targets, editorialAuthority };
}
function evidence() {
  const p = plan();
  return { recipe: policy.recipeVersion, sourceSha256: policy.sourceSha256, reviewSha256: hash("review"), cleanSha256: hash("clean"),
    gridCount: 8, headingFormats: 32, checkboxInsertions: 8, textRetention: "ALL_SOURCE_TEXT_PRESERVED",
    plan: p, editorialAuthority: p.editorialAuthority, planSha256: hash(JSON.stringify(p)) };
}
module.exports = { binding, plan, evidence };
