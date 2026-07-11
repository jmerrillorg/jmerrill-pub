"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { selectStyleGuides } = require("../src/editorial/editorialGuideSelector");

describe("editorial guide selector", () => {
  test("selects CMoS + developmental + faith overlay for The Intentional Leader Volume I", () => {
    const result = selectStyleGuides({
      imprint: "J_MERRILL_PUBLISHING",
      manuscriptType: "trade_nonfiction",
      genre: "devotional",
      subgenre: "christian leadership",
      audience: "adult",
      language: "english",
      editorialStage: "developmental_editing",
      format: "devotional"
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedPrimaryGuide.id, "JMP-SG-CMOS");
    assert.deepEqual(result.companionGuideIds.sort(), ["JMP-CG-DEVELOPMENTAL-V1", "JMP-CG-FAITH-OVERLAY-V1"].sort());
    assert.equal(result.humanReviewRequired, true);
  });

  test("selects children's secondary publisher style sheet", () => {
    const result = selectStyleGuides({
      imprint: "JM_LITTLE",
      manuscriptType: "children",
      genre: "children",
      audience: "children",
      editorialStage: "copy_editing"
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedPrimaryGuide.id, "JMP-SG-CMOS");
    assert.equal(result.projectStyleSheetPolicy.required, true);
    assert.equal(result.projectStyleSheetPolicy.sheet.canonicalName, "JMP Project Style Sheet");
  });

  test("selects AMA with CMoS fallback for medical health manuscripts", () => {
    const result = selectStyleGuides({
      manuscriptType: "medical_health",
      genre: "health",
      editorialStage: "line_editing"
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedPrimaryGuide.id, "JMP-SG-AMA");
    assert.deepEqual(result.styleGuideIds, ["JMP-SG-AMA", "JMP-SG-CMOS"]);
  });

  test("fails closed on unresolved legal and technical collision", () => {
    const result = selectStyleGuides({
      manuscriptType: "legal_institutional",
      genre: "technical_scientific",
      editorialStage: "copy_editing"
    });

    assert.equal(result.ok, false);
    assert.ok(result.conflicts.includes("LEGAL_AND_TECHNICAL_STYLE_COLLISION"));
    assert.equal(result.unresolvedException, "HUMAN_REVIEW_REQUIRED");
  });

  test("fails closed when editorial stage is missing", () => {
    const result = selectStyleGuides({
      manuscriptType: "trade_nonfiction",
      genre: "memoir"
    });

    assert.equal(result.ok, false);
    assert.ok(result.conflicts.includes("EDITORIAL_STAGE_REQUIRED"));
  });

  test("selects Turabian for thesis-like humanities work", () => {
    const result = selectStyleGuides({
      manuscriptType: "academic_humanities",
      genre: "thesis",
      editorialStage: "developmental_editing"
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedPrimaryGuide.id, "JMP-SG-TURABIAN");
    assert.deepEqual(result.styleGuideIds, ["JMP-SG-TURABIAN", "JMP-SG-CMOS"]);
  });

  test("selects Harvard by default for UK-facing academic work", () => {
    const result = selectStyleGuides({
      manuscriptType: "international_academic",
      audience: "adult",
      language: "english",
      genre: "uk-facing",
      editorialStage: "copy_editing"
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedPrimaryGuide.id, "JMP-SG-HARVARD");
  });
});
