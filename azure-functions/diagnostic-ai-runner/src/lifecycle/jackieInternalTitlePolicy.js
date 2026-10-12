"use strict";
const { createHash } = require("node:crypto");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const CONTACT = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
const TITLES = Object.freeze({
  "f79006b7-f595-f111-8076-00224820105b": ["b030075bbda336c8dea8f7c12aaf210665fb0bbdc52da690144d7cfd3dd8bcd7"],
  "f1908dc9-5775-f111-ab0f-6045bdd69435": ["b6dd239da025e58d9d0dc4e375a00e76391f9455fb856d63664031931387b5e2"],
  "e797232b-da7a-f111-ab0f-00224820105b": ["701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06", "94b46204db5e0e81d739f507c26905f693888949a494d2c4d64463ebe2a90312"],
  "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2": ["d4fdcd2515c60d592ff2df0bf116c967777bef4d2eb1d3897fbe88004d42cf1a"],
  "0e127af9-fcb3-5671-a0fa-e4af63c307d1": ["e03b0a2b6da9b6318352b9724e024713aaf7ffba24f1fd426f9def2fb8540175"]
});
const AUTHORITY_TEXT = "Approved: establish a versioned internal-title policy for these five fresh Jackie Smith, Jr. submissions. Treat them as publisher-owned internal projects. Do not assign retail publishing packages or charge Jackie a retail package fee. This policy does not change other authors' prices or authorize new expenses, provider commitments, rights transfers, or publication. Bind the policy to the five exact title IDs, accepted editorial scopes, and Publisher approval. Preserve all source, disclosure, rights, and presentation conditions. Use that policy to prepare and deliver the exact-version Stage 04 recommendations and internal-project offers through the established author email/review workflow. Verify delivery and capture Jackie's actual version-bound author responses; do not use this Publisher policy approval as author election. Carry Stage 04 through acceptance and replay verification when responses arrive. Stage 05 remains unstarted.";
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function validateAcceptance(a) {
  if (a.actorContactId !== CONTACT || a.actorCapacity !== "PUBLISHER_ONLY" ||
      a.packetSha256 !== "dfccdea117f0c126f7c5e5008e1eafcb40e614e526f6726a3c2a0b787495c202" ||
      a.authorElection !== "NOT_CAPTURED" || a.stage05 !== "NOT_STARTED" ||
      a.gloryScope !== "FOCUSED_DEVELOPMENTAL" || a.gloryPresentation !== "UNRESOLVED_NO_SPLIT_AUTHORIZED" ||
      a.intentionalComponents !== "SEPARATE" || a.chadAndMe !== "NO_INVENTION" ||
      !Array.isArray(a.titles) || a.titles.length !== 5 || new Set(a.titles.map(t => t.titleId)).size !== 5) deny("STAGE04_PUBLISHER_BINDING_DENIED");
  for (const t of a.titles) {
    if (!TITLES[t.titleId] || t.scopeDecision !== "ACCEPTED_AS_PUBLISHER" ||
        t.safeguards !== "ALL_STATED_PACKET_SAFEGUARDS_PRESERVED" ||
        !/^[a-f0-9]{64}$/.test(t.acceptanceReceiptSha256 || "") ||
        JSON.stringify(t.components.map(c => c.sourceSha256).sort()) !== JSON.stringify([...TITLES[t.titleId]].sort()) ||
        t.components.some(c => c.pathway !== "DEVELOPMENTAL" || c.assessmentSha256 !== c.assessment?.sha256)) deny("STAGE04_SOURCE_SCOPE_DENIED");
  }
  return a;
}
function createPolicy(acceptance) {
  const a = validateAcceptance(acceptance);
  return { schemaVersion: 1, policyId: "JMP-JACKIE-FRESH-INTERNAL-TITLES", version: "1.0.0",
    approval: { actorContactId: CONTACT, capacity: "PUBLISHER", source: "CURRENT_DIRECT_HUMAN_INSTRUCTION", text: AUTHORITY_TEXT },
    projectClass: "PUBLISHER_OWNED_INTERNAL_PROJECT", retailPackage: null, retailPackageFee: null,
    additionalSpendAuthorized: false, providerCommitmentAuthorized: false, rightsTransferAuthorized: false,
    publicationAuthorized: false, otherAuthorPricingChanged: false,
    publisherAcceptanceReference: a.reference, publisherAcceptanceSha256: sha(JSON.stringify(a)),
    titles: a.titles, safeguards: { gloryScope: a.gloryScope, gloryPresentation: a.gloryPresentation,
      intentionalComponents: a.intentionalComponents, chadAndMe: a.chadAndMe,
      sourceDisclosureRightsAndPresentation: "PRESERVED" },
    authorElection: "SEPARATE_VERSION_BOUND_RESPONSE_REQUIRED", stage05: "NOT_STARTED" };
}
function validatePolicy(record, acceptance) {
  const expected = createPolicy(acceptance);
  if (JSON.stringify(record) !== JSON.stringify(expected)) deny("STAGE04_INTERNAL_POLICY_CONFLICT");
  return record;
}
module.exports = { TITLES, CONTACT, AUTHORITY_TEXT, sha, createPolicy, validatePolicy, validateAcceptance };
