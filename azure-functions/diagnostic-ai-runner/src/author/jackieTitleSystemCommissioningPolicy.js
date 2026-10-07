"use strict";

const authority = require("./jackie-title-system-authority.json");

const JACKIE_CANONICAL_AUTHOR_CONTACT_ID = authority.canonicalAuthorContactId.toLowerCase();

function normalizeContactReference(value) {
  if (value === null || value === undefined || value === "") return { present: false, id: "" };
  if (typeof value !== "string") return { present: true, id: "" };
  const text = value.trim().toLowerCase();
  if (!text) return { present: true, id: "" };
  const match = text.match(/^(?:contact:)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
  return { present: true, id: match?.[1] || "" };
}

function isJackieAuthoredTitle(authorityRecord) {
  if (!authorityRecord) return false;
  const references = [
    normalizeContactReference(authorityRecord._jm1_primaryauthor_value),
    normalizeContactReference(authorityRecord._jm1_author_value),
    normalizeContactReference(authorityRecord.jm1_canonicalauthorcontactreference)
  ].filter((reference) => reference.present);
  return references.length > 0 && references.every((reference) =>
    reference.id && reference.id === JACKIE_CANONICAL_AUTHOR_CONTACT_ID
  );
}

function jackieTitleCommissioningBlocker(authorityRecord) {
  return isJackieAuthoredTitle(authorityRecord) ? null : "JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED";
}

module.exports = { JACKIE_CANONICAL_AUTHOR_CONTACT_ID, isJackieAuthoredTitle, jackieTitleCommissioningBlocker };
