"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const owner=require("../src/lifecycle/stage07EditorialActions"),mail=require("../src/lifecycle/publisherFundedStage04Mail"),stage=require("../src/lifecycle/stage07AuthorCorrespondence"),b=require("../src/lifecycle/newSubmissionStage03Budget");
test("execution requires authenticated exact-version reviewed text and zero paid authority",()=>{
 const oldAuth=mail.authentication,oldValidate=stage.validate;
 try{
 mail.authentication=()=>({dmarc:"pass"});stage.validate=()=>"review-hash";
 const review={titleId:"a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2",version:"version"},message={internetMessageId:"<reply>",uniqueBody:{content:"A-D approved"}};
 const plan={...review,replyKey:b.sha(message.internetMessageId),authoredTextSha256:b.sha(message.uniqueBody.content),reviewHash:"review-hash",actionVersion:"V6",paidCalls:0,authorityReference:"<reply>",nextStageAuthorized:false,stageCompletionApproved:false,operation:"LONG_WATCH_APPROVED_PLACEMENTS",inputs:Array.from({length:4},(_,i)=>({itemId:"source"+i,sha256:"a".repeat(64),outputName:"Volume "+i+".docx"}))};
 const pin={actionVersion:"V6"},classification={status:"AUTHOR_TEXT_REQUIRES_REVIEW"};
 owner.validate(plan,pin,review,message,classification);
 for(const patch of [{titleId:"other"},{version:"old"},{authoredTextSha256:"wrong"},{paidCalls:1},{stageCompletionApproved:true},{nextStageAuthorized:true},{operation:"RUN_CODE"}])assert.throws(()=>owner.validate({...plan,...patch},pin,review,message,classification),/AUTHORITY_CONFLICT/);
 assert.throws(()=>owner.validate(plan,pin,review,message,{status:"AUTHENTICATION_REVIEW_REQUIRED"}),/NOT_AUTHENTICATED/);
 mail.authentication=()=>({dmarc:"none"});assert.throws(()=>owner.validate(plan,pin,review,message,classification),/NOT_AUTHENTICATED/);
 }finally{mail.authentication=oldAuth;stage.validate=oldValidate;}
});
test("source drift fails before producing an output",async()=>{
 await assert.rejects(()=>owner.source({itemId:"source",sha256:"a".repeat(64)},{sourceBytes:async()=>Buffer.from("changed")}),/SOURCE_VERSION_CHANGED/);
});
test("missing action is not represented as editing or sent correspondence",async()=>{
 const result=await owner.run({titleId:"unknown"},{internetMessageId:"<unknown>"},{status:"AUTHOR_TEXT_REQUIRES_REVIEW"},{editorialActionPins:[]});
 assert.equal(result.status,"NO_REVIEWED_EXECUTABLE_ACTION");
});
test("result followup recovery reuses its send receipt and binds later replies without advancement",async()=>{
 const originals={read:b.read,optional:b.optional,immutable:b.immutable,delivery:stage.delivery};
 const records=new Map(),plan={titleId:"a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2",actionVersion:"TEST-V1",replyKey:"reply",operation:"LONG_WATCH_APPROVED_PLACEMENTS",authorityReference:"approved reply",authorityRecordedAt:"2026-10-19T12:00:00Z"};
 const review={titleId:plan.titleId,version:"review",subject:"The Long Watch",title:"The Long Watch",intakeReference:"intake"};
 const root=`${owner.ROOT}/${plan.titleId}/${plan.actionVersion}`;
 records.set(root+"/result.json",{titleId:plan.titleId,replyKey:plan.replyKey,stageCompletionApproved:false,artifacts:[]});
 let sends=0,observations=0;
 try{
  b.read=async(c,p)=>({value:records.get(p)});b.optional=async(c,p)=>records.has(p)?{value:records.get(p)}:null;
  b.immutable=async(c,p,v)=>{if(records.has(p))assert.deepEqual(records.get(p),v);else records.set(p,v);return {value:records.get(p)};};
  stage.delivery=async()=>{if(++observations===1)throw new Error("readback timeout");return {titleId:plan.titleId,version:review.version,internetMessageId:"<outbound>",publishingMessageId:"copy",sentAt:plan.authorityRecordedAt,delivered:true,stageCompletionApproved:false,nextStageAuthorized:false};};
  const deps={containerClient:{},sendConsultation:async()=>{sends++;return {providerMessageId:"provider",communicationRecordId:"record",sentAt:plan.authorityRecordedAt};}};
  await assert.rejects(()=>owner.followup(plan,review,deps),/readback timeout/);
  const recovered=await owner.followup(plan,review,deps);await owner.followup(plan,review,deps);
  assert.equal(sends,1);assert.equal(observations,2);assert.equal(recovered.stageCompletionApproved,false);
  assert.ok(records.has(`${stage.prefix(plan.titleId)}/followup-deliveries/editorial-TEST-V1.json`));
  records.set(root+"/result.json",{titleId:"wrong-title",replyKey:plan.replyKey,stageCompletionApproved:false});
  await assert.rejects(()=>owner.followup(plan,review,deps),/RESULT_CONFLICT/);assert.equal(sends,1);
 }finally{Object.assign(b,{read:originals.read,optional:originals.optional,immutable:originals.immutable});stage.delivery=originals.delivery;}
});
