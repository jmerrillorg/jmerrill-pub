"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ARTIFACT_AUDIENCE,
  artifactAudience,
  classifyNotes,
  validateAuthorityActions
} = require("../src/editorial/editorialArtifactAudience");

test("three-layer Developmental artifacts have explicit non-overlapping audiences", () => {
  assert.equal(artifactAudience("DEVELOPMENTAL_EDITING", "Author-Review Edited Manuscript"), ARTIFACT_AUDIENCE.AUTHOR);
  assert.equal(artifactAudience("DEVELOPMENTAL_EDITING", "Developmental Editorial Review"), ARTIFACT_AUDIENCE.AUTHOR);
  assert.equal(artifactAudience("DEVELOPMENTAL_EDITING", "Clean Edited Manuscript"), ARTIFACT_AUDIENCE.INTERNAL_PRODUCTION);
  assert.equal(artifactAudience("DEVELOPMENTAL_EDITING", "Internal Evidence Manifest"), ARTIFACT_AUDIENCE.SYSTEM_EVIDENCE);
});

test("internal notes cannot cross into the author-visible projection", () => {
  const classified = classifyNotes([
    { class: "EDITOR_NOTE", message: "The transition is clearer now." },
    { class: "AUTHOR_QUESTION", message: "Would you like this example to remain here?" },
    { class: "RIGHTS_LEGAL_INTERNAL", message: "Review quotation rights internally." },
    { class: "AI_INTERNAL", message: "Provider trace retained internally." }
  ]);
  assert.equal(classified.authorVisible.length, 2);
  assert.equal(classified.internal.length, 2);
  assert.equal(classified.invalid.length, 0);
});

test("editorial actions require one of the governed authority classifications", () => {
  assert.equal(validateAuthorityActions([
    { classification: "SYSTEM_AUTHORIZED_EDIT" },
    { classification: "AUTHOR_DECISION_REQUIRED" },
    { classification: "RIGHTS_LEGAL_REVIEW_REQUIRED" }
  ]).ok, true);
  assert.equal(validateAuthorityActions([{ classification: "MODEL_DECIDES" }]).ok, false);
});
