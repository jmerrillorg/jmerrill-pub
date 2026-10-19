"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const stage=require("../src/lifecycle/stage07AuthorCorrespondence"),b=require("../src/lifecycle/newSubmissionStage03Budget");
const mail=require("../src/lifecycle/publisherFundedStage04Mail"),reply=require("../src/editorial/editorialConsultationReply");
const policy=require("../config/jackie-stage07-batch.json");
function fixture(){
 const source=policy.sources[0],blobs=new Map(),versions=new Map(),counts={send:0};
 const file=Buffer.from("readable fixture"),base=stage.prefix(source.titleId);
 const review={purpose:"EDITORIAL_CONSULTATION",titleId:source.titleId,title:source.title,stageId:"07_DEVELOPMENTAL_EDITING",
  version:stage.version,authorContactId:policy.contactId,authorEmail:mail.AUTHOR,sourceHashes:policy.sources.filter(x=>x.titleId===source.titleId).map(x=>x.sourceSha256),
  stageCompletionRequested:false,authority:{method:"DIRECT_AUTHOR_INSTRUCTION",chatReference:"chat:authorized",recordedAt:"2026-10-16T20:00:00Z"},
  subject:`Editorial consultation [JMP-DEV-${source.titleId.slice(0,8)}-V5]`,body:"Please review your title only.",intakeReference:"fixture",
  attachments:[{itemId:"exact",version:"1",sha256:b.sha(file),blobPath:base+"/attachments/fixture.docx",name:"Review.docx",contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",role:"WORK_IN_PROGRESS"}],questions:[{id:"POSITIONING",options:["SELF_CONTAINED","COMPANION"]}]};
 const put=(p,v)=>{blobs.set(p,Buffer.isBuffer(v)?v:Buffer.from(JSON.stringify(v)));versions.set(p,String(Number(versions.get(p)||0)+1));};put(review.attachments[0].blobPath,file);
 const deps={env:{},sendConsultation:async message=>{counts.send++;assert.equal(message.authorEmail,mail.AUTHOR);assert.deepEqual(message.cc,[mail.MAILBOX]);return {providerMessageId:"abc",communicationRecordId:"crm",sentAt:"2026-10-16T21:00:00Z"};},
 containerClient:{listBlobsFlat:async function*({prefix}){for(const name of blobs.keys())if(name.startsWith(prefix))yield {name};},getProperties:async()=>({}),getBlockBlobClient:p=>({getProperties:async()=>{if(!blobs.has(p))throw Object.assign(Error("missing"),{statusCode:404});return {etag:versions.get(p)};},downloadToBuffer:async()=>blobs.get(p),uploadData:async(bytes,o)=>{if(o?.conditions?.ifNoneMatch&&blobs.has(p))throw Object.assign(Error("exists"),{statusCode:412});put(p,bytes);return {etag:versions.get(p)};}})}};
 return {review,deps,counts,blobs,put};
}
test("outbound is independent of expired inbound trust and preserves title-only attachments",async()=>{
 const x=fixture();const first=await stage.send(x.review,x.deps),second=await stage.send(x.review,x.deps);
 assert.equal(x.counts.send,1);assert.deepEqual(first,second);assert.equal(first.delivered,false);assert.equal(first.stageCompletionApproved,false);
 assert.ok(x.blobs.has(stage.prefix(x.review.titleId)+"/send-intent.json"));
});
test('source-update correspondence binds only verified same-title version deliveries',async()=>{
 const x=fixture(),path=stage.prefix(x.review.titleId)+'/followup-deliveries/chat-source-update.json';
 const good={titleId:x.review.titleId,version:x.review.version,reviewHash:stage.validate(x.review),internetMessageId:'<source-update>',publishingMessageId:'immutable-cc',publishingCopyReceivedAt:'2026-10-19T10:00:00Z',stageCompletionApproved:false,nextStageAuthorized:false};
 x.put(path,good);assert.deepEqual(await stage.recordedFollowupBindings(x.review,x.deps),[good]);
 for(const patch of [{titleId:'other'},{version:'stale'},{reviewHash:'wrong'},{publishingMessageId:null},{stageCompletionApproved:true}]){
  x.put(path,{...good,...patch});await assert.rejects(()=>stage.recordedFollowupBindings(x.review,x.deps),/FOLLOWUP_BINDING_INVALID/);
 }
});
test("attachment drift stops before sending",async()=>{const x=fixture();x.put(x.review.attachments[0].blobPath,Buffer.from("changed"));await assert.rejects(()=>stage.send(x.review,x.deps),/ATTACHMENT_DRIFT/);assert.equal(x.counts.send,0);});
test("cross-title source and attachment paths are rejected",()=>{const x=fixture();stage.validate(x.review);assert.throws(()=>stage.validate({...x.review,titleId:policy.sources.find(s=>s.titleId!==x.review.titleId).titleId}),/SCOPE_DENIED/);assert.throws(()=>stage.validate({...x.review,attachments:[{...x.review.attachments[0],blobPath:"other-title/attachments/file"}]}),/SCOPE_DENIED/);});
test("consultation never requests completed-stage approval",()=>{const x=fixture();assert.throws(()=>stage.validate({...x.review,stageCompletionRequested:true}),/SCOPE_DENIED/);});
test("timeout preserves the exact intent and no false send receipt",async()=>{const x=fixture();x.deps.sendConsultation=async()=>{throw Error("timeout");};await assert.rejects(()=>stage.send(x.review,x.deps),/timeout/);assert.ok(x.blobs.has(stage.prefix(x.review.titleId)+"/send-intent.json"));assert.ok(!x.blobs.has(stage.prefix(x.review.titleId)+"/send.json"));});
test("reply is bound to exact title version and never advances a stage",()=>{
 const x=fixture(),delivery={reviewHash:stage.validate(x.review),internetMessageId:"<original>",sentAt:"2026-10-16T21:00:00Z"};
 const message={id:"immutable",internetMessageId:"<reply>",receivedDateTime:"2026-10-16T21:10:00Z",from:{emailAddress:{address:mail.AUTHOR}},toRecipients:[{emailAddress:{address:mail.MAILBOX}}],subject:"Re: consultation",uniqueBody:{content:"POSITIONING: SELF_CONTAINED"},internetMessageHeaders:[{name:"In-Reply-To",value:"<original>"},{name:"Authentication-Results",value:"mx; dmarc=pass"}]};
 const good=reply.classify(message,x.review,delivery);assert.equal(good.status,"EDITORIAL_CHOICES_CAPTURED");assert.equal(good.nextStageAuthorized,false);
 assert.equal(reply.classify(message,{...x.review,version:"old"},delivery).status,"IDENTITY_OR_REVIEW_THREAD_MISMATCH");
 assert.equal(reply.classify({...message,uniqueBody:{content:"APPROVE STAGE 07"}},x.review,delivery).status,"AUTHOR_TEXT_REQUIRES_REVIEW");
 assert.equal(reply.classify({...message,subject:"Fwd: consultation"},x.review,delivery).status,"IDENTITY_OR_REVIEW_THREAD_MISMATCH");
 assert.equal(reply.classify({...message,internetMessageHeaders:[{name:"In-Reply-To",value:"<original>"}]},x.review,delivery).status,"AUTHENTICATION_REVIEW_REQUIRED");
});
test("Publishing copy is not author delivery when author mailbox access is denied",async()=>{
 const x=fixture(),old=mail.pages;
 const provider="12345678901234567890123456789012";
 try{
  mail.pages=async box=>{if(box===mail.AUTHOR)throw Object.assign(Error("denied"),{statusCode:403,providerCode:"ErrorAccessDenied"});return [{id:"cc",internetMessageId:`<202610162100.${provider}-fixture@microsoft.com>`,subject:x.review.subject,receivedDateTime:"2026-10-16T21:01:00Z",toRecipients:[{emailAddress:{address:mail.AUTHOR}}],ccRecipients:[{emailAddress:{address:mail.MAILBOX}}]}];};
  const result=await stage.delivery(x.review,{providerMessageId:provider,sentAt:"2026-10-16T21:00:00Z"},x.deps);
  assert.equal(result.delivered,false);assert.equal(result.authorReadError.status,403);assert.equal(result.nextStageAuthorized,false);
 }finally{mail.pages=old;}
});
test("missing folder custody does not prevent durable exact-version reply capture and replay",async()=>{
 const x=fixture(),base=stage.prefix(x.review.titleId),old=mail.replies;
 x.put(base+"/send.json",{sentAt:"2026-10-16T21:00:00Z",providerMessageId:"provider",sent:true});
 x.put(base+"/delivery.json",{delivered:true,internetMessageId:"<original>",reviewHash:stage.validate(x.review),sentAt:"2026-10-16T21:00:00Z"});
 x.deps.graph=async()=>{throw Object.assign(Error("unavailable"),{statusCode:503});};
 x.deps.mailGraph=async()=>({value:[]});
 try{
  mail.replies=async()=>[{id:"immutable",internetMessageId:"<reply>",receivedDateTime:"2026-10-16T21:10:00Z",from:{emailAddress:{address:mail.AUTHOR}},toRecipients:[{emailAddress:{address:mail.MAILBOX}}],subject:"Re: consultation",uniqueBody:{content:"Please preserve the voice."},internetMessageHeaders:[{name:"In-Reply-To",value:"<original>"}]}];
  const first=await stage.reconcile(x.review,x.deps),count=x.blobs.size,second=await stage.reconcile(x.review,x.deps);
  assert.equal(first.replies[0].status,"REPLY_COMPLETION_RETRY_REQUIRED");assert.equal(second.replies[0].replay,true);assert.equal(x.blobs.size,count);assert.ok(first.custodyErrors.length);assert.equal(first.stageCompletionApproved,false);
 }finally{mail.replies=old;}
});
