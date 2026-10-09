"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { CATEGORIES, validateEditorialReview, assembleReviewPrompt } = require("../src/editorial/commissioningEditorialReviewContract");
function report() {
  return {
    intakeSummary: Object.fromEntries(["title", "sourceVersion", "genre", "audience", "draftStage", "seriesPotential", "comparables", "authorIntent", "submissionCompleteness"].map(k => [k, "UNKNOWN"]).concat([["wordCount", 1200]])),
    imprintAlignment: { imprint: "JM Signature", authority: "SUGGESTED_ONLY", rationale: "Advisory context", publisherApprovalRequired: true },
    categoryScores: Object.fromEntries(CATEGORIES.map(k => [k, 3])),
    categoryNotes: Object.fromEntries(CATEGORIES.map(k => [k, "Advisory assessment"])),
    strengths: ["One", "Two", "Three"], risks: ["One", "Two", "Three"], integrityFlags: [],
    styleGuideDetermination: { primaryGuide: "Chicago", secondaryReference: "UNKNOWN", conflicts: "UNKNOWN" },
    recommendation: { pathway: "DEVELOPMENTAL", rationale: "Advisory", forwardChecklist: ["Human review"], resubmissionEligibility: "UNKNOWN" }
  };
}
function authority() {
  return { titleId: "title", sourceSha256: "a".repeat(64), sources: ["EDITORIAL_REVIEW_CANON", "GLOBAL_EDITORIAL_KNOWLEDGE"].map(role => ({
    role, id: role, version: "v1", content: "Governed content", sha256: createHash("sha256").update("Governed content").digest("hex"),
    current: true, approved: true, scope: "GLOBAL", verifiedAt: "2026-10-09T12:00:00Z"
  })) };
}
test("assessment contract accepts nine sections and eight 1-5 scores", () => {
  const r = report(); assert.equal(validateEditorialReview(r), r);
});
test("legacy 0-10 scores and editing output are rejected", () => {
  const r = report(); r.categoryScores.VOICE_TONE = 10;
  assert.throws(() => validateEditorialReview(r), /SCORES_INVALID/);
  r.categoryScores.VOICE_TONE = 3; r.edits = [{ operation: "REPLACE" }];
  assert.throws(() => validateEditorialReview(r), /SECTIONS_INVALID/);
});
test("suggested Signature cannot silently become official assignment", () => {
  const r = report(); r.imprintAlignment.publisherApprovalRequired = false;
  assert.throws(() => validateEditorialReview(r), /APPROVAL_BOUNDARY/);
});
test("hard-stop recommendations remain advisory and cannot fast-track", () => {
  const r = report(); r.integrityFlags = [{ category: "RIGHTS", observation: "Unresolved rights", hardStop: true }];
  assert.throws(() => validateEditorialReview(r), /HARD_STOP/);
  r.recommendation.pathway = "DECLINE"; assert.equal(validateEditorialReview(r), r);
});
test("prompt binds exact source and canon hashes without creating effects", () => {
  const a = authority(); const p = assembleReviewPrompt({ titleId: "title", sourceSha256: "a".repeat(64), sourceVersion: "1", manuscript: "Untrusted content", authority: a });
  assert.equal(p.provenance.length, 2); assert.equal(p.promptSha256.length, 64);
  assert.equal(JSON.parse(p.prompt).task, "EDITORIAL_REVIEW_ASSESSMENT_ONLY");
  a.sources[0].content = "Changed";
  assert.throws(() => assembleReviewPrompt({ titleId: "title", sourceSha256: "a".repeat(64), sourceVersion: "1", manuscript: "data", authority: a }), /SOURCE_INVALID/);
});
test("cross-title authority, missing knowledge and duplicate roles fail closed", () => {
  for (const alter of [a => { a.titleId = "other"; }, a => { a.sources.pop(); }, a => { a.sources.push(a.sources[0]); }]) {
    const a = authority(); alter(a);
    assert.throws(() => assembleReviewPrompt({ titleId: "title", sourceSha256: "a".repeat(64), sourceVersion: "1", manuscript: "data", authority: a }), /REVIEW_/);
  }
});
test("untrusted editing markers cannot select an editing tool for bound review", () => {
  const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
  const route = { promptVersion: "JMP-EDITORIAL-REVIEW-ASSESSMENT-V1" };
  const prompt = "cc010_line_editing_full_manuscript_chunk_execution cc010_developmental_editing_full_manuscript_chunk_execution";
  assert.equal(provider.selectStructuredOutputTool(prompt, route).input_schema.properties?.editedManuscript, undefined);
  assert.equal(provider.selectMaxOutputTokens(prompt, route), 8192);
});
