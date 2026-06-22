"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { validateEditorialReviewSchema } = require("../src/editorial/manuscriptEditorialReviewSchemaValidator");
const { IMPRINT_CODE, FIT_DECISION, SCORE_CATEGORY, AUTHOR_FACING_FIELD } = require("../src/editorial/manuscriptEditorialReviewProvider");

function validOutput(overrides = {}) {
  return {
    jm1pub_editorialfitsummary: "Clear practical structure.",
    jm1pub_editorialriskflags: "None identified",
    [SCORE_CATEGORY.MANUSCRIPT_FIT]: 8,
    [SCORE_CATEGORY.PACKAGE_FIT]: 7,
    [SCORE_CATEGORY.IMPRINT_FIT]: 8,
    [SCORE_CATEGORY.EDITORIAL_READINESS]: 6,
    [SCORE_CATEGORY.PRODUCTION_COMPLEXITY]: 3,
    [SCORE_CATEGORY.AUDIENCE_MARKET_CLARITY]: 7,
    jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS,
    jm1pub_imprintconfidence: 0.8,
    jm1pub_fitdecision: FIT_DECISION.GOOD_FIT,
    jm1pub_signaturecandidacy: false,
    jm1pub_rightsdisclosureflag: false,
    jm1pub_requireshumanreview: false,
    [AUTHOR_FACING_FIELD.SUMMARY]: "We think the Professional Package and JM Works are a great fit for this project.",
    [AUTHOR_FACING_FIELD.STRENGTHS]: "Clear, practical structure and a confident voice throughout.",
    [AUTHOR_FACING_FIELD.SUPPORT_NEEDED]: "A developmental pass will help tighten pacing in the middle chapters.",
    [AUTHOR_FACING_FIELD.NEXT_STEPS]: "Next, we'll move forward with your package selection and agreement.",
    ...overrides
  };
}

describe("validateEditorialReviewSchema", () => {
  test("a fully valid output (including scores and author-facing fields) passes", () => {
    const r = validateEditorialReviewSchema(validOutput());
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  test("a valid output with the optional faith/mission score included also passes", () => {
    const r = validateEditorialReviewSchema(validOutput({ [SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT]: 9 }));
    assert.equal(r.valid, true);
  });

  test("null/non-object input fails", () => {
    assert.equal(validateEditorialReviewSchema(null).valid, false);
    assert.equal(validateEditorialReviewSchema("x").valid, false);
  });

  test("missing required string field fails", () => {
    const r = validateEditorialReviewSchema(validOutput({ jm1pub_editorialfitsummary: undefined }));
    assert.equal(r.valid, false);
    assert.ok(r.errors.includes("jm1pub_editorialfitsummary_MISSING_OR_NOT_STRING"));
  });

  test("string field exceeding max length fails", () => {
    const r = validateEditorialReviewSchema(validOutput({ jm1pub_editorialriskflags: "x".repeat(300) }));
    assert.ok(r.errors.includes("jm1pub_editorialriskflags_EXCEEDS_MAX_LENGTH"));
  });

  test("missing required boolean field fails", () => {
    const r = validateEditorialReviewSchema(validOutput({ jm1pub_signaturecandidacy: undefined }));
    assert.ok(r.errors.includes("jm1pub_signaturecandidacy_MISSING_OR_NOT_BOOLEAN"));
  });

  test("invalid imprint code enum fails", () => {
    const r = validateEditorialReviewSchema(validOutput({ jm1pub_recommendedimprintcode: "NOT_REAL" }));
    assert.ok(r.errors.includes("jm1pub_recommendedimprintcode_INVALID_ENUM"));
  });

  test("invalid fit decision enum fails", () => {
    const r = validateEditorialReviewSchema(validOutput({ jm1pub_fitdecision: "NOT_REAL" }));
    assert.ok(r.errors.includes("jm1pub_fitdecision_INVALID_ENUM"));
  });

  test("confidence out of range fails", () => {
    assert.ok(validateEditorialReviewSchema(validOutput({ jm1pub_imprintconfidence: 1.5 })).errors.includes("jm1pub_imprintconfidence_INVALID_RANGE"));
    assert.ok(validateEditorialReviewSchema(validOutput({ jm1pub_imprintconfidence: -0.1 })).errors.includes("jm1pub_imprintconfidence_INVALID_RANGE"));
    assert.ok(validateEditorialReviewSchema(validOutput({ jm1pub_imprintconfidence: "0.8" })).errors.includes("jm1pub_imprintconfidence_INVALID_RANGE"));
  });

  test("all five imprint codes and all four fit decisions are individually accepted", () => {
    for (const code of Object.values(IMPRINT_CODE)) {
      assert.equal(validateEditorialReviewSchema(validOutput({ jm1pub_recommendedimprintcode: code })).valid, true);
    }
    for (const decision of Object.values(FIT_DECISION)) {
      assert.equal(validateEditorialReviewSchema(validOutput({ jm1pub_fitdecision: decision })).valid, true);
    }
  });

  describe("score category validation", () => {
    test("each of the six required score categories is individually checked for range", () => {
      const required = [
        SCORE_CATEGORY.MANUSCRIPT_FIT, SCORE_CATEGORY.PACKAGE_FIT, SCORE_CATEGORY.IMPRINT_FIT,
        SCORE_CATEGORY.EDITORIAL_READINESS, SCORE_CATEGORY.PRODUCTION_COMPLEXITY, SCORE_CATEGORY.AUDIENCE_MARKET_CLARITY
      ];
      for (const field of required) {
        assert.ok(validateEditorialReviewSchema(validOutput({ [field]: undefined })).errors.includes(`${field}_INVALID_RANGE`), `${field} should be required`);
        assert.ok(validateEditorialReviewSchema(validOutput({ [field]: 11 })).errors.includes(`${field}_INVALID_RANGE`), `${field} should reject >10`);
        assert.ok(validateEditorialReviewSchema(validOutput({ [field]: -1 })).errors.includes(`${field}_INVALID_RANGE`), `${field} should reject <0`);
        assert.equal(validateEditorialReviewSchema(validOutput({ [field]: 0 })).valid, true, `${field}=0 should be valid`);
        assert.equal(validateEditorialReviewSchema(validOutput({ [field]: 10 })).valid, true, `${field}=10 should be valid`);
      }
    });

    test("the optional faith/mission score is not required — omitting it entirely is valid", () => {
      const output = validOutput();
      delete output[SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT];
      assert.equal(validateEditorialReviewSchema(output).valid, true);
    });

    test("an out-of-range optional faith/mission score still fails when present", () => {
      const r = validateEditorialReviewSchema(validOutput({ [SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT]: 15 }));
      assert.ok(r.errors.includes(`${SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT}_INVALID_RANGE`));
    });
  });

  describe("author-facing field validation", () => {
    test("each of the four author-facing fields is required", () => {
      for (const field of Object.values(AUTHOR_FACING_FIELD)) {
        const r = validateEditorialReviewSchema(validOutput({ [field]: undefined }));
        assert.ok(r.errors.includes(`${field}_MISSING_OR_NOT_STRING`), `${field} should be required`);
      }
    });

    test("an author-facing field exceeding max length fails", () => {
      const r = validateEditorialReviewSchema(validOutput({ [AUTHOR_FACING_FIELD.SUMMARY]: "x".repeat(500) }));
      assert.ok(r.errors.includes(`${AUTHOR_FACING_FIELD.SUMMARY}_EXCEEDS_MAX_LENGTH`));
    });
  });
});
