"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { prepareGhostwritingCompletion: prepare, readGhostwritingCompletion: read, checkGhostwritingCompletionReplay: replay } = require("../src/agreement/ghostwritingCompletionPreparation");
const { selectAgreementTemplateForTrack } = require("../src/agreement/governedAgreementTemplateRegistry");
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  const identity = { ghostwritingEngagementId: id, authorId: id, contactId: id, titleId: id };
  const doc = n => ({ id: n, version: "fixture-1", sha256: "a".repeat(64) });
  return {
    engagement: { ...identity, id, sku: "JMP-GHOST-SHORT", authorizedReviewerIds: ["fixture-client"] },
    terms: { ...doc("fixture-terms"), status: "APPROVED", registryStatus: "ACTIVE", founderApprovalId: "fixture-founder", legalApprovalId: "fixture-legal", applicableSkus: ["JMP-GHOST-SHORT"] },
    executed: { ...identity, status: "EXECUTED", agreement: doc("fixture-agreement"), sow: doc("fixture-sow"), termsId: "fixture-terms", termsVersion: "fixture-1", termsSha256: "a".repeat(64) },
    manuscript: { ...identity, ...doc("fixture-manuscript"), current: true, governedLocationId: "fixture-location" },
    acceptance: { ...identity, id: "fixture-acceptance", decision: "ACCEPT", revoked: false, manuscriptId: "fixture-manuscript", manuscriptVersion: "fixture-1", manuscriptSha256: "a".repeat(64), actorId: "fixture-client", recordedAt: "2026-10-02T00:00:00Z" },
    clearance: { ...identity, rights: "PASS", payment: "PASS", evidenceId: "fixture-clearance", manuscriptSha256: "a".repeat(64), termsSha256: "a".repeat(64) },
    election: { ...identity, id: "fixture-election", path: "GHOSTWRITING_ONLY", actorId: "fixture-client", revoked: false }
  };
}
test("ghostwriting-only prepares no Publishing enrollment or stage effects", () => {
  const p = prepare(fixture());assert.equal(p.request.destination,null);assert.equal(p.request.stageAdvancementAuthorized,false);
  assert.equal(p.status,"PREPARED_NOT_EXECUTED");assert.equal(p.request.owner,"GHOSTWRITING_COMPLETION_OWNER");
});
test("Publishing election binds an existing intake owner without bypassing agreement", () => {
  const a=fixture();a.election.path="PUBLISHING_INTAKE";
  a.destination={...a.clearance,intakeId:id,publishingEngagementId:null,ownerVerified:true};
  const p=prepare(a);assert.equal(p.request.owner,"PUBLISHING_INTAKE_OWNER");assert.equal(p.request.publishingAgreementImplied,false);
});
test("all unapproved or inactive terms are denied", () => {
  for(const mutate of [a=>a.terms.status="REVIEW_DRAFT",a=>a.terms.registryStatus="INACTIVE",a=>a.terms.legalApprovalId=null,a=>a.terms.founderApprovalId=null,a=>a.terms.applicableSkus=[]]){
    const a=fixture();mutate(a);assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_TERMS_NOT_APPROVED"});
  }
});
test("unknown template does not fall back to publishing agreement", () => {
  for(const sku of ["SHORT","STANDARD","EXTENDED","PREMIUM","ANTHOLOGY"])assert.throws(()=>selectAgreementTemplateForTrack(`JMP-GHOST-${sku}`),{safeCode:"AGREEMENT_TEMPLATE_SELECTION_FAILED"});
});
test("cross-title and mismatched executed terms deny", () => {
  const a=fixture();a.executed.titleId="22222222-2222-4222-8222-222222222222";assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_EXECUTED_TERMS_MISMATCH"});
  a.executed.titleId=id;a.executed.termsSha256="b".repeat(64);assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_EXECUTED_TERMS_MISMATCH"});
});
test("missing stale revoked or non-attributable acceptance denies", () => {
  for(const mutate of [a=>a.acceptance=null,a=>a.acceptance.revoked=true,a=>a.acceptance.decision="SILENCE",a=>a.acceptance.manuscriptSha256="b".repeat(64),a=>a.acceptance.actorId="operator",a=>a.manuscript.current=false]){
    const a=fixture();mutate(a);assert.throws(()=>prepare(a));
  }
});
test("rights and payment clearance are version-bound", () => {
  for(const mutate of [a=>a.clearance.rights="PENDING",a=>a.clearance.payment="PENDING",a=>a.clearance.manuscriptSha256="b".repeat(64)]){
    const a=fixture();mutate(a);assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_CLEARANCE_REQUIRED"});
  }
});
test("no election or unverified intake cannot enroll", () => {
  const a=fixture();a.election.path="PUBLISHING_INTAKE";assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_INTAKE_OWNER_BINDING_REQUIRED"});
  a.election=null;assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_PATH_ELECTION_REQUIRED"});
});
test("ghostwriting-only rejects a destination", () => {
  const a=fixture();a.destination={intakeId:id};assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_ONLY_CANNOT_ENROLL"});
});
test("replay survives serialized restart and does not authorize execution", () => {
  const p=prepare(fixture());assert.equal(replay(p,null),"NEW");
  assert.equal(replay(p,JSON.parse(JSON.stringify(p))),"REPLAY");assert.equal(p.status,"PREPARED_NOT_EXECUTED");
});
test("same acceptance with altered payload cannot silently route again", () => {
  const a=fixture(),old=prepare(a);a.election.id="changed";const next=prepare(a);
  assert.equal(next.idempotencyKey,old.idempotencyKey);assert.throws(()=>replay(next,old),{safeCode:"GHOSTWRITING_ALTERED_REPLAY_DENIED"});
});
test("reader is required and must return exact engagement", async () => {
  await assert.rejects(read(id),{safeCode:"GHOSTWRITING_AUTHORITY_READER_REQUIRED"});
  await assert.rejects(read(id,{readCanonicalAuthority:async()=>({engagement:{id:"other"}})}),{safeCode:"GHOSTWRITING_READER_IDENTITY_MISMATCH"});
  assert.equal((await read(id,{readCanonicalAuthority:async()=>fixture()})).status,"PREPARED_NOT_EXECUTED");
});
test("approval flags and malformed reviewer collections cannot replace references", () => {
  const a=fixture();a.terms.legalApprovalId=true;assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_TERMS_NOT_APPROVED"});
  a.terms.legalApprovalId="fixture-legal";a.engagement.authorizedReviewerIds="fixture-client";
  assert.throws(()=>prepare(a),{safeCode:"GHOSTWRITING_IDENTITY_INVALID"});
});
test("caller cannot change replay key or prepared payload", () => {
  const p=prepare(fixture());p.idempotencyKey="new-key";
  assert.throws(()=>replay(p,null),{safeCode:"GHOSTWRITING_PLAN_TAMPERED"});
  const q=prepare(fixture());q.request.stageAdvancementAuthorized=true;
  assert.throws(()=>replay(q,null),{safeCode:"GHOSTWRITING_PLAN_TAMPERED"});
});
