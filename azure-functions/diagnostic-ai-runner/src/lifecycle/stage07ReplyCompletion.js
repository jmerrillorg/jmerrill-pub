"use strict";
const b=require("./newSubmissionStage03Budget"),mail=require("./publisherFundedStage04Mail"),folders=require("./pipelineFolderProjection");
async function attachments(review,message,base,deps){
 const path=`${base}/attachment-receipts/${b.sha(message.internetMessageId)}.json`;
 const prior=await b.optional(deps.containerClient,path);if(prior)return prior.value;
 const graph=deps.mailGraph||(p=>mail.nativeGraph(p,deps));
 const root=`users/${encodeURIComponent(mail.MAILBOX)}/messages/${encodeURIComponent(message.id)}/attachments`;
 let next=root,seen=new Set(),items=[];
 while(next){
  if(seen.has(next)||seen.size>=20)b.deny("CONSULTATION_ATTACHMENT_PAGINATION_FAILED");seen.add(next);
  const page=await graph(next);if(!Array.isArray(page.value))b.deny("CONSULTATION_ATTACHMENT_LIST_INVALID");
  items.push(...page.value);
  const link=page["@odata.nextLink"];
  if(link&&!link.startsWith(`https://graph.microsoft.com/v1.0/${root}?`))b.deny("CONSULTATION_ATTACHMENT_SCOPE_DENIED");
  next=link?link.slice("https://graph.microsoft.com/v1.0/".length):null;
 }
 const folderId=folders.FOLDERS[review.titleId],folder=await deps.graph(folders.path(folderId));
 if(folder.id!==folderId||folder.parentReference?.name!=="07 - Developmental Editing")b.deny("CONSULTATION_FOLDER_DRIFT");
 const result=[];
 for(const item of items){
  if(item.isInline)continue;
  if(item["@odata.type"]!=="#microsoft.graph.fileAttachment"||!item.id||!item.name||/[\r\n/\\]/.test(item.name)||!item.contentBytes)b.deny("CONSULTATION_ATTACHMENT_REVIEW_REQUIRED");
  const bytes=Buffer.from(item.contentBytes,"base64");if(!bytes.length||bytes.length>20*1024*1024)b.deny("CONSULTATION_ATTACHMENT_SIZE_DENIED");
  const sha256=b.sha(bytes),name=`Author reply ${b.sha(message.internetMessageId).slice(0,12)} - ${item.name}`;
  const blobPath=`${base}/received-attachments/${sha256}`;
  const blob=deps.containerClient.getBlockBlobClient(blobPath);
  try{await blob.uploadData(bytes,{conditions:{ifNoneMatch:"*"}});}catch(e){if(![409,412].includes(e.statusCode))throw e;}
  if(b.sha(await blob.downloadToBuffer())!==sha256)b.deny("CONSULTATION_ATTACHMENT_BLOB_CONFLICT");
  const target=`${folders.path(folderId)}:/${encodeURIComponent(name)}`;let file;
  try{file=await deps.graph(target);}catch(e){if(e.statusCode!==404)throw e;}
  if(!file){try{file=await deps.graph(`${target}:/content`,{method:"PUT",headers:{"Content-Type":item.contentType||"application/octet-stream","If-None-Match":"*"},body:bytes});}catch(e){if(![409,412].includes(e.statusCode))throw e;file=await deps.graph(target);}}
  if(file.parentReference?.id!==folderId||b.sha(await deps.sourceBytes({itemId:file.id}))!==sha256)b.deny("CONSULTATION_ATTACHMENT_FOLDER_CONFLICT");
  result.push({attachmentId:item.id,name:item.name,contentType:item.contentType,bytes:bytes.length,sha256,blobPath,itemId:file.id,webUrl:file.webUrl});
 }
 return(await b.immutable(deps.containerClient,path,{titleId:review.titleId,version:review.version,messageId:message.internetMessageId,attachments:result})).value;
}
async function complete(review,message,classification,custody,base,deps){
 if(["AUTHENTICATION_REVIEW_REQUIRED","IDENTITY_OR_REVIEW_THREAD_MISMATCH"].includes(classification.status))return {status:classification.status};
 const key=b.sha(message.internetMessageId),pin=(deps.replyPins||require("../../config/stage07-reviewed-replies.json")).find(x=>x.titleId===review.titleId&&x.replyKey===key);
 if(!pin)return {status:"AUTHOR_TEXT_REQUIRES_REVIEW"};
 const plan=await b.read(deps.containerClient,`${base}/reviewed-replies/${key}.json`);
 const p=plan.value;
 if(b.sha(plan.bytes)!==pin.sha256||p.titleId!==review.titleId||p.version!==review.version||p.internetMessageId!==message.internetMessageId||p.authoredTextSha256!==b.sha(message.uniqueBody?.content||"")||p.stageCompletionApproved!==false||p.nextStageAuthorized!==false||!p.authority||!p.followupBody||JSON.stringify(p.attachments.map(x=>x.sha256).sort())!==JSON.stringify(custody.attachments.map(x=>x.sha256).sort()))b.deny("CONSULTATION_REVIEWED_DIRECTION_CONFLICT");
 await b.immutable(deps.containerClient,`${base}/recorded-directions/${key}.json`,{...p,authentication:mail.authentication(message),attachmentReceipt:custody});
 const payload={messageType:"APPROVED_AUTHOR_RESPONSE",diagnosticId:review.titleId,intakeReferenceCode:review.intakeReference,
 authorEmail:mail.AUTHOR,authorName:"Jackie Smith, Jr.",projectTitle:review.title,subject:`Re: ${review.subject}`,
 body:p.followupBody,templateName:"STAGE07_AUTHOR_DIRECTION_RECEIPT_V1",templateVersion:key,
 approvedBy:p.authority,approvedOn:p.approvedAt,futureSendRequiresInternalCopy:true,futureSendRequiresDataverseLog:true,
 internalVisibilityMailbox:mail.MAILBOX,cc:[mail.MAILBOX],bcc:[],replyTo:mail.MAILBOX,attachments:[]};
 const sendPath=`${base}/followups/${key}.json`;
 const previous=await b.optional(deps.containerClient,sendPath);
 if(previous)return {status:"DIRECTION_RECORDED_FOLLOWUP_SENT",direction:p,send:previous.value,replay:true};
 await b.immutable(deps.containerClient,`${base}/followup-intents/${key}.json`,{titleId:review.titleId,replyKey:key,payloadSha256:b.sha(JSON.stringify(payload))});
 // Existing relay's immutable payload/idempotency control governs concurrent and ambiguous sends.
 const sent=await(deps.sendConsultation||mail.send)(payload,deps);
 if(!sent.providerMessageId||!sent.communicationRecordId||!sent.sentAt)b.deny("CONSULTATION_FOLLOWUP_RECEIPT_INCOMPLETE");
 const receipt=(await b.immutable(deps.containerClient,sendPath,{...sent,titleId:review.titleId,version:review.version,replyKey:key,stageCompletionApproved:false,nextStageAuthorized:false})).value;
 return {status:"DIRECTION_RECORDED_FOLLOWUP_SENT",direction:p,send:receipt,replay:false};
}
module.exports={attachments,complete};
