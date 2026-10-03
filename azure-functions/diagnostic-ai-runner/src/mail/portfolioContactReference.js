"use strict";
const GUID = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const REFERENCE = new RegExp(`^contact:(${GUID})(?:\\s*;\\s*authorProfile:(${GUID}))?$`, "i");

function parsePortfolioContactReference(value) {
  const text = String(value || "").trim();
  const match = text.match(REFERENCE);
  return match ? { status: "PARSED", contactId: match[1].toLowerCase(),
    authorProfileId: match[2]?.toLowerCase() || null, format: match[2] ? "CONTACT_WITH_AUTHOR_PROFILE" : "CONTACT_ONLY" }
    : { status: !text ? "EMPTY" : text === "UNRESOLVED" ? "UNRESOLVED" : "UNSUPPORTED_OR_MALFORMED",
      contactId: null, authorProfileId: null, format: null };
}

function reconcilePortfolioContactReference(title, contacts, profiles) {
  const reference = parsePortfolioContactReference(title.jm1_canonicalauthorcontactreference);
  const primary = String(title._jm1_primaryauthor_value || "").toLowerCase();
  const primaryValid = new RegExp(`^${GUID}$`, "i").test(primary);
  const primaryId = primaryValid ? primary : null;
  const ids = [...new Set([primaryId, reference.contactId].filter(Boolean))];
  const parity = primaryId && reference.contactId ? primaryId === reference.contactId ? "DUAL_MATCH" : "DUAL_CONFLICT"
    : primaryId ? "PRIMARY_ONLY" : reference.contactId ? "REFERENCE_ONLY" : "NEITHER";
  const profile = reference.authorProfileId ? profiles.find(row => row.jm1_authorprofileid?.toLowerCase() === reference.authorProfileId) : null;
  return { titleId: title.jm1pub_titleid, rawReference: title.jm1_canonicalauthorcontactreference,
    primaryId, reference, fieldParity: parity, contactBound: ids.length > 0,
    referencedContactIds: ids, missingContactIds: ids.filter(id => !contacts.some(row => row.contactid?.toLowerCase() === id)),
    inactiveContactIds: ids.filter(id => contacts.some(row => row.contactid?.toLowerCase() === id && row.statecode === 1)),
    explicitProfileParity: reference.authorProfileId ? !profile ? "PROFILE_MISSING"
      : profile._jm1_contact_value?.toLowerCase() === reference.contactId ? "PROFILE_CONTACT_MATCH" : "PROFILE_CONTACT_CONFLICT" : "NOT_DECLARED",
    businessAuthorIdentityCertified: false };
}
module.exports = { parsePortfolioContactReference, reconcilePortfolioContactReference };
