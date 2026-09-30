"use strict";

const crypto = require("node:crypto");
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");
const { validateAgentEditPlan } = require("./editorialAgentContract");
const { applyNativeEditorialPlan } = require("./nativeWordEditorialMutation");

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const STRUCTURAL_ELEMENTS = ["tbl", "tblGrid", "tr", "tc", "sectPr", "pStyle", "numPr", "hyperlink", "drawing", "pict", "br", "bookmarkStart", "bookmarkEnd"];

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

async function documentXml(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file("word/document.xml");
  if (!part) fail("EDITORIAL_SOURCE_DOCX_DOCUMENT_MISSING");
  return new DOMParser().parseFromString(await part.async("string"), "application/xml");
}

function count(doc, localName) {
  return doc.getElementsByTagNameNS(W, localName).length;
}

async function produceGovernedAuthorReviewDocx(sourceBuffer, agentResult, authority, options = {}) {
  if (!Buffer.isBuffer(sourceBuffer)) fail("EDITORIAL_SOURCE_DOCX_REQUIRED");
  const sourceSha256 = crypto.createHash("sha256").update(sourceBuffer).digest("hex");
  if (authority?.sourceSha256?.toLowerCase() !== sourceSha256) fail("EDITORIAL_SOURCE_BYTES_AUTHORITY_MISMATCH");
  const validated = validateAgentEditPlan(agentResult, authority);
  const source = await documentXml(sourceBuffer);
  const result = await applyNativeEditorialPlan(sourceBuffer, validated.edits, options);
  const output = await documentXml(result.buffer);
  for (const element of STRUCTURAL_ELEMENTS) {
    if (count(source, element) !== count(output, element)) fail(`EDITORIAL_STRUCTURE_${element.toUpperCase()}_MISMATCH`);
  }
  if (result.trackedRevisionCount === 0 && result.wordCommentCount === 0) {
    fail("EDITORIAL_AUTHOR_REVIEW_CHANGE_EVIDENCE_MISSING");
  }
  return {
    ...result,
    agentId: validated.snapshot.agentId,
    authoritySnapshotSha256: validated.snapshotSha256,
    structurePreserved: true
  };
}

module.exports = { produceGovernedAuthorReviewDocx };
