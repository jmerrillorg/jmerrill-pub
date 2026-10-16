"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), { createHash } = require("node:crypto");
const { restore } = require("../src/editorial/stage07SourceRestoration"), runtime = require("../src/lifecycle/newSubmissionStage07");
const { componentPlan } = require("../src/editorial/stage07PromptPlan");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
test("identical paid outputs reconcile complementary review evidence, never infer missing review", () => {
  const text="Exact first paragraph.\n\nExact second paragraph.",plan=componentPlan(text),task={id:"component/EDIT/0",pass:"EDIT",index:0};
  const prepared={source:{sourceSha256:"component"},working:{text},plan};
  const make=(id,indices)=>{
    const receipt={accepted:false,attemptId:id,taskId:task.id,planSha256:runtime.planSha,requestSha256:"request",result:{ok:true,stopReason:"tool_use",usageVerified:true,providerRequestId:id,model:runtime.policy.model,modelVersion:runtime.policy.modelVersion,inputTokens:100,outputTokens:100,output:{paragraphs:[{index:0,text:"Exact first paragraph."},{index:1,text:"Exact second paragraph."}],reviewedNoChange:indices,noChangeReason:"Explicitly reviewed retention.",memo:"Preserved opinion "+id,questions:["Question "+id]}}};
    return {receipt,prior:{id,taskId:task.id,status:"SETTLED",outcome:"FAILED",requestSha256:"request",actualMicroUsd:1200,receiptReference:`stage07-attempt:${id}:${hash(receipt)}`}};
  };
  const entries=[make("a",[0]),make("b",[1])],before=structuredClone(entries);
  const recovered=runtime.recoverIdenticalReviews(entries,prepared,task);
  assert.equal(recovered.newPaidAttempts,0);assert.equal(recovered.originalPaidMicroUsd,2400);
  assert.equal(runtime.validateOutput(recovered.sourceRestoration.output,task,plan,text),true);
  assert.deepEqual(recovered.sourceRestoration.output.questions,["Question a","Question b"]);
  assert.deepEqual(entries,before);
  assert.deepEqual(recovered,runtime.recoverIdenticalReviews(entries,prepared,task));
  assert.equal(runtime.recoverIdenticalReviews([make("a",[0]),make("b",[0])],prepared,task),null);
  assert.equal(runtime.recoverIdenticalReviews([entries[0],entries[0]],prepared,task),null);
  for(const mutate of [e=>e.prior.status="UNKNOWN",e=>e.prior.actualMicroUsd=0,e=>e.receipt.planSha256="wrong",e=>e.receipt.result.usageVerified=false,e=>e.prior.requestSha256="different",e=>e.receipt.result.output.paragraphs[0].text="Invented paragraph."]) {
    const changed=structuredClone(entries);mutate(changed[1]);assert.equal(runtime.recoverIdenticalReviews(changed,prepared,task),null);
  }
  const different=make("b",[1]);different.receipt.result.output.paragraphs[0].text="A different proposal.";different.prior.receiptReference=`stage07-attempt:b:${hash(different.receipt)}`;
  assert.equal(runtime.recoverIdenticalReviews([entries[0],different],prepared,task),null);
});
function fixture() {
  const text = "Original\u00a0source  words.\n\nPreserved second paragraph.", plan = componentPlan(text), task = { id: "component/EDIT/0", pass: "EDIT", index: 0 };
  const output = { paragraphs: [{ index: 0, text: "Original source words." }, { index: 1, text: "Preserved second paragraph." }],
    reviewedNoChange: [0, 1], noChangeReason: "Source wording is deliberately retained after review.", memo: "Retain these source paragraphs.", questions: [] };
  return { text, plan, task, output };
}
test("explicitly unchanged curly double quotes restore source, never words or attribution", () => {
  const text = 'He said \u201cKeep these exact words.\u201d', plan = componentPlan(text), task = {id:"component/EDIT/0",pass:"EDIT",index:0};
  const output = {paragraphs:[{index:0,text:'He said "Keep these exact words."'}],reviewedNoChange:[0],noChangeReason:"Retained after review.",memo:"Preserve the exact quotation.",questions:[]};
  const before = structuredClone(output), result = restore(output,task,plan,text);
  assert.equal(result.method,"EXACT_SOURCE_QUOTE_RESTORATION_V1");
  assert.equal(result.output.paragraphs[0].text,text);
  assert.equal(runtime.validateOutput(result.output,task,plan,text),true);
  assert.deepEqual(output,before);
  for(const changed of ['She said "Keep these exact words."','He said "Change these exact words."','He said Keep these exact words.']) {
    assert.equal(restore({...output,paragraphs:[{index:0,text:changed}]},task,plan,text),null);
  }
  assert.equal(restore({...output,reviewedNoChange:[]},task,plan,text),null);
});
test("only explicitly unchanged whitespace equivalents restore exact source bytes", () => {
  const f = fixture(), raw = structuredClone(f.output), result = restore(f.output, f.task, f.plan, f.text);
  assert.deepEqual(f.output, raw);
  assert.deepEqual(result.restored.map(p => p.index), [0]);
  assert.equal(runtime.validateOutput(result.output, f.task, f.plan, f.text), true);
  assert.equal(result.output.paragraphs[0].text, "Original\u00a0source  words.");
  f.output.paragraphs[0].text = "Invented source words.";
  assert.equal(restore(f.output, f.task, f.plan, f.text), null);
  assert.throws(() => runtime.validateOutput(f.output, f.task, f.plan, f.text), /PARAGRAPH_INVALID/);
  f.output = raw; f.output.reviewedNoChange = [1];
  assert.equal(restore(f.output, f.task, f.plan, f.text), null);
});
test("historical recovery binds paid receipt and is deterministic without rewriting its failed outcome", () => {
  const f = fixture(), prepared = { source: { sourceSha256: "component" }, working: { text: f.text }, plan: f.plan };
  const receipt = { accepted: false, attemptId: "attempt", taskId: f.task.id, planSha256: runtime.planSha, requestSha256: "request",
    result: { ok: true, stopReason: "tool_use", usageVerified: true, providerRequestId: "provider", model: runtime.policy.model,
      modelVersion: runtime.policy.modelVersion, inputTokens: 100, outputTokens: 100, output: f.output } };
  const prior = { id: "attempt", taskId: f.task.id, status: "SETTLED", outcome: "FAILED", requestSha256: "request",
    actualMicroUsd: 1200, receiptReference: `stage07-attempt:attempt:${hash(receipt)}` };
  const before = structuredClone({ prior, receipt });
  const result = runtime.recoverSourceWhitespace(prior, receipt, prepared, f.task);
  assert.equal(result.newPaidAttempts, 0); assert.equal(result.originalPaidMicroUsd, 1200);
  assert.deepEqual(result, runtime.recoverSourceWhitespace(prior, receipt, prepared, f.task));
  assert.deepEqual({ prior, receipt }, before);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, receiptReference: "wrong" }, receipt, prepared, f.task), null);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, status: "UNKNOWN" }, receipt, prepared, f.task), null);
  assert.equal(runtime.recoverSourceWhitespace({ ...prior, actualMicroUsd: 0 }, receipt, prepared, f.task), null);
});
