"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const bound = require("../src/editorial/stage07CostBound"), budget = require("../src/editorial/stage07BatchBudget");
const provider = require("../src/model/providers/microsoftFoundryClaudeProvider");
const authority = {model:"claude-sonnet-5",modelVersion:"2",deploymentName:"jm1-editorial-devline-primary",sku:"GlobalStandard",
  inputMicroUsdPerToken:2,outputMicroUsdPerToken:10,tariffVerified:true,current:true,contextTokens:1000000,maxProviderRetries:0,allowFallback:false};
const request = () => provider.buildRequestBody(JSON.stringify({pass:"EDIT",source:"Synthetic source"}),
  {deploymentName:authority.deploymentName,promptVersion:"JMP-STAGE07-BUDGETED-V1"});
const hash = "a".repeat(64);
function fixture() {
  let value = budget.createState({approvalReference:"test",planSha256:hash,taskIds:Array.from({length:30},(_,i)=>String(i))}), version=0;
  const quote=bound.quote(request(),authority);
  value.version=1;
  value.attempts.push({id:"old",taskId:"0",requestSha256:quote.requestSha256,reservedMicroUsd:99024,status:"RESERVED"});
  return {quote,store:{read:async()=>({value:structuredClone(value),etag:version}),
    compareAndSwap:async(etag,next)=>{if(etag!==version)return false;value=structuredClone(next);version++;return true;}}};
}
test("documented entire context bounds billing independently of token-count estimates",()=>{
  const q=bound.quote(request(),authority); assert.equal(q.maximumMicroUsd,2081920);
  assert.equal(q.inputTokenBound,1000000); assert.equal(q.maxOutputTokens,8192);
  assert.equal(bound.quote(request(),{...authority,estimatedInputTokens:1}).maximumMicroUsd,q.maximumMicroUsd);
});
test("every unpriced or altered request feature is rejected",()=>{
  for(const mutate of [r=>r.cache_control={type:"ephemeral"},r=>r.tools.push({type:"web_search_20250305"}),
    r=>r.messages.push({role:"assistant",content:"extra turn"}),r=>r.max_tokens=128000,r=>r.model="other",
    r=>r.messages[0].cache_control={type:"ephemeral"},r=>r.output_config.effort="high",r=>r.stream=true]){
    const r=request();mutate(r);assert.throws(()=>bound.quote(r,authority),/COST_REQUEST_INVALID/);
  }
  for(const extra of [{modelVersion:"3"},{contextTokens:200000},{inputMicroUsdPerToken:3},{tariffVerified:false},{maxProviderRetries:1},{allowFallback:true}]){
    assert.throws(()=>bound.quote(request(),{...authority,...extra}),/COST_AUTHORITY_INVALID/);
  }
});
test("retrospective supplement preserves reservation, unknown status, task identity and attempt count",async()=>{
  const f=fixture(); const input={id:"old",request:request(),authority};
  assert.equal((await budget.reconcileBound(f.store,input)).dispatch,false);
  assert.equal((await budget.reconcileBound(f.store,input)).replay,true);
  const state=(await f.store.read()).value;
  assert.equal(state.attempts.length,1);assert.equal(state.attempts[0].reservedMicroUsd,99024);
  assert.equal(state.version,2);assert.equal(state.reservationMigration.fromVersion,1);
  assert.match(state.reservationMigration.preimageSha256,/^[a-f0-9]{64}$/);
  assert.equal(state.attempts[0].status,"RESERVED");assert.equal(state.attempts[0].actualMicroUsd,undefined);
  assert.equal(budget.exposure(state),2081920);
  const wrong=request();wrong.messages[0].content=JSON.stringify({pass:"EDIT",source:"different"});
  await assert.rejects(budget.reconcileBound(f.store,{...input,request:wrong}),/CONFLICT/);
});
test("unknown legacy bound blocks fresh dispatch until reconciled, then independent tasks may proceed",async()=>{
  const f=fixture(),input={id:"new",taskId:"1",planSha256:hash,requestSha256:f.quote.requestSha256,
    maxMicroUsd:f.quote.maximumMicroUsd,bound:f.quote,requireVerifiedBounds:true};
  await assert.rejects(budget.reserve(f.store,input),/LEGACY_BOUND/);
  await budget.reconcileBound(f.store,{id:"old",request:request(),authority});
  assert.equal((await budget.reserve(f.store,input)).dispatch,true);
  await assert.rejects(budget.reserve(f.store,{...input,id:"retry-old",taskId:"0"}),/UNRESOLVED/);
  assert.equal((await f.store.read()).value.attempts.length,2);
});
test("concurrent full-context reservations including unknown hold stop before USD50",async()=>{
  const f=fixture();await budget.reconcileBound(f.store,{id:"old",request:request(),authority});
  const results=await Promise.allSettled(Array.from({length:29},(_,i)=>budget.reserve(f.store,{id:String(i+1),taskId:String(i+1),
    planSha256:hash,requestSha256:f.quote.requestSha256,maxMicroUsd:f.quote.maximumMicroUsd,bound:f.quote,requireVerifiedBounds:true})));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,23);
  assert.equal(budget.exposure((await f.store.read()).value),24*2081920);
  assert.ok(budget.exposure((await f.store.read()).value)<=50000000);
});
test("eight spent additional attempts survive restart with exactly four left",async()=>{
  const f=fixture();await budget.reconcileBound(f.store,{id:"old",request:request(),authority});
  for(let i=0;i<13;i++){
    await budget.reserve(f.store,{id:`retry-${i}`,taskId:"1",planSha256:hash,requestSha256:f.quote.requestSha256,
      maxMicroUsd:f.quote.maximumMicroUsd,bound:f.quote,requireVerifiedBounds:true});
    await budget.settle(f.store,{id:`retry-${i}`,actualMicroUsd:100,receiptReference:`receipt-${i}`,outcome:"FAILED"});
    if(i===8){const s=(await f.store.read()).value;assert.equal(s.attempts.length-new Set(s.attempts.map(a=>a.taskId)).size,8);}
  }
  await assert.rejects(budget.reserve(f.store,{id:"thirteenth-extra",taskId:"1",planSha256:hash,requestSha256:f.quote.requestSha256,
    maxMicroUsd:f.quote.maximumMicroUsd,bound:f.quote,requireVerifiedBounds:true}),/RETRY_LIMIT/);
});
test("lossless consistency encoding preserves all originals and exact proposed differences",()=>{
  const p=require("../src/editorial/stage07PromptPlan"),text="First paragraph.\n\nSecond paragraph.",span=p.componentPlan(text).consistency.chunks[0];
  const evidence=[{paragraphs:[{index:0,text:"First paragraph."},{index:1,text:"Revised second paragraph."}]}];
  const rows=p.comparisonParagraphs(text,span,evidence);
  assert.deepEqual(rows,[{index:0,original:"First paragraph.",proposedEqualsOriginal:true},
    {index:1,original:"Second paragraph.",proposedEqualsOriginal:false,proposed:"Revised second paragraph."}]);
  assert.throws(()=>p.comparisonParagraphs(text,span,[{paragraphs:evidence[0].paragraphs.slice(1)}]),/COVERAGE/);
  assert.throws(()=>p.comparisonParagraphs(text,span,[{paragraphs:[evidence[0].paragraphs[0],evidence[0].paragraphs[0]]}]),/COVERAGE/);
});
test("original plan and saved-result identity remain unchanged",()=>{
  const rt=require("../src/lifecycle/newSubmissionStage07");
  assert.equal(rt.planSha,"3e10ccdf20a07108e6169d23fb667c70afae9cda2204ca49c76fc3a29bfe0b0e");
  assert.equal(rt.policy.sources.flatMap(rt.tasks).length,987);
});
test("an unresolved edit blocks only itself and dependent reviews, not the next independent edit",()=>{
  const rt=require("../src/lifecycle/newSubmissionStage07"),p=require("../src/editorial/stage07PromptPlan");
  const source=rt.policy.sources[1],text=Array.from({length:5},(_,i)=>Array(600).fill(`paragraph${i}`).join(" ")).join("\n\n");
  const prepared={source,working:{text},plan:p.componentPlan(text)},all=rt.tasks(source);
  const root=`${source.sourceSha256}/PLAN_SYNTHESIS/${p.hierarchy(source.planningCalls).length-1}-0`;
  const results=new Map([[root,{output:{ledger:"Existing whole-work brief",questions:[],blockingFindings:[]}}]]);
  const edits=all.filter(t=>t.pass==="EDIT").slice(0,2),ledger={attempts:[{taskId:edits[0].id,status:"RESERVED"}]};
  assert.equal(rt.nextEligibleTask(prepared,edits,results,ledger).id,edits[1].id);
  const review=all.find(t=>t.pass==="CONSISTENCY_SECTION");
  assert.equal(rt.nextEligibleTask(prepared,[review],results,ledger),null);
  assert.equal(rt.nextEligibleTask(prepared,edits,new Map(),ledger),null);
});
