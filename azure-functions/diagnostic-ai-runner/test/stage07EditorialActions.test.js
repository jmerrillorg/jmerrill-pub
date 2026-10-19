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
