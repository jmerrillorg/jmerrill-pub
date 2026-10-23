"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const source=fs.readFileSync(require.resolve("../src/functions/runAuthorReviewResponseConsumer"),"utf8");
test("scheduled consumer validates active feed before business owners and signals zero-reply consumption",async()=>{
 let timer, failure=false, loads=0, effects=0;const logs=[];
 const context={info:x=>logs.push(x),error:x=>logs.push(x)};
 vm.runInNewContext(source,{module:{exports:{}},process:{env:{}},require:name=>{
  if(name==="@azure/functions")return {app:{timer:(_n,x)=>{timer=x.handler;},http:()=>{}}};
  if(name.endsWith("newSubmissionStage01"))return {native:async()=>({containerClient:{private:true}})};
  if(name.endsWith("internalMailAttestation"))return {nativeContainer:()=>({private:true}),load:async c=>{assert.equal(c.private,true);loads++;if(failure)throw Error("INTERNAL_MAIL_ATTESTATION_EXPIRED_OR_INVALID");return {version:"JMP-INTERNAL-MAIL-fixture",expiresAt:"2026-10-24T02:43:10.821Z"};}};
  if(name.endsWith("authorReviewResponseConsumer"))return {runAuthorReviewResponseConsumer:async()=>{effects++;return {processed:0,idempotent:5,results:[]};}};
  return {monitor:async()=>{effects++;return [];}};
 }});
 await timer({},context);assert.equal(loads,1);assert.equal(effects,5);
 assert.ok(logs.some(x=>x.includes("result=VALID")&&x.includes("expiresAt=")));
 failure=true;await assert.rejects(()=>timer({},context),/EXPIRED/);assert.equal(effects,5);
 assert.ok(logs.some(x=>x.includes("result=HELD")));
 failure=false;await timer({},context);assert.equal(effects,10);assert.equal(loads,3);
});
