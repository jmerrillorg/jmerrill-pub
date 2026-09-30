"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { AGENT_ID, validateAuthorityBundle, validateAgentEditPlan } = require("../src/editorial/editorialAgentContract");

function source(label) {
  const content = `Governed ${label} content for this fixture.`;
  return {
    id: `fixture-${label}`,
    version: "1.0",
    content,
    sha256: crypto.createHash("sha256").update(content).digest("hex")
  };
}

function authority(stageCode = "DEVELOPMENTAL_EDITING") {
  return {
    agentId: AGENT_ID,
    titleId: "title-1",
    stageId: "stage-7",
    stageCode,
    sourceArtifactId: "artifact-1",
    sourceSha256: "a".repeat(64),
    stageCanon: source(stageCode),
    styleGuide: source("style guide"),
    authorPreferences: source("author preferences"),
    voiceProfile: source("voice profile"),
    titleRulings: source("title rulings"),
    priorAuthorDecisions: source("prior author decisions")
  };
}

function plan(bundle) {
  return {
    agentId: AGENT_ID,
    titleId: bundle.titleId,
    stageId: bundle.stageId,
    stageCode: bundle.stageCode,
    sourceArtifactId: bundle.sourceArtifactId,
    sourceSha256: bundle.sourceSha256,
    authoritySnapshotSha256: validateAuthorityBundle(bundle).snapshotSha256,
    edits: [{
      editId: "edit-1",
      editClass: "REPLACE_TEXT",
      anchor: "This passage needs a clearer transition.",
      sourceText: "needs a clearer transition",
      proposedText: "flows more clearly",
      rationale: "Clarify the transition without changing the argument.",
      authorVisibility: "AUTHOR",
      decisionRequired: false,
      authorityClass: "SYSTEM_AUTHORIZED_EDIT"
    }]
  };
}

test("specialized editorial contract binds actual authority contents and a structured plan", () => {
  for (const stage of ["EDITORIAL_REVIEW", "DEVELOPMENTAL_EDITING", "LINE_EDITING", "COPYEDITING", "PROOFREADING"]) {
    const bundle = authority(stage);
    const validated = validateAgentEditPlan(plan(bundle), bundle);
    assert.equal(validated.snapshot.stageCode, stage);
    assert.equal(validated.snapshot.sources.authorPreferences.sha256, bundle.authorPreferences.sha256);
    assert.equal(validated.snapshot.sources.voiceProfile.sha256, bundle.voiceProfile.sha256);
  }
});

test("specialized editorial contract fails closed on missing, substituted, or changed authority", () => {
  const bundle = authority();
  delete bundle.authorPreferences.content;
  assert.throws(() => validateAuthorityBundle(bundle), /EDITORIAL_AUTHORITY_AUTHORPREFERENCES_MISSING/);
  const restored = authority();
  const candidate = plan(restored);
  restored.voiceProfile.content = "Changed after preparation";
  assert.throws(() => validateAgentEditPlan(candidate, restored), /EDITORIAL_AUTHORITY_VOICEPROFILE_CHECKSUM_MISMATCH/);
  const substituted = authority();
  candidate.titleId = "wrong-title";
  assert.throws(() => validateAgentEditPlan(candidate, substituted), /EDITORIAL_AGENT_OUTPUT_BINDING_MISMATCH/);
  candidate.titleId = substituted.titleId;
  candidate.sourceArtifactId = "wrong-artifact";
  assert.throws(() => validateAgentEditPlan(candidate, substituted), /EDITORIAL_AGENT_OUTPUT_BINDING_MISMATCH/);
});

test("specialized editorial contract rejects full-manuscript blobs and unauthorized direct edits", () => {
  const bundle = authority();
  const candidate = plan(bundle);
  candidate.editedManuscript = "Replacement document";
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_OUTPUT_EFFECT_FORBIDDEN/);
  delete candidate.editedManuscript;
  candidate.edits[0].authorityClass = "AUTHOR_DECISION_REQUIRED";
  candidate.edits[0].decisionRequired = true;
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_EDIT_AUTHORITY_DENIED/);
});

test("structured plans require a rationale, edit content, and explicit audience", () => {
  const bundle = authority();
  const candidate = plan(bundle);
  delete candidate.edits[0].rationale;
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_EDIT_RATIONALE_MISSING/);
  candidate.edits[0].rationale = "Keep the source meaning.";
  candidate.edits[0].authorVisibility = "INTERNAL";
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_EDIT_VISIBILITY_INVALID/);
  candidate.edits[0].authorVisibility = "AUTHOR";
  delete candidate.edits[0].proposedText;
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_PROPOSED_TEXT_MISSING/);
});

test("internal rights findings stay internal at the agent contract", () => {
  const bundle = authority();
  const candidate = plan(bundle);
  candidate.edits = [{
    editId: "rights-1",
    editClass: "RIGHTS_LEGAL_INTERNAL",
    authorityClass: "RIGHTS_LEGAL_REVIEW_REQUIRED",
    authorVisibility: "INTERNAL",
    decisionRequired: true,
    rationale: "Rights ownership is not yet proven.",
    commentText: "Verify permission before publication."
  }];
  assert.equal(validateAgentEditPlan(candidate, bundle).edits.length, 1);
  candidate.edits[0].authorVisibility = "AUTHOR";
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_EDIT_VISIBILITY_INVALID/);
});

test("recommendations and no-change findings cannot masquerade as author-visible edits", () => {
  const bundle = authority();
  const candidate = plan(bundle);
  candidate.edits = [{
    editId: "move-1", editClass: "MOVE_SECTION_RECOMMENDATION",
    rationale: "The author must decide whether to move the section.",
    authorityClass: "AUTHOR_DECISION_REQUIRED", authorVisibility: "AUTHOR", decisionRequired: true
  }];
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_EDIT_VISIBILITY_INVALID/);
  candidate.edits[0].authorVisibility = "INTERNAL";
  assert.equal(validateAgentEditPlan(candidate, bundle).edits.length, 1);
});

test("decision flag is explicit and agrees with the authority class", () => {
  const bundle = authority();
  const candidate = plan(bundle);
  delete candidate.edits[0].decisionRequired;
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_DECISION_FLAG_MISSING/);
  candidate.edits[0].decisionRequired = true;
  assert.throws(() => validateAgentEditPlan(candidate, bundle), /EDITORIAL_AGENT_DECISION_FLAG_MISMATCH/);
});
