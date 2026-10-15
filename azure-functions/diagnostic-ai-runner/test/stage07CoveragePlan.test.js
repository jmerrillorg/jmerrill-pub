"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plan } = require("../src/editorial/stage07CoveragePlan");
test("paragraph preserving plan covers exact source including long paragraphs", () => {
  const text = "  First paragraph.\n\n" + "word ".repeat(1000) + "\n\nFinal paragraph.\n";
  const p = plan(text); assert.equal(p.sourceWords, 1004); assert.equal(p.paragraphs.length, 3);
  assert.equal(p.chunks.length, 3); assert.equal(p.chunks[1].overTargetIntactParagraph, true);
  assert.equal(p.chunks[2].paragraphEnd, 2);
});
test("blank lines and CRLF retain deterministic source offsets", () => {
  const text = "one\r\n\r\n  two\n  \nthree";
  const p = plan(text, 2); assert.equal(p.sourceWords, 3);
  assert.deepEqual(p, plan(text, 2)); assert.equal(p.paragraphs.length, 3);
});
