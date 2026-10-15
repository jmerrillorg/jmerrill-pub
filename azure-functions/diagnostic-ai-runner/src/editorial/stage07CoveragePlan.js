"use strict";
const { createHash } = require("node:crypto");
const hash = text => createHash("sha256").update(text).digest("hex");
function plan(text, targetWords = 900) {
  if (typeof text !== "string" || !text.trim() || !Number.isSafeInteger(targetWords) || targetWords < 1) throw Error("STAGE07_SOURCE_INVALID");
  const paragraphs = [...text.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)].map((match, index) => ({
    index, start: match.index, end: match.index + match[0].length,
    words: match[0].trim().split(/\s+/u).length, sha256: hash(match[0]) }));
  const chunks = [];
  let current = [];
  for (const p of paragraphs) {
    if (current.length && current.reduce((n, x) => n + x.words, 0) + p.words > targetWords) { chunks.push(current); current = []; }
    current.push(p);
  }
  if (current.length) chunks.push(current);
  const result = chunks.map((ps, index) => ({ index, paragraphStart: ps[0].index,
    paragraphEnd: ps.at(-1).index, start: ps[0].start, end: ps.at(-1).end,
    words: ps.reduce((n, p) => n + p.words, 0), sha256: hash(text.slice(ps[0].start, ps.at(-1).end)),
    overTargetIntactParagraph: ps.some(p => p.words > targetWords) }));
  const sourceWords = text.trim().split(/\s+/u).length;
  if (paragraphs.reduce((n, p) => n + p.words, 0) !== sourceWords) throw Error("STAGE07_COVERAGE_MISMATCH");
  // Only whitespace separators may lie outside assigned paragraph spans.
  let end = 0;
  for (const p of paragraphs) { if (text.slice(end, p.start).trim()) throw Error("STAGE07_UNASSIGNED_SOURCE"); end = p.end; }
  if (text.slice(end).trim()) throw Error("STAGE07_UNASSIGNED_SOURCE");
  return { sourceTextSha256: hash(text), sourceWords, targetWords, paragraphs, chunks: result,
    overlap: { beforeWords: 200, afterWords: 200, editable: false },
    hierarchy: { method: "bounded contiguous full-source sections then complete section-ledger synthesis",
      sectionInputTokenCeiling: 32000, outputTokenCeiling: 8192,
      note: "Provider token counting and exact rendered prompts required before dispatch; no source truncation." } };
}
module.exports = { plan };
