"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, ExternalHyperlink, Header, Footer
} = require("docx");
const { applyNativeEditorialPlan } = require("../src/editorial/nativeWordEditorialMutation");

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function fixture() {
  const tables = Array.from({ length: 8 }, (_, index) => new Table({
    rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph(`Grid ${index + 1} value`)] })] })]
  }));
  const doc = new Document({
    sections: [{
      headers: { default: new Header({ children: [new Paragraph("Author manuscript header")] }) },
      footers: { default: new Footer({ children: [new Paragraph("Author manuscript footer")] }) },
      children: [
        new Paragraph({ text: "A Working Manuscript", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: "Structure and voice", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: "This passage needs a clearer transition.", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "Keep the author's intent here.", italics: true })] }),
        new Paragraph("Please clarify the intended audience."),
        new Paragraph({ text: "First numbered item", numbering: { reference: "ordered", level: 0 } }),
        new Paragraph({ text: "First bulleted item", bullet: { level: 0 } }),
        new Paragraph("☐ Core component one    ☐ Core component two"),
        new Paragraph({ children: [new ExternalHyperlink({ link: "https://example.com", children: [new TextRun("Reference link")] })] }),
        ...tables,
        new Paragraph({ text: "New section starts", pageBreakBefore: true })
      ]
    }],
    numbering: { config: [{ reference: "ordered", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "left" }] }] }
  });
  return Packer.toBuffer(doc);
}

async function part(buffer, name) {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file(name)?.async("string");
}

function count(xml, localName) {
  return new DOMParser().parseFromString(xml, "application/xml").getElementsByTagNameNS(W, localName).length;
}

test("native edits preserve the original Word structure and emit revisions and anchored comments", async () => {
  const source = await fixture();
  const result = await applyNativeEditorialPlan(source, [
    { editId: "e1", editClass: "REPLACE_TEXT", sourceText: "needs a clearer transition", proposedText: "flows more clearly", authorityClass: "SYSTEM_AUTHORIZED_EDIT" },
    { editId: "e2", editClass: "INSERT_TEXT", anchor: "Keep the author's intent here.", proposedText: " Ask before reframing the point.", authorityClass: "SYSTEM_AUTHORIZED_EDIT" },
    { editId: "e3", editClass: "EDITOR_COMMENT", anchor: "Please clarify the intended audience.", commentText: "Editor's note: This audience cue may help readers follow the next section.", authorityClass: "SYSTEM_AUTHORIZED_EDIT" },
    { editId: "e4", editClass: "AUTHOR_QUESTION", anchor: "Core component one", commentText: "Author question: Is this the term you use elsewhere in the manuscript?", authorityClass: "AUTHOR_DECISION_REQUIRED" },
    { editId: "e5", editClass: "RIGHTS_LEGAL_INTERNAL", commentText: "Internal rights review only." }
  ], { timestamp: "2026-09-29T12:00:00.000Z" });
  const before = await part(source, "word/document.xml");
  const after = await part(result.buffer, "word/document.xml");
  const comments = await part(result.buffer, "word/comments.xml");
  assert.equal(count(before, "tbl"), 8);
  assert.equal(count(after, "tbl"), 8);
  for (const node of ["pStyle", "numPr", "sectPr", "hyperlink", "br"]) {
    assert.equal(count(after, node), count(before, node), node);
  }
  for (const node of ["b", "i"]) assert.ok(count(after, node) >= count(before, node), node);
  assert.equal(count(after, "ins"), 2);
  assert.equal(count(after, "del"), 1);
  assert.equal(count(after, "commentRangeStart"), 2);
  assert.equal(count(after, "commentRangeEnd"), 2);
  assert.equal(count(comments, "comment"), 2);
  assert.equal(result.internalFindings.length, 1);
  assert.doesNotMatch(`${after}\n${comments}`, /Internal rights review only/);
  assert.equal(await part(result.buffer, "word/header1.xml"), await part(source, "word/header1.xml"));
  assert.equal(await part(result.buffer, "word/footer1.xml"), await part(source, "word/footer1.xml"));
});

test("native editor rejects ambiguous and unauthorized edits without producing output", async () => {
  const source = await fixture();
  await assert.rejects(applyNativeEditorialPlan(source, [
    { editId: "e1", editClass: "REPLACE_TEXT", sourceText: "Grid", proposedText: "Table", authorityClass: "SYSTEM_AUTHORIZED_EDIT" }
  ]), /EDITORIAL_ANCHOR_AMBIGUOUS/);
  await assert.rejects(applyNativeEditorialPlan(source, [
    { editId: "e2", editClass: "DELETE_TEXT", sourceText: "Structure and voice", authorityClass: "AUTHOR_DECISION_REQUIRED" }
  ]), /EDITORIAL_EDIT_AUTHORITY_NOT_GRANTED/);
  await assert.rejects(applyNativeEditorialPlan(source, [
    { editId: "e3", editClass: "EDITOR_COMMENT", anchor: "Please clarify the intended audience.", commentText: "Ask about the author decision.", authorityClass: "AUTHOR_DECISION_REQUIRED" }
  ]), /EDITORIAL_COMMENT_AUTHORITY_NOT_GRANTED/);
  await assert.rejects(applyNativeEditorialPlan(source, [
    { editId: "e4", editClass: "AUTHOR_QUESTION", anchor: "Please clarify the intended audience.", commentText: "The AI model needs a response.", authorityClass: "AUTHOR_DECISION_REQUIRED" }
  ]), /EDITORIAL_AUTHOR_PROJECTION_FAILED/);
});
