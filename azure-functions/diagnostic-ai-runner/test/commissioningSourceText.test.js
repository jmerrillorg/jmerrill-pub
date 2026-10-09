"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { extractCommissioningSourceText: extract, sourceExtension } = require("../src/editorial/commissioningSourceText");
test("DOCX and legacy extraction retain the existing Mammoth text exactly", async () => {
  const { Document, Paragraph, Packer } = require("docx");
  const bytes = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Exact fixture text")] }] }));
  const expected = (await require("mammoth").extractRawText({ buffer: bytes })).value;
  assert.equal(await extract(bytes, { repositoryPath: "canonical/manuscript.docx" }), expected);
  assert.equal(await extract(bytes), expected);
  assert.equal(await extract(bytes, { repositoryPath: "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?sourcedoc=%7Bfixture%7D&file=Governed%20Title.docx&action=default&mobileredirect=true" }), expected);
});
test("governed SharePoint document URLs resolve the file parameter, not the viewer extension", () => {
  assert.equal(sourceExtension("https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?file=Governed%20Title.docx&action=default"), ".docx");
  assert.equal(sourceExtension("https://jmerrillfoundation.sharepoint.com/sites/publishing/manuscript.md?download=1"), ".md");
  for (const path of ["https://other.invalid/Doc.aspx?file=title.docx", "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx", "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?file=path%2Ftitle.docx"]) {
    assert.throws(() => sourceExtension(path), /FORMAT_HANDOFF_REQUIRED/);
  }
});
test("governed Markdown is preserved literally without executing or resolving content", async () => {
  const text = "# Title\n\n[reference](https://example.invalid)\n<script>fixture</script>\n```sh\nfixture\n```\n";
  const bytes = Buffer.from(text), before = Buffer.from(bytes);
  assert.equal(await extract(bytes, { repositoryPath: "canonical/manuscript.MD" }), text);
  assert.deepEqual(bytes, before);
});
test("Markdown rejects invalid UTF-8, binary controls and blank content", async () => {
  for (const bytes of [Buffer.from([0xff]), Buffer.from("text\0binary"), Buffer.from(" \n")]) {
    await assert.rejects(extract(bytes, { repositoryPath: "manuscript.md" }), /REVIEW_SOURCE_TEXT_/);
  }
});
test("Vellum and unsupported formats require an explicit governed extraction handoff", async () => {
  for (const extension of ["vellum", "pdf", "exe"]) await assert.rejects(
    extract(Buffer.from("not a DOCX"), { repositoryPath: `manuscript.${extension}` }), /FORMAT_HANDOFF_REQUIRED/);
});
test("a missing legacy path does not silently reinterpret bytes as Markdown", async () => {
  await assert.rejects(extract(Buffer.from("# manuscript")));
});
