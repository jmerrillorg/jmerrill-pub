"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{createHash}=require("node:crypto");
const {PATH,identity,MAX_AGE_MS}=require("../src/lifecycle/internalMailAttestation");
const {HISTORY_CONTAINER,publishInternalMailAttestation}=require("../src/lifecycle/publishInternalMailAttestation");
const now=Date.parse("2026-10-23T15:00:00Z");
function record(at=now){
 const evidence=value=>({value,recordedAt:new Date(at-1000).toISOString(),sha256:createHash("sha256").update(JSON.stringify(value)).digest("hex")});
 return {...identity,schemaVersion:1,method:"AUTHORIZED_EXCHANGE_ADMIN_READBACK",checkedAt:new Date(at).toISOString(),expiresAt:new Date(at+MAX_AGE_MS).toISOString(),evidence:{trust:evidence({status:"TRUST_READ_COMPLETE",connectors:[],rules:[]}),identities:evidence({status:"IDENTITY_READ_COMPLETE",mailboxes:[{PrimarySmtpAddress:identity.mailbox,ExternalDirectoryObjectId:identity.mailboxId},{PrimarySmtpAddress:identity.author,ExternalDirectoryObjectId:identity.authorMailboxId}],rbac:[true,false].map((InScope,i)=>({Mailbox:i?identity.author:identity.mailbox,Result:[{RoleName:"Application Mail.Read",AllowedResourceScope:"JM1-Publishing-Inbound-UAT-Mailbox",InScope}]})),applicationAccess:[identity.mailboxId,identity.authorMailboxId].map((MailboxId,i)=>({MailboxId,AppId:identity.applicationId,AccessCheckResult:i?"Denied":"Granted"}))})}};
}
function containers({activeValue=null,historyOverride=null,failActiveWrites=0,historyWriteError=null,historyReadError=null}={}){
 const objects=new Map(),historyWrites=[];let active=activeValue&&Buffer.from(JSON.stringify(activeValue)),etag=active?"etag-1":null,writeFailures=failActiveWrites;
 const activeClient={getProperties:async()=>{if(!active)throw Object.assign(Error("missing"),{statusCode:404});return {etag};},downloadToBuffer:async(_s,_l,o)=>{if(!active)throw Object.assign(Error("missing"),{statusCode:404});if(o.conditions.ifMatch!==etag)throw Object.assign(Error("changed"),{statusCode:412});return Buffer.from(active);},uploadData:async(bytes,{conditions})=>{if(writeFailures-- >0)throw Object.assign(Error("transient"),{statusCode:503});if(conditions.ifNoneMatch&&active||conditions.ifMatch&&conditions.ifMatch!==etag)throw Object.assign(Error("changed"),{statusCode:412});active=Buffer.from(bytes);etag=`etag-${Number(etag?.split("-")[1]||0)+1}`;}};
 const historyContainer={getBlockBlobClient:name=>({getProperties:async()=>{if(historyReadError)throw Object.assign(Error("history read denied"),{statusCode:historyReadError});if(!objects.has(name))throw Object.assign(Error("missing"),{statusCode:404});return {etag:"history"};},downloadToBuffer:async()=>{if(historyReadError)throw Object.assign(Error("history read denied"),{statusCode:historyReadError});if(!objects.has(name))throw Object.assign(Error("missing"),{statusCode:404});return Buffer.from(objects.get(name));},uploadData:async(bytes,{conditions})=>{historyWrites.push(name);if(historyWriteError)throw Object.assign(Error("history write denied"),{statusCode:historyWriteError});if(conditions.ifNoneMatch&&objects.has(name))throw Object.assign(Error("exists"),{statusCode:412});objects.set(name,historyOverride||Buffer.from(bytes));}})};
 return {historyContainer,activeContainer:{getBlockBlobClient:name=>{assert.equal(name,PATH);return activeClient;}},objects,historyWrites,get active(){return active&&JSON.parse(active);}};
}
test("creates protected-history record, verifies it, then conditionally updates existing active feed",async()=>{
 const fake=containers({activeValue:record(now-60000)}),result=await publishInternalMailAttestation(record(),{...fake,now,sleep:async()=>{}});
 assert.equal(HISTORY_CONTAINER,"jm1-publishing-internal-mail-history");assert.equal(result.historyName,`attestations/2026-10-23/${createHash("sha256").update(JSON.stringify(record())).digest("hex")}.json`);assert.equal(fake.historyWrites.length,1);assert.equal(fake.active.checkedAt,record().checkedAt);
});
test("identical replay reuses the same history and active result",async()=>{
 const value=record(),fake=containers();await publishInternalMailAttestation(value,{...fake,now,sleep:async()=>{}});const result=await publishInternalMailAttestation(value,{...fake,now,sleep:async()=>{}});
 assert.equal(result.reused,true);assert.equal(fake.historyWrites.length,2);assert.equal(fake.objects.size,1);assert.equal(fake.active.checkedAt,value.checkedAt);
});
test("overlapping identical publishers converge on one history record and active hash",async()=>{
 const value=record(),fake=containers();
 const results=await Promise.all([1,2].map(()=>publishInternalMailAttestation(value,{...fake,now,sleep:async()=>{}})));
 assert.equal(results.length,2);assert.equal(fake.objects.size,1);assert.equal(fake.active.checkedAt,value.checkedAt);
 assert.ok(results.every(result=>result.activeHash===createHash("sha256").update(JSON.stringify(value)).digest("hex")));
});
test("overlapping publishers cannot leave an older candidate over a newer attestation",async()=>{
 const fake=containers(),older=record(now-1000),newer=record(now);
 const results=await Promise.allSettled([
  publishInternalMailAttestation(older,{...fake,now,sleep:async()=>{}}),
  publishInternalMailAttestation(newer,{...fake,now,sleep:async()=>{}})
 ]);
 assert.ok(results.some(result=>result.status==="fulfilled"));
 assert.equal(fake.active.checkedAt,newer.checkedAt);
});
test("refuses to replace an equal-or-newer different active record",async()=>{
 const newer=record(),fake=containers({activeValue:newer});await assert.rejects(()=>publishInternalMailAttestation(record(now-1000),{...fake,now,sleep:async()=>{}}),/ACTIVE_NEWER_OR_EQUAL/);assert.equal(fake.historyWrites.length,0);
});
test("does not publish active when history readback differs",async()=>{
 const fake=containers({historyOverride:Buffer.from("{}")});await assert.rejects(()=>publishInternalMailAttestation(record(),{...fake,now,sleep:async()=>{}}),/HISTORY_READBACK_CONFLICT/);assert.equal(fake.active,null);
});
test("identical active replay fails closed when required protected history conflicts",async()=>{
 const value=record(),fake=containers({activeValue:value,historyOverride:Buffer.from("{}")});await assert.rejects(()=>publishInternalMailAttestation(value,{...fake,now,sleep:async()=>{}}),/HISTORY_READBACK_CONFLICT/);assert.equal(fake.active.checkedAt,value.checkedAt);
});
test("identical active replay fails closed when protected history is inaccessible",async()=>{
 const value=record(),fake=containers({activeValue:value,historyReadError:403});await assert.rejects(()=>publishInternalMailAttestation(value,{...fake,now,sleep:async()=>{}}),{statusCode:403});assert.equal(fake.active.checkedAt,value.checkedAt);
});
test("retries transient active write without duplicate history",async()=>{
 const fake=containers({failActiveWrites:1});const result=await publishInternalMailAttestation(record(),{...fake,now,sleep:async()=>{}});assert.equal(result.reused,false);assert.equal(fake.historyWrites.length,1);assert.equal(fake.active.checkedAt,record().checkedAt);
});
test("missing publication clients fail closed",async()=>{await assert.rejects(()=>publishInternalMailAttestation(record(),{now}),/STORAGE_REQUIRED/);});
