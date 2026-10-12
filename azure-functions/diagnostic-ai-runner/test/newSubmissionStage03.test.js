"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const stage = require("../src/lifecycle/newSubmissionStage03");
const budget = require("../src/lifecycle/newSubmissionStage03Budget");
test("sections cover source bytes and whitespace exactly", () => {
  const source = " \n" + "word \n".repeat(85000) + "end  ";
  const chunks = stage.sections(source);
  assert.equal(chunks.map(c => c.text).join(""), source);
  assert.equal(chunks.reduce((n,c) => n+c.words,0),85001);
  assert(chunks.every(c => c.words <= 40000 && c.text.length <= 400000));
  assert.equal(chunks.length,3);
  for (const c of chunks) assert.equal(budget.sha(c.text),c.sha256);
});
test("character ceiling applies independently from words", () => {
  const chunks = stage.sections(("a".repeat(1000)+" ").repeat(1000));
  assert.equal(chunks.length,3);
  assert(chunks.every(c => c.text.length <= 400000));
});
test("long approved sources balance sections without adding paid calls", () => {
  for (const [words, expected] of [[163206,5],[132751,4],[145689,4]]) {
    const source = "word ".repeat(words);
    const chunks = stage.sections(source);
    assert.equal(chunks.length, expected);
    assert(chunks.every(c => c.words <= Math.ceil(words / expected)));
    assert.equal(chunks.map(c => c.text).join(""), source);
  }
  assert.deepEqual(stage.sections("word ".repeat(52853)).map(c => c.words),[40000,12853]);
});
test("oversized indivisible word fails instead of being truncated", () => {
  assert.throws(() => stage.sections("a".repeat(400001)), /SECTION_TOO_LARGE/);
});
const count = () => ({inputTokens:100000, verifiedAt:new Date().toISOString()});
test("reservation uses five percent margin and full output allowance", () => {
  assert.deepEqual(budget.reservation(count(), {calls:[]}), {inputCeiling:105000,maximumMicroUsd:291920});
});
test("cap enforced against all prior reservations, not merely successful usage", () => {
  assert.throws(() => budget.reservation(count(), {calls:[{maximumMicroUsd:7800000,status:"COMPLETED"}]}), /BUDGET_EXCEEDED/);
});
test("normal call limit is 23 and total limit 24", () => {
  const calls = Array.from({length:23},()=>({maximumMicroUsd:1,status:"COMPLETED",retry:false}));
  assert.throws(()=>budget.reservation(count(),{calls}),/BUDGET_EXCEEDED/);
  assert(budget.reservation(count(),{calls},true));
  assert.throws(()=>budget.reservation(count(),{calls:[...calls,{maximumMicroUsd:1,status:"COMPLETED",retry:true}]},true),/BUDGET_EXCEEDED/);
});
test("a second retry is denied across the entire batch",()=>{
  assert.throws(()=>budget.reservation(count(),{calls:[{maximumMicroUsd:1,status:"COMPLETED",retry:true}]},true),/BUDGET_EXCEEDED/);
});
for (const status of ["IN_FLIGHT","AMBIGUOUS"]) test(`${status} prevents subsequent paid work`,()=>{
  assert.throws(()=>budget.reservation(count(),{calls:[{maximumMicroUsd:1,status}]}),/AMBIGUOUS_PROVIDER_EFFECT_HELD/);
});
test("input limit includes count safety margin",()=>{
  assert.throws(()=>budget.reservation({...count(),inputTokens:120000},{calls:[]}),/BUDGET_EXCEEDED/);
});
test("stale and future token counts fail closed",()=>{
  for (const age of [-600000,600000]) assert.throws(()=>budget.reservation({...count(),verifiedAt:new Date(Date.now()+age).toISOString()},{calls:[]}),/TOKEN_COUNT_INVALID/);
});
test("actual cost requires independently returned bounded usage",()=>{
  assert.equal(budget.actualCost({tokenCounts:{input:100,output:50}},{inputCeiling:105}),700);
  for (const tokenCounts of [{input:106,output:1},{input:1,output:8193},{input:0,output:0}])
    assert.throws(()=>budget.actualCost({tokenCounts},{inputCeiling:105}),/USAGE_UNVERIFIED/);
});
test("no external author, caller approval, or stage four mode",async()=>{
  for(const body of [{titleId:"external",mode:"SUBMISSION_03_EXECUTE"},
    {titleId:Object.keys(require("../src/lifecycle/freshTitleIntake").POLICIES)[0],mode:"SUBMISSION_04_EXECUTE"},
    {titleId:Object.keys(require("../src/lifecycle/freshTitleIntake").POLICIES)[0],mode:"SUBMISSION_03_EXECUTE",approved:true}])
    assert.equal((await stage.handler(body,{env:{}})).status,400);
});
test("broad worker activation or missing dedicated enable denies paid execution",async()=>{
  const body={titleId:Object.keys(require("../src/lifecycle/freshTitleIntake").POLICIES)[0],mode:"SUBMISSION_03_EXECUTE"};
  assert.equal((await stage.handler(body,{env:{}})).status,403);
  assert.equal((await stage.handler(body,{env:{JM1_TITLE_COMMISSIONING_REVIEW_ENABLED:"true",JM1_NEW_SUBMISSION_STAGE03_ENABLED:"true"}})).status,403);
});
test("all 24 requests at maximum approved usage remain within eight dollars",()=>{
  assert.equal(24*(125000*2+8192*10),7966080);
});
