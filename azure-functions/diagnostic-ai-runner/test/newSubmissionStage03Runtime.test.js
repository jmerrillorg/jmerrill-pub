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
    readDeployment:async()=>({}),countRequest:async prompt=>({inputTokens:1000,verifiedAt:new Date().toISOString(),
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
test("invalid output retains candidate and prevents same request from being paid twice",async()=>{
  const x=fixture();let calls=0;x.deps.callModel=async()=>{calls++;return{ok:true,provider:"microsoft-foundry-claude",output:{},tokenCounts:{input:1000,output:500}};};
  const body={titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"};
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"REVIEW_SECTIONS_INVALID");
  assert.equal((await stage.handler(body,x.deps)).jsonBody.code,"STAGE03_PAID_REQUEST_ALREADY_ATTEMPTED");
  assert.equal(calls,1);assert([...x.records.keys()].some(k=>k.includes("candidates/")));
});
test("missing approval and changed approval pin deny before model",async()=>{
  const x=fixture();x.deps.env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256="0".repeat(64);
  assert.equal((await stage.handler({titleId:x.titleId,mode:"SUBMISSION_03_EXECUTE"},x.deps)).jsonBody.code,"STAGE03_SPEND_APPROVAL_DENIED");
  assert.equal(x.paid(),0);
});
