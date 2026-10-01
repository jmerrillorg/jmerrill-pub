"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { AUTHORITY_LABELS, resolveGovernedEditorialAuthority } = require("../src/editorial/governedEditorialAuthorityResolver");

function fixture() {
  const sourceBuffer = Buffer.from("fixture manuscript");
  const sha256 = crypto.createHash("sha256").update(sourceBuffer).digest("hex");
  const input = {
    titleId: "title-1", stageId: "stage-1", stageCode: "DEVELOPMENTAL_EDITING", sourceArtifactId: "source-1",
    authorityRefs: Object.fromEntries(AUTHORITY_LABELS.map((label) => [label, `${label}-1`]))
  };
  const rows = Object.fromEntries(AUTHORITY_LABELS.map((label) => {
    const content = `Approved ${label} content.`;
    return [`${label}-1`, {
      id: `${label}-1`, version: "1", lastVerified: "2026-09-30T12:00:00Z", content, sha256: crypto.createHash("sha256").update(content).digest("hex"),
      approved: true, current: true, sourceSystem: "DATAVERSE",
      scope: ["stageCanon", "styleGuide"].includes(label) ? "GLOBAL" : "TITLE", titleId: "title-1"
    }];
  }));
  const repository = {
    readSourceArtifact: async () => ({ id: "source-1", titleId: "title-1", currentApproved: true, sha256 }),
    downloadSourceArtifact: async () => sourceBuffer,
    readAuthoritySource: async (id) => rows[id]
  };
  return { input, rows, repository };
}

test("resolver binds current approved manuscript bytes and every exact authority source", async () => {
  const { input, repository } = fixture();
  const resolved = await resolveGovernedEditorialAuthority(input, repository);
  assert.equal(resolved.snapshot.sourceArtifactId, "source-1");
  assert.equal(resolved.snapshot.sources.voiceProfile.id, "voiceProfile-1");
  assert.equal(resolved.sourceBuffer.toString(), "fixture manuscript");
});

test("resolver denies missing, stale, cross-title, and changed authority before agent work", async () => {
  const cases = [
    ({ rows }) => { delete rows["voiceProfile-1"]; },
    ({ rows }) => { rows["voiceProfile-1"].current = false; },
    ({ rows }) => { delete rows["titleStyleSheet-1"]; },
    ({ rows }) => { rows["authorPreferences-1"].titleId = "other-title"; },
    ({ rows }) => { rows["titleRulings-1"].content = "changed"; }
  ];
  for (const change of cases) {
    const data = fixture();
    change(data);
    await assert.rejects(resolveGovernedEditorialAuthority(data.input, data.repository), /EDITORIAL_AUTHORITY_/);
  }
});

test("resolver denies manuscript byte drift and unapproved source", async () => {
  const data = fixture();
  data.repository.downloadSourceArtifact = async () => Buffer.from("changed");
  await assert.rejects(resolveGovernedEditorialAuthority(data.input, data.repository), /CONTROLLING_MANUSCRIPT_CHECKSUM_MISMATCH/);
  const unapproved = fixture();
  unapproved.repository.readSourceArtifact = async () => ({ id: "source-1", titleId: "title-1", currentApproved: false, sha256: "a".repeat(64) });
  await assert.rejects(resolveGovernedEditorialAuthority(unapproved.input, unapproved.repository), /CONTROLLING_MANUSCRIPT_UNPROVEN/);
});

test("review-ready authority is usable only for an explicitly shadow-only resolution", async () => {
  const data = fixture();
  data.rows["voiceProfile-1"].approved = false;
  data.rows["voiceProfile-1"].reviewReady = true;
  await assert.rejects(resolveGovernedEditorialAuthority(data.input, data.repository),
    /EDITORIAL_AUTHORITY_VOICEPROFILE_NOT_CURRENT_APPROVED/);
  const resolved = await resolveGovernedEditorialAuthority({ ...data.input, shadowOnly: true }, data.repository);
  assert.equal(resolved.releaseEligible, false);
  assert.equal(resolved.authority.voiceProfile.approvalStatus, "SHADOW_REVIEW_ONLY");
  const shadowSnapshot = resolved.snapshotSha256;
  data.rows["voiceProfile-1"].approved = true;
  const approved = await resolveGovernedEditorialAuthority(data.input, data.repository);
  assert.equal(approved.releaseEligible, true);
  assert.notEqual(approved.snapshotSha256, shadowSnapshot);
  data.rows["voiceProfile-1"].approved = false;
  data.rows["voiceProfile-1"].current = false;
  await assert.rejects(resolveGovernedEditorialAuthority({ ...data.input, shadowOnly: true }, data.repository),
    /EDITORIAL_AUTHORITY_VOICEPROFILE_NOT_CURRENT_APPROVED/);
});

test("resolver binds registered title style, voice, and rulings without caller-supplied IDs", async () => {
  const data = fixture();
  data.input.titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
  data.input.stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
  for (const label of ["styleGuide", "titleStyleSheet", "voiceProfile", "titleRulings"]) delete data.input.authorityRefs[label];
  const definitions = [
    ["style-registered", "Whole - Project Style Sheet v1.0", 196650007, "titleStyleSheet"],
    ["voice-registered", "Whole - Voice Profile v1.0", 196650018, "voiceProfile"],
    ["rulings-registered", "Whole - Author Revision Rulings v1.0", 196650013, "titleRulings"]
  ];
  const content = new Map();
  const rows = definitions.map(([id, name, type, label]) => {
    const bytes = Buffer.from(`Governed ${label} content.`);
    content.set(id, bytes);
    return {
      jm1pub_editorialartifactid: id, jm1pub_editorialartifactname: name,
      jm1pub_artifacttype: type, jm1pub_artifactstatus: 196650001,
      jm1pub_iscurrentapproved: false, jm1pub_versionlabel: "v1.0-shadow-authority-review",
      jm1pub_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      jm1pub_repositorydriveid: "drive", jm1pub_repositoryitemid: id,
      jm1pub_repositorypath: `https://sharepoint.example/JM1-PUB/01_Pipeline_A-Z/07%20-%20Developmental%20Editing/Whole/${id}.md`,
      _jm1pub_titleid_value: data.input.titleId, _jm1pub_editorialstageid_value: data.input.stageId
    };
  });
  data.repository.client = { list: async () => rows };
  data.repository.downloadArtifact = async (row) => content.get(row.jm1pub_repositoryitemid);
  const guide = "Existing governed knowledge.md content.";
  data.repository.verifyKnowledgeBlob = async () => ({ reachable: true, hashMatched: true, content: guide,
    calculatedSha256: crypto.createHash("sha256").update(guide).digest("hex") });
  data.repository.readSourceArtifact = async () => ({ id: "source-1", titleId: data.input.titleId,
    currentApproved: true, sha256: crypto.createHash("sha256").update(Buffer.from("fixture manuscript")).digest("hex") });
  for (const label of ["authorPreferences", "priorAuthorDecisions"]) data.rows[`${label}-1`].titleId = data.input.titleId;
  const resolved = await resolveGovernedEditorialAuthority({ ...data.input, shadowOnly: true }, data.repository);
  assert.equal(resolved.authority.titleStyleSheet.id, "style-registered");
  assert.equal(resolved.authority.styleGuide.id, "JM1-PUB-Editorial-Knowledge-v1.0");
  assert.equal(resolved.authority.voiceProfile.id, "voice-registered");
  assert.equal(resolved.authority.titleRulings.id, "rulings-registered");
  assert.equal(resolved.releaseEligible, false);
  await assert.rejects(resolveGovernedEditorialAuthority(data.input, data.repository), /NOT_APPROVED/);
  await assert.rejects(resolveGovernedEditorialAuthority({ ...data.input, shadowOnly: true,
    authorityRefs: { ...data.input.authorityRefs, voiceProfile: "wrong-source" } }, data.repository), /REGISTERED_SOURCE_MISMATCH/);
});
