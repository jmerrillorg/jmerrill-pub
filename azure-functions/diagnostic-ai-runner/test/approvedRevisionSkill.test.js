"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { lock, readVerifiedSkill, assertSkillBinding, validateSkillPlan } = require("../src/editorial/approvedRevisionSkill");
const { packageCanon } = require("../scripts/package-approved-revision-canon");
const { binding, plan } = require("./fixtures/approvedRevisionSkill");
const repo = path.resolve(__dirname, "../../..");
const read = (name) => fs.readFileSync(path.join(repo, lock.sourceRoot, name));

test("custom router, manifest, developmental doctrine, bridge and knowledge are verbatim version-bound", async () => {
  const verified = await readVerifiedSkill(read);
  assert.equal(verified.skill, "jm1-publishing-editorial");
  assert.equal(verified.version, "2026-08-20-founder-corrections");
  assert.deepEqual(verified.files, binding().files);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jm1-revision-canon-"));
  try {
    await packageCanon(repo, dir);
    assert.deepEqual(await readVerifiedSkill((name) => fs.readFileSync(path.join(dir, "config/jm1-publishing-editorial", name))), verified);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every absent, stale or mismatched custom authority file denies execution without generic fallback", async () => {
  for (const target of Object.keys(lock.files)) {
    await assert.rejects(readVerifiedSkill((name) => { if (name === target) throw new Error("missing"); return read(name); }), /REVISION_CUSTOM_SKILL_MISSING/);
    await assert.rejects(readVerifiedSkill((name) => name === target ? Buffer.from("generic editorial policy") : read(name)), /REVISION_CUSTOM_SKILL_STALE_OR_MISMATCHED/);
  }
});

test("skill validation rejects absent style/project/prior decisions and altered scope, source version or stage doctrine", () => {
  for (const mutate of [
    (b) => { delete b.authority.titleStyleSheet; }, (b) => { delete b.authority.styleGuide; },
    (b) => { delete b.authority.priorAuthorDecisions; }, (b) => { delete b.authority.voiceProfile.version; },
    (b) => { b.authority.titleRulings.id = "another-title"; }, (b) => { b.version = "stale"; },
    (b) => { b.files["SKILL.md"].sha256 = "a".repeat(64); }, (b) => { b.doctrine = "EDITORIAL_REVIEW"; },
    (b) => { b.chosenStyleGuide.selection = "GENERIC_DEFAULT"; }, (b) => { b.externalSends = 1; },
    (b) => { b.authorApproval = "APPROVED"; }, (b) => { b.stageAdvancements = 1; },
    (b) => { b.hardStopDisposition = "CLEARED"; }, (b) => { b.rules = {}; }
  ]) {
    const b = structuredClone(binding()); mutate(b);
    assert.throws(() => assertSkillBinding(b), /REVISION_CUSTOM_SKILL/);
  }
});

test("skill boundaries are executable: reject rewrites, generic style, extra edits, altered targets or review closing text", () => {
  assert.equal(validateSkillPlan(plan()).edits.length, 40);
  for (const mutate of [
    (p) => { p.edits[0].editClass = "REPLACE_TEXT"; },
    (p) => { p.edits[0].paragraphProperties.spacingBefore = 300; },
    (p) => { p.edits[4].proposedText = "Editorial assessment provided by J Merrill Publishing"; },
    (p) => { p.edits[4].anchor = "Other sentence."; },
    (p) => { p.edits.push({ editClass: "DELETE_TEXT" }); },
    (p) => { p.edits[0].font = "Generic"; },
    (p) => { p.targets[0].dimension = "Other"; },
    (p) => { p.editorialAuthority.titleId = "Other"; }
  ]) {
    const p = structuredClone(plan()); mutate(p);
    assert.throws(() => validateSkillPlan(p), /REVISION_CUSTOM_SKILL/);
  }
});
