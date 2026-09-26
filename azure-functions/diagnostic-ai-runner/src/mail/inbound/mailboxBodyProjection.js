"use strict";
const { createHash } = require("node:crypto");
const { DOMParser } = require("@xmldom/xmldom");

function textProjectionHash(text) {
  return createHash("sha256").update(String(text || "").replace(/\s+/g, " ").trim()).digest("hex");
}

function htmlProjectionHashes(html) {
  if (!html) return [];
  const doc = new DOMParser({ errorHandler: { warning() {}, error() {}, fatalError() {} } }).parseFromString(html, "text/html");
  const project = (node, includeHidden) => {
    if (node.nodeType === 3) return node.data;
    if (node.nodeType !== 1 && node.nodeType !== 9) return "";
    if (["style", "script", "head"].includes(String(node.nodeName).toLowerCase())) return "";
    if (!includeHidden && /display\s*:\s*none/i.test(node.getAttribute?.("style") || "")) return "";
    const parts = [];
    for (let child = node.firstChild; child; child = child.nextSibling) parts.push(project(child, includeHidden));
    return parts.join(" ");
  };
  return [...new Set([true, false].map(includeHidden => textProjectionHash(project(doc, includeHidden))))];
}

module.exports = { htmlProjectionHashes, textProjectionHash };
