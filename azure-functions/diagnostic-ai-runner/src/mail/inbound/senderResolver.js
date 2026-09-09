"use strict";

const { normalizeEmail, normalizeLower, normalizeString } = require("./util");

const KNOWN_SENDERS = [
  {
    kind: "DISTRIBUTOR",
    name: "Lightning Source US Sales Compensation",
    address: "sales_comp_dept.us@lightningsource.com",
    domain: "lightningsource.com",
    messageClassCandidate: "ROYALTY_REPORT"
  }
];

function resolveSender(messageEvidence, context = {}) {
  const address = normalizeEmail(messageEvidence.fromAddress);
  const domain = address.includes("@") ? address.split("@").pop() : "";
  const exact = KNOWN_SENDERS.find((s) => normalizeEmail(s.address) === address);
  if (exact) {
    return {
      status: "DETERMINISTIC",
      identityType: exact.kind,
      identityName: exact.name,
      senderAddress: address,
      senderDomain: exact.domain,
      messageClassCandidate: exact.messageClassCandidate,
      trustedForConsequentialProcessing: false
    };
  }

  const contact = Array.isArray(context.contacts)
    ? context.contacts.find((c) => normalizeEmail(c.email) === address)
    : null;
  if (contact) {
    return {
      status: "DETERMINISTIC",
      identityType: "CONTACT",
      identityName: normalizeString(contact.name) || null,
      senderAddress: address,
      senderDomain: domain,
      authorId: normalizeString(contact.authorId) || null,
      contactId: normalizeString(contact.contactId) || null,
      trustedForConsequentialProcessing: false
    };
  }

  const domainMatch = KNOWN_SENDERS.find((s) => normalizeLower(s.domain) === domain);
  if (domainMatch) {
    return {
      status: "AMBIGUOUS",
      identityType: domainMatch.kind,
      identityName: domainMatch.name,
      senderAddress: address,
      senderDomain: domain,
      messageClassCandidate: domainMatch.messageClassCandidate,
      trustedForConsequentialProcessing: false,
      reason: "DOMAIN_ONLY_MATCH"
    };
  }

  return {
    status: "UNKNOWN",
    identityType: null,
    identityName: null,
    senderAddress: address || null,
    senderDomain: domain || null,
    trustedForConsequentialProcessing: false
  };
}

module.exports = {
  KNOWN_SENDERS,
  resolveSender
};
