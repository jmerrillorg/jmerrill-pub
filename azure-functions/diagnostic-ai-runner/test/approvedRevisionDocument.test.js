"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } = require("docx");
const JSZip = require("jszip");
const { DIMENSIONS, deriveApprovedFormattingPlan, produceApprovedFormattingRevision, hash } = require("../src/editorial/approvedRevisionDocument");
const { binding } = require("./fixtures/approvedRevisionSkill");
const derive = (bytes) => deriveApprovedFormattingPlan(bytes, binding(hash(bytes)));

async function fixture(change = (x) => x) {
  const children = [];
  for (const d of DIMENSIONS) {
    for (const heading of [`Characteristics of ${d} Wholeness`, `Signs ${d} Wholeness May Need Attention`, `Core Components of ${d} Wholeness`]) {
      children.push(new Paragraph({ text: change(heading), heading: "Heading2" }), new Paragraph(`Body for ${heading}.`));
    }
    children.push(new Paragraph({ children: [new TextRun({ text: `The final ${d} `, bold: true }), new TextRun({ text: "sentence ", italics: true }), new TextRun("keeps its formatting.")] }));
    children.push(new Paragraph("Reflection Questions"), new Paragraph("What is next?"), new Paragraph(`Practices That Build ${d} Wholeness`));
    children.push(new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph(`${d} grid value`)] })] })] }));
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

test("bounded recipe changes only 32 heading properties and eight split-run checkbox prefixes", async () => {
  const source = await fixture();
  const out = await produceApprovedFormattingRevision(source, { sourceSha256: hash(source), timestamp: "2026-10-04T08:00:00.000Z", editorialAuthority: binding(hash(source)) });
  assert.equal(out.evidence.headingFormats, 32);
  assert.equal(out.evidence.checkboxInsertions, 8);
  assert.equal(out.evidence.preservedGridHashes.length, 8);
  assert.equal(out.evidence.visualQa, "REQUIRED");
  const r = await (await JSZip.loadAsync(out.review)).file("word/document.xml").async("string");
  const c = await (await JSZip.loadAsync(out.clean)).file("word/document.xml").async("string");
  assert.equal((r.match(/<w:ins /g) || []).length, 8);
  assert.equal((r.match(/<w:pPrChange /g) || []).length, 32);
  assert.equal((c.match(/<w:ins /g) || []).length, 0);
  assert.equal((c.match(/<w:pPrChange /g) || []).length, 0);
  assert.equal((c.match(/\u2610/g) || []).length, 8);
  assert.equal(out.evidence.editorialAuthority.skill, "jm1-publishing-editorial");
  assert.equal(out.evidence.planSha256, hash(JSON.stringify(out.evidence.plan)));
  await assert.rejects(derive(out.review), /REVISION_SOURCE_STRUCTURE_UNSUPPORTED/);
  await assert.rejects(derive(out.clean), /REVISION_FINAL_SENTENCE_AMBIGUOUS/);
});

test("bounded recipe denies altered source, missing headings and out-of-order sections", async () => {
  const source = await fixture();
  await assert.rejects(produceApprovedFormattingRevision(source, { sourceSha256: "0".repeat(64), timestamp: new Date().toISOString() }), /REVISION_SOURCE_BINDING_INVALID/);
  await assert.rejects(derive(await fixture((h) => h.replace("Characteristics of Mental", "Other Mental"))), /REVISION_SECTION_NOT_UNIQUE/);
  await assert.rejects(derive(await fixture((h) => h.replace("Characteristics of Mental", "Characteristics of Spiritual"))), /REVISION_SECTION_NOT_UNIQUE/);
});

test("producer cannot execute with generic guides, absent skill, unrelated title or another stage", async () => {
  const source = await fixture();
  for (const b of [undefined, { chosenStyleGuide: "CMOS" }, { ...binding(hash(source)), titleId: "other" },
    { ...binding(hash(source)), stageId: "other" }, { ...binding(hash(source)), doctrine: "LINE_EDITING" },
    { ...binding(hash(source)), genericFallback: true }]) {
    await assert.rejects(produceApprovedFormattingRevision(source, { sourceSha256: hash(source), timestamp: new Date().toISOString(), editorialAuthority: b }), /REVISION_CUSTOM_SKILL/);
  }
});

module.exports = { fixture };
