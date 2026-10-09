"use strict";
const { extname } = require("node:path");
const { TextDecoder } = require("node:util");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Format comes from the revalidated artifact, never from the HTTP caller.
// Markdown is literal manuscript data; links, HTML and code are not executed.
async function extractCommissioningSourceText(bytes, media = {}) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) deny("REVIEW_SOURCE_TEXT_EMPTY");
  const extension = extname(media.repositoryPath || "").toLowerCase();
  if (extension === ".md") {
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { deny("REVIEW_SOURCE_TEXT_ENCODING_INVALID"); }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(text)) deny("REVIEW_SOURCE_TEXT_BINARY_DENIED");
    if (!text.trim()) deny("REVIEW_SOURCE_TEXT_EMPTY");
    return text;
  }
  if (extension && extension !== ".docx") deny("REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED");
  const text = (await require("mammoth").extractRawText({ buffer: bytes })).value;
  if (!text?.trim()) deny("REVIEW_SOURCE_TEXT_EMPTY");
  return text;
}
module.exports = { extractCommissioningSourceText };
