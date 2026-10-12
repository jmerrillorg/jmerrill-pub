"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const stage = require("../src/lifecycle/newSubmissionStage03"), b = require("../src/lifecycle/newSubmissionStage03Budget");
const { CATEGORIES } = require("../src/editorial/commissioningEditorialReviewContract");
function fixture() {
  const titleId = Object.keys(require("../src/lifecycle/freshTitleIntake").POLICIES)[0];
  const records = new Map(); let locked = false, paid = 0, versions = 0;
  const containerClient = { getProperties: async()=>({}), getBlockBlobClient(name) { return {
    name, getProperties: async()=> {if(!records.has(name))throw Object.assign(Error("missing"),{statusCode:404});return{etag:String(records.get(name).version)};},
    downloadToBuffer: async()=>{if(!records.has(name))throw Object.assign(Error("missing"),{statusCode:404});return records.get(name).bytes;},
    uploadData: async(bytes,opts)=>{if(opts.conditions?.ifNoneMatch && records.has(name))throw Object.assign(Error("exists"),{statusCode:412});
      if(locked && name.endsWith("budget.json") && opts.conditions?.leaseId!=="owned")throw Object.assign(Error("lease"),{statusCode:412});
      records.set(name,{bytes:Buffer.from(bytes),version:++versions});},
    getBlobLeaseClient: ()=>({leaseId:"owned",acquireLease:async()=>{if(locked)throw Object.assign(Error("busy"),{statusCode:409});locked=true;},releaseLease:async()=>{locked=false;}})
  };}};
  const source = "One two three four ".repeat(22000), chunks = stage.sections(source);
  const authority={titleId,titleName:"Fixture",sourceSha256:b.sha(source),sources:["EDITORIAL_REVIEW_CANON","GLOBAL_EDITORIAL_KNOWLEDGE"].map(role=>({
    role,id:role,version:"1",content:"Existing approved canon",sha256:b.sha("Existing approved canon"),current:true,approved:true,scope:"GLOBAL",verifiedAt:new Date().toISOString()}))};
  const component={key:"a".repeat(64),binding:{titleId,authority:[],coverage:chunks.map(({text,...p})=>p)},
    source:{text:source,provenance:{sourceSha256:b.sha(source),textSha256:b.sha(source),words:88000,eTag:"1"}},authority,chunks};
  const approval={status:"APPROVED",actorContactId:require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
    purpose:"FIVE_FRESH_STAGE03_ASSESSMENTS",humanEvidenceReference:"actual-human-approval",proposalSha256:"b".repeat(64),limits:b.LIMITS,
    stage04:"NOT_STARTED",sources:Array.from({length:6},()=>({sourceSha256:"c".repeat(64)}))};
  const approvedBytes=Buffer.from(JSON.stringify(approval));records.set(`${b.PREFIX}/approval.json`,{bytes:approvedBytes,version:1});
  const deps={env:{JM1_TITLE_COMMISSIONING_REVIEW_ENABLED:"false",JM1_PUBLISHING_STAGE_RUNTIME_ENABLED:"false",JM1_PUBLISHING_WAIT_RUNTIME_ENABLED:"false",
    JM1_NEW_SUBMISSION_STAGE03_ENABLED:"true",JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256:b.sha(approvedBytes)},containerClient,
    native:async d=>d,prepare:async()=>({p:{titleId,fingerprint:"f".repeat(64)},components:[component]}),
    wait:async()=>{},readDeployment:async()=>({}),countRequest:async prompt=>({inputTokens:1000,verifiedAt:new Date().toISOString(),
      requestSha256:b.sha(JSON.stringify(require("../src/model/providers/microsoftFoundryClaudeProvider").buildRequestBody(prompt,require("../src/lifecycle/gloryReviewRecoveryReaders").route)))}),
    callModel:async({promptBody})=>{paid++;const source=JSON.parse(promptBody).source;return{ok:true,provider:"microsoft-foundry-claude",tokenCounts:{input:1000,output:500},
      output:{intakeSummary:{title:source.title,sourceVersion:source.version,wordCount:source.wordCount,
        genre:"UNKNOWN",audience:"UNKNOWN",draftStage:"UNKNOWN",seriesPotential:"UNKNOWN",comparables:"UNKNOWN",authorIntent:"UNKNOWN",submissionCompleteness:"Section"},
        imprintAlignment:{imprint:"JM Works",authority:"SUGGESTED_ONLY",rationale:"Advisory",publisherApprovalRequired:false},
        categoryScores:Object.fromEntries(CATEGORIES.map(k=>[k,3])),categoryNotes:Object.fromEntries(CATEGORIES.map(k=>[k,"Evidence"])),
        strengths:["One","Two","Three"],risks:["One","Two","Three"],integrityFlags:[],
        styleGuideDetermination:{primaryGuide:"Chicago",secondaryReference:"UNKNOWN",conflicts:"UNKNOWN"},
        recommendation:{pathway:"DEVELOPMENTAL",rationale:"Advisory",forwardChecklist:["Review"],resubmissionEligibility:"UNKNOWN"}}};}};
  return{titleId,deps,records,paid:()=>paid,component};
}
test("runtime saves candidate, bounded actual usage, and section; next invocation resumes next section",async()=>{
  const x=fixture(),body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  const first=await stage.handler(body,x.deps);assert.equal(first.status,202,JSON.stringify(first));assert.equal(x.paid(),1);
  const second=await stage.handler(body,x.deps);assert.equal(second.status,202,JSON.stringify(second));assert.equal(x.paid(),2);
  const ledger=JSON.parse(x.records.get(`${b.PREFIX}/budget.json`).bytes);
  assert.equal(ledger.calls.length,2);assert.equal(ledger.calls[0].actualMicroUsd,7000);
  assert.notEqual(ledger.calls[0].id,ledger.calls[1].id);
  assert.equal(first.jsonBody.stage04,"NOT_STARTED");
});
test("ambiguous timeout blocks replay and further batch calls without duplicate spend",async()=>{
  const x=fixture();let calls=0;x.deps.callModel=async()=>{calls++;throw Error("timeout");};
  const body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  assert.equal((await stage.handler(body,x.deps)).status,409);
  const again=await stage.handler(body,x.deps);assert.equal(again.status,409);assert.equal(calls,1);
  assert.equal(again.jsonBody.code,"STAGE03_AMBIGUOUS_PROVIDER_EFFECT_HELD");
});
test("invalid output retains candidate; only one bounded known-result retry is allowed",async()=>{
  const x=fixture();let calls=0;x.deps.callModel=async()=>{calls++;return{ok:true,provider:"microsoft-foundry-claude",output:{},tokenCounts:{input:1000,output:500}};};
  const body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"REVIEW_SECTIONS_INVALID");
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"REVIEW_SECTIONS_INVALID");
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"STAGE03_BATCH_BUDGET_EXCEEDED");
  assert.equal(calls,2);assert([...x.records.keys()].filter(k=>k.includes("candidates/")).length===2);
});
test("missing approval and changed approval pin deny before model",async()=>{
  const x=fixture();x.deps.env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256="0".repeat(64);
  assert.equal((await stage.handler({titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"},x.deps)).jsonBody.code,"STAGE03_SPEND_APPROVAL_DENIED");
  assert.equal(x.paid(),0);
});
test("explicit rate rejection uses the sole retry, retains failed candidate and respects backoff",async()=>{
  const x=fixture(), body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  const original=x.deps.callModel;let calls=0,waits=0;
  x.deps.wait=async ms=>{assert(ms>0&&ms<=65000);waits++;};
  x.deps.callModel=async request=>{calls++;if(calls===1)return{provider:"microsoft-foundry-claude",ok:false,httpStatus:429,
    output:null,tokenCounts:{input:0,output:0,total:0},error:"MICROSOFT_FOUNDRY_HTTP_429: Rate limit exceeded"};return original(request);};
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"STAGE03_PROVIDER_RATE_LIMIT_REJECTED");
  assert.equal((await stage.handler(body,x.deps)).status,202);
  const ledger=JSON.parse(x.records.get(`${b.PREFIX}/budget.json`).bytes);
  assert.equal(ledger.calls.length,2);assert.equal(ledger.calls[0].actualMicroUsd,0);
  assert.equal(ledger.calls[0].status,"REJECTED_RATE_LIMIT");assert.equal(ledger.calls[1].retry,true);
  assert.equal(waits,1);assert.equal([...x.records.keys()].filter(k=>k.includes("candidates/")).length,2);
});
test("only preserved matching explicit 429 may reconcile an ambiguous legacy result",async()=>{
  const x=fixture();const model={provider:"microsoft-foundry-claude",ok:false,httpStatus:429,output:null,
    tokenCounts:{input:0,output:0,total:0},error:"MICROSOFT_FOUNDRY_HTTP_429: Rate limit exceeded"};
  const call={id:"a:0",bindingHash:"a",index:0,status:"AMBIGUOUS",safeCode:"STAGE03_ACTUAL_USAGE_UNVERIFIED",requestSha256:"hash"};
  await b.immutable(x.deps.containerClient,`${b.PREFIX}/candidates/a/0.json`,{bindingHash:"a",requestSha256:"hash",model,receivedAt:new Date().toISOString()});
  const ledger={calls:[call]};assert.equal(await stage.reconcileRateRejections(ledger,x.deps.containerClient,"approved"),true);
  assert.equal(call.status,"REJECTED_RATE_LIMIT");assert.equal(await stage.reconcileRateRejections(ledger,x.deps.containerClient,"approved"),false);
  assert([...x.records.keys()].some(k=>k.includes("recoveries/")));
  for(const changed of [{httpStatus:500},{httpStatus:null},{failureCode:"MODEL_REQUEST_TIMEOUT"},{output:{}},{tokenCounts:{input:1,output:0,total:1}}])
    assert.equal(stage.rateRejected({...model,...changed}),false);
});
test("complete assessment has canonical output and durable receipt; restart replay calls no model",async()=>{
  const x=fixture();const text="One two three four";
  x.component.chunks=stage.sections(text);x.component.source.provenance.words=4;
  x.component.source.provenance.path="/01_Pipeline_A-Z/02 - Intake/Fixture/source.md";
  x.component.binding.coverage=x.component.chunks.map(({text,...p})=>p);
  const p={titleId:x.titleId,intakeId:"intake",fingerprint:"f".repeat(64)},items=new Map(),bytes=new Map();let uploads=0;
  x.deps.prepare=async()=>({p,prior:{outputs:[{itemId:"working"}]},components:[x.component]});
  const drive=require("../src/lifecycle/freshTitleIntake").driveId;
  const parentPath="/01_Pipeline_A-Z/02 - Intake/Fixture";
  x.deps.graph=async(path,options={})=>{
    if(path.endsWith("/working"))return{parentReference:{id:"working-folder"}};
    if(path.endsWith("/working-folder"))return{parentReference:{id:"manuscripts",driveId:drive,path:"/drives/root:"+parentPath}};
    if(options.method==="POST"){
      const name=JSON.parse(options.body).name;
      const item={id:"assessment-folder",name,folder:{},parentReference:{id:"manuscripts",driveId:drive}};
      items.set(`manuscripts:/${name}`,item);return item;
    }
    const key=path.split("/items/")[1];
    if(options.method==="PUT"){
      const name=decodeURIComponent(key.split(":/")[1].split(":/content")[0]);
      const id="output"+ ++uploads;
      const item={id,name,eTag:'"1"',file:{},size:options.body.length,parentReference:{id:"assessment-folder",driveId:drive}};
      bytes.set(id,Buffer.from(options.body));items.set(key.split(":/content")[0],item);return item;
    }
    if(!items.has(key))throw Object.assign(Error("missing"),{statusCode:404});return items.get(key);
  };
  x.deps.sourceBytes=async({itemId})=>bytes.get(itemId);
  const body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  const first=await stage.handler(body,x.deps);assert.equal(first.status,200,JSON.stringify(first));
  assert.equal(first.jsonBody.receipt.status,"COMPLETED_ASSESSMENT");
  assert.equal(first.jsonBody.receipt.assessments.length,1);
  assert(first.jsonBody.receipt.assessments[0].sharePointOutput.path.startsWith("/01_Pipeline_A-Z/"));
  const replay=await stage.handler(body,x.deps);assert.equal(replay.status,200,JSON.stringify(replay));
  assert.equal(replay.jsonBody.replay,true);assert.equal(x.paid(),1);assert.equal(uploads,1);
  assert.equal(replay.jsonBody.receipt.stage04,"NOT_STARTED");
  const canon=require("../config/commissioning-editorial-review-canon.json");
  x.component.binding.authority=[{role:"EDITORIAL_REVIEW_CANON",sha256:canon.sha256,version:canon.version}];
  const accepted=await stage.handler({...body,mode:"SUBMISSION_03_ACCEPT"},x.deps);
  assert.equal(accepted.status,200,JSON.stringify(accepted));
  assert.equal(accepted.jsonBody.acceptanceReceipt.status,"VALIDATED_ASSESSMENT_PACKAGE");
  assert.equal(accepted.jsonBody.acceptanceReceipt.modelCalls,0);
  const again=await stage.handler({...body,mode:"SUBMISSION_03_ACCEPT"},x.deps);
  assert.equal(again.status,200,JSON.stringify(again));
  assert.deepEqual(again.jsonBody.acceptanceReceipt,accepted.jsonBody.acceptanceReceipt);
  assert.equal(x.paid(),1);assert.equal(uploads,2);
  assert.deepEqual(accepted.jsonBody.receipt,first.jsonBody.receipt);
});
