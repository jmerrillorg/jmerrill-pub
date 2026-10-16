"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),p=require("../src/editorial/editorialConsultationPolicy");
const review={purpose:"EDITORIAL_CONSULTATION",titleId:"title",stageId:"stage07",version:"v3",
 authorContactId:"author",authorEmail:"author@example.test",sourceHashes:["a".repeat(64)],
 attachments:[{itemId:"item",version:"v3",sha256:"b".repeat(64)}],questions:[{id:"ebook",options:["ANNUAL","QUARTERLY"]}]};
const proof={authenticated:true,authorContactId:"author",authorEmail:"author@example.test",sourceReference:"message:original",method:"VERIFIED_AUTHOR_CORRESPONDENCE"};
const reply={reviewHash:p.validate(review),titleId:"title",stageId:"stage07",version:"v3",messageId:"message",receivedAt:"2026-10-16T16:00:00Z",questionId:"ebook",choice:"ANNUAL"};
test("editorial choice is version bound and replay stable, never stage completion",()=>{
 const a=p.recordDecision(review,reply,proof);assert.deepEqual(a,p.recordDecision(review,reply,proof));
 assert.equal(a.stageCompletionApproved,false);assert.equal(a.nextStageAuthorized,false);
 assert.equal(p.workEligibility(review,{kind:"DEPENDENT_EDITORIAL_CHANGE",questionIds:["ebook"]},[a]).ok,true);
});
test("silence holds only dependent work",()=>{
 assert.equal(p.workEligibility(review,{kind:"ROUTINE_SOURCE_SUPPORTED"},[]).ok,true);
 assert.equal(p.workEligibility(review,{kind:"DEPENDENT_EDITORIAL_CHANGE",questionIds:["ebook"]},[]).ok,false);
 assert.equal(p.workEligibility(review,{},[]).ok,false);
});
test("stale versions, wrong authors and unspecified choices fail closed",()=>{
 for(const change of [{version:"v2"},{titleId:"other"},{stageId:"stage08"},{reviewHash:"x"}])
  assert.throws(()=>p.recordDecision(review,{...reply,...change},proof),/STALE_OR_MISMATCHED/);
 assert.throws(()=>p.recordDecision(review,reply,{...proof,authenticated:false}),/AUTHOR_AUTHORITY/);
 assert.throws(()=>p.recordDecision(review,{...reply,choice:"APPROVE EVERYTHING"},proof),/CHOICE_REQUIRES/);
 const a=p.recordDecision(review,reply,proof),newReview={...review,version:"v4"};
 assert.equal(p.workEligibility(newReview,{kind:"DEPENDENT_EDITORIAL_CHANGE",questionIds:["ebook"]},[a]).ok,false);
});
