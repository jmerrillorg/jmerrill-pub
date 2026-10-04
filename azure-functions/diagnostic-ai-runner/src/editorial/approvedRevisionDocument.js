"use strict";

const { createHash } = require("node:crypto");
const JSZip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { applyNativeEditorialPlan } = require("./nativeWordEditorialMutation");
const { DIMENSIONS, headings, assertSkillBinding, validateSkillPlan } = require("./approvedRevisionSkill");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const hash = (v) => createHash("sha256").update(v).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const elements = (node, name) => Array.from(node.getElementsByTagNameNS(W, name));
const text = (node) => elements(node, "t").map((t) => t.textContent).join("");
async function xml(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const errors = [];
  const part = zip.file("word/document.xml");
  if (!part) fail("REVISION_DOCUMENT_MISSING");
  const doc = new DOMParser({ errorHandler: { warning: (x) => errors.push(x), error: (x) => errors.push(x), fatalError: (x) => errors.push(x) } })
    .parseFromString(await part.async("string"), "application/xml");
  if (errors.length) fail("REVISION_XML_INVALID");
  return { zip, doc };
}

// This recipe can only change existing heading spacing and prepend eight checkbox glyphs.
// It accepts no caller-supplied manuscript text, edit plan, styling rules or model output.
async function deriveApprovedFormattingPlan(buffer, editorialAuthority) {
  assertSkillBinding(editorialAuthority);
  if (hash(buffer) !== editorialAuthority.sourceSha256) fail("REVISION_SOURCE_BINDING_INVALID");
  const { doc } = await xml(buffer);
  if (elements(doc, "tbl").length !== 8 || ["ins", "del", "pPrChange", "moveFrom", "moveTo"].some((n) => elements(doc, n).length)) {
    fail("REVISION_SOURCE_STRUCTURE_UNSUPPORTED");
  }
  const paragraphs = elements(doc, "p").filter((p) => p.parentNode.localName === "body");
  const texts = paragraphs.map(text);
  function exact(anchor) {
    const indexes = texts.flatMap((t, i) => t === anchor ? [i] : []);
    if (indexes.length !== 1) fail("REVISION_SECTION_NOT_UNIQUE");
    return indexes[0];
  }
  const edits = [], targets = [];
  let prior = -1;
  for (const dimension of DIMENSIONS) {
    const sectionHeadings = headings(dimension);
    const indexes = sectionHeadings.map(exact);
    if (!(prior < indexes[0] && indexes[0] < indexes[1] && indexes[1] < indexes[2] && indexes[2] < indexes[3])) {
      fail("REVISION_SECTION_ORDER_CONFLICT");
    }
    prior = indexes[3];
    for (const anchor of sectionHeadings) edits.push({ editId: `format-${edits.length}`, editClass: "FORMAT_PARAGRAPH", anchor,
      paragraphProperties: { spacingBefore: 240, spacingAfter: 120, keepNext: true }, authorityClass: "SYSTEM_AUTHORIZED_EDIT" });
    const boundary = texts.findIndex((t, i) => i > indexes[2] && i < indexes[3] && t.trim() === "Reflection Questions");
    if (boundary < 0) fail("REVISION_CORE_BOUNDARY_MISSING");
    let last = boundary - 1;
    while (last > indexes[2] && !texts[last].trim()) last--;
    const anchor = texts[last];
    const sentences = Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(anchor)).filter((s) => s.segment.trim());
    if (last <= indexes[2] || sentences.length !== 1 || /[\u2610\u2611\u2612]/u.test(anchor)) fail("REVISION_FINAL_SENTENCE_AMBIGUOUS");
    exact(anchor);
    edits.push({ editId: `checkbox-${dimension}`, editClass: "INSERT_TEXT", anchor,
      anchorScope: "PARAGRAPH", insertPosition: "BEFORE", proposedText: "\u2610 ", authorityClass: "SYSTEM_AUTHORIZED_EDIT" });
    targets.push({ dimension, paragraphIndex: last, anchorSha256: hash(anchor) });
  }
  return validateSkillPlan({ edits, targets, editorialAuthority });
}

async function produceApprovedFormattingRevision(source, { sourceSha256, timestamp, editorialAuthority } = {}) {
  if (!Buffer.isBuffer(source) || hash(source) !== sourceSha256 || !Number.isFinite(Date.parse(timestamp))) fail("REVISION_SOURCE_BINDING_INVALID");
  const plan = await deriveApprovedFormattingPlan(source, editorialAuthority);
  const { edits, targets } = plan;
  const review = await applyNativeEditorialPlan(source, edits, { timestamp, revisionAuthor: "J Merrill Publishing" });
  const before = await xml(source), after = await xml(review.buffer);
  const serialize = (node) => new XMLSerializer().serializeToString(node);
  const tables = (doc) => elements(doc, "tbl").map(serialize);
  if (JSON.stringify(tables(before.doc)) !== JSON.stringify(tables(after.doc))) fail("REVISION_GRID_CHANGED");
  if (review.trackedRevisionCount !== 40 || review.wordCommentCount !== 0 || elements(after.doc, "ins").length !== 8 || elements(after.doc, "pPrChange").length !== 32) {
    fail("REVISION_SCOPE_MISMATCH");
  }
  const sourceParagraphs = elements(before.doc, "p").map(text);
  const expected = new Set(edits.filter((e) => e.editClass === "INSERT_TEXT").map((e) => e.anchor));
  const outputParagraphs = elements(after.doc, "p").map(text);
  if (JSON.stringify(outputParagraphs) !== JSON.stringify(sourceParagraphs.map((t) => expected.has(t) ? `\u2610 ${t}` : t))) fail("REVISION_TEXT_DRIFT");
  for (const [name, entry] of Object.entries(before.zip.files)) {
    if (entry.dir || name === "word/document.xml") continue;
    if (!after.zip.file(name) || !(await after.zip.file(name).async("nodebuffer")).equals(await entry.async("nodebuffer"))) fail("REVISION_PACKAGE_DRIFT");
  }
  // Source revisions were rejected above, so these are exclusively this operation's revisions.
  for (const node of elements(after.doc, "pPrChange")) node.parentNode.removeChild(node);
  for (const node of elements(after.doc, "ins")) {
    while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
    node.parentNode.removeChild(node);
  }
  after.zip.file("word/document.xml", serialize(after.doc));
  const clean = await after.zip.generateAsync({ type: "nodebuffer" });
  return { review: review.buffer, clean, evidence: { recipe: "whole-stage07-formatting-v1", sourceSha256,
    reviewSha256: hash(review.buffer), cleanSha256: hash(clean), gridCount: 8, preservedGridHashes: tables(before.doc).map(hash),
    headingFormats: 32, checkboxInsertions: 8, targets, textRetention: "ALL_SOURCE_TEXT_PRESERVED",
    editorialAuthority, plan, planSha256: hash(JSON.stringify(plan)),
    visualQa: "REQUIRED", authorApproval: "NOT_INFERRED" } };
}

module.exports = { deriveApprovedFormattingPlan, produceApprovedFormattingRevision, hash, fail, DIMENSIONS };
