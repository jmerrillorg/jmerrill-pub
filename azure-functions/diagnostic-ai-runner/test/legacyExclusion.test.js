"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { checkLegacyExclusion, parseLegacyFlag } = require("../src/preflight/legacyExclusionCheck");

describe("checkLegacyExclusion", () => {
  test("returns excluded:true and non-null reason when legacyFlag is true", () => {
    const result = checkLegacyExclusion(true);
    assert.equal(result.excluded, true);
    assert.ok(typeof result.reason === "string" && result.reason.length > 0, "reason must be non-empty");
  });

  test("returns excluded:false and null reason when legacyFlag is false", () => {
    const result = checkLegacyExclusion(false);
    assert.equal(result.excluded, false);
    assert.equal(result.reason, null);
  });

  test("returns excluded:false when legacyFlag is undefined", () => {
    const result = checkLegacyExclusion(undefined);
    assert.equal(result.excluded, false);
    assert.equal(result.reason, null);
  });

  test("returns excluded:false when legacyFlag is null", () => {
    const result = checkLegacyExclusion(null);
    assert.equal(result.excluded, false);
    assert.equal(result.reason, null);
  });

  test("returns excluded:false when legacyFlag is the string 'true'", () => {
    // Only boolean true triggers exclusion
    const result = checkLegacyExclusion("true");
    assert.equal(result.excluded, false);
  });

  test("returns excluded:false when legacyFlag is 1", () => {
    const result = checkLegacyExclusion(1);
    assert.equal(result.excluded, false);
  });

  test("reason does not contain manuscript text or PII", () => {
    const result = checkLegacyExclusion(true);
    // Reason should be a safe internal routing message
    assert.ok(!result.reason.includes("manuscript"), "reason must not mention manuscript content");
    // Reason should reference Legacy routing
    assert.ok(result.reason.toLowerCase().includes("legacy"), "reason must reference Legacy");
  });
});

describe("parseLegacyFlag", () => {
  test("returns true when body.legacyFlag is boolean true", () => {
    assert.equal(parseLegacyFlag({ legacyFlag: true }), true);
  });

  test("returns false when body.legacyFlag is boolean false", () => {
    assert.equal(parseLegacyFlag({ legacyFlag: false }), false);
  });

  test("returns false when body.legacyFlag is absent", () => {
    assert.equal(parseLegacyFlag({}), false);
  });

  test("returns false when body is null", () => {
    assert.equal(parseLegacyFlag(null), false);
  });

  test("returns false when body.legacyFlag is the string 'true'", () => {
    assert.equal(parseLegacyFlag({ legacyFlag: "true" }), false);
  });

  test("returns false when body.legacyFlag is 1", () => {
    assert.equal(parseLegacyFlag({ legacyFlag: 1 }), false);
  });

  test("returns false when body.legacyFlag is undefined", () => {
    assert.equal(parseLegacyFlag({ legacyFlag: undefined }), false);
  });
});

describe("Legacy gate ordering contract", () => {
  test("checkLegacyExclusion returns excluded before any extraction or AI check can be made", () => {
    // Simulate a request that would also trigger verifyExtraction and verifyKnowledge
    // The Legacy check result must be excluded:true before either can run
    const body = { legacyFlag: true, verifyExtraction: true, syntheticFixture: "docx", verifyKnowledge: true };
    const flag = parseLegacyFlag(body);
    const check = checkLegacyExclusion(flag);
    // Gate must fire before any other logic is reached
    assert.equal(check.excluded, true);
    assert.ok(check.reason != null);
  });

  test("checkLegacyExclusion passes when legacyFlag is absent even with verifyExtraction", () => {
    const body = { verifyExtraction: true, syntheticFixture: "txt" };
    const flag = parseLegacyFlag(body);
    const check = checkLegacyExclusion(flag);
    assert.equal(check.excluded, false);
  });
});
