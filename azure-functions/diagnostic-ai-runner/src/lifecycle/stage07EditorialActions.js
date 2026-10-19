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
    plan.inputs.some(x=>!x.itemId||! /^[a-f0-9]{64}$/.test(x.sha256)||! /^[A-Za-z0-9 -]+\.(docx|pdf)$/.test(x.outputName)))b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  if(plan.operation==="LONG_WATCH_APPROVED_PLACEMENTS"){
    if(plan.titleId!=="a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2"||plan.inputs.length!==4)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="CHAD_REVIEWED_UNCHANGED_PACKAGE"){
    if(plan.titleId!=="0e127af9-fcb3-5671-a0fa-e4af63c307d1"||plan.componentSha256!=="e03b0a2b6da9b6318352b9724e024713aaf7ffba24f1fd426f9def2fb8540175"||plan.inputs.length)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"){
    if(plan.titleId!=="e797232b-da7a-f111-ab0f-00224820105b"||plan.inputs.length!==2||
      plan.inputs[0].sha256!=="701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06"||
      plan.inputs[1].sha256!=="94b46204db5e0e81d739f507c26905f693888949a494d2c4d64463ebe2a90312")b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="TIL_DEATH_PASSAGE_PROPOSALS"){
    if(plan.titleId!=="f79006b7-f595-f111-8076-00224820105b"||plan.inputs.length!==2||plan.inputs[1].sha256!=="2270d907fc564f5946924f8f2ed699d08c7282a8a24f70f916c328d349fb4392"||plan.proposals?.length!==3)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else if(plan.operation==="GLORY_RELATIONSHIP_BRIDGES"){
    if(plan.titleId!=="f1908dc9-5775-f111-ab0f-6045bdd69435"||plan.inputs.length!==1||plan.bridges?.length!==3||plan.unsplit!==true)b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
  }else b.deny("EDITORIAL_ACTION_AUTHORITY_CONFLICT");
}
async function publish(plan,name,bytes,deps){
  const id=folders.FOLDERS[plan.titleId],path=`${folders.path(id)}:/${encodeURIComponent(`${plan.actionVersion} ${name}`)}`;
  let item;
  try{item=await deps.graph(path);}catch(e){if(e.statusCode!==404)throw e;}
  if(!item){try{item=await deps.graph(`${path}:/content`,{method:"PUT",headers:{"Content-Type":name.endsWith(".docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"text/html","If-None-Match":"*"},body:bytes});}catch(e){if(![409,412].includes(e.statusCode))throw e;item=await deps.graph(path);}}
  if(item.parentReference?.id!==id)b.deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  const stored=await deps.sourceBytes({itemId:item.id});
  const custody=name.endsWith(".docx")?await require("../editorial/sharePointDocumentCustody").verify(bytes,stored):{method:"EXACT_BYTES",generatedSha256:b.sha(bytes),storedSha256:b.sha(stored)};
  if(!name.endsWith(".docx")&&custody.generatedSha256!==custody.storedSha256)b.deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  await b.immutable(deps.containerClient,`${ROOT}/${plan.titleId}/${plan.actionVersion}/custody/${b.sha(name)}.json`,{itemId:item.id,eTag:item.eTag,...custody});
  return {name,itemId:item.id,webUrl:item.webUrl,sha256:b.sha(stored),generatedSha256:b.sha(bytes),bytes:stored.length,custody};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function execute(plan,review,deps){
  const base=`${ROOT}/${plan.titleId}/${plan.actionVersion}`;
  const previous=await b.optional(deps.containerClient,`${base}/result.json`);
  if(previous)return previous.value;
  const stage=await require("./pipelineFolderRuntime").readAuthority(plan.titleId,deps);
  const folder=await deps.graph(folders.path(folders.FOLDERS[plan.titleId]));
  if(!stage.current||stage.stageCode!=="07_DEVELOPMENTAL_EDITING"||folder.parentReference?.name!=="07 - Developmental Editing")b.deny("EDITORIAL_STAGE_OR_FOLDER_CHANGED");
  if(plan.operation==="GLORY_RELATIONSHIP_BRIDGES"){
    const built=await documents.relationshipBridges(await source(plan.inputs[0],deps),plan);
    const artifacts=[await publish(plan,"Establishing Glory relationship course WORK IN PROGRESS.docx",built.bytes,deps)];
    const report=Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Establishing Glory: relationship bridges</title><body><h1>One relationship-centered course</h1><p>These proposed introduction and transitions implement your cover-to-cover direction without splitting the work. Existing manuscript text and its order remain preserved. Missing editorial results, including EDIT/14, remain unresolved; this is not a completed developmental edit.</p>${plan.bridges.map(x=>`<h2>${escape(x.heading)}</h2>${x.paragraphs.map(p=>`<p>${escape(p)}</p>`).join("")}`).join("")}<p>The completed manuscript will return for explicit author approval. Stage 08 remains unstarted.</p></body></html>`);
    artifacts.push(await publish(plan,"Establishing Glory introduction and transitions.html",report,deps));
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"RELATIONSHIP_BRIDGES_APPLIED_REVIEW_OPEN",artifacts,qa:built.qa,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
    return(await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
  }
  if(plan.operation==="TIL_DEATH_PASSAGE_PROPOSALS"){
    const built=await documents.passageProposals(await source(plan.inputs[0],deps),await source(plan.inputs[1],deps),plan);
    const artifacts=[await publish(plan,"Til Death three incorporation proposals.docx",built.bytes,deps)];
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"PROPOSALS_AVAILABLE_AUTHOR_DECISION_REQUIRED",artifacts,qa:built.qa,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
    return(await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
  }
  if(plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"){
    const inputs=[];for(const input of plan.inputs)inputs.push({...input,bytes:await source(input,deps)});
    const sample=await documents.intentionalSamples(inputs),artifacts=[];
    for(const output of sample.outputs)artifacts.push(await publish(plan,output.name,output.bytes,deps));
    const comparison=Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>The Intentional Leader: flow and trim comparison</title><body><h1>Option A reading flow and Option C trim comparison</h1><p>Both samples contain the same complete January 1 and August 12 readings, including Executive Reflection and Soul Dive. They test quieter secondary labels and continuous reading without deleting devotional content. No manuscript-wide restructuring has occurred.</p><table><thead><tr><th>Option</th><th>Reader benefit</th><th>Tradeoff</th></tr></thead><tbody><tr><td>6 x 9 inches</td><td>Compact, familiar book size; preserves the current baseline.</td><td>Narrower lines and more page turns for the complete daily material.</td></tr><tr><td>7 x 10 inches</td><td>More room for the same words and reflection material.</td><td>Larger physical book and longer lines; production cost and provider limits are not yet quoted.</td></tr></tbody></table><p>Both use Georgia 11-point type and 0.625-inch sample margins. The text areas are 4.75 x 7.75 and 5.75 x 8.75 inches respectively. The larger sample has approximately 37% more text area, but that does not establish a final page-count reduction. These two readings are a comparison, not a full-volume pagination proof.</p><h2>Recommendation</h2><p>Review the quieter-label flow first, then compare the larger trim for comfortable quarterly reading. Preserve all Executive Reflection and Soul Dive content. Do not compress type or remove content to force a target page count. Final gutter, page count, binding and provider cost require a complete quarterly layout before production.</p><h2>Your remaining choice</h2><p>Tell us whether this reading flow is comfortable and which sample size you prefer for the next layout study. Quarterly print volumes and one annual eBook are already settled and are not being asked again. This choice guides development; it does not approve unfinished Stage 07 work or Stage 08 advancement.</p></body></html>`);
    artifacts.push(await publish(plan,"Intentional Leader Option A and Option C comparison.html",comparison,deps));
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"LAYOUT_SAMPLES_AVAILABLE_VISUAL_REVIEW_OPEN",artifacts,qa:sample.qa,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
    return (await b.immutable(deps.containerClient,`${base}/result.json`,result)).value;
  }
  if(plan.operation==="CHAD_REVIEWED_UNCHANGED_PACKAGE"){
    // This reviewed action applies the existing unchanged-text approval only to
    // Chad's unpaid package operation, never to model execution or other titles.
    const packaged=await require("./newSubmissionStage07").handler({mode:"SUBMISSION_07_PACKAGE",titleId:plan.titleId,componentSha256:plan.componentSha256},
      {...deps,env:{...(deps.env||process.env),JM1_STAGE07_CLOSURE_AUTHORITY:require("../editorial/stage07ClosureAuthority").reference}});
    if(packaged.status!==200)b.deny(packaged.jsonBody.code||"EDITORIAL_REVIEWED_PACKAGE_NOT_READY");
    if(packaged.status!==200||packaged.jsonBody.stage07Complete!==false||packaged.jsonBody.reviewedUnchanged!==true||!packaged.jsonBody.delivery?.files?.length)b.deny("EDITORIAL_REVIEWED_PACKAGE_NOT_READY");
    const exceptionRows=[
      ["First prompt and Chad naming exchange","21-22, 44, 115, 632-633","Unrecovered source remains explicitly disclosed. Do not reconstruct or invent it; no repeat author request is implied."],
      ["Dates and financial recollections","69, 153, 168, 235, 283-284, 322","Approximate or unverified claims remain qualified. Documentary corroboration is not established by this editorial package."],
      ["Architecture and operator-load records","202, 209-210, 244, 385-403, 441, 507-523, 614","Exact document and version cross-references remain a source-verification task; editorial consistency does not independently certify them."],
      ["Publishing pipeline counts","414, 451","Preserve the disclosed sixteen-stage versus ten-stage discrepancy until the dated source records explain it."],
      ["September 2 review meeting","372, 407","No reconstructed scene, dialogue or approval. The underlying meeting account remains unavailable."],
      ["October 10 reconstruction versus historical exchange date","457, 481-487, 643-644, 691-698, 706","Keep reconstruction and unrecovered historical dates distinct; do not infer the latter."],
      ["Blockchain research and technical claims","540-588, 649, 711","Research intention is not a launched product or guaranteed royalty enforcement. Publication fact-checking remains separate."],
      ["Citations and personal disclosures","682, 684, 699-711","Check exact citation targets and authorized personal details before publication. Do not add names, roles or contributions without source authority."]
    ];
    const register=Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Chad and Me source-verification register</title><body><h1>Chad and Me: factual and source-verification exceptions</h1><p>The documentary-reflective, reviewed-unchanged disposition is accepted. These are preserved source limitations and verification tasks, not a request to repeat that decision and not factual publication clearance. Paragraph references use original v003 numbering, 0-711.</p><table><thead><tr><th>Issue</th><th>Source paragraphs</th><th>Disposition</th></tr></thead><tbody>${exceptionRows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table><p>The original manuscript, editorial memo and detailed source questions remain in the review package. No invented scenes, quotations, chronology or factual resolutions have been introduced. Completed-stage author approval remains required.</p></body></html>`);
    const exceptionArtifact=await publish(plan,"Chad and Me factual and source verification register.html",register,deps);
    const result={titleId:plan.titleId,version:plan.version,actionVersion:plan.actionVersion,replyKey:plan.replyKey,status:"REVIEWED_UNCHANGED_PACKAGE_AVAILABLE_RENDERING_REVIEW_OPEN",artifacts:[...packaged.jsonBody.delivery.files,exceptionArtifact],package:packaged.jsonBody,paidCalls:0,stageCompletionApproved:false,nextStageAuthorized:false};
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
         (x.status==="LAYOUT_SAMPLES_AVAILABLE_VISUAL_REVIEW_OPEN"&&x.qa.soulDivesPreserved===true)||
         (x.status==="PROPOSALS_AVAILABLE_AUTHOR_DECISION_REQUIRED"&&x.qa.manuscriptModified===false&&x.qa.checks.length===3)||
         (x.status==="RELATIONSHIP_BRIDGES_APPLIED_REVIEW_OPEN"&&x.qa.unsplit===true&&x.qa.sourceOrderingPreserved===true)),
      reference:()=>`${ROOT}/${plan.titleId}/${plan.actionVersion}/result.json`,
      completionEffects:()=>({stageCompletionApproved:false,nextStageAuthorized:false,paidCalls:0})});
  let correspondence=null;
  if(state.status==="COMPLETED")correspondence=await followup(plan,review,deps);
  return {status:state.status,execution:state,correspondence,stageCompletionApproved:false,nextStageAuthorized:false};
}
async function followup(plan,review,deps){
 const base=`${ROOT}/${plan.titleId}/${plan.actionVersion}`,result=(await b.read(deps.containerClient,`${base}/result.json`)).value;
 if(result.titleId!==plan.titleId||result.replyKey!==plan.replyKey||result.stageCompletionApproved!==false)b.deny("EDITORIAL_RESULT_CONFLICT");
 const summary=plan.operation==="GLORY_RELATIONSHIP_BRIDGES"?
 "Jackie, Establishing Glory's working manuscript now includes a proposed introduction and two transitions that make relationship the explicit thread: relationship with God, relationships with people, and marriage. It remains one cover-to-cover course. The accompanying editorial update shows the added wording, and all existing manuscript text remains preserved. The missing editorial result and dependent review are still unresolved, so this is work in progress, not a finished developmental edit or a request to approve Stage 07. No split or Stage 08 advancement has occurred.":plan.operation==="TIL_DEATH_PASSAGE_PROPOSALS"?
 "Jackie, the three selective incorporation proposals are ready for your review in Til Death's own Stage 07 folder. Each identifies the companion passage, a specific existing chapter placement, proposed wording and the reader benefit. The proposals cover self-assessment before moving from me to we, attentive listening, and acknowledging unintended hurt. Please approve, revise or decline each proposal in this title's thread. Nothing has been inserted into the manuscript. The standalone structure remains intact, and this is an incorporation decision, not approval of completed Stage 07 work.":plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"?
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
 const stage=require("./stage07AuthorCorrespondence"),observed=(await b.optional(deps.containerClient,`${base}/delivery.json`))?.value||await stage.delivery({...review,subject},sent,deps);
 const delivery=observed?{...observed,reviewHash:stage.validate(review)}:null;
 if(delivery)await b.immutable(deps.containerClient,`${base}/delivery-observations/${b.sha(JSON.stringify(delivery))}.json`,delivery);
 if(delivery?.delivered)await b.immutable(deps.containerClient,`${base}/delivery.json`,delivery);
 if(delivery?.internetMessageId){
  const bindingPath=`${stage.prefix(plan.titleId)}/followup-deliveries/editorial-${plan.actionVersion}.json`;
  if(!(await b.optional(deps.containerClient,bindingPath)))await b.immutable(deps.containerClient,bindingPath,{
   ...delivery,editorialActionVersion:plan.actionVersion,editorialPlanSha256:b.sha(JSON.stringify(plan)),
   providerMessageId:sent.providerMessageId,communicationRecordId:sent.communicationRecordId
  });
 }
 return {sent,delivery,stageCompletionApproved:false,nextStageAuthorized:false};
}
module.exports={run,validate,source,publish,execute,followup,ROOT};
