"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), { createHash } = require("node:crypto");
const { assemble } = require("../src/editorial/stage07Package");
const hash = x => createHash("sha256").update(x).digest("hex");
function fixture() {
  const text = "Original paragraph.";
  return { source: { title: "Synthetic", titleId: "synthetic", sourceSha256: hash(text), sourceTextSha256: hash(text) },
    original: Buffer.from(text), working: { text, provenance: { name: "synthetic.md" } },
    plan: { editing: { paragraphs: [{ index: 0, start: 0, end: text.length }] } },
    planSha256: "a".repeat(64), tasks: [{ id: "edit", pass: "EDIT" }, { id: "final", pass: "FINAL_SYNTHESIS" }],
    results: new Map([["edit", { taskId: "edit", receiptPath: "edit-receipt", outputSha256: "b".repeat(64), output: {
      paragraphs: [{ index: 0, text: "Revised paragraph." }], memo: "A synthetic revision.", questions: [] } }],
      ["final", { receiptPath: "final-receipt", outputSha256: "c".repeat(64), output: { ledger: "Synthetic complete review.", questions: [], blockingFindings: [] } }]]) };
}
test("complete source-bound package is replayable but requires rendering acceptance", async () => {
  const input = fixture(), result = await assemble(input), replay = await assemble(input);
  assert.deepEqual(result, replay);
  assert.equal(result.manifest.stage07Complete, false);
  assert.equal(result.manifest.stage08, "NOT_STARTED");
  assert.equal(result.manifest.files.length, 7);
  assert.equal(result.manifest.changedParagraphs, 1);
});
test("missing tasks, consistency defects and all-unchanged output cannot become packages", async () => {
  let input = fixture(); input.results.delete("final");
  await assert.rejects(assemble(input), /INCOMPLETE/);
  input = fixture(); input.results.get("final").output.blockingFindings.push("Omission");
  await assert.rejects(assemble(input), /CONSISTENCY_HOLD/);
  input = fixture(); input.results.get("edit").output.paragraphs[0].text = input.working.text;
  await assert.rejects(assemble(input), /UNCHANGED_COMPONENT/);
});
