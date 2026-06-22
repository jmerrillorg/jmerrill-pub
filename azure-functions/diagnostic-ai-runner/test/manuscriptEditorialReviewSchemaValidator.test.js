"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { validateEditorialReviewSchema } = require("../src/editorial/manuscriptEditorialReviewSchemaValidator");
const { IMPRINT_CODE, FIT_DECISION } = require("../src/editorial/manuscriptEditorialReviewProvider");

function validOutput(overrides = {}) {
  return {
    jm1pub_editorialfitsummary: "Clear practical structure.",
    jm1pub_editorialriskflags: "None identified",
    jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS,
    jm1pub_imprintconfidence: 0.8,
    jm1pub_fitdecision: FIT_DECISION.GOOD_FIT,
    jm1pub_signaturecandidacy: false,
    jm1pub_rightsdisclosureflag: false,
    jm1pub_requireshumanreview: false,
    ...overrides
  };
}

describe("validateEditorialReviewSchema", () => {
  test("a fully valid output passes", () => {
    const r = validateEditorialReviewSchema(validOutput());
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
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
});
