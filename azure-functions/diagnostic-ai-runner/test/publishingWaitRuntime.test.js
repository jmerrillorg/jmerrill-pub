"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { runWaitReconciliation } = require("../src/functions/runPublishingWaitRuntime");
const { createPublishingWaitRuntime } = require("../src/lifecycle/publishingWaitRuntime");
const { validateWaitSignal } = require("../src/lifecycle/publishingWaitSignal");

test("queue contract uses raw JSON matching the deployed host encoding", () => {
  assert.equal(require("../host.json").extensions.queues.messageEncoding, "none");
  const wire = '{"schemaVersion":1,"eventType":"WAIT_RESOLVED","waitId":"00000001-1111-4111-8111-111111111111","sourceEventId":"resolved_' + "a".repeat(64) + '","owner":"jmerrillorg/jmerrill-pub","evidenceReference":"proof:<source>&version=1"}';
  assert.doesNotThrow(() => validateWaitSignal(JSON.parse(wire)));
});

test("producer outage is observable and does not suppress existing wait reconciliation", async () => {
  let scanned = false, published;
  const runtime = {
    produceAuthorWaits: async () => { throw new Error("private provider response"); },
    store: { async *list() { scanned = true; } },
    publishHealth: async (results, failures) => (published = { results, failures })
  };
  await runWaitReconciliation(runtime);
  assert.equal(scanned, true);
  assert.deepEqual(published.failures, [{ code: "PUBLISHING_WAIT_PRODUCER_FAILED" }]);
  assert.equal(JSON.stringify(published).includes("private"), false);
});

test("one gate source failure does not suppress other scoped gates", async () => {
  const titleId = "00000002-1111-4111-8111-111111111111";
  const previous = [process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED, process.env.JM1_PUBLISHING_WAIT_TITLE_IDS];
  process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED = "true";
  process.env.JM1_PUBLISHING_WAIT_TITLE_IDS = titleId;
  let reads = 0;
  try {
    const runtime = createPublishingWaitRuntime({
      client: { list: async () => [1, 2].map(n => ({ jm1pub_editorialapprovalgateid: `gate${n}`, _jm1pub_titleid_value: titleId })),
        first: async () => { reads++; if (reads === 1) throw new Error("source outage"); return null; } },
      inbound: { listPrefix: async () => [] }, graph: {}, store: {}, projection: {}
    });
    const result = await runtime.produceAuthorWaits();
    assert.equal(reads, 2);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].gateId, "gate1");
  } finally {
    for (const [i, key] of ["JM1_PUBLISHING_WAIT_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_TITLE_IDS"].entries()) {
      if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    }
  }
});

test("health preserves consumed receipt and monitors the remaining business hold without replay",async()=>{
  const titleId="00000002-1111-4111-8111-111111111111";
  const wait={waitId:"00000001-1111-4111-8111-111111111111",titleId,stageId:"stage1",waitType:"AUTHOR_REVIEW_RESPONSE",status:"RESUMED",
    resumeResult:{sourceEventId:"source1",owningRuntime:"AUTHOR_RESPONSE_CONSUMER",businessStateResult:"PUBLISHER_REVIEW_REQUIRED",evidenceId:"audit1",resumedAt:"2026-10-02T00:00:00Z"}};
  const stored=JSON.stringify(wait), writes=new Map();let calls=0;
  const runtime=createPublishingWaitRuntime({client:{},inbound:{},graph:{},now:()=>new Date("2026-10-03T00:00:00Z"),
    store:{async *list(){yield{value:wait};}},owners:{AUTHOR_RESPONSE_CONSUMER:{
      async readBusinessWait(){calls++;return{status:"WAITING_FOR_PUBLISHER_REVIEW",owner:"JM_PUBLISHING",evidenceId:"audit1"};},
      dispatch(){assert.fail("a consumed reply must not be redispatched");}}},
    projection:{getBlockBlobClient:name=>({uploadData:async b=>writes.set(name,JSON.parse(b)),deleteIfExists:async()=>{}})}});
  runtime.canMonitor=()=>true;
  for(let i=0;i<2;i++){
    const health=await runtime.publishHealth([]);
    assert.equal(health.businessWaits[0].status,"WAITING_FOR_PUBLISHER_REVIEW");
    assert.equal(health.businessWaits[0].nextCheckAt,"2026-10-03T00:05:00.000Z");
    assert.deepEqual(health.failures,[]);
  }
  assert.equal(calls,2);assert.equal(JSON.stringify(wait),stored);
  assert.equal(writes.get(`receipts/${wait.waitId}.json`).businessStateResult,"PUBLISHER_REVIEW_REQUIRED");
  runtime.canMonitor=()=>false;
  assert.deepEqual((await runtime.publishHealth([])).businessWaits,[]);
  assert.equal(calls,2);
});

test("business wait read failure is safe, visible and does not erase the terminal receipt",async()=>{
  const writes=[];
  const runtime=createPublishingWaitRuntime({client:{},inbound:{},graph:{},store:{async *list(){yield{value:{
    waitId:"w",titleId:"t",waitType:"AUTHOR_REVIEW_RESPONSE",status:"RESUMED",resumeResult:{evidenceId:"audit",businessStateResult:"PUBLISHER_REVIEW_REQUIRED"}}};}},
    owners:{AUTHOR_RESPONSE_CONSUMER:{readBusinessWait:async()=>{throw new Error("private mail contents");}}},
    projection:{getBlockBlobClient:name=>({uploadData:async()=>writes.push(name),deleteIfExists:async()=>{}})}});
  runtime.canMonitor=()=>true;
  const health=await runtime.publishHealth([]);
  assert.deepEqual(health.failures,[{waitId:"w",code:"BUSINESS_WAIT_READ_FAILED"}]);
  assert.equal(JSON.stringify(health).includes("private"),false);
  assert.ok(writes.includes("receipts/w.json"));
});

test("observation-only timer never invokes producers, queue dispatch or wait-state reconciliation",async()=>{
  let projected=0;
  const result=await runWaitReconciliation({publishHealth:async()=>{projected++;return{failures:[]};},
    produceAuthorWaits:async()=>assert.fail("no correspondence binding or producer"),
    store:{list:()=>assert.fail("no coordinator state mutation")}}, {observationOnly:true});
  assert.equal(result.observationOnly,true);assert.equal(result.registered,0);assert.equal(projected,1);
});

test("observation-only host registers the existing timer but no queue consumer",()=>{
  const result=spawnSync(process.execPath,["-e",`
    const Module=require('node:module'), original=Module._load, registered=[];
    Module._load=function(name,...args){
      if(name==='@azure/functions') return {app:{timer:name=>registered.push(['timer',name]),storageQueue:name=>registered.push(['queue',name])}};
      return original.call(this,name,...args);
    };
    require(${JSON.stringify(require.resolve("../src/functions/runPublishingWaitRuntime"))});
    console.log(JSON.stringify(registered));
  `],{encoding:"utf8",env:{...process.env,JM1_PUBLISHING_WAIT_RUNTIME_ENABLED:"false",JM1_PUBLISHING_WAIT_OBSERVATION_ENABLED:"true"}});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),[["timer","reconcile-publishing-waits"]]);
});
