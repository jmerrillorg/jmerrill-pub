"use strict";

const crypto = require("node:crypto");
const JSZip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { validateAuthorFacingProjection } = require("./authorFacingProjectionGuard");

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/package/2006/relationships";
const CONTENT_TYPES = "http://schemas.openxmlformats.org/package/2006/content-types";
const COMMENTS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
const COMMENTS_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml";
const EDIT_CLASSES = new Set(["REPLACE_TEXT", "INSERT_TEXT", "DELETE_TEXT", "FORMAT_PARAGRAPH", "EDITOR_COMMENT", "AUTHOR_QUESTION", "AUTHOR_DECISION_REQUIRED"]);
const INTERNAL_CLASSES = new Set([
  "PUBLISHER_INTERNAL", "RIGHTS_LEGAL_INTERNAL", "FACT_CHECK_INTERNAL", "PRODUCTION_INTERNAL",
  "PROVIDER_INTERNAL", "SYSTEM_INTERNAL", "AI_INTERNAL", "NO_CHANGE", "MOVE_SECTION_RECOMMENDATION"
]);
const COMMENT_AUTHORITY = Object.freeze({
  EDITOR_COMMENT: "SYSTEM_AUTHORIZED_EDIT",
  AUTHOR_QUESTION: "AUTHOR_DECISION_REQUIRED",
  AUTHOR_DECISION_REQUIRED: "AUTHOR_DECISION_REQUIRED"
});

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function parseXml(xml, code) {
  const errors = [];
  const doc = new DOMParser({
    errorHandler: { warning: (message) => errors.push(message), error: (message) => errors.push(message), fatalError: (message) => errors.push(message) }
  }).parseFromString(xml, "application/xml");
  if (errors.length || !doc.documentElement || doc.getElementsByTagName("parsererror").length) fail(code);
  return doc;
}

function descendants(node, namespace, localName) {
  return Array.from(node.getElementsByTagNameNS(namespace, localName));
}

function runText(run) {
  return descendants(run, W, "t").map((node) => node.textContent).join("");
}

function textRun(doc, sourceRun, value, deletion = false) {
  const run = doc.createElementNS(W, "w:r");
  const properties = descendants(sourceRun, W, "rPr")[0];
  if (properties) run.appendChild(properties.cloneNode(true));
  const text = doc.createElementNS(W, deletion ? "w:delText" : "w:t");
  text.setAttribute("xml:space", "preserve");
  text.appendChild(doc.createTextNode(value));
  run.appendChild(text);
  return run;
}

function findSingleRun(doc, sourceText) {
  if (!sourceText) fail("EDITORIAL_ANCHOR_MISSING");
  const matches = [];
  for (const run of descendants(doc, W, "r")) {
    const text = runText(run);
    if (!text) continue;
    let offset = text.indexOf(sourceText);
    while (offset >= 0) {
      matches.push({ run, text, offset });
      offset = text.indexOf(sourceText, offset + sourceText.length);
    }
  }
  if (matches.length !== 1) fail(matches.length ? "EDITORIAL_ANCHOR_AMBIGUOUS" : "EDITORIAL_ANCHOR_NOT_IN_SINGLE_RUN");
  const match = matches[0];
  const children = Array.from(match.run.childNodes).filter((node) => node.nodeType === 1);
  const simpleRun = children.every((node) => node.namespaceURI === W && ["rPr", "t"].includes(node.localName));
  if (!simpleRun || descendants(match.run, W, "t").length !== 1 || match.run.parentNode.namespaceURI !== W || match.run.parentNode.localName !== "p") {
    fail("EDITORIAL_ANCHOR_COMPLEX_RUN");
  }
  return match;
}

function revisionNode(doc, kind, id, author, date, sourceRun, text) {
  const element = doc.createElementNS(W, `w:${kind}`);
  element.setAttributeNS(W, "w:id", String(id));
  element.setAttributeNS(W, "w:author", author);
  element.setAttributeNS(W, "w:date", date);
  element.appendChild(textRun(doc, sourceRun, text, kind === "del"));
  return element;
}

function applyRevision(doc, edit, id, author, date) {
  if (edit.insertPosition !== undefined &&
      (edit.editClass !== "INSERT_TEXT" || !["BEFORE", "AFTER"].includes(edit.insertPosition))) {
    fail("EDITORIAL_INSERT_POSITION_INVALID");
  }
  if (edit.anchorScope !== undefined && edit.anchorScope !== "PARAGRAPH") fail("EDITORIAL_ANCHOR_SCOPE_INVALID");
  if (edit.anchorScope === "PARAGRAPH") {
    if (edit.editClass !== "INSERT_TEXT" || edit.insertPosition !== "BEFORE") fail("EDITORIAL_PARAGRAPH_INSERT_MODE_INVALID");
    const paragraph = findExactParagraph(doc, edit.sourceText || edit.anchor);
    const children = Array.from(paragraph.childNodes).filter((node) => node.nodeType === 1);
    if (children.some((node) => node.namespaceURI !== W || !["pPr", "r"].includes(node.localName))) {
      fail("EDITORIAL_PARAGRAPH_COMPLEX_STRUCTURE");
    }
    const firstRun = children.find((node) => node.localName === "r" && descendants(node, W, "t").length);
    if (!firstRun || !edit.proposedText) fail("EDITORIAL_PARAGRAPH_INSERT_TEXT_REQUIRED");
    paragraph.insertBefore(revisionNode(doc, "ins", id, author, date, firstRun, edit.proposedText), firstRun);
    return 1;
  }
  const source = edit.sourceText || edit.anchor;
  const match = findSingleRun(doc, source);
  const { run, text, offset } = match;
  const parent = run.parentNode;
  const before = text.slice(0, offset);
  const after = text.slice(offset + source.length);
  if (before) parent.insertBefore(textRun(doc, run, before), run);
  if (edit.editClass === "INSERT_TEXT") {
    if (edit.insertPosition !== "BEFORE") parent.insertBefore(textRun(doc, run, source), run);
  } else parent.insertBefore(revisionNode(doc, "del", id, author, date, run, source), run);
  if (edit.editClass !== "DELETE_TEXT") {
    if (!edit.proposedText) fail("EDITORIAL_PROPOSED_TEXT_MISSING");
    parent.insertBefore(revisionNode(doc, "ins", id + 1, author, date, run, edit.proposedText), run);
  }
  if (edit.editClass === "INSERT_TEXT" && edit.insertPosition === "BEFORE") parent.insertBefore(textRun(doc, run, source), run);
  if (after) parent.insertBefore(textRun(doc, run, after), run);
  parent.removeChild(run);
  return edit.editClass === "INSERT_TEXT" ? 1 : edit.editClass === "DELETE_TEXT" ? 1 : 2;
}

function findExactParagraph(doc, anchor) {
  if (typeof anchor !== "string" || !anchor.length) fail("EDITORIAL_ANCHOR_MISSING");
  const matches = descendants(doc, W, "p").filter((p) =>
    descendants(p, W, "t").map((t) => t.textContent).join("") === anchor);
  if (matches.length !== 1) fail(matches.length ? "EDITORIAL_ANCHOR_AMBIGUOUS" : "EDITORIAL_PARAGRAPH_ANCHOR_NOT_FOUND");
  const paragraph = matches[0];
  if (paragraph.parentNode.namespaceURI !== W || paragraph.parentNode.localName !== "body" ||
      ["ins", "del", "moveFrom", "moveTo"].some((name) => descendants(paragraph, W, name).length)) {
    fail("EDITORIAL_PARAGRAPH_COMPLEX_STRUCTURE");
  }
  return paragraph;
}

function applyParagraphFormat(doc, edit, id, author, date) {
  const properties = edit.paragraphProperties;
  const allowed = new Set(["spacingBefore", "spacingAfter", "keepNext", "keepLines"]);
  if (!properties || typeof properties !== "object" || Array.isArray(properties) ||
      !Object.keys(properties).length || Object.keys(properties).some((key) => !allowed.has(key))) {
    fail("EDITORIAL_PARAGRAPH_PROPERTIES_INVALID");
  }
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith("spacing") ? !Number.isInteger(value) || value < 0 || value > 720 : typeof value !== "boolean") {
      fail("EDITORIAL_PARAGRAPH_PROPERTIES_INVALID");
    }
  }
  const paragraph = findExactParagraph(doc, edit.sourceText || edit.anchor);
  let pPr = Array.from(paragraph.childNodes).find((n) => n.namespaceURI === W && n.localName === "pPr");
  if (pPr && descendants(pPr, W, "pPrChange").length) fail("EDITORIAL_PARAGRAPH_EXISTING_REVISION");
  const previous = pPr ? pPr.cloneNode(true) : doc.createElementNS(W, "w:pPr");
  // CT_PPrBase history excludes paragraph-mark and section properties; retain them only in live pPr.
  for (const child of Array.from(previous.childNodes)) {
    if (child.namespaceURI === W && ["rPr", "sectPr"].includes(child.localName)) previous.removeChild(child);
  }
  if (!pPr) {
    pPr = doc.createElementNS(W, "w:pPr");
    paragraph.insertBefore(pPr, paragraph.firstChild);
  }
  // Keep existing styles, numbering and pagination; only the named properties change.
  const order = ["pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr",
    "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap",
    "overflowPunct", "topLinePunct", "autoSpaceDE", "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid",
    "spacing", "ind", "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc", "textDirection",
    "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr", "sectPr", "pPrChange"];
  function property(name) {
    let child = Array.from(pPr.childNodes).find((n) => n.namespaceURI === W && n.localName === name);
    if (!child) {
      child = doc.createElementNS(W, `w:${name}`);
      const next = Array.from(pPr.childNodes).find((n) => n.namespaceURI === W && order.indexOf(n.localName) > order.indexOf(name));
      pPr.insertBefore(child, next || null);
    }
    return child;
  }
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith("spacing")) {
      const spacing = property("spacing");
      const side = key === "spacingBefore" ? "before" : "after";
      spacing.removeAttributeNS(W, `${side}Lines`);
      spacing.setAttributeNS(W, `w:${side}Autospacing`, "0");
      spacing.setAttributeNS(W, `w:${side}`, String(value));
    } else property(key).setAttributeNS(W, "w:val", value ? "1" : "0");
  }
  const change = property("pPrChange");
  change.setAttributeNS(W, "w:id", String(id));
  change.setAttributeNS(W, "w:author", author);
  change.setAttributeNS(W, "w:date", date);
  change.appendChild(previous);
  return 1;
}

function applyComment(doc, edit, id, commentRoot, author, date) {
  const match = findSingleRun(doc, edit.anchor || edit.sourceText);
  const { run, text, offset } = match;
  const anchor = edit.anchor || edit.sourceText;
  const parent = run.parentNode;
  const before = text.slice(0, offset);
  const after = text.slice(offset + anchor.length);
  if (before) parent.insertBefore(textRun(doc, run, before), run);
  const start = doc.createElementNS(W, "w:commentRangeStart");
  start.setAttributeNS(W, "w:id", String(id));
  parent.insertBefore(start, run);
  parent.insertBefore(textRun(doc, run, anchor), run);
  const end = doc.createElementNS(W, "w:commentRangeEnd");
  end.setAttributeNS(W, "w:id", String(id));
  parent.insertBefore(end, run);
  const reference = doc.createElementNS(W, "w:r");
  const referenceNode = doc.createElementNS(W, "w:commentReference");
  referenceNode.setAttributeNS(W, "w:id", String(id));
  reference.appendChild(referenceNode);
  parent.insertBefore(reference, run);
  if (after) parent.insertBefore(textRun(doc, run, after), run);
  parent.removeChild(run);

  const comment = commentRoot.ownerDocument.createElementNS(W, "w:comment");
  comment.setAttributeNS(W, "w:id", String(id));
  comment.setAttributeNS(W, "w:author", author);
  comment.setAttributeNS(W, "w:date", date);
  const paragraph = commentRoot.ownerDocument.createElementNS(W, "w:p");
  const noteRun = commentRoot.ownerDocument.createElementNS(W, "w:r");
  const noteText = commentRoot.ownerDocument.createElementNS(W, "w:t");
  noteText.appendChild(commentRoot.ownerDocument.createTextNode(edit.commentText));
  noteRun.appendChild(noteText);
  paragraph.appendChild(noteRun);
  comment.appendChild(paragraph);
  commentRoot.appendChild(comment);
}

function validateAuthorEdit(edit) {
  const kind = edit.editClass;
  const visible = kind === "REPLACE_TEXT" || kind === "INSERT_TEXT" || kind === "DELETE_TEXT"
    ? edit.proposedText || ""
    : edit.commentText || "";
  if (kind in COMMENT_AUTHORITY && edit.authorityClass !== COMMENT_AUTHORITY[kind]) {
    fail("EDITORIAL_COMMENT_AUTHORITY_NOT_GRANTED");
  }
  if (!validateAuthorFacingProjection(visible).ok) fail("EDITORIAL_AUTHOR_PROJECTION_FAILED");
}

async function applyNativeEditorialPlan(sourceBuffer, plan, options = {}) {
  if (!Buffer.isBuffer(sourceBuffer)) fail("EDITORIAL_SOURCE_DOCX_REQUIRED");
  if (!Array.isArray(plan) || plan.length === 0) fail("EDITORIAL_EDIT_PLAN_REQUIRED");
  const author = options.revisionAuthor || "J Merrill Publishing";
  const date = options.timestamp || new Date().toISOString();
  if (Number.isNaN(Date.parse(date))) fail("EDITORIAL_REVISION_TIMESTAMP_INVALID");
  const zip = await JSZip.loadAsync(sourceBuffer);
  const sourcePart = zip.file("word/document.xml");
  if (!sourcePart) fail("EDITORIAL_SOURCE_DOCX_DOCUMENT_MISSING");
  const doc = parseXml(await sourcePart.async("string"), "EDITORIAL_SOURCE_DOCX_XML_INVALID");
  const commentsPart = zip.file("word/comments.xml");
  const comments = commentsPart
    ? parseXml(await commentsPart.async("string"), "EDITORIAL_COMMENTS_XML_INVALID")
    : parseXml(`<w:comments xmlns:w="${W}"/>`, "EDITORIAL_COMMENTS_XML_INVALID");
  const existingIds = [...descendants(doc, W, "ins"), ...descendants(doc, W, "del"), ...descendants(doc, W, "pPrChange"), ...descendants(comments, W, "comment")]
    .map((node) => Number(node.getAttributeNS(W, "id"))).filter(Number.isFinite);
  let nextId = Math.max(0, ...existingIds) + 1;
  let revisions = 0;
  let addedComments = 0;
  const internal = [];
  const seen = new Set();
  for (const edit of plan) {
    if (!edit || !edit.editId || seen.has(edit.editId)) fail("EDITORIAL_EDIT_ID_INVALID");
    seen.add(edit.editId);
    const kind = edit.editClass;
    if (!EDIT_CLASSES.has(kind)) {
      if (INTERNAL_CLASSES.has(kind)) {
        internal.push(edit);
        continue;
      }
      fail("EDITORIAL_EDIT_CLASS_UNSUPPORTED");
    }
    validateAuthorEdit(edit);
    if (["REPLACE_TEXT", "INSERT_TEXT", "DELETE_TEXT", "FORMAT_PARAGRAPH"].includes(kind)) {
      if (edit.authorityClass !== "SYSTEM_AUTHORIZED_EDIT") fail("EDITORIAL_EDIT_AUTHORITY_NOT_GRANTED");
      revisions += kind === "FORMAT_PARAGRAPH"
        ? applyParagraphFormat(doc, edit, nextId, author, date)
        : applyRevision(doc, edit, nextId, author, date);
      nextId += 2;
    } else {
      if (!edit.commentText) fail("EDITORIAL_COMMENT_TEXT_MISSING");
      applyComment(doc, edit, nextId++, comments.documentElement, author, date);
      addedComments += 1;
    }
  }
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  if (addedComments) {
    zip.file("word/comments.xml", new XMLSerializer().serializeToString(comments));
    const relPath = "word/_rels/document.xml.rels";
    const relFile = zip.file(relPath);
    if (!relFile) fail("EDITORIAL_DOCUMENT_RELATIONSHIPS_MISSING");
    const rels = parseXml(await relFile.async("string"), "EDITORIAL_DOCUMENT_RELATIONSHIPS_INVALID");
    if (!Array.from(rels.getElementsByTagNameNS(R, "Relationship")).some((node) => node.getAttribute("Type") === COMMENTS_REL)) {
      const ids = new Set(Array.from(rels.getElementsByTagNameNS(R, "Relationship")).map((node) => node.getAttribute("Id")));
      let n = 1;
      while (ids.has(`rId${n}`)) n++;
      const relation = rels.createElementNS(R, "Relationship");
      relation.setAttribute("Id", `rId${n}`);
      relation.setAttribute("Type", COMMENTS_REL);
      relation.setAttribute("Target", "comments.xml");
      rels.documentElement.appendChild(relation);
      zip.file(relPath, new XMLSerializer().serializeToString(rels));
    }
    const contentFile = zip.file("[Content_Types].xml");
    if (!contentFile) fail("EDITORIAL_CONTENT_TYPES_MISSING");
    const types = parseXml(await contentFile.async("string"), "EDITORIAL_CONTENT_TYPES_INVALID");
    if (!Array.from(types.getElementsByTagNameNS(CONTENT_TYPES, "Override")).some((node) => node.getAttribute("PartName") === "/word/comments.xml")) {
      const override = types.createElementNS(CONTENT_TYPES, "Override");
      override.setAttribute("PartName", "/word/comments.xml");
      override.setAttribute("ContentType", COMMENTS_CONTENT_TYPE);
      types.documentElement.appendChild(override);
      zip.file("[Content_Types].xml", new XMLSerializer().serializeToString(types));
    }
  }
  const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    buffer: output,
    sourceSha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
    outputSha256: crypto.createHash("sha256").update(output).digest("hex"),
    trackedRevisionCount: revisions,
    wordCommentCount: addedComments,
    internalFindings: internal
  };
}

module.exports = { applyNativeEditorialPlan };
