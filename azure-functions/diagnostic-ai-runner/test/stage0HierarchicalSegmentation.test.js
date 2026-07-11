"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { extractSegments } = require("../src/editorial/stage0HierarchicalSegmentation");

const SAMPLE_MANUSCRIPT = `
Front Matter Title
By Example Author

January 1
Begin Here
Proverbs 1:1
This is the first devotional entry with enough words to create a stable segment.

January 2
Stay Ready
James 1:2
This is the second devotional entry with enough words to stay intact.

March 31
Move Forward
Romans 12:1
This is the closing quarter entry for testing the quarterly grouping logic.

August 11
Keep Going
Psalm 23:1
This is the last governed entry in the partial manuscript.
`;

const UPPERCASE_MANUSCRIPT = `
Cover Page

JANUARY 1
Begin Here
Proverbs 1:1
This is the first devotional entry with enough words to create a stable segment.

SOUL DIVE - JANUARY 1
Prompting material that must remain inside the January 1 segment.

FEBRUARY 29 is a rare day.
This prose sentence must not become a devotional header.

JANUARY 2
Stay Ready
James 1:2
This is the second devotional entry with enough words to stay intact.

📘 MARCH 1
Move Forward
Romans 12:1
This is the first icon-prefixed entry and it should still become a segment.

🌌 SOUL DIVE — MARCH 1
Prompting material that must remain inside the March 1 segment.
`;

describe("stage0 hierarchical segmentation", () => {
  test("extracts dated devotional entries in order and recognizes partial year scope", () => {
    const result = extractSegments({
      manuscriptArtifactId: "artifact-1",
      manuscriptHash: "hash-1",
      manuscriptContent: SAMPLE_MANUSCRIPT
    });

    assert.equal(result.manifest.entryCount, 4);
    assert.equal(result.segments[0].entryDate, "January 1");
    assert.equal(result.segments[1].entryDate, "January 2");
    assert.equal(result.segments[2].entryDate, "March 31");
    assert.equal(result.segments[3].entryDate, "August 11");
    assert.equal(result.segments[0].quarter, "Q1");
    assert.equal(result.segments[3].quarter, "Q3");
    assert.equal(result.manifest.partialYearRecognized, true);
    assert.ok(result.frontMatter.includes("Front Matter Title"));
  });

  test("produces stable segment ids for the same source content", () => {
    const first = extractSegments({
      manuscriptArtifactId: "artifact-1",
      manuscriptHash: "hash-1",
      manuscriptContent: SAMPLE_MANUSCRIPT
    });
    const second = extractSegments({
      manuscriptArtifactId: "artifact-1",
      manuscriptHash: "hash-1",
      manuscriptContent: SAMPLE_MANUSCRIPT
    });

    assert.deepEqual(
      first.segments.map((segment) => segment.segmentId),
      second.segments.map((segment) => segment.segmentId)
    );
  });

  test("matches standalone uppercase month-day headers without treating prose mentions as entries", () => {
    const result = extractSegments({
      manuscriptArtifactId: "artifact-2",
      manuscriptHash: "hash-2",
      manuscriptContent: UPPERCASE_MANUSCRIPT
    });

    assert.equal(result.manifest.entryCount, 3);
    assert.equal(result.segments[0].entryDate, "January 1");
    assert.equal(result.segments[1].entryDate, "January 2");
    assert.equal(result.segments[2].entryDate, "March 1");
    assert.match(result.segments[0].content, /SOUL DIVE - JANUARY 1/);
    assert.match(result.segments[2].content, /SOUL DIVE — MARCH 1/);
    assert.doesNotMatch(
      result.segments.map((segment) => segment.entryDate).join(" | "),
      /February 29/
    );
  });
});
