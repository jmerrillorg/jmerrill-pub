"use strict";

const { isJackieAuthoredTitle, JACKIE_CANONICAL_AUTHOR_CONTACT_ID: canonicalContactId } =
  require("./jackieTitleSystemCommissioningPolicy");
const GUID = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const COMPOSITE = new RegExp(`^contact:(${GUID});\\s+authorProfile:(${GUID})$`, "i");

// Resolve the richer governed reference only within the existing commissioning
// scope. Never strip a profile from an unverified title or alter its record.
async function readJackieCommissioningIdentity(title, scope, client) {
  if (!title?.jm1pub_titleid || scope?.enabled !== true || scope.revoked === true || scope.titleId !== title.jm1pub_titleid ||
      scope.mode !== "JACKIE_TITLE_INTERNAL_COMMISSIONING") return null;
  if (isJackieAuthoredTitle(title)) return { method: "EXISTING_STRICT_CONTACT_GUARD", contactId: canonicalContactId };
  const match = typeof title.jm1_canonicalauthorcontactreference === "string"
    ? COMPOSITE.exec(title.jm1_canonicalauthorcontactreference.trim()) : null;
  if (!match || match[1].toLowerCase() !== canonicalContactId || typeof client?.first !== "function" ||
      !isJackieAuthoredTitle({ ...title, jm1_canonicalauthorcontactreference: `contact:${canonicalContactId}` })) return null;
  const profileId = match[2].toLowerCase();
  const profile = await client.first("jm1_authorprofiles", { $filter: `jm1_authorprofileid eq ${profileId}` });
  const contact = await client.first("contacts", { $filter: `contactid eq ${canonicalContactId}` });
  if (profile?.jm1_authorprofileid !== profileId || profile._jm1_contact_value !== canonicalContactId ||
      profile.statecode !== 0 || contact?.contactid !== canonicalContactId || contact.statecode !== 0 ||
      !Number.isSafeInteger(profile.versionnumber) || profile.versionnumber < 1 ||
      !Number.isSafeInteger(contact.versionnumber) || contact.versionnumber < 1) return null;
  return { method: "EXACT_PROFILE_CONTACT_BINDING", contactId: canonicalContactId,
    contactVersion: String(contact.versionnumber), profileId, profileVersion: String(profile.versionnumber),
    originalReference: title.jm1_canonicalauthorcontactreference };
}

module.exports = { readJackieCommissioningIdentity };
