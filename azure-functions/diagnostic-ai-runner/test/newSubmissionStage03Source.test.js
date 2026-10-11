"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const stage02 = require("../src/lifecycle/newSubmissionStage02");
const { consumeWorkingSource } = require("../src/lifecycle/newSubmissionStage03Source");
const driveId = require("../src/lifecycle/freshTitleIntake").driveId;
const hash = b => createHash("sha256").update(b).digest("hex");
async function fixture(docx = false) {
  let source = Buffer.from("# Exact working manuscript\n\nAuthor text.");
  const name = docx ? "Source.docx" : "Source.md";
  if (docx) {
    const zip = new (require("jszip"))();
    zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Exact author text.</w:t></w:r></w:p></w:body></w:document>');
    source = await zip.generateAsync({ type: "nodebuffer" });
  }
  const stored = docx ? await stage02.packWorkingSource(source, name) : source;
  const storedName = docx ? name + ".working-source.zip" : name;
  const output = { role: "EDITORIAL_WORKING_SOURCE", itemId: "one", driveId, eTag: "v1", bytes: stored.length,
    sha256: hash(stored), sourceBytes: source.length, sourceSha256: hash(source),
    path: "/01_Pipeline_A-Z/02 - Intake/Title/" + storedName,
    ...(docx ? { packaging: "ZIP_SINGLE_SOURCE_V1", entryName: name } : {}) };
  let reads = 0;
  const deps = { graph: async () => ({ file: {}, name: storedName, eTag: "v1", size: stored.length,
    parentReference: { driveId, path: "/drives/x/root:/01_Pipeline_A-Z/02 - Intake/Title" } }),
    sourceBytes: async () => { reads++; return stored; } };
  return { output, deps, source, stored, reads: () => reads };
}
test("Stage03 extracts exact DOCX from accepted envelope without assembly or effects", async () => {
  const x = await fixture(true), r = await consumeWorkingSource(x.output, x.deps);
  assert.match(r.text, /Exact author text/); assert.equal(r.provenance.sourceSha256, hash(x.source));
  assert.equal(r.provenance.assembly, "SEPARATE_COMPONENT"); assert.equal(x.reads(), 2);
});
test("Stage03 consumes exact Markdown working source", async () => {
  const x = await fixture(), r = await consumeWorkingSource({ ...x.output, packaging: "NONE" }, x.deps);
  assert.equal(r.text, x.source.toString());
});
test("Stage03 rejects source hash mismatch and non-working roles", async () => {
  const x = await fixture();
  await assert.rejects(consumeWorkingSource({ ...x.output, sourceSha256: "0".repeat(64) }, x.deps), /STAGE03_SOURCE_HASH_MISMATCH/);
  await assert.rejects(consumeWorkingSource({ ...x.output, role: "ORIGINAL_AUTHOR_SUBMISSION" }, x.deps), /STAGE03_WORKING_SOURCE_REQUIRED/);
});
test("Stage03 rejects bytes changed between custody verification and extraction", async () => {
  const x = await fixture(); let reads = 0;
  x.deps.sourceBytes = async () => ++reads === 1 ? x.stored : Buffer.from("changed");
  await assert.rejects(consumeWorkingSource(x.output, x.deps), /STAGE03_SOURCE_CHANGED_DURING_READ/);
});
test("Stage03 rejects inner entry scope and checksum drift", async () => {
  const x = await fixture(true);
  await assert.rejects(consumeWorkingSource({ ...x.output, entryName: "Other.docx" }, x.deps), /PACKAGE_SCOPE_CHANGED/);
  await assert.rejects(consumeWorkingSource({ ...x.output, sourceSha256: "0".repeat(64) }, x.deps), /PACKAGE_SOURCE_CHANGED/);
});
