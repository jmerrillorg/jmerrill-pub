"use strict";
const JSZip=require("jszip"),{DOMParser}=require("@xmldom/xmldom"),{sha,deny}=require("../lifecycle/newSubmissionStage03Budget");
const metadata=/^(docProps\/(core|custom)\.xml|customXml\/item(?:Props)?\d+\.xml|customXml\/_rels\/item\d+\.xml\.rels|\[trash\]\/\d+\.dat)$/;
function xml(value){if(/<!DOCTYPE|<!ENTITY/i.test(value))deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");return new DOMParser().parseFromString(value,"application/xml");}
function attributes(node){return JSON.stringify(Array.from(node.attributes).map(a=>[a.name,a.value]).sort());}
async function verify(expected,actual){
 if(expected.equals(actual))return {method:"EXACT_BYTES",generatedSha256:sha(expected),storedSha256:sha(actual)};
 const a=await JSZip.loadAsync(expected,{checkCRC32:true}),b=await JSZip.loadAsync(actual,{checkCRC32:true}),checked=[];
 const special=new Set(["word/_rels/document.xml.rels","[Content_Types].xml"]);
 for(const name of new Set([...Object.keys(a.files),...Object.keys(b.files)])){
  if(a.files[name]?.dir||b.files[name]?.dir||metadata.test(name)||special.has(name))continue;
  if(!a.file(name)||!b.file(name)||(await a.file(name).async("nodebuffer")).compare(await b.file(name).async("nodebuffer")))deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  checked.push(name);
 }
 if(!checked.includes("word/document.xml")||!checked.includes("word/styles.xml"))deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
 for(const name of special){
  const before=xml(await a.file(name).async("string")),after=xml(await b.file(name).async("string"));
  const children=d=>Array.from(d.documentElement.childNodes).filter(n=>n.nodeType===1);
  const old=new Map(children(before).map(n=>[attributes(n),n])),fresh=children(after);
  if(name.endsWith(".rels")&&new Set(fresh.map(n=>n.getAttribute("Id"))).size!==fresh.length)deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  for(const n of fresh){if(old.delete(attributes(n)))continue;
   const allowed=name==="[Content_Types].xml"?n.localName==="Override"&&/^\/customXml\/itemProps\d+\.xml$/.test(n.getAttribute("PartName"))&&n.getAttribute("ContentType")==="application/vnd.openxmlformats-officedocument.customXmlProperties+xml":
    n.localName==="Relationship"&&n.getAttribute("Type")==="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml"&&/^\.\.\/customXml\/item\d+\.xml$/.test(n.getAttribute("Target"))&&!n.hasAttribute("TargetMode");
   if(!allowed)deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  }if(old.size)deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
 }
 for(const name of Object.keys(b.files).filter(n=>/^customXml\/item\d+\.xml$/.test(n))){
  const ns=xml(await b.file(name).async("string")).documentElement.namespaceURI;
  if(!["http://schemas.microsoft.com/office/2006/metadata/contentType","http://schemas.microsoft.com/sharepoint/v3/contenttype/forms","http://schemas.microsoft.com/office/2006/metadata/properties"].includes(ns))deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
 }
 for(const name of Object.keys(b.files).filter(n=>/^customXml\/_rels\/.+\.rels$/.test(n))){
  const d=xml(await b.file(name).async("string"));
  for(const n of Array.from(d.documentElement.childNodes).filter(n=>n.nodeType===1)){
   if(n.localName!=="Relationship"||n.hasAttribute("TargetMode")||n.getAttribute("Type")!=="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps"||!/^itemProps\d+\.xml$/.test(n.getAttribute("Target")))deny("EDITORIAL_OUTPUT_CUSTODY_CONFLICT");
  }
 }
 return {method:"EXACT_CONTENT_PARTS_SHAREPOINT_METADATA_VARIANCE",generatedSha256:sha(expected),storedSha256:sha(actual),checkedParts:checked.sort(),byteIdentical:false};
}
module.exports={verify};
