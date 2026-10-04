"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {proveCadenceDelivery}=require("../src/mail/inbound/cadenceDeliveryRecovery");
function input(){
 const checksum="a".repeat(64),provider="82df9cc1-a5a1-4be6-9e38-f3a905f1070e",internetMessageId="<202609210902.82df9cc1a5a14be69e38f3a905f1070e-COPY@microsoft.com>";
 return {wait:{titleId:"title1",authorId:"author1",stageId:"stage1",legacyEngagementReference:"intake1"},
  gate:{jm1pub_editorialapprovalgateid:"gate1",_jm1pub_deliverableartifactid_value:"artifact1"},
  artifact:{jm1pub_editorialartifactid:"artifact1",_jm1pub_titleid_value:"title1",_jm1pub_editorialstageid_value:"stage1",jm1pub_sha256:checksum},
  sent:{jm1_executionlogid:"sent1",jm1_sourcerecordid:"stage1",jm1_actiontype:"PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT",createdon:"2026-09-21T09:02:38Z",
   jm1_actiondescription:`DELIVERY_STATUS=SENT; providerMessageId=${provider}; gate=gate1; checksums=editedManuscript:${checksum};`},
  copy:{id:"copy1",internetMessageId,from:{emailAddress:{address:"publishing@email.jmerrill.one"}},toRecipients:[{emailAddress:{address:"author@example.com"}}],
   ccRecipients:[{emailAddress:{address:"publishing@jmerrill.one"}}],receivedDateTime:"2026-09-21T09:02:41Z"},
  internetMessageId,attachments:[{sha256:checksum}],primaryEmail:"author@example.com"};
}
test("recovery requires provider identity, exact sent manifest and mailbox attachment bytes",()=>{
 const i=input(),r=proveCadenceDelivery(i);assert.equal(r.deliveryStatus,"SENT_COPY_VERIFIED");assert.equal(r.gateId,"gate1");assert.equal(r.artifactHash,"a".repeat(64));
});
for(const [label,change] of [
 ["wrong provider",i=>i.internetMessageId=i.internetMessageId.replace("82df","12df")],
 ["wrong attachment",i=>i.attachments[0].sha256="b".repeat(64)],
 ["missing CC",i=>i.copy.ccRecipients=[]],
 ["cross title",i=>i.artifact._jm1pub_titleid_value="other"],
 ["wrong gate",i=>i.gate.jm1pub_editorialapprovalgateid="other"],
 ["duplicate attachment",i=>i.attachments.push({...i.attachments[0]})],
 ["stale timestamp",i=>i.copy.receivedDateTime="2026-09-20T00:00:00Z"]
])test(`delivery recovery denies ${label}`,()=>{const i=input();change(i);assert.equal(proveCadenceDelivery(i),null);});
