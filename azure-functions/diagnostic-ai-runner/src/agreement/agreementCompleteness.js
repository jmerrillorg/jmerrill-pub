"use strict";
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");
const { createHash } = require("node:crypto");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function text(xml) {
  const errors = [];
  const doc = new DOMParser({ errorHandler: { warning: e => errors.push(e), error: e => errors.push(e), fatalError: e => errors.push(e) } }).parseFromString(xml, "application/xml");
  if (errors.length) deny("AGREEMENT_XML_INVALID");
  return Array.from(doc.getElementsByTagNameNS(W, "p"), p =>
    Array.from(p.getElementsByTagNameNS(W, "t"), t => t.textContent).join("")).join("\n");
}
function explicitDate(authority) {
  const date = authority?.value;
  if (!authority?.reference || authority.inferred === true || !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) deny("AGREEMENT_EXPLICIT_EFFECTIVE_DATE_REQUIRED");
  return date;
}
async function assertNoUnresolvedFields(bytes) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  if (!zip.file("word/document.xml") || zip.file("word/vbaProject.bin")) deny("AGREEMENT_DOCUMENT_INVALID");
  for (const part of Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(p))) {
    if (hasPlaceholder(text(await zip.file(part).async("string")))) deny("AGREEMENT_UNRESOLVED_PLACEHOLDER");
  }
}
function hasPlaceholder(value) {
  // Empty boxes are signature-form controls, not deferred merge fields.
  return /\[[^\]\r\n]*[^\s\]\r\n][^\]\r\n]*\]|\{\{[^}]+\}\}|\b(?:TODO|TBD|INSERT HERE)\b/i.test(value);
}
async function validateCompleteAgreement(bytes, expected) {
  if (!Buffer.isBuffer(bytes) || !expected?.title || !expected.authorLegalName || !expected.authorAddress ||
      !expected.authorCityStatePostal || !expected.authorSourceReference) deny("AGREEMENT_VERIFIED_AUTHOR_DETAILS_REQUIRED");
  const date = explicitDate(expected.effectiveDateAuthority);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  if (!zip.file("word/document.xml") || zip.file("word/vbaProject.bin")) deny("AGREEMENT_DOCUMENT_INVALID");
  const parts = Object.keys(zip.files).filter(p => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(p));
  const values = [];
  for (const part of parts) {
    const value = text(await zip.file(part).async("string"));
    if (hasPlaceholder(value)) deny("AGREEMENT_UNRESOLVED_PLACEHOLDER");
    values.push({ part, value });
  }
  const body = values.find(p => p.part === "word/document.xml").value;
  for (const value of [expected.title, expected.authorLegalName, expected.authorAddress, expected.authorCityStatePostal, date]) {
    if (!body.includes(value)) deny("AGREEMENT_REQUIRED_VALUE_MISMATCH");
  }
  if (expected.offerId && (!body.includes(expected.offerId) || !/^[a-f0-9]{64}$/.test(expected.offerSha256 || "") ||
      !body.includes(expected.offerSha256) || !body.includes(`version ${expected.offerVersion}`))) deny("AGREEMENT_OFFER_VERSION_MISMATCH");
  return { complete: true, sha256: createHash("sha256").update(bytes).digest("hex"),
    checkedParts: parts, effectiveDate: date, authorSourceReference: expected.authorSourceReference,
    effectiveDateAuthorityReference: expected.effectiveDateAuthority.reference, visualReviewRequired: true };
}
module.exports = { text, explicitDate, validateCompleteAgreement, assertNoUnresolvedFields };
