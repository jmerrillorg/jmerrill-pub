"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{createHash}=require("node:crypto");
const owner=require("../src/lifecycle/internalMailAttestation"),mail=require("../src/lifecycle/publisherFundedInternalMail");
const now=Date.parse("2026-10-22T10:00:00Z");
function fixture(){
 const evidence=value=>({value,recordedAt:new Date(now-1000).toISOString(),sha256:createHash("sha256").update(JSON.stringify(value)).digest("hex")});
 return {...owner.identity,schemaVersion:1,method:"AUTHORIZED_EXCHANGE_ADMIN_READBACK",checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+owner.MAX_AGE_MS).toISOString(),evidence:{
 trust:evidence({status:"TRUST_READ_COMPLETE",connectors:[],rules:[]}),
 identities:evidence({status:"IDENTITY_READ_COMPLETE",mailboxes:[{PrimarySmtpAddress:owner.identity.mailbox,ExternalDirectoryObjectId:owner.identity.mailboxId},{PrimarySmtpAddress:owner.identity.author,ExternalDirectoryObjectId:owner.identity.authorMailboxId}],rbac:[true,false].map((InScope,i)=>({Mailbox:i?owner.identity.author:owner.identity.mailbox,Result:[{RoleName:"Application Mail.Read",AllowedResourceScope:"JM1-Publishing-Inbound-UAT-Mailbox",InScope}]})),applicationAccess:[owner.identity.mailboxId,owner.identity.authorMailboxId].map((MailboxId,i)=>({MailboxId,AppId:owner.identity.applicationId,AccessCheckResult:i?"Denied":"Granted"}))})}};
}
test("fresh exact administrator evidence permits bounded policy, never arbitrary extension",()=>{
 const x=fixture(),p=owner.validate(x,now);assert.ok(p.version.startsWith("JMP-INTERNAL-MAIL-"));
 for(const alter of [x=>x.applicationId="other",x=>x.expiresAt=new Date(now+owner.MAX_AGE_MS+1).toISOString(),x=>x.checkedAt=new Date(now+1).toISOString(),x=>x.evidence.identities.recordedAt="2026-10-19T00:00:00Z",x=>x.evidence.trust.value.connectors.push({Enabled:true}),x=>x.evidence.identities.value.rbac[1].Result[0].InScope=true]){
  const v=fixture();alter(v);assert.throws(()=>owner.validate(v,now),/ATTESTATION/);
 }
 assert.throws(()=>owner.validate(x,now+owner.MAX_AGE_MS),/EXPIRED/);
});
test("fresh policy is still insufficient without native custody and full internal chain",()=>{
 const p=owner.validate(fixture(),now),message={from:{emailAddress:{address:p.author}},sender:{emailAddress:{address:p.author}},internetMessageHeaders:[]};
 assert.equal(mail.authenticate(message,now),null);mail.bindCustody(message,p.mailbox,p);assert.equal(mail.authenticate(message,now),null);
 const source="CH3PR15MB6500.namprd15.prod.outlook.com";
 message.internetMessageHeaders=[{name:"x-ms-exchange-organization-authas",value:"Internal"},{name:"x-ms-exchange-organization-authmechanism",value:"04"},{name:"x-ms-exchange-organization-authsource",value:source},{name:"x-ms-exchange-organization-network-message-id",value:"11111111-1111-1111-1111-111111111111"},{name:"received",value:`from ${source} by ${source} with SMTP`},{name:"received",value:`from ${source} by ${source} with mapi`}];
 assert.equal(mail.authenticate(message,now).method,"TENANT_VERIFIED_INTERNAL_MAILBOX");
 assert.equal(mail.authenticate({...message},now),null);
 assert.equal(mail.authenticate(message,now+owner.MAX_AGE_MS),null);
 message.internetMessageHeaders.push({name:"Authentication-Results",value:"dmarc=fail"});assert.equal(mail.authenticate(message,now),null);
});
test("private store rejects public access and malformed or missing evidence",async()=>{
 await assert.rejects(()=>owner.load({getProperties:async()=>({blobPublicAccess:"blob"})}),/NOT_PRIVATE/);
 await assert.rejects(()=>owner.load({getProperties:async()=>({}),getBlockBlobClient:()=>({getProperties:async()=>{throw {statusCode:404};}})}),/MISSING/);
});
test("active feed fails closed and recovers without bootstrap or cached trust",async()=>{
 const originalNow=Date.now; Date.now=()=>now;
 let value=fixture(), unavailable=false;
 const container={getProperties:async()=>({}),getBlockBlobClient:path=>{
  assert.equal(path,owner.PATH);
  return {getProperties:async()=>{if(unavailable)throw Object.assign(Error("storage unavailable"),{statusCode:503});return {contentLength:4096,etag:"version"};},
   downloadToBuffer:async(_start,_length,options)=>{assert.equal(options.conditions.ifMatch,"version");return Buffer.from(typeof value==="string"?value:JSON.stringify(value));}};
 }};
 try {
  const first=await owner.load(container);assert.equal(first.expiresAt,fixture().expiresAt);
  for(const corrupt of [x=>{x.expiresAt=new Date(now).toISOString();},x=>{x.tenantId="wrong";},x=>{x.schemaVersion=2;},x=>{delete x.evidence;}]){
   value=fixture();corrupt(value);await assert.rejects(()=>owner.load(container));
  }
  value="{";await assert.rejects(()=>owner.load(container));
  unavailable=true;await assert.rejects(()=>owner.load(container));
  unavailable=false;value=fixture();assert.deepEqual(await owner.load(container),first);
  await assert.rejects(()=>owner.load(null),/STORAGE_REQUIRED/);
 } finally {Date.now=originalNow;}
});
test("omitted attestation never binds embedded historical trust",()=>{
 const message={};mail.bindCustody(message,owner.identity.mailbox);
 assert.equal(mail.authenticate(message,Date.parse(mail.POLICY.checkedAt)),null);
});
