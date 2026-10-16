"use strict";
const { createHash } = require("node:crypto");
const sha = value => createHash("sha256").update(value).digest("hex");
const whitespace = value => value.replace(/\s+/gu, " ").trim();
const typographicQuotes = value => whitespace(value).replace(/[\u201c\u201d]/gu, '"').replace(/[\u2018\u2019]/gu, "'");
function restore(output, task, plan, text) {
  if (task.pass !== "EDIT" || !Array.isArray(output?.paragraphs) || !Array.isArray(output.reviewedNoChange)) return null;
  const value = structuredClone(output), restored = [], span = plan.editing.chunks[task.index];
  let quoteRestored = false;
  for (const paragraph of value.paragraphs) {
    if (!Number.isInteger(paragraph.index) || paragraph.index < span.paragraphStart || paragraph.index > span.paragraphEnd ||
        !output.reviewedNoChange.includes(paragraph.index) || typeof paragraph.text !== "string") continue;
    const p = plan.editing.paragraphs[paragraph.index], original = text.slice(p.start, p.end);
    if (paragraph.text !== original && typographicQuotes(paragraph.text) === typographicQuotes(original)) {
      quoteRestored ||= whitespace(paragraph.text) !== whitespace(original);
      restored.push({ index: p.index, returnedSha256: sha(paragraph.text), sourceSha256: sha(original) });
      paragraph.text = original;
    }
  }
  return restored.length ? { method: quoteRestored ? "EXACT_SOURCE_QUOTE_RESTORATION_V1" : "EXACT_SOURCE_WHITESPACE_RESTORATION_V1", output: value, restored } : null;
}
module.exports = { restore, whitespace, typographicQuotes };
