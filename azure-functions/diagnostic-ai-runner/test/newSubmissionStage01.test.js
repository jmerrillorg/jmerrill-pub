"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const stage = require("../src/lifecycle/newSubmissionStage01");
const fresh = require("../src/lifecycle/freshTitleIntake");
const contactId = require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
const titleId = Object.keys(fresh.POLICIES)[0];
test("two-source intake index fits notes without weakening full source identity",()=>{
  const components = ["A","B"].map(itemId=>({itemId:itemId.repeat(26),driveId:"d".repeat(90),eTag:"e".repeat(40),bytes:12345,sha256:itemId.toLowerCase().repeat(64),path:"/"+itemId.repeat(180)}));
  const current={input:{title:{jm1pub_titleid:titleId}},components:components.map(custody=>({custody}))};
  const p=stage.plan(current), compact=stage.storedBinding(p);
  assert.ok(JSON.stringify({newSubmissionStage01:compact}).length<=1000);
  assert.equal(compact.fingerprint,p.fingerprint);assert.equal(compact.components[0].path,undefined);
  const row={jm1_publishingintakeid:p.intakeId,jm1_idempotencykey:p.key,jm1_additionalnotes:JSON.stringify({newSubmissionStage01:compact})};
  assert.equal(stage.findExact([row],p),row);
  const full={...row,jm1_additionalnotes:JSON.stringify({newSubmissionStage01:{...compact,components:p.components}})};
  assert.equal(stage.findExact([full],p),full);
  compact.components[0].sha256="c".repeat(64);
  assert.throws(()=>stage.findExact([{...row,jm1_additionalnotes:JSON.stringify({newSubmissionStage01:compact})}],p),/AUTHORITY_CONFLICT/);
  current.components[0].custody.path+="changed";
  assert.notEqual(stage.plan(current).fingerprint,p.fingerprint);
});
function fixture() {
  const rows = [], blobs = new Map(), counts = { creates: 0, sends: 0 };
  const current = { titleName: "Fixture new submission", identity: { contactId },
    input: { title: { jm1pub_titleid: titleId }, source: { reference: "sharepoint:fixture" } },
    components: [{ custody: { itemId: "exact-item", driveId: "exact-drive", sha256: "a".repeat(64), bytes: 10, eTag: "1", path: "/_original/fixture.docx" } }] };
  const deps = { env: { JM1_NEW_SUBMISSION_STAGE01_ENABLED: "true", JM1_NEW_SUBMISSION_STAGE01_TITLE_IDS: titleId,
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    readSource: async () => current, verifyAccess: async () => ({ userId: fresh.RUNTIME_OWNER_ID, rights: {Read:["Global"],Create:["Basic"]} }),
    authorityClient: { first: async () => ({firstname:"Jackie",lastname:"Fixture",emailaddress1:"internal@example.invalid"}) },
    request: async (path, method, body) => {
      assert.ok(path.startsWith("jm1_publishingintakes"));
      if(method === "POST") { counts.creates++; rows.push({...body,createdon:"2026-10-11T00:00:00Z"}); return body; }
      return { value: rows };
    },
    acknowledgment: async () => { counts.sends++; return {generated:true,sent:true,delivered:false,expectedSubject:"Fixture acknowledgment",internetMessageId:"fixture",providerMessageId:"fixture",responseRequired:false,actedUpon:"NOT_REQUIRED_INFORMATIONAL_STAGE"}; },
    recipientReadback: async id => ({value:[{id:"immutable-fixture",internetMessageId:id,receivedDateTime:"2026-10-11T00:01:00Z",toRecipients:[{emailAddress:{address:"internal@example.invalid"}}],from:{emailAddress:{address:"publishing@email.jmerrill.one"}},subject:"Fixture acknowledgment"}]}),
    containerClient: { getBlockBlobClient: path => ({
      getProperties: async () => { if(!blobs.has(path)) throw Object.assign(Error("missing"),{statusCode:404});return {etag:"1"}; },
      downloadToBuffer: async () => blobs.get(path),
      uploadData: async bytes => {if(blobs.has(path)) throw Object.assign(Error("exists"),{statusCode:409});blobs.set(path,Buffer.from(bytes));}
    }) }
  };
  return {deps,rows,blobs,counts,current};
}
test("new original Stage01 creates ordinary intake only and replay preserves one delivered result",async()=>{
  const x=fixture();const body={titleId,mode:"SUBMISSION_01_EXECUTE"};
  const one=await stage.handler(body,x.deps),two=await stage.handler(body,x.deps);
  assert.equal(one.status,200);assert.equal(one.jsonBody.receipt.stageCode,"01_INQUIRY");
  assert.equal(one.jsonBody.receipt.stage02,"PENDING");assert.equal(two.jsonBody.replay,true);
  assert.deepEqual(two.jsonBody.existingReceipt,one.jsonBody.receipt);assert.equal(x.counts.creates,1);assert.equal(x.counts.sends,1);
  assert.equal(x.rows[0].jm1_stage0handoffstatus,835500003);assert.equal(x.rows[0].jm1_acknowledgmentstatus,835500002);
});
test("preflight is read only and does not require isolated identity bindings",async()=>{
  const x=fixture();const r=await stage.handler({titleId,mode:"SUBMISSION_01_PREFLIGHT"},x.deps);
  assert.equal(r.status,200);assert.equal(x.counts.creates,0);assert.equal(x.counts.sends,0);assert.equal(x.blobs.size,0);
});
test("an identifier overlap without complete binding holds before creation",async()=>{
  const x=fixture();x.rows.push({jm1_publishingintakeid:"old",jm1_manuscripturl:"sharepoint:exact-item"});
  const r=await stage.handler({titleId,mode:"SUBMISSION_01_EXECUTE"},x.deps);
  assert.equal(r.jsonBody.code,"COMMISSIONING_SUBMISSION_DUPLICATE_AUTHORITY_CONFLICT");assert.equal(x.counts.creates,0);
});
test("pagination completeness and repeated continuation fail closed",async()=>{
  let calls=0;const result=await stage.inventory({request:async()=>++calls===1?{value:[1],"@odata.nextLink":"page2"}:{value:[2]}});
  assert.deepEqual(result,{rows:[1,2],pages:2});
  await assert.rejects(stage.inventory({request:async()=>({value:[],"@odata.nextLink":"repeat"})}),/INVENTORY_INCOMPLETE/);
});
test("author identity and downstream safety guards prevent writes",async()=>{
  const x=fixture();x.current.identity.contactId="external";
  assert.equal((await stage.handler({titleId,mode:"SUBMISSION_01_EXECUTE"},x.deps)).jsonBody.code,"COMMISSIONING_SUBMISSION_AUTHOR_DENIED");
  x.deps.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED="true";
  assert.equal((await stage.handler({titleId,mode:"SUBMISSION_01_EXECUTE"},x.deps)).jsonBody.code,"COMMISSIONING_SUBMISSION_DOWNSTREAM_NOT_HELD");assert.equal(x.counts.creates,0);
});
test("provider acceptance alone leaves stage pending and recovery reuses exact intake",async()=>{
  const x=fixture();x.deps.acknowledgment=async()=>({generated:true,sent:true,delivered:false});
  let r=await stage.handler({titleId,mode:"SUBMISSION_01_EXECUTE"},x.deps);
  assert.equal(r.status,202);assert.equal(r.jsonBody.stage01,"WAITING_DELIVERY_PROOF");assert.equal(x.blobs.size,0);
  x.deps.acknowledgment=async()=>({generated:true,sent:true,delivered:false,internetMessageId:"fixture",expectedSubject:"Fixture acknowledgment"});
  r=await stage.handler({titleId,mode:"SUBMISSION_01_EXECUTE"},x.deps);
  assert.equal(r.status,200);assert.equal(x.counts.creates,1);
});
test("CC acceptance and caller delivery claim cannot substitute for recipient identity",async()=>{
  const x=fixture(),p=stage.plan(x.current),author=await x.deps.authorityClient.first();
  assert.equal((await stage.verifyRecipient({sent:true,delivered:true,communicationComplete:true},author,p,x.deps)).delivered,false);
  const email={sent:true,internetMessageId:"fixture",expectedSubject:"Fixture acknowledgment"};
  x.deps.recipientReadback=async()=>({value:[]});
  assert.equal((await stage.verifyRecipient(email,author,p,x.deps)).delivered,false);
  x.deps.recipientReadback=async()=>({value:[{id:"other",internetMessageId:"wrong",receivedDateTime:new Date().toISOString()}]});
  await assert.rejects(stage.verifyRecipient(email,author,p,x.deps),/RECIPIENT_IDENTITY_CONFLICT/);
});
test("lost successful create response recovers with same source identity",async()=>{
  const x=fixture(),request=x.deps.request;let lost=false;
  x.deps.request=async(...args)=>{const r=await request(...args);if(args[1]==="POST"&&!lost){lost=true;throw Error("timeout");}return r;};
  const body={titleId,mode:"SUBMISSION_01_EXECUTE"};
  assert.equal((await stage.handler(body,x.deps)).status,409);
  assert.equal((await stage.handler(body,x.deps)).status,200);assert.equal(x.counts.creates,1);
});
test("Local read is accepted only with separately verified complete census parity",async()=>{
  const deps={request:async path=>path==="WhoAmI()"?{UserId:fresh.RUNTIME_OWNER_ID,OrganizationId:"9dafb403-b493-f011-a700-000d3a106f37"}:path.startsWith("privileges")?{value:[{name:"prvReadjm1_PublishingIntake",privilegeid:"read"},{name:"prvCreatejm1_PublishingIntake",privilegeid:"create"}]}:{RolePrivileges:[{PrivilegeId:"read",Depth:"Local"}]}};
  await assert.rejects(stage.verifyCensus({rows:[]},{rights:{Read:["Local"]}},{containerClient:{getBlockBlobClient:()=>({getProperties:async()=>{throw Error("NO_PROOF");}})}}),/NO_PROOF/);
});
test("new route rejects caller source and preserves existing isolated guard",async()=>{
  const r=await require("../src/lifecycle/titleCommissioningSourceRegistration").sourceRegistrationHandler({headers:{get:()=>"key"},json:async()=>({titleId,mode:"SUBMISSION_01_EXECUTE",source:"injected"})},{env:{JM1_DIAGNOSTIC_RUNNER_KEY:"key"}});
  assert.equal(r.status,400);assert.throws(()=>fresh.freshDataverseIdentityBinding({}),/ISOLATED_IDENTITY_UNBOUND/);
});
test("bounded census checks every baseline row and rejects stale or changed snapshots",async()=>{
  const x=fixture();const at=Date.now();const row={jm1_publishingintakeid:"baseline",jm1_additionalnotes:"metadata"};
  const proof={schemaVersion:1,organizationId:"9dafb403-b493-f011-a700-000d3a106f37",runtimeUserId:fresh.RUNTIME_OWNER_ID,
    complete:true,observedAt:new Date(at-1000).toISOString(),expiresAt:new Date(at+60000).toISOString(),
    rows:[{id:"baseline",fingerprint:stage.rowFingerprint(row)}]};
  x.blobs.set("new-submission-stage01/census/authorized-current.json",Buffer.from(JSON.stringify(proof)));
  const access={userId:fresh.RUNTIME_OWNER_ID,rights:{Read:["Local"]}};
  assert.equal((await stage.verifyCensus({rows:[row]},access,x.deps)).rows,1);
  await assert.rejects(stage.verifyCensus({rows:[]},access,x.deps),/CENSUS_CHANGED/);
  await assert.rejects(stage.verifyCensus({rows:[{...row,jm1_additionalnotes:"changed"}]},access,x.deps),/CENSUS_CHANGED/);
  proof.expiresAt=new Date(at-1).toISOString();x.blobs.set("new-submission-stage01/census/authorized-current.json",Buffer.from(JSON.stringify(proof)));
  await assert.rejects(stage.verifyCensus({rows:[row]},access,x.deps),/CENSUS_AUTHORITY_INVALID/);
});
