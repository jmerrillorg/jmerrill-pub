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
      id: `${label}-1`, version: "1", content, sha256: crypto.createHash("sha256").update(content).digest("hex"),
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
