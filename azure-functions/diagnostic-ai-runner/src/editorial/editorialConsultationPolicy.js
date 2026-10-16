"use strict";
const {createHash}=require("node:crypto");
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function deny(code){throw Object.assign(new Error(code),{safeCode:code});}
function validate(review){
  if(review?.purpose!=="EDITORIAL_CONSULTATION" || !review.titleId || !review.stageId ||
    !review.version || !review.authorContactId || !review.authorEmail ||
    !Array.isArray(review.sourceHashes) || !review.sourceHashes.length ||
    review.sourceHashes.some(x=>!/^[a-f0-9]{64}$/.test(x)) ||
    !Array.isArray(review.attachments) || !review.attachments.length ||
    review.attachments.some(x=>!x.itemId || !x.version || !/^[a-f0-9]{64}$/.test(x.sha256)) ||
    !Array.isArray(review.questions) || new Set(review.questions.map(q=>q.id)).size!==review.questions.length ||
    review.questions.some(q=>!q.id || !Array.isArray(q.options) || !q.options.length ||
      q.options.some(x=>typeof x!=="string" || !x.trim()))) deny("CONSULTATION_VERSION_BINDING_REQUIRED");
  return digest(review);
}
function recordDecision(review,reply,proof){
  const reviewHash=validate(review);
  if(proof?.authenticated!==true || proof.authorContactId!==review.authorContactId ||
    proof.authorEmail!==review.authorEmail || !proof.sourceReference ||
    !["VERIFIED_AUTHOR_CORRESPONDENCE","DIRECT_AUTHOR_INSTRUCTION"].includes(proof.method))
    deny("CONSULTATION_AUTHOR_AUTHORITY_REQUIRED");
  if(reply?.reviewHash!==reviewHash || reply.titleId!==review.titleId || reply.stageId!==review.stageId ||
    reply.version!==review.version || !reply.messageId || !Number.isFinite(Date.parse(reply.receivedAt)))
    deny("CONSULTATION_STALE_OR_MISMATCHED_RESPONSE");
  const question=review.questions.find(q=>q.id===reply.questionId);
  if(!question || !question.options.includes(reply.choice)) deny("CONSULTATION_CHOICE_REQUIRES_REVIEW");
  const binding={titleId:review.titleId,stageId:review.stageId,reviewHash,version:review.version,
    sourceHashes:review.sourceHashes,questionId:question.id,choice:reply.choice,
    messageId:reply.messageId,receivedAt:reply.receivedAt,authority:proof};
  return {...binding,receiptKey:digest(binding),decisionScope:"EDITORIAL_DIRECTION_ONLY",
    stageCompletionApproved:false,nextStageAuthorized:false};
}
function workEligibility(review,work,decisions){
  const reviewHash=validate(review);
  // Unknown operation scope cannot silently become routine editing.
  if(!work || !["ROUTINE_SOURCE_SUPPORTED","DEPENDENT_EDITORIAL_CHANGE"].includes(work.kind))
    return {ok:false,reason:"WORK_SCOPE_REQUIRED"};
  if(work.kind==="ROUTINE_SOURCE_SUPPORTED") return {ok:true,nextStageAuthorized:false};
  if(!Array.isArray(work.questionIds) || !work.questionIds.length)
    return {ok:false,reason:"DEPENDENCY_SCOPE_REQUIRED"};
  if(!Array.isArray(decisions))return {ok:false,reason:"DECISION_RECORDS_REQUIRED"};
  const verified=decisions.filter(d=>{
    try{return d.receiptKey===recordDecision(review,d,d.authority).receiptKey &&
      d.stageCompletionApproved===false && d.nextStageAuthorized===false;}
    catch{return false;}
  });
  for(const id of work.questionIds){
    if(!review.questions.some(q=>q.id===id))return {ok:false,reason:"UNKNOWN_DEPENDENCY"};
    const matches=verified.filter(d=>d.reviewHash===reviewHash && d.questionId===id &&
      d.titleId===review.titleId && d.stageId===review.stageId && d.version===review.version &&
      d.decisionScope==="EDITORIAL_DIRECTION_ONLY" && d.receiptKey);
    if(!matches.length || new Set(matches.map(d=>d.choice)).size!==1)
      return {ok:false,reason:matches.length?"AUTHOR_DECISION_CONFLICT":"AWAITING_AUTHOR_DECISION",questionId:id};
  }
  return {ok:true,nextStageAuthorized:false};
}
module.exports={validate,recordDecision,workEligibility};
