"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { Document, Packer, Paragraph } = require("docx");
const { AGENT_ID, validateAuthorityBundle } = require("../src/editorial/editorialAgentContract");
const { runGovernedEditorialShadow } = require("../src/editorial/governedEditorialShadowRuntime");

function source(id) {
  const content = `Approved ${id} for the fixture.`;
  return { id, version: "1.0", content, sha256: crypto.createHash("sha256").update(content).digest("hex") };
}

async function fixture() {
  const sourceBuffer = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph("This section needs a clearer transition."),
    new Paragraph("What is the intended audience?")
  ] }] }));
  const authority = {
    agentId: AGENT_ID, titleId: "title-1", stageId: "stage-7", stageCode: "DEVELOPMENTAL_EDITING",
    sourceArtifactId: "artifact-1", sourceSha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
    stageCanon: source("stage canon"), styleGuide: source("style guide"), authorPreferences: source("author preferences"),
    voiceProfile: source("voice profile"), titleRulings: source("title rulings"), priorAuthorDecisions: source("prior decisions")
  };
  const snapshotSha256 = validateAuthorityBundle(authority).snapshotSha256;
  const plan = {
    agentId: AGENT_ID, titleId: authority.titleId, stageId: authority.stageId,
    stageCode: authority.stageCode, sourceArtifactId: authority.sourceArtifactId,
    sourceSha256: authority.sourceSha256, authoritySnapshotSha256: snapshotSha256,
    edits: [
      { editId: "edit-1", editClass: "REPLACE_TEXT", sourceText: "needs a clearer transition", proposedText: "flows with a clearer transition", rationale: "Improve reader orientation.", authorityClass: "SYSTEM_AUTHORIZED_EDIT", authorVisibility: "AUTHOR", decisionRequired: false },
      { editId: "edit-2", editClass: "AUTHOR_QUESTION", anchor: "intended audience", commentText: "Author question: Who is this section for?", rationale: "Clarify the intended reader.", authorityClass: "AUTHOR_DECISION_REQUIRED", authorVisibility: "AUTHOR", decisionRequired: true }
    ]
  };
  return { sourceBuffer, authority, plan, snapshotSha256 };
}

test("shadow output requires a persisted exact authority snapshot and a specialized agent", async () => {
  const input = await fixture();
  const calls = [];
  const result = await runGovernedEditorialShadow(input, {
    persistAuthoritySnapshot: async ({ snapshotSha256, authority }) => {
      calls.push("snapshot");
      assert.equal(authority.sourceArtifactId, "artifact-1");
      return { recordId: "snapshot-1", snapshotSha256 };
    },
    agentRuntime: { agentId: AGENT_ID, prepareEditPlan: async ({ authoritySnapshotRecordId }) => {
      calls.push("agent");
      assert.equal(authoritySnapshotRecordId, "snapshot-1");
      return input.plan;
    } }
  });
  assert.deepEqual(calls, ["snapshot", "agent"]);
  assert.equal(result.status, "SHADOW_OUTPUT_READY");
  assert.equal(result.trackedRevisionCount, 2);
  assert.equal(result.wordCommentCount, 1);
  assert.equal(result.authorCommunicationsSent, 0);
  assert.equal(result.businessStateMutations, 0);
});

test("shadow rejects missing persistence, substituted agent, and stale source before invocation", async () => {
  const input = await fixture();
  let invoked = false;
  const agentRuntime = { agentId: AGENT_ID, prepareEditPlan: async () => { invoked = true; return input.plan; } };
  await assert.rejects(runGovernedEditorialShadow(input, { agentRuntime }), /EDITORIAL_SHADOW_DURABLE_SNAPSHOT_REQUIRED/);
  await assert.rejects(runGovernedEditorialShadow(input, {
    persistAuthoritySnapshot: async () => ({ recordId: "snapshot-1", snapshotSha256: input.snapshotSha256 }),
    agentRuntime: { ...agentRuntime, agentId: "generic-diagnostic-runtime" }
  }), /EDITORIAL_SHADOW_SPECIALIZED_AGENT_REQUIRED/);
  await assert.rejects(runGovernedEditorialShadow({ ...input, sourceBuffer: Buffer.concat([input.sourceBuffer, Buffer.from("changed")]) }, {
    persistAuthoritySnapshot: async () => ({ recordId: "snapshot-1", snapshotSha256: input.snapshotSha256 }), agentRuntime
  }), /EDITORIAL_SHADOW_SOURCE_CHECKSUM_MISMATCH/);
  assert.equal(invoked, false);
});

test("shadow refuses a failed authority snapshot acknowledgement before agent work", async () => {
  const input = await fixture();
  let invoked = false;
  await assert.rejects(runGovernedEditorialShadow(input, {
    persistAuthoritySnapshot: async () => ({ recordId: "snapshot-1", snapshotSha256: "wrong" }),
    agentRuntime: { agentId: AGENT_ID, prepareEditPlan: async () => { invoked = true; return input.plan; } }
  }), /EDITORIAL_SHADOW_AUTHORITY_SNAPSHOT_NOT_PERSISTED/);
  assert.equal(invoked, false);
});
