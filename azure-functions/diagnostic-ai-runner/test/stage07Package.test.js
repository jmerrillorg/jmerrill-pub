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
  input = fixture(); input.results.get("edit").output.paragraphs[0].text = "Original  paragraph.";
  await assert.rejects(assemble(input), /UNCHANGED_COMPONENT/);
});
test("planning history is preserved while section and final consistency defects still hold", async () => {
  const input = fixture();
  input.tasks.unshift({ id: "plan", pass: "PLAN_SECTION" });
  input.results.set("plan", { output: { blockingFindings: ["Planning concern subsequently checked"], questions: [] } });
  const result = await assemble(input);
  assert.equal(JSON.parse(result.files["editorial-memo.json"]).planningFindings[0].findings[0], "Planning concern subsequently checked");
  input.tasks.push({ id: "section", pass: "CONSISTENCY_SECTION" });
  input.results.set("section", { output: { blockingFindings: ["Unresolved source omission"], questions: [] } });
  await assert.rejects(assemble(input), /CONSISTENCY_HOLD/);
});
test("quote-only differences cannot masquerade as substantive editing or alter saved proposals", async () => {
  const input=fixture(),text="The author's words: \u2018Don\u2019t invent.\u2019";
  input.original=Buffer.from(text);input.working.text=text;
  input.source.sourceSha256=hash(text);input.source.sourceTextSha256=hash(text);
  input.plan.editing.paragraphs=[{index:0,start:0,end:text.length}];
  input.results.get("edit").output.paragraphs[0].text="The author\u2019s words: 'Don't invent.'";
  const before=structuredClone(input.results.get("edit"));
  await assert.rejects(assemble(input),{message:"STAGE07_UNCHANGED_COMPONENT_REVIEW_REQUIRED",safeCode:"STAGE07_UNCHANGED_COMPONENT_REVIEW_REQUIRED"});
  assert.deepEqual(input.results.get("edit"),before);
  input.results.get("edit").output.paragraphs[0].text="The author's words: 'Never invent.'";
  const result=await assemble(input);assert.equal(result.manifest.stage07Complete,false);
});
