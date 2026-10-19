"use strict";
const b = require("./newSubmissionStage03Budget");
const mail = require("./publisherFundedStage04Mail");
const policy = require("../editorial/editorialConsultationPolicy");
const replies = require("../editorial/editorialConsultationReply");
const folders = require("./pipelineFolderProjection");
const sources = require("../../config/jackie-stage07-batch.json");
const PREFIX = "editorial-consultations/stage07";
const MODES = ["CONSULTATION_07_SEND", "CONSULTATION_07_RECONCILE", "CONSULTATION_07_READBACK"];
const version = "EDITORIAL-CONSULTATION-20261016-V5";
const contact = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
const selected = () => require("../../config/stage07-consultation-manifest.json");
function prefix(titleId) { return `${PREFIX}/${titleId}/${version}`; }
function validate(review) {
  const hash = policy.validate(review);
  const expected = sources.sources.filter(s => s.titleId === review.titleId).map(s => s.sourceSha256).sort();
  if (!expected.length || review.version !== version || review.stageId !== "07_DEVELOPMENTAL_EDITING" ||
      review.authorContactId !== contact || review.authorEmail !== mail.AUTHOR ||
      JSON.stringify([...review.sourceHashes].sort()) !== JSON.stringify(expected) ||
      review.stageCompletionRequested !== false || review.authority?.method !== "DIRECT_AUTHOR_INSTRUCTION" ||
      !review.authority.chatReference || !review.subject?.includes(`[JMP-DEV-${review.titleId.slice(0,8)}-V5]`) ||
      !review.body || review.attachments.some(a => !a.blobPath?.startsWith(`${prefix(review.titleId)}/attachments/`) ||
        !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(a.contentType) ||
        !a.name || /[\r\n/\\]/.test(a.name))) b.deny("CONSULTATION_SCOPE_DENIED");
  return hash;
}
async function load(titleId, deps) {
  const pin = selected().find(x => x.titleId === titleId);
  if (!pin) b.deny("CONSULTATION_TITLE_NOT_SELECTED");
  const record = await b.read(deps.containerClient, `${prefix(titleId)}/review-authority-v2.json`);
  if (b.sha(record.bytes) !== pin.sha256 || record.value.titleId !== titleId) b.deny("CONSULTATION_MANIFEST_DRIFT");
  validate(record.value);
  return record.value;
}
async function archive(review, kind, value, deps) {
  const bytes = Buffer.from(JSON.stringify(value)), hash = b.sha(bytes);
  const saved = await b.optional(deps.containerClient, `${prefix(review.titleId)}/folder-${kind}-${hash}.json`);
  if (saved) return saved.value;
  const id = folders.FOLDERS[review.titleId];
  const folder = await deps.graph(folders.path(id));
  if (folder.id !== id || folder.parentReference?.name !== "07 - Developmental Editing") b.deny("CONSULTATION_FOLDER_DRIFT");
  const name = `Stage07-${kind}-${hash.slice(0,16)}.json`;
  const target = `${folders.path(id)}:/${encodeURIComponent(name)}`;
  let item;
  try { item = await deps.graph(target); } catch(e) { if(e.statusCode!==404)throw e; }
  if(!item){
    try { item = await deps.graph(`${target}:/content`, {method:"PUT",headers:{"Content-Type":"application/json","If-None-Match":"*"},body:bytes}); }
    catch(e){if(![409,412].includes(e.statusCode))throw e;item=await deps.graph(target);}
  }
  if (!item.id || item.parentReference?.id !== id) b.deny("CONSULTATION_CUSTODY_FAILED");
  if(b.sha(await deps.sourceBytes({itemId:item.id}))!==hash)b.deny("CONSULTATION_CUSTODY_CONTENT_CONFLICT");
  return (await b.immutable(deps.containerClient, `${prefix(review.titleId)}/folder-${kind}-${hash}.json`,
    { itemId:item.id, webUrl:item.webUrl, sha256:hash, titleId:review.titleId, version:review.version })).value;
}
async function payload(review, deps) {
  const attachments = [];
  for (const a of review.attachments) {
    const blob = deps.containerClient.getBlockBlobClient(a.blobPath), props = await blob.getProperties();
    const bytes = await blob.downloadToBuffer(0, undefined, {conditions:{ifMatch:props.etag}});
    if (b.sha(bytes) !== a.sha256) b.deny("CONSULTATION_ATTACHMENT_DRIFT");
    attachments.push({name:a.name,contentType:a.contentType,contentInBase64:bytes.toString("base64"),
      sha256:a.sha256,role:a.role,version:a.version,artifactId:`${review.titleId}:${a.sha256}`});
  }
  if (Buffer.byteLength(JSON.stringify(attachments)) > 9 * 1024 * 1024)
    b.deny("CONSULTATION_MESSAGE_SIZE_LIMIT");
  return {messageType:"APPROVED_AUTHOR_RESPONSE",diagnosticId:review.titleId,intakeReferenceCode:review.intakeReference,
    authorEmail:mail.AUTHOR,authorName:"Jackie Smith, Jr.",projectTitle:review.title,subject:review.subject,body:review.body,
    templateName:"STAGE07_EDITORIAL_CONSULTATION_V5",templateVersion:review.version,
    approvedBy:review.authority.chatReference,approvedOn:review.authority.recordedAt,
    futureSendRequiresInternalCopy:true,futureSendRequiresDataverseLog:true,
    internalVisibilityMailbox:mail.MAILBOX,cc:[mail.MAILBOX],bcc:[],replyTo:mail.MAILBOX,attachments};
}
async function send(review, deps) {
  const path = `${prefix(review.titleId)}/send.json`, prior = await b.optional(deps.containerClient,path);
  if(prior) return prior.value;
  const message = await payload(review,deps);
  // A relay timeout remains an unresolved intent. The identical relay key/body owns recovery.
  await b.immutable(deps.containerClient,`${prefix(review.titleId)}/send-intent.json`,
    {titleId:review.titleId,reviewHash:validate(review),payloadSha256:b.sha(JSON.stringify(message)),version:review.version});
  const result = await (deps.sendConsultation || mail.send)(message,deps);
  if(!result.providerMessageId || !result.communicationRecordId || !Number.isFinite(Date.parse(result.sentAt)))
    b.deny("CONSULTATION_SEND_RECEIPT_INCOMPLETE");
  return (await b.immutable(deps.containerClient,path,{...result,titleId:review.titleId,version:review.version,
    reviewHash:validate(review),generated:true,sent:true,delivered:false,stageCompletionApproved:false,nextStageAuthorized:false})).value;
}
const SELECT="id,internetMessageId,conversationId,receivedDateTime,subject,from,sender,toRecipients,ccRecipients,internetMessageHeaders";
async function delivery(review,sent,deps) {
  const providerId=require("../generated/communications/publishing-communication-acceptance").providerIdFromInternetMessageId;
  const copies=await mail.pages(mail.MAILBOX,{$filter:`receivedDateTime ge ${sent.sentAt} and from/emailAddress/address eq '${mail.FROM}'`,$select:SELECT,$top:"100"},deps);
  const candidates=copies.filter(x=>providerId(x.internetMessageId||"")===sent.providerMessageId.replaceAll("-","").toLowerCase());
  if(candidates.length>1)b.deny("CONSULTATION_DELIVERY_CONFLICT");
  if(!candidates.length)return null;
  const cc=candidates[0];
  if(cc.subject!==review.subject || !cc.toRecipients?.some(x=>x.emailAddress.address.toLowerCase()===mail.AUTHOR) ||
    !cc.ccRecipients?.some(x=>x.emailAddress.address.toLowerCase()===mail.MAILBOX))b.deny("CONSULTATION_RECIPIENT_CONFLICT");
  let author=[];let authorReadError=null;
  try {author=await mail.pages(mail.AUTHOR,{$filter:`internetMessageId eq '${cc.internetMessageId.replace(/'/g,"''")}'`,$select:SELECT,$top:"10"},deps);}
  catch(e){if(e.statusCode!==403)throw e;authorReadError={status:403,code:e.providerCode||e.safeCode};}
  if(author.length>1)b.deny("CONSULTATION_DELIVERY_CONFLICT");
  const found=author[0];
  if(found&&(found.subject!==review.subject || found.internetMessageId!==cc.internetMessageId ||
    found.from?.emailAddress?.address?.toLowerCase()!==mail.FROM ||
    !found.toRecipients?.some(x=>x.emailAddress?.address?.toLowerCase()===mail.AUTHOR) ||
    !Number.isFinite(Date.parse(found.receivedDateTime))))b.deny("CONSULTATION_RECIPIENT_CONFLICT");
  return {titleId:review.titleId,version:review.version,reviewHash:validate(review),internetMessageId:cc.internetMessageId,
    publishingMessageId:cc.id,authorMessageId:found?.id||null,conversationId:cc.conversationId,sentAt:sent.sentAt,
    deliveredAt:found?.receivedDateTime||null,publishingCopyReceivedAt:cc.receivedDateTime,
    delivered:!!found,authorReadError,authentication:found?mail.authentication(found):{dmarc:"UNVERIFIED"},
    stageCompletionApproved:false,nextStageAuthorized:false};
}
async function reconcile(review,deps) {
  const base=prefix(review.titleId),sent=(await b.optional(deps.containerClient,`${base}/send.json`))?.value;
  if(!sent)return {titleId:review.titleId,status:"NOT_SENT",stageCompletionApproved:false,nextStageAuthorized:false};
  const custodyErrors=[];
  const preserve=async(kind,value)=>{try{await archive(review,kind,value,deps);}catch(e){custodyErrors.push({kind,code:e.safeCode||"CONSULTATION_FOLDER_UNAVAILABLE",status:e.statusCode||null});}};
  await preserve("consultation",review);await preserve("send",sent);
  const prior=await b.optional(deps.containerClient,`${base}/delivery.json`);
  const delivered=prior?.value||await delivery(review,sent,deps);
  if(delivered){
    await b.immutable(deps.containerClient,`${base}/delivery-observations/${b.sha(JSON.stringify(delivered))}.json`,delivered);
    if(delivered.delivered)await b.immutable(deps.containerClient,`${base}/delivery.json`,delivered);
    await preserve("delivery",delivered);
  }
  const results=[];
  if(delivered?.internetMessageId){
    const bindings=[delivered];
    // Replies to a verified follow-up remain bound to this same reviewed title/version.
    for(const pin of require("../../config/stage07-reviewed-replies.json").filter(x=>x.titleId===review.titleId)){
      const followup=(await b.optional(deps.containerClient,`${base}/followups/${pin.replyKey}.json`))?.value;
      if(!followup)continue;
      const bound=(await b.optional(deps.containerClient,`${base}/followup-deliveries/${pin.replyKey}.json`))?.value;
      const observed=bound||await delivery({...review,subject:`Re: ${review.subject}`},followup,deps);
      if(observed?.internetMessageId){
        const binding={...observed,reviewHash:validate(review)};
        await b.immutable(deps.containerClient,`${base}/followup-deliveries/${pin.replyKey}.json`,binding);
        await preserve("followup-delivery",binding);bindings.push(binding);
      }
    }
    // Reviewed source updates may originate in chat rather than an inbound email.
    // Their verified delivery records still bind subsequent author replies here.
    for(const binding of await recordedFollowupBindings(review,deps)){
      if(!bindings.some(x=>x.internetMessageId===binding.internetMessageId))bindings.push(binding);
    }
    for(const message of await mail.replies({deliveredAt:sent.sentAt},deps)){
      const headers=message.internetMessageHeaders||[];
      const matched=bindings.filter(binding=>headers.some(h=>h.name.toLowerCase()==="in-reply-to"&&h.value.trim()===binding.internetMessageId));
      if(matched.length!==1)continue;
      const key=b.sha(message.internetMessageId||message.id),path=`${base}/replies/${key}.json`;
      const saved=await b.optional(deps.containerClient,path);
      const result=replies.classify(message,review,matched[0]);
      const record={titleId:review.titleId,version:review.version,reviewHash:validate(review),messageId:message.id,
        internetMessageId:message.internetMessageId,receivedAt:message.receivedDateTime,authoredText:message.uniqueBody?.content||"",
        ...(matched[0].sourceUpdateVersion?{sourceUpdateVersion:matched[0].sourceUpdateVersion,sourceUpdateSha256:matched[0].sourceUpdateSha256,correspondenceReference:matched[0].internetMessageId}:{}),
        stageCompletionApproved:false,nextStageAuthorized:false};
      if(saved&&JSON.stringify(saved.value)!==JSON.stringify(record))b.deny("CONSULTATION_REPLY_CONTENT_CONFLICT");
      await b.immutable(deps.containerClient,path,record);await preserve("reply",record);
      const evaluation={replyReference:path,reviewHash:validate(review),result};
      await b.immutable(deps.containerClient,`${base}/evaluations/${key}-${b.sha(JSON.stringify(result))}.json`,evaluation);
      await preserve("decision",evaluation);
      let completion={status:result.status};
      try{
        if(result.status!=="IDENTITY_OR_REVIEW_THREAD_MISMATCH"){
          const owner=require("./stage07ReplyCompletion");
          const custody=await owner.attachments(review,message,base,deps);
          await preserve("reply-attachments",custody);
          completion=await owner.complete(review,message,result,custody,base,deps);
          const editorial=await require("./stage07EditorialActions").run(review,message,result,deps);
          if(editorial.status!=="NO_REVIEWED_EXECUTABLE_ACTION")completion={...completion,editorial};
          if(completion.direction)await preserve("author-direction",completion.direction);
          if(completion.send)await preserve("followup",completion.send);
        }
      }catch(e){
        const failure={kind:"reply-completion",replyReference:path,code:e.safeCode||"CONSULTATION_REPLY_COMPLETION_FAILED",status:e.statusCode||null,
          dependencyCode:/^[A-Z_0-9]+$/.test(e.code||"")?e.code:null,stageCompletionApproved:false,nextStageAuthorized:false};
        await b.immutable(deps.containerClient,`${base}/completion-failures/${key}-${b.sha(JSON.stringify(failure))}.json`,failure);
        custodyErrors.push(failure);completion={status:"REPLY_COMPLETION_RETRY_REQUIRED"};
      }
      results.push({reference:path,status:completion.status,replay:!!saved,followup:completion.send||null,editorial:completion.editorial||null});
    }
  }
  return {titleId:review.titleId,version:review.version,generated:true,sent:true,delivery:delivered,
    replies:results,custodyErrors,status:results.length?"EDITORIAL_RESPONSE_CAPTURED_STAGE_HELD":delivered?.delivered?"DELIVERED_AWAITING_EDITORIAL_RESPONSE":"SENT_DELIVERY_READBACK_PENDING",
    stageCompletionApproved:false,nextStageAuthorized:false};
}
async function handler(body,supplied={}) {
  if(!MODES.includes(body?.mode)||!selected().some(x=>x.titleId===body.titleId)||Object.keys(body).some(k=>!["mode","titleId"].includes(k)))
    return {status:400,jsonBody:{code:"CONSULTATION_SCOPE_DENIED"}};
  try{
    const deps=await require("./newSubmissionStage01").native(supplied);
    if((await deps.containerClient.getProperties()).blobPublicAccess)b.deny("CONSULTATION_PRIVATE_STORAGE_REQUIRED");
    const review=await load(body.titleId,deps);
    if(body.mode==="CONSULTATION_07_SEND"){
      const stage=await require("./pipelineFolderRuntime").readAuthority(body.titleId,deps);
      if(!stage.current||stage.stageCode!==review.stageId)b.deny("CONSULTATION_STAGE_CHANGED");
      const hash=validate(review);
      const execution=await require("./titleCommissioningIntakeWorker").processTitleCommissioningStep({titleId:body.titleId,bindingHash:hash},
        {...deps,readScope:async titleId=>({titleId,enabled:true,revoked:false,mode:"JACKIE_TITLE_INTERNAL_COMMISSIONING"})},
        {namespace:`${PREFIX}/send-executions`,executionSuffix:"",plan:x=>({...x,executionId:`consultation:${x.bindingHash}`}),
          execute:()=>send(review,deps),validate:x=>x.sent===true,reference:()=>`${prefix(body.titleId)}/send.json`,
          completionEffects:()=>({stageCompletionApproved:false,nextStageAuthorized:false})});
      if(execution.status!=="COMPLETED")return {status:202,jsonBody:{titleId:body.titleId,execution,stageCompletionApproved:false,nextStageAuthorized:false}};
    }
    if(body.mode==="CONSULTATION_07_READBACK")return {status:200,jsonBody:{titleId:body.titleId,reviewHash:validate(review),
      sent:(await b.optional(deps.containerClient,`${prefix(body.titleId)}/send.json`))?.value||null,
      delivered:(await b.optional(deps.containerClient,`${prefix(body.titleId)}/delivery.json`))?.value||null,
      stageCompletionApproved:false,nextStageAuthorized:false}};
    return {status:200,jsonBody:await reconcile(review,deps)};
  }catch(e){return {status:409,jsonBody:{titleId:body.titleId,code:e.safeCode||"CONSULTATION_DEPENDENCY_FAILED",providerStatus:e.statusCode||null,stageCompletionApproved:false,nextStageAuthorized:false}};}
}
async function monitor(deps={}) {
  const results=[];
  for(const row of selected())results.push(await handler({titleId:row.titleId,mode:"CONSULTATION_07_RECONCILE"},deps));
  return results;
}
async function recordedFollowupBindings(review,deps){
  const root=`${prefix(review.titleId)}/followup-deliveries/`,result=[];
  for await(const item of deps.containerClient.listBlobsFlat({prefix:root})){
    if(!item.name.startsWith(root)||!item.name.endsWith('.json')||result.length>=1000)b.deny('CONSULTATION_FOLLOWUP_INVENTORY_INVALID');
    let {value}=await b.read(deps.containerClient,item.name);
    if(value.editorialActionVersion)value=await editorialBinding(review,value,deps);
    if(value.titleId!==review.titleId||value.version!==review.version||value.reviewHash!==validate(review)||
      !value.internetMessageId||!value.publishingMessageId||!Number.isFinite(Date.parse(value.publishingCopyReceivedAt))||
      value.stageCompletionApproved!==false||value.nextStageAuthorized!==false)b.deny('CONSULTATION_FOLLOWUP_BINDING_INVALID');
    if(value.sourceUpdateVersion&&(!/^[A-Z0-9-]+$/i.test(value.sourceUpdateVersion)||!/^[a-f0-9]{64}$/.test(value.sourceUpdateSha256||'')))b.deny('CONSULTATION_FOLLOWUP_BINDING_INVALID');
    if(value.sourceUpdateVersion){
      const receipt=(await b.read(deps.containerClient,`${prefix(review.titleId)}/source-updates/${value.sourceUpdateVersion}/send.json`)).value;
      if(receipt.titleId!==value.titleId||receipt.reviewVersion!==value.version||receipt.version!==value.sourceUpdateVersion||
        receipt.reviewHash!==value.reviewHash||receipt.sourceUpdateSha256!==value.sourceUpdateSha256||
        receipt.providerMessageId!==value.providerMessageId||receipt.communicationRecordId!==value.communicationRecordId||
        !Number.isFinite(Date.parse(receipt.sentAt))||Date.parse(receipt.sentAt)>Date.parse(value.publishingCopyReceivedAt)||
        (value.sentAt&&value.sentAt!==receipt.sentAt))b.deny('CONSULTATION_FOLLOWUP_RECEIPT_CONFLICT');
      // Recover omitted metadata from its original exact-version receipt, never from clock time.
      value.sentAt=receipt.sentAt;
    }
    result.push(value);
  }
  return result;
}
async function editorialBinding(review,value,deps){
  const pin=require("../../config/stage07-editorial-actions.json").find(x=>x.titleId===review.titleId&&x.actionVersion===value.editorialActionVersion);
  if(!pin||pin.sha256!==value.editorialPlanSha256)b.deny("CONSULTATION_EDITORIAL_BINDING_CONFLICT");
  const root=`editorial-actions/stage07/${review.titleId}/${pin.actionVersion}`;
  const plan=await b.read(deps.containerClient,`${root}/plan.json`),sent=(await b.read(deps.containerClient,`${root}/send.json`)).value;
  const canonical=validate(review),legacy=validate({...review,subject:`Re: ${review.subject}`});
  const providerId=require("../generated/communications/publishing-communication-acceptance").providerIdFromInternetMessageId;
  if(b.sha(plan.bytes)!==pin.sha256||plan.value.reviewHash!==canonical||plan.value.titleId!==review.titleId||
    plan.value.version!==review.version||value.titleId!==review.titleId||value.version!==review.version||
    ![canonical,legacy].includes(value.reviewHash)||sent.providerMessageId!==value.providerMessageId||
    sent.communicationRecordId!==value.communicationRecordId||sent.sentAt!==value.sentAt||
    providerId(value.internetMessageId||"")!==sent.providerMessageId.replaceAll("-","").toLowerCase())
    b.deny("CONSULTATION_EDITORIAL_BINDING_CONFLICT");
  // Preserve the original observation; only its proven subject-derived hash is normalized.
  if(value.reviewHash!==canonical){
    await b.immutable(deps.containerClient,`${root}/binding-recovery.json`,{titleId:review.titleId,actionVersion:pin.actionVersion,
      originalReviewHash:value.reviewHash,reviewHash:canonical,planSha256:pin.sha256,providerMessageId:sent.providerMessageId,
      communicationRecordId:sent.communicationRecordId,stageCompletionApproved:false,nextStageAuthorized:false});
  }
  return {...value,reviewHash:canonical};
}
module.exports={PREFIX,MODES,version,prefix,validate,load,payload,send,delivery,reconcile,handler,monitor,recordedFollowupBindings,editorialBinding};
