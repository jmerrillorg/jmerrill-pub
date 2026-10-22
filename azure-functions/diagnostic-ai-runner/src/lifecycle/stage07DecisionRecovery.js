"use strict";
const b=require("./newSubmissionStage03Budget"),mail=require("./publisherFundedStage04Mail");
const pins=require("../../config/stage07-october20-decisions.json"),actions=require("./stage07EditorialActions");
const ROOT="editorial-actions/stage07/author-decisions";
const REPAIR_VERSION="EXACT_REVIEWED_CONTENT_CUSTODY_V2";
async function reconstructReviewedDocuments(plan,deps){
 const docs=require("../editorial/approvedManuscriptActions"),outputs=new Map();
 if(plan.operation==="LONG_WATCH_APPROVED_PLACEMENTS"){
  const results=[];
  for(const input of plan.inputs){const built=await docs.applyLongWatch(await actions.source(input,deps),input.actions);results.push(built);outputs.set(input.outputName,built.bytes);}
  docs.annualQa(results);
 }else if(plan.operation==="INTENTIONAL_LAYOUT_SAMPLES"){
  const inputs=[];for(const input of plan.inputs)inputs.push({...input,bytes:await actions.source(input,deps)});
  for(const output of (await docs.intentionalSamples(inputs)).outputs)outputs.set(output.name,output.bytes);
 }else if(plan.operation==="GLORY_RELATIONSHIP_BRIDGES"){
  outputs.set("Establishing Glory relationship course WORK IN PROGRESS.docx",(await docs.relationshipBridges(await actions.source(plan.inputs[0],deps),plan)).bytes);
 }else if(plan.operation==="TIL_DEATH_PASSAGE_PROPOSALS"){
  outputs.set("Til Death three incorporation proposals.docx",(await docs.passageProposals(await actions.source(plan.inputs[0],deps),await actions.source(plan.inputs[1],deps),plan)).bytes);
 }
 return outputs;
}
async function verifyReviewedArtifact(artifact,bytes,reconstructed){
 if(b.sha(bytes)===artifact.sha256)return {method:"EXACT_RECORDED_BYTES",recordedSha256:artifact.sha256,currentSha256:b.sha(bytes)};
 if(!artifact.name.endsWith(".docx")||!Buffer.isBuffer(reconstructed))b.deny("EDITORIAL_DECISION_ARTIFACT_CHANGED");
 // Reconstruction is pure and bound to the original pinned plan and exact source
 // hashes. Only the existing narrow SharePoint metadata variance is permitted.
 const custody=await require("../editorial/sharePointDocumentCustody").verify(reconstructed,bytes);
 return {...custody,recordedSha256:artifact.sha256,currentSha256:b.sha(bytes),reconstruction:"PINNED_PLAN_EXACT_SOURCE_BYTES"};
}
function recoverHeld(state){return state.causeCode==="EDITORIAL_DECISION_ARTIFACT_CHANGED"&&state.repairRecovery?.version!==REPAIR_VERSION;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function validate(pin,review,message,classification,binding){
 const auth=mail.authentication(message);
 if(!["AUTHOR_TEXT_REQUIRES_REVIEW","EDITORIAL_CHOICES_CAPTURED"].includes(classification.status)||
   (auth.method!=="TENANT_VERIFIED_INTERNAL_MAILBOX"&&auth.dmarc!=="pass"))b.deny("EDITORIAL_RESPONSE_NOT_AUTHENTICATED");
 const headers=(message.internetMessageHeaders||[]).filter(x=>x.name.toLowerCase()==="in-reply-to");
 if(pin.titleId!==review.titleId||pin.replyKey!==b.sha(message.internetMessageId)||
   pin.authoredTextSha256!==b.sha(message.uniqueBody?.content||"")||
   review.version!=="EDITORIAL-CONSULTATION-20261016-V5"||binding.titleId!==pin.titleId||
   binding.version!==review.version||binding.editorialActionVersion!==pin.priorActionVersion||
   binding.reviewHash!==require("./stage07AuthorCorrespondence").validate(review)||
   headers.length!==1||headers[0].value.trim()!==binding.internetMessageId)
   b.deny("EDITORIAL_DECISION_VERSION_CONFLICT");
}
async function execute(pin,review,message,deps){
 const base=`${ROOT}/${pin.titleId}/${pin.replyKey}`,old=await b.optional(deps.containerClient,`${base}/result.json`);
 if(old)return old.value;
 const priorPin=require("../../config/stage07-editorial-actions.json").find(x=>x.titleId===pin.titleId&&x.actionVersion===pin.priorActionVersion);
 if(!priorPin)b.deny("EDITORIAL_DECISION_PRIOR_ACTION_MISSING");
 const priorRoot=`${actions.ROOT}/${pin.titleId}/${pin.priorActionVersion}`;
 const plan=await b.read(deps.containerClient,`${priorRoot}/plan.json`),result=(await b.read(deps.containerClient,`${priorRoot}/result.json`)).value;
 if(b.sha(plan.bytes)!==priorPin.sha256||result.titleId!==pin.titleId||result.actionVersion!==pin.priorActionVersion||result.stageCompletionApproved!==false)
   b.deny("EDITORIAL_DECISION_PRIOR_ACTION_CONFLICT");
 const stage=await require("./pipelineFolderRuntime").readAuthority(pin.titleId,deps),folders=require("./pipelineFolderProjection");
 const folder=await deps.graph(folders.path(folders.FOLDERS[pin.titleId]));
 if(!stage.current||stage.stageCode!=="07_DEVELOPMENTAL_EDITING"||folder.parentReference?.name!=="07 - Developmental Editing")b.deny("EDITORIAL_STAGE_OR_FOLDER_CHANGED");
 const verified=[];let reconstructed;
 for(const artifact of result.artifacts){
  if(!artifact.itemId||!artifact.sha256)b.deny("EDITORIAL_DECISION_ARTIFACT_IDENTITY_MISSING");
  const bytes=await deps.sourceBytes({itemId:artifact.itemId});
  if(b.sha(bytes)!==artifact.sha256&&!reconstructed)reconstructed=await reconstructReviewedDocuments(plan.value,deps);
  const custody=await verifyReviewedArtifact(artifact,bytes,reconstructed?.get(artifact.name));
  verified.push({itemId:artifact.itemId,sha256:b.sha(bytes),recordedSha256:artifact.sha256,name:artifact.name,webUrl:artifact.webUrl,custody});
 }
 const outputPlan={titleId:pin.titleId,actionVersion:`AUTHOR-DECISION-20261020-${pin.replyKey.slice(0,12)}`},artifacts=[];
 let qa={reviewedArtifactCount:verified.length,reviewedBytesVerified:true};
 if(pin.choice==="THREE_INCORPORATION_PROPOSALS_ACCEPTED"){
  const source=await actions.source(plan.value.inputs[0],deps),companion=await actions.source(plan.value.inputs[1],deps);
  const built=await require("../editorial/approvedManuscriptActions").approvedProposals(source,companion,plan.value);
  artifacts.push(await actions.publish(outputPlan,"Til Death approved incorporations WORK IN PROGRESS.docx",built.bytes,deps));
  qa={...qa,...built.qa};
 }
 if(pin.choice==="FEBRUARY_WORKING_VERSION_ACCEPTED"){
  const docs=require("../editorial/approvedManuscriptActions"),quarters=[];
  for(const artifact of verified.filter(x=>x.name.endsWith(".docx"))){
   const opened=await docs.open(await deps.sourceBytes({itemId:artifact.itemId}));quarters.push({qa:{after:docs.inventory(opened.body)}});
  }
  qa={...qa,...docs.annualQa(quarters)};
 }
 const decision={titleId:pin.titleId,version:review.version,reviewHash:require("./stage07AuthorCorrespondence").validate(review),
  replyKey:pin.replyKey,messageId:message.id,internetMessageId:message.internetMessageId,receivedAt:message.receivedDateTime,
  authoredTextSha256:pin.authoredTextSha256,choice:pin.choice,scope:pin.summary,reviewedActionVersion:pin.priorActionVersion,
  reviewedArtifacts:verified,authentication:mail.authentication(message),stageCompletionApproved:false,nextStageAuthorized:false};
 const saved=await b.optional(deps.containerClient,`${base}/decision.json`);
 if(saved){const {authentication,...oldDecision}=saved.value,{authentication:newAuthentication,...newDecision}=decision;
  if(JSON.stringify(oldDecision)!==JSON.stringify(newDecision))b.deny("EDITORIAL_DECISION_REPLAY_CONFLICT");
 }else await b.immutable(deps.containerClient,`${base}/decision.json`,decision);
 const html=Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(review.title)} editorial decision</title><style>body{font:18px/1.6 Georgia,serif;max-width:52rem;margin:3rem auto;padding:0 1rem}a{overflow-wrap:anywhere}</style><h1>${escape(review.title)}</h1><h2>Your October 20 editorial decision</h2><p>${escape(pin.summary)}</p><h2>Current working material</h2><ul>${[...artifacts,...verified].map(x=>`<li><a href="${escape(x.webUrl)}">${escape(x.name)}</a></li>`).join("")}</ul><p>Your reply is preserved with the exact consultation and working version. It need not be sent again. Stage 07 remains open; completed deliverables will return for explicit approval before Stage 08.</p></html>`);
 artifacts.push(await actions.publish(outputPlan,"October 20 author decision and current work.html",html,deps));
 return(await b.immutable(deps.containerClient,`${base}/result.json`,{titleId:pin.titleId,replyKey:pin.replyKey,
  status:"AUTHOR_DECISION_APPLIED_STAGE_HELD",decisionReference:`${base}/decision.json`,artifacts,qa,paidCalls:0,
  correspondence:"NO_ACKNOWLEDGMENT_RESEND",stageCompletionApproved:false,nextStageAuthorized:false})).value;
}
async function run(review,message,classification,binding,deps){
 const pin=pins.find(x=>x.titleId===review.titleId&&x.replyKey===b.sha(message.internetMessageId));
 if(!pin)return null;
 validate(pin,review,message,classification,binding);
 const state=await require("./titleCommissioningIntakeWorker").processTitleCommissioningStep({titleId:pin.titleId,bindingHash:b.sha(JSON.stringify(pin))},
  {...deps,readScope:async()=>({titleId:pin.titleId,enabled:true,revoked:false,mode:"JACKIE_TITLE_INTERNAL_COMMISSIONING"})},
  {namespace:ROOT+"/executions",executionSuffix:"",plan:x=>({...x,executionId:`author-decision:${x.bindingHash}`}),execute:()=>execute(pin,review,message,deps),
   repairVersion:REPAIR_VERSION,recoverHeld,
   validate:x=>x.status==="AUTHOR_DECISION_APPLIED_STAGE_HELD"&&x.stageCompletionApproved===false&&x.nextStageAuthorized===false&&x.paidCalls===0,
   reference:()=>`${ROOT}/${pin.titleId}/${pin.replyKey}/result.json`,completionEffects:()=>({stageCompletionApproved:false,nextStageAuthorized:false,paidCalls:0})});
 return {status:state.status,execution:state,stageCompletionApproved:false,nextStageAuthorized:false};
}
module.exports={ROOT,validate,execute,run,reconstructReviewedDocuments,verifyReviewedArtifact,recoverHeld,REPAIR_VERSION};
