"use strict";
const { PDFDocument, StandardFonts } = require("pdf-lib");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const Zip = require("jszip");
const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const EPOCH = new Date("2000-01-01T00:00:00Z");

async function offerPdf(review) {
  const pdf = await PDFDocument.create();
  pdf.setCreationDate(EPOCH); pdf.setModificationDate(EPOCH);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page, y;
  const next = () => { page = pdf.addPage([612, 792]); y = 738; };
  next();
  for (const raw of review.split("\n")) {
    if (!raw) { y -= 8; continue; }
    const heading = /^(#{1,3}) /.exec(raw);
    const size = heading ? (heading[1].length === 1 ? 18 : 12) : 10;
    const font = heading ? bold : regular;
    const text = raw.replace(/^#{1,3} /, "");
    const lines = []; let line = "";
    // Character-level fallback wraps long source URLs and hashes without truncation.
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= 504) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > 504) { lines.push(line); line = ""; }
        line += char;
      }
    }
    if (line) lines.push(line);
    if (heading && y < 100) next();
    for (const value of lines) {
      if (y < 54) next();
      page.drawText(value, { x: 54, y, size, font }); y -= size + 5;
    }
  }
  return Buffer.from(await pdf.save());
}

async function agreementCopy(baseBytes, bundle, reference) {
  const zip = await Zip.loadAsync(baseBytes, { checkCRC32: true });
  const original = await zip.file("word/document.xml").async("string");
  const doc = new DOMParser().parseFromString(original, "application/xml");
  const body = doc.getElementsByTagNameNS(NS, "body")[0];
  if (!body) throw new Error("STAGE04_AGREEMENT_BODY_MISSING");
  const first = body.firstChild;
  for (const [index, text] of ["Publishing agreement for author review", bundle.title,
    `Offer ${reference}; version ${bundle.offer.version}`, `Offer SHA-256: ${bundle.offer.offerSha256}`,
    bundle.offer.fundedTerms.clause,
    "For this Work, the funded clause supersedes only conflicting author-fee and automatic production-cost reimbursement requirements, including the relevant portions of sections 2.4, 4.2 and 10.2. Other agreement terms remain unchanged.",
    "This copy is for review, not an executed agreement. Required signatures and the approved budget for subsequent work remain separate gates.",
    `The following approved base agreement is version ${bundle.offer.baseAgreement.version}.`].entries()) {
    const p = doc.createElementNS(NS, "w:p"), r = doc.createElementNS(NS, "w:r"), t = doc.createElementNS(NS, "w:t");
    const properties = doc.createElementNS(NS, "w:pPr"), spacing = doc.createElementNS(NS, "w:spacing");
    spacing.setAttributeNS(NS, "w:after", "160"); properties.appendChild(spacing); p.appendChild(properties);
    const rp = doc.createElementNS(NS, "w:rPr"), size = doc.createElementNS(NS, "w:sz");
    size.setAttributeNS(NS, "w:val", index < 2 ? "28" : "22"); rp.appendChild(size);
    if (index < 2) rp.appendChild(doc.createElementNS(NS, "w:b"));
    r.appendChild(rp);
    t.appendChild(doc.createTextNode(text)); r.appendChild(t); p.appendChild(r); body.insertBefore(p, first);
  }
  const p = doc.createElementNS(NS, "w:p"), r = doc.createElementNS(NS, "w:r"), br = doc.createElementNS(NS, "w:br");
  br.setAttributeNS(NS, "w:type", "page"); r.appendChild(br); p.appendChild(r); body.insertBefore(p, first);
  // Do not synthesize parent directories with wall-clock timestamps on replay.
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc), { date: EPOCH, createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
module.exports = { offerPdf, agreementCopy };
