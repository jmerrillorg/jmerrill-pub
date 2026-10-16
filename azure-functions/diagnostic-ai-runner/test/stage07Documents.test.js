"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { buildDocuments } = require("../src/editorial/stage07Documents");
test("inline Word breaks retain exact accepted extractor parity and original formatting", async () => {
  const {Document,Paragraph,TextRun,Packer}=require("docx");
  const original=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph({children:[new TextRun("Anchor:"),new TextRun({break:1,text:"Preserve this."})]})]}]}));
  const raw=(await require("mammoth").extractRawText({buffer:original})).value.trim();
  assert.equal(raw,"Anchor:Preserve this.");
  const result=await buildDocuments(original,"source.docx",[raw],[raw]);
  const zip=await require("jszip").loadAsync(result.review);
  assert.match(await zip.file("word/document.xml").async("string"),/<w:br\b/);
  assert.equal((await require("mammoth").extractRawText({buffer:result.edited})).value.trim(),raw);
  await assert.rejects(buildDocuments(original,"source.docx",["Anchor:Invented."],["Anchor:Invented."]),/SOURCE_PARITY/);
});
test("proposed and tracked-review Word files preserve exact paragraph coverage", async () => {
  const result = await buildDocuments(Buffer.from("Original one.\n\nOriginal two."), "source.md",
    ["Original one.", "Original two."], ["Revised one.", "Original two."]);
  const zip = await require("jszip").loadAsync(result.review);
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /w:delText/); assert.match(xml, /w:ins/);
  assert.equal((await require("mammoth").extractRawText({ buffer: result.edited })).value.trim(), "Revised one.\n\nOriginal two.");
  const replay = await buildDocuments(Buffer.from("Original one.\n\nOriginal two."), "source.md",
    ["Original one.", "Original two."], ["Revised one.", "Original two."]);
  assert.deepEqual(replay, result);
});
test("citation hyperlinks retain their relationship and ambiguous changed labels hold", async () => {
  const { Document, Paragraph, TextRun, ExternalHyperlink, Packer } = require("docx");
  const source = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ children: [
    new TextRun("See "), new ExternalHyperlink({ link: "https://example.org/source", children: [new TextRun("reference")] })] })] }] }));
  const result = await buildDocuments(source, "source.docx", ["See reference"], ["Consult reference"]);
  const zip = await require("jszip").loadAsync(result.edited);
  assert.match(await zip.file("word/document.xml").async("string"), /w:hyperlink/);
  assert.match(await zip.file("word/_rels/document.xml.rels").async("string"), /https:\/\/example.org\/source/);
  await assert.rejects(buildDocuments(source, "source.docx", ["See reference"], ["Consult a different citation"]), /CITATION_LINK/);
});
