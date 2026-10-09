"use strict";
const { extname } = require("node:path");
const { TextDecoder } = require("node:util");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function sourceExtension(repositoryPath = "") {
  if (!/^https?:\/\//iu.test(repositoryPath)) return extname(repositoryPath).toLowerCase();
  let url;
  try { url = new URL(repositoryPath); } catch { deny("REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED"); }
  if (url.protocol !== "https:" || url.hostname !== "jmerrillfoundation.sharepoint.com") deny("REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED");
  if (/\/_layouts\/15\/Doc\.aspx$/iu.test(url.pathname)) {
    const file = url.searchParams.get("file");
    if (!file || /[\/\\\x00-\x1f]/u.test(file)) deny("REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED");
    return extname(file).toLowerCase();
  }
  return extname(url.pathname).toLowerCase();
}

// Format comes from the revalidated artifact, never from the HTTP caller.
// Markdown is literal manuscript data; links, HTML and code are not executed.
async function extractCommissioningSourceText(bytes, media = {}) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) deny("REVIEW_SOURCE_TEXT_EMPTY");
  const extension = sourceExtension(media.repositoryPath);
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
module.exports = { extractCommissioningSourceText, sourceExtension };
