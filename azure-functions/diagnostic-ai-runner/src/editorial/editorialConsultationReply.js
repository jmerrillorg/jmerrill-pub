"use strict";
const mail=require("../lifecycle/publisherFundedStage04Mail");
const policy=require("./editorialConsultationPolicy");
function classify(message,review,delivery){
 const reviewHash=policy.validate(review);
 const from=message.from?.emailAddress?.address?.toLowerCase();
 const headers=message.internetMessageHeaders||[];
 const replyIds=headers.filter(h=>h.name.toLowerCase()==="in-reply-to")
   .flatMap(h=>h.value.match(/<[^>]+>/g)||[]);
 if(from!==review.authorEmail.toLowerCase() ||
   !message.toRecipients?.some(r=>r.emailAddress?.address?.toLowerCase()===mail.MAILBOX) ||
   !message.id || !message.internetMessageId || !delivery.internetMessageId ||
   delivery.reviewHash!==reviewHash || replyIds.length!==1 || replyIds[0]!==delivery.internetMessageId ||
   message.internetMessageId===delivery.internetMessageId || /^(fw|fwd):/i.test(message.subject||"") ||
   headers.some(h=>/^resent-/i.test(h.name)) ||
   !Number.isFinite(Date.parse(message.receivedDateTime)) ||
   !Number.isFinite(Date.parse(delivery.sentAt)) || Date.parse(message.receivedDateTime)<Date.parse(delivery.sentAt))
   return {status:"IDENTITY_OR_REVIEW_THREAD_MISMATCH",decisions:[],nextStageAuthorized:false};
 const auth=mail.authentication(message);
 if(auth.dmarc!=="pass" && auth.method!=="TENANT_VERIFIED_INTERNAL_MAILBOX")
   return {status:"AUTHENTICATION_REVIEW_REQUIRED",decisions:[],nextStageAuthorized:false};
 // Only new authored text is considered; quoted instructions cannot elect an option.
 const text=(message.uniqueBody?.content||"").trim();
 const decisions=[];
 for(const line of text.split(/\r?\n/)){
   const match=/^([A-Z_]+):\s*([A-Z_]+)\s*$/.exec(line.trim());
   if(!line.trim())continue;
   // Qualifications must be reviewed with the choice, never silently discarded.
   if(!match)return {status:"AUTHOR_TEXT_REQUIRES_REVIEW",decisions:[],nextStageAuthorized:false};
   const question=review.questions.find(q=>q.id===match[1]);
   if(!question || !question.options.includes(match[2]))
     return {status:"AUTHOR_TEXT_REQUIRES_REVIEW",decisions:[],nextStageAuthorized:false};
   decisions.push(policy.recordDecision(review,{reviewHash,titleId:review.titleId,stageId:review.stageId,
     version:review.version,messageId:message.internetMessageId,receivedAt:message.receivedDateTime,
     questionId:match[1],choice:match[2]}, {authenticated:true,authorContactId:review.authorContactId,
     authorEmail:review.authorEmail,sourceReference:message.id,method:"VERIFIED_AUTHOR_CORRESPONDENCE"}));
 }
 if(new Set(decisions.map(d=>d.questionId)).size!==decisions.length)
   return {status:"AUTHOR_DECISION_CONFLICT",decisions:[],nextStageAuthorized:false};
 return {status:decisions.length?"EDITORIAL_CHOICES_CAPTURED":"AUTHOR_TEXT_REQUIRES_REVIEW",
   decisions,authentication:auth,stageCompletionApproved:false,nextStageAuthorized:false};
}
module.exports={classify};
