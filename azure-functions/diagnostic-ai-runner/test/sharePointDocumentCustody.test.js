"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),JSZip=require("jszip"),{verify}=require("../src/editorial/sharePointDocumentCustody");
async function fixture(){const z=new JSZip();z.file("word/document.xml","<document>Exact source</document>");z.file("word/styles.xml","<styles/>");z.file("word/_rels/document.xml.rels",'<Relationships><Relationship Id="rId1" Type="styles" Target="styles.xml"/></Relationships>');z.file("[Content_Types].xml",'<Types><Default Extension="xml" ContentType="application/xml"/></Types>');z.file("docProps/core.xml","<core/>");return z;}
test("custody distinguishes metadata variance from exact byte equality",async()=>{
 const z=await fixture(),before=await z.generateAsync({type:"nodebuffer"});assert.equal((await verify(before,before)).method,"EXACT_BYTES");
 z.file("docProps/core.xml","<core>SharePoint updated metadata</core>");const proof=await verify(before,await z.generateAsync({type:"nodebuffer"}));assert.equal(proof.byteIdentical,false);assert.notEqual(proof.generatedSha256,proof.storedSha256);
 for(const name of ["word/document.xml","word/styles.xml"]){const changed=await JSZip.loadAsync(before);changed.file(name,"changed");const after=await changed.generateAsync({type:"nodebuffer"});await assert.rejects(()=>verify(before,after),/CUSTODY_CONFLICT/);}
});
test("custody rejects changed relationships, content types and unexpected parts",async()=>{
 const z=await fixture(),before=await z.generateAsync({type:"nodebuffer"});
 for(const [name,value] of [["word/_rels/document.xml.rels",'<Relationships><Relationship Id="rId1" Type="styles" Target="evil.xml"/></Relationships>'],["[Content_Types].xml","<Types/>"],["word/vbaProject.bin","unexpected"],["customXml/item1.xml",'<x xmlns="unapproved"/>']]){
  const changed=await JSZip.loadAsync(before);changed.file(name,value);const after=await changed.generateAsync({type:"nodebuffer"});await assert.rejects(()=>verify(before,after),/CUSTODY_CONFLICT/);
 }
});
