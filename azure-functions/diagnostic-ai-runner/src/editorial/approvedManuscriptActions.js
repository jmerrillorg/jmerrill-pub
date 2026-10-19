"use strict";
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const JSZip = require("jszip");
const { sha, deny } = require("../lifecycle/newSubmissionStage03Budget");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const text = node => Array.from(node.getElementsByTagNameNS(W, "t")).map(x => x.textContent).join("");
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function dateOf(value) {
  const m = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})$/.exec(value.trim());
  return m ? `${m[1]} ${Number(m[2])}` : null;
}
function entries(body) {
  const nodes = Array.from(body.childNodes).filter(x => x.nodeType === 1);
  const starts = nodes.map((node,index) => ({index,date:node.localName === "p" ? dateOf(text(node)) : null})).filter(x=>x.date);
  return starts.map((row,index)=>{const end=nodes.findIndex((n,i)=>i>row.index&&n.localName==="sectPr");return {...row,nodes:nodes.slice(row.index,starts[index+1]?.index ?? (end<0?nodes.length:end))};});
}
function replaceText(node, before, after) {
  if(["fldChar","fldSimple","hyperlink","drawing"].some(tag=>node.getElementsByTagNameNS(W,tag).length))deny("EDITORIAL_COMPLEX_PARAGRAPH_HELD");
  const runs = Array.from(node.getElementsByTagNameNS(W,"t"));
  if(text(node)!==before || !runs.length)deny("EDITORIAL_EXACT_TEXT_MISMATCH");
  runs[0].textContent=after; for(const run of runs.slice(1))run.textContent="";
}
async function open(bytes) {
  const zip=await JSZip.loadAsync(bytes),part=zip.file("word/document.xml");
  if(!part)deny("EDITORIAL_DOCX_REQUIRED");
  const xml=await part.async("string");
  const doc=new DOMParser({onError:()=>deny("EDITORIAL_XML_INVALID")}).parseFromString(xml,"application/xml");
  const bodies=doc.getElementsByTagNameNS(W,"body");
  if(bodies.length!==1)deny("EDITORIAL_BODY_INVALID");
  return {zip,doc,body:bodies[0]};
}
function inventory(body) {
  const rows=entries(body);
  if(new Set(rows.map(x=>x.date)).size!==rows.length)deny("EDITORIAL_DUPLICATE_DATE");
  const required=["The Standing Stone","The Watch","The Still Point","The Word","The Send"];
  return rows.map(row=>{
    const lines=row.nodes.map(text).map(x=>x.trim()).filter(Boolean);
    for(const label of required){const i=lines.indexOf(label);if(i<0||!lines[i+1]||required.includes(lines[i+1]))deny("EDITORIAL_SUBSTANTIVE_ENTRY_MISSING");}
    if(lines.some(x=>/^Soul Dive\b/i.test(x)))deny("EDITORIAL_SOUL_DIVE_IN_ACTIVE_LONG_WATCH");
    return {date:row.date,title:lines[1],bodySha256:sha(lines.slice(1).join("\n")),paragraphs:lines.length};
  });
}
// Exact, reviewed transformations only. No model calls or arbitrary instruction execution.
async function applyLongWatch(bytes, actions) {
  const {zip,doc,body}=await open(bytes),before=inventory(body),changes=[];
  for(const action of actions){
    if(action.kind==="SWAP_DATES"){
      const rows=entries(body),a=rows.find(x=>x.date===action.first),c=rows.find(x=>x.date===action.second);
      if(!a||!c||a===c||a.nodes.map(text).filter(Boolean)[1]!==action.firstTitle||c.nodes.map(text).filter(Boolean)[1]!==action.secondTitle)deny("EDITORIAL_SWAP_SOURCE_MISMATCH");
      const markerA=doc.createComment("editorial-a"),markerC=doc.createComment("editorial-c");
      body.insertBefore(markerA,a.nodes[0]);body.insertBefore(markerC,c.nodes[0]);
      for(const node of a.nodes)body.removeChild(node);for(const node of c.nodes)body.removeChild(node);
      replaceText(a.nodes[0],text(a.nodes[0]),action.second);replaceText(c.nodes[0],text(c.nodes[0]),action.first);
      for(const node of c.nodes)body.insertBefore(node,markerA);for(const node of a.nodes)body.insertBefore(node,markerC);
      body.removeChild(markerA);body.removeChild(markerC);
    } else if(action.kind==="REPLACE_EXACT_PARAGRAPH"){
      const nodes=Array.from(body.getElementsByTagNameNS(W,"p")).filter(x=>text(x)===action.before);
      if(nodes.length!==1||!action.after)deny("EDITORIAL_PARAGRAPH_NOT_UNIQUE");
      replaceText(nodes[0],action.before,action.after);
    } else if(action.kind==="REMOVE_EXACT_ANNOTATION"){
      if(!/^(EDITORIAL HOLD|FORMATION FEBRUARY RECONCILIATION)/.test(action.before))deny("EDITORIAL_ANNOTATION_SCOPE_DENIED");
      const nodes=Array.from(body.childNodes).filter(x=>x.nodeType===1&&x.localName==="p"&&text(x)===action.before);
      if(nodes.length!==action.count)deny("EDITORIAL_ANNOTATION_COUNT_MISMATCH");
      for(const node of nodes)body.removeChild(node);
    } else deny("EDITORIAL_ACTION_NOT_IMPLEMENTED");
    changes.push(action);
  }
  const after=inventory(body);
  if(JSON.stringify(before.map(x=>x.date))!==JSON.stringify(after.map(x=>x.date)))deny("EDITORIAL_DATE_COVERAGE_CHANGED");
  zip.file("word/document.xml",new XMLSerializer().serializeToString(doc),{date:new Date("2026-10-19T00:00:00Z")});
  return {bytes:await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}),qa:{status:"STRUCTURAL_PASS_EDITORIAL_REVIEW_OPEN",before,after,changes,stageCompletionApproved:false,nextStageAuthorized:false}};
}
function annualQa(quarters){
  const actual=quarters.flatMap(x=>x.qa.after),expected=[];
  for(let m=0;m<12;m++)for(let day=1;day<=new Date(Date.UTC(2025,m+1,0)).getUTCDate();day++)expected.push(`${MONTHS[m]} ${day}`);
  if(JSON.stringify(actual.map(x=>x.date))!==JSON.stringify(expected))deny("EDITORIAL_ANNUAL_COVERAGE_INVALID");
  if(new Set(actual.map(x=>x.bodySha256)).size!==365)deny("EDITORIAL_DUPLICATE_DAILY_BODY");
  return {substantiveEntries:365,uniqueDates:365,uniqueBodies:365,stageCompletionApproved:false,nextStageAuthorized:false};
}
module.exports={applyLongWatch,annualQa,open,inventory,entries,text};
