"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildLineRetentionDriftQa } = require("../src/editorial/lineRetentionDriftQa");

const baseParagraphs = [
  "Chapter One",
  "The author opened the room with a quiet sentence that carried the same voice, pace, and meaning through the scene.",
  "The next paragraph kept the witness focused on the family, the village, and the weight of the moment without changing the story.",
  "Another paragraph held the same sequence of action and reflection, keeping the author's cadence intact while improving the reader's path.",
  "The closing paragraph preserved the original intention, the point of view, and the emotional temperature of the passage."
];

function manuscript(lines = baseParagraphs) {
  return lines.join("\n\n");
}

test("passes punctuation and clarity-only line edits", () => {
  const source = manuscript();
  const edited = source.replace("voice, pace, and meaning", "voice, pace and meaning");
  const qa = buildLineRetentionDriftQa({ sourceText: source, editedText: edited });
  assert.equal(qa.ok, true);
  assert.equal(qa.violations.length, 0);
});

test("passes moderate sentence rewrites that preserve scope and structure", () => {
  const source = manuscript();
  const edited = manuscript([
    "Chapter One",
    "The author opened the room with a quiet sentence, carrying the same voice, pace, and meaning through the scene.",
    baseParagraphs[2],
    "Another paragraph held the same sequence of action and reflection, preserving the author's cadence while smoothing the reader's path.",
    baseParagraphs[4]
  ]);
  const qa = buildLineRetentionDriftQa({ sourceText: source, editedText: edited });
  assert.equal(qa.ok, true);
});

test("passes paragraph-level flow improvements without developmental restructuring", () => {
  const source = manuscript();
  const edited = manuscript([
    "Chapter One",
    baseParagraphs[1],
    "The next paragraph kept the witness focused on the family, the village, and the weight of the moment, so the story remained clear.",
    baseParagraphs[3],
    baseParagraphs[4]
  ]);
  const qa = buildLineRetentionDriftQa({ sourceText: source, editedText: edited });
  assert.equal(qa.ok, true);
  assert.equal(qa.metrics.outputExpansionPercent < 15, true);
});

test("passes safe output expansion above 100 percent measured ratio", () => {
  const source = manuscript();
  const edited = manuscript([
    "Chapter One",
    `${baseParagraphs[1]} The sentence now lands cleanly for the reader.`,
    baseParagraphs[2],
    baseParagraphs[3],
    baseParagraphs[4]
  ]);
  const qa = buildLineRetentionDriftQa({ sourceText: source, editedText: edited });
  assert.equal(qa.metrics.measuredRetentionPercent > 100, true);
  assert.equal(qa.ok, true);
});

test("fails section deletion", () => {
  const source = manuscript(["Chapter One", ...baseParagraphs.slice(1), "Chapter Two", ...baseParagraphs.slice(1)]);
  const edited = manuscript(["Chapter One", ...baseParagraphs.slice(1)]);
  const qa = buildLineRetentionDriftQa({ sourceText: source, editedText: edited });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_SECTION_RETENTION_BELOW_100_PERCENT"), true);
});

test("fails summarization drift", () => {
  const qa = buildLineRetentionDriftQa({
    sourceText: manuscript(),
    editedText: "Chapter One\n\nIn short, the passage explains the scene and its emotional stakes."
  });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_SUMMARIZATION_DRIFT"), true);
});

test("fails new invented content", () => {
  const qa = buildLineRetentionDriftQa({
    sourceText: manuscript(),
    editedText: `${manuscript()}\n\nThis new chapter introduces an invented family dispute that was not in the source.`
  });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_SUBSTANTIVE_INVENTION_RISK"), true);
});

test("fails developmental restructuring that collapses paragraphs", () => {
  const qa = buildLineRetentionDriftQa({
    sourceText: manuscript(),
    editedText: baseParagraphs.join(" ")
  });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_STRUCTURAL_RETENTION_BELOW_95_PERCENT"), true);
});

test("fails large voice and style rewrite", () => {
  const qa = buildLineRetentionDriftQa({
    sourceText: manuscript(),
    editedText: manuscript([
      "Chapter One",
      "A polished executive narrator reframed the situation with corporate precision and removed the original rhythm from the scene.",
      "The passage became a strategic summary of market-facing value and replaced the family witness with abstract positioning language.",
      "The remaining prose adopted a neutral business style that flattened regional cadence, emotional heat, and authorial personality.",
      "The ending now reads as a generic conclusion instead of preserving the source's lived voice and dramatic pressure."
    ])
  });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_REWRITE_MAGNITUDE_EXCESSIVE"), true);
});

test("fails substantial paragraph removal", () => {
  const qa = buildLineRetentionDriftQa({
    sourceText: manuscript(),
    editedText: manuscript(baseParagraphs.slice(0, 4))
  });
  assert.equal(qa.ok, false);
  assert.equal(qa.violations.includes("LINE_NET_WORD_RETENTION_BELOW_95_PERCENT"), true);
});
