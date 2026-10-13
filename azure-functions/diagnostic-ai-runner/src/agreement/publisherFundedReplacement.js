"use strict";
const Zip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { fillDocxTemplate, agreementMergeValues } = require("./governedAgreementPipelineRunner");
const { validateCompleteAgreement } = require("./agreementCompleteness");
const { BASE } = require("../lifecycle/publisherFundedOffer");
const { CONTACT, TITLES, sha } = require("../lifecycle/jackieInternalTitlePolicy");
const { render } = require("../lifecycle/publisherFundedStage04Mail");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const VERSION = "2.0.0";
const AUTHORITY = "JMP-FIVE-AGREEMENT-REPLACEMENT-20261013-v1";
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

function authorDetails(contact) {
  if (contact?.contactid !== CONTACT || !contact["@odata.etag"] ||
      ["fullname", "address1_line1", "address1_city", "address1_stateorprovince", "address1_postalcode"].some(k => !contact[k]?.trim())) {
    deny("AGREEMENT_VERIFIED_AUTHOR_DETAILS_REQUIRED");
  }
  return {
    authorLegalName: "Jackie Smith, Jr.",
    authorAddress: [contact.address1_line1, contact.address1_line2].filter(Boolean).join(", "),
    authorCityStatePostal: `${contact.address1_city}, ${contact.address1_stateorprovince} ${contact.address1_postalcode}`,
    authorSourceReference: `contacts(${CONTACT})/${contact["@odata.etag"]}`,
  };
}

async function prepare(bundle, contact, effectiveDateAuthority, prior, election) {
  const offer = bundle.offer;
  if (!TITLES[offer?.titleId] || offer.authorContactId !== CONTACT || sha(bundle.baseBytes) !== BASE.sha256 ||
      offer.baseAgreement.sha256 !== BASE.sha256 || election?.decision !== "ACCEPT" ||
      election.offerSha256 !== offer.offerSha256 || !election.sourceReference ||
      prior?.titleId !== offer.titleId || prior.offerSha256 !== offer.offerSha256 ||
      prior.agreementVersion !== "1.0.0" || !/^[a-f0-9]{64}$/.test(prior.agreementSha256 || "") ||
      JSON.stringify(offer.components.map(c => c.sourceSha256).sort()) !== JSON.stringify([...TITLES[offer.titleId]].sort())) {
    deny("AGREEMENT_REPLACEMENT_BINDING_DENIED");
  }
  const details = authorDetails(contact);
  const copy = render(bundle.title, offer);
  const expected = { ...details, title: bundle.title, effectiveDateAuthority,
    offerId: copy.reference, offerVersion: offer.version, offerSha256: offer.offerSha256 };
  const filled = await fillDocxTemplate(bundle.baseBytes, agreementMergeValues({ ...details,
    bookTitle: bundle.title, effectiveDate: effectiveDateAuthority.value }));
  const zip = await Zip.loadAsync(filled.buffer, { checkCRC32: true });
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "application/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) deny("AGREEMENT_DOCUMENT_INVALID");
  // Replace the template's empty page-break paragraph, which otherwise renders
  // an extra blank page immediately before the signature page.
  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType !== 1 || node.localName !== "p" || node.getElementsByTagNameNS(W, "t").length ||
        !Array.from(node.getElementsByTagNameNS(W, "br")).some(n => n.getAttributeNS(W, "type") === "page")) continue;
    let next = node.nextSibling;
    while (next && next.nodeType !== 1) next = next.nextSibling;
    if (!next?.textContent.includes("IN WITNESS WHEREOF")) continue;
    let previous = node.previousSibling;
    while (previous && (previous.nodeType !== 1 || (previous.localName === "p" && !previous.textContent.trim()))) {
      const before = previous.previousSibling; body.removeChild(previous); previous = before;
    }
    body.removeChild(node);
    let pr = next.getElementsByTagNameNS(W, "pPr")[0];
    if (!pr) { pr = doc.createElementNS(W, "w:pPr"); next.insertBefore(pr, next.firstChild); }
    if (!pr.getElementsByTagNameNS(W, "pageBreakBefore").length) pr.appendChild(doc.createElementNS(W, "w:pageBreakBefore"));
  }
  const first = body.firstChild;
  const paragraph = (value, heading = false, page = false) => {
    const p = doc.createElementNS(W, "w:p"), pr = doc.createElementNS(W, "w:pPr");
    const spacing = doc.createElementNS(W, "w:spacing"); spacing.setAttributeNS(W, "w:after", "160"); pr.appendChild(spacing);
    if (page) pr.appendChild(doc.createElementNS(W, "w:pageBreakBefore"));
    p.appendChild(pr);
    const r = doc.createElementNS(W, "w:r"), rp = doc.createElementNS(W, "w:rPr"), size = doc.createElementNS(W, "w:sz");
    size.setAttributeNS(W, "w:val", heading ? "28" : "20"); rp.appendChild(size);
    if (heading) rp.appendChild(doc.createElementNS(W, "w:b"));
    r.appendChild(rp);
    const t = doc.createElementNS(W, "w:t"); t.appendChild(doc.createTextNode(value)); r.appendChild(t); p.appendChild(r);
    body.insertBefore(p, first);
  };
  paragraph("Replacement publisher funded publishing agreement", true);
  paragraph(bundle.title, true);
  paragraph(`Agreement version ${VERSION}. Effective date: ${effectiveDateAuthority.value}.`);
  paragraph(`Author: ${details.authorLegalName}. Publisher: J Merrill Publishing, Inc.`);
  paragraph(`Accepted offer ${copy.reference} version ${offer.version}.`);
  paragraph("Upon execution by both required parties, this complete replacement agreement supersedes the previously issued agreement version 1.0.0 for this same Work and accepted offer. The earlier document must not be used to satisfy the replacement execution requirement. This is a replacement agreement, not a completion addendum.");
  paragraph(offer.fundedTerms.clause);
  paragraph("For this Work, the funded clause supersedes only conflicting author-fee and automatic production-cost reimbursement requirements, including the relevant portions of sections 2.4, 4.2 and 10.2. Other agreement terms remain unchanged.");
  paragraph(`Accepted scope: developmental editorial review. ${copy.special}`);
  paragraph("Actual execution by both required parties and an approved budget for subsequent work remain separate requirements. Offer acceptance is not an agreement signature. This replacement authorizes no new spending.");
  paragraph("Author signature: __________________________  Date: ______________");
  paragraph("Publisher signature: _______________________  Date: ______________");
  paragraph("Exact source and accepted offer", true, true);
  paragraph(`Offer SHA-256: ${offer.offerSha256}`);
  paragraph(`Superseded issued document SHA-256: ${prior.agreementSha256}`);
  for (const [i, component] of offer.components.entries()) {
    paragraph(`Component ${i + 1}`);
    paragraph(`Source SHA-256: ${component.sourceSha256}`);
    paragraph(`Assessment SHA-256: ${component.assessmentSha256}`);
  }
  paragraph("Signing administration", true);
  paragraph("Publishing reviews this complete version and sends it through Acrobat Sign. Both Author and authorized Publisher representative must execute all required signature fields. Retain every agreement page and the completion audit report together in this title's designated agreement folder. Do not edit the issued file; substantive changes require a new issued version. No printing, scanning or Publishing portal account is required.");
  const p = doc.createElementNS(W, "w:p"), r = doc.createElementNS(W, "w:r"), br = doc.createElementNS(W, "w:br");
  br.setAttributeNS(W, "w:type", "page"); r.appendChild(br); p.appendChild(r); body.insertBefore(p, first);
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc), { date: new Date("2000-01-01T00:00:00Z"), createFolders: false });
  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const completeness = await validateCompleteAgreement(bytes, expected);
  return { bytes, manifest: { schemaVersion: 1, titleId: offer.titleId, title: bundle.title,
    agreementVersion: VERSION, agreementSha256: sha(bytes), offerId: copy.reference,
    offerSha256: offer.offerSha256, offerVersion: offer.version, authorElectionReference: election.sourceReference,
    effectiveDateAuthority, completeness, replacementAuthority: AUTHORITY,
    supersedes: { agreementVersion: prior.agreementVersion, agreementSha256: prior.agreementSha256 },
    administrationRecipient: "publishing@jmerrill.one", signatureStatus: "AWAITING_REPLACEMENT_EXECUTION",
    visualReviewRequired: true, stage05Complete: false, authorDueCents: 0,
    authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", paymentCreated: false } };
}
module.exports = { VERSION, AUTHORITY, authorDetails, prepare };
