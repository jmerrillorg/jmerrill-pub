"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {run}=require("../src/functions/runDistributorCollection");
test("distributor timer is disabled by default",async()=>{assert.equal((await run({}, {},()=>{throw Error("must not call")})).status,"DISABLED")});
test("distributor timer calls only Publishing source collector and surfaces holds",async()=>{
  const errors=[];let calls=0;
  const result=await run({info(){},error:e=>errors.push(e)},{JM1_DISTRIBUTOR_COLLECTION_ENABLED:"true",JM1_ORCHESTRATION_WORKER_KEY:"synthetic"},async(url,options)=>{
    calls++;assert.equal(url,"https://jmerrill.pub/api/publisher/royalties/collect");assert.equal(options.redirect,"error");assert.deepEqual(JSON.parse(options.body),{scheduled:true});return {ok:true,json:async()=>({results:[{month:"2026-10",status:"RETRY_PENDING",attemptId:"synthetic"}]})}
  });assert.equal(calls,1);assert.equal(errors.length,1);assert.equal(result.results.length,1)
});
test("distributor timer never treats a dependency failure as successful collection",async()=>{
  await assert.rejects(run({}, {JM1_DISTRIBUTOR_COLLECTION_ENABLED:"true",JM1_ORCHESTRATION_WORKER_KEY:"synthetic"},async()=>({ok:false,status:503})),/HTTP_503/)
});
