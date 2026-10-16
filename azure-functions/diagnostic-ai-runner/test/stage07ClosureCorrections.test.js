"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const corrections=require("../src/editorial/stage07ApprovedCorrections");
test("embedded review findings are recovered and cannot disappear from package gating",()=>{
  const output={ledger:'Reviewed.</ledger><parameter name="questions">["Confirm source?"]</parameter><parameter name="blockingFindings">["Missing source"]</parameter>',questions:[],blockingFindings:[]};
  const recovered=corrections.recoverLedger(output);
  assert.deepEqual(recovered.questions,["Confirm source?"]);
  assert.deepEqual(recovered.blockingFindings,["Missing source"]);
  assert.equal(output.blockingFindings.length,0);
  assert.equal(corrections.findings([{id:"t",pass:"FINAL_SYNTHESIS"}],new Map([["t",{output}]]),{resolvedFindings:[]}).unresolved.length,1);
});
test("unrecognized source or wrong paragraph custody cannot adopt approved corrections",()=>{
  assert.throws(()=>corrections.apply({sourceSha256:"a".repeat(64)},["source"],[{index:0,text:"source"}]),/SOURCE_CONFLICT/);
  const policy=require("../config/stage07-approved-corrections.json");
  for(const c of policy.components)assert.throws(()=>corrections.apply(c,[],[]),/SOURCE_CONFLICT/);
  for(const c of policy.components){
    assert.equal(new Set(c.actions.map(a=>a.index)).size,c.actions.length);
    for(const a of c.actions){assert.ok(a.index>=0&&a.index<c.paragraphCount);assert.match(a.sourceParagraphSha256,/^[a-f0-9]{64}$/);}
  }
});
