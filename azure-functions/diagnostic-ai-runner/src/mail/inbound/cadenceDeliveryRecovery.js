"use strict";
const { createHash } = require("node:crypto");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const same = (a,b) => Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());

function proveCadenceDelivery({ wait, gate, artifact, sent, copy, internetMessageId, attachments, primaryEmail }) {
  const description = sent.jm1_actiondescription || "";
  const provider = /(?:^|;)\s*providerMessageId=([0-9a-f-]{36});/i.exec(description)?.[1];
  const headerProvider = /^<\d{12}\.([0-9a-f]{32})-/i.exec(internetMessageId || "")?.[1];
  const recipients = (copy.toRecipients || []).map(r=>r.emailAddress?.address?.toLowerCase());
  const cc = (copy.ccRecipients || []).map(r=>r.emailAddress?.address?.toLowerCase());
  const checksum = artifact.jm1pub_sha256;
  if (sent.jm1_actiontype !== "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT" || !same(sent.jm1_sourcerecordid,wait.stageId) ||
      !/DELIVERY_STATUS=SENT;/.test(description) || !description.includes(`gate=${gate.jm1pub_editorialapprovalgateid};`) ||
      !/^[a-f0-9]{64}$/i.test(checksum || "") || !description.includes(`editedManuscript:${checksum}`) ||
      !provider || provider.replace(/-/g, "").toLowerCase() !== headerProvider?.toLowerCase() ||
      !same(copy.internetMessageId,internetMessageId) || copy.from?.emailAddress?.address?.toLowerCase() !== "publishing@email.jmerrill.one" ||
      !primaryEmail || !recipients.includes(primaryEmail.toLowerCase()) || !cc.includes("publishing@jmerrill.one") ||
      attachments.filter(a=>a.sha256===checksum).length !== 1 || !Number.isFinite(Date.parse(copy.receivedDateTime)) ||
      !Number.isFinite(Date.parse(sent.createdon)) || Date.parse(copy.receivedDateTime) < Date.parse(sent.createdon) ||
      !same(artifact._jm1pub_titleid_value,wait.titleId) || !same(artifact._jm1pub_editorialstageid_value,wait.stageId) ||
      !same(gate._jm1pub_deliverableartifactid_value,artifact.jm1pub_editorialartifactid)) return null;
  return { deliveryId:`delivery_${hash(sent.jm1_executionlogid).slice(0,32)}`, outboundMessageId:provider,
    internetMessageId, conversationId:copy.conversationId || null, authorId:wait.authorId, titleId:wait.titleId,
    stageId:wait.stageId, engagementId:wait.legacyEngagementReference, gateId:gate.jm1pub_editorialapprovalgateid,
    artifactId:artifact.jm1pub_editorialartifactid, artifactHash:checksum, deliveredAt:sent.createdon,
    mailboxCopyReceivedAt:copy.receivedDateTime, mailboxCopyMessageId:copy.id, deliveryStatus:"SENT_COPY_VERIFIED",
    channel:"ACS_EMAIL", sourceWorkflow:"EDITORIAL_CADENCE_RELEASE", sentRecordId:sent.jm1_executionlogid,
    recoveryAuthority:"EXACT_PROVIDER_HEADER_AND_MAILBOX_ATTACHMENT_CHECKSUM" };
}

async function recoverCadenceDelivery(wait, current, message, {client,inbound,graph}) {
  const gate=current.gate;
  const artifact=await client.first("jm1pub_editorialartifacts",{$filter:`jm1pub_editorialartifactid eq ${gate._jm1pub_deliverableartifactid_value}`});
  const contact=await client.first("contacts",{$filter:`contactid eq ${wait.authorId}`,$select:"contactid,emailaddress1"});
  if (!artifact || !contact?.emailaddress1) return {status:"HELD"};
  const sentRows=await client.list("jm1_executionlogs",{$filter:`jm1_sourcerecordid eq '${wait.stageId}' and jm1_actiontype eq 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT'`,$top:"5000"});
  const proven=[];
  const references = [...new Set([message.inReplyTo, message.references].filter(Boolean).join(" ").match(/<[^<>\s]+>/g) || [])];
  for(const internetMessageId of references) {
    if(await inbound.getDeliveryByInternetMessageId(internetMessageId))continue;
    const copies=await graph.findByInternetMessageId(internetMessageId);
    if(copies.length!==1)continue;
    const copy=copies[0],metadata=await graph.listAttachments(copy.id),attachments=[];
    if(metadata["@odata.nextLink"])continue;
    for(const item of metadata.value || []){
      if(item.isInline || item["@odata.type"]!=="#microsoft.graph.fileAttachment")continue;
      const full=await graph.getAttachmentContent(copy.id,item.id);
      if(full.contentBytes)attachments.push({id:item.id,sha256:hash(Buffer.from(full.contentBytes,"base64"))});
    }
    for(const sent of sentRows){
      const delivery=proveCadenceDelivery({wait,gate,artifact,sent,copy,internetMessageId,attachments,primaryEmail:contact.emailaddress1});
      if(delivery)proven.push(delivery);
    }
  }
  if(proven.length!==1)return {status:proven.length?"AMBIGUOUS":"HELD"};
  await inbound.upsertDelivery(proven[0]);
  return {status:"RECOVERED",deliveryId:proven[0].deliveryId};
}
module.exports={proveCadenceDelivery,recoverCadenceDelivery};
