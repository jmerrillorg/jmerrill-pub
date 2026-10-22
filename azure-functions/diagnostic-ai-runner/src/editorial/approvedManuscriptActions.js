"use strict";
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const JSZip = require("jszip");
const { sha, deny } = require("../lifecycle/newSubmissionStage03Budget");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const text = node => Array.from(node.getElementsByTagNameNS(W, "t")).map(x => x.textContent).join("");
function readingText(node) {
  if(node.namespaceURI===W){
    if(["pPr","rPr","tblPr","trPr","tcPr","sectPr"].includes(node.localName))return "";
    if(node.localName==="t")return node.textContent;
    if(node.localName==="br"||node.localName==="cr")return "\n";
    if(node.localName==="tab")return "\t";
  }
  return Array.from(node.childNodes||[]).map(readingText).join("");
}
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
async function intentionalSamples(inputs){
  const {Document,Paragraph,TextRun,Packer}=require("docx"),samples=[];
  for(const input of inputs){
    const opened=await open(input.bytes),paragraphs=Array.from(opened.body.getElementsByTagNameNS(W,"p")).map(readingText);
    const heading=t=>t.replace(/^[^A-Za-z]+/u,"").trim().toUpperCase();
    const starts=paragraphs.map((t,i)=>heading(t)===input.date?i:-1).filter(i=>i>=0);
    if(starts.length!==1)deny("EDITORIAL_SAMPLE_DATE_NOT_UNIQUE");
    const end=paragraphs.findIndex((t,i)=>i>starts[0]&&heading(t)===input.nextDate);
    if(end<0)deny("EDITORIAL_SAMPLE_BOUNDARY_MISSING");
    const lines=paragraphs.slice(starts[0],end).filter(x=>x.trim()&&!/^[^A-Za-z0-9]+$/u.test(x.trim()));
    if(!lines.includes("Executive Reflection")||!lines.some(x=>/SOUL DIVE/i.test(x))||!lines.includes("Covenant Charge"))deny("EDITORIAL_SAMPLE_CONTENT_INCOMPLETE");
    samples.push({date:input.date,lines,sourceSha256:sha(input.bytes)});
  }
  const outputs=[];
  for(const [width,height]of [[6,9],[7,10]]){
    const children=[new Paragraph({text:"The Intentional Leader reading flow samples",heading:"Title"}),new Paragraph("Option A preserves the complete daily reflection and Soul Dive while giving secondary labels a quieter visual treatment. Compare the same readings at two trim sizes before manuscript-wide changes. Quarterly print and one annual eBook remain the approved format. These samples do not approve Stage 07 completion.")];
    for(const sample of samples){
      children.push(new Paragraph({text:sample.date,heading:"Heading1",pageBreakBefore:true}));
      for(const line of sample.lines.slice(1)){
        const label=/^(Executive Reflection|Mindful Cue|Soul Prompt|Final Charge|SOUL DIVE|Subtheme:|Guiding Truth:|Extended Inner Reflection|Journaling Prompt|Embodied Practice|Closing Prayer|Covenant Charge)/i.test(line);
        children.push(new Paragraph({spacing:{after:80},keepNext:label&&!line.includes("\n"),children:line.split("\n").map((part,index)=>new TextRun({text:part,break:index?1:0,bold:label}))}));
      }
    }
    const document=new Document({creator:"J Merrill Publishing",styles:{default:{document:{run:{font:"Georgia",size:22},paragraph:{spacing:{line:276}}}}},sections:[{properties:{page:{size:{width:width*1440,height:height*1440},margin:{top:900,bottom:900,left:900,right:900}}},children}]});
    const zip=await JSZip.loadAsync(await Packer.toBuffer(document));
    for(const entry of Object.values(zip.files))entry.date=new Date("2000-01-01T00:00:00Z");
    const core=await zip.file("docProps/core.xml").async("string");zip.file("docProps/core.xml",core.replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]+/g,"$12000-01-01T00:00:00Z"),{date:new Date("2000-01-01T00:00:00Z")});
    const bytes=await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"});
    const check=await open(bytes),all=Array.from(check.body.getElementsByTagNameNS(W,"p")).map(readingText);
    for(const sample of samples)for(const line of sample.lines.slice(1))if(!all.includes(line))deny("EDITORIAL_SAMPLE_TEXT_LOSS");
    outputs.push({name:`Intentional Leader Option A ${width}x${height} sample.docx`,bytes});
  }
  return {outputs,qa:{status:"SAMPLE_CONTENT_PARITY_PASS_VISUAL_REVIEW_OPEN",samples:samples.map(x=>({date:x.date,sourceSha256:x.sourceSha256,paragraphs:x.lines.length})),executiveReflectionPreserved:true,soulDivesPreserved:true,globalRestructuring:false,stageCompletionApproved:false,nextStageAuthorized:false}};
}
async function passageProposals(manuscript,companion,plan){
  const {Document,Paragraph,Packer}=require("docx"),opened=await open(manuscript);
  const paragraphs=Array.from(opened.body.getElementsByTagNameNS(W,"p")).map(readingText);
  const task=(await import("pdfjs-dist/legacy/build/pdf.mjs")).getDocument({data:new Uint8Array(companion),isEvalSupported:false,verbosity:0}),pdf=await task.promise;
  const normalized=s=>s.normalize("NFKC").replace(/\s+/g," ").trim();
  const children=[new Paragraph({text:"Til Death Do Us Part: three selective incorporation proposals",heading:"Title"}),new Paragraph("For your review before insertion. The standalone manuscript is unchanged. These proposals use your companion material selectively, preserve the existing chapter order and do not approve Stage 07 completion.")];
  const checks=[];
  try{for(const proposal of plan.proposals){
    if(paragraphs.filter(x=>x===proposal.anchor).length!==1)deny("EDITORIAL_PROPOSAL_ANCHOR_CHANGED");
    const page=await pdf.getPage(proposal.pdfPage),content=await page.getTextContent();
    if(!normalized(content.items.map(x=>x.str||"").join(" ")).includes(normalized(proposal.excerpt)))deny("EDITORIAL_PROPOSAL_EXCERPT_NOT_FOUND");
    if(!proposal.draft||!proposal.reason||!proposal.decision)deny("EDITORIAL_PROPOSAL_INCOMPLETE");
    children.push(new Paragraph({text:proposal.heading,heading:"Heading1",pageBreakBefore:true}),
      new Paragraph(`Placement: ${proposal.anchor}`),new Paragraph(`Companion source: printed page ${proposal.printedPage}; PDF page ${proposal.pdfPage}.`),
      new Paragraph(`Source passage: ${proposal.excerpt}`),new Paragraph(`Why here: ${proposal.reason}`),
      new Paragraph({text:"Proposed wording, not inserted",heading:"Heading2"}),new Paragraph(proposal.draft),
      new Paragraph({text:"Your decision",heading:"Heading2"}),new Paragraph(proposal.decision));
    checks.push({anchor:proposal.anchor,pdfPage:proposal.pdfPage,sourceExcerptMatched:true});
  }}finally{await task.destroy();}
  if(checks.length!==3)deny("EDITORIAL_PROPOSAL_COUNT_INVALID");
  const document=new Document({creator:"J Merrill Publishing",styles:{default:{document:{run:{font:"Georgia",size:22}}}},sections:[{children}]});
  const zip=await JSZip.loadAsync(await Packer.toBuffer(document));
  for(const entry of Object.values(zip.files))entry.date=new Date("2000-01-01T00:00:00Z");
  zip.file("docProps/core.xml",(await zip.file("docProps/core.xml").async("string")).replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]+/g,"$12000-01-01T00:00:00Z"),{date:new Date("2000-01-01T00:00:00Z")});
  const bytes=await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"});
  const output=await open(bytes),rendered=readingText(output.body);
  for(const proposal of plan.proposals)if(!rendered.includes(proposal.draft)||!rendered.includes(proposal.excerpt))deny("EDITORIAL_PROPOSAL_TEXT_LOSS");
  return {bytes,qa:{checks,manuscriptModified:false,stageCompletionApproved:false,nextStageAuthorized:false}};
}
async function relationshipBridges(bytes,plan){
 const {zip,doc,body}=await open(bytes),serialize=n=>new XMLSerializer().serializeToString(n);
 const original=Array.from(body.childNodes),before=original.map(serialize),paragraphs=original.filter(x=>x.nodeType===1&&x.localName==="p"),added=new Set();
 if(plan.bridges?.length!==3)deny("EDITORIAL_BRIDGE_COUNT_INVALID");
 for(const bridge of plan.bridges){
  const anchor=paragraphs[bridge.paragraphIndex];
  if(!anchor||readingText(anchor).trim()!==bridge.before||!bridge.paragraphs?.length)deny("EDITORIAL_BRIDGE_ANCHOR_CHANGED");
  for(const line of [bridge.heading,...bridge.paragraphs]){
   if(typeof line!=="string"||!line.trim())deny("EDITORIAL_BRIDGE_TEXT_MISSING");
   const p=doc.createElementNS(W,"w:p"),r=doc.createElementNS(W,"w:r"),t=doc.createElementNS(W,"w:t");
   t.setAttribute("xml:space","preserve");t.textContent=line;r.appendChild(t);p.appendChild(r);body.insertBefore(p,anchor);added.add(p);
  }
 }
 if(JSON.stringify(Array.from(body.childNodes).filter(x=>!added.has(x)).map(serialize))!==JSON.stringify(before))deny("EDITORIAL_BRIDGE_SOURCE_CHANGED");
 zip.file("word/document.xml",serialize(doc),{date:new Date("2026-10-19T00:00:00Z")});
 return {bytes:await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}),qa:{originalNodesPreserved:original.length,addedParagraphs:added.size,sourceOrderingPreserved:true,unsplit:true,unresolvedEditorialResultsPreserved:true,stageCompletionApproved:false,nextStageAuthorized:false}};
}
async function approvedProposals(manuscript,companion,plan){
 await passageProposals(manuscript,companion,plan);
 const {zip,doc,body}=await open(manuscript),serialize=n=>new XMLSerializer().serializeToString(n);
 const original=Array.from(body.childNodes),before=original.map(serialize),added=new Set();
 for(const proposal of plan.proposals){
  const anchors=original.filter(x=>x.nodeType===1&&x.localName==="p"&&readingText(x)===proposal.anchor);
  if(anchors.length!==1)deny("EDITORIAL_APPROVED_INSERTION_ANCHOR_CHANGED");
  const p=doc.createElementNS(W,"w:p"),r=doc.createElementNS(W,"w:r"),t=doc.createElementNS(W,"w:t");
  t.setAttribute("xml:space","preserve");t.textContent=proposal.draft;r.appendChild(t);p.appendChild(r);
  body.insertBefore(p,anchors[0].nextSibling);added.add(p);
 }
 if(JSON.stringify(Array.from(body.childNodes).filter(x=>!added.has(x)).map(serialize))!==JSON.stringify(before))deny("EDITORIAL_APPROVED_INSERTION_SOURCE_CHANGED");
 zip.file("word/document.xml",serialize(doc),{date:new Date("2026-10-22T00:00:00Z")});
 return {bytes:await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}),qa:{originalNodesPreserved:original.length,
  approvedParagraphsInserted:3,originalOrderPreserved:true,sourceExcerptsVerified:true,stageCompletionApproved:false,nextStageAuthorized:false}};
}
module.exports={applyLongWatch,annualQa,intentionalSamples,passageProposals,relationshipBridges,approvedProposals,open,inventory,entries,text,readingText};
