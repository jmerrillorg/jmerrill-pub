"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const JSZip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
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
        new Paragraph({ children: [new TextRun({ text: "A final ", bold: true }), new TextRun({ text: "sentence split ", italics: true }), new TextRun("across runs.")] }),
        new Paragraph({ children: [new TextRun({ text: "Line with a preserved break", break: 1 })] }),
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

test("an exact full-paragraph prefix retains split source runs and rejects ambiguous or replayed anchors", async () => {
  const source = await fixture();
  const edit = { editId: "prefix", editClass: "INSERT_TEXT", anchor: "A final sentence split across runs.", anchorScope: "PARAGRAPH", insertPosition: "BEFORE", proposedText: "\u2610 ", authorityClass: "SYSTEM_AUTHORIZED_EDIT" };
  const result = await applyNativeEditorialPlan(source, [edit]);
  const parse = async (buffer) => new DOMParser().parseFromString(await part(buffer, "word/document.xml"), "application/xml");
  const before = await parse(source), after = await parse(result.buffer);
  const original = Array.from(before.getElementsByTagNameNS(W, "p")).find((p) => p.textContent === edit.anchor);
  const changed = Array.from(after.getElementsByTagNameNS(W, "p")).find((p) => p.textContent === "\u2610 " + edit.anchor);
  const serializer = new XMLSerializer();
  const insertion = changed.getElementsByTagNameNS(W, "ins")[0];
  assert.equal(insertion.textContent, "\u2610 ");
  changed.removeChild(insertion);
  assert.equal(serializer.serializeToString(changed), serializer.serializeToString(original));
  await assert.rejects(applyNativeEditorialPlan(result.buffer, [edit]), /EDITORIAL_PARAGRAPH_ANCHOR_NOT_FOUND/);
  await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, anchor: "final sentence" }]), /EDITORIAL_PARAGRAPH_ANCHOR_NOT_FOUND/);
  await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, insertPosition: "AFTER" }]), /EDITORIAL_PARAGRAPH_INSERT_MODE_INVALID/);
  const duplicate = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph(edit.anchor), new Paragraph(edit.anchor)] }] }));
  await assert.rejects(applyNativeEditorialPlan(duplicate, [edit]), /EDITORIAL_ANCHOR_AMBIGUOUS/);
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
  await assert.rejects(applyNativeEditorialPlan(source, [
    { editId: "e5", editClass: "REPLACE_TEXT", sourceText: "Line with a preserved break", proposedText: "Changed line", authorityClass: "SYSTEM_AUTHORIZED_EDIT" }
  ]), /EDITORIAL_ANCHOR_COMPLEX_RUN/);
});

test("tracked heading spacing and a checkbox prefix preserve all eight grids and unrelated package parts", async () => {
  const source = await fixture();
  const result = await applyNativeEditorialPlan(source, [
    { editId: "format", editClass: "FORMAT_PARAGRAPH", anchor: "Structure and voice", paragraphProperties: { spacingBefore: 240, spacingAfter: 120, keepNext: true }, authorityClass: "SYSTEM_AUTHORIZED_EDIT" },
    { editId: "checkbox", editClass: "INSERT_TEXT", anchor: "Keep the author's intent here.", insertPosition: "BEFORE", proposedText: "\u2610 ", authorityClass: "SYSTEM_AUTHORIZED_EDIT" }
  ], { timestamp: "2026-10-04T00:00:00.000Z" });
  const before = new DOMParser().parseFromString(await part(source, "word/document.xml"), "application/xml");
  const after = new DOMParser().parseFromString(await part(result.buffer, "word/document.xml"), "application/xml");
  const serializer = new XMLSerializer();
  const tables = (doc) => Array.from(doc.getElementsByTagNameNS(W, "tbl")).map((t) => serializer.serializeToString(t));
  assert.equal(tables(before).length, 8);
  assert.deepEqual(tables(after), tables(before));
  const heading = Array.from(after.getElementsByTagNameNS(W, "p")).find((p) => p.textContent === "Structure and voice");
  const props = heading.getElementsByTagNameNS(W, "pPr")[0];
  assert.equal(props.getElementsByTagNameNS(W, "spacing")[0].getAttributeNS(W, "before"), "240");
  assert.equal(props.getElementsByTagNameNS(W, "keepNext")[0].getAttributeNS(W, "val"), "1");
  const change = props.getElementsByTagNameNS(W, "pPrChange")[0];
  assert.equal(change.getAttributeNS(W, "author"), "J Merrill Publishing");
  const oldHeading = Array.from(before.getElementsByTagNameNS(W, "p")).find((p) => p.textContent === "Structure and voice");
  assert.equal(serializer.serializeToString(change.firstChild), serializer.serializeToString(oldHeading.firstChild));
  assert.ok(Array.from(after.getElementsByTagNameNS(W, "p")).some((p) => p.textContent === "\u2610 Keep the author's intent here."));
  assert.equal(after.getElementsByTagNameNS(W, "del").length, 0);
  assert.equal(result.trackedRevisionCount, 2);
  const beforeZip = await JSZip.loadAsync(source), afterZip = await JSZip.loadAsync(result.buffer);
  assert.deepEqual(Object.keys(afterZip.files), Object.keys(beforeZip.files));
  for (const [name, entry] of Object.entries(beforeZip.files)) {
    if (entry.dir || name === "word/document.xml") continue;
    assert.deepEqual(await afterZip.file(name).async("nodebuffer"), await entry.async("nodebuffer"), name);
  }
});

test("paragraph formatting rejects unsupported properties, partial anchors, grids and repeated formatting", async () => {
  const source = await fixture();
  const edit = { editId: "format", editClass: "FORMAT_PARAGRAPH", anchor: "Structure and voice", paragraphProperties: { keepNext: true }, authorityClass: "SYSTEM_AUTHORIZED_EDIT" };
  for (const props of [{}, [], { pStyle: "Heading1" }, { spacingBefore: -1 }, { spacingAfter: 721 }, { keepNext: "true" }]) {
    await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, paragraphProperties: props }]), /EDITORIAL_PARAGRAPH_PROPERTIES_INVALID/);
  }
  await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, anchor: "Structure" }]), /EDITORIAL_PARAGRAPH_ANCHOR_NOT_FOUND/);
  await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, anchor: "Grid 1 value" }]), /EDITORIAL_PARAGRAPH_COMPLEX_STRUCTURE/);
  await assert.rejects(applyNativeEditorialPlan(source, [{ ...edit, authorityClass: "PUBLISHER_DECISION_REQUIRED" }]), /EDITORIAL_EDIT_AUTHORITY_NOT_GRANTED/);
  const once = await applyNativeEditorialPlan(source, [edit]);
  await assert.rejects(applyNativeEditorialPlan(once.buffer, [edit]), /EDITORIAL_PARAGRAPH_EXISTING_REVISION/);
  await assert.rejects(applyNativeEditorialPlan(source, [{ editId: "prefix", editClass: "INSERT_TEXT", anchor: "Structure and voice", proposedText: "prefix", insertPosition: "UNKNOWN", authorityClass: "SYSTEM_AUTHORIZED_EDIT" }]), /EDITORIAL_INSERT_POSITION_INVALID/);
});
