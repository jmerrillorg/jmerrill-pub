"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  TEMPLATE_NAME,
  TEMPLATE_VERSION,
  SUBJECT,
  PREHEADER,
  buildEditorialRecommendationEmail,
  validateRenderedEmail
} = require("../src/editorial/editorialRecommendationEmailTemplate");

function attaInput(overrides = {}) {
  return {
    authorName: "Atta Boateng",
    projectTitle: "Untitled",
    packageCode: "JMP-PKG-PRO",
    recommendedPackage: {
      name: "Professional Publishing Package",
      price: "$4,500"
    },
    alternatePackage: {
      name: "Starter Publishing Package",
      price: "$1,999"
    },
    imprintLabel: "J Merrill Publishing",
    workType: "Full-length Book",
    genre: "Religious",
    wordCount: 83600,
    ...overrides
  };
}

describe("editorial recommendation email template", () => {
  test("renders the governed branded HTML and plain-text pair", () => {
    const result = buildEditorialRecommendationEmail(attaInput());

    assert.equal(result.ok, true);
    assert.equal(result.templateName, TEMPLATE_NAME);
    assert.equal(result.templateVersion, TEMPLATE_VERSION);
    assert.equal(result.subject, SUBJECT);
    assert.equal(result.subject.includes("Untitled"), false);
    assert.equal(result.preheader, PREHEADER);
    assert.equal(result.checksums.htmlSha256.length, 64);
    assert.equal(result.checksums.textSha256.length, 64);
    assert.match(result.html, /<!doctype html>/i);
    assert.match(result.html, /<table role="presentation"/);
    assert.match(result.html, /J MERRILL PUBLISHING/);
    assert.match(result.html, /A Division of J Merrill One/);
    assert.match(result.html, /Helping Authors Help Themselves\./);
    assert.match(result.html, /OUR RECOMMENDATION/);
    assert.match(result.html, /Professional Publishing Package/);
    assert.match(result.html, /\$4,500/);
    assert.match(result.html, /Starter Publishing Package/);
    assert.match(result.html, /\$1,999/);
    assert.match(result.html, /Reply With My Selection/);
    assert.match(result.html, /publishing@jmerrill\.one/);
    assert.doesNotMatch(result.html, /<script\b|<link\b|<style\b/i);
    assert.doesNotMatch(result.html, /project fits naturally under/i);
    assert.match(result.text, /Good day, Atta,/);
    assert.match(result.text, /your manuscript, Untitled/);
    assert.match(result.text, /full-length book with a religious focus at approximately 83,600 words/i);
  });

  test("does not hard-code Atta into the reusable template", () => {
    const result = buildEditorialRecommendationEmail(attaInput({
      authorName: "Cynthia Sloan",
      projectTitle: "Speech Therapy Works!",
      genre: "Education",
      wordCount: 42000
    }));

    assert.equal(result.ok, true);
    assert.match(result.text, /Good day, Cynthia,/);
    assert.match(result.text, /Speech Therapy Works!/);
    assert.doesNotMatch(result.text, /Atta/);
  });

  test("quality gate rejects text-only or malformed editorial email output", () => {
    const result = validateRenderedEmail({
      subject: SUBJECT,
      html: "",
      text: "plain text only"
    });

    assert.equal(result.ok, false);
    assert.ok(result.blockers.includes("HTML_BODY_MISSING"));
    assert.ok(result.blockers.includes("TABLE_LAYOUT_MISSING"));
  });
});
