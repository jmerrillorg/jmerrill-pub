"use strict";
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const JSZip = require("jszip");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const norm = text => text.replace(/\s+/gu, " ").trim();
function textOf(node) {
  if (node.namespaceURI === W && node.localName === "t") return node.textContent;
  if (node.namespaceURI === W && ["tab", "br", "cr"].includes(node.localName)) return " ";
  return Array.from(node.childNodes || []).map(textOf).join("");
}
// Match the accepted Mammoth raw-text source: tabs survive, inline breaks do not.
// This is extractor parity, not permission to normalize away differing words.
function sourceTextOf(node) {
  if (node.namespaceURI === W && node.localName === "t") return node.textContent;
  if (node.namespaceURI === W && node.localName === "tab") return "\t";
  if (node.namespaceURI === W && ["br", "cr"].includes(node.localName)) return "";
  return Array.from(node.childNodes || []).map(sourceTextOf).join("");
}
function wordElement(document, tag, text) {
  const element = document.createElementNS(W, `w:${tag}`);
  if (text !== undefined) {
    element.setAttribute("xml:space", "preserve");
    element.appendChild(document.createTextNode(text));
  }
  return element;
}
async function buildDocuments(original, name, paragraphs, proposed) {
  if (paragraphs.length !== proposed.length) throw Error("STAGE07_DOCUMENT_COVERAGE_MISMATCH");
  let source = original;
  if (name.toLowerCase().endsWith(".md")) {
    const { Document, Paragraph, TextRun, Packer } = require("docx");
    source = await Packer.toBuffer(new Document({ sections: [{ properties: { page: {
      size: { width: 8640, height: 12960 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: paragraphs.map(text => new Paragraph({ children: [new TextRun(text)] })) }] }));
  }
  const outputs = {};
  for (const review of [false, true]) {
    const zip = await JSZip.loadAsync(source, { checkCRC32: true });
    // Deterministic serialization makes an interrupted package write replayable.
    for (const entry of Object.values(zip.files)) entry.date = new Date("2000-01-01T00:00:00Z");
    if (name.toLowerCase().endsWith(".md") && zip.file("docProps/core.xml")) {
      const core = await zip.file("docProps/core.xml").async("string");
      zip.file("docProps/core.xml", core.replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]+/g, "$12000-01-01T00:00:00Z"), { date: new Date("2000-01-01T00:00:00Z") });
    }
    const xml = await zip.file("word/document.xml").async("string");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const nodes = Array.from(document.getElementsByTagNameNS(W, "p")).filter(p => sourceTextOf(p).trim());
    if (nodes.length !== paragraphs.length || nodes.some((p, i) => norm(sourceTextOf(p)) !== norm(paragraphs[i]))) throw Error("STAGE07_DOCUMENT_SOURCE_PARITY_FAILED");
    let revision = 0;
    for (const [index, node] of nodes.entries()) {
      if (proposed[index] === paragraphs[index]) continue;
      if (proposed[index] === "" && !review) {
        if (["fldChar","fldSimple","drawing","sectPr"].some(tag=>node.getElementsByTagNameNS(W,tag).length)) throw Error("STAGE07_DOCUMENT_COMPLEX_PARAGRAPH_REVIEW_REQUIRED");
        node.parentNode.removeChild(node); continue;
      }
      // Never flatten live fields or silently lose an existing citation link.
      if (["fldChar", "fldSimple"].some(tag => node.getElementsByTagNameNS(W, tag).length)) {
        throw Error("STAGE07_DOCUMENT_COMPLEX_PARAGRAPH_REVIEW_REQUIRED");
      }
      const runProperties = node.getElementsByTagNameNS(W, "rPr")[0];
      const links = Array.from(node.getElementsByTagNameNS(W, "hyperlink")).map(link => {
        const label = textOf(link), at = proposed[index].indexOf(label);
        if (!label || at < 0 || proposed[index].indexOf(label, at + label.length) >= 0) throw Error("STAGE07_CITATION_LINK_REVIEW_REQUIRED");
        return { node: link, clone: link.cloneNode(true), label, at };
      }).sort((a, b) => a.at - b.at);
      if (links.some((link, i) => i && link.at < links[i - 1].at + links[i - 1].label.length)) throw Error("STAGE07_CITATION_LINK_REVIEW_REQUIRED");
      for (const link of links) link.node.parentNode.removeChild(link.node);
      for (const tag of ["t", "tab", "br", "cr"]) {
        for (const child of Array.from(node.getElementsByTagNameNS(W, tag))) {
          if (tag === "br" && child.getAttributeNS(W, "type") === "page") continue;
          child.parentNode.removeChild(child);
        }
      }
      if (review) {
        const deletion = wordElement(document, "del"), insertion = wordElement(document, "ins");
        for (const change of [deletion, insertion]) {
          change.setAttributeNS(W, "w:id", String(revision++)); change.setAttributeNS(W, "w:author", "Publishing Editorial Review");
        }
        const oldRun = wordElement(document, "r");
        if (runProperties) oldRun.appendChild(runProperties.cloneNode(true));
        oldRun.appendChild(wordElement(document, "delText", paragraphs[index]));
        deletion.appendChild(oldRun); node.appendChild(deletion);
      }
      const appendRun = value => {
        if (!value) return;
        const run = wordElement(document, "r");
        if (runProperties) run.appendChild(runProperties.cloneNode(true));
        const lines = value.split("\n");
        lines.forEach((line, i) => { if (i) run.appendChild(wordElement(document, "br")); run.appendChild(wordElement(document, "t", line)); });
        if (!review) { node.appendChild(run); return; }
        const insertion = wordElement(document, "ins");
        insertion.setAttributeNS(W, "w:id", String(revision++)); insertion.setAttributeNS(W, "w:author", "Publishing Editorial Review");
        insertion.appendChild(run); node.appendChild(insertion);
      };
      let cursor = 0;
      for (const link of links) {
        appendRun(proposed[index].slice(cursor, link.at));
        if (review) {
          const insertion = wordElement(document, "ins");
          insertion.setAttributeNS(W, "w:id", String(revision++)); insertion.setAttributeNS(W, "w:author", "Publishing Editorial Review");
          while (link.clone.firstChild) insertion.appendChild(link.clone.firstChild);
          link.clone.appendChild(insertion);
        }
        node.appendChild(link.clone); cursor = link.at + link.label.length;
      }
      appendRun(proposed[index].slice(cursor));
    }
    zip.file("word/document.xml", new XMLSerializer().serializeToString(document), { date: new Date("2000-01-01T00:00:00Z") });
    const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const extracted = (await require("mammoth").extractRawText({ buffer: bytes })).value;
    if (norm(extracted) !== norm(proposed.join("\n\n"))) throw Error("STAGE07_DOCUMENT_OUTPUT_PARITY_FAILED");
    outputs[review ? "review" : "edited"] = bytes;
  }
  return outputs;
}
module.exports = { buildDocuments, textOf };
