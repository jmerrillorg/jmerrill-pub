"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),JSZip=require("jszip");
const m=require("../src/editorial/approvedManuscriptActions");
async function fixture(duplicate=false){
 const z=new JSZip(),p=s=>`<w:p><w:r><w:t>${s}</w:t></w:r></w:p>`;
 const entry=(date,title)=>[date,title,"The Standing Stone","source one "+title,"The Watch","source two","The Still Point","source three","The Word","source four","The Send","source five"].map(p).join("");
 z.file("word/document.xml",`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${entry("February 6","Theme: First")}${entry(duplicate?"February 6":"February 14","Theme: Second")}<w:sectPr/></w:body></w:document>`);
 return z.generateAsync({type:"nodebuffer"});
}
const swap={kind:"SWAP_DATES",first:"February 6",second:"February 14",firstTitle:"Theme: First",secondTitle:"Theme: Second"};
test("approved swap moves complete entries once and preserves source bytes",async()=>{
 const input=await fixture(),copy=Buffer.from(input),a=await m.applyLongWatch(input,[swap]),b=await m.applyLongWatch(input,[swap]);
 assert.deepEqual(input,copy);assert.deepEqual(a.bytes,b.bytes);assert.deepEqual(a.qa.after.map(x=>x.title),["Theme: Second","Theme: First"]);
 assert.equal(a.qa.before[0].bodySha256,a.qa.after[1].bodySha256);assert.equal(a.qa.before[1].bodySha256,a.qa.after[0].bodySha256);
 assert.equal(a.qa.stageCompletionApproved,false);
});
test("stale source, duplicate dates and arbitrary instructions are held",async()=>{
 const bytes=await fixture();await assert.rejects(()=>m.applyLongWatch(bytes,[{...swap,firstTitle:"wrong"}]),/SOURCE_MISMATCH/);
 await assert.rejects(()=>m.applyLongWatch(bytes,[{kind:"MODEL_CALL"}]),/NOT_IMPLEMENTED/);
 await assert.rejects(async()=>m.applyLongWatch(await fixture(true),[]),/DUPLICATE_DATE/);
});
test("no invented paragraph or broad deletion is accepted",async()=>{
 const bytes=await fixture();await assert.rejects(()=>m.applyLongWatch(bytes,[{kind:"REPLACE_EXACT_PARAGRAPH",before:"missing",after:"invented"}]),/NOT_UNIQUE/);
 await assert.rejects(()=>m.applyLongWatch(bytes,[{kind:"REMOVE_EXACT_ANNOTATION",before:"source two",count:2}]),/SCOPE_DENIED/);
});
test("partial annual coverage cannot pass",()=>assert.throws(()=>m.annualQa([{qa:{after:[]}}]),/ANNUAL_COVERAGE/));
