"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { qualify } = require("../src/lifecycle/newSubmissionStage03Acceptance");
const contract = require("../src/editorial/commissioningEditorialReviewContract");
function fixture(scores, pathway) {
  return { intakeSummary: { title: "Fixture", sourceVersion: "1", wordCount: 10,
    ...Object.fromEntries(["genre","audience","draftStage","seriesPotential","comparables","authorIntent","submissionCompleteness"].map(k=>[k,"UNKNOWN"])) },
    imprintAlignment: { imprint:"JM Works",authority:"SUGGESTED_ONLY",rationale:"Advisory",publisherApprovalRequired:true },
    categoryScores:Object.fromEntries(contract.CATEGORIES.map((k,i)=>[k,scores[i]])),
    categoryNotes:Object.fromEntries(contract.CATEGORIES.map(k=>[k,"Evidence"])), strengths:["One","Two","Three"],risks:["One","Two","Three"],integrityFlags:[],
    styleGuideDetermination:{primaryGuide:"Chicago",secondaryReference:"UNKNOWN",conflicts:"UNKNOWN"},
    recommendation:{pathway,rationale:"Model evidence",forwardChecklist:["Review"],resubmissionEligibility:"UNKNOWN"} };
}
test("Intentional component scores cannot promote line/copy below canonical threshold",()=>{
  for(const scores of [[4,4,4,4,3,3,4,3],[4,4,5,4,3,3,4,3]]) {
    const original=fixture(scores,"LINE_AND_COPY"),before=JSON.stringify(original),qa=qualify(original);
    assert.equal(qa.pathway,"DEVELOPMENTAL");assert.equal(qa.corrected,true);assert.equal(JSON.stringify(original),before);
  }
});
test("Glory arithmetic is exact while overlapping canonical routes remain explicit",()=>{
  const qa=qualify(fixture([3,4,3,3,3,3,2,2],"DEVELOPMENTAL"));
  assert.equal(qa.average,2.875);assert.deepEqual(qa.supportedPathways,["DEVELOPMENTAL","REWRITE"]);
  assert.equal(qa.corrected,false);
  assert.throws(()=>qualify(fixture([3,4,3,3,3,3,2,2],"LINE_AND_COPY")),/REQUIRES_REVIEW/);
});
test("qualitative human decline cannot be silently replaced by a numeric route",()=>{
  assert.throws(()=>qualify(fixture([4,4,4,4,3,3,4,3],"DECLINE")),/REQUIRES_REVIEW/);
});
