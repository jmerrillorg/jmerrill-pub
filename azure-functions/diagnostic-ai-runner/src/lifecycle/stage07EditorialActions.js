"use strict";
const b=require("./newSubmissionStage03Budget");
const mail=require("./publisherFundedStage04Mail");
const folders=require("./pipelineFolderProjection");
const documents=require("../editorial/approvedManuscriptActions");
const pins=require("../../config/stage07-editorial-actions.json");
const ROOT="editorial-actions/stage07";
async function source(input,deps){
  const bytes=await deps.sourceBytes({itemId:input.itemId});
  if(b.sha(bytes)!==input.sha256)b.deny("EDITORIAL_SOURCE_VERSION_CHANGED");
  return bytes;
}
function validate(plan,pin,review,message,classification){
  if(!["AUTHOR_TEXT_REQUIRES_REVIEW","EDITORIAL_CHOICES_CAPTURED"].includes(classification.status))b.deny("EDITORIAL_RESPONSE_NOT_AUTHENTICATED");
  const auth=mail.authentication(message);
  if(auth.dmarc!=="pass"&&auth.method!=="TENANT_VERIFIED_INTERNAL_MAILBOX")b.deny("EDITORIAL_RESPONSE_NOT_AUTHENTICATED");
  if(plan.titleId!==review.titleId||plan.version!==review.version||plan.replyKey!==b.sha(message.internetMessageId)||
    plan.authoredTextSha256!==b.sha(message.uniqueBody?.content||"")||plan.reviewHash!==require("./stage07AuthorCorrespondence").validate(review)||
    plan.actionVersion!==pin.actionVersion||plan.nextStageAuthorized!==false||plan.stageCompletionApproved!==false||
    plan.paidCalls!==0||!plan.authorityReference||!Array.isArray(plan.inputs)||
    plan.inputs.some(x=>!x.itemId||! /^[a-f0-9]{64}$/.test(x.sha256)||! /^[A-Za-z0-9 -]+\.docx$/.test(x.outputName)))b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  if(plan.operation==="LONG_WATCH_APPROVED_PLACEMENTS"){
    if(plan.titleId!=="a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2"||plan.inputs.length!==4)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="CHAD_REVIEWED_UNCHANGED_PACKAGE"){
    if(plan.titleId!=="0e127af9-fcb3-5671-a0fa-e4af63c307d1"||plan.componentSha256!=="e03b0a2b6da9b6318352b9724e024713aaf7ffba24f1fd426f9def2fb8540175"||plan.inputs.length)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"){
    if(plan.titleId!=="e797232b-da7a-f111-ab0f-00224820105b"||plan.inputs.length!==2||
      plan.inputs[0].sha256!=="701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06"||
      plan.inputs[1].sha256!=="94b46204db5e0e81d739f507c26905f693888949a494d2c4d64463ebe2a90312")b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
}
async function publish(plan,name,bytes,deps){
  const id=folders.FOLDERS[plan.titleId],path=`${folders.path(id)}:/${encodeURIComponent(`${plan.actionVersion} ${name}`)}`;
  let item;
  try{item=await deps.graph(path);}catch(e){if(e.statusCode!==404)throw e;}
  if(!item){try{item=await deps.graph(`${path}:/content`,{method:"PUT",headers:{"Content-Type":name.endsWith(".docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"text/html","If-None-Match":"*"},body:bytes});}catch(e){if(![409,412].includes(e.statusCode))throw e;item=await deps.graph(path);}}
  if(item.parentReference?.id!==id||b.sha(await deps.sourceBytes({itemId:item.id}))!==b.sha(bytes))b.deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  return {name,itemId:item.id,webUrl:item.webUrl,sha256:b.sha(bytes),bytes:bytes.length};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function execute(plan,review,deps){
  const base=`${ROOT}/${plan.titleId}/${plan.actionVersion}`;
  const previous=await b.optional(deps.containerClient,`${base}/result.json`);
  if(previous)return previous.value;
  const stage=await require("./pipelineFolderRuntime").readAuthority(plan.titleId,deps);
  const folder=await deps.graph(folders.path(folders.FOLDERS[plan.titleId]));
  if(!stage.current||stage.stageCode!=="07_DEVELOPMENTAL_EDITING"||folder.parentReference?.name!=="07 - Developmental Editing")b.deny("EDITORIAL_STAGE_OR_FOLDER_CHANGED");
  if(plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"){
    const inputs=[];for(const input of plan.inputs)inputs.push({...input,bytes:await source(input,deps)});
    const sample=await documents.intentionalSamples(inputs),artifacts=[];
    for(const output of sample.outputs)artifacts.push(await publish(plan,output.name,output.bytes,deps));
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"LAYOUT_SAMPLES_AVAILABLE_VISUAL_REVIEW_OPEN",artifacts,qa:sample.qa,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
    return (await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
  }
  if(plan.operation==="CHAD_REVIEWED_UNCHANGED_PACKAGE"){
    const packaged=await require("./newSubmissionStage07").handler({mode:"SUBMISSION_07_PACKAGE",titleId:plan.titleId,componentSha256:plan.componentSha256},deps);
    if(packaged.status!==200||packaged.jsonBody.stage07Complete!==false||packaged.jsonBody.reviewedUnchanged!==true||!packaged.jsonBody.delivery?.files?.length)b.deny("EDITORIAL_REVIEWED_PACKAGE_NOT_READY");
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"REVIEWED_UNCHANGED_PACKAGE_AVAILABLE_RENDERING_REVIEW_OPEN",artifacts:packaged.jsonBody.delivery.files,package:packaged.jsonBody,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
    return (await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
  }
  const results=[];
  for(const input of plan.inputs){
    const bytes=await source(input,deps),edited=await documents.applyLongWatch(bytes,input.actions);
    results.push({...edited,input});
  }
  const annual=documents.annualQa(results);
  // A failed QA leaves no author-facing output or send. Originals are never overwritten.
  const artifacts=[];
  for(const result of results)artifacts.push(await publish(plan,result.input.outputName,result.bytes,deps));
  const report=Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>The Long Watch February decisions applied</title><body><h1>The Long Watch February decisions applied</h1><p>Your A-D decisions have been applied to Formation. The four quarterly working manuscripts contain 365 unique dated entries with their five daily sections. These are reconciled working manuscripts, not completed developmental editing or a request to advance.</p><p>The three date swaps are February 6/14, 10/24 and 11/20. February 5, 7 and 9 are retained; The Quiet No remains on February 12 and What Quiet Reveals remains on February 18. Original versions and the separate Soul Dive archive remain unchanged.</p><ul>${artifacts.map(x=>`<li><a href="${escape(x.webUrl)}">${escape(x.name)}</a></li>`).join("")}</ul><h2>What remains</h2><p>Whole-work developmental and visual review remain open. These source-supported placement changes do not resolve missing editorial results. Finished deliverables will return for your explicit approval before Stage 08.</p></body></html>`);
  artifacts.push(await publish(plan,"Editorial change report.html",report,deps));
  const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,
    status:"APPROVED_PLACEMENTS_APPLIED_EDITORIAL_REVIEW_OPEN",artifacts,annual,qa:results.map(x=>x.qa),
    stageCompletionApproved:false,nextStageAuthorized:false,paidCalls:0};
  return (await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
}
async function run(review,message,classification,deps){
  const pin=(deps.editorialActionPins||pins).find(x=>x.titleId===review.titleId&&x.replyKey===b.sha(message.internetMessageId));
  if(!pin)return {status:"NO_REVIEWED_EXECUTABLE_ACTION"};
  const record=await b.read(deps.containerClient,`${ROOT}/${pin.titleId}/${pin.actionVersion}/plan.json`);
  if(b.sha(record.bytes)!==pin.sha256)b.deny("EDITORIAL_ACTION_PLAN_DRIFT");
  const plan=record.value;validate(plan,pin,review,message,classification);
  const state=await require("./titleCommissioningIntakeWorker").processTitleCommissioningStep({titleId:plan.titleId,bindingHash:pin.sha256},
    {...deps,readScope:async()=>({titleId:plan.titleId,enabled:true,revoked:false,mode:"JACKIE_TITLE_INTERNAL_COMMISSIONING"})},
    {namespace:ROOT+"/executions",executionSuffix:"",plan:x=>({...x,executionId:`editorial-action:${x.bindingHash}`}),
      execute:()=>execute(plan,review,deps),validate:x=>x.stageCompletionApproved===false&&x.nextStageAuthorized===false&&
        ((x.status==="APPROVED_PLACEMENTS_APPLIED_EDITORIAL_REVIEW_OPEN"&&x.annual.uniqueDates===365)||
         (x.status==="REVIEWED_UNCHANGED_PACKAGE_AVAILABLE_RENDERING_REVIEW_OPEN"&&x.package.reviewedUnchanged===true)||
         (x.status==="LAYOUT_SAMPLES_AVAILABLE_VISUAL_REVIEW_OPEN"&&x.qa.soulDivesPreserved===true)),
      reference:()=>`${ROOT}/${plan.titleId}/${plan.actionVersion}/result.json`,
      completionEffects:()=>({stageCompletionApproved:false,nextStageAuthorized:false,paidCalls:0})});
  let correspondence=null;
  if(state.status==="COMPLETED")correspondence=await followup(plan,review,deps);
  return {status:state.status,execution:state,correspondence,stageCompletionApproved:false,nextStageAuthorized:false};
}
async function followup(plan,review,deps){
 const base=`${ROOT}/${plan.titleId}/${plan.actionVersion}`,result=(await b.read(deps.containerClient,`${base}/result.json`)).value;
 if(result.titleId!==plan.titleId||result.replyKey!==plan.replyKey||result.stageCompletionApproved!==false)b.deny("EDITORIAL_RESULT_CONFLICT");
 const summary=plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"?
 "Jackie, The Intentional Leader now has two reading-flow samples using the same complete January 1 and August 12 readings at 6 by 9 inches and 7 by 10 inches. Secondary labels are quieter, while every Executive Reflection and Soul Dive passage in these samples remains intact. The wider sample provides more room per line; actual page counts and visual assessment remain to be confirmed. These samples are for comparison before manuscript-wide restructuring. Quarterly print volumes and one annual eBook remain settled. No global restructuring or Stage 08 advancement has occurred.":plan.operation==="CHAD_REVIEWED_UNCHANGED_PACKAGE"?
 "Jackie, Chad and Me's reviewed-unchanged package is available in its own Stage 07 folder. The documentary-reflective approach and original experiences remain intact. The editorial memo, questions and source coverage preserve the disclosed factual limitations; this is not factual publication clearance. No scenes, quotations or chronology have been invented. Final visual acceptance remains open, and the finished stage will return for your explicit approval.":
 "Jackie, your February A-D decisions have now been applied to Formation. The three swaps preserve each entry once; February 5, 7 and 9 are retained, The Quiet No remains on February 12, and What Quiet Reveals remains on February 18.\n\nAll four quarterly working copies contain 365 unique dated entries with the five daily sections. Originals and the separate Soul Dive archive remain preserved.\n\nThese are updated working manuscripts. Complete developmental and visual review remain open; this message does not claim Stage 07 completion or request advancement. Finished deliverables will return for your explicit approval.";
 const subject=`Re: ${review.subject}`,body=`${summary}\n\n${result.artifacts.filter(x=>/\.docx$|\.html$/.test(x.name)).map(x=>`${x.name}: ${x.webUrl}`).join("\n")}`;
 const payload={messageType:"APPROVED_AUTHOR_RESPONSE",diagnosticId:review.titleId,intakeReferenceCode:review.intakeReference,authorEmail:mail.AUTHOR,authorName:"Jackie Smith, Jr.",projectTitle:review.title,subject,body,
 templateName:"STAGE07_APPROVED_ACTION_RESULT_V1",templateVersion:plan.actionVersion,approvedBy:plan.authorityReference,approvedOn:plan.authorityRecordedAt,
 futureSendRequiresInternalCopy:true,futureSendRequiresDataverseLog:true,internalVisibilityMailbox:mail.MAILBOX,cc:[mail.MAILBOX],bcc:[],replyTo:mail.MAILBOX,attachments:[]};
 let sent=(await b.optional(deps.containerClient,`${base}/send.json`))?.value;
 if(!sent){
  await b.immutable(deps.containerClient,`${base}/send-intent.json`,{titleId:plan.titleId,payloadSha256:b.sha(JSON.stringify(payload)),actionVersion:plan.actionVersion});
  const receipt=await(deps.sendConsultation||mail.send)(payload,deps);
  if(!receipt.providerMessageId||!receipt.communicationRecordId||!receipt.sentAt)b.deny("EDITORIAL_SEND_RECEIPT_MISSING");
  sent=(await b.immutable(deps.containerClient,`${base}/send.json`,receipt)).value;
 }
 const stage=require("./stage07AuthorCorrespondence"),delivery=(await b.optional(deps.containerClient,`${base}/delivery.json`))?.value||await stage.delivery({...review,subject},sent,deps);
 if(delivery?.delivered)await b.immutable(deps.containerClient,`${base}/delivery.json`,delivery);
 if(delivery?.internetMessageId){
  await b.immutable(deps.containerClient,`${stage.prefix(plan.titleId)}/followup-deliveries/editorial-${plan.actionVersion}.json`,{
   ...delivery,editorialActionVersion:plan.actionVersion,editorialPlanSha256:b.sha(JSON.stringify(plan)),
   providerMessageId:sent.providerMessageId,communicationRecordId:sent.communicationRecordId
  });
 }
 return {sent,delivery,stageCompletionApproved:false,nextStageAuthorized:false};
}
module.exports={run,validate,source,publish,execute,followup,ROOT};
