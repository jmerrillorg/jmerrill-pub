"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { listCanonicalStyleGuides, PROJECT_STYLE_SHEET } = require("../src/editorial/editorialStyleGuideRegistry");
const { validateAuthorFacingProjection } = require("../src/editorial/authorFacingProjectionGuard");
const { buildProjectStyleSheetLifecycle } = require("../src/editorial/projectStyleSheetLifecycle");
const { buildReadabilityAssessment } = require("../src/editorial/readabilityPolicy");
const { buildScriptureAuthorityPolicy } = require("../src/editorial/scriptureAuthorityPolicy");
const { summarizeCorrectionCount } = require("../src/editorial/correctionCounting");

describe("editorial authority reconciliation", () => {
  test("governing roster contains only the approved 14 external guides", () => {
    const guides = listCanonicalStyleGuides();
    const ids = guides.map((guide) => guide.id);

    assert.equal(guides.length, 14);
    assert.equal(ids.includes("JMP-SG-AIP"), false);
    assert.equal(ids.includes("JMP-SG-ISO"), false);
    assert.equal(ids.includes("JMP-SG-OSCOLA"), false);
    assert.equal(ids.includes("JMP-SG-AGLC"), false);
    assert.equal(ids.includes("JMP-SG-HARVARD"), true);
    assert.equal(ids.includes("JMP-SG-TURABIAN"), true);
    assert.equal(ids.includes("JMP-SG-GPO"), true);
    assert.equal(ids.includes("JMP-SG-MHRA"), true);
    assert.equal(ids.includes("JMP-SG-OXFORD"), true);
  });

  test("project style sheet remains outside the 14-guide external roster", () => {
    assert.equal(PROJECT_STYLE_SHEET.layer, "PROJECT_STYLE_SHEET");
    assert.equal(PROJECT_STYLE_SHEET.initializationStage, "editorial_review");
  });

  test("overlay firewall rejects internal doctrine terms in author-facing payloads", () => {
    const result = validateAuthorFacingProjection({
      headline: "Faith overlay recommendation",
      body: "This doctrine applies to your package."
    });

    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === "OVERLAY_TERM"));
    assert.ok(result.issues.some((issue) => issue.code === "DOCTRINE_TERM"));
  });

  test("overlay firewall passes author-safe payloads", () => {
    const result = validateAuthorFacingProjection({
      headline: "Current Activity",
      body: "We're preparing your developmental recommendation for Volume I."
    });

    assert.equal(result.ok, true);
  });

  test("style sheet lifecycle initializes in editorial review and progresses by stage", () => {
    const lifecycle = buildProjectStyleSheetLifecycle("copy_editing");
    const active = lifecycle.find((entry) => entry.status === "active");

    assert.equal(active.stage, "copy_editing");
    assert.equal(lifecycle[0].stage, "editorial_review");
  });

  test("readability uses method-based assessment instead of hard-coded lexile", () => {
    const assessment = buildReadabilityAssessment({
      readabilityMethod: "grade_level",
      readabilityProvider: "publisher_internal",
      score: "6.8",
      assessedOn: "2026-07-11",
      vocabularyRulings: ["Preserve devotional cadence", "Prefer reader-age clarity for children"]
    });

    assert.equal(assessment.readabilityMethod, "grade_level");
    assert.equal(assessment.readabilityProvider, "publisher_internal");
    assert.equal(assessment.vocabularyRulings.length, 2);
  });

  test("scripture policy remains translation-aware with KJV baseline", () => {
    const baseline = buildScriptureAuthorityPolicy({});
    const niv = buildScriptureAuthorityPolicy({ translation: "NIV", formattingContext: "styled_output" });

    assert.equal(baseline.translation, "KJV");
    assert.equal(niv.rightsReviewRequired, true);
    assert.equal(niv.publisherDirectionRequired, true);
  });

  test("correction counting produces deterministic author-safe summary", () => {
    const summary = summarizeCorrectionCount({
      patterns: [
        { recurringRule: "comma splice", correctedInstances: 12 },
        { recurringRule: "quotation punctuation", correctedInstances: 8 }
      ],
      preservedVoice: true,
      preservedDialect: true,
      preservedCadence: true
    });

    assert.equal(summary.correctedInstances, 20);
    assert.equal(summary.recurringPatterns, 2);
    assert.equal(
      summary.authorSafeSummary,
      "We corrected 20 mechanical instances across 2 recurring editorial patterns while intentionally preserving the manuscript's voice."
    );
  });
});
