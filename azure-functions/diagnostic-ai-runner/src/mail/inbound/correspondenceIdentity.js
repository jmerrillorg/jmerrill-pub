"use strict";

const { createHash } = require("node:crypto");
const { extractAuthorReplyText } = require("../publishingMailboxReader");
const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const email = (value) => String(value || "").trim().toLowerCase();
const hash = (value) => createHash("sha256").update(value).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function identityKey(authorId, address) {
  if (!GUID.test(authorId)) fail("CORRESPONDENCE_AUTHOR_INVALID");
  return `author-correspondence-${authorId.toLowerCase()}-${hash(email(address))}`;
}

async function bindCorrespondenceIdentity({ authorId, alternateEmail, sourceMessageId }, { client, graph, store, now = () => new Date() }) {
  if (!GUID.test(authorId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail || "") || !sourceMessageId) fail("CORRESPONDENCE_BINDING_INVALID");
  const contact = await client.first("contacts", { $filter: `contactid eq ${authorId}`, $select: "contactid,emailaddress1" });
  const source = await graph.getMessage(sourceMessageId);
  const primary = email(contact?.emailaddress1);
  if (!primary || email(source.from?.emailAddress?.address) !== primary || !source.internetMessageId || !source.receivedDateTime) fail("CORRESPONDENCE_CANONICAL_SOURCE_UNPROVEN");
  const text = extractAuthorReplyText(source.body?.content || source.bodyPreview);
  const alternate = email(alternateEmail);
  // This deliberately narrow author declaration does not interpret quoted addresses as authority.
  const declarations = [...text.matchAll(/\bit is\s+(?:mailto:)?([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => email(m[1]));
  if (!/\bcorrespondence\b/i.test(text) || declarations.length !== 1 || declarations[0] !== alternate || alternate === primary) fail("CORRESPONDENCE_DECLARATION_UNPROVEN");
  const key = identityKey(authorId, alternate);
  const record = { schemaVersion: 1, scope: "AUTHOR_CORRESPONDENCE_ONLY", authorId: authorId.toLowerCase(),
    primaryEmail: primary, alternateEmail: alternate, sourceMessageId: source.id,
    sourceInternetMessageId: source.internetMessageId, sourceTimestamp: source.receivedDateTime,
    sourceBodyHash: hash(text), verificationMethod: "AUTHOR_CONFIRMED_FROM_CANONICAL_ADDRESS",
    portalAuthenticationAuthorized: false, verifiedAt: now().toISOString() };
  const existing = await store.getCheckpoint(key);
  if (existing) {
    if (existing.sourceInternetMessageId !== record.sourceInternetMessageId || existing.sourceBodyHash !== record.sourceBodyHash || existing.scope !== record.scope) fail("CORRESPONDENCE_AUTHORITY_CONFLICT");
    return existing;
  }
  if (typeof store.setCheckpointOnce !== "function") fail("CORRESPONDENCE_IMMUTABLE_STORE_REQUIRED");
  const persisted = await store.setCheckpointOnce(key, record);
  if (persisted.sourceInternetMessageId !== record.sourceInternetMessageId || persisted.sourceBodyHash !== record.sourceBodyHash ||
      persisted.scope !== record.scope || persisted.authorId !== record.authorId) fail("CORRESPONDENCE_AUTHORITY_CONFLICT");
  return persisted;
}

async function verifyCorrespondenceIdentity(authorId, sender, { client, store }) {
  const contact = await client.first("contacts", { $filter: `contactid eq ${authorId}`, $select: "contactid,emailaddress1" });
  const primary = email(contact?.emailaddress1);
  if (primary && primary === email(sender)) return { verified: true, email: primary, source: "CANONICAL_PRIMARY" };
  const record = await store.getCheckpoint(identityKey(authorId, sender));
  if (!record || record.scope !== "AUTHOR_CORRESPONDENCE_ONLY" || record.authorId !== authorId.toLowerCase() ||
      record.primaryEmail !== primary || record.alternateEmail !== email(sender) || record.revokedAt ||
      record.portalAuthenticationAuthorized !== false || record.verificationMethod !== "AUTHOR_CONFIRMED_FROM_CANONICAL_ADDRESS" ||
      !record.sourceInternetMessageId || !/^[0-9a-f]{64}$/.test(record.sourceBodyHash || "")) return { verified: false };
  return { verified: true, email: record.alternateEmail, source: record.sourceInternetMessageId };
}
module.exports = { bindCorrespondenceIdentity, verifyCorrespondenceIdentity, identityKey };
