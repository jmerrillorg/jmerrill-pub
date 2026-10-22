"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const owner=require("../src/lifecycle/stage07DecisionRecovery"),mail=require("../src/lifecycle/publisherFundedStage04Mail"),stage=require("../src/lifecycle/stage07AuthorCorrespondence"),b=require("../src/lifecycle/newSubmissionStage03Budget");
test("decision recovery requires authenticated exact reply, text, reviewed action and version",()=>{
 const oldAuth=mail.authentication,oldValidate=stage.validate;
 try{
  mail.authentication=()=>({method:"TENANT_VERIFIED_INTERNAL_MAILBOX"});stage.validate=()=>"review";
  const message={internetMessageId:"<reply>",uniqueBody:{content:"Approved"},internetMessageHeaders:[{name:"In-Reply-To",value:"<reviewed>"}]};
  const pin={titleId:"title",replyKey:b.sha("<reply>"),authoredTextSha256:b.sha("Approved"),priorActionVersion:"exact"};
  const review={titleId:"title",version:"EDITORIAL-CONSULTATION-20261016-V5"};
  const binding={...review,editorialActionVersion:"exact",reviewHash:"review",internetMessageId:"<reviewed>"};
  const status={status:"AUTHOR_TEXT_REQUIRES_REVIEW"};owner.validate(pin,review,message,status,binding);
  for(const patch of [{titleId:"other"},{version:"stale"}])assert.throws(()=>owner.validate(pin,{...review,...patch},message,status,binding),/CONFLICT/);
  assert.throws(()=>owner.validate(pin,review,{...message,uniqueBody:{content:"Approved with exceptions"}},status,binding),/CONFLICT/);
  assert.throws(()=>owner.validate(pin,review,message,status,{...binding,editorialActionVersion:"other"}),/CONFLICT/);
  for(const value of ["AUTHENTICATION_REVIEW_REQUIRED","IDENTITY_OR_REVIEW_THREAD_MISMATCH"])assert.throws(()=>owner.validate(pin,review,message,{status:value},binding),/NOT_AUTHENTICATED/);
  mail.authentication=()=>({dmarc:"none"});assert.throws(()=>owner.validate(pin,review,message,status,binding),/NOT_AUTHENTICATED/);
 }finally{mail.authentication=oldAuth;stage.validate=oldValidate;}
});
test("completed decision replay returns its durable result without edits or sends",async()=>{
 const old=b.optional,result={status:"AUTHOR_DECISION_APPLIED_STAGE_HELD",stageCompletionApproved:false,nextStageAuthorized:false,paidCalls:0};
 try{b.optional=async()=>({value:result});assert.equal(await owner.execute({titleId:"t",replyKey:"r"},{},{},{containerClient:{}}),result);}finally{b.optional=old;}
});
test("five bounded decisions preserve separate titles and do not request stage completion",()=>{
 const rows=require("../config/stage07-october20-decisions.json");assert.equal(rows.length,5);assert.equal(new Set(rows.map(x=>x.titleId)).size,5);
 for(const row of rows){assert.match(row.replyKey,/^[a-f0-9]{64}$/);assert.match(row.authoredTextSha256,/^[a-f0-9]{64}$/);assert.ok(row.summary);}
 assert.equal(rows.find(x=>x.titleId.startsWith("e797")).choice,"PRINT_TRIM_7_BY_10");
 assert.equal(rows.find(x=>x.titleId.startsWith("f790")).choice,"THREE_INCORPORATION_PROPOSALS_ACCEPTED");
});
