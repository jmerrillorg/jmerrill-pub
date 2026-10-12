"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const funding=require("../src/lifecycle/publisherFundedPolicy"),offer=require("../src/lifecycle/publisherFundedOffer"),internal=require("../src/lifecycle/jackieInternalTitlePolicy");
function acceptance(){return {actorContactId:internal.CONTACT,actorCapacity:"PUBLISHER_ONLY",packetSha256:"dfccdea117f0c126f7c5e5008e1eafcb40e614e526f6726a3c2a0b787495c202",reference:"publisher-acceptance",authorElection:"NOT_CAPTURED",stage05:"NOT_STARTED",gloryScope:"FOCUSED_DEVELOPMENTAL",gloryPresentation:"UNRESOLVED_NO_SPLIT_AUTHORIZED",intentionalComponents:"SEPARATE",chadAndMe:"NO_INVENTION",titles:Object.entries(internal.TITLES).map(([titleId,sources])=>({titleId,scopeDecision:"ACCEPTED_AS_PUBLISHER",safeguards:"ALL_STATED_PACKET_SAFEGUARDS_PRESERVED",acceptanceReceiptSha256:"a".repeat(64),components:sources.map(sourceSha256=>({sourceSha256,assessmentSha256:"b".repeat(64),assessment:{sha256:"b".repeat(64)},pathway:"DEVELOPMENTAL"}))}))};}
test("funded offers and agreements bind one cost clause and retain actual author gate",()=>{
 const a=acceptance(),s=funding.authorizeFreshTitles(a),agreement={...offer.BASE,status:"ACTIVE_AUTHORITATIVE",reference:"approved-template",verifiedByteSha256:offer.BASE.sha256};
 for(const t of a.titles){const o=offer.build(funding.POLICY,s,t.titleId,a,agreement);assert.equal(o.authorDueCents,0);assert.equal(o.publisherApprovalIsAuthorElection,false);assert.equal(o.authorElection,"NOT_CAPTURED");assert.equal(o.stage05,"NOT_STARTED");assert.equal(o.fundedTerms.costTreatment.automaticRoyaltyRecoupment,false);assert.deepEqual(offer.validate(o,funding.POLICY,s,t.titleId,a,agreement),o);for(const bad of [{...o,authorDueCents:50000},{...o,authorElection:"ACCEPTED"},{...o,components:[]}])assert.throws(()=>offer.validate(bad,funding.POLICY,s,t.titleId,a,agreement));}
 assert.equal(offer.build(funding.POLICY,s,a.titles[2].titleId,a,agreement).components.length,2);
 for(const bad of [{...agreement,verifiedByteSha256:"c".repeat(64)},{...agreement,status:"UNVERIFIED"}])assert.throws(()=>offer.build(funding.POLICY,s,a.titles[0].titleId,a,bad));
});
test("registered base agreement bytes remain unchanged",()=>{
 const file=path.resolve(__dirname,"../../..","Implementation HQ/01_GOVERNANCE/Agreement Templates/JMP_Publishing_Agreement_v1.3.1.docx");
 assert.equal(crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),offer.BASE.sha256);
});
