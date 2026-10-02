"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createAuthorWaitOwner, authorWaitFor } = require("../src/lifecycle/publishingAuthorWaitOwner");
const { buildMessageEvidence } = require("../src/mail/inbound/evidenceModel");
const { waitRuntimeOwnsTitle } = require("../src/lifecycle/publishingWaitEnablement");
const id = (n) => `${String(n).padStart(8,"0")}-1111-4111-8111-111111111111`;
function setup() {
  const gate = { jm1pub_editorialapprovalgateid:id(1), _jm1pub_titleid_value:id(2), _jm1pub_editorialstageid_value:id(3),
    _jm1pub_deliverableartifactid_value:id(4), jm1pub_gatestatus:196650002, jm1pub_editorialapprovalgatename:"Developmental review",
    jm1pub_authordecision:null, "@odata.etag":"v1" };
  const stage = { jm1pub_editorialstageid:id(3), _jm1pub_titleid_value:id(2), _jm1pub_contactid_value:id(5),jm1pub_publishingintakereference:"JMP-INT-1" };
  const raw = { id:"graph1",internetMessageId:"<original1>",internetMessageHeaders:[{name:"In-Reply-To",value:"<outbound1>"}],
    receivedDateTime:"2026-10-01T12:00:00Z",from:{emailAddress:{address:"author@example.com"}},body:{contentType:"text",content:"Please make these corrections. Keep the original grid."} };
  const message = buildMessageEvidence(raw);
  const artifact = { jm1pub_editorialartifactid:id(4),_jm1pub_titleid_value:id(2),_jm1pub_editorialstageid_value:id(3),jm1pub_sha256:"a".repeat(64) };
  const delivery = { deliveryId:"delivery1",internetMessageId:"<outbound1>",titleId:id(2),authorId:id(5),stageId:id(3),gateId:id(1),
    artifactId:id(4),artifactHash:"a".repeat(64),engagementId:"JMP-INT-1",deliveryStatus:"SENT_COPY_VERIFIED",deliveredAt:"2026-09-30T12:00:00Z" };
  const logs=[], patches=[];
  const client = {
    first:async(table,q)=>{
      if(table==="jm1pub_editorialapprovalgates")return {...gate};
      if(table==="jm1pub_editorialstages")return {...stage};
      if(table==="jm1pub_titles")return {jm1pub_titleid:id(2),_jm1_primaryauthor_value:id(5),jm1_canonicalauthorcontactreference:`contact:${id(5)}`};
      if(table==="jm1pub_editorialartifacts")return {...artifact};
      if(table==="contacts")return {emailaddress1:"author@example.com"};
      if(table==="jm1_executionlogs")return logs.find(x=>q.$filter.includes(x.jm1_actiontype) && q.$filter.includes("author-review-response:"))||null;
      return null;
    },list:async()=>[],
    create:async(table,payload)=>{assert.equal(table,"jm1_executionlogs");const log={...payload,jm1_executionlogid:`log-${logs.length}`};logs.push(log);return log.jm1_executionlogid;},
    patchIfMatch:async(table,key,payload,etag)=>{assert.equal(table,"jm1pub_editorialapprovalgates");assert.equal(key,id(1));assert.equal(etag,gate["@odata.etag"]);patches.push(payload);Object.assign(gate,payload,{"@odata.etag":"v2"});}
  };
  const inbound = {findMessageByEventId:async()=>message,getDeliveryByInternetMessageId:async()=>delivery,getCheckpoint:async()=>null,
    withBusinessRouteLease:async(_id,run)=>run()};
  const owner=createAuthorWaitOwner({client,inbound,graph:{getMessage:async()=>raw}});
  const wait=authorWaitFor(gate,stage,message,new Date("2026-10-02T00:00:00Z"));
  return {owner,wait,gate,stage,raw,message,artifact,delivery,logs,patches,inbound};
}
test("real author consumer owns correction capture; repeated owner dispatch does not repatch",async()=>{
  const f=setup(),authority=await f.owner.readAuthority(f.wait),proof=await f.owner.verifyCondition(f.wait,authority);
  assert.equal(proof.satisfied,true);
  const result=await f.owner.dispatch({wait:f.wait,proof,idempotencyKey:f.wait.idempotencyKey});
  assert.equal(result.accepted,true);assert.equal(f.patches.length,1);
  assert.notEqual(f.gate.jm1pub_authordecision,null);
  const second=await f.owner.dispatch({wait:f.wait,proof,idempotencyKey:f.wait.idempotencyKey});
  assert.equal(second.businessStateResult,"IDEMPOTENT");assert.equal(f.patches.length,1);
});
test("partial capture evidence is not a completion receipt",async()=>{
  const f=setup();f.logs.push({jm1_actiontype:"AUTHOR_RESPONSE_CAPTURED",jm1_executionlogid:"partial"});
  const a=await f.owner.readAuthority(f.wait),p=await f.owner.verifyCondition(f.wait,a);
  await f.owner.dispatch({wait:f.wait,proof:p,idempotencyKey:f.wait.idempotencyKey});
  assert.equal(f.patches.length,1);
});
for(const [name,mutate] of [
  ["wrong title",f=>f.delivery.titleId=id(99)], ["wrong author",f=>f.delivery.authorId=id(99)],
  ["wrong gate",f=>f.delivery.gateId=id(99)], ["wrong stage",f=>f.delivery.stageId=id(99)],
  ["checksum mismatch",f=>f.delivery.artifactHash="b".repeat(64)], ["stale delivery time",f=>f.delivery.deliveredAt="2026-10-03T00:00:00Z"],
  ["quoted link only",f=>{f.message.inReplyTo=null;f.message.references=null;}],
  ["alternate address unbound",f=>f.message.fromAddress="alternate@example.com"],
  ["raw content changed",f=>f.raw.body.content="I approve"]
])test(`author wait denies ${name}`,async()=>{
  const f=setup();mutate(f);const a=await f.owner.readAuthority(f.wait);const p=await f.owner.verifyCondition(f.wait,a);
  assert.equal(p.satisfied,false);assert.equal(f.patches.length,0);
});
test("cutover requires an explicit title scope and preserves other titles' current owner",()=>{
  assert.equal(waitRuntimeOwnsTitle(id(2),{}),false);
  assert.throws(()=>waitRuntimeOwnsTitle(id(2),{JM1_PUBLISHING_WAIT_RUNTIME_ENABLED:"true"}),/TITLE_SCOPE_REQUIRED/);
  const env={JM1_PUBLISHING_WAIT_RUNTIME_ENABLED:"true",JM1_PUBLISHING_WAIT_TITLE_IDS:id(2)};
  assert.equal(waitRuntimeOwnsTitle(id(2),env),true);assert.equal(waitRuntimeOwnsTitle(id(99),env),false);
});
