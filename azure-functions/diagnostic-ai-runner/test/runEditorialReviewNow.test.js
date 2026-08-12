"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = readFileSync(
  join(__dirname, "../src/functions/runEditorialReviewNow.js"),
  "utf8"
);

describe("run-editorial-review-now send approval", () => {
  test("carries rendered recommendation HTML and template metadata into automatic send approval", () => {
    assert.match(source, /draftHtmlBody:\s*view\.authorFacingRecommendationDraft\.htmlBody\s*\|\|\s*null/);
    assert.match(source, /templateVersion:\s*view\.authorFacingRecommendationDraft\.templateVersion\s*\|\|\s*null/);
    assert.match(source, /htmlSha256:\s*view\.authorFacingRecommendationDraft\.htmlChecksum\s*\|\|\s*null/);
    assert.match(source, /textSha256:\s*view\.authorFacingRecommendationDraft\.textChecksum\s*\|\|\s*null/);
    assert.match(source, /qualityGate:\s*view\.authorFacingRecommendationDraft\.qualityGate\s*\|\|\s*null/);
  });
});
