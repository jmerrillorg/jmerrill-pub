"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { registerPublishingWait, dispatchPublishingWait, reconcilePublishingWaits, recoverFailedPublishingWait } = require("../src/lifecycle/publishingWaitCoordinator");
const { createPublishingWaitResumeAdapter } = require("../src/lifecycle/publishingWaitResumeAdapter");
const { signalFor, validateWaitSignal } = require("../src/lifecycle/publishingWaitSignal");
const { bindCorrespondenceIdentity, verifyCorrespondenceIdentity } = require("../src/mail/inbound/correspondenceIdentity");
const id = (n) => `${String(n).padStart(8,"0")}-1111-4111-8111-111111111111`;
function fixture(type = "AUTHOR_REVIEW_RESPONSE") {
  const wait = { schemaVersion: 1, waitId: id(1), titleId: id(2), authorId: id(3), engagementId: id(4), lifecycleInstanceId: id(5),
    stageId: id(6), executionId: "exec1", waitType: type, waitOwner: type === "AUTHOR_REVIEW_RESPONSE" ? "AUTHOR" : "PROVIDER",
    waitReason: "bounded wait", sourceSystem: "DATAVERSE", sourceRecordId: id(7), sourceEventId: "original-event",
    createdAt: "2026-10-02T00:00:00.000Z", nextCheckAt: "2026-10-02T00:00:00.000Z",
    resumeCondition: "canonical-source", resumeAction: "DISPATCH_OWNING_RUNTIME", idempotencyKey: "key1", status: "PENDING" };
  let value = null, version = 0, clock = new Date("2026-10-02T00:01:00.000Z"), effects = 0;
  const receipts = new Map(), projections = [];
  const store = { read: async () => ({ value: structuredClone(value), etag: value ? String(version) : null }),
    compareAndSwap: async (_id, etag, next) => {
      if (etag !== (value ? String(version) : null)) return false;
      value = structuredClone(next); version++; return true;
    }, async *list() { if (value) yield await this.read(); } };
  const handler = { idempotent: true, dispatch: async ({ wait: w }) => {
    if (!receipts.has(w.idempotencyKey)) { effects++; receipts.set(w.idempotencyKey, `evidence-${effects}`); }
    return { accepted: true, executionId: w.executionId, idempotencyKey: w.idempotencyKey,
      dispatchResult: "OWNER_ACCEPTED", businessStateResult: "OWNER_RESULT", evidenceId: receipts.get(w.idempotencyKey) };
  } };
  const runtime = { store, readAuthority: async () => ({ ...wait }), verifyCondition: async () => ({ satisfied: true, evidenceReference: "canonical-proof1" }),
    handlers: { AUTHOR_RESPONSE_CONSUMER: handler, PROVIDER_READBACK_RUNTIME: handler }, now: () => clock,
    publishReady: async (signal) => projections.push(signal) };
  return { wait, runtime, store, handler, projections, current: () => value, effects: () => effects,
    tick: () => { clock = new Date(clock.getTime() + 3600001); } };
}
for (const type of ["AUTHOR_REVIEW_RESPONSE", "PROVIDER_READBACK"]) test(`${type}: producer -> reconciliation -> OPS signal -> owner -> durable replay`, async () => {
  const f = fixture(type);
  assert.equal((await registerPublishingWait(f.wait,f.runtime)).status,"REGISTERED");
  assert.equal((await registerPublishingWait(f.wait,f.runtime)).status,"IDEMPOTENT");
  assert.equal((await reconcilePublishingWaits(f.runtime))[0].status,"READY_PROJECTED");
  const signal = f.projections[0];
  assert.equal((await dispatchPublishingWait(signal,f.runtime)).status,"RESUMED");
  assert.equal((await dispatchPublishingWait(signal,f.runtime)).status,"IDEMPOTENT");
  assert.equal(f.effects(),1);
  assert.equal(f.current().resumeResult.evidenceId,"evidence-1");
  assert.equal(f.current().resumeResult.executionId,f.wait.executionId);
});
test("signals never carry business commands and changed replay is rejected", async () => {
  const f=fixture(); await registerPublishingWait(f.wait,f.runtime);
  const signal=signalFor(f.wait,"canonical-proof1");
  for(const key of ["decision","stageId","email","payment","handler","url"]) assert.throws(()=>validateWaitSignal({...signal,[key]:"effect"}),/INVALID/);
  await dispatchPublishingWait(signal,f.runtime);
  await assert.rejects(dispatchPublishingWait(signalFor(f.wait,"other-proof"),f.runtime),/REPLAY_ALTERED/);
  await assert.rejects(registerPublishingWait({...f.wait,titleId:id(99)},f.runtime),/REPLAY_ALTERED/);
});
test("stale and expired waits are durably quarantined without owner effects", async () => {
  for(const kind of ["stale","expired"]){
    const f=fixture(); if(kind==="expired")f.wait.expiresAt="2026-10-02T00:00:30.000Z";
    await registerPublishingWait(f.wait,f.runtime);
    if(kind==="stale") f.runtime.readAuthority=async()=>({...f.wait,titleId:id(99)});
    await reconcilePublishingWaits(f.runtime);
    assert.equal(f.current().status,kind==="stale"?"SUPERSEDED":"CANCELLED");assert.equal(f.effects(),0);
  }
});
test("owner failure retries with backoff and ends in durable owner-review failure", async () => {
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  f.handler.dispatch=async()=>{throw Object.assign(new Error("private body must not be logged"),{safeCode:"OWNER_UNAVAILABLE"});};
  const signal=signalFor(f.wait,"canonical-proof1");
  await assert.rejects(dispatchPublishingWait(signal,f.runtime),/private body/);
  assert.equal((await dispatchPublishingWait(signal,f.runtime)).status,"BACKOFF");
  for(let i=0;i<4;i++){f.tick();await reconcilePublishingWaits(f.runtime);}
  assert.equal(f.current().status,"FAILED");assert.equal(f.current().attempts,5);
  assert.equal(f.current().lastFailure.code,"OWNER_UNAVAILABLE");
  assert.equal(f.current().lastFailure.recovery,"OWNER_REVIEW_REQUIRED");
  assert.equal(JSON.stringify(f.current()).includes("private body"),false);
});
test("expired claim recovers missing completion with stable owner idempotency and fresh fence", async () => {
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  const adapter=createPublishingWaitResumeAdapter(f.runtime),signal=signalFor(f.wait,"canonical-proof1"),proof=await f.runtime.verifyCondition();
  const first=await adapter.claimResume(f.wait,signal,proof);
  await adapter.dispatchExact(f.wait,f.wait,proof,first); // crash before result persistence
  f.tick();await reconcilePublishingWaits(f.runtime);
  assert.equal(f.effects(),1);assert.equal(f.current().status,"RESUMED");
  assert.notEqual(f.current().resumeResult.claimId,first.claimId);
  await assert.rejects(adapter.markResumed(f.wait,signal,proof,first,{}),/CLAIM_LOST/);
});
test("unproven human decision remains waiting with no signal or dispatch",async()=>{
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  f.runtime.verifyCondition=async()=>({satisfied:false,reason:"EXACT_DELIVERY_HEADER_BINDING_MISSING"});
  assert.equal((await reconcilePublishingWaits(f.runtime))[0].status,"WAITING");assert.equal(f.projections.length,0);assert.equal(f.effects(),0);
});
test("verified correspondence binding is not a portal credential and rechecks primary authority", async()=>{
  const records=new Map();let primary="primary@example.com";
  const deps={client:{first:async()=>({emailaddress1:primary})},store:{getCheckpoint:async key=>records.get(key),setCheckpointOnce:async(key,v)=>{records.set(key,v);return v;}},
    graph:{getMessage:async()=>({id:"message1",internetMessageId:"<message1>",receivedDateTime:"2026-09-23T20:57:36Z",from:{emailAddress:{address:primary}},
      body:{contentType:"text",content:"I am making an email for correspondence. It is alternate@example.com so I won't miss communications."}})}};
  const record=await bindCorrespondenceIdentity({authorId:id(3),alternateEmail:"alternate@example.com",sourceMessageId:"message1"},deps);
  assert.equal(record.portalAuthenticationAuthorized,false);
  assert.equal((await verifyCorrespondenceIdentity(id(3),"alternate@example.com",deps)).verified,true);
  primary="different@example.com";
  assert.equal((await verifyCorrespondenceIdentity(id(3),"alternate@example.com",deps)).verified,false);
  deps.graph.getMessage=async()=>({id:"m2",internetMessageId:"<m2>",receivedDateTime:"2026-09-23T20:57:36Z",from:{emailAddress:{address:primary}},body:{contentType:"text",content:"Hello\nOn yesterday wrote:\nIt is attacker@example.com for correspondence"}});
  await assert.rejects(bindCorrespondenceIdentity({authorId:id(3),alternateEmail:"attacker@example.com",sourceMessageId:"m2"},deps),/DECLARATION_UNPROVEN/);
});
test("dead-letter recovery requires owner authority and preserves failed-attempt lineage",async()=>{
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  const s=await f.store.read();await f.store.compareAndSwap(f.wait.waitId,s.etag,{...s.value,status:"FAILED",attempts:5,lastFailure:{code:"OWNER_UNAVAILABLE"}});
  await assert.rejects(recoverFailedPublishingWait(f.wait.waitId,"recovery1",f.runtime),/AUTHORITY_REQUIRED/);
  f.runtime.verifyRecovery=async()=>false;
  await assert.rejects(recoverFailedPublishingWait(f.wait.waitId,"recovery1",f.runtime),/AUTHORITY_UNPROVEN/);
  f.runtime.verifyRecovery=async()=>true;
  assert.equal((await recoverFailedPublishingWait(f.wait.waitId,"recovery1",f.runtime)).status,"RECOVERY_QUEUED");
  assert.equal(f.current().recoveryHistory[0].previousAttempts,5);assert.equal(f.current().status,"PENDING");
});
test("forged resolution proof cannot spend a legitimate wait's retry budget",async()=>{
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  const signal=signalFor(f.wait,"untrusted-proof");
  assert.equal((await dispatchPublishingWait(signal,f.runtime)).status,"SIGNAL_REJECTED");
  assert.equal(f.current().attempts,undefined);assert.equal(f.effects(),0);
});
test("removing canary scope pauses queued dispatch and reconciliation without losing history",async()=>{
  const f=fixture();await registerPublishingWait(f.wait,f.runtime);
  f.runtime.canDispatch=async()=>false;
  const before=structuredClone(f.current());
  assert.equal((await dispatchPublishingWait(signalFor(f.wait,"canonical-proof1"),f.runtime)).status,"PAUSED_BY_SCOPE");
  assert.equal((await reconcilePublishingWaits(f.runtime))[0].status,"PAUSED_BY_SCOPE");
  assert.deepEqual(f.current(),before);assert.equal(f.effects(),0);
  f.runtime.canDispatch=async()=>true;
  assert.equal((await dispatchPublishingWait(signalFor(f.wait,"canonical-proof1"),f.runtime)).status,"RESUMED");
  assert.equal(f.effects(),1);
});
