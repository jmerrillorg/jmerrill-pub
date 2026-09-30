"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require("docx");
const { AGENT_ID, validateAuthorityBundle } = require("../src/editorial/editorialAgentContract");
const { produceGovernedAuthorReviewDocx } = require("../src/editorial/governedWordEditorialProducer");

function source(id) {
  const content = `Current ${id} authority.`;
  return { id, version: "1.0", content, sha256: crypto.createHash("sha256").update(content).digest("hex") };
}

async function fixture() {
  const tables = Array.from({ length: 8 }, (_, index) => new Table({ rows: [
    new TableRow({ children: [new TableCell({ children: [new Paragraph(`Assessment ${index + 1}`)] })] })
  ] }));
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph("This transition needs more clarity."),
    new Paragraph("Please explain the intended audience."),
    ...tables
  ] }] }));
  const sourceSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const authority = {
    agentId: AGENT_ID, titleId: "title-1", stageId: "stage-7", stageCode: "DEVELOPMENTAL_EDITING", sourceArtifactId: "artifact-1", sourceSha256,
    stageCanon: source("stageCanon"), styleGuide: source("styleGuide"), authorPreferences: source("authorPreferences"),
    voiceProfile: source("voiceProfile"), titleRulings: source("titleRulings"), priorAuthorDecisions: source("priorAuthorDecisions")
  };
  const result = {
    agentId: AGENT_ID, titleId: authority.titleId, stageId: authority.stageId,
    stageCode: authority.stageCode, sourceArtifactId: authority.sourceArtifactId, sourceSha256,
    authoritySnapshotSha256: validateAuthorityBundle(authority).snapshotSha256,
    edits: [
      { editId: "edit-1", editClass: "REPLACE_TEXT", sourceText: "needs more clarity", proposedText: "would benefit from a clearer link", rationale: "Improve reader orientation.", authorityClass: "SYSTEM_AUTHORIZED_EDIT", authorVisibility: "AUTHOR", decisionRequired: false },
      { editId: "edit-2", editClass: "AUTHOR_QUESTION", anchor: "intended audience", commentText: "Author question: Is this section intended for first-time readers?", rationale: "Confirm audience before restructuring.", authorityClass: "AUTHOR_DECISION_REQUIRED", authorVisibility: "AUTHOR", decisionRequired: true },
      { editId: "edit-3", editClass: "RIGHTS_LEGAL_INTERNAL", commentText: "Check any quoted text rights.", rationale: "Rights review remains internal.", authorityClass: "RIGHTS_LEGAL_REVIEW_REQUIRED", authorVisibility: "INTERNAL", decisionRequired: true }
    ]
  };
  return { buffer, authority, result };
}

test("governed producer binds exact DOCX bytes and preserves eight source tables", async () => {
  const { buffer, authority, result } = await fixture();
  const output = await produceGovernedAuthorReviewDocx(buffer, result, authority, { timestamp: "2026-09-30T12:00:00.000Z" });
  assert.equal(output.structurePreserved, true);
  assert.equal(output.trackedRevisionCount, 2);
  assert.equal(output.wordCommentCount, 1);
  assert.equal(output.internalFindings.length, 1);
  assert.equal(output.authoritySnapshotSha256, result.authoritySnapshotSha256);
});

test("governed producer denies stale source or substituted authority before mutation", async () => {
  const { buffer, authority, result } = await fixture();
  await assert.rejects(produceGovernedAuthorReviewDocx(Buffer.concat([buffer, Buffer.from("changed")]), result, authority), /EDITORIAL_SOURCE_BYTES_AUTHORITY_MISMATCH/);
  authority.voiceProfile.content = "Altered after preparation";
  await assert.rejects(produceGovernedAuthorReviewDocx(buffer, result, authority), /EDITORIAL_AUTHORITY_VOICEPROFILE_CHECKSUM_MISMATCH/);
});
